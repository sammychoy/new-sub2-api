<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/banner-dark.svg">
  <img src="assets/banner-light.svg" alt="Sub2API on Cloudflare" width="100%">
</picture>

[English](README.md) · **繁體中文** · [简体中文](README.zh-CN.md)

[![License](https://img.shields.io/badge/License-AGPL--3.0-blue?style=flat-square)](LICENSE)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?style=flat-square&logo=cloudflare&logoColor=white)
![D1](https://img.shields.io/badge/Cloudflare-D1-F38020?style=flat-square&logo=sqlite&logoColor=white)
![Vue 3](https://img.shields.io/badge/Vue-3-4FC08D?style=flat-square&logo=vuedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)

[功能](#功能) · [本機執行](#本機執行) · [部署](#部署) · [免責聲明](#免責聲明)

</div>

[sub2api](https://github.com/Wei-Shaw/sub2api) 的移植版，整個跑在 Cloudflare Workers 和 D1 上，不需要自己維護 Go 伺服器、PostgreSQL 或 Redis。

| | 原版 | 本移植版 |
|---|---|---|
| 後端 | Go + Gin + Ent | Cloudflare Worker（TypeScript） |
| 資料庫 | PostgreSQL + Redis | Cloudflare D1 |
| 前端 | Vue 3，嵌入 Go 執行檔 | Vue 3，靜態資源放在 Cloudflare |

## 功能

| **調度** | **計費** | **管理** |
|---|---|---|
| 在 OpenAI、Claude、Gemini、Grok、Antigravity 帳號之間調度請求。 | API Key、額度、用量統計與訂閱。Stripe、Airwallex 已實作並有測試；支付寶、微信支付、EasyPay 需要自行設定商戶。 | 使用者、帳號、渠道、風控、公告、代理的管理後台。電子郵件與 OAuth 登入，可選用 TOTP 兩步驟驗證。 |

## 目錄

```
cloudflare/worker/         API 與閘道 Worker
cloudflare/d1/migrations/  D1 資料表結構，依序執行
frontend/                  Vue 3 前端，由一個小型 Worker 提供靜態資源
docs/                      付款說明與合規文件
```

## 本機執行

需要 Node 22.6+ 和 pnpm 9+。

```bash
# Worker：測試使用記憶體內的 D1，不需要 Cloudflare 帳號
cd cloudflare/worker
npm install
npm test
npx wrangler dev          # 監聽 :8787
```

```bash
# 前端
cd frontend
pnpm install
cp .env.example .env.local   # 讓開發代理指向 :8787
pnpm dev                     # http://localhost:3000
```

## 部署

以下指令除非另外註明，都在專案根目錄執行。需要 Cloudflare 帳號，並先執行 `npx wrangler login`。

```bash
# 1. 建立資料庫，把輸出的 database_id 填進
#    cloudflare/worker/wrangler.toml
npx wrangler d1 create sub2api

# 2. 建立資料表
cd cloudflare/worker
npx wrangler d1 migrations apply sub2api --remote

# 3. 設定密鑰（產生方式：openssl rand -base64 32 / openssl rand -hex 32）
npx wrangler secret put JWT_SECRET
npx wrangler secret put TOTP_ENCRYPTION_KEY
npx wrangler secret put EMAIL_TASK_ENCRYPTION_KEY

# 4. 部署 API Worker
npx wrangler deploy

# 5. 建置並部署前端
cd ../../frontend
pnpm install && pnpm build
npx wrangler deploy
```

`frontend/wrangler.toml` 會透過 service binding，把 `/api`、`/v1` 等閘道路徑轉給 `sub2api-router` Worker。部署完成後開啟網站，設定精靈會引導你建立第一個管理員帳號。

> `cloudflare/worker/wrangler.toml` 裡的 `CORS_ALLOWED_ORIGINS` 預設是 `*`，正式上線前請改成你自己的網域。如果網站和 API 在同一個網域，可以直接移除。

<details>
<summary>環境變數</summary>

**Worker**

| 名稱 | 必填 | 說明 |
|---|---|---|
| `DB` | 是 | D1 綁定，在 `wrangler.toml` 設定 |
| `JWT_SECRET` | 是 | 至少 32 個字元 |
| `TOTP_ENCRYPTION_KEY` | 使用 2FA 時 | 64 位十六進位字元 |
| `EMAIL_TASK_ENCRYPTION_KEY` | 使用郵件時 | 64 位十六進位字元 |
| `SMTP_PASSWORD` | 使用郵件時 | 覆蓋存在 D1 的 SMTP 密碼 |
| `GEMINI_CODE_ASSIST_CLIENT_SECRET` | 使用 Gemini Code Assist OAuth 時 | 程式碼不內建，需自行設定 |
| `JWT_ACCESS_TOKEN_EXPIRES_SECONDS` | 否 | 預設 `86400` |
| `JWT_REFRESH_TOKEN_EXPIRE_DAYS` | 否 | 預設 `30` |
| `CORS_ALLOWED_ORIGINS` | 否 | 以逗號分隔的來源 |

**前端**（建置時）

| 名稱 | 預設值 | 說明 |
|---|---|---|
| `VITE_API_BASE_URL` | `/api/v1` | 只有 API 在不同來源時才需要改 |
| `VITE_DEV_PORT` | `3000` | 開發伺服器埠號 |
| `VITE_DEV_PROXY_TARGET` | `http://localhost:8080` | `.env.example` 設為 `:8787` |

</details>

<details>
<summary>疑難排解</summary>

- **部署 Worker 後出現 503：** 檢查 D1 綁定是否正確、migration 是否已執行：`npx wrangler d1 execute sub2api --remote --command "SELECT COUNT(*) FROM users"`
- **前端呼叫 API 出現 404：** 請求沒有送到 Worker。檢查 `frontend/wrangler.toml` 的 service binding；如果前後端分開網域，則檢查 `VITE_API_BASE_URL`。
- **Gemini Code Assist 登入失敗：** 設定 `GEMINI_CODE_ASSIST_CLIENT_SECRET`。

</details>

## 免責聲明

1. **僅供技術學習與研究**：本專案僅供 Serverless 架構（Cloudflare Workers 與 D1）之技術交流、學術研究與個人測試使用，不鼓勵、不認可亦不協助任何商業轉售或違反第三方規定之行為。
2. **第三方服務條款與封號風險**：透過本專案串接或輪詢上游供應商（包含但不限於 OpenAI、Anthropic、Google、xAI、DeepSeek 等）之帳號與服務，可能違反各該平台的服務條款（ToS）或使用規範。使用者需自行承擔帳號被封禁、額度遭收回、API 停權或相關法律追訴之全部風險。
3. **無官方關聯**：本專案為獨立開源移植專案，與 Cloudflare、OpenAI、Anthropic、Google、xAI、DeepSeek、Stripe、Airwallex 等任何公司或品牌皆無官方合作、代理、背書或隸屬關係。
4. **法律、金流與合規責任**：專案內建之計費、訂閱與金流模組僅作為程式碼技術展示。任何部署或使用本專案之人，必須自行確保其行為完全符合所在地之法律法規（包含但不限於個人資料保護、電信法規、營業登記、支付合規、反洗錢及稅務申報）。任何因違規營運或交易產生之消費與法律糾紛，概由部署者自行負責，與本專案作者無關。
5. **無擔保與責任限制**：本專案依「現狀（AS IS）」提供，不附帶任何明示或暗示之保證（包含但不限於系統穩定性、資安防護、扣款計費準確性或無瑕疵）。無論在任何情況下，作者、維護者與貢獻者均不對因使用、修改或無法使用本專案所造成的任何直接、間接、財務損失、資料遺失或法律責任負任何賠償或連帶責任。當您下載、部署或使用本專案，即代表您已完整閱讀並同意自行承擔一切風險。

## 授權

[AGPL-3.0](LICENSE)。基於 sub2api，Copyright (c) 2026 Wesley Liddick。
