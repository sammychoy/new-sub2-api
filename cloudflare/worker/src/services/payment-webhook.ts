import type { D1Database } from "../types/d1.ts";
import { D1PaymentOrderRepository, type PaymentOrderRecord } from "../repositories/payment-orders.ts";
import { firstRow, runStatement } from "../repositories/d1.ts";

export class PaymentWebhookError extends Error {
    readonly status: number;
    readonly code: string;
    constructor(status: number, code: string, message: string) {
        super(message);
        this.name = "PaymentWebhookError";
        this.status = status;
        this.code = code;
    }
}

interface ProviderRow { config: string; enabled: number; }

export class D1PaymentWebhookService {
    readonly #db: D1Database;
    readonly #orders: D1PaymentOrderRepository;
    constructor(db: D1Database) {
        this.#db = db;
        this.#orders = new D1PaymentOrderRepository(db);
    }

    async handleStripe(rawBody: string, signature: string | null): Promise<{ received: boolean; duplicate?: boolean }> {
        const provider = await firstRow<ProviderRow>(this.#db, "SELECT config, enabled FROM payment_provider_instances WHERE provider_key = 'stripe' ORDER BY sort_order, id LIMIT 1", []);
        if (!provider || provider.enabled !== 1) throw new PaymentWebhookError(503, "PROVIDER_DISABLED", "Stripe provider is not enabled");
        const config = parseObject(provider.config);
        const secret = stringValue(config.webhookSecret, config.webhook_secret);
        const configuredCurrency = stringValue(config.currency).toLowerCase();
        if (!secret) throw new PaymentWebhookError(503, "PROVIDER_MISCONFIGURED", "Stripe webhookSecret is not configured");
        if (!signature || !(await verifyStripeSignature(rawBody, signature, secret))) {
            throw new PaymentWebhookError(400, "INVALID_SIGNATURE", "Invalid Stripe signature");
        }
        let event: Record<string, any>;
        try { event = JSON.parse(rawBody); } catch { throw new PaymentWebhookError(400, "INVALID_PAYLOAD", "Invalid Stripe payload"); }
        const object = event?.data?.object;
        const type = typeof event.type === "string" ? event.type : "";
        if (!object || typeof object !== "object") return { received: true };
        if (type !== "payment_intent.succeeded" && type !== "payment_intent.payment_failed" && type !== "payment_intent.canceled") return { received: true };
        const orderId = stringValue(object.metadata?.order_id, object.metadata?.orderId);
        if (!/^[A-Za-z0-9_-]{1,64}$/.test(orderId)) throw new PaymentWebhookError(400, "ORDER_ID_MISSING", "Stripe metadata.order_id is required");
        const order = await this.#orders.getByOutTradeNo(orderId);
        if (!order) throw new PaymentWebhookError(404, "ORDER_NOT_FOUND", "Payment order not found");
        if (type !== "payment_intent.succeeded") {
            if (order.status === "PENDING") await this.#orders.updateStatus(order.id, "FAILED", { failed_reason: `Stripe event ${type}`, failed_at: new Date().toISOString() });
            return { received: true };
        }
        const eventCurrency = stringValue(object.currency).toLowerCase();
        if (configuredCurrency && eventCurrency && configuredCurrency !== eventCurrency) throw new PaymentWebhookError(400, "CURRENCY_MISMATCH", "Stripe currency does not match the provider configuration");
        const expectedMinor = toMinorUnits(order.payAmount, configuredCurrency || eventCurrency || "usd");
        const actualMinor = Number(object.amount_received ?? object.amount);
        if (!Number.isSafeInteger(actualMinor) || actualMinor !== expectedMinor) throw new PaymentWebhookError(400, "AMOUNT_MISMATCH", "Stripe amount does not match the order");
        const paidAt = new Date().toISOString();
        const changed = await this.#orders.markPaidIfPending(order.id, stringValue(object.id, event.id) || orderId, paidAt);
        if (!changed) return { received: true, duplicate: true };
        await this.#fulfillBalance(order, paidAt);
        return { received: true };
    }

    async handleAirwallex(rawBody: string, timestampHeader: string | null, signatureHeader: string | null): Promise<{ received: boolean; duplicate?: boolean }> {
        const provider = await firstRow<ProviderRow>(this.#db, "SELECT config, enabled FROM payment_provider_instances WHERE provider_key = 'airwallex' ORDER BY sort_order, id LIMIT 1", []);
        if (!provider || provider.enabled !== 1) throw new PaymentWebhookError(503, "PROVIDER_DISABLED", "Airwallex provider is not enabled");
        const config = parseObject(provider.config);
        const secret = stringValue(config.webhookSecret, config.webhook_secret);
        if (!secret || !timestampHeader || !signatureHeader || !(await verifyAirwallexSignature(rawBody, timestampHeader, signatureHeader, secret))) throw new PaymentWebhookError(400, "INVALID_SIGNATURE", "Invalid Airwallex signature");
        const timestamp = Number(timestampHeader);
        if (!Number.isFinite(timestamp) || Math.abs(Date.now() - timestamp) > 5 * 60 * 1000) throw new PaymentWebhookError(400, "INVALID_SIGNATURE", "Airwallex timestamp is outside the allowed window");
        let event: Record<string, any>;
        try { event = JSON.parse(rawBody); } catch { throw new PaymentWebhookError(400, "INVALID_PAYLOAD", "Invalid Airwallex payload"); }
        const name = stringValue(event.name);
        if (name !== "payment_intent.succeeded" && name !== "payment_intent.cancelled") return { received: true };
        const object = event.data?.object;
        const orderId = stringValue(object?.merchant_order_id, object?.metadata?.order_id);
        const order = await this.#orders.getByOutTradeNo(orderId);
        if (!order) throw new PaymentWebhookError(404, "ORDER_NOT_FOUND", "Payment order not found");
        if (name === "payment_intent.cancelled") {
            if (order.status === "PENDING") await this.#orders.updateStatus(order.id, "FAILED", { failed_reason: "Airwallex payment cancelled", failed_at: new Date().toISOString() });
            return { received: true };
        }
        if (Math.abs(Number(object?.amount) - order.payAmount) > 0.000001) throw new PaymentWebhookError(400, "AMOUNT_MISMATCH", "Airwallex amount does not match the order");
        const paidAt = new Date().toISOString();
        const changed = await this.#orders.markPaidIfPending(order.id, stringValue(object?.id, event.id) || orderId, paidAt);
        if (!changed) return { received: true, duplicate: true };
        await this.#fulfillBalance(order, paidAt);
        return { received: true };
    }

    async #fulfillBalance(order: PaymentOrderRecord, timestamp: string): Promise<void> {
        if (order.orderType === "subscription") {
            let groupId = order.subscriptionGroupId;
            let validityDays = order.subscriptionDays;
            if ((!groupId || !validityDays) && order.planId) {
                const plan = await firstRow<{ group_id: number; validity_days: number }>(
                    this.#db,
                    "SELECT group_id, validity_days FROM subscription_plans WHERE id = ? LIMIT 1",
                    [order.planId]
                );
                if (plan) {
                    groupId = groupId ?? plan.group_id;
                    validityDays = validityDays ?? plan.validity_days;
                }
            }
            if (!groupId) {
                await this.#orders.writeAuditLog(String(order.id), "ORDER_PAID", "Payment verified; subscription fulfillment requires plan mapping", "webhook");
                return;
            }
            const days = validityDays && validityDays > 0 ? validityDays : 30;
            const existingSub = await firstRow<{ id: number; expires_at: string }>(
                this.#db,
                "SELECT id, expires_at FROM user_subscriptions WHERE user_id = ? AND group_id = ? AND deleted_at IS NULL AND status = 'active' AND expires_at > ? ORDER BY expires_at DESC LIMIT 1",
                [order.userId, groupId, timestamp]
            );
            if (existingSub) {
                const baseMs = Math.max(Date.parse(existingSub.expires_at), Date.parse(timestamp));
                const newExpiresAt = new Date(baseMs + days * 86400000).toISOString();
                await runStatement(
                    this.#db,
                    "UPDATE user_subscriptions SET expires_at = ?, updated_at = ? WHERE id = ?",
                    [newExpiresAt, timestamp, existingSub.id]
                );
            } else {
                const expiresAt = new Date(Date.parse(timestamp) + days * 86400000).toISOString();
                await runStatement(
                    this.#db,
                    `INSERT INTO user_subscriptions (user_id, group_id, starts_at, expires_at, status, daily_window_start, weekly_window_start, monthly_window_start, daily_usage_usd, weekly_usage_usd, monthly_usage_usd, assigned_at, assigned_by, notes, created_at, updated_at) VALUES (?, ?, ?, ?, 'active', ?, ?, ?, 0, 0, 0, ?, NULL, ?, ?, ?)`,
                    [order.userId, groupId, timestamp, expiresAt, timestamp, timestamp, timestamp, timestamp, `Order ${order.outTradeNo}`, timestamp, timestamp]
                );
            }
            await this.#orders.writeAuditLog(String(order.id), "ORDER_FULFILLED", `Subscription fulfilled: group ${groupId} for ${days} days`, "webhook");
            return;
        }
        const multRow = await firstRow<{ value: string }>(
            this.#db,
            "SELECT value FROM settings WHERE key = 'payment_balance_recharge_multiplier' LIMIT 1",
            []
        );
        const parsedMult = multRow ? Number.parseFloat(multRow.value) : 1;
        const multiplier = Number.isFinite(parsedMult) && parsedMult > 0 ? parsedMult : 1;
        const creditAmount = Math.round(order.amount * multiplier * 100) / 100;
        await runStatement(this.#db, "UPDATE users SET balance = balance + ?, updated_at = ? WHERE id = ?", [creditAmount, timestamp, order.userId]);
        await this.#orders.writeAuditLog(String(order.id), "ORDER_FULFILLED", `Balance credited: ${creditAmount}`, "webhook");
    }
}

async function verifyStripeSignature(payload: string, header: string, secret: string): Promise<boolean> {
    let timestamp = "";
    const v1Signatures: string[] = [];
    for (const part of header.split(",")) {
        const eqIdx = part.indexOf("=");
        if (eqIdx === -1) continue;
        const k = part.slice(0, eqIdx).trim();
        const v = part.slice(eqIdx + 1).trim();
        if (k === "t" && !timestamp) timestamp = v;
        else if (k === "v1" && v) v1Signatures.push(v);
    }
    if (!timestamp || v1Signatures.length === 0 || !/^\d+$/.test(timestamp)) return false;
    const age = Math.abs(Date.now() - Number(timestamp) * 1000);
    if (!Number.isFinite(age) || age > 5 * 60 * 1000) return false;
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${payload}`)));
    const expected = [...digest].map((value) => value.toString(16).padStart(2, "0")).join("");
    return v1Signatures.some((provided) => timingSafeEqual(expected, provided));
}

async function verifyAirwallexSignature(payload: string, timestamp: string, signature: string, secret: string): Promise<boolean> {
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}${payload}`)));
    const expected = [...digest].map((value) => value.toString(16).padStart(2, "0")).join("");
    return timingSafeEqual(expected, signature.trim().toLowerCase());
}

function timingSafeEqual(left: string, right: string): boolean {
    if (left.length !== right.length) return false;
    let difference = 0;
    for (let index = 0; index < left.length; index++) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
    return difference === 0;
}

function parseObject(value: string): Record<string, any> {
    try { const parsed = JSON.parse(value); return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {}; } catch { return {}; }
}

function stringValue(...values: unknown[]): string {
    for (const value of values) if (typeof value === "string" && value.trim()) return value.trim();
    return "";
}

function toMinorUnits(amount: number, currency: string): number {
    const zeroDecimalCurrencies = new Set(["bif", "clp", "djf", "gnf", "isk", "jpy", "kmf", "krw", "pyg", "rwf", "ugx", "vnd", "vuv", "xaf", "xof", "xpf"]);
    return Math.round(amount * (zeroDecimalCurrencies.has(currency) ? 1 : 100));
}
