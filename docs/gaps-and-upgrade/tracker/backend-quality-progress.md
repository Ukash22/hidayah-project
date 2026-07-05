# Backend Code Quality Audit — Progress Tracker

Tracks implementation against [backend-quality-audit.md](../items/backend-quality-audit.md).

---

## Phase Q-A — Fixed during audit ✅

| # | Item | File | Status |
|---|---|---|---|
| 1 | Untrack `backend/scratch/` (DB dumps with user PII) + `.gitignore` | `.gitignore` | ✅ Done — history purge deferred while repo is private |
| 2 | Consolidate Notification models: `link` field added to `accounts.Notification` (migration 0005), 4 writers switched — admin notifications now actually visible | `accounts/models.py`, `classes/scheduler.py`, `students/views.py`, `exams/views.py` | ✅ Done |
| 3 | Remove dead shadowed `by_subject`/`get_queryset` (~60 lines) | `backend/tutors/views.py` | ✅ Done |
| 4 | Convert remaining `print()` to logger (registration serializer, payment fulfillment, email/zoom services) | `accounts/serializers.py`, `payments/services.py`, `applications/email_service.py`, `applications/zoom_service.py` | ✅ Done |

## Phase Q-B — Money-field validation ✅ Complete

**Decision (2026-07): negative wallet balances are ALLOWED** — intentional clawback mechanism for over-payments. Recorded as code comments at both debit sites and on `Wallet.balance`.

| # | Item | Status |
|---|---|---|
| 5 | Negative balances allowed — documented at `Wallet.balance`, `AdminWalletActionView` DEDUCTION, and `TutorViewSet.manage` DEBIT | ✅ Done |
| 6 | `MinValueValidator(0)` on `Payment.amount`, `Transaction.amount`, `Withdrawal.amount`, `TutorProfile.hourly_rate`, `ScheduledSession.fee_amount`/`commission_amount` (deliberately NOT on `Wallet.balance`) + migrations (payments/0008, tutors/0012, classes/0012) | ✅ Done |
| 7 | Withdrawal requests now reserve pending amounts: `balance − pending_total ≥ amount` required | ✅ Done |
| 7b | Tests: over-balance rejected, pending reservation enforced, admin debit-to-negative allowed (48 tests total, all green) | ✅ Done |

## Phase Q-C — Consolidation ⬜ Pending (opportunistic)

| # | Item | Status |
|---|---|---|
| 8 | `resolve_media_url()` + `TutorMediaFieldsMixin` — 3 duplicated implementations collapsed; `admin_list.safe_url` reuses it; never raises on misconfigured storage | ✅ Done |
| 9 | `TutorRegisterSerializer` — validation/creation extracted from the ~80-line view; legacy `{'detail': msg}` contract preserved; 3 registration tests added | ✅ Done |
| 10 | `notifications` app retired: model removed, migration `0002_delete_notification` drops the orphan table (app stays in INSTALLED_APPS only for migration history) | ✅ Done |
| 11 | Stray `backend/query` file deleted · `intro_video_url` **verified still in use** (video URL fallback + update handler — NOT removable) · remaining: gradual lint-header removal + ruff | 🟨 Partial |
