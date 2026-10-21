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
        INSERT INTO users (created_at, updated_at, email, password_hash, role, status, username, totp_enabled, signup_source, token_version)
        VALUES (?, ?, ?, ?, 'user', 'active', 'gateway-user', 0, 'email', 0)
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

