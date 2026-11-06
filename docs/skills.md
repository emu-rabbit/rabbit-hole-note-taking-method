# 用 skills 開始自己的兔子洞

[English](skills.en.md) · [回到專案](../README.md) · [完整筆記法](../examples/emu-rabbit-tw/00_入口/兔子洞筆記法.md)

可以從一段想留下的回憶開始，不必先準備一生的資料。這七個 skills 把起步、保存來源、訪談、寫作、連結、維護和分享前審閱分開，讓 agent 能接手一小段實際工作，再把接下去的位置留好。

它們是給支援 SKILL.md 的 agent 使用的工具組，附本機 Python 輔助程式，處理你挑選的來源檔案。留下哪些材料、怎麼敘述、是否分享，都由你決定。公開範例示範方法；你的兔子洞從自己的材料開始。

## 安裝一次，按需要使用

本機安裝器與輔助程式目前支援 macOS、Linux，需要 Python 3.10 以上；尚未支援 Windows。沒有 Python 套件依賴；網站開發才另外需要 Node.js 22 以上。先用 `python3 --version` 確認版本，如果電腦上的 python3 較舊，請改用你已安裝的新版 Python。不要把私人資料放進這個公開程式庫。

```sh
git clone https://github.com/emu-rabbit/rabbit-hole-notes.git
cd rabbit-hole-notes
python3 scripts/validate-skills.py
python3 scripts/install-skills.py
```

最後一行只預覽。確認後安裝：

```sh
python3 scripts/install-skills.py --apply
```

預設放在 `$CODEX_HOME/skills`，未設定時為 `~/.codex/skills`。也可以用 `--dest /你的/skills/資料夾` 指定目的地，例如另一個相容 agent 的技能目錄。七個 skills 共用起步 skill 裡的筆記法、約定與工具，必須一起安裝。安裝後在下一個回合確認是否能選到；若目前客戶端尚未重新載入，重新開啟它。

安裝器會先檢查全部檔案、連結和衝突，不覆寫既有 skills，也不修改全域設定。已裝過同名版本時會停止：先備份並由你決定如何移走原本七個目錄，再安裝新版；目前沒有自動更新或移除指令。其他 skills 不受影響。使用相容 agent 的載入方式可能不同；此處驗證的是檔案安裝與 Codex 格式，沒有宣稱各家客戶端都已實測。

## 第一次，給 agent 這樣的請求

> 用 $rabbit-hole-start 在我指定的新資料夾建立私人兔子洞，使用繁體中文。我只想從一段回憶開始，不讀其他資料，也不分享。先問我一題。

接著說一件你願意留下的事就好。agent 會先確認保存範圍，再把敘述保留成來源，寫成可讀的小篇章，從入口接到它。你也可以只要求初始化，或只聊聊而不存檔。沒有說過的心情、人物關係與結局，不會為了讓文章完整而補造。

如果已經有兔子洞，直接給它那個資料夾與要做的事，agent 會沿原本的結構繼續整理。

第一次做完，實際確認四件事：

1. 同意保存的回憶已成為有說話者、敘述日期和不確定處的來源，不需要為此先做一份社群匯出。
2. 一篇短文能獨立讀懂，註腳能回到真正的來源段落。
3. README 能帶到文章，來源索引不再寫「尚無來源」，也能回到入口。
4. 維護筆記記下實際讀過的材料，以及下次從哪裡繼續。

接著像第一次來的讀者讀一遍：能理解場景、認識這個人、找到依據，也知道在哪裡可以停嗎？即使結構檢查通過，讀起來卡住的文章和路線仍值得回頭調整。

## 七個 skills 各自做什麼

| Skill | 何時用 | 完成後留下什麼 |
| --- | --- | --- |
| `$rabbit-hole-start` | 從零起步、看下一步 | 私人小骨架、實際入口與第一步 |
| `$rabbit-hole-import` | 帶入明確挑選的本機材料 | 原始輸入、來源頁、定位與增量台帳 |
| `$rabbit-hole-interview` | 想補回憶、相處與感受 | 一兩題舒服的對話；獲准後保存有日期的敘述 |
| `$rabbit-hole-write` | 把來源寫成可讀文章 | 有依據的故事、人物、生活或作品頁 |
| `$rabbit-hole-connect` | 筆記已有內容、想讓人走得進去 | 自然連結、索引、年表與短閱讀路線 |
| `$rabbit-hole-maintain` | 有新材料、修正或要接續整理 | 有範圍的更新、理解變化和實際閱讀進度 |
| `$rabbit-hole-share` | 想準備給某些人看的版本 | 與主版本分開、逐頁審閱的本機草稿 |

一般順序是「起步 → 匯入或訪談 → 寫作 → 連結 → 維護」。不是每次都要走完。分享完全可選，也不會因為做了閱讀草稿就自動上傳。

## 實際可執行的本機工具

核心程式隨 `rabbit-hole-start` 一起安裝。以下以預設目錄示範，`/你的/…` 要換成自己的路徑：

```sh
TOOL="${CODEX_HOME:-$HOME/.codex}/skills/rabbit-hole-start/scripts/rabbit_hole.py"
python3 "$TOOL" init --vault /你的/新私人兔子洞 --name '你的稱呼' --lang zh-TW
# 看過預覽後，在同一命令加上 --apply 才會寫入。
python3 "$TOOL" import --vault /你的/私人兔子洞 --input /你的/已挑選貼文.json \
  --namespace selected-posts --owner '你的稱呼' --author '實際說話者'
python3 "$TOOL" check --vault /你的/私人兔子洞
```

`init` 和 `import` 預設只預覽；`check` 永遠唯讀。初始化不覆寫現有路徑，寫入命令拒絕 Git 儲存庫內或經過符號連結的私人資料夾。程式不建立 remote、不推送、不改分享設定、不開網路連線。更多參數、檔案位置與失敗處理見 [CLI 說明](../skills/rabbit-hole-start/references/cli.md)。

匯入支援 UTF-8 文字、Markdown、約定格式的 JSON 陣列與 JSONL，每個輸入檔最多 16 MiB。保留來源 ID、說話者、事件／發表／敘述時間、原始位元組與雜湊。相同材料重跑不重複；相同 ID 的變動保存成新修訂，不覆蓋舊來源。沒有穩定 ID 時按內容識別，修改過的文字會視為新來源，不能假稱已自動對上同一篇。

匯入會保留整個輸入檔的原始位元組。若大檔混有允許和排除的內容，請先提供獨立的允許批次；若挑選本身就得讀到排除內容，先請提供者準備乾淨的子集。

[來源格式與虛構範例](../skills/rabbit-hole-import/references/source-formats.md) 說明怎麼準備材料。**Facebook、Instagram、Threads、X、LINE、Discord、Email 等平台的原生 ZIP／API 尚無專用轉接器。** agent 可在你授權的範圍內查看實際格式、挑選與轉換，保留映射和來源，但這不是程式已支援那些平台。圖片、影音、OCR、語音轉錄、定時同步也未包含。

## 讓資料和理解分清楚

來源成功匯入，不代表 agent 已經讀完。人的原話、他人發言、整理者理解和 AI 建議各有位置；貼文日期、事情發生的時間和今天回憶的時間也要分開。新材料會接回原有人物、故事或作品，不因角色改變就另造一個人。

檢查器能找部分本機連結、錨點、重複 ID 和來源完整性問題。它不是完整 Markdown 解析器，也不能證明敘事正確、匿名化完成或可以公開。仍要逐頁讀過，實際走一次入口、故事和來源。

「本機工具」只表示輔助程式不連網，**不代表你使用的 AI 服務或同步資料夾不會接觸內容**。請自己選擇信任的處理環境和材料範圍。工具不提供加密、存取控制或自動隱私判定。分享 skill 刻意採逐檔選擇與人工審閱，沒有自動打包／發布命令；不會把排除維護區當成已經安全。

## 驗證與開發

```sh
python3 scripts/validate-skills.py
python3 -m unittest discover -s tests -p 'test_*.py' -v
npm run check
```

測試用虛構素材涵蓋兩種語言的起步、可重跑匯入、修訂保留、來源注入、路徑界線、安裝隔離和既有網站。測試不是對所有 agent 行為或私密資料的安全保證。作者的完整筆記法保持原文，工具慣例另放在 [conventions.md](../skills/rabbit-hole-start/references/conventions.md)。整體 repo 的授權說明仍適用，這裡沒有替任何來源或作品追加重用授權。

[閱讀實際驗收紀錄與全虛構產物](skills-evaluation.md)，查看初版缺點、skills 修訂及再次走讀的結果。
