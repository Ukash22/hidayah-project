---
id: "#18"
title: AIHub — Save to Practice Sets
date: 2026-07-31
status: implemented
---

## Finding

After a student generates and attempts AI questions, there was no way to save those questions for future review. Students would need to regenerate the same topics repeatedly.

## Solution

Added a `PracticeSet` model that lets any student save a batch of AI-generated questions under a custom title, then review them later with correct answers highlighted.

## Backend

- `backend/ai_engine/models.py` — `PracticeSet(owner, title, subject_name, exam_type, questions: JSONField, created_at)`
- `backend/ai_engine/migrations/0002_practiceset.py` — manual migration
- `backend/ai_engine/views.py` — `PracticeSetView`: GET list, POST create, DELETE own set
- `backend/ai_engine/urls.py` — routes: `practice-sets/`, `practice-sets/<pk>/`

## Frontend

- `frontend/src/pages/AIHub.jsx` — "My Sets" toggle in page header; save modal (pre-filled title); practice set list with delete; review panel with correct answers highlighted

## Design Decisions

- `questions` stored as `JSONField` (denormalized) — avoids linking to the ephemeral `AIGeneratedQuestion` record
- `subject_name` is a plain string (no FK) — immune to subject deletion or renaming
- Save is available both before and after submitting answers
- Review mode is read-only (all correct answers shown, no scoring)
