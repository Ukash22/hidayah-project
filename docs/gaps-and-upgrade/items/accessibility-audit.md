# Accessibility Audit (Deep) — Findings

Audit #7 from the [audit index](../audit-index.md). Scope: WCAG 2.1 AA — contrast, keyboard navigation, screen reader support, focus management.

Baseline notes: earlier UI/UX audit phases already fixed `lang="en"`, icon-button `aria-label`s in portal shells, and modal input `id`/`name` attributes. Sweeps found **zero** `<img>` without `alt` and **zero** `onClick` on non-interactive `<div>`s — cleaner than typical.

Severity: 🟠 High · 🟡 Medium · 🟢 Low

---

## AY1 🟠 Modal focus management — ✅ Fixed

`Modal.jsx` had `role="dialog"`/`aria-modal`/Escape but no focus trap: keyboard focus stayed on the page behind the dialog, and closing didn't restore focus (WCAG 2.4.3).

**Fixed:** panel receives focus on open (`tabIndex={-1}`), Tab/Shift+Tab cycle within the dialog, and focus returns to the previously focused element on close. `ConfirmDialog` inherits all of this since it renders through `Modal`.

## AY2 🟠 Toasts invisible to screen readers — ✅ Fixed

The toast stack had no live region — success/error feedback was never announced (WCAG 4.1.3).

**Fixed:** stack container is `role="status" aria-live="polite"`; error toasts additionally get `role="alert"` for assertive announcement.

## AY3 🟠 Keyboard focus indicator missing on most controls — ✅ Fixed (fallback)

133 uses of `outline-none` vs 96 `focus:*` replacements — most buttons/links had **no visible focus state** (WCAG 2.4.7).

**Fixed (global fallback):** `:focus-visible { outline: 2px solid var(--color-primary-light) }` in `index.css`. Affects keyboard navigation only; mouse/touch behaviour unchanged. Component-level `focus:ring` styles can still refine this per-control.

## AY4 🟡 Reduced motion not respected — ✅ Fixed

Framer-motion animations (page transitions, cards, modals) played regardless of OS "reduce motion" setting (WCAG 2.3.3).

**Fixed:** `<MotionConfig reducedMotion="user">` wraps the app — all framer-motion transform/layout animations are automatically disabled when the user's OS requests reduced motion. CSS `scroll-behavior: smooth` also reverts to `auto` under the same media query.

## AY5 🟡 Form labels not programmatically associated — ⬜ Pending

159 `<label>` elements but only 13 `htmlFor` attributes. The repeated `Field` component pattern renders `<label>` and `<input>` as siblings with no association — screen readers announce inputs without names, and clicking the label doesn't focus the field (WCAG 1.3.1 / 3.3.2).

**Fix pattern (apply to each local `Field` component):** wrap the control inside the label —

```jsx
const Field = ({ label, children }) => (
    <label className="flex flex-col gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 ml-1">{label}</span>
        {children}
    </label>
);
```

Wrapping avoids generating ids. Priority order: Register steps (`pages/register/`), Login, TutorRegister fields, then portal modals.

## AY6 🟡 Contrast: `text-slate-400` micro-labels — ⬜ Pending (design decision)

**420 occurrences** of `text-slate-400` (#94a3b8 ≈ **2.8:1** on white — fails AA's 4.5:1) used for 8–10px bold uppercase labels throughout every portal. `text-slate-500` (#64748b ≈ **4.75:1**) passes and is visually near-identical in this design.

**Recommendation:** a scoped find/replace `text-slate-400` → `text-slate-500` **on text elements only** (not border/placeholder utilities) — do it per-portal with visual spot-checks rather than one blind global replace. Also consider raising the 8px (`text-[8px]`) micro-copy to 10px minimum; 8px is effectively unreadable for low-vision users regardless of contrast.

## AY7 🟢 Remaining smaller items — ⬜ Pending

- **Skip link:** no "skip to content" anchor; keyboard users tab through the whole sidebar on every page. Add one link in the portal shells targeting the main content region.
- **Icon-button stragglers:** 21 `aria-label`s exist after the earlier audit; sweep `components/Whiteboard/` and `components/LiveClass/` (toolbars, mic/cam toggles) for any remaining unlabelled icon buttons.
- **Heading hierarchy:** PageHeader renders titles consistently, but sub-sections vary between `h2`–`h4` arbitrarily; harmless for AA, tidy opportunistically.
