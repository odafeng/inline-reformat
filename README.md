# Inline Reformat

打字停頓 1.5 秒，你剛打的那段英文會被 LLM 改寫成通順版本，出現在輸入框下方的小卡片裡。按 `Tab` 接受、`Esc` 關閉、繼續打字就自動消失。不用反白、不用右鍵。

刻意不做全自動取代：LLM 偶爾會改到語意，醫療信件被悄悄改掉一個否定詞是真實風險，所以每個建議都要過你的眼睛才落地（理由詳見 `docs/adr/0001`）。IME 組字期間完全不動你的輸入框，中英混打安全。

## 安裝

1. `chrome://extensions` → 開啟「開發人員模式」
2. 「載入未封裝項目」→ 選這個 repo 的 `src/` 資料夾
3. 右鍵擴充功能圖示 → 選項 → 填 API key

## 後端設定

| Provider          | 用途                                                                                                                       |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Anthropic（預設） | `claude-haiku-4-5`，一次建議成本約 0.1 美分以內                                                                            |
| OpenAI-compatible | 本地 LLM（Ollama / vLLM / LM Studio）或 OpenRouter 之類，填 base URL（含 `/v1`）即可；病人相關內容建議走這條，文字不出內網 |

改寫的 system prompt 在選項頁可以直接編輯。想要更學術或更口語的語感，改那裡就好。

API key 存在 `chrome.storage.local`，不同步到其他機器，也不會送到任何第三方；網路請求只發往你設定的那一個端點。

## 已知限制

- Google Docs 不支援（canvas 渲染，所有同類工具都做不到）
- Overleaf 原生編輯器（CodeMirror）v1 不支援
- 只處理英文；打中文不會觸發、也不會燒 API

## 開發

```bash
npm install
npm test          # vitest 單元測試（lib/ 純函式）
npm run smoke     # Playwright：真的載入擴充功能 + mock LLM 端點跑完整流程
npm run lint
```

架構說明在 `docs/superpowers/specs/`，兩個關鍵決策（互動模型、雙薄 client）在 `docs/adr/`。

Pre-commit hook 需要一次性設定：`git config core.hooksPath .githooks`。
