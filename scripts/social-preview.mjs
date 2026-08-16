// Renders docs/assets/social-preview.png (1280x640) for the GitHub social card.
// Usage: node scripts/social-preview.mjs  → upload via repo Settings → Social preview.

import { chromium } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs/assets/social-preview.png');

const HTML = `<!doctype html>
<html><head><style>
  * { margin: 0; box-sizing: border-box; }
  body {
    width: 1280px; height: 640px; background: #1f2937;
    font-family: system-ui, sans-serif; display: flex; align-items: center;
    padding: 0 72px; gap: 56px; color: #e6edf3;
  }
  .left { flex: 1.05; }
  h1 { font-size: 64px; letter-spacing: -1px; }
  .tag { margin-top: 18px; font-size: 27px; line-height: 1.45; color: #cbd5e1; }
  .tag b { color: #d4a72c; font-weight: 600; }
  .byok { margin-top: 30px; font-size: 21px; color: #94a3b8; }
  .byok span { color: #e6edf3; }
  .right { flex: 1; }
  .compose {
    background: #fff; border-radius: 14px; padding: 22px 24px;
    box-shadow: 0 18px 50px rgba(0,0,0,.45); color: #1f2328;
  }
  .compose .label { font-size: 15px; font-weight: 600; color: #57606a; margin-bottom: 10px; }
  .field {
    border: 1px solid #d8dee4; border-radius: 10px; padding: 14px;
    font-size: 19px; line-height: 1.5; color: #1f2328; min-height: 96px;
  }
  .ghost {
    margin-top: 10px; background: #fffef8; border: 1px solid #d0d7de;
    border-left: 5px solid #d4a72c; border-radius: 10px; padding: 14px 16px;
    font-size: 19px; line-height: 1.5; box-shadow: 0 8px 22px rgba(0,0,0,.18);
  }
  .hint { margin-top: 9px; font-size: 14px; color: #656d76; }
  kbd {
    font: 13px/1 system-ui; border: 1px solid #d0d7de; border-bottom-width: 3px;
    border-radius: 5px; padding: 2px 7px; background: #f6f8fa;
  }
</style></head>
<body>
  <div class="left">
    <h1>Inline Reformat</h1>
    <div class="tag">Pause typing, get a <b>fluent English rewrite</b> in a ghost card. Press <b>Tab</b> to accept.</div>
    <div class="byok">Bring your own key · no server, no account · <span>Claude or your local LLM</span></div>
  </div>
  <div class="right">
    <div class="compose">
      <div class="label">New message</div>
      <div class="field">Dear Prof. Chen, I very appreciate you help for review my paper.</div>
      <div class="ghost">I really appreciate your help in reviewing my paper.
        <div class="hint"><kbd>Tab</kbd> accept · <kbd>Esc</kbd> dismiss</div>
      </div>
    </div>
  </div>
</body></html>`;

const browser = await chromium.launch({ channel: 'chromium', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 640 } });
await page.setContent(HTML);
await page.screenshot({ path: OUT });
await browser.close();
console.log(`saved ${OUT}`);
