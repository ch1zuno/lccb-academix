/**
 * Rewards: catalog + single-transaction redemption.
 *
 * POST /rewards/:id/redeem
 *   1. SELECT reward ... FOR UPDATE     → stock check
 *   2. SELECT wallet balance            → FROM points_ledger (append-only)
 *   3. insufficient stock/balance → 409 reject (nothing written)
 *   4. UPDATE rewards stock - 1
 *   5. INSERT points_ledger debit row (append-only)
 *   6. INSERT redemptions row with unique voucher code
 * Rolls back entirely on any failure.
 */
import crypto from 'node:crypto';
import express from 'express';
import { query, withTransaction } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { httpError } from '../middleware/errors.js';

const router = express.Router();

const CATALOG_SQL = `
  SELECT id, reward_code, name, cost, category, icon, stock, description,
         (SELECT COALESCE(SUM(amount), 0) FROM points_ledger l WHERE l.user_id = $1) AS my_balance
  FROM rewards ORDER BY cost`;

router.get('/rewards', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(CATALOG_SQL, [req.user.id]);
    res.json({ rewards: rows });
  } catch (e) { next(e); }
});

/** wallet balance straight from the append-only ledger (mirrors user_wallet_balances view) */
router.get('/wallet', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT COALESCE(SUM(amount), 0)::int AS balance FROM points_ledger WHERE user_id = $1`,
      [req.user.id]);
    const history = await query(
      `SELECT amount, description, created_at FROM points_ledger WHERE user_id = $1 ORDER BY created_at DESC LIMIT 30`,
      [req.user.id]);
    const vouchers = await query(
      `SELECT r.voucher_code, rw.name AS reward, r.points_debited, r.status, r.created_at
       FROM redemptions r JOIN rewards rw ON rw.id = r.reward_id
       WHERE r.user_id = $1 ORDER BY r.created_at DESC LIMIT 20`,
      [req.user.id]);
    res.json({ balance: rows[0].balance, history: history.rows, vouchers: vouchers.rows });
  } catch (e) { next(e); }
});

router.post('/rewards/:id/redeem', requireAuth, async (req, res, next) => {
  try {
    const voucher = voucherCode();
    const result = await withTransaction(async (client) => {
      // 1+2. lock reward & check balance (FOR UPDATE on reward row)
      const { rows: rw } = await client.query(
        `SELECT id, name, cost, stock FROM rewards WHERE id = $1 FOR UPDATE`,
        [req.params.id]);
      const reward = rw[0];
      if (!reward) throw httpError(404, 'Reward not found');

      const { rows: bal } = await client.query(
        `SELECT COALESCE(SUM(amount), 0)::int AS balance FROM points_ledger WHERE user_id = $1`,
        [req.user.id]);
      const balance = bal[0].balance;

      // 3. rejects before any write
      if (reward.stock <= 0) throw httpError(409, 'Reward out of stock');
      if (balance < reward.cost) throw httpError(409, `Not enough points — need ${reward.cost}, have ${balance}`);

      // 4. decrement stock
      const { rows: stockNow } = await client.query(
        `UPDATE rewards SET stock = stock - 1 WHERE id = $1 RETURNING stock`,
        [reward.id]);

      // 5. ledger debit (append-only; negatives only through this route)
      await client.query(
        `INSERT INTO points_ledger (user_id, amount, description)
         VALUES ($1, $2, $3)`,
        [req.user.id, -reward.cost, `Redeemed: ${reward.name} (${voucher})`]);

      // 6. voucher
      const { rows: red } = await client.query(
        `INSERT INTO redemptions (user_id, reward_id, points_debited, voucher_code)
         VALUES ($1, $2, $3, $4) RETURNING voucher_code, created_at`,
        [req.user.id, reward.id, reward.cost, voucher]);

      const { rows: newBal } = await client.query(
        `SELECT COALESCE(SUM(amount), 0)::int AS balance FROM points_ledger WHERE user_id = $1`,
        [req.user.id]);

      return {
        voucher: red[0].voucher_code, reward: reward.name,
        pointsDebited: reward.cost, stock: stockNow[0].stock,
        balance: newBal[0].balance,
      };
    });
    res.status(201).json(result);
  } catch (e) { next(e); }
});

function voucherCode() {
  return `LCCB-${crypto.randomUUID().split('-')[0].toUpperCase()}`;
}

export default router;
