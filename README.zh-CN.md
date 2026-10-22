<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/banner-dark.svg">
  <img src="assets/banner-light.svg" alt="Sub2API on Cloudflare" width="100%">
</picture>

[English](README.md) · [繁體中文](README.zh-TW.md) · **简体中文**

[![License](https://img.shields.io/badge/License-AGPL--3.0-blue?style=flat-square)](LICENSE)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?style=flat-square&logo=cloudflare&logoColor=white)
![D1](https://img.shields.io/badge/Cloudflare-D1-F38020?style=flat-square&logo=sqlite&logoColor=white)
![Vue 3](https://img.shields.io/badge/Vue-3-4FC08D?style=flat-square&logo=vuedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)

[功能](#功能) · [本地运行](#本地运行) · [部署](#部署) · [免责声明](#免责声明)

</div>

[sub2api](https://github.com/Wei-Shaw/sub2api) 的移植版，整个跑在 Cloudflare Workers 和 D1 上，不需要自己维护 Go 服务、PostgreSQL 或 Redis。

| | 原版 | 本移植版 |
|---|---|---|
| 后端 | Go + Gin + Ent | Cloudflare Worker（TypeScript） |
| 数据库 | PostgreSQL + Redis | Cloudflare D1 |
| 前端 | Vue 3，嵌入 Go 可执行文件 | Vue 3，静态资源放在 Cloudflare |

## 功能

| **调度** | **计费** | **管理** |
|---|---|---|
| 在 OpenAI、Claude、Gemini、Grok、Antigravity 账号之间调度请求。 | API Key、额度、用量统计与订阅。Stripe、Airwallex 已实现并有测试；支付宝、微信支付、EasyPay 需要自行配置商户。 | 用户、账号、渠道、风控、公告、代理的管理后台。邮箱与 OAuth 登录，可选 TOTP 两步验证。 |

## 目录

```
cloudflare/worker/         API 与网关 Worker
cloudflare/d1/migrations/  D1 表结构，按顺序执行
frontend/                  Vue 3 前端，由一个小型 Worker 提供静态资源
docs/                      支付说明与合规文档
```

## 本地运行

需要 Node 22.6+ 和 pnpm 9+。

```bash
# Worker：测试使用内存中的 D1，不需要 Cloudflare 账号
cd cloudflare/worker
npm install
npm test
npx wrangler dev          # 监听 :8787
```

```bash
# 前端
cd frontend
pnpm install
cp .env.example .env.local   # 让开发代理指向 :8787
pnpm dev                     # http://localhost:3000
```

## 部署

以下命令除非另外说明，都在项目根目录执行。需要 Cloudflare 账号，并先执行 `npx wrangler login`。

```bash
# 1. 创建数据库，把输出的 database_id 填进
#    cloudflare/worker/wrangler.toml
npx wrangler d1 create sub2api

# 2. 创建表结构
cd cloudflare/worker
npx wrangler d1 migrations apply sub2api --remote

# 3. 设置密钥（生成方式：openssl rand -base64 32 / openssl rand -hex 32）
npx wrangler secret put JWT_SECRET
npx wrangler secret put TOTP_ENCRYPTION_KEY
npx wrangler secret put EMAIL_TASK_ENCRYPTION_KEY

# 4. 部署 API Worker
npx wrangler deploy

# 5. 构建并部署前端
cd ../../frontend
pnpm install && pnpm build
npx wrangler deploy
```

`frontend/wrangler.toml` 会通过 service binding，把 `/api`、`/v1` 等网关路径转给 `sub2api-router` Worker。部署完成后打开网站，设置向导会引导你创建第一个管理员账号。

> `cloudflare/worker/wrangler.toml` 里的 `CORS_ALLOWED_ORIGINS` 默认是 `*`，正式上线前请改成你自己的域名。如果网站和 API 在同一个域名，可以直接移除。

<details>
<summary>环境变量</summary>

**Worker**

| 名称 | 必填 | 说明 |
|---|---|---|
| `DB` | 是 | D1 绑定，在 `wrangler.toml` 配置 |
| `JWT_SECRET` | 是 | 至少 32 个字符 |
| `TOTP_ENCRYPTION_KEY` | 使用 2FA 时 | 64 位十六进制字符 |
| `EMAIL_TASK_ENCRYPTION_KEY` | 使用邮件时 | 64 位十六进制字符 |
| `SMTP_PASSWORD` | 使用邮件时 | 覆盖存在 D1 的 SMTP 密码 |
| `GEMINI_CODE_ASSIST_CLIENT_SECRET` | 使用 Gemini Code Assist OAuth 时 | 代码不内置，需自行配置 |
| `JWT_ACCESS_TOKEN_EXPIRES_SECONDS` | 否 | 默认 `86400` |
| `JWT_REFRESH_TOKEN_EXPIRE_DAYS` | 否 | 默认 `30` |
| `CORS_ALLOWED_ORIGINS` | 否 | 以逗号分隔的来源 |

**前端**（构建时）

| 名称 | 默认值 | 说明 |
|---|---|---|
| `VITE_API_BASE_URL` | `/api/v1` | 只有 API 在不同源时才需要改 |
| `VITE_DEV_PORT` | `3000` | 开发服务器端口 |
| `VITE_DEV_PROXY_TARGET` | `http://localhost:8080` | `.env.example` 设为 `:8787` |

</details>

<details>
<summary>常见问题</summary>

- **部署 Worker 后出现 503：** 检查 D1 绑定是否正确、migration 是否已执行：`npx wrangler d1 execute sub2api --remote --command "SELECT COUNT(*) FROM users"`
- **前端调用 API 出现 404：** 请求没有送到 Worker。检查 `frontend/wrangler.toml` 的 service binding；如果前后端分开域名，则检查 `VITE_API_BASE_URL`。
- **Gemini Code Assist 登录失败：** 配置 `GEMINI_CODE_ASSIST_CLIENT_SECRET`。

</details>

## 免责声明

1. **仅供技术学习与研究**：本项目仅供 Serverless 架构（Cloudflare Workers 与 D1）之技术交流、学术研究与个人测试使用，不鼓励、不认可亦不协助任何商业转售或违反第三方规定之行为。
2. **第三方服务条款与封号风险**：通过本项目对接或轮询上游供应商（包含但不限于 OpenAI、Anthropic、Google、xAI、DeepSeek 等）之账号与服务，可能违反各该平台的服务条款（ToS）或使用规范。使用者需自行承担账号被封禁、额度被收回、API 停权或相关法律追诉之全部风险。
3. **无官方关联**：本项目为独立开源移植项目，与 Cloudflare、OpenAI、Anthropic、Google、xAI、DeepSeek、Stripe、Airwallex 等任何公司或品牌皆无官方合作、代理、背书或隶属关系。
4. **法律、支付与合规责任**：项目内置之计费、订阅与支付模块仅作为代码技术展示。任何部署或使用本项目之人，必须自行确保其行为完全符合所在地之法律法规（包含但不限于个人数据保护、电信法规、营业登记、支付合规、反洗钱及税务申报）。任何因违规运营或交易产生之消费与法律纠纷，概由部署者自行负责，与本项目作者无关。
5. **无担保与责任限制**：本项目按“现状（AS IS）”提供，不附带任何明示或暗示之保证（包含但不限于系统稳定性、安全防护、扣款计费准确性或无瑕疵）。无论在任何情况下，作者、维护者与贡献者均不对因使用、修改或无法使用本项目所造成的任何直接、间接、财务损失、数据丢失或法律责任承担任何赔偿或连带责任。当您下载、部署或使用本项目，即代表您已完整阅读并同意自行承担一切风险。

## 许可证

[AGPL-3.0](LICENSE)。基于 sub2api，Copyright (c) 2026 Wesley Liddick。
