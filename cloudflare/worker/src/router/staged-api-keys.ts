import { D1ApiKeyRepository, type ApiKeyRecord } from "../repositories/api-keys.ts";
import { D1AuthSessionRepository } from "../repositories/auth-sessions.ts";
import { D1AuthUserRepository } from "../repositories/auth-users.ts";
import { allRows, firstRow } from "../repositories/d1.ts";
import { AccessAuthError, AccessAuthService } from "../services/access-auth.ts";
import { ApiKeyError, D1ApiKeyService } from "../services/api-keys.ts";
import { AuthTokenService } from "../services/auth-tokens.ts";
import { Hs256JwtSigner, Hs256JwtVerifier } from "../services/jwt.ts";
import type { D1Database } from "../types/d1.ts";
import {
    legacyError,
    legacyInternalError,
    legacySuccess,
    middlewareAuthError,
    routerError
} from "./responses.ts";

const KEY_PATH = /^\/api\/v1\/keys(?:\/(\d+))?$/u;
const AVAILABLE_GROUPS_PATH = "/api/v1/groups/available";
const USER_GROUP_RATES_PATH = "/api/v1/groups/rates";
const ADMIN_KEY_PATH = /^\/api\/v1\/admin\/api-keys\/(\d+)$/u;
const ADMIN_USER_KEYS_PATH = /^\/api\/v1\/admin\/users\/(\d+)\/api-keys$/u;
const ADMIN_SEARCH_KEYS_PATH = "/api/v1/admin/usage/search-api-keys";

export const STAGED_API_KEY_PATHS = {
    keys: "/api/v1/keys",
    availableGroups: AVAILABLE_GROUPS_PATH,
    userGroupRates: USER_GROUP_RATES_PATH,
    adminSearchKeys: ADMIN_SEARCH_KEYS_PATH
} as const;

export interface StagedApiKeysEnv {
    DB?: D1Database;
    JWT_SECRET?: string;
    JWT_ACCESS_TOKEN_EXPIRES_SECONDS?: string;
    JWT_REFRESH_TOKEN_EXPIRE_DAYS?: string;
}

export interface StagedApiKeysDependencies {
    clock?: () => number;
}

function boundedIntegerEnv(
    value: string | undefined,
    defaultValue: number,
    min: number,
    max: number
): number {
    if (value === undefined || value.trim() === "") return defaultValue;
    const parsed = Number.parseInt(value.trim(), 10);
    if (!Number.isInteger(parsed)) return defaultValue;
    return Math.min(max, Math.max(min, parsed));
}

function stringField(body: Record<string, unknown>, key: string): string {
    const value = body[key];
    return typeof value === "string" ? value : "";
}

function optionalNumber(body: Record<string, unknown>, key: string): number | undefined {
    const value = body[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
        const parsed = Number.parseFloat(value);
        if (Number.isFinite(parsed)) return parsed;
    }
    return undefined;
}

function optionalString(body: Record<string, unknown>, key: string): string | undefined {
    const value = body[key];
    return typeof value === "string" ? value : undefined;
}

function optionalStringArray(body: Record<string, unknown>, key: string): string[] | undefined {
    const value = body[key];
    if (!Array.isArray(value)) return undefined;
    return value.filter((item): item is string => typeof item === "string");
}

function optionalBoolean(body: Record<string, unknown>, key: string): boolean | undefined {
    const value = body[key];
    if (typeof value === "boolean") return value;
    if (typeof value === "string") return value === "true" || value === "1";
    return undefined;
}

async function authenticateAdmin(
    request: Request,
    env: StagedApiKeysEnv,
    clock: () => number
): Promise<{ userId: number; role: string }> {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
        throw new AccessAuthError("UNAUTHORIZED", "Missing authorization header");
    }
    const secret = env.JWT_SECRET?.trim() ?? "";
    if (!secret) throw new AccessAuthError("UNAUTHORIZED", "JWT secret is not configured");

    const users = new D1AuthUserRepository(env.DB!);
    const sessions = new D1AuthSessionRepository(env.DB!);
    const signer = new Hs256JwtSigner(secret, boundedIntegerEnv(env.JWT_ACCESS_TOKEN_EXPIRES_SECONDS, 24 * 60 * 60, 1, 7 * 24 * 60 * 60), clock);
    const verifier = new Hs256JwtVerifier(secret, clock);
    const tokens = new AuthTokenService(sessions, signer, boundedIntegerEnv(env.JWT_REFRESH_TOKEN_EXPIRE_DAYS, 30, 1, 365), clock);
    const auth = new AccessAuthService(users, verifier, tokens, clock);
    const subject = await auth.authenticateAuthorization(authHeader);
    return { userId: subject.user.id, role: subject.user.role };
}

function parseQueryString(url: URL, key: string): string | undefined {
    const value = url.searchParams.get(key);
    return value !== null && value.trim() !== "" ? value.trim() : undefined;
}

function parseOptionalInt(url: URL, key: string): number | undefined {
    const value = url.searchParams.get(key);
    if (value === null || value.trim() === "") return undefined;
    const parsed = Number.parseInt(value.trim(), 10);
    return Number.isInteger(parsed) ? parsed : undefined;
}

export async function routeStagedApiKeys(
    request: Request,
    env: StagedApiKeysEnv,
    dependencies: StagedApiKeysDependencies = {}
): Promise<Response | null> {
    const url = new URL(request.url);
    const path = url.pathname;
    const clock = dependencies.clock ?? Date.now;

    const keyMatch = KEY_PATH.exec(path);
    const adminKeyMatch = ADMIN_KEY_PATH.exec(path);
    const adminUserKeysMatch = ADMIN_USER_KEYS_PATH.exec(path);

    const isKnownPath = keyMatch !== null
        || path === AVAILABLE_GROUPS_PATH
        || path === USER_GROUP_RATES_PATH
        || adminKeyMatch !== null
        || adminUserKeysMatch !== null
        || path === ADMIN_SEARCH_KEYS_PATH;

    if (!isKnownPath) return null;

    if (env.DB === undefined) {
        return routerError(503, "database_not_configured", "Configure the Cloudflare D1 DB binding");
    }

    try {
        const auth = await authenticateAdmin(request, env, clock);
        const repository = new D1ApiKeyRepository(env.DB);
        const service = new D1ApiKeyService(repository);

        const isAdmin = auth.role === "admin";
        const hasKeyParam = keyMatch !== null && keyMatch[1] !== undefined;

        if (keyMatch !== null) {
            const keyId = hasKeyParam ? Number(keyMatch[1]) : undefined;

            if (request.method === "GET" && !hasKeyParam) {
                const page = parseOptionalInt(url, "page") ?? 1;
                const pageSize = parseOptionalInt(url, "page_size") ?? 20;
                const search = parseQueryString(url, "search");
                const status = parseQueryString(url, "status");
                const groupId = parseOptionalInt(url, "group_id");
                const orderBy = parseQueryString(url, "order_by") ?? "id";
                const orderDir = (parseQueryString(url, "order_dir") as "asc" | "desc") ?? "desc";

                const result = await service.listKeys({
                    userId: auth.userId,
                    page,
                    pageSize,
                    search,
                    status,
                    groupId,
                    orderBy,
                    orderDir
                });

                const groupIds = [...new Set(result.items.map(k => k.groupId).filter((id): id is number => typeof id === "number"))];
                let groupMap = new Map<number, Record<string, unknown>>();
                if (groupIds.length > 0 && env.DB) {
                    const placeholders = groupIds.map(() => "?").join(",");
                    const groupRows = await allRows<Record<string, unknown>>(
                        env.DB,
                        `SELECT * FROM groups WHERE id IN (${placeholders})`,
                        groupIds
                    );
                    groupMap = new Map(groupRows.map(g => [Number(g.id), formatGroupForClient(g)]));
                }

                return legacySuccess({
                    items: result.items.map(k => formatApiKeyForClient(k, k.groupId ? groupMap.get(k.groupId) : null)),
                    total: result.total,
                    page,
                    page_size: pageSize,
                    pages: Math.ceil(result.total / pageSize)
                });
            }

            if (request.method === "POST" && !hasKeyParam) {
                const body = await request.json() as Record<string, unknown>;
                if (body === null || typeof body !== "object" || Array.isArray(body)) {
                    return legacyError(400, "Request body must be a JSON object", "INVALID_BODY");
                }
                let expiresAt = optionalString(body, "expires_at");
                if (!expiresAt) {
                    const expiresInDays = optionalNumber(body, "expires_in_days");
                    if (expiresInDays && expiresInDays > 0) {
                        expiresAt = new Date(Date.now() + expiresInDays * 86400000).toISOString();
                    }
                }
                const customKey = optionalString(body, "custom_key") ?? optionalString(body, "key");
                const created = await service.createKey(auth.userId, {
                    name: stringField(body, "name"),
                    key: customKey,
                    group_id: optionalNumber(body, "group_id"),
                    ip_whitelist: optionalStringArray(body, "ip_whitelist"),
                    ip_blacklist: optionalStringArray(body, "ip_blacklist"),
                    quota: optionalNumber(body, "quota"),
                    expires_at: expiresAt,
                    rate_limit_5h: optionalNumber(body, "rate_limit_5h"),
                    rate_limit_1d: optionalNumber(body, "rate_limit_1d"),
                    rate_limit_7d: optionalNumber(body, "rate_limit_7d")
                });

                let group: Record<string, unknown> | null = null;
                if (created.groupId && env.DB) {
                    const groupRow = await firstRow<Record<string, unknown>>(
                        env.DB,
                        "SELECT * FROM groups WHERE id = ?",
                        [created.groupId]
                    );
                    if (groupRow) group = formatGroupForClient(groupRow);
                }

                return legacySuccess(formatApiKeyForClient(created, group));
            }

            if (hasKeyParam && keyId !== undefined) {
                if (request.method === "GET") {
                    const key = await service.getKeyById(keyId, auth.userId);
                    let group: Record<string, unknown> | null = null;
                    if (key.groupId && env.DB) {
                        const groupRow = await firstRow<Record<string, unknown>>(
                            env.DB,
                            "SELECT * FROM groups WHERE id = ?",
                            [key.groupId]
                        );
                        if (groupRow) group = formatGroupForClient(groupRow);
                    }
                    return legacySuccess(formatApiKeyForClient(key, group));
                }

                if (request.method === "PUT") {
                    const body = await request.json() as Record<string, unknown>;
                    if (body === null || typeof body !== "object" || Array.isArray(body)) {
                        return legacyError(400, "Request body must be a JSON object", "INVALID_BODY");
                    }
                    const updated = await service.updateKey(keyId, auth.userId, {
                        name: optionalString(body, "name"),
                        group_id: body.group_id === null ? null : optionalNumber(body, "group_id"),
                        status: optionalString(body, "status"),
                        ip_whitelist: optionalStringArray(body, "ip_whitelist"),
                        ip_blacklist: optionalStringArray(body, "ip_blacklist"),
                        quota: optionalNumber(body, "quota"),
                        expires_at: body.expires_at === null ? null : optionalString(body, "expires_at"),
                        rate_limit_5h: optionalNumber(body, "rate_limit_5h"),
                        rate_limit_1d: optionalNumber(body, "rate_limit_1d"),
                        rate_limit_7d: optionalNumber(body, "rate_limit_7d"),
                        reset_quota: optionalBoolean(body, "reset_quota"),
                        reset_rate_limits: optionalBoolean(body, "reset_rate_limits")
                    });

                    let group: Record<string, unknown> | null = null;
                    if (updated.groupId && env.DB) {
                        const groupRow = await firstRow<Record<string, unknown>>(
                            env.DB,
                            "SELECT * FROM groups WHERE id = ?",
                            [updated.groupId]
                        );
                        if (groupRow) group = formatGroupForClient(groupRow);
                    }

                    return legacySuccess(formatApiKeyForClient(updated, group));
                }

                if (request.method === "DELETE") {
                    await service.deleteKey(keyId, auth.userId);
                    return legacySuccess({ message: "API key deleted successfully" });
                }
            }

            return routerError(405, "method_not_allowed", `${path} method not allowed`);
        }

        if (path === AVAILABLE_GROUPS_PATH && request.method === "GET") {
            const nowIso = new Date(clock()).toISOString();
            const available = await allRows<Record<string, unknown>>(
                env.DB,
                `SELECT g.* FROM groups g
                 LEFT JOIN user_allowed_groups uag ON g.id = uag.group_id AND uag.user_id = ?
                 WHERE g.deleted_at IS NULL AND g.status = 'active'
                   AND (
                       g.is_exclusive = 0
                       OR uag.user_id IS NOT NULL
                       OR EXISTS (
                           SELECT 1 FROM user_subscriptions us
                           WHERE us.user_id = ? AND us.group_id = g.id
                             AND us.status = 'active' AND us.deleted_at IS NULL AND us.expires_at > ?
                       )
                       OR ? = 'admin'
                   )
                 ORDER BY g.sort_order, g.name`,
                [auth.userId, auth.userId, nowIso, auth.role]
            );
            return legacySuccess(available.map(formatGroupForClient));
        }

        if (path === USER_GROUP_RATES_PATH && request.method === "GET") {
            const rates = await allRows<{ group_id: number; rate_multiplier: number | null; rpm_override: number | null }>(
                env.DB,
                `SELECT ugrm.group_id, ugrm.rate_multiplier, ugrm.rpm_override
                 FROM user_group_rate_multipliers ugrm
                 JOIN groups g ON ugrm.group_id = g.id
                 WHERE ugrm.user_id = ? AND g.deleted_at IS NULL`,
                [auth.userId]
            );
            const ratesMap: Record<string, number> = {};
            for (const r of rates) {
                if (r.rate_multiplier !== null) ratesMap[String(r.group_id)] = r.rate_multiplier;
            }
            return legacySuccess(ratesMap);
        }

        if (adminKeyMatch !== null && isAdmin) {
            const targetId = Number(adminKeyMatch[1]);
            if (request.method === "PUT") {
                const body = await request.json() as Record<string, unknown>;
                if (body === null || typeof body !== "object" || Array.isArray(body)) {
                    return legacyError(400, "Request body must be a JSON object", "INVALID_BODY");
                }
                const adminRepo = new D1ApiKeyRepository(env.DB);
                const updated = await adminRepo.update(targetId, 0, {
                    name: optionalString(body, "name"),
                    groupId: body.group_id === null ? null : optionalNumber(body, "group_id"),
                    status: optionalString(body, "status"),
                    ipWhitelist: optionalStringArray(body, "ip_whitelist"),
                    ipBlacklist: optionalStringArray(body, "ip_blacklist"),
                    quota: optionalNumber(body, "quota"),
                    expiresAt: body.expires_at === null ? null : optionalString(body, "expires_at"),
                    rateLimit5h: optionalNumber(body, "rate_limit_5h"),
                    rateLimit1d: optionalNumber(body, "rate_limit_1d"),
                    rateLimit7d: optionalNumber(body, "rate_limit_7d"),
                    resetQuota: optionalBoolean(body, "reset_quota"),
                    resetRateLimits: optionalBoolean(body, "reset_rate_limits")
                });
                if (updated === null) {
                    return legacyError(404, "API key not found", "KEY_NOT_FOUND");
                }

                let group: Record<string, unknown> | null = null;
                if (updated.groupId && env.DB) {
                    const groupRow = await firstRow<Record<string, unknown>>(
                        env.DB,
                        "SELECT * FROM groups WHERE id = ?",
                        [updated.groupId]
                    );
                    if (groupRow) group = formatGroupForClient(groupRow);
                }

                return legacySuccess(formatApiKeyForClient(updated, group));
            }
        }

        if (adminUserKeysMatch !== null && isAdmin) {
            const targetUserId = Number(adminUserKeysMatch[1]);
            if (request.method === "GET") {
                const page = parseOptionalInt(url, "page") ?? 1;
                const pageSize = parseOptionalInt(url, "page_size") ?? 20;
                const result = await repository.list({ userId: targetUserId, page, pageSize });

                const groupIds = [...new Set(result.items.map(k => k.groupId).filter((id): id is number => typeof id === "number"))];
                let groupMap = new Map<number, Record<string, unknown>>();
                if (groupIds.length > 0 && env.DB) {
                    const placeholders = groupIds.map(() => "?").join(",");
                    const groupRows = await allRows<Record<string, unknown>>(
                        env.DB,
                        `SELECT * FROM groups WHERE id IN (${placeholders})`,
                        groupIds
                    );
                    groupMap = new Map(groupRows.map(g => [Number(g.id), formatGroupForClient(g)]));
                }

                return legacySuccess({
                    items: result.items.map(k => formatApiKeyForClient(k, k.groupId ? groupMap.get(k.groupId) : null)),
                    total: result.total,
                    page,
                    page_size: pageSize,
                    pages: Math.ceil(result.total / pageSize)
                });
            }
        }

        if (path === ADMIN_SEARCH_KEYS_PATH && request.method === "GET" && isAdmin) {
            const query = parseQueryString(url, "q") ?? "";
            const userId = parseOptionalInt(url, "user_id");
            if (query.length < 2) {
                return legacyError(400, "Search query must be at least 2 characters", "QUERY_TOO_SHORT");
            }
            const repository = new D1ApiKeyRepository(env.DB);
            let results: { id: number; name: string; userId: number }[];
            if (userId !== undefined) {
                results = await repository.searchByUserId(userId, query);
            } else {
                results = [];
            }
            return legacySuccess(results.map((result) => ({
                id: result.id,
                name: result.name,
                user_id: result.userId,
            })));
        }

        return routerError(404, "route_not_found", "Unknown API key route");
    } catch (error) {
        if (error instanceof AccessAuthError) {
            return middlewareAuthError(401, error.code, error.message);
        }
        if (error instanceof ApiKeyError) {
            return legacyError(error.status, error.message, error.code);
        }
        return legacyInternalError(error instanceof Error ? error.message : "internal server error");
    }
}

function formatGroupForClient(row: Record<string, unknown>): Record<string, unknown> {
    return {
        ...row,
        is_exclusive: Boolean(row.is_exclusive),
        peak_rate_enabled: Boolean(row.peak_rate_enabled),
        allow_image_generation: Boolean(row.allow_image_generation),
        allow_batch_image_generation: Boolean(row.allow_batch_image_generation),
        image_rate_independent: Boolean(row.image_rate_independent),
        video_rate_independent: Boolean(row.video_rate_independent),
        claude_code_only: Boolean(row.claude_code_only),
        model_routing_enabled: Boolean(row.model_routing_enabled),
        mcp_xml_inject: Boolean(row.mcp_xml_inject),
        allow_messages_dispatch: Boolean(row.allow_messages_dispatch),
        require_oauth_only: Boolean(row.require_oauth_only),
        require_privacy_set: Boolean(row.require_privacy_set)
    };
}

function formatApiKeyForClient(key: ApiKeyRecord, group?: Record<string, unknown> | null): Record<string, unknown> {
    return {
        ...key,
        id: key.id,
        user_id: key.userId,
        userId: key.userId,
        key: key.key,
        name: key.name,
        group_id: key.groupId,
        groupId: key.groupId,
        status: key.status,
        ip_whitelist: key.ipWhitelist ?? [],
        ipWhitelist: key.ipWhitelist ?? [],
        ip_blacklist: key.ipBlacklist ?? [],
        ipBlacklist: key.ipBlacklist ?? [],
        last_used_at: key.lastUsedAt,
        lastUsedAt: key.lastUsedAt,
        last_used_ip: null,
        quota: key.quota ?? 0,
        quota_used: key.quotaUsed ?? 0,
        quotaUsed: key.quotaUsed ?? 0,
        expires_at: key.expiresAt,
        expiresAt: key.expiresAt,
        created_at: key.createdAt,
        createdAt: key.createdAt,
        updated_at: key.updatedAt,
        updatedAt: key.updatedAt,
        current_concurrency: 0,
        group: group ?? undefined,
        rate_limit_5h: key.rateLimit5h ?? 0,
        rateLimit5h: key.rateLimit5h ?? 0,
        rate_limit_1d: key.rateLimit1d ?? 0,
        rateLimit1d: key.rateLimit1d ?? 0,
        rate_limit_7d: key.rateLimit7d ?? 0,
        rateLimit7d: key.rateLimit7d ?? 0,
        usage_5h: key.usage5h ?? 0,
        usage5h: key.usage5h ?? 0,
        usage_1d: key.usage1d ?? 0,
        usage1d: key.usage1d ?? 0,
        usage_7d: key.usage7d ?? 0,
        usage7d: key.usage7d ?? 0,
        window_5h_start: key.window5hStart,
        window_1d_start: key.window1dStart,
        window_7d_start: key.window7dStart,
        reset_5h_at: null,
        reset_1d_at: null,
        reset_7d_at: null
    };
}
