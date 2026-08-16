# Chrome Web Store 上架手冊

所有素材在這個資料夾與 `dist/`。你要做的只有註冊帳號、上傳、貼文字、送審。

## 0. 註冊開發者帳號（一次性 US$5）

https://chrome.google.com/webstore/devconsole → 用你的 Google 帳號登入 → 付 $5 註冊費。
建議 publisher 顯示名稱用 `Fredric Huang` 或 `Colon & Code`。

## 1. 上傳套件

「New item」→ 上傳 `dist/inline-reformat-0.1.1.zip`（repo 裡跑 `npm run pack` 重新產生）。

## 2. Store listing 分頁

| 欄位        | 填什麼                                                   |
| ----------- | -------------------------------------------------------- |
| Title       | 自動帶入 Inline Reformat                                 |
| Summary     | 自動帶入 manifest 描述                                   |
| Description | 貼下方 Description 區塊                                  |
| Category    | Productivity → Communication（或 Tools）                 |
| Language    | English；之後可再加 Chinese (Traditional) 版本           |
| Store icon  | 上傳 `src/icons/icon128.png`                             |
| Screenshots | 上傳 `docs/store/screenshot-1.png` 和 `screenshot-2.png` |

### Description（貼這段）

```
Pause typing for a moment and the sentence you just wrote comes back as fluent English, in a small card under the input box. Press Tab to accept it, Esc to dismiss, or just keep typing and it disappears. No text selection, no right-click menu, no leaving the field.

Built for people who write English as a second language all day (emails, papers, code review comments) and are tired of the copy-into-ChatGPT-paste-back loop.

BRING YOUR OWN KEY

There is no server behind this extension and no account to create. You plug in your own API key, and every request goes straight from your browser to the endpoint you configured. No one else sees your text, and nothing is logged.

- Works with an Anthropic API key out of the box (claude-haiku-4-5 by default; a rewrite costs a fraction of a cent)
- Or point it at any OpenAI-compatible endpoint: Ollama or vLLM on your own hardware, LM Studio, OpenRouter
- With a local model, your text never leaves your machine
- Open source, about 600 lines of plain JavaScript, no build step: github.com/odafeng/inline-reformat

WHY A SUGGESTION CARD INSTEAD OF AUTO-REPLACE

An LLM rewrite occasionally shifts meaning, and if English is not your first language you are the person least likely to notice. Every suggestion passes your eyes before it lands. This also makes the extension safe with IMEs: your input field is never touched until you press Tab, so typing Chinese, Japanese, or Korean mid-sentence cannot corrupt the composition. Replacement uses the browser's native editing command, so Cmd+Z undoes an accepted suggestion like any other edit.

WHEN IT TRIGGERS

Only after a configurable pause, only on mostly-English paragraphs of reasonable length, never during IME composition, never on sites you blocklist, and never twice for the same text. Typing again cancels the request. Errors are silent; a dead endpoint never interrupts your writing.

The rewrite prompt is fully editable in Options. Want warmer emails or more formal manuscripts? Say so there.

Not supported: Google Docs (canvas rendering) and code editors like CodeMirror/Monaco.
```

## 3. Privacy 分頁

**Single purpose description（貼這段）**

```
Rewrites the paragraph the user is typing into fluent English, using an LLM API endpoint and API key that the user configures themselves.
```

**Permission justifications（每格貼對應段落）**

- `storage`:

```
Stores the user's settings locally: API key, endpoint URL, model name, rewrite prompt, trigger thresholds, and site blocklist. Nothing is synced or transmitted.
```

- Host permission `https://api.anthropic.com/*`:

```
Sends the paragraph being rewritten to the Anthropic Messages API when the user has configured an Anthropic API key. This is the default backend.
```

- Content scripts on all sites（`<all_urls>`）:

```
The extension's single purpose is to offer rewrite suggestions in any text field the user types in, on whatever site they happen to be writing (email, issue trackers, review systems). The content script only reads the field the user is actively typing in, and only the single paragraph under the caret is ever sent to the user-configured endpoint. No page content is read beyond that field, and nothing is collected or logged.
```

- Optional host permissions（`https://*/*`, `http://*/*`）:

```
Requested at runtime only when the user enters a custom OpenAI-compatible endpoint URL (for example a local Ollama server or OpenRouter). The permission is scoped to that single origin and is requested with a user gesture from the options page.
```

**Remote code**: 選 **No, I am not using remote code**。

**Data usage**：勾 **Website content**（使用者輸入的文字會送到使用者自己設定的端點）。三個 certification 都可以勾：不賣資料、不用於單一用途以外、不用於信用評估。

**Privacy policy URL**:

```
https://github.com/odafeng/inline-reformat/blob/main/PRIVACY.md
```

## 4. Distribution 分頁

Visibility: Public。Regions: all。

## 5. 送審

「Submit for review」。因為 content script 跑在所有網站上，會進人工審查，通常幾個工作天。被退件最常見的原因是權限說明不清楚；上面第 3 節的文字就是為此寫的。

## 版本更新流程

1. 改 `src/manifest.json` 與 `package.json` 的版本號
2. `npm run pack`
3. Dashboard → 該項目 → Package → Upload new package → 送審
