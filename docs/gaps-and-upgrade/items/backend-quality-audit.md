# Backend Code Quality Audit — Findings

Audit #9 from the [audit index](../audit-index.md). Scope: duplicate logic, missing model validation, raw SQL, inconsistent serializer patterns, unused models/fields.

Severity: 🔴 Critical · 🟠 High · 🟡 Medium · 🟢 Low

---

## Q1 🔴 `backend/scratch/` committed with real database dumps — ✅ Fixed (tracking)

77 one-off debug/repair scripts were tracked in git, including **`db_dump.json` (489 records — `accounts.user` rows with emails, names, and password hashes)** and two trial-application backups.

**Fixed:** `git rm -r --cached backend/scratch/` (files stay on disk) + `.gitignore` entry.

**⚠ Remaining:** the dumps are still in **git history**. Acceptable while the repo is private and in development; if it ever goes public or gets shared, purge history with `git filter-repo --path backend/scratch --invert-paths` and treat any credentials/secrets referenced in those scripts as compromised.

## Q2 🟠 Split-brain Notification models — ✅ Fixed

Two `Notification` models existed: `accounts.Notification` (read by the bell API `/api/auth/notifications/`) and `notifications.Notification` (a parallel model in a stub app with no views/urls). Four writers — `classes/scheduler.py`, `students/views.py`, `exams/views.py` ×2 — wrote to the stub model, so **"new enrollment request", "classes generated", and exam notifications were never visible to anyone**.

**Fixed:** added the missing `link` field to `accounts.Notification` (migration `accounts/0005`), switched all four writers to it. The `notifications` app remains installed only so its historical migration/table stay valid — **do not add new code to it**; it can be dropped entirely (app + table) in a later cleanup migration.

## Q3 🟠 Dead shadowed methods in TutorViewSet — ✅ Fixed

`tutors/views.py` defined `by_subject` and `get_queryset` **twice each**; Python silently uses the last definition, so the first pair (~60 lines) was unreachable dead code that misled readers (the first `get_queryset` looked like it applied list optimisations — it never ran). Removed.

## Q4 🟠 `print()` in registration/payment/email paths — ✅ Fixed

`accounts/serializers.py` printed registration exceptions **and full tracebacks** to stdout; `payments/services.py` printed fulfillment failures; `applications/email_service.py` / `zoom_service.py` printed attachment and Zoom API errors. All converted to `logger` calls (`logger.exception` on the critical paths). Combined with the earlier EH1 work, the backend now has **zero `print()` in production code paths** (scratch scripts excluded).

## Q5 🟡 Money fields lack validation — ⬜ Pending

- `Wallet.balance` can go **negative** via `AdminWalletActionView`/`manage` DEBIT (no floor check). May be intentional (clawbacks) — decide, then either add a guard or a code comment stating negative balances are allowed.
- Money `DecimalField`s (`hourly_rate`, `fee_amount`, amounts) have no `MinValueValidator(0)` — nothing stops a negative rate at the model layer.
- `WithdrawalRequestView` should be checked for double-submission (two pending withdrawals exceeding balance).

**Recommendation:** add `MinValueValidator` to money fields + a `clean()`/view guard on debits; one focused pass with tests.

## Q6 🟡 Duplicated file-URL serialisation logic — ⬜ Pending

The "string-or-FileField-or-http-URL" resolution logic is written three times: `LiteTutorSerializer.get_image`, `TutorProfileSerializer` (image/video/recitation methods), and `admin_list`'s inline `safe_url`. Extract one `resolve_media_url(field, request=None)` helper in `tutors/serializers.py` and reuse.

## Q7 🟡 Tutor registration bypasses serializer validation — ⬜ Pending

`TutorViewSet.register` builds the `User` + `TutorProfile` inline (~80 lines) with hand-rolled checks, while student registration goes through `RegisterSerializer`. Inconsistent and easy to drift (e.g., email normalisation differs). Recommendation: move to a `TutorRegisterSerializer`; keep the endpoint contract identical.

## Q8 🟢 Minor debris

- `backend/query/` — empty directory; delete.
- `TutorProfile.intro_video_url` marked "Legacy URL field" — verify unused and schedule removal with a migration.
- Every file starts with `# type: ignore / # pyre-ignore-all-errors / # pylint: skip-file`, disabling all static analysis. Long-term: adopt `ruff` with a minimal rule set and strip these headers gradually (new files first).
- `accounts.Notification.create()` static method shadows the manager-style name; harmless but confusing — prefer `Notification.objects.create` at call sites (already the dominant pattern).
