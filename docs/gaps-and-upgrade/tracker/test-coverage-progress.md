# Test Coverage Audit — Progress Tracker

Tracks implementation against [test-coverage-audit.md](../items/test-coverage-audit.md). Suite: `backend/tests/` — run with `python manage.py test tests --settings=core.test_settings` (~4s).

---

## Phase T-A — Baseline + money-path quick wins ✅ Complete

| # | Item | Status |
|---|---|---|
| 1 | Coverage measured (coverage.py added to the venv): **48% overall**, per-module gap table in items file | ✅ Done |
| 2 | Session-completion payout tests: commission math (20% override), wallet debit/credit, transaction records, double-completion guard, ownership check | ✅ Done |
| 3 | Student registration tests: happy path w/ enrollment, duplicate username, **unknown-subject regression** | ✅ Done |
| 4 | Bug fixed while testing: unknown subject poisoned the registration transaction (IntegrityError inside atomic) — now skipped with a warning | ✅ Done |

Suite: **63 tests, all green.**

## Phase T-B — Remaining high-risk gaps ⬜ Pending (add when touching each area)

| # | Item | Status |
|---|---|---|
| 5 | Paystack webhook HMAC signature accept/reject | ⬜ Pending |
| 6 | Booking-payment fulfillment (`payments/logic.process_booking_payment`) via mock-mode verify | ⬜ Pending |
| 7 | Session generation from enrollment schedules (`classes/scheduler`, `classes/utils`) | ⬜ Pending |
| 8 | Trial application approve/reject workflow (mock `run_async`) | ⬜ Pending |
| 9 | Exam assignment + scoring | ⬜ Pending |

## Phase T-C — Policy ✅ Adopted

Bug fixes ship with regression tests · new endpoints ship with happy-path + permission tests · money code requires math + idempotency tests · coverage is a compass, not a target. Frontend testing deferred until UI stabilises (see items file for the rationale and starting points).
