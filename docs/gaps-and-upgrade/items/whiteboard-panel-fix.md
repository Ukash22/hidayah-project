# Whiteboard Panel Clipping — Findings

Bug #W-1. The three slide-out panels in the Whiteboard (Math Tools, Library, Exam) were clipped — the bottom portion of each panel was hidden and the scroll handle disappeared on shorter screens.

Severity: 🔴 broken / content unreachable

---

## Symptom

Opening any whiteboard side-panel (Math Tools, Library, Exam) on a screen shorter than ~900 px caused the panel to be cut off before its bottom edge. The inner scroll handle was invisible and inaccessible.

---

## Root Cause

All three panels used `position: absolute` with a `bottom-24` (96 px) constraint:

```
absolute left-4 top-20 bottom-24 w-80 …
```

`absolute` positioning is relative to the nearest positioned ancestor — the Whiteboard container element. That container's height varies by viewport and by the surrounding shell layout. On shorter screens, `bottom-24` forced the panel's bottom edge 96 px above the container's bottom, eating into visible content area.

---

## Findings

| # | File | Line (approx.) | Problem |
|---|---|---|---|
| W-1 | `frontend/src/components/Whiteboard/MathToolsPanel.jsx` | 226 | `absolute … bottom-24` — panel clipped on short screens |
| W-2 | `frontend/src/components/Whiteboard/LibraryPanel.jsx` | 126 | same |
| W-3 | `frontend/src/components/Whiteboard/ExamPanel.jsx` | 125 | same |

---

## Fix

Change to `position: fixed` with `bottom-4` (16 px) clearance:

```
fixed left-4 top-20 bottom-4 w-80 …
```

`fixed` is always relative to the viewport, so the bottom edge is predictably 16 px above the screen edge regardless of how the whiteboard container is sized. The Excalidraw toolbar is itself `fixed`, so no overlap occurs. The panel's inner `flex-1 overflow-y-auto` already handles content scrolling — the fix only changes how the panel is anchored.

---

## Why Not Increase Container Height?

Tying the panel height to the container requires a resize observer and still fails when the whiteboard is embedded in a differently-sized shell. `fixed` + viewport clearance is unconditional and needs no JS.
