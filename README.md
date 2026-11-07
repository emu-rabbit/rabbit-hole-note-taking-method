# 兔子洞筆記法 · Rabbit Hole Notes

[English](README.en.md) · [介紹網站](https://emu-rabbit.github.io/rabbit-hole-notes/?lang=zh-TW) · [走進公開範例](https://emu-rabbit.github.io/rabbit-hole-notes/reader/index.html?lang=zh-TW)

兔子洞是一種用來記錄一個「人」的筆記法。把人生經歷、重要的人、相處、故事與創作放在一起，讓後來走進來的人或 agent 能沿著時間和連結，慢慢認識你。

這個 repo 放著方法介紹網站、可在瀏覽器閱讀的公開範例、網站原始碼，以及可以安裝的兔子洞 skills 工具組。範例是絵夢羽さ沂願意分享的 55 篇精選筆記，另有內容範圍相同的獨立英文版。你可以先走一小段故事，再回來看它怎麼組織。

## 從哪裡開始

- **想直接建立自己的兔子洞**：安裝[五個 skills](docs/skills.md)，從一段回憶或你挑選的本機材料起步。建立、匯入、訪談、整理與維護、準備分享版本各是一個完整入口；agent 負責寫作、串聯與走讀，資料預設留在私人工作區。
- **想先感受兔子洞怎麼讀**：打開[中文範例](https://emu-rabbit.github.io/rabbit-hole-notes/reader/index.html?lang=zh-TW)。入口提供三條短路線，從一盒馬卡龍、一件工具，或她身邊的兩個人開始。範例裡的閱讀地圖再帶你走深。
- **想了解方法**：先看[網站介紹](https://emu-rabbit.github.io/rabbit-hole-notes/?lang=zh-TW)，再讀完整的[兔子洞筆記法](docs/method.zh-TW.md)。方法正文獨立於個人範例。
- **想在 Obsidian 裡體驗**：在範例閱讀器按「下載範例」，解壓後將含 README.md 的資料夾開成儲存庫。從 README 開始，不需要社群外掛。
- **想用英文閱讀**：從 [English website](https://emu-rabbit.github.io/rabbit-hole-notes/?lang=en) 進入 [English example](https://emu-rabbit.github.io/rabbit-hole-notes/reader-en/index.html?lang=en)。文章、來源譯文、資料夾與重要檔名都使用英文；閱讀器切換語言會前往同一篇的另一語言版本。

也可以直接下載[中文範例 ZIP](https://emu-rabbit.github.io/rabbit-hole-notes/downloads/emu-rabbit-tw.zip) 或 [English example ZIP](https://emu-rabbit.github.io/rabbit-hole-notes/downloads/emu-rabbit-en.zip)。每份只包含該語言的 Markdown 筆記，不必下載整個程式專案。

## 你會在範例裡讀到什麼

一件作品可以連回開始做它的生活，一個人物可以連到相處的場景，正文的註腳則帶你回到來源。當年的記錄和後來的回憶各自保留時間與位置；未完成的嘗試、平常的陪伴，也有自己的篇幅。

範例入口的 README 負責帶路，人物概覽介紹洞的主人，閱讀地圖提供可以讀完的小旅程，索引負責查找。網站的側欄仍能展開完整檔案樹，但不必先認識全部分區才能開始閱讀。

這份公開精選用一篇索引串起各區，沒有另附關係圈、委託與共同創作或維護區。完整方法介紹的是可持續成長的安排；建立自己的洞時，依手上的材料逐步展開，不必為了湊齊結構建立空資料夾。

## 方法、範例與程式碼

- [繁體中文方法](docs/method.zh-TW.md)與[英文方法](docs/method.en.md)：獨立於個人範例的權威正文。
- [examples/emu-rabbit-tw/](examples/emu-rabbit-tw/)：繁體中文個人公開範例。
- [examples/emu-rabbit-en/](examples/emu-rabbit-en/)：同一份精選的英文翻譯。
- [src/web/](src/web/)：雙語介紹頁、靜態閱讀器與建置程式。
- [src/web/example-paths.json](src/web/example-paths.json)：中英文章的對照，用於檢查兩份範例是否齊全及語言切換。
- [skills/](skills/)：五個需一同安裝的 skills，共用 `rabbit-hole-start` 裡的方法、內部參考與本機初始化、匯入、檢查工具。
- [docs/skills.md](docs/skills.md)：安裝、第一個請求、支援格式與限制。
- [tests/](tests/)：閱讀器、下載封裝、skills 安裝與本機工具的檢查。

本機工具正式支援 macOS、Linux 與 Windows，版本和路徑要求見[安裝指南](docs/skills.md#安裝一次按需要使用)。匯入器接受文字、Markdown、約定格式 JSON／JSONL，社群原生匯出檔需先轉換。分享入口準備本機草稿，交付前由你審閱與授權；`src/mcp` 仍是預留位置。

`40_重要關係` 收錄 `人物/`、`寵物/`、`玩偶/` 與 `關係圈/`。人物是重要關係的一種；寵物與有重要情感連結的玩偶也能有自己的筆記，有材料時再建立對應資料夾。

## 建立自己的兔子洞

選擇願意交給信任的人或 agent 整理的材料，慢慢把相關的人、作品和原話接起來。你的兔子洞可以保持私人；資料、整理與分享範圍由本人決定。

範例中的人物、故事和來源是作者的生活，請保留它們的語境。英文來源清楚標示為譯文；引文中的方括號和省略符號沿用公開中文節錄的範圍。各項來源與作品的授權需分別確認；本 repo 尚未附整體授權條款，公開可讀不代表任意重用或再散布的授權。

## 在本機開發

需要 Node.js 22 或更新版本，沒有額外套件需要安裝。

```sh
npm start
```

依終端機顯示的網址開啟網站。它會先建置兩種語言的範例頁面和 ZIP，再啟動本機伺服器。

```sh
npm run check
```

執行測試與完整建置。建置會核對中英文章配對、Wiki 連結與段落定位；輸出放在 dist/。新增或更名文章時，連同對應語言與 example-paths.json 一起維護，並實際走讀受影響的路線。

修改 skills 時，另執行 `python3 scripts/validate-skills.py` 與 `python3 -m unittest discover -s tests -p 'test_*.py' -v`；Windows 的 Python 版本與 PowerShell 寫法見[使用指南](docs/skills.md)。

GitHub Actions 分成兩項：[Windows skills CI](.github/workflows/skills.yml) 對符合路徑條件、目標為 `main` 的 PR，在原生 Windows Server 2025 x64 上驗證套件並執行 Python 3.13、3.14 測試；[Pages 發布](.github/workflows/pages.yml) 在 `main` 推送或手動觸發時建置並部署網站。網站完整測試仍請在本機執行 `npm run check`。使用獨立分支與 PR，確認內容、來源和公開範圍後，由維護者決定合併。
