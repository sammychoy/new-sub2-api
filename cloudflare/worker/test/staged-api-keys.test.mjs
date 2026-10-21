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
].map((name) => readFile(new URL(`../../d1/migrations/${name}`, import.meta.url), "utf8")));

const JWT_SECRET = "api-keys-test-jwt-secret-that-is-at-least-32-bytes-long";
const PASSWORD_HASH = "$2b$10$nOUIs5kJ7naTuTFkBy1veuK0kSxUFXfuaOKdOKf9xYT0KKIGSJwFa";

function createDatabase() {
    const db = new SQLiteD1Database();
    for (const migration of migrations) db.exec(migration);
    return db;
}

async function insertUser(db, overrides = {}) {
    const values = {
        email: "user@example.com",
        passwordHash: PASSWORD_HASH,
        role: "user",
        status: "active",
        username: "testuser",
        ...overrides
    };
    const result = await db.prepare(`
        INSERT INTO users (
            created_at, updated_at, email, password_hash, role, status,
            username, totp_enabled, totp_secret_encrypted, signup_source, token_version
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `).bind(
        "2026-07-01T00:00:00.000Z",
        "2026-07-01T00:00:00.000Z",
        values.email,
        values.passwordHash,
        values.role,
        values.status,
        values.username,
        0,
        null,
        "email"
    ).run();
    return Number(result.meta?.last_row_id ?? 0);
}

async function insertGroup(db, overrides = {}) {
    const now = "2026-07-01T00:00:00.000Z";
    const result = await db.prepare(`
        INSERT INTO groups (
            created_at, updated_at, name, platform, rate_multiplier, is_exclusive,
            status, subscription_type, supported_model_scopes, messages_dispatch_model_config, models_list_config
        ) VALUES (?, ?, ?, ?, 1, ?, 'active', 'standard', '[]', '{}', '[]')
    `).bind(
        now,
        now,
        overrides.name ?? "Standard Group",
        overrides.platform ?? "openai",
        overrides.isExclusive ? 1 : 0
    ).run();
    return Number(result.meta?.last_row_id ?? 0);
}

async function insertApiKey(db, overrides = {}) {
    const values = {
        key: "sk-test1234567890abcdef",
        name: "Test Key",
        userId: 1,
        status: "active",
        groupId: null,
        ...overrides
    };
    const result = await db.prepare(`
        INSERT INTO api_keys (
            created_at, updated_at, key, name, status, user_id, group_id,
            ip_whitelist, ip_blacklist, quota, quota_used, expires_at,
            rate_limit_5h, rate_limit_1d, rate_limit_7d,
            usage_5h, usage_1d, usage_7d
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, 0, 0, 0)
    `).bind(
        "2026-07-01T00:00:00.000Z",
        "2026-07-01T00:00:00.000Z",
        values.key,
        values.name,
        values.status,
        values.userId,
        values.groupId,
        "[]",
        "[]",
        0,
        null,
        0,
        0,
        0
    ).run();
    return Number(result.meta?.last_row_id ?? 0);
}

async function createToken(role = "user", userId = 1, email = "user@example.com") {
    const signer = new Hs256JwtSigner(JWT_SECRET, 7 * 24 * 60 * 60);
    const tokenVersion = await legacyTokenVersion(email, PASSWORD_HASH, 0n);
    const signed = await signer.sign({ id: userId, email, role, tokenVersion });
    return signed.token;
}

function env(db) {
    return {
        DB: db,
        JWT_SECRET,
        JWT_ACCESS_TOKEN_EXPIRES_SECONDS: "3600",
        JWT_REFRESH_TOKEN_EXPIRE_DAYS: "30"
    };
}

test("PUT /api/v1/admin/api-keys/:id updates any user's API key in admin mode", async () => {
    const db = createDatabase();
    const userId = await insertUser(db, { email: "member@example.com", username: "member" });
    const adminId = await insertUser(db, { email: "admin@example.com", username: "admin", role: "admin" });
    const groupId = await insertGroup(db, { name: "Admin Assigned Group" });
    const keyId = await insertApiKey(db, { userId, name: "Member Key", key: "sk-member-key-1234567890" });
    await db.prepare("UPDATE api_keys SET usage_5h = 25, window_5h_start = '2026-07-01T00:00:00.000Z' WHERE id = ?").bind(keyId).run();

    const adminToken = await createToken("admin", adminId, "admin@example.com");
    const response = await routeRequest(new Request(`https://edge.example/api/v1/admin/api-keys/${keyId}`, {
        method: "PUT",
        headers: {
            authorization: `Bearer ${adminToken}`,
            "content-type": "application/json"
        },
        body: JSON.stringify({
            group_id: groupId,
            reset_rate_limits: true
        })
    }), env(db));

    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.code, 0);
    assert.equal(body.data.id, keyId);
    assert.equal(body.data.user_id, userId);
    assert.equal(body.data.group_id, groupId);
    assert.equal(body.data.usage_5h, 0);
    assert.equal(body.data.window_5h_start, null);
});

test("POST and PUT /api/v1/keys enforce exclusive group access via user_allowed_groups or user_subscriptions", async () => {
    const db = createDatabase();
    const userId = await insertUser(db);
    const exclusiveGroupId = await insertGroup(db, { name: "Exclusive Group", isExclusive: true });
    const token = await createToken("user", userId);

    // 1. Creating key with exclusive group without permission returns 403 FORBIDDEN
    const forbiddenCreate = await routeRequest(new Request("https://edge.example/api/v1/keys", {
        method: "POST",
        headers: {
            authorization: `Bearer ${token}`,
            "content-type": "application/json"
        },
        body: JSON.stringify({ name: "Unauthorized Key", group_id: exclusiveGroupId })
    }), env(db));
    assert.equal(forbiddenCreate.status, 403);
    assert.equal((await forbiddenCreate.json()).reason, "FORBIDDEN");

    // 2. Updating existing key to exclusive group without permission returns 403 FORBIDDEN
    const keyId = await insertApiKey(db, { userId, name: "Normal Key", key: "sk-normal-key-1234567890" });
    const forbiddenUpdate = await routeRequest(new Request(`https://edge.example/api/v1/keys/${keyId}`, {
        method: "PUT",
        headers: {
            authorization: `Bearer ${token}`,
            "content-type": "application/json"
        },
        body: JSON.stringify({ group_id: exclusiveGroupId })
    }), env(db));
    assert.equal(forbiddenUpdate.status, 403);
    assert.equal((await forbiddenUpdate.json()).reason, "FORBIDDEN");

    // 3. Granting access via user_allowed_groups allows create and update
    await db.prepare("INSERT INTO user_allowed_groups (created_at, user_id, group_id) VALUES (?, ?, ?)").bind(
        new Date().toISOString(),
        userId,
        exclusiveGroupId
    ).run();

    const allowedCreate = await routeRequest(new Request("https://edge.example/api/v1/keys", {
        method: "POST",
        headers: {
            authorization: `Bearer ${token}`,
            "content-type": "application/json"
        },
        body: JSON.stringify({ name: "Authorized Key", group_id: exclusiveGroupId })
    }), env(db));
    assert.equal(allowedCreate.status, 200);
    const createdBody = await allowedCreate.json();
    assert.equal(createdBody.data.group_id, exclusiveGroupId);
});
