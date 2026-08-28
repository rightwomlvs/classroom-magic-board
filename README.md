# 課堂魔法白板 · Classroom Magic Board

互動式課堂白板工具：黑板、任務、計時器、點名、課堂貢獻版、學生狀況紀錄，並支援 **JSON 備份匯出/匯入** 與 **Supabase 雲端歷史統計**。

## 功能

- 課堂黑板（可調字型/顏色/粗體、貼圖）
- 課前準備、今日任務（可展開/收合、富文字編輯）、溫馨提醒
- 魔法計時器（時間戳精確、全螢幕投影）
- 隨機點名、課堂狀態全螢幕投影圖示
- 課堂貢獻版（動態人數、左鍵加分/右鍵扣分、全班加分）
- 學生狀況紀錄（缺席/睡覺/手機）
- **拍照存檔 PNG**、**匯出試算表文字 TXT**
- **JSON 備份匯出/匯入**（跨裝置還原）
- **Supabase 雲端存檔 + 歷史統計**（累計貢獻、各座號統計、逐節課明細）

## 快速開始

```bash
npm install
npm run dev      # 本機開發 → http://localhost:5173
npm run build    # 建置正式版（輸出到 dist/）
npm run preview  # 預覽建置結果
```

## 設定 Supabase（雲端歷史統計 + 登入保護）

1. 到 [supabase.com](https://supabase.com) 建立免費專案。
2. **啟用 Email 登入**：Supabase Dashboard → **Authentication → Providers → Email** ↔ 開啟，可依需求關閉「Confirm email」或留著做信箱驗證。
3. 建好後，到 **SQL Editor**，貼上並執行
   `supabase/schema.sql`（建立 `lessons` 資料表、`owner_id` 外鍵與「登入者只能讀寫自己資料」的 RLS 政策）。
4. 複製 `.env.example` 為 `.env`，填入專案的 URL 與 anon key：
   ```
   VITE_SUPABASE_URL=https://你的專案.supabase.co
   VITE_SUPABASE_ANON_KEY=你的公開金鑰
   ```
5. 重新執行 `npm run dev`。此時開啟網站會先看到**登入畫面**，用 email+密碼註冊／登入後才能編輯與累積歷史統計。

> **登入保護說明**：每一節課的紀錄都會綁定建立的帳號（`owner_id = auth.uid()`），
> 每個人只能看到與管理**自己**的資料，其他人無法讀取。此專案採用「每帳號獨立資料」模式。
> 若有多位老師想要共用同一份資料，需再改為群組/共享模式（如加 `class_id` 欄位並共用）。


## 如何用 JSON 備份

- **匯出**：白板頁 → 「匯出 JSON」→ 存成 `.json` 檔（可放雲端/email）。
- **匯入**：白板頁 → 「匯入 JSON」→ 選檔即可還原整節課內容。
- 即使沒設定 Supabase，JSON 備份仍可正常使用。

## 發布到網頁（供學生/他處使用）

```bash
npm run build
```

把 `dist/` 資料夾丟到任何靜態主機即可：

- **Vercel / Netlify / Cloudflare Pages**：匯入此專案，建置指令 `npm run build`、輸出目錄 `dist`。
- **GitHub Pages**：把 `dist/` 內容推到 `gh-pages` 分支。

注意：`VITE_*` 環境變數在建置時就被寫入前端，因此 `npm run build` 前需先設定 `.env`（見上）。

## 技術棧

- React 19 + TypeScript + Vite 8
- Tailwind CSS v4
- html2canvas（拍照導出 PNG）
- @supabase/supabase-js
- lucide-react（圖示）

## 檔案結構

```
src/
  App.tsx                 # 頂層分頁（白板 / 歷史統計）
  components/
    MagicBoard.tsx        # 課堂白板主元件
    HistoryPanel.tsx      # 歷史統計面板
  lib/
    supabase.ts           # Supabase 客戶端
    storage.ts            # JSON 匯出/匯入、localStorage
    constants.ts          # 狀態選項與貢獻顏色
  hooks/
    useLocalStorage.ts
  types.ts                # 型別定義
supabase/
  schema.sql              # 資料表建立 SQL（貼到 Supabase）
```
