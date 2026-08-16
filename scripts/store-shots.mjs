// Chrome Web Store screenshots (exactly 1280x800, device scale 1).
// Shot 1: ghost card in action. Shot 2: options page.
// Usage: node scripts/store-shots.mjs

import { chromium } from '@playwright/test';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EXT_PATH = path.join(ROOT, 'src');
const OUT_DIR = path.join(ROOT, 'docs/store');
fs.mkdirSync(OUT_DIR, { recursive: true });

const SUGGESTION =
  'I really appreciate your help in reviewing my paper. Could we discuss the statistics section when you have time?';

const PAGE_HTML = `<!doctype html>
<html><head><style>
  body { margin: 0; min-height: 100vh; background: #eef1f5;
         font: 17px/1.55 system-ui, sans-serif; display: grid; place-items: start center; }
  .compose { margin-top: 200px; width: 780px; background: #fff; border-radius: 12px;
             box-shadow: 0 2px 14px rgba(0,0,0,.10); padding: 26px 30px 30px; }
  .compose h2 { margin: 0 0 14px; font-size: 17px; color: #444; font-weight: 600; }
  textarea { width: 100%; box-sizing: border-box; border: 1px solid #d8dee4; border-radius: 10px;
             font: inherit; padding: 14px; min-height: 170px; resize: none; outline: none; }
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

// English fallback trick (chrome.i18n follows the OS UI language on macOS)
const zhLocale = path.join(EXT_PATH, '_locales/zh_TW');
const zhBackup = `${zhLocale}.bak`;
await fsp.rename(zhLocale, zhBackup);

try {
  const context = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    headless: true,
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    args: [`--disable-extensions-except=${EXT_PATH}`, `--load-extension=${EXT_PATH}`],
  });

  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent('serviceworker');
  const extId = new URL(sw.url()).host;
  await sw.evaluate((s) => chrome.storage.local.set(s), {
    provider: 'openai-compat',
    compatBaseUrl: `http://127.0.0.1:${port}/v1`,
    compatModel: 'mock',
    autoTrigger: true, // opt-in: only so the recording can show the card
    debounceMs: 200,
    minChars: 5,
    minWords: 2,
  });

  // Shot 1 — ghost card
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${port}/`);
  await page.locator('#ta').click();
  await page
    .locator('#ta')
    .pressSequentially('Dear Prof. Chen, I very appreciate you help for review my paper.');
  await page.locator('[data-inline-reformat] .hint').filter({ hasText: 'Tab' }).waitFor();
  await page.screenshot({ path: path.join(OUT_DIR, 'screenshot-1.png') });

  // Shot 2 — options page (reset to defaults so the Anthropic view shows)
  await sw.evaluate(() => chrome.storage.local.clear());
  const opts = await context.newPage();
  await opts.goto(`chrome-extension://${extId}/options.html`);
  await opts.waitForTimeout(300);
  await opts.screenshot({ path: path.join(OUT_DIR, 'screenshot-2.png') });

  await context.close();
  console.log(`saved screenshots to ${OUT_DIR}`);
} finally {
  await fsp.rename(zhBackup, zhLocale);
  server.close();
}
