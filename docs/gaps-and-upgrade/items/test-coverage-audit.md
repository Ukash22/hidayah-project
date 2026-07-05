# Test Coverage Audit — Findings

Audit #10 (final) from the [audit index](../audit-index.md). Measured with `coverage.py` against the 63-test suite in `backend/tests/`.

**Overall backend line coverage: 48%** (was 45% at audit start; 0% before the audit programme began). Frontend: **no test infrastructure** (no vitest/jest).

Run it yourself:
```bash
cd backend
python -m coverage run --source=accounts,payments,classes,tutors,students,applications,core,programs,exams manage.py test tests --settings=core.test_settings
python -m coverage report --skip-covered --sort=cover
```

---

## What IS covered (the suite's strengths)

| Area | Tests |
|---|---|
| Auth: cookie login/refresh/logout (S4), student + tutor registration incl. regression cases | 12 |
| Money: session-completion commission math, double-payout guard, withdrawal reservation, negative-balance policy, analytics caching | 8 |
| Security: role enforcement on admin/financial/profile endpoints, payload leakage | 15 |
| Performance guards: N+1 query counts, response caching, pagination shapes, DB indexes | 15 |
| Infrastructure: async dispatch fallback, programs cache invalidation | 13 |

Two real bugs were caught *while writing coverage tests* — evidence the approach pays: the wallet-create signal conflict and the **unknown-subject registration abort** (an IntegrityError inside the atomic block killed the whole registration; now skipped gracefully with a regression test).

## Gaps, ranked by risk

| Priority | Module | Coverage | Why it matters / suggested first tests |
|---|---|---|---|
| 🔴 | `payments/logic.py` | 31% | Money. Covered: session completion. Uncovered: `process_booking_payment` fulfillment (enrollment creation, session generation, wallet math on Paystack success). Test via mock-mode verify flow |
| 🔴 | `payments/paystack_service.py` | 20% | Webhook signature verification is the security-critical bit — test valid/invalid HMAC on `PaystackWebhookView` |
| 🟠 | `classes/scheduler.py` + `classes/utils.py` | 10% / 0% | Session generation from enrollment schedules — wrong output silently creates wrong classes. Pure-ish logic, cheap to test |
| 🟠 | `applications/views.py` | 15% | Trial application approve/reject workflow (admin-facing, email side-effects — mock `run_async`) |
| 🟡 | `exams/views.py` | 22% | Exam assignment + result submission scoring |
| 🟡 | `classes/views.py` booking approval paths | 28% | `BookingApprovalView`, reschedule approval |
| 🟢 | `core/tasks.py` | 0% | Email/PDF tasks — integration-ish; mock SMTP; low urgency while emails are manually verified |
| 🟢 | Management commands, `zoom_service` | 0% | External-service wrappers; mock-heavy, low value until publish stage |

## Frontend: recommendation, not a mandate

Zero tests and no runner. **Recommendation: do NOT retrofit component tests now** (dev-stage, UI still churning — tests would churn with it). Instead:
1. When a frontend bug bites twice, add vitest then, starting with pure logic: `getApiError`, `asList`, `tokenStore`, price calculations in Register/StudentOverview.
2. The backend contract tests already guard the shapes the frontend depends on (pagination envelopes, error shapes) — that's where frontend breakage has actually come from.

## Policy going forward (adopted)

- Every bug fix ships with a regression test (this audit's registration bug is the template).
- New endpoints ship with at least: happy path + permission test.
- Money-touching code requires math + idempotency tests before merge.
- Coverage number is a compass, not a target — no chasing % on wrappers around external services.
