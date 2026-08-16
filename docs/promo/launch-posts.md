# 發文素材與能見度作戰清單

貼文全部可直接複製。順序建議：先把 repo 門面完成（social preview 上傳、Release 已發），
Web Store 過審拿到連結後再打 Show HN 和 Reddit，一次把流量導到能安裝的地方。

## 先做的兩件手動小事

1. **上傳 social preview**：repo → Settings → General → Social preview → 上傳
   `docs/assets/social-preview.png`。之後貼到任何社群平台都會顯示這張卡。
2. **Pin 到個人檔案**：github.com/odafeng → Customize your pins → 勾 inline-reformat。

## Show HN（過審後再發，附 Web Store 連結）

**Title（≤80 字元）**

```
Show HN: A BYOK Chrome extension that rewrites my English as I type
```

**內文**

```
I'm a colorectal surgeon in Taiwan. English is my second language, and most of my
day ends in it anyway: papers, peer reviews, emails to editors. My loop used to be
copy the sentence into a chatbot, ask for a rewrite, paste it back. Dozens of times
a day.

So I built a Chrome extension that removes the loop. When I pause typing for 1.5
seconds, the paragraph under my caret is sent to an LLM and the rewrite streams
into a small card under the input box. Tab accepts it in place, Esc dismisses it,
and typing again makes it go away. No selection, no context menu.

Two design decisions I'd defend:

1. It never auto-replaces. A rewrite occasionally flips meaning, and a non-native
speaker is exactly the person who won't notice. Every change passes your eyes.
This also makes it safe with IMEs: the field is untouched until you press Tab, so
typing Chinese mid-sentence can't corrupt the composition buffer.

2. BYOK, no server. Your key goes in the options page, requests go straight from
the browser to the endpoint you chose. It speaks the Anthropic API natively and
any OpenAI-compatible endpoint, so pointing it at Ollama on your own machine means
your text never leaves your machine. The whole thing is ~600 lines of plain JS
with no build step, so you can audit what touches your key before pasting it in.

Known limitations: Google Docs doesn't work (canvas rendering), CodeMirror/Monaco
editors not yet supported.

Repo: https://github.com/odafeng/inline-reformat
```

## r/LocalLLaMA（本地模型角度）

**Title**

```
I built a Chrome extension that rewrites my English as I type, and it runs entirely against my local Ollama
```

**內文**

```
Non-native English speaker here. I write papers and emails in English all day and
got tired of the copy-to-chatbot-paste-back loop, so I made a browser extension:
pause typing for 1.5 s, the current paragraph gets rewritten, the result streams
into a card under the input box, Tab accepts it in place.

The part this sub might care about: it talks to any OpenAI-compatible endpoint.
Point the base URL at Ollama/vLLM/LM Studio and everything stays on your machine.
There's no server, no account, no telemetry; the code is ~600 lines of vanilla JS
you can read in one sitting. A 7B–14B instruct model is honestly enough for
"make this sentence sound native".

It deliberately never auto-replaces your text (LLM rewrites sometimes shift
meaning), and it's IME-safe for CJK typers.

MIT licensed: https://github.com/odafeng/inline-reformat
```

## X / Twitter thread（英文，3 則）

```
1/ I write English all day as a second language: papers, reviews, emails.
The copy-into-ChatGPT-paste-back loop was eating my life, so I built a Chrome
extension that removes it.

Pause typing → rewrite streams into a card → Tab to accept. [附 demo.gif]

2/ Design choice I care about: it never auto-replaces. An LLM rewrite can flip a
negation, and a non-native speaker is exactly who won't catch it. Every change
passes your eyes. Also IME-safe: your field is untouched until you press Tab.

3/ It's BYOK and serverless. Your Anthropic key, or your own Ollama box, and your
text goes nowhere else. ~600 lines of plain JS, MIT, no build step.

https://github.com/odafeng/inline-reformat
```

## Threads / Facebook（繁中，台灣社群）

```
身為每天要用英文寫論文、回 reviewer、跟編輯通信的外科醫師，我以前的日常是：
把句子複製到 ChatGPT、請它改通順、再貼回去。一天幾十次。

所以我寫了一個 Chrome 擴充功能：打字停頓 1.5 秒，游標所在的段落自動改寫，
結果串流顯示在輸入框下方的小卡片，按 Tab 原地取代，Esc 關掉，繼續打字它就消失。
不用反白、不用右鍵。

幾個堅持：
・不自動取代。LLM 偶爾會改到語意，母語不是英文的人恰好最難發現，所以每個
　建議都要過你的眼睛。中文輸入法組字中完全不動你的輸入框。
・自備 API key，沒有伺服器、不註冊帳號。接 Claude，或接你自己機器上的
　Ollama，後者文字完全不出你的電腦。
・全部約 600 行純 JavaScript，開源 MIT，想稽核隨時可以看。

GitHub: https://github.com/odafeng/inline-reformat
```

## Awesome lists（各發一個 PR，帶穩定長尾流量）

| List                                         | 加入段落               | Entry 行                                                                                                                                                                                                       |
| -------------------------------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EndoTheDev/Awesome-Ollama (480★)             | Tools / Browser        | `- [Inline Reformat](https://github.com/odafeng/inline-reformat) - Chrome extension that rewrites the paragraph you are typing into fluent English via your local Ollama; ghost-suggestion UX, Tab to accept.` |
| themeselection/best-chrome-extensions (569★) | Writing / Productivity | `- [Inline Reformat](https://github.com/odafeng/inline-reformat) - BYOK English rewriting while you type; suggestion card, Tab to accept, works with Anthropic or any OpenAI-compatible endpoint.`             |
| linsa-io/chrome-extensions (481★)            | AI / Writing           | 同上                                                                                                                                                                                                           |

送 PR 時遵守各 list 的 CONTRIBUTING 格式（字母排序、句尾句點等），一次一條不夾帶。

## 其他管道（依成本效益排序)

1. **Chrome Web Store 本身**就是搜尋管道：listing 已含 ESL、rewrite、BYOK 等關鍵字。
2. **Product Hunt**：等 Web Store 連結 + 幾則使用者回饋後再上，冷啟動的 PH 效果差。
3. **Colon & Code 頻道**：一支 3 分鐘「我為什麼做這個 + demo」影片，描述欄放 repo
   連結。你自己的受眾（醫療 x 研究）正是目標使用者。
4. **dev.to / Hashnode 文章**：把 ADR-0001「為什麼不做自動取代」擴寫成短文，
   工程決策文比宣傳文擴散得好。

## 發文時間

Show HN 與 Reddit 都以美東上午（台灣 21:00–24:00）觸及最好。HN 一次沒起來，
隔幾週改個角度可以再發一次，這是社群接受的做法。
