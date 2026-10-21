import type { D1Database } from "../types/d1.ts";
import { firstRow, runStatement } from "../repositories/d1.ts";
import { D1PaymentOrderRepository, type PaymentOrderRecord, type PaymentAuditLogRecord } from "../repositories/payment-orders.ts";

export class PaymentOrderError extends Error {
    status: number;
    code: string;
    constructor(status: number, message: string, code: string) {
        super(message);
        this.name = "PaymentOrderError";
        this.status = status;
        this.code = code;
    }
}

function errNotFound(): PaymentOrderError {
    return new PaymentOrderError(404, "Payment order not found", "ORDER_NOT_FOUND");
}

function errBadRequest(msg: string): PaymentOrderError {
    return new PaymentOrderError(400, msg, "BAD_REQUEST");
}

export class D1PaymentOrderService {
    private db: D1Database;
    private repo: D1PaymentOrderRepository;
    constructor(db: D1Database) {
        this.db = db;
        this.repo = new D1PaymentOrderRepository(db);
    }

    async list(params: {
        page: number; pageSize: number;
        userId?: number; status?: string; orderType?: string;
        paymentType?: string; keyword?: string;
    }): Promise<{ items: PaymentOrderRecord[]; total: number }> {
        return this.repo.list(params);
    }

    async getById(id: number): Promise<{ order: PaymentOrderRecord; auditLogs: PaymentAuditLogRecord[] }> {
        const order = await this.repo.getById(id);
        if (!order) throw errNotFound();
        const auditLogs = await this.repo.getAuditLogs(String(id));
        return { order, auditLogs };
    }

    async cancelOrder(id: number): Promise<string> {
        const order = await this.repo.getById(id);
        if (!order) throw errNotFound();
        if (order.status !== "PENDING") throw errBadRequest("Only pending orders can be cancelled");
        await this.repo.updateStatus(id, "CANCELLED", { failed_reason: "Cancelled by admin" });
        return "Order cancelled successfully";
    }

    async retryFulfillment(id: number): Promise<void> {
        const order = await this.repo.getById(id);
        if (!order) throw errNotFound();
        if (order.status !== "PAID") throw errBadRequest("Only paid orders can be retried");
        const logs = await this.repo.getAuditLogs(String(id));
        const alreadyFulfilled = logs.some(l => l.action === "ORDER_FULFILLED");
        const timestamp = new Date().toISOString();
        if (!alreadyFulfilled) {
            if (order.orderType === "subscription") {
                let groupId = order.subscriptionGroupId;
                let validityDays = order.subscriptionDays;
                if ((!groupId || !validityDays) && order.planId) {
                    const plan = await firstRow<{ group_id: number; validity_days: number }>(
                        this.db,
                        "SELECT group_id, validity_days FROM subscription_plans WHERE id = ? LIMIT 1",
                        [order.planId]
                    );
                    if (plan) {
                        groupId = groupId ?? plan.group_id;
                        validityDays = validityDays ?? plan.validity_days;
                    }
                }
                if (groupId) {
                    const days = validityDays && validityDays > 0 ? validityDays : 30;
                    const existingSub = await firstRow<{ id: number; expires_at: string }>(
                        this.db,
                        "SELECT id, expires_at FROM user_subscriptions WHERE user_id = ? AND group_id = ? AND deleted_at IS NULL AND status = 'active' AND expires_at > ? ORDER BY expires_at DESC LIMIT 1",
                        [order.userId, groupId, timestamp]
                    );
                    if (existingSub) {
                        const baseMs = Math.max(Date.parse(existingSub.expires_at), Date.parse(timestamp));
                        const newExpiresAt = new Date(baseMs + days * 86400000).toISOString();
                        await runStatement(this.db, "UPDATE user_subscriptions SET expires_at = ?, updated_at = ? WHERE id = ?", [newExpiresAt, timestamp, existingSub.id]);
                    } else {
                        const expiresAt = new Date(Date.parse(timestamp) + days * 86400000).toISOString();
                        await runStatement(
                            this.db,
                            `INSERT INTO user_subscriptions (user_id, group_id, starts_at, expires_at, status, daily_window_start, weekly_window_start, monthly_window_start, daily_usage_usd, weekly_usage_usd, monthly_usage_usd, assigned_at, assigned_by, notes, created_at, updated_at) VALUES (?, ?, ?, ?, 'active', ?, ?, ?, 0, 0, 0, ?, NULL, ?, ?, ?)`,
                            [order.userId, groupId, timestamp, expiresAt, timestamp, timestamp, timestamp, timestamp, `Order ${order.outTradeNo}`, timestamp, timestamp]
                        );
                    }
                    await this.repo.writeAuditLog(String(order.id), "ORDER_FULFILLED", `Subscription fulfilled: group ${groupId} for ${days} days`, "admin");
                }
            } else {
                const multRow = await firstRow<{ value: string }>(
                    this.db,
                    "SELECT value FROM settings WHERE key = 'payment_balance_recharge_multiplier' LIMIT 1",
                    []
                );
                const parsedMult = multRow ? Number.parseFloat(multRow.value) : 1;
                const multiplier = Number.isFinite(parsedMult) && parsedMult > 0 ? parsedMult : 1;
                const creditAmount = Math.round(order.amount * multiplier * 100) / 100;
                await runStatement(this.db, "UPDATE users SET balance = balance + ?, updated_at = ? WHERE id = ?", [creditAmount, timestamp, order.userId]);
                await this.repo.writeAuditLog(String(order.id), "ORDER_FULFILLED", `Balance credited: ${creditAmount}`, "admin");
            }
        }
        await this.repo.updateStatus(id, "PROCESSING");
    }
}
