# Privacy policy — Inline Reformat

Last updated: 2026-08-16

Inline Reformat is a bring-your-own-key browser extension. It has no server of its own, no account system, and no analytics. This page describes exactly what the extension does with your data.

## What data the extension processes

When you press Alt+R in a text field (or when you pause typing, if you enabled the optional auto-trigger in the options page — it is off by default), the extension takes **the single paragraph under your caret** and sends it to the LLM endpoint **you configured** in the options page. That is the only data that ever leaves your browser, and it goes only to that one endpoint:

- Anthropic (`api.anthropic.com`), if you configured an Anthropic API key, or
- the OpenAI-compatible base URL you entered yourself (for example a local Ollama server or OpenRouter).

The endpoint provider processes that text under **its own** privacy policy and terms. You choose the provider; the extension never picks one for you. If you point it at a model running on your own machine, your text never leaves your machine.

With the auto-trigger enabled, non-English text, text shorter than your configured minimum, and text on sites you blocklisted are still never sent automatically.

## What is stored, and where

- Your API key, endpoint URL, model name, rewrite prompt, and trigger settings are stored in `chrome.storage.local` on your computer. They are never synced, transmitted to us (there is no "us" to transmit to), or shared with any third party.
- The extension keeps no history of your text. Rewritten paragraphs are discarded from memory as soon as you accept or dismiss them.

## What the extension does not do

- No analytics, telemetry, or crash reporting of any kind.
- No selling or sharing of data. There is nothing collected to sell.
- No remote code. All code ships in the extension package and is open source.

## Permissions, in plain language

- **Access to websites you visit**: needed so the suggestion card can appear in any text field you type in. The content script only reads the field you are actively typing in.
- **storage**: saves your settings locally.
- **api.anthropic.com / your optional endpoint**: the destinations rewrite requests are sent to.

## Verifiability and contact

The complete source code is at <https://github.com/odafeng/inline-reformat>. For privacy questions, open an issue there.

---

## 中文摘要

這個擴充功能沒有自己的伺服器、不用註冊、沒有任何遙測。你按下 Alt+R 時（或啟用選項頁的自動觸發後停止打字時；預設關閉），游標所在的那一段文字會送到**你自己設定**的 LLM 端點（Anthropic 或你填的 OpenAI-compatible URL），除此之外沒有任何資料離開瀏覽器。API key 與設定只存在本機的 `chrome.storage.local`，不會同步或外傳。接本地模型時，文字完全不出你的機器。原始碼全部公開，可自行查核。
