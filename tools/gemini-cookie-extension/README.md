# Sub2API - Gemini Cookie Exporter 瀏覽器擴充功能

這是一個為 **Sub2API** 設計的輕量級 Chrome / Edge 瀏覽器擴充功能，用於**一鍵提取 Google Gemini 網頁端憑據（Cookie）**，讓管理員徹底告別手動開啟 F12 開發者工具複製貼上的繁瑣步驟！

## ✨ 功能特色
* ⚡ **一鍵提取**：自動檢測當前瀏覽器在 `gemini.google.com` 的登入會話。
* 📋 **一鍵複製**：將 `__Secure-1PSID` 與 `__Secure-1PSIDTS` 打包複製到剪貼簿，回到 Sub2API 點擊「從剪貼簿讀取」即可瞬間完成填寫。
* 🚀 **一鍵直接同步**：支援直接設定 Sub2API 網址與 Admin Key，按一下按鈕直接遠端建立/更新賬號。

---

## 🛠️ 安裝步驟（30 秒完成）
1. 在 Chrome 或 Edge 瀏覽器網址列輸入並打開：
   * Chrome：`chrome://extensions/`
   * Edge：`edge://extensions/`
2. 在右上角開啟 **「開發者模式 (Developer Mode)」** 開關。
3. 點擊左上角的 **「載入未封裝項目 (Load unpacked)」** 按鈕。
4. 選擇本目錄（`tools/gemini-cookie-extension`）。
5. 安裝完成！在瀏覽器擴充功能列表中找到「Sub2API - Gemini Cookie Exporter」並釘選至工具列。

---

## 📖 使用教學
1. 在瀏覽器中正常打開並登入 [gemini.google.com](https://gemini.google.com)。
2. 點擊瀏覽器右上角的擴充功能圖示。
3. 點擊 **「一鍵複製憑證」**。
4. 切換回 Sub2API 後台的「新增賬號」彈窗，在「Web Cookie」中點擊 **「從剪貼簿讀取」**，系統將自動完成所有欄位填寫與格式化！
