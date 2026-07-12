# Accessibility Audit (Deep) — Progress Tracker

Tracks implementation against [accessibility-audit.md](../items/accessibility-audit.md).

---

## Phase AY-A — Screen reader & keyboard foundations ✅ Complete

| # | Item | File | Status |
|---|---|---|---|
| 1 | Modal focus trap + initial focus + focus restore (covers ConfirmDialog) | `frontend/src/components/ui/Modal.jsx` | ✅ Done |
| 2 | Toast live region (`role="status" aria-live="polite"`, errors `role="alert"`) | `frontend/src/components/ui/Toast.jsx` | ✅ Done |
| 3 | Global `:focus-visible` outline fallback | `frontend/src/index.css` | ✅ Done |
| 4 | `<MotionConfig reducedMotion="user">` + reduced-motion scroll behaviour | `frontend/src/App.jsx`, `index.css` | ✅ Done |

## Phase AY-B — Form label association ✅ Complete (priority scope)

| # | Item | Scope | Status |
|---|---|---|---|
| 5 | Register steps (`Field` now a wrapping `<label>`) + Login (`htmlFor` + ids) | `pages/register/`, `pages/Login.jsx` | ✅ Done |
| 6 | TutorRegister: ExperienceFields, TechnicalFields, AvailabilityManager (per-slot ids); AccountFields + ProfileFields already had `htmlFor` | `components/TutorRegister/` | ✅ Done |
| 7 | Modals: Withdrawal (ids added), Reschedule + Complaint (`htmlFor` to existing ids) | `components/` | ✅ Done |
| 7b | +26 more associated via scripted pass (labels whose control has a `name`/`id`) — remainder are controls with no name attribute; associate opportunistically | portal pages | ⏳ Ongoing |

## Phase AY-C — Contrast pass ✅ Complete (visual spot-check recommended)

| # | Item | Scope | Status |
|---|---|---|---|
| 8 | `text-slate-400` → `text-slate-500`: **405 replaced** across 70 files; 14 dark-surface lines (live-class/whiteboard toolbars, drawer — identified by `hover:text-white`/dark-bg on the same line) correctly left at slate-400, plus 1 `hover:` variant | all portals | ✅ Done |
| 9 | `text-[8px]` → `text-[10px]`: all 37 occurrences | all portals | ✅ Done |

> Visual spot-check suggested on: portal stat cards (tiny italic captions were 8px, now 10px — check for wrapping in tight badges) and any custom dark cards not caught by the line-level heuristic.

## Phase AY-D — Smaller items ✅ Complete

| # | Item | Scope | Status |
|---|---|---|---|
| 10 | Skip-to-content link in `DashboardShell` (covers all four portals); `<main id="main-content" tabIndex={-1}>` target | `components/layout/DashboardShell.jsx` | ✅ Done |
| 11 | aria-labels added to 8 icon-only buttons: panel closes (Exam/Library/MathTools), board clear + download (Excalidraw), chat close + send (WebRTC) | `components/Whiteboard/`, `components/LiveClass/` | ✅ Done |
