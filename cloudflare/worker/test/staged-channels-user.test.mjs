import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { routeRequest } from "../src/index.ts";
import { legacyTokenVersion } from "../src/utils/crypto.ts";
import { Hs256JwtSigner } from "../src/services/jwt.ts";
import { SQLiteD1Database } from "./sqlite-d1.mjs";

const migrations = await Promise.all([
    "0001_ent_core.sql",
    "0002_business_supplemental.sql",
    "0004_runtime_state.sql",
    "0005_auth_sessions.sql"
].map((n) => readFile(new URL(`../../d1/migrations/${n}`, import.meta.url), "utf8")));

const JWT_SECRET = "ch-user-test-secret-at-least-32-bytes!!";
const PASSWORD_HASH = "$2b$10$nOUIs5kJ7naTuTFkBy1veuK0kSxUFXfuaOKdOKf9xYT0KKIGSJwFa";
const BASE = "https://edge.example";
const NOW = "2026-07-15T12:00:00.000Z";

function createDb() {
    const d = new SQLiteD1Database();
    for (const m of migrations) d.exec(m);
    return d;
}

function env(d) {
    return {
        DB: d,
        JWT_SECRET,
        JWT_ACCESS_TOKEN_EXPIRES_SECONDS: "3600",
        JWT_REFRESH_TOKEN_EXPIRE_DAYS: "30"
    };
}

async function insUser(d, overrides = {}) {
    const r = await d.prepare(
        `INSERT INTO users (created_at, updated_at, email, password_hash, role, status, username, token_version) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
        NOW,
        NOW,
        overrides.email ?? "user@x.com",
        PASSWORD_HASH,
        "user",
        "active",
        overrides.username ?? "testuser",
        0
    ).run();
    return Number(r.meta.last_row_id);
}

async function insGroup(d, overrides = {}) {
    const r = await d.prepare(
        `INSERT INTO groups (name, platform, rate_multiplier, status, supported_model_scopes, messages_dispatch_model_config, models_list_config, created_at, updated_at, is_exclusive, subscription_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
        overrides.name ?? "Standard",
        overrides.platform ?? "openai",
        overrides.rate_multiplier ?? 1,
        "active",
        "[]",
        "{}",
        "[]",
        NOW,
        NOW,
        overrides.is_exclusive ?? 0,
        overrides.subscription_type ?? "standard"
    ).run();
    return Number(r.meta.last_row_id);
}

async function insChannel(d, overrides = {}) {
    const r = await d.prepare(
        `INSERT INTO channels (name, description, status, model_mapping, billing_model_source, restrict_models, features, features_config, apply_pricing_to_account_stats, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
        overrides.name ?? "Test Channel",
        overrides.description ?? "A test channel",
        overrides.status ?? "active",
        overrides.model_mapping ?? "{}",
        "channel_mapped",
        0,
        "",
        "{}",
        0,
        NOW,
        NOW
    ).run();
    return Number(r.meta.last_row_id);
}

async function insChannelGroup(d, channelId, groupId) {
    await d.prepare(`INSERT INTO channel_groups (channel_id, group_id) VALUES (?, ?)`).bind(channelId, groupId).run();
}

async function createToken(uid, email = "user@x.com", role = "user") {
    const signer = new Hs256JwtSigner(JWT_SECRET, 604800);
    const tv = await legacyTokenVersion(email, PASSWORD_HASH, 0n);
    const s = await signer.sign({ id: uid, email, role, tokenVersion: tv });
    return s.token;
}

test("GET /api/v1/channels/available filters exclusive groups unless allowed or subscribed", async () => {
    const d = createDb();
    const uid = await insUser(d);
    const publicGroupId = await insGroup(d, { name: "Public OpenAI", platform: "openai", is_exclusive: 0 });
    const exclusiveAllowedId = await insGroup(d, { name: "Exclusive Allowed", platform: "openai", is_exclusive: 1 });
    const exclusiveSubId = await insGroup(d, { name: "Exclusive Subscribed", platform: "anthropic", is_exclusive: 1 });
    const exclusiveBlockedId = await insGroup(d, { name: "Exclusive Blocked", platform: "gemini", is_exclusive: 1 });

    const chPublic = await insChannel(d, { name: "Public Channel" });
    const chAllowed = await insChannel(d, { name: "Allowed Channel" });
    const chSub = await insChannel(d, { name: "Subscribed Channel" });
    const chBlocked = await insChannel(d, { name: "Blocked Channel" });

    await insChannelGroup(d, chPublic, publicGroupId);
    await insChannelGroup(d, chAllowed, exclusiveAllowedId);
    await insChannelGroup(d, chSub, exclusiveSubId);
    await insChannelGroup(d, chBlocked, exclusiveBlockedId);

    const tk = await createToken(uid);

    // Initially user has no allowed groups and no subscriptions -> only Public Channel should be visible
    const res1 = await routeRequest(new Request(`${BASE}/api/v1/channels/available`, {
        headers: { authorization: `Bearer ${tk}` }
    }), env(d));
    assert.equal(res1.status, 200);
    const body1 = await res1.json();
    assert.deepEqual(body1.data.map((c) => c.name), ["Public Channel"]);

    // Add exclusiveAllowedId to user_allowed_groups and exclusiveSubId to active user_subscriptions
    await d.prepare(`INSERT INTO user_allowed_groups (created_at, user_id, group_id) VALUES (?, ?, ?)`).bind(
        NOW,
        uid,
        exclusiveAllowedId
    ).run();
    const future = new Date(Date.now() + 86_400_000).toISOString();
    await d.prepare(`
        INSERT INTO user_subscriptions (created_at, updated_at, starts_at, expires_at, status, daily_usage_usd, weekly_usage_usd, monthly_usage_usd, assigned_at, group_id, user_id)
        VALUES (?, ?, ?, ?, 'active', 0, 0, 0, ?, ?, ?)
    `).bind(NOW, NOW, NOW, future, NOW, exclusiveSubId, uid).run();

    // Now user should see Public Channel, Allowed Channel, and Subscribed Channel (and still NOT Blocked Channel)
    const res2 = await routeRequest(new Request(`${BASE}/api/v1/channels/available`, {
        headers: { authorization: `Bearer ${tk}` }
    }), env(d));
    assert.equal(res2.status, 200);
    const body2 = await res2.json();
    assert.deepEqual(body2.data.map((c) => c.name), [
        "Allowed Channel",
        "Public Channel",
        "Subscribed Channel"
    ]);
});
