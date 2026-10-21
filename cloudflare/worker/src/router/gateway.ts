import type { D1Database, D1Value } from "../types/d1.ts";
import { classifyBackendRoute } from "../routes.ts";
import { firstRow, runStatement } from "../repositories/d1.ts";
import { routerError } from "./responses.ts";
import { GeminiWebService } from "../services/gemini-web.ts";
import { DeepSeekWebService } from "../services/deepseek-web.ts";

interface GatewayEnv {
    DB?: D1Database;
}

interface GatewayKeyRow {
    id: number;
    user_id: number;
    group_id: number | null;
    status: string;
    quota: number;
    quota_used: number;
    expires_at: string | null;
    ip_whitelist?: string | null;
    ip_blacklist?: string | null;
    rate_limit_5h?: number;
    rate_limit_1d?: number;
    rate_limit_7d?: number;
    usage_5h?: number;
    usage_1d?: number;
    usage_7d?: number;
    window_5h_start?: string | null;
    window_1d_start?: string | null;
    window_7d_start?: string | null;
    user_status: string;
    user_balance?: number;
}

interface GatewayAccountRow {
    id: number;
    platform: string;
    type?: string;
    credentials: string;
    extra: string;
    proxy_id?: number | null;
    priority: number;
    group_priority?: number | null;
    last_used_at?: string | null;
}

const GATEWAY_FAMILIES = new Set([
    "v1", "v1beta", "responses", "alpha-search", "images", "videos",
    "chat-completions", "embeddings", "antigravity"
]);

const MAX_ROUTING_ATTEMPTS = 5;
const DEFAULT_FAILURE_COOLDOWN_MS = 30_000;

export async function routeGateway(request: Request, env: GatewayEnv): Promise<Response | null> {
    const url = new URL(request.url);
    const family = classifyBackendRoute(url.pathname);
    if (family === null || !GATEWAY_FAMILIES.has(family)) return null;
    if (env.DB === undefined) return routerError(503, "database_not_configured", "Configure the Cloudflare D1 DB binding");

    const rawKey = readApiKey(request);
    if (rawKey === "") return openAIError(401, "invalid_api_key", "Missing API key");

    const key = await firstRow<GatewayKeyRow>(env.DB, `
        SELECT k.id, k.user_id, k.group_id, k.status, k.quota, k.quota_used, k.expires_at,
               k.ip_whitelist, k.ip_blacklist,
               k.rate_limit_5h, k.rate_limit_1d, k.rate_limit_7d,
               k.usage_5h, k.usage_1d, k.usage_7d,
               k.window_5h_start, k.window_1d_start, k.window_7d_start,
               u.status AS user_status, u.balance AS user_balance
        FROM api_keys k
        JOIN users u ON u.id = k.user_id AND u.deleted_at IS NULL
        WHERE k.key = ? AND k.deleted_at IS NULL
        LIMIT 1
    `, [rawKey]);
    const rejection = validateKey(key, request);
    if (rejection !== null) return rejection;

    const requestBody = request.method === "GET" || request.method === "HEAD"
        ? undefined
        : await request.clone().arrayBuffer();
    const parsedRequestJson = parseRequestBody(requestBody);
    const requestedModel = typeof parsedRequestJson.model === "string" ? parsedRequestJson.model : undefined;
    const isStreamRequest = parsedRequestJson.stream === true;
    const preferredPlatform = inferPlatform(url.pathname, requestedModel);

    const accounts = await selectAccounts(env.DB, key!.group_id, MAX_ROUTING_ATTEMPTS, preferredPlatform);
    if (accounts.length === 0) return openAIError(503, "no_available_account", "No schedulable upstream account is available");

    let lastFailure: { status: number; code: string; message: string } | null = null;

    for (let attempt = 0; attempt < accounts.length; attempt += 1) {
        const account = accounts[attempt];
        const creds = parseObject(account.credentials);
        const attemptNumber = attempt + 1;

        if (account.platform.toLowerCase() === "gemini" && (creds.auth_type === "gemini_web" || creds.secure_1psid)) {
            let proxyUrl = "";
            if (account.proxy_id) {
                const proxy = await firstRow<{ protocol: string; host: string; port: number; username?: string; password?: string }>(env.DB, `
                    SELECT protocol, host, port, username, password FROM proxies WHERE id = ?
                `, [account.proxy_id]);
                if (proxy) {
                    const auth = proxy.username && proxy.password ? `${encodeURIComponent(proxy.username)}:${encodeURIComponent(proxy.password)}@` : "";
                    proxyUrl = `${proxy.protocol}://${auth}${proxy.host}:${proxy.port}`;
                }
            }

            const { prompt, model, stream } = extractPromptFromRequest(parsedRequestJson);
            const startedAt = Date.now();
            try {
                const resp = await GeminiWebService.executeChatCompletion(prompt, model, creds as any, stream, proxyUrl);
                if (isRetryableStatus(resp.status)) {
                    const message = `Gemini Web upstream returned HTTP ${resp.status}`;
                    await markAccountFailure(env.DB, account.id, message, retryAfterMs(resp.headers));
                    lastFailure = { status: 502, code: "upstream_error", message };
                    if (attemptNumber < accounts.length) {
                        await resp.body?.cancel().catch(() => undefined);
                        continue;
                    }
                    return withRoutingHeaders(resp, account.id, attemptNumber, Date.now() - startedAt);
                }
                const durationMs = Date.now() - startedAt;
                await markGatewaySuccess(env.DB, key!, account.id, { model, stream, durationMs, response: resp });
                return withRoutingHeaders(resp, account.id, attemptNumber, durationMs);
            } catch (err) {
                const message = err instanceof Error ? err.message : "Gemini Web request failed";
                await markAccountFailure(env.DB, account.id, message);
                lastFailure = { status: 502, code: "upstream_error", message };
                if (attemptNumber < accounts.length) continue;
                break;
            }
        }

        if (account.platform.toLowerCase() === "deepseek" && (account.type === "deepseek_web" || creds.auth_type === "deepseek_web" || creds.deepseek_token)) {
            let proxyUrl = "";
            if (account.proxy_id) {
                const proxy = await firstRow<{ protocol: string; host: string; port: number; username?: string; password?: string }>(env.DB, `
                    SELECT protocol, host, port, username, password FROM proxies WHERE id = ?
                `, [account.proxy_id]);
                if (proxy) {
                    const auth = proxy.username && proxy.password ? `${encodeURIComponent(proxy.username)}:${encodeURIComponent(proxy.password)}@` : "";
                    proxyUrl = `${proxy.protocol}://${auth}${proxy.host}:${proxy.port}`;
                }
            }

            const { prompt, model, stream } = extractPromptFromRequest(parsedRequestJson);
            const startedAt = Date.now();
            try {
                const resp = await DeepSeekWebService.executeChatCompletion(prompt, model, creds as any, stream, proxyUrl);
                if (isRetryableStatus(resp.status)) {
                    const message = `DeepSeek Web upstream returned HTTP ${resp.status}`;
                    await markAccountFailure(env.DB, account.id, message, retryAfterMs(resp.headers));
                    lastFailure = { status: 502, code: "upstream_error", message };
                    if (attemptNumber < accounts.length) {
                        await resp.body?.cancel().catch(() => undefined);
                        continue;
                    }
                    return withRoutingHeaders(resp, account.id, attemptNumber, Date.now() - startedAt);
                }
                const durationMs = Date.now() - startedAt;
                await markGatewaySuccess(env.DB, key!, account.id, { model, stream, durationMs, response: resp });
                return withRoutingHeaders(resp, account.id, attemptNumber, durationMs);
            } catch (err) {
                const message = err instanceof Error ? err.message : "DeepSeek Web request failed";
                await markAccountFailure(env.DB, account.id, message);
                lastFailure = { status: 502, code: "upstream_error", message };
                if (attemptNumber < accounts.length) continue;
                break;
            }
        }

        let upstream: { url: URL; headers: Headers };
        try {
            upstream = buildUpstream(request, url, account);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Invalid account configuration";
            await markAccountFailure(env.DB, account.id, message);
            lastFailure = { status: 503, code: "account_configuration_error", message };
            if (attemptNumber < accounts.length) continue;
            break;
        }

        const startedAt = Date.now();
        try {
            const response = await fetch(upstream.url, {
                method: request.method,
                headers: upstream.headers,
                body: requestBody === undefined ? undefined : requestBody.slice(0),
                redirect: "manual"
            });
            if (isRetryableStatus(response.status)) {
                const message = `Upstream returned HTTP ${response.status}`;
                await markAccountFailure(env.DB, account.id, message, retryAfterMs(response.headers));
                lastFailure = { status: 502, code: "upstream_error", message };
                if (attemptNumber < accounts.length) {
                    await response.body?.cancel().catch(() => undefined);
                    continue;
                }
                return withRoutingHeaders(response, account.id, attemptNumber, Date.now() - startedAt);
            }
            const durationMs = Date.now() - startedAt;
            await markGatewaySuccess(env.DB, key!, account.id, {
                model: requestedModel,
                stream: isStreamRequest,
                durationMs,
                response
            });
            return withRoutingHeaders(response, account.id, attemptNumber, durationMs);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Upstream request failed";
            await markAccountFailure(env.DB, account.id, message);
            lastFailure = { status: 502, code: "upstream_error", message };
            if (attemptNumber < accounts.length) continue;
            break;
        }
    }

    return openAIError(
        lastFailure?.status ?? 502,
        lastFailure?.code ?? "upstream_error",
        lastFailure?.message ?? "All available upstream accounts failed"
    );
}

function readApiKey(request: Request): string {
    const authorization = request.headers.get("authorization")?.trim() ?? "";
    if (authorization.toLowerCase().startsWith("bearer ")) return authorization.slice(7).trim();
    return (request.headers.get("x-api-key") ?? request.headers.get("api-key") ?? request.headers.get("x-goog-api-key") ?? "").trim();
}

function parseIpList(raw: string | null | undefined): string[] {
    if (!raw || raw.trim() === "") return [];
    try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            return parsed.map((item) => String(item).trim()).filter(Boolean);
        }
    } catch {
        // Fallback to comma-separated list
    }
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

function isWindowActive(windowStart: string | null | undefined, durationMs: number, nowMs: number): boolean {
    if (!windowStart) return true;
    const parsed = Date.parse(windowStart);
    if (!Number.isFinite(parsed)) return true;
    return parsed + durationMs > nowMs;
}

function validateKey(key: GatewayKeyRow | null, request?: Request): Response | null {
    if (key === null) return openAIError(401, "invalid_api_key", "Invalid API key");
    if (key.status !== "active" || key.user_status !== "active") return openAIError(403, "account_inactive", "API key or user is inactive");
    const nowMs = Date.now();
    if (key.expires_at !== null && Date.parse(key.expires_at) <= nowMs) return openAIError(401, "api_key_expired", "API key has expired");
    if (key.quota > 0 && key.quota_used >= key.quota) return openAIError(429, "quota_exceeded", "API key quota has been exhausted");
    if ((key.user_balance ?? 0) < 0) return openAIError(402, "insufficient_balance", "User account balance is negative");

    const clientIp = (
        request?.headers.get("cf-connecting-ip") ??
        request?.headers.get("x-forwarded-for")?.split(",")[0] ??
        request?.headers.get("x-real-ip") ??
        ""
    ).trim();
    const blacklist = parseIpList(key.ip_blacklist);
    if (blacklist.length > 0 && clientIp !== "" && blacklist.includes(clientIp)) {
        return openAIError(403, "ip_forbidden", "Client IP is blocked for this API key");
    }
    const whitelist = parseIpList(key.ip_whitelist);
    if (whitelist.length > 0 && (clientIp === "" || !whitelist.includes(clientIp))) {
        return openAIError(403, "ip_not_allowed", "Client IP is not in the API key whitelist");
    }

    if ((key.rate_limit_5h ?? 0) > 0 && (key.usage_5h ?? 0) >= (key.rate_limit_5h ?? 0) && isWindowActive(key.window_5h_start, 5 * 3600_000, nowMs)) {
        return openAIError(429, "rate_limit_exceeded", "API key 5h rate limit has been exceeded");
    }
    if ((key.rate_limit_1d ?? 0) > 0 && (key.usage_1d ?? 0) >= (key.rate_limit_1d ?? 0) && isWindowActive(key.window_1d_start, 24 * 3600_000, nowMs)) {
        return openAIError(429, "rate_limit_exceeded", "API key 1d rate limit has been exceeded");
    }
    if ((key.rate_limit_7d ?? 0) > 0 && (key.usage_7d ?? 0) >= (key.rate_limit_7d ?? 0) && isWindowActive(key.window_7d_start, 7 * 24 * 3600_000, nowMs)) {
        return openAIError(429, "rate_limit_exceeded", "API key 7d rate limit has been exceeded");
    }
    return null;
}

function inferPlatform(pathname: string, model?: string): string | undefined {
    if (pathname === "/antigravity" || pathname.startsWith("/antigravity/")) return "antigravity";
    if (pathname === "/v1beta" || pathname.startsWith("/v1beta/")) return "gemini";
    if (pathname === "/v1/messages" || pathname.startsWith("/v1/messages/")) return "anthropic";
    const m = (model ?? "").trim().toLowerCase();
    if (m.startsWith("claude-")) return "anthropic";
    if (m.startsWith("gemini-")) return "gemini";
    if (m.startsWith("deepseek-")) return "deepseek";
    if (m.startsWith("grok-")) return "grok";
    if (m.startsWith("glm-")) return "glm";
    if (m.startsWith("qwen-")) return "qwen";
    if (m.startsWith("moonshot-") || m.startsWith("kimi-")) return "kimi";
    if (m.startsWith("abab") || m.startsWith("minimax-")) return "minimax";
    if (m.startsWith("gpt-") || m.startsWith("o1") || m.startsWith("o3") || m.startsWith("o4") || m.startsWith("text-embedding-")) return "openai";
    return undefined;
}

async function querySchedulableAccounts(
    db: D1Database,
    groupId: number | null,
    limit: number,
    platformFilter?: string
): Promise<GatewayAccountRow[]> {
    const now = new Date().toISOString();
    const values: D1Value[] = [now, now, now, now];
    let groupJoin = "";
    let extraClause = "";
    if (groupId !== null) {
        groupJoin = "JOIN account_groups ag ON ag.account_id = a.id AND ag.group_id = ?";
        values.unshift(groupId);
    }
    if (platformFilter) {
        extraClause = "AND LOWER(a.platform) = ?";
        values.push(platformFilter.toLowerCase());
    }
    const result = await db.prepare(`
        SELECT a.id, a.platform, a.type, a.credentials, a.extra, a.proxy_id,
               a.priority, a.last_used_at,
               ${groupId !== null ? "ag.priority" : "NULL"} AS group_priority
        FROM accounts a
        ${groupJoin}
        WHERE a.deleted_at IS NULL AND a.status = 'active' AND a.schedulable = 1
          AND (a.expires_at IS NULL OR a.expires_at > ?)
          AND (a.rate_limit_reset_at IS NULL OR a.rate_limit_reset_at <= ?)
          AND (a.temp_unschedulable_until IS NULL OR a.temp_unschedulable_until <= ?)
          AND (a.overload_until IS NULL OR a.overload_until <= ?)
          ${extraClause}
        ORDER BY ${groupId !== null ? "ag.priority ASC," : ""} a.priority ASC,
                 COALESCE(a.last_used_at, a.created_at) ASC, a.id ASC
        LIMIT ?
    `).bind(...values, Math.max(limit * 4, limit)).all<GatewayAccountRow>();
    return result.results ?? [];
}

async function selectAccounts(
    db: D1Database,
    groupId: number | null,
    limit: number,
    preferredPlatform?: string
): Promise<GatewayAccountRow[]> {
    if (preferredPlatform) {
        const filtered = await querySchedulableAccounts(db, groupId, limit, preferredPlatform);
        if (filtered.length > 0) {
            return weightedPriorityOrder(filtered).slice(0, limit);
        }
    }
    const all = await querySchedulableAccounts(db, groupId, limit);
    return weightedPriorityOrder(all).slice(0, limit);
}

function weightedPriorityOrder(accounts: GatewayAccountRow[]): GatewayAccountRow[] {
    const tiers = new Map<string, GatewayAccountRow[]>();
    for (const account of accounts) {
        const effectivePriority = account.group_priority ?? account.priority;
        const key = `${effectivePriority}:${account.priority}`;
        const tier = tiers.get(key) ?? [];
        tier.push(account);
        tiers.set(key, tier);
    }
    const ordered: GatewayAccountRow[] = [];
    for (const tier of tiers.values()) {
        const pool = [...tier];
        while (pool.length > 0) {
            const weights = pool.map(account => routingWeight(account));
            const total = weights.reduce((sum, weight) => sum + weight, 0);
            let cursor = Math.random() * total;
            let selected = 0;
            for (let index = 0; index < pool.length; index += 1) {
                cursor -= weights[index];
                if (cursor <= 0) {
                    selected = index;
                    break;
                }
            }
            ordered.push(pool.splice(selected, 1)[0]);
        }
    }
    return ordered;
}

function routingWeight(account: GatewayAccountRow): number {
    const extra = parseObject(account.extra);
    const raw = extra.routing_weight ?? extra.routingWeight ?? 1;
    return typeof raw === "number" && Number.isFinite(raw) && raw > 0 ? raw : 1;
}

function parseRequestBody(body: ArrayBuffer | undefined): Record<string, unknown> {
    if (body === undefined || body.byteLength === 0) return {};
    try {
        const parsed = JSON.parse(new TextDecoder().decode(body));
        return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)
            ? parsed as Record<string, unknown>
            : {};
    } catch {
        return {};
    }
}

function isRetryableStatus(status: number): boolean {
    return status === 408 || status === 425 || status === 429 || status >= 500;
}

function retryAfterMs(headers: Headers): number {
    const raw = headers.get("retry-after")?.trim();
    if (!raw) return DEFAULT_FAILURE_COOLDOWN_MS;
    const seconds = Number(raw);
    if (Number.isFinite(seconds) && seconds >= 0) return Math.max(1_000, seconds * 1_000);
    const timestamp = Date.parse(raw);
    if (Number.isFinite(timestamp)) return Math.max(1_000, timestamp - Date.now());
    return DEFAULT_FAILURE_COOLDOWN_MS;
}

async function markGatewaySuccess(
    db: D1Database,
    key: GatewayKeyRow,
    accountId: number,
    options?: {
        model?: string;
        stream?: boolean;
        durationMs?: number;
        response?: Response;
    }
): Promise<void> {
    const now = new Date().toISOString();
    let inputTokens = 0;
    let outputTokens = 0;
    let upstreamModel = options?.model || "unknown";
    let hasUsage = false;

    const resp = options?.response;
    const contentType = resp?.headers.get("content-type") ?? "";
    if (resp && !options?.stream && contentType.includes("application/json")) {
        try {
            const data = await resp.clone().json() as Record<string, unknown>;
            if (data && typeof data === "object") {
                if (typeof data.model === "string" && data.model.trim() !== "") {
                    upstreamModel = data.model.trim();
                }
                const usage = data.usage as Record<string, unknown> | undefined;
                if (usage && typeof usage === "object") {
                    hasUsage = true;
                    inputTokens = Math.max(0, Math.trunc(Number(usage.prompt_tokens ?? usage.input_tokens ?? 0) || 0));
                    outputTokens = Math.max(0, Math.trunc(Number(usage.completion_tokens ?? usage.output_tokens ?? 0) || 0));
                }
            }
        } catch {
            // Ignore JSON parse errors on upstream bodies
        }
    }

    const costDelta = (inputTokens + outputTokens) * 0.000001;
    await Promise.all([
        runStatement(
            db,
            "UPDATE api_keys SET last_used_at = ?, quota_used = quota_used + ?, usage_5h = usage_5h + ?, usage_1d = usage_1d + ?, usage_7d = usage_7d + ?, updated_at = ? WHERE id = ?",
            [now, costDelta, costDelta, costDelta, costDelta, now, key.id]
        ),
        runStatement(
            db,
            "UPDATE accounts SET last_used_at = ?, updated_at = ?, error_message = NULL WHERE id = ?",
            [now, now, accountId]
        )
    ]);

    if (hasUsage || inputTokens > 0 || outputTokens > 0) {
        try {
            await runStatement(
                db,
                `INSERT INTO usage_logs (
                    request_id, model, requested_model, upstream_model,
                    input_tokens, output_tokens, total_cost, actual_cost,
                    stream, duration_ms, created_at, api_key_id, account_id, group_id, user_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    crypto.randomUUID(),
                    upstreamModel,
                    options?.model ?? upstreamModel,
                    upstreamModel,
                    inputTokens,
                    outputTokens,
                    costDelta,
                    costDelta,
                    options?.stream ? 1 : 0,
                    options?.durationMs ?? 0,
                    now,
                    key.id,
                    accountId,
                    key.group_id,
                    key.user_id
                ]
            );
        } catch {
            // Do not fail gateway request if usage_logs insert fails
        }
    }
}

async function markAccountFailure(db: D1Database, accountId: number, message: string, cooldownMs = DEFAULT_FAILURE_COOLDOWN_MS): Promise<void> {
    const now = new Date();
    const until = new Date(now.getTime() + Math.max(1_000, cooldownMs)).toISOString();
    await runStatement(
        db,
        "UPDATE accounts SET error_message = ?, temp_unschedulable_until = ?, temp_unschedulable_reason = ?, updated_at = ? WHERE id = ?",
        [message, until, "gateway_failover", now.toISOString(), accountId]
    );
}

function withRoutingHeaders(response: Response, accountId: number, attempt: number, latencyMs: number): Response {
    const headers = new Headers(response.headers);
    headers.set("x-sub2api-account-id", String(accountId));
    headers.set("x-sub2api-routing-attempt", String(attempt));
    headers.set("x-sub2api-upstream-latency-ms", String(latencyMs));
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function extractPromptFromRequest(bodyJson: Record<string, unknown>): { prompt: string; model: string; stream: boolean } {
    let prompt = "";
    const model = typeof bodyJson.model === "string" ? bodyJson.model : "gemini-2.5-pro";
    const stream = bodyJson.stream === true;

    if (Array.isArray(bodyJson.messages)) {
        const parts: string[] = [];
        for (const msg of bodyJson.messages) {
            if (msg && typeof msg === "object") {
                const role = (msg as any).role || "user";
                let content = "";
                if (typeof (msg as any).content === "string") {
                    content = (msg as any).content;
                } else if (Array.isArray((msg as any).content)) {
                    content = (msg as any).content.map((c: any) => typeof c === "string" ? c : c?.text || "").join("\n");
                }
                if (content.trim()) {
                    parts.push(`${role}: ${content}`);
                }
            }
        }
        prompt = parts.join("\n\n");
    } else if (Array.isArray(bodyJson.contents)) {
        const parts: string[] = [];
        for (const c of bodyJson.contents) {
            if (c && Array.isArray((c as any).parts)) {
                for (const p of (c as any).parts) {
                    if (p && typeof p.text === "string") parts.push(p.text);
                }
            }
        }
        prompt = parts.join("\n\n");
    } else if (typeof bodyJson.prompt === "string") {
        prompt = bodyJson.prompt;
    }
    return { prompt, model, stream };
}

const ROOT_OPENAI_PATHS = ["/chat/completions", "/responses", "/embeddings", "/images", "/videos"];

function buildUpstream(request: Request, incoming: URL, account: GatewayAccountRow): { url: URL; headers: Headers } {
    const credentials = parseObject(account.credentials);
    const extra = parseObject(account.extra);
    const platform = account.platform.toLowerCase();
    const defaultBase = platform === "anthropic" || platform === "antigravity"
        ? "https://api.anthropic.com"
        : platform === "gemini"
            ? "https://generativelanguage.googleapis.com"
            : platform === "grok"
                ? "https://api.x.ai"
                : platform === "deepseek"
                    ? "https://api.deepseek.com"
                    : platform === "glm"
                        ? "https://open.bigmodel.cn/api/paas/v4"
                        : platform === "minimax"
                            ? "https://api.minimax.chat/v1"
                            : platform === "qwen"
                                ? "https://dashscope.aliyuncs.com/compatible-mode/v1"
                                : (platform === "kimi" || platform === "moonshot")
                                    ? "https://api.moonshot.cn/v1"
                                    : "https://api.openai.com";
    const base = stringValue(credentials.base_url, credentials.baseUrl, extra.base_url, extra.baseUrl) || defaultBase;
    const upstream = new URL(base);
    let incomingPath = platform === "glm" && incoming.pathname.startsWith("/v1/")
        ? incoming.pathname.replace(/^\/v1\//, "/")
        : incoming.pathname;
    if (
        platform === "openai" &&
        (upstream.pathname === "/" || upstream.pathname === "") &&
        !incomingPath.startsWith("/v1/") &&
        ROOT_OPENAI_PATHS.some((prefix) => incomingPath === prefix || incomingPath.startsWith(`${prefix}/`))
    ) {
        incomingPath = `/v1${incomingPath}`;
    }
    upstream.pathname = joinPath(upstream.pathname, incomingPath);
    upstream.search = incoming.search;

    const headers = new Headers(request.headers);
    headers.delete("host");
    headers.delete("content-length");
    headers.delete("cf-connecting-ip");
    headers.delete("x-forwarded-for");
    headers.delete("x-real-ip");
    headers.delete("authorization");
    headers.delete("x-api-key");
    headers.delete("api-key");
    headers.delete("x-goog-api-key");
    const token = stringValue(credentials.api_key, credentials.apiKey, credentials.access_token, credentials.accessToken, credentials.token);
    if (token === "") throw new Error(`Account ${account.id} has no upstream credential`);
    if (platform === "anthropic" || platform === "antigravity") {
        headers.set("x-api-key", token);
        if (!headers.has("anthropic-version")) headers.set("anthropic-version", "2023-06-01");
    } else if (platform === "gemini") {
        upstream.searchParams.set("key", token);
    } else {
        headers.set("authorization", `Bearer ${token}`);
    }
    return { url: upstream, headers };
}

function parseObject(value: string): Record<string, unknown> {
    try {
        const parsed = JSON.parse(value);
        return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
    } catch {
        return {};
    }
}

function stringValue(...values: unknown[]): string {
    for (const value of values) if (typeof value === "string" && value.trim() !== "") return value.trim();
    return "";
}

function joinPath(base: string, path: string): string {
    const prefix = base === "/" ? "" : base.replace(/\/$/, "");
    const normalizedPath = path.replace(/^\//, "");
    const normalizedPrefix = prefix.replace(/^\//, "");
    if (normalizedPrefix !== "" && (normalizedPath === normalizedPrefix || normalizedPath.startsWith(`${normalizedPrefix}/`))) {
        return `/${normalizedPath}`;
    }
    const prefixSegment = normalizedPrefix.split("/").filter(Boolean).pop();
    if (prefixSegment && (normalizedPath === prefixSegment || normalizedPath.startsWith(`${prefixSegment}/`))) {
        return `${prefix}/${normalizedPath.slice(prefixSegment.length).replace(/^\//, "")}`;
    }
    return `${prefix}/${normalizedPath}`;
}

function openAIError(status: number, code: string, message: string): Response {
    return new Response(JSON.stringify({ error: { message, type: code, code } }), {
        status,
        headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
    });
}
