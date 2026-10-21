import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { routeRequest } from "../src/index.ts";
import { SQLiteD1Database } from "./sqlite-d1.mjs";

const migrations = await Promise.all([
    "0001_ent_core.sql",
    "0004_runtime_state.sql",
    "0005_auth_sessions.sql"
].map((name) => readFile(new URL(`../../d1/migrations/${name}`, import.meta.url), "utf8")));

async function fixture() {
    const db = new SQLiteD1Database();
    for (const migration of migrations) db.exec(migration);
    const now = "2026-07-18T00:00:00.000Z";
    const user = await db.prepare(`
        INSERT INTO users (created_at, updated_at, email, password_hash, role, status, username, totp_enabled, signup_source, token_version, balance)
        VALUES (?, ?, ?, ?, 'user', 'active', 'gateway-user', 0, 'email', 0, 10)
    `).bind(now, now, "gateway@example.com", "hash").run();
    const userId = Number(user.meta.last_row_id);
    await db.prepare(`
        INSERT INTO api_keys (created_at, updated_at, key, name, status, user_id, quota, quota_used, rate_limit_5h, rate_limit_1d, rate_limit_7d, usage_5h, usage_1d, usage_7d)
        VALUES (?, ?, 'sk-gateway', 'Gateway', 'active', ?, 0, 0, 0, 0, 0, 0, 0, 0)
    `).bind(now, now, userId).run();
    await db.prepare(`
        INSERT INTO accounts (created_at, updated_at, name, notes, platform, type, credentials, extra, concurrency, priority, rate_multiplier, status, auto_pause_on_expired, schedulable, quota_dimension)
        VALUES (?, ?, 'openai-main', '', 'openai', 'apikey', ?, '{}', 3, 50, 1, 'active', 1, 1, 'global')
    `).bind(now, now, JSON.stringify({ api_key: "upstream-secret", base_url: "https://upstream.example" })).run();
    return db;
}

test("gateway requires an API key", async () => {
    const db = await fixture();
    const response = await routeRequest(new Request("https://edge.example/v1/chat/completions", { method: "POST", body: "{}" }), { DB: db });
    assert.equal(response.status, 401);
    assert.equal((await response.json()).error.code, "invalid_api_key");
});

test("gateway selects an account and forwards credentials and body", async (t) => {
    const db = await fixture();
    const originalFetch = globalThis.fetch;
    let captured;
    globalThis.fetch = async (url, init) => {
        captured = { url: String(url), init, body: await new Response(init.body).text() };
        return new Response(JSON.stringify({ id: "chatcmpl-1" }), {
            status: 200,
            headers: { "content-type": "application/json", "x-upstream": "ok" }
        });
    };
    t.after(() => { globalThis.fetch = originalFetch; });

    const response = await routeRequest(new Request("https://edge.example/v1/chat/completions?trace=1", {
        method: "POST",
        headers: { authorization: "Bearer sk-gateway", "content-type": "application/json" },
        body: JSON.stringify({ model: "gpt-4.1", messages: [] })
    }), { DB: db });

    assert.equal(response.status, 200);
    assert.equal(captured.url, "https://upstream.example/v1/chat/completions?trace=1");
    assert.equal(captured.init.headers.get("authorization"), "Bearer upstream-secret");
    assert.deepEqual(JSON.parse(captured.body), { model: "gpt-4.1", messages: [] });
    assert.equal(response.headers.get("x-upstream"), "ok");
    assert.equal(response.headers.get("x-sub2api-account-id"), "1");
    const key = await db.prepare("SELECT last_used_at FROM api_keys WHERE key = 'sk-gateway'").first();
    assert.equal(typeof key.last_used_at, "string");
});

test("gateway fails over to the next account on retryable upstream failure", async (t) => {
    const db = await fixture();
    const now = "2026-07-18T00:00:00.000Z";
    await db.prepare(`
        INSERT INTO accounts (created_at, updated_at, name, notes, platform, type, credentials, extra, concurrency, priority, rate_multiplier, status, auto_pause_on_expired, schedulable, quota_dimension)
        VALUES (?, ?, 'openai-backup', '', 'openai', 'apikey', ?, '{}', 3, 60, 1, 'active', 1, 1, 'global')
    `).bind(now, now, JSON.stringify({ api_key: "backup-secret", base_url: "https://backup.example" })).run();

    const originalFetch = globalThis.fetch;
    const calls = [];
    globalThis.fetch = async (url, init) => {
        calls.push({ url: String(url), body: await new Response(init.body).text() });
        if (String(url).startsWith("https://upstream.example")) {
            return new Response("temporary failure", { status: 503 });
        }
        return new Response(JSON.stringify({ id: "chatcmpl-backup" }), {
            status: 200,
            headers: { "content-type": "application/json" }
        });
    };
    t.after(() => { globalThis.fetch = originalFetch; });

    const payload = { model: "gpt-4.1", messages: [{ role: "user", content: "hello" }] };
    const response = await routeRequest(new Request("https://edge.example/v1/chat/completions", {
        method: "POST",
        headers: { authorization: "Bearer sk-gateway", "content-type": "application/json" },
        body: JSON.stringify(payload)
    }), { DB: db });

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-sub2api-account-id"), "2");
    assert.equal(response.headers.get("x-sub2api-routing-attempt"), "2");
    assert.equal(calls.length, 2);
    assert.equal(calls[0].url, "https://upstream.example/v1/chat/completions");
    assert.equal(calls[1].url, "https://backup.example/v1/chat/completions");
    assert.deepEqual(JSON.parse(calls[0].body), payload);
    assert.deepEqual(JSON.parse(calls[1].body), payload);

    const failed = await db.prepare("SELECT error_message, temp_unschedulable_until, temp_unschedulable_reason FROM accounts WHERE id = 1").first();
    assert.match(failed.error_message, /503/);
    assert.equal(failed.temp_unschedulable_reason, "gateway_failover");
    assert.ok(Date.parse(failed.temp_unschedulable_until) > Date.now());
});

test("gateway skips accounts that are in overload cooldown", async (t) => {
    const db = await fixture();
    const now = "2026-07-18T00:00:00.000Z";
    const future = new Date(Date.now() + 60_000).toISOString();
    await db.prepare("UPDATE accounts SET overload_until = ? WHERE id = 1").bind(future).run();
    await db.prepare(`
        INSERT INTO accounts (created_at, updated_at, name, notes, platform, type, credentials, extra, concurrency, priority, rate_multiplier, status, auto_pause_on_expired, schedulable, quota_dimension)
        VALUES (?, ?, 'openai-healthy', '', 'openai', 'apikey', ?, '{}', 3, 60, 1, 'active', 1, 1, 'global')
    `).bind(now, now, JSON.stringify({ api_key: "healthy-secret", base_url: "https://healthy.example" })).run();

    const originalFetch = globalThis.fetch;
    let calledUrl = "";
    globalThis.fetch = async (url) => {
        calledUrl = String(url);
        return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
    };
    t.after(() => { globalThis.fetch = originalFetch; });

    const response = await routeRequest(new Request("https://edge.example/v1/chat/completions", {
        method: "POST",
        headers: { authorization: "Bearer sk-gateway", "content-type": "application/json" },
        body: "{}"
    }), { DB: db });

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-sub2api-account-id"), "2");
    assert.equal(response.headers.get("x-sub2api-routing-attempt"), "1");
    assert.equal(calledUrl, "https://healthy.example/v1/chat/completions");
});

test("gateway marks final-attempt retryable status as account failure and does not mark key success", async (t) => {
    const db = await fixture();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response("rate limited", {
        status: 429,
        headers: { "retry-after": "15" }
    });
    t.after(() => { globalThis.fetch = originalFetch; });

    const response = await routeRequest(new Request("https://edge.example/v1/chat/completions", {
        method: "POST",
        headers: { authorization: "Bearer sk-gateway", "content-type": "application/json" },
        body: "{}"
    }), { DB: db });

    assert.equal(response.status, 429);
    const failed = await db.prepare("SELECT error_message, temp_unschedulable_until, temp_unschedulable_reason FROM accounts WHERE id = 1").first();
    assert.match(failed.error_message, /429/);
    assert.equal(failed.temp_unschedulable_reason, "gateway_failover");
    assert.ok(Date.parse(failed.temp_unschedulable_until) > Date.now());
    const key = await db.prepare("SELECT last_used_at FROM api_keys WHERE key = 'sk-gateway'").first();
    assert.equal(key.last_used_at, null);
});

test("gateway strips client Bearer header for Gemini accounts and prefixes /v1 on root OpenAI paths", async (t) => {
    const db = await fixture();
    const now = "2026-07-18T00:00:00.000Z";
    await db.prepare(`
        INSERT INTO accounts (created_at, updated_at, name, notes, platform, type, credentials, extra, concurrency, priority, rate_multiplier, status, auto_pause_on_expired, schedulable, quota_dimension)
        VALUES (?, ?, 'gemini-main', '', 'gemini', 'apikey', ?, '{}', 3, 10, 1, 'active', 1, 1, 'global')
    `).bind(now, now, JSON.stringify({ api_key: "gemini-secret", base_url: "https://generativelanguage.googleapis.com" })).run();

    const originalFetch = globalThis.fetch;
    const calls = [];
    globalThis.fetch = async (url, init) => {
        calls.push({ url: String(url), auth: init.headers.get("authorization") });
        return new Response(JSON.stringify({
            id: "chatcmpl-usage",
            model: "gpt-4.1",
            usage: { prompt_tokens: 100, completion_tokens: 50 }
        }), { status: 200, headers: { "content-type": "application/json" } });
    };
    t.after(() => { globalThis.fetch = originalFetch; });

    const geminiResp = await routeRequest(new Request("https://edge.example/v1beta/models/gemini-2.5-pro:generateContent", {
        method: "POST",
        headers: { authorization: "Bearer sk-gateway", "content-type": "application/json" },
        body: JSON.stringify({ contents: [] })
    }), { DB: db });
    assert.equal(geminiResp.status, 200);
    assert.equal(calls[0].url, "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=gemini-secret");
    assert.equal(calls[0].auth, null);

    const openaiResp = await routeRequest(new Request("https://edge.example/chat/completions", {
        method: "POST",
        headers: { authorization: "Bearer sk-gateway", "content-type": "application/json" },
        body: JSON.stringify({ model: "gpt-4.1", messages: [] })
    }), { DB: db });
    assert.equal(openaiResp.status, 200);
    assert.equal(calls[1].url, "https://upstream.example/v1/chat/completions");
    assert.equal(calls[1].auth, "Bearer upstream-secret");

    const usageLog = await db.prepare("SELECT input_tokens, output_tokens FROM usage_logs ORDER BY id DESC LIMIT 1").first();
    assert.equal(usageLog.input_tokens, 100);
    assert.equal(usageLog.output_tokens, 50);
});

test("gateway returns 402 insufficient_balance when balance is 0 without an active subscription", async () => {
    const db = await fixture();
    await db.prepare("UPDATE users SET balance = 0 WHERE id = 1").run();

    const response = await routeRequest(new Request("https://edge.example/v1/chat/completions", {
        method: "POST",
        headers: { authorization: "Bearer sk-gateway", "content-type": "application/json" },
        body: JSON.stringify({ model: "gpt-4o-2024-08-06", messages: [] })
    }), { DB: db });

    assert.equal(response.status, 402);
    const body = await response.json();
    assert.equal(body.error.code, "insufficient_balance");
});

test("gateway deducts wallet balance or increments active subscription usage and sets loop header", async (t) => {
    const db = await fixture();
    const originalFetch = globalThis.fetch;
    let upstreamHopHeader = null;
    globalThis.fetch = async (_url, init) => {
        upstreamHopHeader = init.headers.get("x-sub2api-router-hop");
        return new Response(JSON.stringify({
            id: "chatcmpl-cost",
            model: "gpt-4o-2024-08-06",
            usage: { prompt_tokens: 1000, completion_tokens: 500 }
        }), { status: 200, headers: { "content-type": "application/json" } });
    };
    t.after(() => { globalThis.fetch = originalFetch; });

    const resp1 = await routeRequest(new Request("https://edge.example/v1/chat/completions", {
        method: "POST",
        headers: { authorization: "Bearer sk-gateway", "content-type": "application/json" },
        body: JSON.stringify({ model: "gpt-4o-2024-08-06", messages: [] })
    }), { DB: db });
    assert.equal(resp1.status, 200);
    assert.equal(upstreamHopHeader, "1");

    // gpt-4o-2024-08-06: input 2.5e-6 * 1000 + output 1e-5 * 500 = 0.0025 + 0.005 = 0.0075
    const userAfterWallet = await db.prepare("SELECT balance FROM users WHERE id = 1").first();
    assert.ok(Math.abs(userAfterWallet.balance - (10 - 0.0075)) < 1e-9);

    // Now set balance = 0 and add an active subscription
    await db.prepare("UPDATE users SET balance = 0 WHERE id = 1").run();
    const now = new Date().toISOString();
    const future = new Date(Date.now() + 86_400_000).toISOString();
    const groupRes = await db.prepare(`
        INSERT INTO groups (created_at, updated_at, name, platform, rate_multiplier, is_exclusive, status, subscription_type, daily_limit_usd, supported_model_scopes, messages_dispatch_model_config, models_list_config)
        VALUES (?, ?, 'Sub Group', 'openai', 2, 0, 'active', 'subscription', 50, '[]', '{}', '[]')
    `).bind(now, now).run();
    const groupId = Number(groupRes.meta.last_row_id);
    await db.prepare(`
        INSERT INTO user_subscriptions (created_at, updated_at, starts_at, expires_at, status, daily_usage_usd, weekly_usage_usd, monthly_usage_usd, assigned_at, group_id, user_id)
        VALUES (?, ?, ?, ?, 'active', 0, 0, 0, ?, ?, 1)
    `).bind(now, now, now, future, now, groupId).run();

    const resp2 = await routeRequest(new Request("https://edge.example/v1/chat/completions", {
        method: "POST",
        headers: { authorization: "Bearer sk-gateway", "content-type": "application/json" },
        body: JSON.stringify({ model: "gpt-4o-2024-08-06", messages: [] })
    }), { DB: db });
    assert.equal(resp2.status, 200);

    const subAfter = await db.prepare("SELECT daily_usage_usd, weekly_usage_usd, monthly_usage_usd FROM user_subscriptions WHERE user_id = 1").first();
    // rate_multiplier = 2 -> 0.0075 * 2 = 0.015
    assert.ok(Math.abs(subAfter.daily_usage_usd - 0.015) < 1e-9);
    assert.ok(Math.abs(subAfter.weekly_usage_usd - 0.015) < 1e-9);
    assert.ok(Math.abs(subAfter.monthly_usage_usd - 0.015) < 1e-9);
});

test("gateway handles streaming SSE responses and records usage logs and rate limit windows", async (t) => {
    const db = await fixture();
    const expiredWindow = new Date(Date.now() - 10 * 3600_000).toISOString();
    await db.prepare(`
        UPDATE api_keys SET rate_limit_5h = 1, usage_5h = 1, window_5h_start = ? WHERE key = 'sk-gateway'
    `).bind(expiredWindow).run();

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
        const sse = [
            `data: {"id":"chatcmpl-stream","model":"gpt-4o-2024-08-06","choices":[{"delta":{"content":"Hello"}}]}`,
            `data: {"id":"chatcmpl-stream","model":"gpt-4o-2024-08-06","usage":{"prompt_tokens":200,"completion_tokens":100}}`,
            `data: [DONE]`,
            ""
        ].join("\n\n");
        return new Response(sse, {
            status: 200,
            headers: { "content-type": "text/event-stream" }
        });
    };
    t.after(() => { globalThis.fetch = originalFetch; });

    const response = await routeRequest(new Request("https://edge.example/v1/chat/completions", {
        method: "POST",
        headers: { authorization: "Bearer sk-gateway", "content-type": "application/json" },
        body: JSON.stringify({ model: "gpt-4o-2024-08-06", stream: true, messages: [] })
    }), { DB: db });

    assert.equal(response.status, 200);
    const text = await response.text();
    assert.match(text, /chatcmpl-stream/);

    const log = await db.prepare("SELECT input_tokens, output_tokens, stream, actual_cost FROM usage_logs ORDER BY id DESC LIMIT 1").first();
    assert.equal(log.input_tokens, 200);
    assert.equal(log.output_tokens, 100);
    assert.equal(log.stream, 1);
    assert.ok(log.actual_cost > 0);

    const keyAfter = await db.prepare("SELECT usage_5h, window_5h_start FROM api_keys WHERE key = 'sk-gateway'").first();
    assert.ok(Math.abs(keyAfter.usage_5h - log.actual_cost) < 1e-9);
    assert.ok(Date.parse(keyAfter.window_5h_start) > Date.parse(expiredWindow));
});

test("gateway serves GET /v1/usage locally without calling upstream", async () => {
    const db = await fixture();
    const now = new Date().toISOString();
    await db.prepare(`
        INSERT INTO usage_logs (request_id, model, requested_model, upstream_model, input_tokens, output_tokens, total_cost, actual_cost, stream, duration_ms, created_at, api_key_id, account_id, user_id)
        VALUES ('req-1', 'gpt-4.1', 'gpt-4.1', 'gpt-4.1', 120, 80, 0.05, 0.05, 0, 250, ?, 1, 1, 1)
    `).bind(now).run();

    const walletRes = await routeRequest(new Request("https://edge.example/v1/usage", {
        method: "GET",
        headers: { authorization: "Bearer sk-gateway" }
    }), { DB: db });
    assert.equal(walletRes.status, 200);
    const walletData = await walletRes.json();
    assert.equal(walletData.mode, "wallet");
    assert.equal(walletData.balance, 10);
    assert.equal(walletData.usage.total.requests, 1);
    assert.equal(walletData.usage.total.input_tokens, 120);
    assert.equal(walletData.usage.total.output_tokens, 80);
    assert.equal(walletData.model_stats.length, 1);
    assert.equal(walletData.daily_usage.length, 1);

    await db.prepare("UPDATE api_keys SET quota = 50, quota_used = 12.5, rate_limit_5h = 5 WHERE key = 'sk-gateway'").run();
    const quotaRes = await routeRequest(new Request("https://edge.example/v1/usage", {
        method: "GET",
        headers: { authorization: "Bearer sk-gateway" }
    }), { DB: db });
    assert.equal(quotaRes.status, 200);
    const quotaData = await quotaRes.json();
    assert.equal(quotaData.mode, "quota_limited");
    assert.equal(quotaData.quota.limit, 50);
    assert.equal(quotaData.quota.used, 12.5);
    assert.equal(quotaData.quota.remaining, 37.5);
    assert.equal(quotaData.rate_limits.length, 1);
    assert.equal(quotaData.rate_limits[0].window, "5h");
});

test("gateway enforces exclusive group access in querySchedulableAccounts", async (t) => {
    const db = await fixture();
    const now = new Date().toISOString();
    const groupRes = await db.prepare(`
        INSERT INTO groups (created_at, updated_at, name, platform, rate_multiplier, is_exclusive, status, subscription_type, supported_model_scopes, messages_dispatch_model_config, models_list_config)
        VALUES (?, ?, 'Exclusive VIP', 'openai', 1, 1, 'active', 'standard', '[]', '{}', '[]')
    `).bind(now, now).run();
    const exclusiveGroupId = Number(groupRes.meta.last_row_id);

    await db.prepare(`
        INSERT INTO account_groups (priority, created_at, account_id, group_id)
        VALUES (10, ?, 1, ?)
    `).bind(now, exclusiveGroupId).run();

    // User 1 is not in user_allowed_groups -> account 1 should be excluded
    const res1 = await routeRequest(new Request("https://edge.example/v1/chat/completions", {
        method: "POST",
        headers: { authorization: "Bearer sk-gateway", "content-type": "application/json" },
        body: JSON.stringify({ model: "gpt-4.1", messages: [] })
    }), { DB: db });
    assert.equal(res1.status, 503);
    assert.equal((await res1.json()).error.code, "no_available_account");

    // Grant access via user_allowed_groups
    await db.prepare(`
        INSERT INTO user_allowed_groups (created_at, user_id, group_id)
        VALUES (?, 1, ?)
    `).bind(now, exclusiveGroupId).run();

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(JSON.stringify({ id: "ok" }), {
        status: 200,
        headers: { "content-type": "application/json" }
    });
    t.after(() => { globalThis.fetch = originalFetch; });

    const res2 = await routeRequest(new Request("https://edge.example/v1/chat/completions", {
        method: "POST",
        headers: { authorization: "Bearer sk-gateway", "content-type": "application/json" },
        body: JSON.stringify({ model: "gpt-4.1", messages: [] })
    }), { DB: db });
    assert.equal(res2.status, 200);
});


