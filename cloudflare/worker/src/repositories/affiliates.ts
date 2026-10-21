import type { D1Database, D1Value } from "../types/d1.ts";
import { allRows, firstRow, runStatement } from "./d1.ts";

export interface AffiliateUserRecord {
    userId: number;
    user_id?: number;
    email: string;
    username: string;
    affCode: string;
    aff_code?: string;
    affCodeCustom: boolean;
    aff_code_custom?: boolean;
    affRebateRatePercent: number | null;
    aff_rebate_rate_percent?: number | null;
    affCount: number;
    aff_count?: number;
}

export interface AffiliateUserLookup {
    id: number;
    email: string;
    username: string;
}

export interface AffiliateUserOverview {
    userId: number;
    user_id?: number;
    email: string;
    username: string;
    affCode: string;
    aff_code?: string;
    rebateRatePercent: number;
    rebate_rate_percent?: number;
    invitedCount: number;
    invited_count?: number;
    rebatedInviteeCount: number;
    rebated_invitee_count?: number;
    availableQuota: number;
    available_quota?: number;
    historyQuota: number;
    history_quota?: number;
}

export interface AffiliateInviteRecord {
    inviterId: number;
    inviter_id?: number;
    inviterEmail: string;
    inviter_email?: string;
    inviterUsername: string;
    inviter_username?: string;
    inviteeId: number;
    invitee_id?: number;
    inviteeEmail: string;
    invitee_email?: string;
    inviteeUsername: string;
    invitee_username?: string;
    affCode: string;
    aff_code?: string;
    totalRebate: number;
    total_rebate?: number;
    createdAt: string;
    created_at?: string;
}

export interface AffiliateRebateRecord {
    orderId: number;
    order_id?: number;
    outTradeNo: string;
    out_trade_no?: string;
    inviterId: number;
    inviter_id?: number;
    inviterEmail: string;
    inviter_email?: string;
    inviterUsername: string;
    inviter_username?: string;
    inviteeId: number;
    invitee_id?: number;
    inviteeEmail: string;
    invitee_email?: string;
    inviteeUsername: string;
    invitee_username?: string;
    orderAmount: number;
    order_amount?: number;
    payAmount: number;
    pay_amount?: number;
    rebateAmount: number;
    rebate_amount?: number;
    paymentType: string;
    payment_type?: string;
    orderStatus: string;
    order_status?: string;
    createdAt: string;
    created_at?: string;
}

export interface AffiliateTransferRecord {
    ledgerId: number;
    ledger_id?: number;
    userId: number;
    user_id?: number;
    userEmail: string;
    user_email?: string;
    username: string;
    amount: number;
    balanceAfter: number | null;
    balance_after?: number | null;
    availableQuotaAfter: number | null;
    available_quota_after?: number | null;
    frozenQuotaAfter: number | null;
    frozen_quota_after?: number | null;
    historyQuotaAfter: number | null;
    history_quota_after?: number | null;
    snapshotAvailable: boolean;
    snapshot_available?: boolean;
    createdAt: string;
    created_at?: string;
}

export interface AffiliateAdminFilter {
    search?: string;
    page?: number;
    pageSize?: number;
}

export interface AffiliateRecordFilter {
    search?: string;
    page?: number;
    pageSize?: number;
    startAt?: string;
    endAt?: string;
    sortBy?: string;
    sortOrder?: string;
}

const INVITE_SORT_MAP: Record<string, string> = {
    inviter: "inviter.email",
    invitee: "invitee.email",
    aff_code: "inviter_aff.aff_code",
    total_rebate: "total_rebate",
    created_at: "ua.created_at",
};

const REBATE_SORT_MAP: Record<string, string> = {
    order: "po.id",
    inviter: "inviter.email",
    invitee: "invitee.email",
    order_amount: "po.amount",
    pay_amount: "po.pay_amount",
    rebate_amount: "ual.amount",
    payment_type: "po.payment_type",
    order_status: "po.status",
    created_at: "ual.created_at",
};

const TRANSFER_SORT_MAP: Record<string, string> = {
    user: "u.email",
    amount: "ual.amount",
    balance_after: "ual.balance_after",
    available_quota_after: "ual.aff_quota_after",
    frozen_quota_after: "ual.aff_frozen_quota_after",
    history_quota_after: "ual.aff_history_quota_after",
    created_at: "ual.created_at",
};

function placeholders(n: number): string {
    return Array.from({ length: n }, () => "?").join(",");
}

export class D1AffiliateRepository {
    readonly #db: D1Database;

    constructor(db: D1Database) {
        this.#db = db;
    }

    async listUsersWithCustomSettings(filter: AffiliateAdminFilter): Promise<{ items: AffiliateUserRecord[]; total: number }> {
        const page = Math.max(1, filter.page ?? 1);
        const pageSize = Math.min(200, Math.max(1, filter.pageSize ?? 20));
        const offset = (page - 1) * pageSize;
        const search = filter.search?.trim();

        const whereClauses = ["(ua.aff_code_custom = 1 OR ua.aff_rebate_rate_percent IS NOT NULL)"];
        const values: D1Value[] = [];

        if (search) {
            values.push(`%${search}%`);
            whereClauses.push("(u.email LIKE ? OR u.username LIKE ?)");
            values.push(`%${search}%`);
        }

        const whereSql = whereClauses.join(" AND ");

        const countRow = await firstRow<{ cnt: number }>(
            this.#db,
            `SELECT COUNT(*) as cnt FROM user_affiliates ua JOIN users u ON u.id = ua.user_id WHERE ${whereSql}`,
            values
        );
        const total = countRow?.cnt ?? 0;

        const rows = await allRows<{ user_id: number; email: string; username: string; aff_code: string; aff_code_custom: number; aff_rebate_rate_percent: number | null; aff_count: number }>(
            this.#db,
            `SELECT ua.user_id, COALESCE(u.email, '') as email, COALESCE(u.username, '') as username,
                    ua.aff_code, ua.aff_code_custom, ua.aff_rebate_rate_percent, ua.aff_count
             FROM user_affiliates ua JOIN users u ON u.id = ua.user_id
             WHERE ${whereSql}
             ORDER BY ua.updated_at DESC
             LIMIT ? OFFSET ?`,
            [...values, pageSize, offset]
        );

        return {
            items: rows.map((r) => ({
                userId: r.user_id,
                user_id: r.user_id,
                email: r.email,
                username: r.username,
                affCode: r.aff_code,
                aff_code: r.aff_code,
                affCodeCustom: r.aff_code_custom === 1,
                aff_code_custom: r.aff_code_custom === 1,
                affRebateRatePercent: r.aff_rebate_rate_percent,
                aff_rebate_rate_percent: r.aff_rebate_rate_percent,
                affCount: r.aff_count,
                aff_count: r.aff_count,
            })),
            total,
        };
    }

    async lookupUsers(keyword: string): Promise<AffiliateUserLookup[]> {
        if (!keyword || !keyword.trim()) return [];
        const search = keyword.trim();
        const rows = await allRows<{ id: number; email: string; username: string }>(
            this.#db,
            `SELECT id, COALESCE(email, '') as email, COALESCE(username, '') as username
             FROM users WHERE email LIKE ? OR username LIKE ? LIMIT 20`,
            [`%${search}%`, `%${search}%`]
        );
        return rows;
    }

    private async getDefaultRebateRate(): Promise<number> {
        const rows = await allRows<{ key: string; value: string }>(
            this.#db,
            `SELECT key, value FROM settings WHERE key IN ('affiliate_rebate_rate', 'commission_rate')`
        );
        const map = new Map(rows.map((r) => [r.key, r.value]));
        const raw = map.get("affiliate_rebate_rate") ?? map.get("commission_rate");
        if (raw !== undefined) {
            const parsed = Number.parseFloat(raw.trim());
            if (Number.isFinite(parsed)) {
                return Math.min(100, Math.max(0, parsed));
            }
        }
        return 0;
    }

    async getOrCreateUserAffiliate(userId: number): Promise<{ affCode: string; affQuota: number; affFrozenQuota: number; affHistoryQuota: number; affCount: number; inviterId: number | null }> {
        return this.ensureUserAffiliate(userId);
    }

    async getUserOverview(userId: number): Promise<AffiliateUserOverview | null> {
        const row = await firstRow<{
            user_id: number; email: string; username: string; aff_code: string;
            rebate_rate: number | null; has_custom_rate: number;
            invited_count: number; rebated_invitee_count: number;
            available_quota: number; history_quota: number;
        }>(
            this.#db,
            `SELECT ua.user_id,
                    COALESCE(u.email, '') as email,
                    COALESCE(u.username, '') as username,
                    ua.aff_code,
                    ua.aff_rebate_rate_percent as rebate_rate,
                    (ua.aff_rebate_rate_percent IS NOT NULL) as has_custom_rate,
                    ua.aff_count as invited_count,
                    COALESCE(rebated.cnt, 0) as rebated_invitee_count,
                    ua.aff_quota + COALESCE(matured.sum, 0) as available_quota,
                    ua.aff_history_quota as history_quota
             FROM user_affiliates ua
             JOIN users u ON u.id = ua.user_id
             LEFT JOIN (
                SELECT user_id, COUNT(DISTINCT source_user_id) as cnt
                FROM user_affiliate_ledger
                WHERE action = 'accrue' AND source_user_id IS NOT NULL
                GROUP BY user_id
             ) rebated ON rebated.user_id = ua.user_id
             LEFT JOIN (
                SELECT user_id, SUM(amount) as sum
                FROM user_affiliate_ledger
                WHERE action = 'accrue' AND frozen_until IS NOT NULL AND frozen_until <= datetime('now')
                GROUP BY user_id
             ) matured ON matured.user_id = ua.user_id
             WHERE ua.user_id = ? LIMIT 1`,
            [userId]
        );
        if (row === null) return null;
        const fallbackRate = row.rebate_rate === null ? await this.getDefaultRebateRate() : row.rebate_rate;
        const rebateRatePercent = Math.min(100, Math.max(0, fallbackRate ?? 0));
        return {
            userId: row.user_id,
            user_id: row.user_id,
            email: row.email,
            username: row.username,
            affCode: row.aff_code,
            aff_code: row.aff_code,
            rebateRatePercent,
            rebate_rate_percent: rebateRatePercent,
            invitedCount: row.invited_count,
            invited_count: row.invited_count,
            rebatedInviteeCount: row.rebated_invitee_count,
            rebated_invitee_count: row.rebated_invitee_count,
            availableQuota: row.available_quota,
            available_quota: row.available_quota,
            historyQuota: row.history_quota,
            history_quota: row.history_quota,
        };
    }

    async updateUserAffCode(userId: number, newCode: string): Promise<boolean> {
        await this.getOrCreateUserAffiliate(userId);
        const result = await runStatement(
            this.#db,
            `UPDATE user_affiliates SET aff_code = ?, aff_code_custom = 1, updated_at = datetime('now') WHERE user_id = ?`,
            [newCode, userId]
        );
        return (result.meta?.changes ?? 0) > 0;
    }

    async resetUserAffCode(userId: number): Promise<string> {
        await this.getOrCreateUserAffiliate(userId);
        const code = generateAffCode();
        await runStatement(
            this.#db,
            `UPDATE user_affiliates SET aff_code = ?, aff_code_custom = 0, updated_at = datetime('now') WHERE user_id = ?`,
            [code, userId]
        );
        return code;
    }

    async setUserRebateRate(userId: number, ratePercent: number | null): Promise<boolean> {
        const result = await runStatement(
            this.#db,
            `UPDATE user_affiliates SET aff_rebate_rate_percent = ?, updated_at = datetime('now') WHERE user_id = ?`,
            [ratePercent, userId]
        );
        return (result.meta?.changes ?? 0) > 0;
    }

    async batchSetUserRebateRate(userIds: number[], ratePercent: number | null): Promise<number> {
        if (userIds.length === 0) return 0;
        const ps = placeholders(userIds.length);
        const result = await runStatement(
            this.#db,
            `UPDATE user_affiliates SET aff_rebate_rate_percent = ?, updated_at = datetime('now') WHERE user_id IN (${ps})`,
            [ratePercent, ...userIds]
        );
        return result.meta?.changes ?? 0;
    }

    async listInviteRecords(filter: AffiliateRecordFilter): Promise<{ items: AffiliateInviteRecord[]; total: number }> {
        const page = Math.max(1, filter.page ?? 1);
        const pageSize = Math.min(100, Math.max(1, filter.pageSize ?? 20));
        const offset = (page - 1) * pageSize;
        const orderBy = buildInviteOrderBy(filter);

        const whereClauses: string[] = [];
        const values: D1Value[] = [];

        if (filter.search && filter.search.trim()) {
            values.push(`%${filter.search.trim()}%`, `%${filter.search.trim()}%`);
            whereClauses.push("(inviter.email LIKE ? OR inviter.username LIKE ? OR invitee.email LIKE ? OR invitee.username LIKE ?)");
            values.push(`%${filter.search.trim()}%`, `%${filter.search.trim()}%`);
        }

        if (filter.startAt) {
            values.push(filter.startAt);
            whereClauses.push(`ua.created_at >= ?`);
        }
        if (filter.endAt) {
            values.push(filter.endAt);
            whereClauses.push(`ua.created_at <= ?`);
        }

        const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

        const countRow = await firstRow<{ cnt: number }>(
            this.#db,
            `SELECT COUNT(*) as cnt FROM user_affiliates ua
             JOIN users invitee ON invitee.id = ua.user_id
             JOIN users inviter ON inviter.id = ua.inviter_id
             ${whereSql}`,
            values
        );
        const total = countRow?.cnt ?? 0;

        const rows = await allRows<{
            inviter_id: number; inviter_email: string; inviter_username: string;
            invitee_id: number; invitee_email: string; invitee_username: string;
            aff_code: string; total_rebate: number; created_at: string;
        }>(
            this.#db,
            `SELECT ua.inviter_id,
                    COALESCE(inviter.email, '') as inviter_email,
                    COALESCE(inviter.username, '') as inviter_username,
                    ua.user_id as invitee_id,
                    COALESCE(invitee.email, '') as invitee_email,
                    COALESCE(invitee.username, '') as invitee_username,
                    COALESCE(inviter_aff.aff_code, '') as aff_code,
                    COALESCE(SUM(ual.amount), 0) as total_rebate,
                    ua.created_at
             FROM user_affiliates ua
             JOIN users invitee ON invitee.id = ua.user_id
             JOIN users inviter ON inviter.id = ua.inviter_id
             LEFT JOIN user_affiliates inviter_aff ON inviter_aff.user_id = ua.inviter_id
             LEFT JOIN user_affiliate_ledger ual ON ual.user_id = ua.inviter_id AND ual.source_user_id = ua.user_id AND ual.action = 'accrue'
             ${whereSql}
             GROUP BY ua.inviter_id, inviter.email, inviter.username, ua.user_id, invitee.email, invitee.username, inviter_aff.aff_code, ua.created_at
             ${orderBy}
             LIMIT ? OFFSET ?`,
            [...values, pageSize, offset]
        );

        return {
            items: rows.map((r) => ({
                inviterId: r.inviter_id,
                inviter_id: r.inviter_id,
                inviterEmail: r.inviter_email,
                inviter_email: r.inviter_email,
                inviterUsername: r.inviter_username,
                inviter_username: r.inviter_username,
                inviteeId: r.invitee_id,
                invitee_id: r.invitee_id,
                inviteeEmail: r.invitee_email,
                invitee_email: r.invitee_email,
                inviteeUsername: r.invitee_username,
                invitee_username: r.invitee_username,
                affCode: r.aff_code,
                aff_code: r.aff_code,
                totalRebate: r.total_rebate,
                total_rebate: r.total_rebate,
                createdAt: r.created_at,
                created_at: r.created_at,
            })),
            total,
        };
    }

    async listRebateRecords(filter: AffiliateRecordFilter): Promise<{ items: AffiliateRebateRecord[]; total: number }> {
        const page = Math.max(1, filter.page ?? 1);
        const pageSize = Math.min(100, Math.max(1, filter.pageSize ?? 20));
        const offset = (page - 1) * pageSize;
        const orderBy = buildRebateOrderBy(filter);

        const whereClauses: string[] = ["ual.action = 'accrue'", "ual.source_order_id IS NOT NULL"];
        const values: D1Value[] = [];

        if (filter.search && filter.search.trim()) {
            values.push(`%${filter.search.trim()}%`, `%${filter.search.trim()}%`);
            whereClauses.push("(inviter.email LIKE ? OR inviter.username LIKE ? OR invitee.email LIKE ? OR invitee.username LIKE ?)");
            values.push(`%${filter.search.trim()}%`, `%${filter.search.trim()}%`);
        }

        if (filter.startAt) {
            values.push(filter.startAt);
            whereClauses.push(`ual.created_at >= ?`);
        }
        if (filter.endAt) {
            values.push(filter.endAt);
            whereClauses.push(`ual.created_at <= ?`);
        }

        const whereSql = whereClauses.join(" AND ");

        const countRow = await firstRow<{ cnt: number }>(
            this.#db,
            `SELECT COUNT(*) as cnt FROM user_affiliate_ledger ual
             JOIN payment_orders po ON po.id = ual.source_order_id
             JOIN users invitee ON invitee.id = ual.source_user_id
             JOIN users inviter ON inviter.id = ual.user_id
             WHERE ${whereSql}`,
            values
        );
        const total = countRow?.cnt ?? 0;

        const rows = await allRows<{
            order_id: number; out_trade_no: string;
            inviter_id: number; inviter_email: string; inviter_username: string;
            invitee_id: number; invitee_email: string; invitee_username: string;
            order_amount: number; pay_amount: number; rebate_amount: number;
            payment_type: string; order_status: string; created_at: string;
        }>(
            this.#db,
            `SELECT po.id as order_id, po.out_trade_no,
                    ual.user_id as inviter_id,
                    COALESCE(inviter.email, '') as inviter_email,
                    COALESCE(inviter.username, '') as inviter_username,
                    ual.source_user_id as invitee_id,
                    COALESCE(invitee.email, '') as invitee_email,
                    COALESCE(invitee.username, '') as invitee_username,
                    po.amount as order_amount, po.pay_amount as pay_amount,
                    ual.amount as rebate_amount,
                    po.payment_type, po.status as order_status, ual.created_at
             FROM user_affiliate_ledger ual
             JOIN payment_orders po ON po.id = ual.source_order_id
             JOIN users invitee ON invitee.id = ual.source_user_id
             JOIN users inviter ON inviter.id = ual.user_id
             WHERE ${whereSql}
             ${orderBy}
             LIMIT ? OFFSET ?`,
            [...values, pageSize, offset]
        );

        return {
            items: rows.map((r) => ({
                orderId: r.order_id,
                order_id: r.order_id,
                outTradeNo: r.out_trade_no,
                out_trade_no: r.out_trade_no,
                inviterId: r.inviter_id,
                inviter_id: r.inviter_id,
                inviterEmail: r.inviter_email,
                inviter_email: r.inviter_email,
                inviterUsername: r.inviter_username,
                inviter_username: r.inviter_username,
                inviteeId: r.invitee_id,
                invitee_id: r.invitee_id,
                inviteeEmail: r.invitee_email,
                invitee_email: r.invitee_email,
                inviteeUsername: r.invitee_username,
                invitee_username: r.invitee_username,
                orderAmount: r.order_amount,
                order_amount: r.order_amount,
                payAmount: r.pay_amount,
                pay_amount: r.pay_amount,
                rebateAmount: r.rebate_amount,
                rebate_amount: r.rebate_amount,
                paymentType: r.payment_type,
                payment_type: r.payment_type,
                orderStatus: r.order_status,
                order_status: r.order_status,
                createdAt: r.created_at,
                created_at: r.created_at,
            })),
            total,
        };
    }

    async ensureUserAffiliate(userId: number): Promise<{ affCode: string; affQuota: number; affFrozenQuota: number; affHistoryQuota: number; affCount: number; inviterId: number | null }> {
        const existing = await firstRow<{ aff_code: string; aff_quota: number; aff_frozen_quota: number; aff_history_quota: number; aff_count: number; inviter_id: number | null }>(
            this.#db, `SELECT aff_code, aff_quota, aff_frozen_quota, aff_history_quota, aff_count, inviter_id FROM user_affiliates WHERE user_id = ?`, [userId]
        );
        if (existing) {
            return {
                affCode: existing.aff_code,
                affQuota: existing.aff_quota,
                affFrozenQuota: existing.aff_frozen_quota,
                affHistoryQuota: existing.aff_history_quota,
                affCount: existing.aff_count,
                inviterId: existing.inviter_id,
            };
        }
        let code = generateAffCode();
        let existingCode = await firstRow<{ c: number }>(this.#db, `SELECT COUNT(*) as c FROM user_affiliates WHERE aff_code = ?`, [code]);
        while (existingCode && existingCode.c > 0) {
            code = generateAffCode();
            existingCode = await firstRow<{ c: number }>(this.#db, `SELECT COUNT(*) as c FROM user_affiliates WHERE aff_code = ?`, [code]);
        }
        const now = new Date().toISOString();
        await runStatement(this.#db,
            `INSERT INTO user_affiliates (user_id, aff_code, aff_count, aff_quota, aff_history_quota, aff_frozen_quota, created_at, updated_at) VALUES (?, ?, 0, 0, 0, 0, ?, ?)`,
            [userId, code, now, now]
        );
        return { affCode: code, affQuota: 0, affFrozenQuota: 0, affHistoryQuota: 0, affCount: 0, inviterId: null };
    }

    async thawFrozenQuota(userId: number): Promise<number> {
        const now = new Date().toISOString();
        const frozen = await firstRow<{ total: number }>(
            this.#db,
            `SELECT COALESCE(SUM(amount), 0) as total FROM user_affiliate_ledger WHERE user_id = ? AND action = 'accrue' AND frozen_until IS NOT NULL AND frozen_until <= ?`,
            [userId, now]
        );
        if (!frozen || frozen.total <= 0) return 0;
        const ledgerRes = await runStatement(this.#db,
            `UPDATE user_affiliate_ledger SET frozen_until = NULL, updated_at = ? WHERE user_id = ? AND action = 'accrue' AND frozen_until IS NOT NULL AND frozen_until <= ?`,
            [now, userId, now]
        );
        if ((ledgerRes.meta?.changes ?? 0) === 0) return 0;
        await runStatement(this.#db,
            `UPDATE user_affiliates SET aff_quota = aff_quota + ?, aff_frozen_quota = MAX(0, aff_frozen_quota - ?), updated_at = ? WHERE user_id = ?`,
            [frozen.total, frozen.total, now, userId]
        );
        return frozen.total;
    }

    async listInvitees(userId: number, limit: number): Promise<AffiliateInviteeRecord[]> {
        const rows = await allRows<{ user_id: number; email: string; username: string; created_at: string; total_recharge: number; total_rebate: number }>(
            this.#db,
            `SELECT ua.user_id, COALESCE(u.email, '') as email, COALESCE(u.username, '') as username, ua.created_at,
                    COALESCE(recharge.total, 0) as total_recharge,
                    COALESCE(rebate.total, 0) as total_rebate
             FROM user_affiliates ua
             JOIN users u ON u.id = ua.user_id
             LEFT JOIN (
                SELECT ual.source_user_id, SUM(ual.amount) as total
                FROM user_affiliate_ledger ual WHERE ual.user_id = ? AND ual.action = 'accrue'
                GROUP BY ual.source_user_id
             ) rebate ON rebate.source_user_id = ua.user_id
             LEFT JOIN (
                SELECT ual.source_user_id, SUM(po.amount) as total
                FROM user_affiliate_ledger ual
                JOIN payment_orders po ON po.id = ual.source_order_id
                WHERE ual.user_id = ? AND ual.action = 'accrue'
                GROUP BY ual.source_user_id
             ) recharge ON recharge.source_user_id = ua.user_id
             WHERE ua.inviter_id = ?
             ORDER BY ua.created_at DESC LIMIT ?`,
            [userId, userId, userId, limit]
        );
        return rows.map(r => ({
            userId: r.user_id,
            user_id: r.user_id,
            email: r.email,
            username: r.username,
            invitedAt: r.created_at,
            invited_at: r.created_at,
            totalRecharge: r.total_recharge,
            total_recharge: r.total_recharge,
            totalRebate: r.total_rebate,
            total_rebate: r.total_rebate,
        }));
    }

    async transferQuotaToBalance(userId: number): Promise<{ transferred: number; balance: number }> {
        await this.thawFrozenQuota(userId);
        const aff = await firstRow<{ aff_quota: number; aff_frozen_quota: number; aff_history_quota: number }>(
            this.#db, `SELECT aff_quota, aff_frozen_quota, aff_history_quota FROM user_affiliates WHERE user_id = ?`, [userId]
        );
        if (!aff || aff.aff_quota <= 0) {
            const user = await firstRow<{ balance: number }>(this.#db, `SELECT balance FROM users WHERE id = ?`, [userId]);
            return { transferred: 0, balance: user?.balance ?? 0 };
        }
        const amount = aff.aff_quota;
        const now = new Date().toISOString();
        const claimRes = await runStatement(this.#db,
            `UPDATE user_affiliates SET aff_quota = 0, aff_history_quota = aff_history_quota + ?, updated_at = ? WHERE user_id = ? AND aff_quota = ? AND aff_quota > 0`,
            [amount, now, userId, amount]
        );
        if ((claimRes.meta?.changes ?? 0) === 0) {
            const user = await firstRow<{ balance: number }>(this.#db, `SELECT balance FROM users WHERE id = ?`, [userId]);
            return { transferred: 0, balance: user?.balance ?? 0 };
        }
        await runStatement(this.#db, `UPDATE users SET balance = balance + ?, updated_at = ? WHERE id = ?`, [amount, now, userId]);
        const user = await firstRow<{ balance: number }>(this.#db, `SELECT balance FROM users WHERE id = ?`, [userId]);
        const userBalance = user?.balance ?? 0;
        const finalAff = await firstRow<{ aff_quota: number; aff_frozen_quota: number; aff_history_quota: number }>(
            this.#db, `SELECT aff_quota, aff_frozen_quota, aff_history_quota FROM user_affiliates WHERE user_id = ?`, [userId]
        );
        await runStatement(this.#db,
            `INSERT INTO user_affiliate_ledger (user_id, action, amount, balance_after, aff_quota_after, aff_frozen_quota_after, aff_history_quota_after, created_at, updated_at) VALUES (?, 'transfer', ?, ?, ?, ?, ?, ?, ?)`,
            [userId, amount, userBalance, finalAff?.aff_quota ?? 0, finalAff?.aff_frozen_quota ?? 0, finalAff?.aff_history_quota ?? 0, now, now]
        );
        return { transferred: amount, balance: userBalance };
    }

    async getAffiliateDetail(userId: number): Promise<AffiliateDetailRecord | null> {
        const row = await firstRow<{
            user_id: number; aff_code: string; inviter_id: number | null;
            aff_count: number; aff_quota: number; aff_frozen_quota: number;
            aff_history_quota: number; aff_rebate_rate_percent: number | null;
        }>(
            this.#db,
            `SELECT user_id, aff_code, inviter_id, aff_count, aff_quota, aff_frozen_quota, aff_history_quota, aff_rebate_rate_percent
             FROM user_affiliates WHERE user_id = ? LIMIT 1`,
            [userId]
        );
        if (!row) return null;
        const invitees = await this.listInvitees(userId, 100);
        const fallbackRate = row.aff_rebate_rate_percent === null ? await this.getDefaultRebateRate() : row.aff_rebate_rate_percent;
        const effectiveRebateRatePercent = Math.min(100, Math.max(0, fallbackRate ?? 0));
        return {
            userId: row.user_id,
            user_id: row.user_id,
            affCode: row.aff_code,
            aff_code: row.aff_code,
            inviterId: row.inviter_id,
            inviter_id: row.inviter_id,
            affCount: row.aff_count,
            aff_count: row.aff_count,
            affQuota: row.aff_quota,
            aff_quota: row.aff_quota,
            affFrozenQuota: row.aff_frozen_quota,
            aff_frozen_quota: row.aff_frozen_quota,
            affHistoryQuota: row.aff_history_quota,
            aff_history_quota: row.aff_history_quota,
            effectiveRebateRatePercent,
            effective_rebate_rate_percent: effectiveRebateRatePercent,
            invitees,
        };
    }

    async listTransferRecords(filter: AffiliateRecordFilter): Promise<{ items: AffiliateTransferRecord[]; total: number }> {
        const page = Math.max(1, filter.page ?? 1);
        const pageSize = Math.min(100, Math.max(1, filter.pageSize ?? 20));
        const offset = (page - 1) * pageSize;
        const orderBy = buildTransferOrderBy(filter);

        const whereClauses: string[] = ["ual.action = 'transfer'"];
        const values: D1Value[] = [];

        if (filter.search && filter.search.trim()) {
            values.push(`%${filter.search.trim()}%`, `%${filter.search.trim()}%`);
            whereClauses.push("(u.email LIKE ? OR u.username LIKE ?)");
        }

        if (filter.startAt) {
            values.push(filter.startAt);
            whereClauses.push(`ual.created_at >= ?`);
        }
        if (filter.endAt) {
            values.push(filter.endAt);
            whereClauses.push(`ual.created_at <= ?`);
        }

        const whereSql = whereClauses.join(" AND ");

        const countRow = await firstRow<{ cnt: number }>(
            this.#db,
            `SELECT COUNT(*) as cnt FROM user_affiliate_ledger ual
             JOIN users u ON u.id = ual.user_id
             WHERE ${whereSql}`,
            values
        );
        const total = countRow?.cnt ?? 0;

        const rows = await allRows<{
            ledger_id: number; user_id: number; user_email: string; username: string;
            amount: number; balance_after: number | null; aff_quota_after: number | null;
            aff_frozen_quota_after: number | null; aff_history_quota_after: number | null;
            created_at: string;
        }>(
            this.#db,
            `SELECT ual.id as ledger_id, ual.user_id,
                    COALESCE(u.email, '') as user_email,
                    COALESCE(u.username, '') as username,
                    ual.amount,
                    ual.balance_after, ual.aff_quota_after,
                    ual.aff_frozen_quota_after, ual.aff_history_quota_after,
                    ual.created_at
             FROM user_affiliate_ledger ual
             JOIN users u ON u.id = ual.user_id
             WHERE ${whereSql}
             ${orderBy}
             LIMIT ? OFFSET ?`,
            [...values, pageSize, offset]
        );

        return {
            items: rows.map((r) => {
                const snapshotAvailable = r.balance_after !== null && r.aff_quota_after !== null && r.aff_frozen_quota_after !== null && r.aff_history_quota_after !== null;
                return {
                    ledgerId: r.ledger_id,
                    ledger_id: r.ledger_id,
                    userId: r.user_id,
                    user_id: r.user_id,
                    userEmail: r.user_email,
                    user_email: r.user_email,
                    username: r.username,
                    amount: r.amount,
                    balanceAfter: r.balance_after,
                    balance_after: r.balance_after,
                    availableQuotaAfter: r.aff_quota_after,
                    available_quota_after: r.aff_quota_after,
                    frozenQuotaAfter: r.aff_frozen_quota_after,
                    frozen_quota_after: r.aff_frozen_quota_after,
                    historyQuotaAfter: r.aff_history_quota_after,
                    history_quota_after: r.aff_history_quota_after,
                    snapshotAvailable,
                    snapshot_available: snapshotAvailable,
                    createdAt: r.created_at,
                    created_at: r.created_at,
                };
            }),
            total,
        };
    }
}

export interface AffiliateInviteeRecord {
    userId: number;
    user_id?: number;
    email: string;
    username: string;
    invitedAt: string;
    invited_at?: string;
    totalRecharge: number;
    total_recharge?: number;
    totalRebate: number;
    total_rebate?: number;
}

export interface AffiliateDetailRecord {
    userId: number;
    user_id?: number;
    affCode: string;
    aff_code?: string;
    inviterId: number | null;
    inviter_id?: number | null;
    affCount: number;
    aff_count?: number;
    affQuota: number;
    aff_quota?: number;
    affFrozenQuota: number;
    aff_frozen_quota?: number;
    affHistoryQuota: number;
    aff_history_quota?: number;
    effectiveRebateRatePercent: number;
    effective_rebate_rate_percent?: number;
    invitees: AffiliateInviteeRecord[];
}

export interface AffiliateTransferResult {
    transferred: number;
    balance: number;
}

function generateAffCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const bytes = new Uint8Array(12);
    crypto.getRandomValues(bytes);
    let code = "";
    for (let i = 0; i < 12; i++) {
        code += chars[bytes[i] % chars.length];
    }
    return code;
}

function buildInviteOrderBy(f: AffiliateRecordFilter): string {
    const col = INVITE_SORT_MAP[f.sortBy ?? ""] ?? "ua.created_at";
    const dir = f.sortOrder === "asc" ? "ASC" : "DESC";
    return `ORDER BY ${col} ${dir} NULLS LAST`;
}

function buildRebateOrderBy(f: AffiliateRecordFilter): string {
    const col = REBATE_SORT_MAP[f.sortBy ?? ""] ?? "ual.created_at";
    const dir = f.sortOrder === "asc" ? "ASC" : "DESC";
    return `ORDER BY ${col} ${dir} NULLS LAST`;
}

function buildTransferOrderBy(f: AffiliateRecordFilter): string {
    const col = TRANSFER_SORT_MAP[f.sortBy ?? ""] ?? "ual.created_at";
    const dir = f.sortOrder === "asc" ? "ASC" : "DESC";
    return `ORDER BY ${col} ${dir} NULLS LAST`;
}
