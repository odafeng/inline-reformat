// Content script (classic, not ESM — shared logic is dynamic-imported below).
// Watches the focused editable, debounces typing pauses, asks the service
// worker for a rewrite, streams it into a ghost card, and replaces the
// paragraph in place on Tab.

(async () => {
  const [{ extractBlock }, { shouldTrigger }, { DEFAULT_SETTINGS }] = await Promise.all([
    import(chrome.runtime.getURL('lib/text-block.js')),
    import(chrome.runtime.getURL('lib/guards.js')),
    import(chrome.runtime.getURL('lib/defaults.js')),
  ]);

  let settings = { ...DEFAULT_SETTINGS };
  chrome.storage.local.get(DEFAULT_SETTINGS).then((s) => {
    settings = { ...DEFAULT_SETTINGS, ...s };
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    for (const [key, { newValue }] of Object.entries(changes)) settings[key] = newValue;
  });

  // ---------------------------------------------------------------- state
  const state = { lastAccepted: '', lastSuggestedFor: '', dismissedFor: '' };
  let field = null; // focused editable element
  let composing = false;
  let debounceTimer = null;
  let requestSeq = 0;
  let active = null; // { id, block, blockEl, suggestion, done }
  let port = null;

  // ---------------------------------------------------------------- port
  function getPort() {
    if (port) return port;
    port = chrome.runtime.connect({ name: 'rewrite' });
    port.onDisconnect.addListener(() => {
      port = null;
    });
    port.onMessage.addListener(onPortMessage);
    return port;
  }

  function onPortMessage(msg) {
    if (!active || msg.id !== active.id) return;
    if (msg.type === 'chunk') {
      active.suggestion += msg.text;
      renderCard();
    } else if (msg.type === 'done') {
      if (!active.suggestion.trim() || active.suggestion.trim() === active.block.text.trim()) {
        hideCard(); // nothing useful to offer
      } else {
        active.done = true;
        renderCard();
      }
    } else if (msg.type === 'error') {
      hideCard();
    }
  }

  // ---------------------------------------------------------------- editables
  function editableFrom(el) {
    if (!el || el.nodeType !== 1) return null;
    const tag = el.tagName;
    if (tag === 'TEXTAREA') return el;
    if (tag === 'INPUT' && /^(text|search|email|url)$/.test(el.type)) return el;
    if (el.isContentEditable) return el;
    return null;
  }

  function currentBlock() {
    if (field.isContentEditable) {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return null;
      let node = sel.anchorNode;
      if (!node || !field.contains(node)) return null;
      let blockEl = node.nodeType === 1 ? node : node.parentElement;
      while (blockEl && blockEl !== field && getComputedStyle(blockEl).display === 'inline') {
        blockEl = blockEl.parentElement;
      }
      if (!blockEl) return null;
      const text = blockEl.innerText.replace(/\n+$/, '');
      return { text, blockEl };
    }
    const { start, end, text } = extractBlock(field.value, field.selectionStart ?? 0);
    return { start, end, text, blockEl: null };
  }

  // ---------------------------------------------------------------- trigger
  function scheduleTrigger() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(maybeTrigger, settings.debounceMs);
  }

  function maybeTrigger() {
    if (!field || composing || !settings.enabled) return;
    if (settings.blocklist.includes(location.hostname)) return;
    const block = currentBlock();
    if (!block) return;
    if (!shouldTrigger(block.text, state, settings)) return;

    state.lastSuggestedFor = block.text;
    state.dismissedFor = '';
    const id = ++requestSeq;
    active = { id, block, blockEl: block.blockEl, suggestion: '', done: false };
    showCard();
    try {
      getPort().postMessage({ id, text: block.text });
    } catch {
      hideCard();
    }
  }

  function cancelActive() {
    if (!active) return;
    active = null;
    try {
      port?.postMessage({ type: 'cancel' });
    } catch {
      /* port already gone */
    }
  }

  // ---------------------------------------------------------------- ghost card
  let host = null;
  let cardText = null;
  let cardHint = null;

  function ensureCard() {
    if (host) return;
    host = document.createElement('div');
    host.setAttribute('data-inline-reformat', '');
    host.style.cssText = 'position:absolute;z-index:2147483647;top:0;left:0;';
    const root = host.attachShadow({ mode: 'open' });
    root.innerHTML = `
      <style>
        .card {
          font: 13px/1.5 system-ui, sans-serif;
          background: #fffef8;
          color: #1f2328;
          border: 1px solid #d0d7de;
          border-left: 3px solid #d4a72c;
          border-radius: 6px;
          box-shadow: 0 4px 14px rgba(0,0,0,.12);
          padding: 8px 10px 6px;
          max-width: 560px;
          white-space: pre-wrap;
          overflow-wrap: break-word;
        }
        .hint { margin-top: 4px; font-size: 11px; color: #656d76; }
        kbd {
          font: 10px/1 system-ui; border: 1px solid #d0d7de; border-bottom-width: 2px;
          border-radius: 3px; padding: 1px 4px; background: #f6f8fa;
        }
        @media (prefers-color-scheme: dark) {
          .card { background: #1c2128; color: #e6edf3; border-color: #444c56; }
          .hint { color: #909dab; }
          kbd { background: #2d333b; border-color: #444c56; color: #e6edf3; }
        }
      </style>
      <div class="card"><div class="text"></div><div class="hint"></div></div>`;
    cardText = root.querySelector('.text');
    cardHint = root.querySelector('.hint');
    document.documentElement.appendChild(host);
  }

  function positionCard() {
    if (!host || !field) return;
    const r = field.getBoundingClientRect();
    host.style.top = `${r.bottom + window.scrollY + 4}px`;
    host.style.left = `${r.left + window.scrollX}px`;
  }

  function showCard() {
    ensureCard();
    renderCard();
    positionCard();
    host.style.display = 'block';
  }

  function renderCard() {
    if (!host || !active) return;
    cardText.textContent = active.suggestion || '…';
    cardHint.innerHTML = active.done ? '<kbd>Tab</kbd> 接受 · <kbd>Esc</kbd> 關閉' : '✨ 改寫中…';
    positionCard();
  }

  function hideCard() {
    if (host) host.style.display = 'none';
    active = null;
  }

  // ---------------------------------------------------------------- accept
  function accept() {
    if (!active?.done || !field) return;
    const { block, suggestion } = active;
    field.focus();
    if (field.isContentEditable) {
      const el = active.blockEl;
      if (!el?.isConnected || el.innerText.replace(/\n+$/, '') !== block.text) {
        hideCard();
        return;
      }
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    } else {
      if (extractBlock(field.value, block.start).text !== block.text) {
        hideCard();
        return;
      }
      field.setSelectionRange(block.start, block.end);
    }
    state.lastAccepted = suggestion;
    // Deprecated but the only API that preserves the native undo stack.
    if (!document.execCommand('insertText', false, suggestion)) {
      if (!field.isContentEditable) {
        field.setRangeText(suggestion, block.start, block.end, 'end');
        field.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
    hideCard();
  }

  // ---------------------------------------------------------------- listeners
  document.addEventListener('focusin', (e) => {
    const el = editableFrom(e.target);
    if (el) field = el;
  });

  document.addEventListener('focusout', (e) => {
    if (e.target === field) {
      clearTimeout(debounceTimer);
      cancelActive();
      hideCard();
      field = null;
    }
  });

  document.addEventListener('compositionstart', () => {
    composing = true;
    clearTimeout(debounceTimer);
  });
  document.addEventListener('compositionend', () => {
    composing = false;
  });

  document.addEventListener('input', (e) => {
    if (!field) return;
    if (e.target !== field && !field.contains(e.target)) return;
    cancelActive();
    hideCard();
    if (!composing) scheduleTrigger();
  });

  document.addEventListener(
    'keydown',
    (e) => {
      if (!active) return;
      if (e.key === 'Tab' && active.done) {
        e.preventDefault();
        e.stopPropagation();
        accept();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        state.dismissedFor = active.block.text;
        cancelActive();
        hideCard();
      }
    },
    true,
  );

  window.addEventListener('scroll', () => positionCard(), { passive: true });
  window.addEventListener('resize', () => positionCard(), { passive: true });
})();
