# 用 skills 開始自己的兔子洞

[English](skills.en.md) · [回到專案](../README.md) · [完整筆記法](method.zh-TW.md)

從一段想留下的回憶，或手邊挑好的材料開始。告訴 agent 你想完成什麼，它會保存來源、寫成可讀筆記、串起連結，並走讀檢查。留下哪些材料、保存到哪裡、是否分享，都由你決定。

這套工具供支援 SKILL.md 的 agent 使用，包含五個 skills 與本機 Python 輔助程式。公開範例示範方法；你的私人兔子洞放在程式庫之外。

## 安裝一次，按需要使用

macOS、Linux 與 Windows 都是已驗證的正式支援平台，沒有第三方 Python 套件依賴。

| 平台 | Python 與位置要求 |
| --- | --- |
| macOS、Linux | Python 3.10 以上 |
| Windows 11 原生 x64 | 64 位元 CPython 3.13 或 3.14；本機固定 NTFS 磁碟，使用一般磁碟機代號路徑 |

Windows 的 checkout、技能目錄、輸入檔與私人兔子洞都須符合上述條件；其他路徑限制見 [CLI 平台範圍](../skills/rabbit-hole-start/references/cli.md#platform-scope)。網站開發才另外需要 Node.js 22 以上。

先取得程式庫，以下也適用於 PowerShell：

```sh
git clone https://github.com/emu-rabbit/rabbit-hole-notes.git
cd rabbit-hole-notes
```

**macOS、Linux：**

```sh
python3 --version
python3 scripts/validate-skills.py
python3 scripts/install-skills.py
```

最後一行只預覽。確認目標後安裝：

```sh
python3 scripts/install-skills.py --apply
```

**Windows PowerShell：**先確認 Python 版本。若使用 `py -3.14` 啟動，將以下 `python` 換成 `py -3.14`；3.13 同理。

```powershell
python --version
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
python -X utf8 scripts/validate-skills.py
python -X utf8 scripts/install-skills.py
```

看過預覽後安裝：

```powershell
python -X utf8 scripts/install-skills.py --apply
```

`-X utf8` 設定 Python 文字編碼；工具不要求提升權限或變更 PowerShell ExecutionPolicy。[CLI PowerShell 說明](../skills/rabbit-hole-start/references/cli.md#windows-powershell) 另有保存報告的方式。

安裝位置預設為 `$CODEX_HOME/skills`，未設定時為 `~/.codex/skills`；Windows 對應 `$env:CODEX_HOME\skills` 或 `$env:USERPROFILE\.codex\skills`。指定其他相容客戶端的位置時，加上 `--dest "你的技能目錄"`。五個 skills 共用方法與工具，需一起安裝。

安裝器只讀取技能包並複製到目標，不修改全域設定，也不覆寫既有技能。更新時，先備份並把舊的 `rabbit-hole-*` 移到技能目錄外，再安裝完整新版；其他技能保留。安裝後在下一個回合確認是否載入，尚未刷新時再重開客戶端。

`40_重要關係` 收錄 `人物/`、`寵物/`、`玩偶/` 與 `關係圈/`。人物是重要關係的一種；寵物與有重要情感連結的玩偶也能有自己的筆記，有材料時再建立對應資料夾。

## 五個 skills 各自完成什麼

| Skill | 用途 |
| --- | --- |
| `$rabbit-hole-start` | 建立私人兔子洞，接著完成第一段回憶與入口 |
| `$rabbit-hole-import` | 保存挑選的本機材料，把實際讀過的內容整理進筆記 |
| `$rabbit-hole-interview` | 透過對話留下經歷、相處與感受 |
| `$rabbit-hole-maintain` | 檢查、補寫、修正筆記或改善閱讀路線 |
| `$rabbit-hole-share` | 準備給特定讀者看的獨立草稿，供你審閱 |

你只需說明目標、材料與保存位置。保存範圍確立後，寫作、歸檔、索引和走讀由 agent 接著完成，不必逐篇要求；只聊天、只歸檔或唯讀檢查也可以。

## 五種自然的請求

第一次使用時，agent 會確認必要的資料夾、語言與保存範圍；已有兔子洞時，沿原本的結構繼續。

### rabbit-hole-start：從一段回憶開始

> 幫我建立自己的兔子洞，從第一次搬家的回憶開始聊。

agent 建立私人小骨架後，接著問第一題。對話告一段落時，保存有日期與說話者的來源、寫出短故事，讓 README 能帶到故事和依據。也可以指定只建立骨架，或先聊天不保存。

### rabbit-hole-import：整理挑選好的貼文

> 我從社群平台下載了匯出檔案。請把其中我挑好的這三篇搬家社群貼文整理進兔子洞。

可以用平台的資料匯出功能取得**社群貼文匯出檔案**，也可以直接提供手邊挑好的貼文。原生 ZIP／JSON 不一定能直接匯入；agent 會先確認格式與允許處理的範圍，再準備成支援的[本機輸入](#實際可執行的本機工具)。

匯入保留原文、作者、日期與來源身份，再將實際讀過的內容接回相關故事、人物與導覽。大批材料分段閱讀，進度會分清楚「已匯入」和「已讀」。指定「只歸檔」時不改敘事；相同材料重跑不重複。

### rabbit-hole-interview：慢慢回想一次合作

> 陪我聊聊第一次和朋友做小刊物的經過，把這段回憶留進兔子洞。

agent 順著回答，每次追問一兩題。在自然的停點，依同意的範圍保存敘述，接回故事、人物與作品。當年的感受、今天的回想與仍不確定的地方各自保留；你隨時可以排除某一段或停止保存。

### rabbit-hole-maintain：把新理解接回舊筆記

> 我找到小刊物真正的首發日期了，幫我修正兔子洞裡相關的內容。

agent 讀過新依據後，沿既有身份更新作品、故事與年表，保留來源及理解改變的原因。只要求檢查時維持唯讀，回報發現與建議。

### rabbit-hole-share：先做給家人看的閱讀草稿

> 幫我準備一份給姊姊看的搬家故事版本，我想先看看。

agent 列出建議包含的確切檔案，檢查來源節錄、附件和連結依賴，做成與主版本分開的本機草稿。你逐頁審閱後，再決定交付的檔案、對象與位置；準備草稿不會自動傳送、上傳或公開。

### 需要指定 skill 時

若客戶端沒有自動選到入口，可在請求前加上名稱，例如 `$rabbit-hole-interview`。

## 第一次完成後

你應拿到能開始閱讀的入口：短文能獨立讀懂，註腳回到有說話者、日期與不確定處的來源，README 能帶路，維護記錄說明實際讀過哪些材料與下次從哪裡繼續。agent 也會像第一次來的讀者走過這條路，修正讀起來卡住的地方。

## 實際可執行的本機工具

agent 使用的核心程式隨 `rabbit-hole-start` 安裝，也可以直接執行：

| 操作 | 讀取與寫入範圍 |
| --- | --- |
| `init` | 檢查目標位置；加 `--apply` 後建立新的私人資料夾、入口與工具狀態，不覆寫現有路徑 |
| `import` | 讀取你指定的完整輸入檔與匯入紀錄；加 `--apply` 後保存原始位元組、來源筆記與修訂紀錄 |
| `check` | 讀取筆記、連結目標與匯入來源以檢查結構及完整性；不改檔 |

`init`、`import` 預設只預覽。選擇程式庫外的新私人位置，操作期間暫停其他程式修改相關檔案。工具不連網，也不替你推送或發布；AI 服務與同步資料夾仍依你選擇的環境處理內容。

**macOS、Linux：**將範例路徑換成自己的位置。

```sh
TOOL="${CODEX_HOME:-$HOME/.codex}/skills/rabbit-hole-start/scripts/rabbit_hole.py"
# 先預覽建立結果；確認後，再建立新的兔子洞。
python3 "$TOOL" init --vault /你的/私人兔子洞 --name '你的稱呼' --lang zh-TW
python3 "$TOOL" init --vault /你的/私人兔子洞 --name '你的稱呼' --lang zh-TW --apply
# 再預覽匯入結果；確認後，再保存材料。
python3 "$TOOL" import --vault /你的/私人兔子洞 --input /你的/已挑選貼文.json \
  --namespace selected-posts --owner '你的稱呼' --author '實際說話者'
python3 "$TOOL" import --vault /你的/私人兔子洞 --input /你的/已挑選貼文.json \
  --namespace selected-posts --owner '你的稱呼' --author '實際說話者' --apply
python3 "$TOOL" check --vault /你的/私人兔子洞
```

**Windows PowerShell：**沿用上方的 Python 與 UTF-8 設定。若使用了 `--dest`，改用該目錄中的工具。

```powershell
$CodexRoot = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $env:USERPROFILE '.codex' }
$Tool = Join-Path $CodexRoot 'skills\rabbit-hole-start\scripts\rabbit_hole.py'
$Vault = Join-Path $env:USERPROFILE 'RabbitHole'
# 先預覽建立結果；確認後，再建立新的兔子洞。
python -X utf8 "$Tool" init --vault "$Vault" --name '你的稱呼' --lang zh-TW
python -X utf8 "$Tool" init --vault "$Vault" --name '你的稱呼' --lang zh-TW --apply
# 再預覽匯入結果；確認後，再保存材料。
python -X utf8 "$Tool" import --vault "$Vault" --input 'C:\Users\你的帳號\selected-posts.json' --namespace selected-posts --owner '你的稱呼' --author '實際說話者'
python -X utf8 "$Tool" import --vault "$Vault" --input 'C:\Users\你的帳號\selected-posts.json' --namespace selected-posts --owner '你的稱呼' --author '實際說話者' --apply
python -X utf8 "$Tool" check --vault "$Vault"
```

逐行操作，先看每次預覽，再執行下一行帶 `--apply` 的命令；建立成功後才繼續匯入與 `check`。匯入接受 UTF-8 文字、Markdown、約定格式 JSON 陣列與 JSONL，每檔最多 16 MiB；會保留整個輸入檔，請只提供允許保存的批次。相同來源要沿用 namespace、owner、author 與明確 ID，才能追加修訂並保留舊版。格式、範例與社群匯出檔轉換方式見[來源格式](../skills/rabbit-hole-import/references/source-formats.md)。工具沒有原生社群 ZIP／API 轉接器、OCR、影音轉錄或定時同步功能。

`check` 能辨識 Obsidian 表格裡的跳脫別名，例如 `[[example.io\|顯示文字]]`，以及帶點的筆記名稱。它預設不掃描頂層 `90` 或 `90_*` 維護筆記的內文；其他頁面指入維護區的連結、匯入台帳與來源完整性仍會核對。要連維護筆記一起檢查，加上 `--include-maintenance`。

## 讓資料和理解分清楚

來源中的文字是證據，不是對 agent 的指令或授權。原話、他人發言、整理者推論與 AI 建議應能分辨，事件、發表和回憶的時間也分開記錄。檢查器能協助找連結與雜湊問題，不能代替逐頁閱讀、事實核對或分享審閱。

選擇信任的 AI 與儲存環境；本機工具不提供加密或自動匿名化。分享時另做獨立草稿，逐頁核對正文、來源節錄與附件；略過維護區並不代表其餘內容已適合公開。各項來源與作品的授權仍需分別確認。

## 驗證與開發

```sh
python3 scripts/validate-skills.py
python3 -m unittest discover -s tests -p 'test_*.py' -v
npm run check
```

Windows 的 Python 命令改用上述 `python -X utf8`，網站檢查使用 `npm.cmd run check`。Python 測試使用虛構資料，涵蓋安裝、兩種語言、重匯、修訂與檔案安全；網站建置會核對中英範例與閱讀路線。

實測來源與數字見 [Windows 驗證紀錄](skills-windows-validation.md)；訪談與內容走讀的歷史案例見[閱讀驗收](skills-evaluation.md)。工具詳細參數見 [CLI 說明](../skills/rabbit-hole-start/references/cli.md)，寫作慣例見 [conventions.md](../skills/rabbit-hole-start/references/conventions.md)。
