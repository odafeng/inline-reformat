import { DEFAULT_SETTINGS, loadSettings } from './lib/defaults.js';

const $ = (id) => document.getElementById(id);
const msg = (key) => chrome.i18n.getMessage(key);
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

function localize() {
  for (const el of document.querySelectorAll('[data-i18n]')) {
    const text = msg(el.dataset.i18n);
    if (text) el.textContent = text;
  }
}

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

function collectSettings() {
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
  return s;
}

// Returns null when OK, or an i18n key describing why the endpoint is unusable.
async function ensureOriginPermission(s) {
  if (s.provider !== 'openai-compat' || !s.compatBaseUrl) return null;
  try {
    const origin = new URL(s.compatBaseUrl).origin + '/*';
    const granted = await chrome.permissions.request({ origins: [origin] });
    return granted ? null : 'statusDenied';
  } catch {
    return 'statusBadUrl';
  }
}

async function save() {
  const s = collectSettings();
  const errKey = await ensureOriginPermission(s);
  if (errKey) {
    $('status').textContent = msg(errKey);
    return;
  }
  await chrome.storage.local.set(s);
  $('status').textContent = msg('statusSaved');
  setTimeout(() => ($('status').textContent = ''), 2000);
}

async function testConnection() {
  const s = collectSettings();
  const errKey = await ensureOriginPermission(s);
  if (errKey) {
    $('status').textContent = msg(errKey);
    return;
  }
  $('status').textContent = msg('statusTesting');
  try {
    const res = await chrome.runtime.sendMessage({ type: 'test', settings: s });
    $('status').textContent = res?.ok ? msg('statusTestOk') : `✗ ${res?.error || 'no response'}`;
  } catch (err) {
    $('status').textContent = `✗ ${err?.message || err}`;
  }
}

localize();
$('provider').addEventListener('change', syncProviderVisibility);
$('save').addEventListener('click', save);
$('test').addEventListener('click', testConnection);
restore();
