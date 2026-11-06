# 兔子洞筆記法

執行 `npm start` 可以在本機瀏覽介紹頁和範例閱讀器。

## GitHub Pages

在 GitHub repository 的 **Settings → Pages → Source** 選擇 **GitHub Actions**。每次推送 `main` 時，Actions 會建置網站，並部署 `dist/` 裡的介紹頁和範例閱讀器。

若要在本機提交 `main` 後自動推送，在這份 checkout 執行一次 `git config --local core.hooksPath .githooks`。推送失敗時，提交會留在本機，可以執行 `git push origin main` 重試。
