// Regenerates docs/assets/ghost-card.png for the README.
// Same plumbing as the smoke test: real extension, mock SSE endpoint.
// Usage: node scripts/screenshot.mjs

import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EXT_PATH = path.join(ROOT, 'src');
const OUT = path.join(ROOT, 'docs/assets/ghost-card.png');
const SUGGESTION =
  'I really appreciate your help in reviewing my paper. Could we discuss the statistics section when you have time?';

const PAGE_HTML = `<!doctype html>
<html><head><style>
  body { margin: 0; min-height: 100vh; background: #eef1f5;
         font: 15px/1.5 system-ui, sans-serif; display: grid; place-items: start center; }
  .compose { margin-top: 48px; width: 640px; background: #fff; border-radius: 10px;
             box-shadow: 0 2px 12px rgba(0,0,0,.10); padding: 20px 24px 24px; }
  .compose h2 { margin: 0 0 12px; font-size: 15px; color: #444; font-weight: 600; }
  textarea { width: 100%; box-sizing: border-box; border: 1px solid #d8dee4; border-radius: 8px;
             font: inherit; padding: 12px; min-height: 130px; resize: none; outline: none; }
</style></head>
<body>
  <div class="compose">
    <h2>New message</h2>
    <textarea id="ta" spellcheck="false"></textarea>
  </div>
</body></html>`;

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
  if (req.method === 'POST') {
    res.writeHead(200, { ...cors, 'content-type': 'text/event-stream' });
    SUGGESTION.split(' ').forEach((word, i) => {
      res.write(
        `data: ${JSON.stringify({ choices: [{ delta: { content: (i ? ' ' : '') + word } }] })}\n\n`,
      );
    });
    res.write('data: [DONE]\n\n');
    return res.end();
  }
  res.writeHead(200, { ...cors, 'content-type': 'text/html' });
  res.end(PAGE_HTML);
});

await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

// chrome.i18n follows the OS UI language on macOS (--lang is ignored), so hide
// the zh_TW locale for the duration of the shot to force the English fallback.
const zhLocale = path.join(EXT_PATH, '_locales/zh_TW');
const zhBackup = `${zhLocale}.bak`;
await fs.rename(zhLocale, zhBackup);

const context = await chromium.launchPersistentContext('', {
  channel: 'chromium',
  headless: true,
  viewport: { width: 900, height: 560 },
  deviceScaleFactor: 2,
  args: [`--disable-extensions-except=${EXT_PATH}`, `--load-extension=${EXT_PATH}`],
});

let [sw] = context.serviceWorkers();
if (!sw) sw = await context.waitForEvent('serviceworker');
await sw.evaluate((s) => chrome.storage.local.set(s), {
  provider: 'openai-compat',
  compatBaseUrl: `http://127.0.0.1:${port}/v1`,
  compatModel: 'mock',
  debounceMs: 200,
  minChars: 5,
  minWords: 2,
});

const page = await context.newPage();
await page.goto(`http://127.0.0.1:${port}/`);
await page.locator('#ta').click();
await page
  .locator('#ta')
  .pressSequentially('Dear Prof. Chen, I very appreciate you help for review my paper.');
await page.locator('[data-inline-reformat] .hint').filter({ hasText: 'Tab' }).waitFor();
await page.screenshot({ path: OUT, clip: { x: 106, y: 24, width: 688, height: 344 } });
console.log(`saved ${OUT}`);

await context.close();
await fs.rename(zhBackup, zhLocale);
server.close();
