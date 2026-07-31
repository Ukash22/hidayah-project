# Hidayah — Audit Index

Master list of all audits run against the platform. Each audit produces an **items file** (findings) and a **tracker file** (implementation progress).

---

## Completed Audits

| # | Audit | Status | Items | Tracker |
|---|---|---|---|---|
| 1 | UI/UX Audit | ✅ Phases 1–5 complete | [ui-ux-audit.md](items/ui-ux-audit.md) | [ui-ux-progress.md](tracker/ui-ux-progress.md) |
| 2 | Page Architecture | ✅ Phases A–E complete | [page-architecture.md](items/page-architecture.md) | [page-architecture-progress.md](tracker/page-architecture-progress.md) |
| 3 | Security Audit | ✅ S1–S4 complete (S4: httpOnly refresh cookie + in-memory access token) | [security-audit.md](items/security-audit.md) | [security-audit-progress.md](tracker/security-audit-progress.md) |
| 4 | Performance Audit | ✅ P1–P8 complete | [performance-audit.md](items/performance-audit.md) | [performance-audit-progress.md](tracker/performance-audit-progress.md) |
| 5 | Error Handling Audit | ✅ All phases complete (3 low-priority pages deferred) | [error-handling-audit.md](items/error-handling-audit.md) | [error-handling-progress.md](tracker/error-handling-progress.md) |
| 6 | API Contract Audit | ✅ All phases complete (endpoint annotation + `asList` adoption ongoing/opportunistic) | [api-contract-audit.md](items/api-contract-audit.md) | [api-contract-progress.md](tracker/api-contract-progress.md) |
| 7 | Accessibility Audit (Deep) | ✅ All phases complete (remaining inline-label association is opportunistic) | [accessibility-audit.md](items/accessibility-audit.md) | [accessibility-progress.md](tracker/accessibility-progress.md) |
| 8 | Mobile / Capacitor Audit | ✅ App-breaking fixes (CORS, media permissions, viewport) done · payment-flow + store-prep decisions deferred to publish stage | [mobile-capacitor-audit.md](items/mobile-capacitor-audit.md) | [mobile-capacitor-progress.md](tracker/mobile-capacitor-progress.md) |
| 9 | Backend Code Quality Audit | ✅ Q-A + Q-B complete (money validation, withdrawal reservation, negative-balance policy) · Q-C opportunistic | [backend-quality-audit.md](items/backend-quality-audit.md) | [backend-quality-progress.md](tracker/backend-quality-progress.md) |
| 10 | Test Coverage Audit | ✅ Baseline 48% measured · money-path + registration tests added (63 total) · T-B gaps ranked, testing policy adopted | [test-coverage-audit.md](items/test-coverage-audit.md) | [test-coverage-progress.md](tracker/test-coverage-progress.md) |
| 11 | UI Deep Dive (screen-by-screen) | ✅ D-1–D-4 complete — bugs fixed, high-value items shipped, consistency sweep done, feature investments delivered (parent portal, student progress, homepage conversion) | [ui-deep-dive.md](items/ui-deep-dive.md) | [ui-deep-dive-progress.md](tracker/ui-deep-dive-progress.md) |

---

## Feature Implementations

| # | Feature | Status | Items | Tracker |
|---|---|---|---|---|
| 12 | Batch / Study Groups | ✅ B-1–B-4 complete (backend, admin, tutor, student portals) · F-1–F-4 deferred | [batch-study-groups.md](items/batch-study-groups.md) | [batch-study-groups-progress.md](tracker/batch-study-groups-progress.md) |
| 13 | Exam Enrollment Self-Edit | ✅ E-1–E-2 complete (PATCH endpoint + AccountSettings card for students) | [exam-enrollment-self-edit.md](items/exam-enrollment-self-edit.md) | [exam-enrollment-progress.md](tracker/exam-enrollment-progress.md) |
| 14 | Library Type Filter | ✅ L-1 complete — chips, composed filters, TypeIcon LINK fix | [library-type-filter.md](items/library-type-filter.md) | [library-type-filter-progress.md](tracker/library-type-filter-progress.md) |
| 15 | Tutor Earnings Chart | ✅ T-1 complete — monthly bar chart, 6M/12M toggle, useMemo derivation | [tutor-earnings-chart.md](items/tutor-earnings-chart.md) | [tutor-earnings-chart-progress.md](tracker/tutor-earnings-chart-progress.md) |
| 16 | Platform Announcement Broadcast | ✅ A-1–A-2 complete — bulk_create endpoint + AdminSettings form | [platform-announcement.md](items/platform-announcement.md) | [platform-announcement-progress.md](tracker/platform-announcement-progress.md) |
| 17 | Tutor Request Decline-with-Reason | ✅ D-1–D-2 complete — student notification + decline modal replaces window.prompt | [tutor-request-decline.md](items/tutor-request-decline.md) | [tutor-request-decline-progress.md](tracker/tutor-request-decline-progress.md) |
| 18 | AIHub — Save to Practice Sets | ✅ P-1–P-6 complete — PracticeSet model, API, save modal, My Sets review view | [aihub-practice-sets.md](items/aihub-practice-sets.md) | [aihub-practice-sets-progress.md](tracker/aihub-practice-sets-progress.md) |

## Bug Fixes

| # | Bug | Status | Findings | Tracker |
|---|---|---|---|---|
| W-1 | Whiteboard panel clipping (`absolute`/`bottom-24` → `fixed`/`bottom-4`) | ✅ All 3 panels fixed (MathToolsPanel, LibraryPanel, ExamPanel) | [whiteboard-panel-fix.md](items/whiteboard-panel-fix.md) | [whiteboard-panel-progress.md](tracker/whiteboard-panel-progress.md) |

## Pending Audits

None — all ten audits are complete. Remaining work lives in the individual trackers (opportunistic items) and the publish-stage deferrals noted in the README.

---

## How to Run an Audit

1. Decide on the audit scope from the Pending table above.
2. Run an Explore subagent across the relevant codebase area.
3. Create `items/<audit-name>.md` — findings with file:line, problem, and fix for each item.
4. Create `tracker/<audit-name>-progress.md` — phased implementation plan.
5. Add a row to this index under **Completed Audits**.
