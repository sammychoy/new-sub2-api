# Sub2API on Cloudflare

**English** · [繁體中文](README.zh-TW.md) · [简体中文](README.zh-CN.md)

[![License: LGPL-3.0](https://img.shields.io/badge/License-LGPL--3.0-green.svg)](LICENSE)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers%20%2B%20D1-F38020.svg)](https://developers.cloudflare.com/workers/)

A port of [sub2api](https://github.com/Wei-Shaw/sub2api) that runs entirely on Cloudflare Workers and D1. There is no Go server, PostgreSQL or Redis to look after.

| | Original | This port |
|---|---|---|
| Backend | Go + Gin + Ent | Cloudflare Worker (TypeScript) |
| Database | PostgreSQL + Redis | Cloudflare D1 |
| Frontend | Vue 3, embedded in the Go binary | Vue 3, static assets on Cloudflare |

## What it does

- Routes requests across OpenAI, Claude, Gemini, Grok and Antigravity accounts
- API keys, quotas and usage tracking
- Subscriptions and payments. Stripe and Airwallex are implemented and tested. Alipay, WeChat Pay and EasyPay need your own merchant credentials and callback setup
- Admin console for users, accounts, channels, risk control, announcements and proxies
- Email and OAuth sign-in, with optional TOTP 2FA

## Layout

```
cloudflare/worker/       API and gateway Worker
cloudflare/d1/migrations/  D1 schema, applied in order
frontend/                Vue 3 app, served by a small Worker with static assets
docs/                    Payment guides and compliance notes
```

## Run it locally

You need Node 22.6+ and pnpm 9+.

```bash
# Worker: tests use an in-memory D1, no Cloudflare account needed
cd cloudflare/worker
npm install
npm test
npx wrangler dev          # serves on :8787
```

```bash
# Frontend
cd frontend
pnpm install
cp .env.example .env.local   # points the dev proxy at :8787
pnpm dev                     # http://localhost:3000
```

## Deploy

All commands run from the repo root unless noted. You need a Cloudflare account and `npx wrangler login`.

```bash
# 1. Create the database and copy the printed database_id
#    into cloudflare/worker/wrangler.toml
npx wrangler d1 create sub2api

# 2. Apply the schema
cd cloudflare/worker
npx wrangler d1 migrations apply sub2api --remote

# 3. Set secrets (generate with: openssl rand -base64 32 / openssl rand -hex 32)
npx wrangler secret put JWT_SECRET
npx wrangler secret put TOTP_ENCRYPTION_KEY
npx wrangler secret put EMAIL_TASK_ENCRYPTION_KEY

# 4. Deploy the API Worker
npx wrangler deploy

# 5. Build and deploy the frontend
cd ../../frontend
pnpm install && pnpm build
npx wrangler deploy
```

`frontend/wrangler.toml` forwards `/api`, `/v1` and the other gateway paths to the `sub2api-router` Worker through a service binding. Open the deployed site and the setup wizard will create the first admin account.

> `CORS_ALLOWED_ORIGINS` is `*` in `cloudflare/worker/wrangler.toml`. Narrow it to your own domain before going to production. If the site and the API share one domain you can drop it.

<details>
<summary>Environment variables</summary>

**Worker**

| Name | Required | Notes |
|---|---|---|
| `DB` | yes | D1 binding, set in `wrangler.toml` |
| `JWT_SECRET` | yes | At least 32 characters |
| `TOTP_ENCRYPTION_KEY` | for 2FA | 64 hex characters |
| `EMAIL_TASK_ENCRYPTION_KEY` | for email | 64 hex characters |
| `SMTP_PASSWORD` | for email | Overrides the SMTP password stored in D1 |
| `GEMINI_CODE_ASSIST_CLIENT_SECRET` | for Gemini Code Assist OAuth | Not bundled in the code, set it yourself |
| `JWT_ACCESS_TOKEN_EXPIRES_SECONDS` | no | Default `86400` |
| `JWT_REFRESH_TOKEN_EXPIRE_DAYS` | no | Default `30` |
| `CORS_ALLOWED_ORIGINS` | no | Comma-separated origins |

**Frontend** (build time)

| Name | Default | Notes |
|---|---|---|
| `VITE_API_BASE_URL` | `/api/v1` | Change only if the API lives on another origin |
| `VITE_DEV_PORT` | `3000` | Dev server port |
| `VITE_DEV_PROXY_TARGET` | `http://localhost:8080` | `.env.example` sets it to `:8787` |

</details>

<details>
<summary>Troubleshooting</summary>

- **503 after deploying the Worker:** check that the D1 binding is correct and the migrations ran: `npx wrangler d1 execute sub2api --remote --command "SELECT COUNT(*) FROM users"`
- **404 on API calls from the frontend:** the request is not reaching the Worker. Check the service binding in `frontend/wrangler.toml`, or `VITE_API_BASE_URL` if you split the origins.
- **Gemini Code Assist login fails:** set `GEMINI_CODE_ASSIST_CLIENT_SECRET`.

</details>

## Disclaimer

Using this project may break the terms of service of upstream providers such as Anthropic, OpenAI and Google. It is shared for learning and research, and you use it at your own risk and within the law where you live. The authors take no responsibility for any loss.

## License

[LGPL-3.0](LICENSE). Based on sub2api, Copyright (c) 2026 Wesley Liddick.
