import { D1AuthSessionRepository } from "../repositories/auth-sessions.ts";
import { D1AuthUserRepository } from "../repositories/auth-users.ts";
import { D1ChannelRepository } from "../repositories/channels.ts";
import { D1GroupRepository } from "../repositories/groups.ts";
import { AccessAuthError, AccessAuthService } from "../services/access-auth.ts";
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

const CHANNELS_AVAILABLE_PATH = "/api/v1/channels/available";

export interface StagedChannelsUserEnv {
    DB?: D1Database;
    JWT_SECRET?: string;
    JWT_ACCESS_TOKEN_EXPIRES_SECONDS?: string;
    JWT_REFRESH_TOKEN_EXPIRE_DAYS?: string;
}

export interface StagedChannelsUserDependencies {
    clock?: () => number;
}

function boundedIntegerEnv(value: string | undefined, defaultValue: number, min: number, max: number): number {
    if (value === undefined || value.trim() === "") return defaultValue;
    const parsed = Number.parseInt(value.trim(), 10);
    if (!Number.isInteger(parsed)) return defaultValue;
    return Math.min(max, Math.max(min, parsed));
}

async function authenticateUser(
    request: Request,
    env: StagedChannelsUserEnv,
    clock: () => number
): Promise<{ userId: number }> {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) throw new AccessAuthError("UNAUTHORIZED", "Missing authorization header");
    const secret = env.JWT_SECRET?.trim() ?? "";
    if (!secret) throw new AccessAuthError("UNAUTHORIZED", "JWT secret is not configured");

    const users = new D1AuthUserRepository(env.DB!);
    const sessions = new D1AuthSessionRepository(env.DB!);
    const signer = new Hs256JwtSigner(secret, boundedIntegerEnv(env.JWT_ACCESS_TOKEN_EXPIRES_SECONDS, 24 * 60 * 60, 1, 7 * 24 * 60 * 60), clock);
    const verifier = new Hs256JwtVerifier(secret, clock);
    const tokens = new AuthTokenService(sessions, signer, boundedIntegerEnv(env.JWT_REFRESH_TOKEN_EXPIRE_DAYS, 30, 1, 365), clock);
    const auth = new AccessAuthService(users, verifier, tokens, clock);
    const subject = await auth.authenticateAuthorization(authHeader);
    return { userId: subject.user.id };
}

interface UserVisibleGroup {
    id: number;
    name: string;
    platform: string;
    subscriptionType: string;
    subscription_type: string;
    rateMultiplier: number;
    rate_multiplier: number;
    peakRateEnabled: boolean;
    peak_rate_enabled: boolean;
    peakStart: string;
    peak_start: string;
    peakEnd: string;
    peak_end: string;
    peakRateMultiplier: number;
    peak_rate_multiplier: number;
    isExclusive: boolean;
    is_exclusive: boolean;
}

interface UserModelPricing {
    billingMode: string;
    billing_mode: string;
    inputPrice: number | null;
    input_price: number | null;
    outputPrice: number | null;
    output_price: number | null;
    cacheWritePrice: number | null;
    cache_write_price: number | null;
    cacheReadPrice: number | null;
    cache_read_price: number | null;
    imageOutputPrice: number | null;
    image_output_price: number | null;
    perRequestPrice: number | null;
    per_request_price: number | null;
    intervals: Array<{
        minTokens: number;
        min_tokens: number;
        maxTokens: number | null;
        max_tokens: number | null;
        tierLabel: string | null;
        tier_label: string | null;
        inputPrice: number | null;
        input_price: number | null;
        outputPrice: number | null;
        output_price: number | null;
        cacheWritePrice: number | null;
        cache_write_price: number | null;
        cacheReadPrice: number | null;
        cache_read_price: number | null;
        perRequestPrice: number | null;
        per_request_price: number | null;
    }>;
}

interface UserSupportedModel {
    name: string;
    platform: string;
    pricing: UserModelPricing | null;
}

interface UserChannelPlatformSection {
    platform: string;
    groups: UserVisibleGroup[];
    supportedModels: UserSupportedModel[];
    supported_models: UserSupportedModel[];
}

interface UserAvailableChannel {
    name: string;
    description: string;
    platforms: UserChannelPlatformSection[];
}

function toUserGroup(g: { id: number; name: string; platform: string; subscriptionType: string; rateMultiplier: number; peakRateEnabled: boolean; peakStart: string; peakEnd: string; peakRateMultiplier: number; isExclusive: boolean }): UserVisibleGroup {
    return {
        id: g.id,
        name: g.name,
        platform: g.platform,
        subscriptionType: g.subscriptionType,
        subscription_type: g.subscriptionType,
        rateMultiplier: g.rateMultiplier,
        rate_multiplier: g.rateMultiplier,
        peakRateEnabled: g.peakRateEnabled,
        peak_rate_enabled: g.peakRateEnabled,
        peakStart: g.peakStart,
        peak_start: g.peakStart,
        peakEnd: g.peakEnd,
        peak_end: g.peakEnd,
        peakRateMultiplier: g.peakRateMultiplier,
        peak_rate_multiplier: g.peakRateMultiplier,
        isExclusive: g.isExclusive,
        is_exclusive: g.isExclusive,
    };
}

function toUserPricing(p: { billingMode: string; inputPrice: number | null; outputPrice: number | null; cacheWritePrice: number | null; cacheReadPrice: number | null; imageOutputPrice: number | null; perRequestPrice: number | null; intervals: Array<{ minTokens: number; maxTokens: number | null; tierLabel: string | null; inputPrice: number | null; outputPrice: number | null; cacheWritePrice: number | null; cacheReadPrice: number | null; perRequestPrice: number | null }> } | null): UserModelPricing | null {
    if (!p) return null;
    const billingMode = p.billingMode || "token";
    return {
        billingMode,
        billing_mode: billingMode,
        inputPrice: p.inputPrice,
        input_price: p.inputPrice,
        outputPrice: p.outputPrice,
        output_price: p.outputPrice,
        cacheWritePrice: p.cacheWritePrice,
        cache_write_price: p.cacheWritePrice,
        cacheReadPrice: p.cacheReadPrice,
        cache_read_price: p.cacheReadPrice,
        imageOutputPrice: p.imageOutputPrice,
        image_output_price: p.imageOutputPrice,
        perRequestPrice: p.perRequestPrice,
        per_request_price: p.perRequestPrice,
        intervals: (p.intervals || []).map(iv => ({
            minTokens: iv.minTokens,
            min_tokens: iv.minTokens,
            maxTokens: iv.maxTokens,
            max_tokens: iv.maxTokens,
            tierLabel: iv.tierLabel,
            tier_label: iv.tierLabel,
            inputPrice: iv.inputPrice,
            input_price: iv.inputPrice,
            outputPrice: iv.outputPrice,
            output_price: iv.outputPrice,
            cacheWritePrice: iv.cacheWritePrice,
            cache_write_price: iv.cacheWritePrice,
            cacheReadPrice: iv.cacheReadPrice,
            cache_read_price: iv.cacheReadPrice,
            perRequestPrice: iv.perRequestPrice,
            per_request_price: iv.perRequestPrice,
        })),
    };
}

export async function routeStagedChannelsUser(
    request: Request,
    env: StagedChannelsUserEnv,
    dependencies: StagedChannelsUserDependencies = {}
): Promise<Response | null> {
    const url = new URL(request.url);
    const path = url.pathname;
    const clock = dependencies.clock ?? Date.now;

    const isKnownPath = path === CHANNELS_AVAILABLE_PATH;
    if (!isKnownPath) return null;
    if (env.DB === undefined) return routerError(503, "database_not_configured", "Configure the Cloudflare D1 DB binding");

    try {
        const auth = await authenticateUser(request, env, clock);
        const channelRepo = new D1ChannelRepository(env.DB);
        const groupRepo = new D1GroupRepository(env.DB);

        const allGroups = await groupRepo.listActive();
        const groupMap = new Map(allGroups.map(g => [g.id, g]));

        const userAllowedRows = await env.DB.prepare(
            `SELECT group_id FROM user_allowed_groups WHERE user_id = ?`
        ).bind(auth.userId).all() as { results?: Array<{ group_id: number }> };
        const nowIso = new Date(clock()).toISOString();
        const userSubRows = await env.DB.prepare(
            `SELECT group_id FROM user_subscriptions WHERE user_id = ? AND status = 'active' AND deleted_at IS NULL AND expires_at > ?`
        ).bind(auth.userId, nowIso).all() as { results?: Array<{ group_id: number }> };
        const allowedGroupIds = new Set([
            ...(userAllowedRows.results ?? []).map(r => r.group_id),
            ...(userSubRows.results ?? []).map(r => r.group_id)
        ]);

        const userGroups: UserVisibleGroup[] = allGroups
            .filter(g => !g.isExclusive || allowedGroupIds.has(g.id))
            .map(g => toUserGroup(g));

        const allowedGroupIdSet = new Set(userGroups.map(g => g.id));

        const channels = await channelRepo.listAll();
        const out: UserAvailableChannel[] = [];

        for (const ch of channels) {
            if (ch.status !== "active") continue;

            const visibleGroupIds = ch.groupIds.filter(gid => allowedGroupIdSet.has(gid));
            if (visibleGroupIds.length === 0) continue;

            const visibleGroups = visibleGroupIds
                .map(gid => groupMap.get(gid))
                .filter((g): g is NonNullable<typeof g> => g !== undefined)
                .map(g => toUserGroup(g));

            const groupsByPlatform = new Map<string, UserVisibleGroup[]>();
            for (const g of visibleGroups) {
                const list = groupsByPlatform.get(g.platform) ?? [];
                list.push(g);
                groupsByPlatform.set(g.platform, list);
            }

            const platforms = [...groupsByPlatform.keys()].sort();
            const sections: UserChannelPlatformSection[] = [];

            for (const platform of platforms) {
                const platformGroups = groupsByPlatform.get(platform)!;
                const platformPricing = ch.modelPricing.filter(p => p.platform === platform);

                const modelNames = new Set<string>();
                const supportedModels: UserSupportedModel[] = [];

                for (const pricing of platformPricing) {
                    for (const model of pricing.models) {
                        if (modelNames.has(model)) continue;
                        modelNames.add(model);
                        supportedModels.push({
                            name: model,
                            platform,
                            pricing: toUserPricing(pricing),
                        });
                    }
                }

                supportedModels.sort((a, b) => a.name.localeCompare(b.name));

                sections.push({ platform, groups: platformGroups, supportedModels, supported_models: supportedModels });
            }

            out.push({ name: ch.name, description: ch.description, platforms: sections });
        }

        return legacySuccess(out);
    } catch (error: unknown) {
        if (error instanceof AccessAuthError) return middlewareAuthError(401, error.code, error.message);
        return legacyInternalError();
    }
}
