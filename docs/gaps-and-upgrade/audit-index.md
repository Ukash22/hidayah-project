# Hidayah — Audit Index

Master list of all audits run against the platform. Each audit produces an **items file** (findings) and a **tracker file** (implementation progress).

---

## Completed Audits

| # | Audit | Status | Items | Tracker |
|---|---|---|---|---|
| 1 | UI/UX Audit | ✅ Phases 1–5 complete | [ui-ux-audit.md](items/ui-ux-audit.md) | [ui-ux-progress.md](tracker/ui-ux-progress.md) |
| 2 | Page Architecture | ✅ Phases A–E complete | [page-architecture.md](items/page-architecture.md) | [page-architecture-progress.md](tracker/page-architecture-progress.md) |
| 3 | Security Audit | ✅ S1–S3 complete · S4 pending | [security-audit.md](items/security-audit.md) | [security-audit-progress.md](tracker/security-audit-progress.md) |
| 4 | Performance Audit | ✅ P1–P8 complete | [performance-audit.md](items/performance-audit.md) | [performance-audit-progress.md](tracker/performance-audit-progress.md) |
| 5 | Error Handling Audit | ✅ All phases complete (3 low-priority pages deferred) | [error-handling-audit.md](items/error-handling-audit.md) | [error-handling-progress.md](tracker/error-handling-progress.md) |
| 6 | API Contract Audit | ✅ All phases complete (endpoint annotation + `asList` adoption ongoing/opportunistic) | [api-contract-audit.md](items/api-contract-audit.md) | [api-contract-progress.md](tracker/api-contract-progress.md) |
| 7 | Accessibility Audit (Deep) | ✅ All phases complete (remaining inline-label association is opportunistic) | [accessibility-audit.md](items/accessibility-audit.md) | [accessibility-progress.md](tracker/accessibility-progress.md) |

---

## Pending Audits

| # | Audit | Scope | Priority |
|---|---|---|---|
| 8 | Mobile / Capacitor Audit | Capacitor config, Android/iOS viewport behaviour, native plugin usage, offline behaviour, push notification wiring | 🟡 Medium |
| 9 | Backend Code Quality Audit | Duplicate logic across views, missing model validation, raw SQL strings, inconsistent serializer patterns, unused models/fields | 🟢 Low |
| 10 | Test Coverage Audit | What has tests, what doesn't, critical paths with zero coverage (payments, auth, session scheduling) | 🟢 Low |

---

## How to Run an Audit

1. Decide on the audit scope from the Pending table above.
2. Run an Explore subagent across the relevant codebase area.
3. Create `items/<audit-name>.md` — findings with file:line, problem, and fix for each item.
4. Create `tracker/<audit-name>-progress.md` — phased implementation plan.
5. Add a row to this index under **Completed Audits**.
