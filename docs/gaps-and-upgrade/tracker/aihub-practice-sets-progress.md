---
id: "#18"
title: AIHub — Save to Practice Sets
status: complete
---

## Tasks

| ID  | Task                                      | Status |
|-----|-------------------------------------------|--------|
| P-1 | `PracticeSet` model + migration           | ✅     |
| P-2 | `PracticeSetView` (GET / POST / DELETE)   | ✅     |
| P-3 | URL wiring in `ai_engine/urls.py`         | ✅     |
| P-4 | AIHub.jsx — save modal + My Sets view     | ✅     |
| P-5 | Delete from My Sets                       | ✅     |
| P-6 | Review mode (correct answers highlighted) | ✅     |

## Verification Checklist

- [ ] Generate questions → "Save to My Sets" button appears in sidebar
- [ ] Click save → modal opens with pre-filled title
- [ ] Edit title → save → toast "Saved to My Practice Sets."
- [ ] Click "My Sets" in header → count badge appears
- [ ] My Sets view shows saved set with subject · exam type · Q count
- [ ] Click set → review panel loads questions with green answers
- [ ] Delete set → removed from list; toast confirms
- [ ] Submit answers then save → save still works post-submission
