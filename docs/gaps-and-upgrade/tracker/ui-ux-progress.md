# Refactor Progress Tracker

Tracks implementation progress against the UI/UX audit (`ui-ux-audit.md`) and page architecture plan (`page-architecture.md`).

---

## Phase 1 — Critical Bugs ✅ Complete

All low-effort, high-impact fixes. No design decisions required.

| # | Item | File(s) | Status |
|---|---|---|---|
| 1 | Double `<Navbar />` in ExamHub | `pages/ExamHub.jsx:70` | ✅ Done |
| 2 | "Powered by Gemini" mislabel | `components/Navbar.jsx:121` | ✅ Done — changed to "Powered by AI" |
| 3 | Stack trace exposed in Admin error boundary | `pages/AdminDashboard.jsx:40` | ✅ Done — stack hidden behind `import.meta.env.DEV` |
| 4 | `alert()` for CBT submission failure | `pages/CBTInterface.jsx:142` | ✅ Done — replaced with inline `submitError` state + banner |
| 5 | Input borders invisible at rest | `src/index.css` | ✅ Done — global base style: `slate-300` at rest, `primary` + focus ring on focus |

---

## Phase 2 — Design Tokens & Shared UI Library ✅ Complete

Foundation work — all later phases consume these.

### Design Tokens (`src/index.css @theme`)

| Token group | What was added |
|---|---|
| Brand | `primary-dark`, full primary/secondary set |
| Surfaces | `surface-raised`, `surface-overlay`, `border`, `border-focus` |
| Text | `text-muted`, `text-subtle`, `text-inverse` |
| Status | `success`, `warning`, `danger`, `info` — each with `-light` variant |
| Shadows | `shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-xl` |

### UI Component Library (`src/components/ui/`)

| Component | File | Variants / Features |
|---|---|---|
| `Button` | `Button.jsx` | `primary`, `secondary`, `ghost`, `danger`, `outline`; `sm/md/lg`; loading spinner |
| `Input` | `Input.jsx` | Label, error, hint, accessible `aria-*` wiring |
| `Badge` | `Badge.jsx` | `default`, `primary`, `success`, `warning`, `danger`, `info` |
| `Alert` | `Alert.jsx` | `info`, `success`, `warning`, `error`; icon + dismissible |
| `Modal` | `Modal.jsx` | Framer-motion entrance; Escape-to-close; body scroll lock; `sm/md/lg/xl/full` sizes |
| `Skeleton` | `Skeleton.jsx` | `Skeleton`, `SkeletonCard`, `SkeletonTable`, `SkeletonText` |
| `EmptyState` | `EmptyState.jsx` | Icon + title + description + optional CTA |
| Barrel export | `index.js` | `import { Button, Modal, ... } from '@/components/ui'` |

---

## Phase 3 — Dashboard Standardisation ✅ Complete

| # | Item | File(s) | Status |
|---|---|---|---|
| 1 | Tab URL sync — Student | `pages/StudentDashboard.jsx` | ✅ Done — `useSearchParams` replaces manual `window.location.search` |
| 2 | Tab URL sync — Tutor | `pages/TutorDashboard.jsx` | ✅ Done — `useSearchParams` replaces bare `location.search` |
| 3 | Tab URL sync — Admin | `pages/AdminDashboard.jsx` | ✅ Done — was plain `useState('overview')`, no URL at all |
| 4 | Admin `brandColor` | `pages/AdminDashboard.jsx:1376` | ✅ Done — `emerald` → `blue` |
| 5 | `LoadingOverlay` theme | `App.jsx` | ✅ Done — dark emerald → white + primary blue |
| 6 | 404 page | `pages/NotFound.jsx` | ✅ Done — replaces silent redirect to `/` |
| 7 | Terms of Service page | `pages/TermsOfService.jsx` | ✅ Done — routed at `/terms` |
| 8 | Privacy Policy page | `pages/PrivacyPolicy.jsx` | ✅ Done — routed at `/privacy` |
| 9 | DashboardLayout nav typography | `components/DashboardLayout.jsx` | ✅ Done — `font-black uppercase tracking-wider` → `font-semibold` on all nav/footer buttons |

---

## Phase 4 — Accessibility & Forms ✅ Complete

| # | Item | File(s) | Status |
|---|---|---|---|
| 1 | `aria-label` on icon-only buttons | `DashboardLayout.jsx` | ✅ Done — hamburger + theme toggle buttons labelled |
| 2 | Focus ring — global base style | `index.css` (Phase 1) + input `outline-none` removed in Login | ✅ Done |
| 3 | CBT radio buttons — native `<input type="radio">` | `pages/CBTInterface.jsx` | ✅ Done — rewritten as `<fieldset>` + `<legend>` + `<input type="radio">` + `<label>`, keyboard-navigable |
| 4 | Password show/hide toggle | `pages/Login.jsx` | ✅ Done — Eye/EyeOff toggle with `aria-label` |
| 5 | Empty states — NotificationCenter | `components/NotificationCenter.jsx` | ✅ Done — uses `EmptyState` component |
| 6 | Empty states — TutorDashboard trial sessions | `pages/TutorDashboard.jsx` | ✅ Done — uses `EmptyState` component |
| 7 | Empty states — StudentDashboard library | `pages/StudentDashboard.jsx` | ✅ Done — uses `EmptyState` with conditional locked/empty messaging + CTA |

### Deferred to Phase 5
- Password show/hide in Register.jsx and TutorRegister.jsx (many fields — done as part of shared `Input` component adoption)
- `aria-label` audit of remaining icon buttons across all pages

---

## Phase 5 — Performance & Polish ✅ Complete

| # | Item | File(s) | Status |
|---|---|---|---|
| 1 | Split AdminDashboard into lazy sub-panels | `pages/AdminDashboard.jsx` | ⏭ Deferred — handled in Page Architecture refactor |
| 2 | Per-route `<title>` tags | `Login`, `Register`, `ExamHub`, `AIHub`, `AdminDashboard`, `TutorDashboard`, `StudentDashboard`, `NotFound`, `TermsOfService`, `PrivacyPolicy` | ✅ Done — React 19 native `<title>` hoisting |
| 3 | Remove unused `framer-motion` imports | Multiple files | ✅ Audited — `AnimatePresence` is genuinely used in all files; no dead imports found |
| 4 | Dynamic-import jsPDF | `AdminDashboard.jsx`, `PaymentCallback.jsx`, `TutorWallet.jsx` | ✅ Done — static imports removed; `await import('jspdf')` inside each handler function |
| 5 | Public tutor profile route `/tutors/:id` | `pages/TutorProfile.jsx` (new) | ✅ Done — fetches `GET /api/tutors/{id}/` (public); displays bio, subjects, languages, availability, booking CTA |
| 6 | Post-registration onboarding | `pages/PendingApproval.jsx` | ✅ Done — existing onboarding steps preserved; added Terms/Privacy footer links |

---

## Not Started — Page Architecture Refactor

Tracked separately in `page-architecture.md`. This is the next major workstream after Phase 5.

| Portal | Status |
|---|---|
| Admin shell + nested routes | ⬜ Pending |
| Tutor shell + nested routes | ⬜ Pending |
| Student shell + nested routes | ⬜ Pending |
| Parent shell + nested routes | ⬜ Pending |
