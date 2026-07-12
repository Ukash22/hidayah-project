# Backend Test Suite

All backend tests live in this package (the per-app `tests.py` files are stubs pointing here).

## Running

```bash
cd backend

# Fast (~4s) — MD5 password hashing for test users, everything else identical
python manage.py test tests --settings=core.test_settings

# Normal settings (~4 min — real password hashing dominates)
python manage.py test tests

# One module / one class / one test
python manage.py test tests.test_payments --settings=core.test_settings
python manage.py test tests.test_payments.SessionCompletionPayoutTests --settings=core.test_settings

# Coverage (pip install coverage)
python -m coverage run --source=accounts,payments,classes,tutors,students,applications,core,programs,exams manage.py test tests --settings=core.test_settings
python -m coverage report --skip-covered --sort=cover
```

> Use the dotted `tests` label (not a path) — bare app names trip unittest's directory discovery.

## Layout

| File | Covers |
|---|---|
| `test_auth.py` | S4 cookie auth (login/refresh/logout), student registration incl. unknown-subject regression |
| `test_tutors.py` | Tutor list caching, N+1 query-count guards, pagination, admin-endpoint permissions, profile ownership, tutor registration, payload leakage |
| `test_classes.py` | Session list pagination envelope, per-user visibility, query counts, status index |
| `test_payments.py` | Session-completion payout math + idempotency, withdrawal reservation, negative-balance policy, analytics caching, financial endpoint permissions |
| `test_students.py` | payment_status index, auth guard |
| `test_programs.py` | Catalogue caching + write invalidation, write permissions |
| `test_dispatch.py` | Celery/thread-pool dispatcher fallback |

## Conventions (adopted in the Test Coverage Audit)

- **Every bug fix ships with a regression test.** Name/comment it so the original failure is obvious (see `test_registration_with_unknown_subject_still_succeeds`).
- **New endpoints ship with at least a happy-path test and a permission test.**
- **Money-touching code requires math + idempotency tests** before merge (template: `SessionCompletionPayoutTests`).
- Use `APIClient.force_authenticate` (no JWT ceremony needed); create users via each module's `make_user` helper.
- `cache.clear()` in `setUp` for anything touching cached endpoints — the LocMem cache persists across tests.
- Query-count regression guards compare counts at two dataset sizes rather than asserting exact numbers (robust to unrelated changes).
- Wallets are auto-created by a signal — use `get_or_create`, never `create`, in fixtures.
- Known gaps and priorities: `docs/gaps-and-upgrade/tracker/test-coverage-progress.md` (Phase T-B).
