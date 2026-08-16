// Smoke tests: real chromium + real extension + mock LLM endpoint.
// Verifies the whole path: type → pause → ghost card streams in → Tab → text replaced.

import { test, expect, chromium } from '@playwright/test';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const EXT_PATH = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../src');
const SUGGESTION = 'I really appreciate your help in reviewing my paper.';
const ROUGH = 'I very appreciate you help for review my paper';

const pageHtml = (autofocus) => `<!doctype html>
<html><body>
  <h1>inline-reformat smoke fixture</h1>
  <textarea id="ta" rows="6" cols="60" ${autofocus ? 'autofocus' : ''}></textarea>
</body></html>`;

function startMockServer() {
  const server = http.createServer((req, res) => {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'content-type, authorization',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    };
    if (req.method === 'OPTIONS') {
      res.writeHead(204, cors);
      return res.end();
    }
    if (req.method === 'POST' && req.url === '/v1/chat/completions') {
      res.writeHead(200, { ...cors, 'content-type': 'text/event-stream' });
      const words = SUGGESTION.split(' ');
      words.forEach((word, i) => {
        const chunk = { choices: [{ delta: { content: (i ? ' ' : '') + word } }] };
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      });
      res.write('data: [DONE]\n\n');
      return res.end();
    }
    res.writeHead(200, { ...cors, 'content-type': 'text/html' });
    res.end(pageHtml(req.url.includes('autofocus')));
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

async function launchWithExtension(port) {
  const context = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    headless: true,
    args: [`--disable-extensions-except=${EXT_PATH}`, `--load-extension=${EXT_PATH}`],
  });
  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent('serviceworker');
  await sw.evaluate((settings) => chrome.storage.local.set(settings), {
    provider: 'openai-compat',
    compatBaseUrl: `http://127.0.0.1:${port}/v1`,
    compatModel: 'mock',
    debounceMs: 200,
    minChars: 5,
    minWords: 2,
  });
  return context;
}

test('type → ghost card → Tab accepts the rewrite', async () => {
  const server = await startMockServer();
  const port = server.address().port;
  const context = await launchWithExtension(port);
  try {
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:${port}/`);

    const textarea = page.locator('#ta');
    await textarea.click();
    await textarea.pressSequentially(ROUGH);

    const card = page.locator('[data-inline-reformat]');
    await expect(card).toBeVisible({ timeout: 10_000 });
    await expect(card.locator('.text')).toHaveText(SUGGESTION, { timeout: 10_000 });
    await expect(card.locator('.hint')).toContainText('Tab', { timeout: 5_000 });

    await page.keyboard.press('Tab');
    await expect(textarea).toHaveValue(SUGGESTION);
    await expect(card).toBeHidden();
  } finally {
    await context.close();
    server.close();
  }
});

test('field focused before injection (autofocus) still triggers', async () => {
  const server = await startMockServer();
  const port = server.address().port;
  const context = await launchWithExtension(port);
  try {
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:${port}/?autofocus`);

    // Deliberately no click: the field was focused by the page itself before
    // the content script ran. Typing must still produce a suggestion.
    await page.keyboard.type(ROUGH);

    const card = page.locator('[data-inline-reformat]');
    await expect(card).toBeVisible({ timeout: 10_000 });
    await expect(card.locator('.text')).toHaveText(SUGGESTION, { timeout: 10_000 });
  } finally {
    await context.close();
    server.close();
  }
});
