import { D1AccountRepository } from "../repositories/accounts.ts";
import { D1AuthSessionRepository } from "../repositories/auth-sessions.ts";
import { D1AuthUserRepository } from "../repositories/auth-users.ts";
import { D1ProxyRepository } from "../repositories/proxies.ts";
import { AccessAuthError, AccessAuthService } from "../services/access-auth.ts";
import { AuthTokenService } from "../services/auth-tokens.ts";
import { GeminiWebService } from "../services/gemini-web.ts";
import { Hs256JwtSigner, Hs256JwtVerifier } from "../services/jwt.ts";
import type { D1Database } from "../types/d1.ts";
import { firstRow } from "../repositories/d1.ts";
import {
    legacyError,
    legacyInternalError,
    legacySuccess,
    middlewareAuthError,
    routerError,
} from "./responses.ts";

export interface StagedAdminGeminiWebEnv {
    DB?: D1Database;
    JWT_SECRET?: string;
    JWT_ACCESS_TOKEN_EXPIRES_SECONDS?: string;
    JWT_REFRESH_TOKEN_EXPIRE_DAYS?: string;
}

const BASE_PATH = "/api/v1/admin/gemini/web";

function boundedIntegerEnv(value: string | undefined, defaultValue: number, min: number, max: number): number {
    if (value === undefined || value.trim() === "") return defaultValue;
    const parsed = Number.parseInt(value.trim(), 10);
    if (!Number.isInteger(parsed)) return defaultValue;
    return Math.min(max, Math.max(min, parsed));
}

async function authenticateAdminOrKey(
    request: Request,
    env: StagedAdminGeminiWebEnv,
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

export function isGeminiWebPath(pathname: string): boolean {
    return pathname.startsWith(BASE_PATH);
}

export async function routeStagedAdminGeminiWeb(
    request: Request,
    env: StagedAdminGeminiWebEnv,
    clock: () => number = Date.now
): Promise<Response | null> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    if (!isGeminiWebPath(pathname)) return null;
    if (!env.DB) return routerError(503, "database_not_configured", "Database binding is not configured");

    try {
        await authenticateAdminOrKey(request, env, clock);
    } catch (error) {
        if (error instanceof AccessAuthError) return middlewareAuthError(error.status, error.code, error.message);
        return routerError(401, "unauthorized", "Unauthorized");
    }

    // Route: POST /api/v1/admin/gemini/web/validate
    if (pathname === `${BASE_PATH}/validate` && request.method === "POST") {
        let body: { secure_1psid?: string; secure_1psidts?: string; proxy_id?: number };
        try {
            body = await request.json();
        } catch {
            return routerError(400, "invalid_json", "Invalid JSON request body");
        }

        const psid = GeminiWebService.cleanCookie(body.secure_1psid);
        const psidts = GeminiWebService.cleanCookie(body.secure_1psidts);

        if (!psid) {
            return routerError(400, "missing_psid", "__Secure-1PSID is required");
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

        try {
            const session = await GeminiWebService.initSession({
                secure_1psid: psid,
                secure_1psidts: psidts,
            }, proxyUrl);

            return legacySuccess({
                valid: true,
                models: session.models,
                at: session.at,
                session_id: session.sessionID,
                build_label: session.buildLabel,
                push_id: session.pushID,
                language: session.language,
                cookie_header: session.cookieHeader,
                new_psidts: session.newPSIDTS || psidts,
            });
        } catch (err) {
            return legacyError(400, err instanceof Error ? err.message : "Validation failed");
        }
    }

    // Route: POST /api/v1/admin/gemini/web/quick-sync (for extension & fast connect)
    if (pathname === `${BASE_PATH}/quick-sync` && request.method === "POST") {
        let body: {
            name?: string;
            secure_1psid?: string;
            secure_1psidts?: string;
            proxy_id?: number;
            group_ids?: number[];
            oauth_type?: string;
            tier_id?: string;
        };
        try {
            body = await request.json();
        } catch {
            return routerError(400, "invalid_json", "Invalid JSON body");
        }

        const psid = GeminiWebService.cleanCookie(body.secure_1psid);
        const psidts = GeminiWebService.cleanCookie(body.secure_1psidts);

        if (!psid) {
            return routerError(400, "missing_psid", "__Secure-1PSID is required");
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

        try {
            const session = await GeminiWebService.initSession({
                secure_1psid: psid,
                secure_1psidts: psidts,
            }, proxyUrl);

            const effectivePSIDTS = session.newPSIDTS || psidts;
            const credentials = {
                auth_type: "gemini_web",
                secure_1psid: psid,
                secure_1psidts: effectivePSIDTS,
                oauth_type: body.oauth_type || "google_one",
                tier_id: body.tier_id || (body.oauth_type === "gemini_education" ? "gemini_education" : "google_one_free"),
                at: session.at,
                cookie_header: session.cookieHeader,
                push_id: session.pushID,
                build_label: session.buildLabel,
                session_id: session.sessionID,
                language: session.language,
                cached_models: session.models,
                proxy_id: body.proxy_id || null,
                updated_at: new Date().toISOString(),
            };

            const accountRepo = new D1AccountRepository(env.DB);
            const account = await accountRepo.create({
                name: body.name || `Gemini Web Account (${session.models[0] || "Default"})`,
                platform: "gemini",
                type: "web_cookie",
                credentials: JSON.stringify(credentials),
                extra: JSON.stringify({
                    auth_provider: "gemini_web",
                    last_rotated_at: new Date().toISOString(),
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
                models: session.models,
            });
        } catch (err) {
            return legacyError(400, err instanceof Error ? err.message : "Sync failed");
        }
    }

    // Route: POST /api/v1/admin/gemini/web/accounts/:id/rotate
    const rotateMatch = /^\/api\/v1\/admin\/gemini\/web\/accounts\/(\d+)\/rotate$/.exec(pathname);
    if (rotateMatch && request.method === "POST") {
        const accountId = Number(rotateMatch[1]);
        const accountRepo = new D1AccountRepository(env.DB);
        const account = await accountRepo.getById(accountId);

        if (!account) return routerError(404, "not_found", "Account not found");

        let creds: Record<string, unknown> = {};
        try {
            creds = JSON.parse(account.credentials);
        } catch {
            return routerError(400, "invalid_credentials", "Account credentials JSON invalid");
        }

        let proxyUrl = "";
        if (account.proxyId && env.DB) {
            const proxyRepo = new D1ProxyRepository(env.DB);
            const proxy = await proxyRepo.findById(account.proxyId);
            if (proxy) {
                const auth = proxy.username && proxy.password ? `${encodeURIComponent(proxy.username)}:${encodeURIComponent(proxy.password)}@` : "";
                proxyUrl = `${proxy.protocol}://${auth}${proxy.host}:${proxy.port}`;
            }
        }

        const rotResult = await GeminiWebService.rotateCookies({
            secure_1psid: String(creds.secure_1psid || ""),
            secure_1psidts: String(creds.secure_1psidts || "")
        }, proxyUrl);

        if (rotResult.newPSIDTS) {
            creds.secure_1psidts = rotResult.newPSIDTS;
            creds.updated_at = new Date().toISOString();
            await accountRepo.update(accountId, { credentials: JSON.stringify(creds) });
            return legacySuccess({ success: true, rotated: true, updated_at: creds.updated_at });
        }

        return legacySuccess({ success: true, rotated: false, message: "Cookie is still valid" });
    }

    return routerError(404, "not_found", "Gemini Web endpoint not found");
}
