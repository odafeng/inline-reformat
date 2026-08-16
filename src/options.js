import { DEFAULT_SETTINGS, loadSettings } from './lib/defaults.js';

const $ = (id) => document.getElementById(id);
const FIELDS = [
  'enabled',
  'provider',
  'anthropicApiKey',
  'anthropicModel',
  'compatBaseUrl',
  'compatApiKey',
  'compatModel',
  'systemPrompt',
  'debounceMs',
  'minChars',
  'minWords',
];

function syncProviderVisibility() {
  const compat = $('provider').value === 'openai-compat';
  $('anthropic-fields').hidden = compat;
  $('compat-fields').hidden = !compat;
}

async function restore() {
  const s = await loadSettings();
  for (const key of FIELDS) {
    const el = $(key);
    if (el.type === 'checkbox') el.checked = s[key];
    else el.value = s[key];
  }
  $('blocklist').value = s.blocklist.join('\n');
  syncProviderVisibility();
}

async function save() {
  const s = {};
  for (const key of FIELDS) {
    const el = $(key);
    if (el.type === 'checkbox') s[key] = el.checked;
    else if (el.type === 'number') s[key] = Number(el.value) || DEFAULT_SETTINGS[key];
    else s[key] = el.value.trim();
  }
  s.blocklist = $('blocklist')
    .value.split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (s.provider === 'openai-compat' && s.compatBaseUrl) {
    try {
      const origin = new URL(s.compatBaseUrl).origin + '/*';
      const granted = await chrome.permissions.request({ origins: [origin] });
      if (!granted) {
        $('status').textContent = '未授權該網域，無法呼叫此端點';
        return;
      }
    } catch {
      $('status').textContent = 'Base URL 格式不正確';
      return;
    }
  }

  await chrome.storage.local.set(s);
  $('status').textContent = '已儲存 ✓';
  setTimeout(() => ($('status').textContent = ''), 2000);
}

$('provider').addEventListener('change', syncProviderVisibility);
$('save').addEventListener('click', save);
restore();
