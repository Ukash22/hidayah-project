# Library Type Filter — Findings

Feature #14. The Student Library showed all materials in a single undifferentiated grid. `material_type` was displayed as a small label on each card but couldn't be used to filter. A student looking for a specific video or PDF had to scroll the entire list.

Severity: 🟡 polish / UX improvement

---

## Finding

| # | Finding | Location | Sev |
|---|---|---|---|
| L-1 | No type filter on the materials grid despite `material_type` being known per item | `pages/student/StudentLibrary.jsx` | 🟡 |
| L-2 | `TypeIcon` fell through to `<IconMusic>` for LINK type — wrong icon | `pages/student/StudentLibrary.jsx` | 🟡 |

---

## Fix

### Filter chips
A row of filter chips renders above the grid when more than one type is present in the library. Each chip shows the type icon, label, and a count badge. Clicking a chip sets `typeFilter` state; clicking "All" clears it. Chips are dynamically generated — only types that actually exist in the fetched data are shown (no empty chips for types with zero materials).

### Filter composition
`filtered` is now the intersection of both filters:
```
matchesSearch && matchesType
```
Clearing a search while a type filter is active (or vice versa) works independently.

### TypeIcon fix
`LINK` material type now returns `<IconLink className="text-emerald-600" />` instead of falling through to the Music icon.

### Clear filters
The empty-state "Clear filters" action resets both `search` and `typeFilter` in one click. The message also mentions the active type: *"No PDF materials matching 'algebra'."*

### Types supported
VIDEO · PDF · AUDIO · LINK
