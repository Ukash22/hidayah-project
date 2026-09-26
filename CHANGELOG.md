# Hidayah Project — Change Log

**Branch:** `updated`
**Date:** 26 September 2026

---

## 1. Student Registration — Adult Level Added
**Files:** `frontend/src/pages/Register.jsx`, `RegisterStep2.jsx`, `RegisterStep3.jsx`
- Added **Adult** as a selectable level option in the student registration flow alongside Primary, Secondary, etc.

---

## 2. Scheme of Work (Tutor Feature)
**Backend:** `backend/classes/models.py|serializers.py|views.py|urls.py`
**Migration:** `backend/classes/migrations/0014_schemeofwork.py`
**Frontend:** `frontend/src/components/SchemeOfWork/`, `TutorSchedule.jsx`, `StudentProgress.jsx`

### What was added
- New `SchemeOfWork` database model (tutor, title, description, week_number, is_completed)
- API endpoints: GET / POST / PATCH / DELETE at `/api/classes/scheme-of-work/`
- **Tutor side:** Green Scheme button on every session card opens a modal where tutors can:
  - Add weekly topics
  - Tick topics as Complete (green) or Incomplete (grey)
  - See a progress bar showing completion percentage
  - Delete topics
- **Student side:** "My Scheme of Work" section on the Progress page (read-only view)

---

## 3. Live Classroom — Mobile + Desktop Responsive Fix
**File:** `frontend/src/pages/LiveClassRoom.jsx` (full rewrite)

- **Mobile:** Tab switcher at top lets users toggle between Board and Video (each full-screen)
- **Desktop:** Side-by-side whiteboard + video panel with collapse/expand handle
- Uses `h-[100dvh]` for correct mobile viewport (avoids browser chrome overlap)
- Gallery mode fills full screen with video grid

---

## 4. Whiteboard — Multi-Page Support
**File:** `frontend/src/components/Whiteboard/ExcalidrawWhiteboard.jsx`

- Page navigation bar above the canvas: prev/next arrows, numbered page buttons, add page button, page counter
- Each page stores its own drawing elements independently
- Current page auto-saved when switching pages
- JWT token appended to WebSocket URL for authentication on all devices

---

## 5. Live Video (WebRTC) — Mobile Responsive + Auth Fix
**File:** `frontend/src/components/LiveClass/WebRTCVideoChat.jsx`

- JWT access token included in signaling WebSocket URL (`?token=...`)
- Responsive controls bar: smaller buttons on mobile, grow on desktop
- Video tiles sized properly per device
- Gallery mode uses responsive CSS grid

---

## 6. Backend WebSocket Consumers — Full Fix
**File:** `backend/whiteboard/consumers.py`

- JWT token authentication via query string (works on mobile and all devices)
- Robust try/except on all group_add, group_discard, and JSON parsing
- All message types forwarded (not just `command` and `draw`)
- Both BoardConsumer and SignalingConsumer updated

---

## 7. WebSocket URL Routing Fix
**File:** `backend/whiteboard/routing.py`

- Pattern now accepts both `/ws/board/...` and `/board/...` path formats
- Prevents 404 WebSocket errors from URL variation across devices

---

## 8. Student Profile Fix
**File:** `backend/students/models.py`

- StudentProfile now uses `update_or_create` to prevent duplicate profile errors on re-registration

---

## Files Changed Summary

| File | Change |
|---|---|
| backend/classes/models.py | Added SchemeOfWork model |
| backend/classes/serializers.py | Added SchemeOfWorkSerializer |
| backend/classes/views.py | Added SchemeOfWorkViewSet |
| backend/classes/urls.py | Registered scheme-of-work endpoint |
| backend/classes/migrations/0014_schemeofwork.py | DB migration |
| backend/core/settings.py | Configuration updates |
| backend/students/models.py | update_or_create fix |
| backend/whiteboard/consumers.py | JWT auth + robust error handling |
| backend/whiteboard/routing.py | Flexible URL pattern |
| frontend/src/pages/Register.jsx | Adult level added |
| frontend/src/pages/register/RegisterStep2.jsx | Adult level added |
| frontend/src/pages/register/RegisterStep3.jsx | Adult level added |
| frontend/src/pages/AccountSettings.jsx | Minor UI fixes |
| frontend/src/pages/LiveClassRoom.jsx | Full rewrite — mobile + desktop layout |
| frontend/src/pages/tutor/TutorSchedule.jsx | Scheme of Work modal |
| frontend/src/pages/student/StudentProgress.jsx | Scheme of Work student view |
| frontend/src/components/SchemeOfWork/ | New component directory |
| frontend/src/components/Whiteboard/ExcalidrawWhiteboard.jsx | Multi-page + JWT WebSocket |
| frontend/src/components/LiveClass/WebRTCVideoChat.jsx | JWT WebSocket + mobile responsive |
