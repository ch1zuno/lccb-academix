-- 006: learners can withdraw a pending session request.
--
--  * session_requests.status gains 'cancelled'
--  * a learner can only cancel their own request, and only while pending
--
-- Safe to run against a database that already has the 001-005 migrations.

BEGIN;

ALTER TABLE session_requests DROP CONSTRAINT IF EXISTS session_requests_status_check;

ALTER TABLE session_requests ADD CONSTRAINT session_requests_status_check
  CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled'));

COMMIT;
