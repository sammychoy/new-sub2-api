import { D1AccountRepository } from "../repositories/accounts.ts";
import { D1AuthSessionRepository } from "../repositories/auth-sessions.ts";
import { D1AuthUserRepository } from "../repositories/auth-users.ts";
import { D1ProxyRepository } from "../repositories/proxies.ts";
import { AccessAuthError, AccessAuthService } from "../services/access-auth.ts";
import { AuthTokenService } from "../services/auth-tokens.ts";
import { DeepSeekWebService, DEEPSEEK_SUPPORTED_MODELS } from "../services/deepseek-web.ts";
import { Hs256JwtSigner, Hs256JwtVerifier } from "../services/jwt.ts";
import type { D1Database } from "../types/d1.ts";
import { firstRow } from "../repositories/d1.ts";
import {
    legacyError,
    legacySuccess,
    middlewareAuthError,
    routerError,
} from "./responses.ts";

export interface StagedAdminDeepSeekWebEnv {
    DB?: D1Database;
    JWT_SECRET?: string;
    JWT_ACCESS_TOKEN_EXPIRES_SECONDS?: string;
    JWT_REFRESH_TOKEN_EXPIRE_DAYS?: string;
}

const BASE_PATH = "/api/v1/admin/deepseek/web";

async function authenticateAdminOrKey(
    request: Request,
    env: StagedAdminDeepSeekWebEnv,
    clock: () => number
): Promise<{ userId: number; role: string }> {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) throw new AccessAuthError("UNAUTHORIZED", "Missing authorization header");

    const token = authHeader.replace(/^Bearer\s+/i, "").trim();

    // 1. Try JWT
    try {
        const secret = env.JWT_SECRET?.trim() ?? "";
        if (secret && env.DB) {
            const users = new D1AuthUserRepository(env.DB);
            const sessions = new D1AuthSessionRepository(env.DB);
            const verifier = new Hs256JwtVerifier(secret, clock);
            const signer = new Hs256JwtSigner(secret, 86400, clock);
            const tokens = new AuthTokenService(sessions, signer, 30, clock);
            const auth = new AccessAuthService(users, verifier, tokens, clock);
            const subject = await auth.authenticateAuthorization(authHeader);
            if (subject.user.role === "admin") {
                return { userId: subject.user.id, role: subject.user.role };
            }
        }
    } catch {
        // Fall through to API key check
    }

    // 2. Try API key check in api_keys
    if (env.DB && token) {
        const keyRow = await firstRow<{ id: number; user_id: number; role: string }>(env.DB, `
            SELECT k.id, k.user_id, u.role
            FROM api_keys k
            JOIN users u ON u.id = k.user_id AND u.deleted_at IS NULL
            WHERE k.key = ? AND k.deleted_at IS NULL AND k.status = 'active'
            LIMIT 1
        `, [token]);
        if (keyRow && keyRow.role === "admin") {
            return { userId: keyRow.user_id, role: keyRow.role };
        }
    }

    throw new AccessAuthError("UNAUTHORIZED", "Admin authorization required");
}

export function isDeepSeekWebPath(pathname: string): boolean {
    return pathname.startsWith(BASE_PATH);
}

export async function routeStagedAdminDeepSeekWeb(
    request: Request,
    env: StagedAdminDeepSeekWebEnv,
    clock: () => number = Date.now
): Promise<Response | null> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    if (!isDeepSeekWebPath(pathname)) return null;
    if (!env.DB) return routerError(503, "database_not_configured", "Database binding is not configured");

    try {
        await authenticateAdminOrKey(request, env, clock);
    } catch (error) {
        if (error instanceof AccessAuthError) return middlewareAuthError(error.status, error.code, error.message);
        return routerError(401, "unauthorized", "Unauthorized");
    }

    // Route: GET /api/v1/admin/deepseek/web/models
    if (pathname === `${BASE_PATH}/models` && request.method === "GET") {
        return legacySuccess({ models: DEEPSEEK_SUPPORTED_MODELS });
    }

    // Route: POST /api/v1/admin/deepseek/web/validate
    if (pathname === `${BASE_PATH}/validate` && request.method === "POST") {
        let body: { token?: string; deepseek_token?: string; user_token?: string; proxy_id?: number };
        try {
            body = await request.json();
        } catch {
            return routerError(400, "invalid_json", "Invalid JSON request body");
        }

        const rawToken = body.token || body.deepseek_token || body.user_token;
        const cleanToken = DeepSeekWebService.cleanToken(rawToken);

        if (!cleanToken) {
            return routerError(400, "missing_token", "DeepSeek user token is required");
        }

        let proxyUrl = "";
        if (body.proxy_id && env.DB) {
            const proxyRepo = new D1ProxyRepository(env.DB);
            const proxy = await proxyRepo.findById(body.proxy_id);
            if (proxy) {
                const auth = proxy.username && proxy.password ? `${encodeURIComponent(proxy.username)}:${encodeURIComponent(proxy.password)}@` : "";
                proxyUrl = `${proxy.protocol}://${auth}${proxy.host}:${proxy.port}`;
            }
        }

        const validation = await DeepSeekWebService.validateSession(cleanToken, proxyUrl);
        if (!validation.valid) {
            return legacyError(400, validation.error || "DeepSeek Web validation failed");
        }

        return legacySuccess({
            valid: true,
            models: validation.models,
            session_id: validation.sessionId,
            user_id: validation.userId,
            email: validation.email,
            name: validation.name,
            user: {
                user_id: validation.userId,
                email: validation.email,
                name: validation.name,
            },
        });
    }

    // Route: POST /api/v1/admin/deepseek/web/quick-sync
    if (pathname === `${BASE_PATH}/quick-sync` && request.method === "POST") {
        let body: {
            name?: string;
            token?: string;
            deepseek_token?: string;
            user_token?: string;
            proxy_id?: number;
            group_ids?: number[];
        };
        try {
            body = await request.json();
        } catch {
            return routerError(400, "invalid_json", "Invalid JSON body");
        }

        const rawToken = body.token || body.deepseek_token || body.user_token;
        const cleanToken = DeepSeekWebService.cleanToken(rawToken);

        if (!cleanToken) {
            return routerError(400, "missing_token", "DeepSeek user token is required");
        }

        let proxyUrl = "";
        if (body.proxy_id && env.DB) {
            const proxyRepo = new D1ProxyRepository(env.DB);
            const proxy = await proxyRepo.findById(body.proxy_id);
            if (proxy) {
                const auth = proxy.username && proxy.password ? `${encodeURIComponent(proxy.username)}:${encodeURIComponent(proxy.password)}@` : "";
                proxyUrl = `${proxy.protocol}://${auth}${proxy.host}:${proxy.port}`;
            }
        }

        const validation = await DeepSeekWebService.validateSession(cleanToken, proxyUrl);
        if (!validation.valid) {
            return legacyError(400, validation.error || "Token validation failed");
        }

        const credentials = {
            auth_type: "deepseek_web",
            deepseek_token: cleanToken,
            token: cleanToken,
            proxy_id: body.proxy_id || null,
            updated_at: new Date().toISOString(),
        };

        const accountRepo = new D1AccountRepository(env.DB);
        const account = await accountRepo.create({
            name: body.name || `DeepSeek Web Account (${validation.models[0] || "Default"})`,
            platform: "deepseek",
            type: "deepseek_web",
            credentials: JSON.stringify(credentials),
            extra: JSON.stringify({
                auth_provider: "deepseek_web",
                models: validation.models,
            }),
            proxy_id: body.proxy_id ?? null,
            concurrency: 3,
            priority: 50,
            rate_multiplier: 1.0,
            auto_pause_on_expired: 1,
        });

        if (body.group_ids && body.group_ids.length > 0) {
            await accountRepo.setGroups(account.id, body.group_ids);
        }

        return legacySuccess({
            success: true,
            account_id: account.id,
            name: account.name,
            models: validation.models,
        });
    }

    return routerError(404, "not_found", "DeepSeek Web endpoint not found");
}
