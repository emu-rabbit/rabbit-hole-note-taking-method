# 合成生活資料與閱讀快照

所有內容均為原創虛構，沒有取用任何真實人物的私人或公開生活資料。這個 fixture 用於檢驗 skills 的閱讀效果、來源支持及增量維護；不隨 skills 安裝，也不加入作者公開範例的網站建置。

- [閱讀快照](vault/README.md)：58 份 Markdown，包含 23 篇實質敘事頁、21 份來源與導航／維護文件。用支援 Wiki links 的 Markdown 閱讀器開啟 vault 目錄；GitHub 可直接查看文字，但不會把 Wiki links 當作可點擊的連結。
- [初始來源](inputs/permitted-base.json)：16 筆已允許的日記、貼文、會議記錄及信件。
- [訪談腳本](inputs/interview-turns.json)：3 回合分階段供應的虛構問答。
- [後續更新](inputs/later-update.json)：日期更正與一次內部試播。
- [驗收紀錄](../../../docs/skills-evaluation.md)：實際走讀、找到的問題、指令修訂與再次閱讀的結果。

## 重做演練

在本機新建獨立測試資料夾，安裝目前的完整五個 skills，再依[使用指南](../../../docs/skills.md)操作。以下保留先前分段演練的順序，供重現已知閱讀問題。

1. 先只給初始來源，建立私人兔子洞，記錄實際讀過的範圍。
2. 由主持者逐回合供應訪談答覆，讓整理者先決定問題。保存原腳本與實際提問的差別。
3. 寫出可讀的人物、故事、時期與作品，建立幾條有終點的路線和可查找的索引。留下初版基準。
4. 此時才提供後續更新，沿既有身份修訂文章、來源摘要、年表和索引。
5. 讓未參與寫作的讀者從 README 走入，先走路線，再做驗收紀錄裡的查找需求，最後核對原始材料。依實際缺點修訂 skills，重做受影響工作，再讀一次。

輸入含有日期矛盾與未完成計畫。保留它們的不同時間位置；fixture 裡的 .invalid 網址只是測試定位，不是可查證的外部來源。最終閱讀快照是某次受審閱的產物，不是生成器的固定標準答案。它不帶機器台帳或 raw 二進位副本，使用唯讀 `check` 作一般 Markdown 儲存庫檢查；若要一併重驗維護筆記，加上 `--include-maintenance`。重跑匯入請另行 `init` 新庫。

All source material is fictional. The deep case is in Traditional Chinese. A separate English small-case walkthrough was also completed; see the evaluation record for the exact scope and limits.
