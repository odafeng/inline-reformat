// Renders the extension icon (ghost-card motif: gray draft lines, amber
// suggestion card) at 512px via headless chromium, then resizes with sips.
// Usage: node scripts/icons.mjs

import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'src/icons');
fs.mkdirSync(OUT_DIR, { recursive: true });

const HTML = `<!doctype html>
<html><head><style>
  body { margin: 0; background: transparent; }
  .icon {
    width: 512px; height: 512px; box-sizing: border-box;
    background: #1f2937; border-radius: 96px;
    display: flex; flex-direction: column; justify-content: center;
    gap: 34px; padding: 88px 72px;
  }
  .line { height: 34px; border-radius: 17px; background: #6b7280; }
  .line.short { width: 62%; }
  .ghost {
    margin-top: 14px; background: #fffef8; border-radius: 28px;
    border-left: 26px solid #d4a72c; padding: 30px 28px;
    display: flex; flex-direction: column; gap: 26px;
    box-shadow: 0 10px 30px rgba(0,0,0,.35);
  }
  .ghost .line { background: #d4a72c; height: 30px; }
  .ghost .line.short { width: 52%; }
</style></head>
<body>
  <div class="icon">
    <div class="line"></div>
    <div class="line short"></div>
    <div class="ghost"><div class="line"></div><div class="line short"></div></div>
  </div>
</body></html>`;

const browser = await chromium.launch({ channel: 'chromium', headless: true });
const page = await browser.newPage({ viewport: { width: 512, height: 512 } });
await page.setContent(HTML);
const master = path.join(OUT_DIR, 'icon512.png');
await page.locator('.icon').screenshot({ path: master, omitBackground: true });
await browser.close();

for (const size of [128, 48, 32, 16]) {
  const out = path.join(OUT_DIR, `icon${size}.png`);
  fs.copyFileSync(master, out);
  execFileSync('sips', ['-z', String(size), String(size), out], { stdio: 'ignore' });
}
console.log(`icons written to ${OUT_DIR}`);
