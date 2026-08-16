// Records the type → ghost card → Tab flow and converts it to docs/assets/demo.gif.
// Usage: node scripts/demo-gif.mjs   (requires ffmpeg)

import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EXT_PATH = path.join(ROOT, 'src');
const OUT = path.join(ROOT, 'docs/assets/demo.gif');
const SUGGESTION =
  'I really appreciate your help in reviewing my paper. Could we discuss the statistics section when you have time?';

const PAGE_HTML = `<!doctype html>
<html><head><style>
  body { margin: 0; min-height: 100vh; background: #eef1f5;
         font: 15px/1.5 system-ui, sans-serif; display: grid; place-items: start center; }
  .compose { margin-top: 60px; width: 660px; background: #fff; border-radius: 10px;
             box-shadow: 0 2px 12px rgba(0,0,0,.10); padding: 20px 24px 24px; }
  .compose h2 { margin: 0 0 12px; font-size: 15px; color: #444; font-weight: 600; }
  textarea { width: 100%; box-sizing: border-box; border: 1px solid #d8dee4; border-radius: 8px;
             font: inherit; padding: 12px; min-height: 120px; resize: none; outline: none; }
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
  };
  if (req.method === 'OPTIONS') {
    res.writeHead(204, cors);
    return res.end();
  }
  if (req.method === 'POST') {
    // Drip-feed chunks so the card visibly streams in the recording.
    res.writeHead(200, { ...cors, 'content-type': 'text/event-stream' });
    const words = SUGGESTION.split(' ');
    let i = 0;
    const timer = setInterval(() => {
      if (i >= words.length) {
        clearInterval(timer);
        res.write('data: [DONE]\n\n');
        return res.end();
      }
      const chunk = { choices: [{ delta: { content: (i ? ' ' : '') + words[i] } }] };
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      i += 1;
    }, 70);
    return;
  }
  res.writeHead(200, { ...cors, 'content-type': 'text/html' });
  res.end(PAGE_HTML);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const zhLocale = path.join(EXT_PATH, '_locales/zh_TW');
const zhBackup = `${zhLocale}.bak`;
await fsp.rename(zhLocale, zhBackup);
const videoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ir-demo-'));

try {
  const context = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    headless: true,
    viewport: { width: 760, height: 470 },
    recordVideo: { dir: videoDir, size: { width: 760, height: 470 } },
    args: [`--disable-extensions-except=${EXT_PATH}`, `--load-extension=${EXT_PATH}`],
  });

  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent('serviceworker');
  await sw.evaluate((s) => chrome.storage.local.set(s), {
    provider: 'openai-compat',
    compatBaseUrl: `http://127.0.0.1:${port}/v1`,
    compatModel: 'mock',
    debounceMs: 700,
    minChars: 5,
    minWords: 2,
  });

  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${port}/`);
  await page.waitForTimeout(600);
  await page.locator('#ta').click();
  await page
    .locator('#ta')
    .pressSequentially('Dear Prof. Chen, I very appreciate you help for review my paper.', {
      delay: 42,
    });
  await page.locator('[data-inline-reformat] .hint').filter({ hasText: 'Tab' }).waitFor();
  await page.waitForTimeout(900);
  await page.keyboard.press('Tab');
  await page.waitForTimeout(1600);

  await context.close(); // flushes the video
  const webm = fs.readdirSync(videoDir).find((f) => f.endsWith('.webm'));
  const webmPath = path.join(videoDir, webm);
  execFileSync('ffmpeg', [
    '-y',
    '-i',
    webmPath,
    '-vf',
    'fps=12,scale=760:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer',
    '-loop',
    '0',
    OUT,
  ]);
  console.log(`saved ${OUT} (${Math.round(fs.statSync(OUT).size / 1024)} KB)`);
} finally {
  await fsp.rename(zhBackup, zhLocale);
  fs.rmSync(videoDir, { recursive: true, force: true });
  server.close();
}
