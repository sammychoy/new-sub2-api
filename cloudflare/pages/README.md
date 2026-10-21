# Cloudflare Frontend Deployment

前端 Vue 3 SPA 通过 `frontend/wrangler.toml`（Cloudflare Workers Assets + `ROUTER` Service Binding）部署。

## 配置

- 根目录：`frontend`
- 构建命令：`pnpm install && pnpm build`
- 输出目录：`dist`
- Wrangler 配置：`frontend/wrangler.toml`

## 部署

```bash
cd frontend
pnpm install && pnpm build
npx wrangler deploy
```

前端 Worker 提供静态资源缓存控制、SPA 回退（`index.html`），并通过 `ROUTER` Service Binding（或 `BACKEND_URL` 回退）将 `/api/*`、`/v1/*` 等后端请求转发到 `sub2api-router` Worker。
