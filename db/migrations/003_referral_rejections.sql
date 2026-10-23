-- 003: add the terminal "rejected" referral status.
-- Faculty (or superadmin) may reject a flagged referral; superadmin may then
-- hard-delete rejected referrals from the ledger (DELETE /referrals/:id).
ALTER TYPE referral_status ADD VALUE 'rejected';
