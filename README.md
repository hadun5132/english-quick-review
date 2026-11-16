# 國一英語複習

第一課與第二課的單字及文法複習網站。學生可直接用手機或電腦開啟 GitHub Pages。教材管理、AI 整理與發布操作在自己的 Windows 電腦完成。

## 在本機使用

1. 安裝 Node.js 22 以上、Python 3、Git、GitHub CLI 和 Ollama。
2. 執行 `python -m pip install -r admin/requirements.txt` 支援 PDF。若 Python 不在 PATH，可把 `REVIEW_PYTHON` 指向 Python 執行檔。
3. 啟動 Ollama 並執行 `ollama pull qwen3:4b`。可用 `OLLAMA_MODEL` 指定另一個已下載、支援結構化輸出的本機模型。Windows 啟動器也可從本機的 `.local/model.txt` 第一行讀取模型名稱。
4. 在 Windows 可雙擊 `start-review.cmd`。啟動器會在系統未提供 Node.js 時嘗試使用已安裝的 Codex 執行環境。在終端機也可在專案根目錄執行 `node admin/server.mjs`。學生版預覽位於 [本機首頁](http://127.0.0.1:4173/)，上傳介面位於 [本機管理頁](http://127.0.0.1:4173/admin/)。

## 新增教材

選課或建立新課，選擇 PPTX、DOCX 或文字型 PDF，再按上傳。掃描教材請先做 OCR，舊 Office 格式請先另存。勾選並編輯想加入的條目，預覽整課，再確認發布。原始檔由本機程式讀取，文字只傳給本機 Ollama。關閉頁面前請完成草稿審閱，未核准稿保留在當前頁面。已核准但未完成部署的版本保存在忽略追蹤的 `.local/` 資料夾。

## 首次部署及後續更新

在專案根目錄用 `gh auth login --hostname github.com --git-protocol https --web` 登入，再用 `gh auth setup-git` 設定 Git 認證。提交專案後以 `gh repo create english-quick-review --public --source . --remote origin --push` 建立公開儲存庫。到儲存庫 Settings → Pages，選擇 Deploy from a branch，來源設為 `main` 和 `/docs`。

後續可直接由本機管理頁發布。若推送失敗，修正認證或 Git 狀態後按「重試發布／檢查部署」。已推送時可用同一按鈕查網站是否更新。

## 專案結構

- `AGENTS.md` 定義課程資料格式、編寫與發布規則。
- `docs/` 是靜態網站。每課是 `docs/units/uN.json`，課別由索引載入。
- `admin/` 提供上傳、文字擷取、Ollama 整理及 Git 發布。管理頁只監聽回環地址。
- 執行 `node --test` 檢查資料、合併規則及整理流程。
