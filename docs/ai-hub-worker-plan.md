# Question Engine — Full Implementation Plan

This plan covers the AI Hub, Exam Practice, and JAMB CBT features as a unified **Question Engine**: a stateless FastAPI worker backed by Redis (session cache, question cache, Celery broker) with Django as the auth/wallet/storage gateway.

---

## What changes and what stays

| Concern | Before | After |
|---------|--------|-------|
| AI question generation | Django calls OpenAI in-process (blocks worker thread) | FastAPI worker calls OpenAI async |
| Exam practice questions | Django DB → browser, timer in JS only | Django DB → Redis cache → worker serves; CBT session in Redis |
| JAMB CBT session | JS timer only, no recovery on refresh | Redis session (server-side timer, browser-crash recovery) |
| PDF ingestion | Not implemented | Async Celery job: upload → AI parse → admin review → publish |
| Past question bank | Manual admin entry via Django admin | Admin CSV/PDF upload + nightly AI pre-generation |
| Scoring | Client-side for AI Hub, server-side for Exam Practice | Always server-side (tamper-resistant) |
| Rate limiting | None | Redis counter: 3 AI generate requests / hour / student |

---

## Architecture

```
Browser
  ├── AIHub.jsx         POST /api/ai/questions/generate/
  ├── ExamHub.jsx       GET  /api/exams/list/
  │                     POST /api/exams/{id}/start_session/
  ├── CBTInterface.jsx  GET  /api/exams/session/{sid}/
  │                     POST /api/exams/session/{sid}/answer/
  │                     POST /api/exams/session/{sid}/submit/
  └── JambCBT.jsx       POST /api/ai/questions/generate/  (JAMB mode)
             │
             ▼
       Django API Gateway
         ├── JWT auth check
         ├── Wallet balance check
         ├── Rate limiting via Redis
         │
         ├─→ Redis ←──────────────── CBT session state
         │    ├── cbt:session:{sid}  question bank cache
         │    └── rl:ai:{uid}        Celery task queue
         │
         ├─→ PostgreSQL ─────────── Exam/Question/ExamResult models
         │                          AIGeneratedQuestion model
         │
         └─→ Question Engine (FastAPI)
               ├── POST /generate        AI question generation (OpenAI)
               ├── POST /ingest/pdf      PDF → questions (OpenAI parse)
               ├── POST /ingest/json     Bulk import
               └── POST /score           Score a CBT session
                         │
                         └─→ OpenAI API
```

---

## Redis key design

All keys use structured namespaces and explicit TTLs.

### CBT session state

```
cbt:session:{session_id}   →   JSON blob, TTL = exam_duration_seconds + 300
```

```json
{
  "session_id": "uuid-v4",
  "user_id": 42,
  "exam_ids": [17, 23, 31, 44],
  "exam_type": "JAMB",
  "questions": {
    "17": [{"id": 1, "text": "...", "options": [...], "answer": "B"}, ...],
    "23": [...]
  },
  "answers": {"17": {"1": "A", "3": "C"}, "23": {}},
  "started_at": "2026-07-22T10:00:00Z",
  "duration_seconds": 7200,
  "expires_at": "2026-07-22T12:00:00Z",
  "submitted": false
}
```

The browser sends `session_id` with every answer and on submit. The server validates `expires_at` — if expired, auto-submits with answers received so far. This makes the timer server-enforced, not browser-enforced.

### Question cache

```
questions:{exam_id}   →   JSON array of questions, TTL = 86400 (24h)
```

When a CBT session starts, Django/worker checks Redis first. On miss, fetches from PostgreSQL, writes to Redis, serves from cache. This eliminates repeated DB round-trips for popular exam papers (JAMB 2021 Physics will be requested hundreds of times a day).

### AI rate limiting

```
rl:ai:{user_id}   →   integer counter, TTL = 3600 (1 hour)
```

`INCR` on each AI generate request. If counter > `AI_MAX_REQUESTS_PER_HOUR` (default: 3), return `429 Too Many Requests`. Counter auto-expires after 1 hour.

### Pre-generated AI question banks

```
bank:ai:{exam_type}:{subject_name}   →   JSON array, TTL = 21600 (6h)
```

Nightly Celery task pre-generates question banks for the top 10 subjects × 3 exam types. On AI Hub request, Django checks this cache before calling the worker. Cache hit = free, instant response; miss = call worker.

### Celery queues (Redis as broker)

```
celery:queue:ingest     →   PDF/CSV ingestion jobs
celery:queue:generate   →   Pre-generation batch jobs
celery:queue:default    →   Everything else
```

---

## Question Engine service

### Project layout

```
ai_worker/
  main.py           FastAPI app + routes
  services/
    openai_client.py   async OpenAI wrapper
    pdf_parser.py      PDF → raw text → structured questions
    scorer.py          scoring logic (used by Django too via API)
  requirements.txt
  Dockerfile
  render.yaml
```

### Endpoints

#### `POST /generate`

Generates AI questions. Called by Django when no cache hit.

```
Header: X-Worker-Secret: <shared secret>

Body:
{
  "subject": "Chemistry",
  "exam_type": "JAMB",
  "year_range": "2010-2023",
  "num_questions": 10,
  "request_id": "uuid"   // for idempotency
}

Response 200:
{
  "questions": [
    { "id": 1, "text": "...", "options": ["...", "...", "...", "..."], "answer": "C" }
  ]
}
```

#### `POST /ingest/pdf`

Accepts a base64-encoded PDF, parses it using OpenAI, and returns structured questions for admin review.

```
Header: X-Worker-Secret: <shared secret>

Body:
{
  "pdf_base64": "JVBERi0x...",
  "exam_type": "WAEC",
  "subject": "Biology",
  "year": 2019
}

Response 200:
{
  "parsed_count": 45,
  "questions": [
    { "text": "...", "options": [...], "answer": "A", "confidence": 0.92 }
  ],
  "low_confidence": [...]   // questions to flag for admin review
}
```

`confidence` is the worker's self-assessed reliability (1.0 = clean extraction, 0.6 = OCR noise). The admin review screen shows low-confidence items highlighted.

#### `POST /ingest/json`

Bulk import from structured JSON or CSV (converted to JSON by Django before calling worker).

```json
{
  "questions": [
    {
      "text": "...",
      "option_a": "...", "option_b": "...", "option_c": "...", "option_d": "...",
      "correct_option": "B",
      "exam_type": "NECO",
      "subject": "Physics",
      "year": 2018
    }
  ]
}
```

#### `POST /score`

Called by Django after CBT session submission. Compares answers against correct options and returns per-question and per-subject breakdown.

```json
{
  "questions": [{"id": 1, "answer": "C"}, ...],
  "user_answers": {"1": "A", "2": "C", ...},
  "group_by_subject": true
}
```

Response includes overall percentage, per-subject breakdown, and list of wrong answers with correct options.

---

## Past question data sources

Getting real Nigerian past questions into the system. Listed in practical order from easiest to hardest.

### Source 1 — Seed data (do first)

Write a management command extension to `seed.py` that loads a small curated JSON file of real JAMB questions. This gives the platform something to show immediately without any pipeline work.

```
backend/fixtures/jamb_questions_sample.json   ~100 questions across 5 subjects
backend/fixtures/waec_questions_sample.json   ~60 questions across 4 subjects
```

Format: one JSON array matching the `Question` model fields. `python manage.py seed --section questions` loads them.

### Source 2 — Admin CSV/JSON upload (Phase 1)

Build an admin page (`/admin/curriculum`) that lets admins upload a CSV file. The worker's `/ingest/json` endpoint receives the parsed rows.

CSV columns: `exam_type, subject, year, question_text, option_a, option_b, option_c, option_d, correct_option`

This is the primary day-to-day workflow for manually sourcing questions: tutors collect questions from textbooks, past paper booklets, or public resources and upload them as spreadsheets.

### Source 3 — PDF upload pipeline (Phase 2)

Many past paper booklets exist as scanned PDFs (sold in Nigerian bookshops, shared on Telegram, distributed by JAMB). Upload pipeline:

1. Admin uploads a PDF via the Django admin panel
2. Django sends it to the worker `POST /ingest/pdf`
3. Worker calls OpenAI with the PDF content (use GPT-4o vision for scanned images):
   ```python
   # For text PDFs: use pdfplumber to extract text, then prompt GPT-4o-mini
   # For scanned PDFs: encode pages as base64 images, send to GPT-4o vision
   ```
4. Worker returns structured questions with confidence scores
5. Admin sees a review screen: bulk-approve high-confidence, edit or discard low-confidence
6. Approved questions are saved to the `Question` model via Django

This is the most powerful ingestion path because it handles the unstructured formats that real JAMB/WAEC/NECO PDFs come in.

### Source 4 — AI pre-generation at scale (Phase 3)

Instead of generating per-request, Celery pre-generates entire question banks nightly:

```python
# Celery Beat schedule
CELERY_BEAT_SCHEDULE = {
    'nightly-ai-bank-generation': {
        'task': 'ai_engine.tasks.regenerate_ai_banks',
        'schedule': crontab(hour=2, minute=0),  # 2 AM daily
    },
    'warm-question-cache': {
        'task': 'exams.tasks.warm_redis_cache',
        'schedule': crontab(hour=3, minute=0),
    },
}
```

`regenerate_ai_banks` calls the worker for each (exam_type × subject) combination and writes the result to the Redis `bank:ai:` namespace. Students hitting AI Hub get an instant response from cache instead of waiting 10–20s.

### Source 5 — Open datasets

These GitHub repositories contain scraped JAMB/WAEC question data and can be used as seed material:

- Search: `github.com` → `"JAMB past questions" JSON`
- Typically 500–2,000 questions per subject, varying quality
- Import via the CSV upload pipeline after converting to the required format

No public API exists for Nigerian exam questions as of 2026. Commercial options (myschool.ng, pastquestion.ng) do not offer API access — contact them for a data licensing deal if volume justifies it.

### Source 6 — Tutor contribution

Tutors already can create exams and add questions via `POST /api/exams/{id}/add_question/`. The gap is discoverability — tutors don't know this feature exists. Add a prompt in the TutorMaterials page: "Contribute past questions to the exam bank — your students and others will benefit."

---

## Celery orchestration

### Setup

```python
# backend/core/celery.py
from celery import Celery
app = Celery('hidayah')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()
```

```python
# backend/core/settings.py (additions)
CELERY_BROKER_URL = env('REDIS_URL', default='redis://localhost:6379/0')
CELERY_RESULT_BACKEND = env('REDIS_URL', default='redis://localhost:6379/0')
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TIMEZONE = 'Africa/Lagos'
CELERY_ENABLE_UTC = True
```

### Tasks

**`ai_engine/tasks.py`**

```python
@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def generate_ai_bank(self, exam_type, subject_name):
    """Pre-generate and cache a question bank for one subject/exam combo."""
    try:
        resp = httpx.post(
            settings.AI_WORKER_URL + "/generate",
            headers={"X-Worker-Secret": settings.AI_WORKER_SECRET},
            json={"subject": subject_name, "exam_type": exam_type,
                  "year_range": "2010-2024", "num_questions": 20},
            timeout=60,
        )
        resp.raise_for_status()
        questions = resp.json()["questions"]
        redis_client.setex(
            f"bank:ai:{exam_type}:{subject_name}",
            21600,  # 6 hours
            json.dumps(questions)
        )
    except Exception as exc:
        raise self.retry(exc=exc)

@shared_task
def regenerate_ai_banks():
    """Triggered nightly. Queues generation tasks for every subject × exam type."""
    subjects = Subject.objects.values_list('name', flat=True)
    exam_types = ['JAMB', 'WAEC', 'NECO']
    for subject in subjects:
        for exam_type in exam_types:
            generate_ai_bank.apply_async(
                args=[exam_type, subject],
                queue='generate',
            )
```

**`exams/tasks.py`**

```python
@shared_task
def warm_redis_cache():
    """Pre-cache questions for the 20 most-accessed exams."""
    top_exams = ExamResult.objects.values('exam_id') \
        .annotate(count=Count('id')).order_by('-count')[:20]
    for row in top_exams:
        exam = Exam.objects.prefetch_related('questions').get(id=row['exam_id'])
        cache_key = f"questions:{exam.id}"
        if not redis_client.exists(cache_key):
            questions = list(exam.questions.values(...))
            redis_client.setex(cache_key, 86400, json.dumps(questions))

@shared_task(bind=True, max_retries=3)
def ingest_pdf(self, pdf_base64, exam_type, subject, year, uploaded_by_id):
    """Async PDF ingestion — runs in background after admin uploads a file."""
    try:
        resp = httpx.post(
            settings.AI_WORKER_URL + "/ingest/pdf",
            headers={"X-Worker-Secret": settings.AI_WORKER_SECRET},
            json={"pdf_base64": pdf_base64, "exam_type": exam_type,
                  "subject": subject, "year": year},
            timeout=120,
        )
        resp.raise_for_status()
        result = resp.json()
        # Store parsed result for admin review
        IngestJob.objects.create(
            uploaded_by_id=uploaded_by_id,
            exam_type=exam_type, subject=subject, year=year,
            parsed_questions=result["questions"],
            low_confidence=result["low_confidence"],
            status='PENDING_REVIEW',
        )
        # Notify admin
        Notification.objects.create(
            user_id=uploaded_by_id,
            title="PDF Ingestion Complete",
            message=f"Parsed {result['parsed_count']} questions from your PDF. Ready for review.",
            link="/admin/curriculum"
        )
    except Exception as exc:
        raise self.retry(exc=exc)
```

### New model needed: `IngestJob`

```python
# exams/models.py addition
class IngestJob(models.Model):
    STATUS = [('PROCESSING', 'Processing'), ('PENDING_REVIEW', 'Pending Review'),
              ('APPROVED', 'Approved'), ('FAILED', 'Failed')]
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    exam_type = models.CharField(max_length=20)
    subject = models.CharField(max_length=100)
    year = models.IntegerField(null=True)
    parsed_questions = models.JSONField(default=list)
    low_confidence = models.JSONField(default=list)
    status = models.CharField(max_length=20, choices=STATUS, default='PROCESSING')
    created_at = models.DateTimeField(auto_now_add=True)
```

---

## Django changes

### CBT session endpoints

Add to `exams/views.py`:

```python
import uuid, json
from django.core.cache import cache  # uses Redis via django-redis

@action(detail=True, methods=['post'], url_path='start_session')
def start_session(self, request, pk=None):
    """Creates a CBT session in Redis and returns session_id to the browser."""
    exam = self.get_object()
    user = request.user

    # Check for existing active session (prevent duplicate sessions)
    existing_key = f"cbt:user_session:{user.id}:{exam.id}"
    existing_sid = cache.get(existing_key)
    if existing_sid:
        session = cache.get(f"cbt:session:{existing_sid}")
        if session and not session['submitted']:
            return Response({'session_id': existing_sid, 'resumed': True})

    # Load questions (from Redis cache or DB)
    cache_key = f"questions:{exam.id}"
    cached = cache.get(cache_key)
    if cached:
        questions = json.loads(cached)
    else:
        qs = exam.questions.values('id', 'text', 'option_a', 'option_b', 'option_c', 'option_d')
        questions = [{'id': q['id'], 'text': q['text'],
                      'options': [q['option_a'], q['option_b'], q['option_c'], q['option_d']]}
                     for q in qs]
        cache.set(cache_key, json.dumps(questions), 86400)

    session_id = str(uuid.uuid4())
    duration = exam.duration_minutes * 60
    session = {
        'session_id': session_id, 'user_id': user.id,
        'exam_id': exam.id, 'duration_seconds': duration,
        'questions': questions, 'answers': {},
        'started_at': timezone.now().isoformat(),
        'expires_at': (timezone.now() + timedelta(seconds=duration)).isoformat(),
        'submitted': False,
    }
    cache.set(f"cbt:session:{session_id}", session, duration + 300)
    cache.set(existing_key, session_id, duration + 300)

    return Response({
        'session_id': session_id,
        'questions': questions,
        'duration_seconds': duration,
        'expires_at': session['expires_at'],
    })

@action(detail=False, methods=['post'], url_path='session/(?P<sid>[^/.]+)/answer')
def save_answer(self, request, sid=None):
    """Persist one answer to the Redis session (called on every option click)."""
    session = cache.get(f"cbt:session:{sid}")
    if not session or session['submitted']:
        return Response({'error': 'Session not found or already submitted'}, status=404)
    if session['user_id'] != request.user.id:
        return Response({'error': 'Forbidden'}, status=403)

    question_id = str(request.data.get('question_id'))
    answer = request.data.get('answer')
    session['answers'][question_id] = answer
    ttl = cache.ttl(f"cbt:session:{sid}")
    cache.set(f"cbt:session:{sid}", session, ttl)
    return Response({'saved': True})

@action(detail=False, methods=['post'], url_path='session/(?P<sid>[^/.]+)/submit')
def submit_session(self, request, sid=None):
    """Score the session, persist ExamResult, invalidate Redis session."""
    session = cache.get(f"cbt:session:{sid}")
    if not session:
        return Response({'error': 'Session expired or not found'}, status=404)
    if session['user_id'] != request.user.id:
        return Response({'error': 'Forbidden'}, status=403)
    if session['submitted']:
        # Return existing result
        result = ExamResult.objects.get(
            student=request.user, exam_id=session['exam_id'])
        return Response({'score': float(result.score), 'already_submitted': True})

    exam = Exam.objects.prefetch_related('questions').get(id=session['exam_id'])
    correct_map = {str(q.id): q.correct_option for q in exam.questions.all()}
    answers = session['answers']
    correct_count = sum(1 for qid, ans in answers.items()
                        if correct_map.get(qid, '').upper() == ans.upper())
    total = len(correct_map)
    score = (correct_count / total * 100) if total else 0

    result = ExamResult.objects.create(
        student=request.user, exam=exam,
        score=score, total_questions=total
    )
    ExamAssignment.objects.filter(student=request.user, exam=exam).update(is_completed=True)

    session['submitted'] = True
    cache.set(f"cbt:session:{sid}", session, 300)  # keep 5 min for UX, then evict

    return Response({'score': score, 'correct_answers': correct_count,
                     'total_questions': total, 'result_id': result.id})
```

### AI generate endpoint — add cache check and rate limiting

```python
# ai_engine/views.py — additions inside generate()

# Rate limit check
rl_key = f"rl:ai:{user.id}"
request_count = cache.get(rl_key, 0)
if request_count >= settings.AI_MAX_REQUESTS_PER_HOUR:
    return Response({'error': 'Rate limit reached. Try again in an hour.'}, status=429)
cache.set(rl_key, request_count + 1, 3600)  # TTL resets with each increment — use pipeline for atomic INCR

# Cache check before calling worker
bank_key = f"bank:ai:{exam_type}:{subject.name}"
cached_bank = cache.get(bank_key)
if cached_bank:
    questions = json.loads(cached_bank)
    ai_record = AIGeneratedQuestion.objects.create(...)
    return Response({'id': ai_record.id, 'questions': questions}, status=201)

# Call worker (cache miss)
worker_resp = httpx.post(settings.AI_WORKER_URL + "/generate", ...)
```

### Settings additions

```python
# backend/core/settings.py
import django_redis  # noqa

CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": env('REDIS_URL', default='redis://localhost:6379/1'),
        "OPTIONS": {"CLIENT_CLASS": "django_redis.client.DefaultClient"},
    }
}

CELERY_BROKER_URL = env('REDIS_URL', default='redis://localhost:6379/0')
CELERY_RESULT_BACKEND = env('REDIS_URL', default='redis://localhost:6379/0')

AI_WORKER_URL = env('AI_WORKER_URL', default='')
AI_WORKER_SECRET = env('AI_WORKER_SECRET', default='')
AI_MAX_REQUESTS_PER_HOUR = int(env('AI_MAX_REQUESTS_PER_HOUR', default='3'))
```

### New packages

```
# backend/requirements.txt additions
django-redis>=5.4
celery[redis]>=5.3
django-celery-beat>=2.6
httpx>=0.27
pdfplumber>=0.11    # text PDF extraction (used inside the worker)
```

---

## Frontend changes

### CBTInterface.jsx

**Current behaviour:** Loads all questions on mount, timer runs in JS only. No session recovery.

**Changes:**

1. On mount, call `POST /api/exams/{exam_id}/start_session/` instead of fetching questions directly. Receive `session_id`, `questions`, `duration_seconds`, `expires_at`.
2. Store `session_id` in component state.
3. Timer: compute `time_remaining = expires_at - Date.now()` from the server-provided value (not a hardcoded `duration_minutes * 60`). If page refreshes, call `GET /api/exams/session/{session_id}/` to restore state (answers, time remaining).
4. On each answer click: call `POST /api/exams/session/{session_id}/answer/` to persist to Redis.
5. On submit or timer expiry: call `POST /api/exams/session/{session_id}/submit/`.

This replaces the current `POST /api/exams/{id}/submit/` call.

### JambCBT.jsx

**Current behaviour:** Calls `POST /api/ai/questions/generate/` per subject. Timer in JS. No session recovery.

**Changes:**

The multi-subject JAMB session should use real past paper questions (where available) or fall back to AI-generated. Two options:

- **Option A (simpler):** Keep the current AI generate flow but use Celery pre-generated banks (faster response). No frontend change needed.
- **Option B (correct):** Add a `JAMB session` endpoint: `POST /api/exams/jamb_session/` that takes the student's subject combination and year, loads questions per subject from the DB (or AI), creates a single Redis session covering all subjects, and returns one unified `session_id`. JambCBT then uses the same session protocol as CBTInterface.

Option A for Phase 2, Option B for Phase 3.

### AIHub.jsx

No changes. The generate endpoint now checks the Redis bank cache before calling the worker, so the user gets a faster response. The UX is identical.

---

## Environment variables

### Django (`backend/.env`)

```env
REDIS_URL=redis://localhost:6379/0
AI_WORKER_URL=https://hidayah-ai-worker.onrender.com
AI_WORKER_SECRET=<generate: python -c "import secrets; print(secrets.token_hex(32))">
AI_MAX_REQUESTS_PER_HOUR=3
```

### Worker (`ai_worker/.env`)

```env
OPENAI_API_KEY=sk-...
WORKER_SECRET=<same value as AI_WORKER_SECRET above>
PORT=8001
```

### Render environment variables to add

| Service | Key | Value |
|---------|-----|-------|
| Django web service | `REDIS_URL` | Redis URL from Render Redis add-on |
| Django web service | `AI_WORKER_URL` | URL of the deployed worker service |
| Django web service | `AI_WORKER_SECRET` | Shared secret |
| Django Celery worker | `REDIS_URL` | Same Redis URL |
| AI Worker service | `OPENAI_API_KEY` | OpenAI key |
| AI Worker service | `WORKER_SECRET` | Shared secret |

---

## Deployment on Render

Render supports multiple services in one project. Add these to `render.yaml`:

```yaml
services:
  # Existing Django web service (unchanged)
  - type: web
    name: hidayah-api
    ...

  # New: FastAPI question engine
  - type: web
    name: hidayah-ai-worker
    runtime: python
    rootDir: ai_worker
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn main:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: OPENAI_API_KEY
        sync: false
      - key: WORKER_SECRET
        sync: false

  # New: Celery worker (runs background tasks)
  - type: worker
    name: hidayah-celery
    runtime: python
    rootDir: backend
    buildCommand: pip install -r requirements.txt
    startCommand: celery -A core worker -Q ingest,generate,default -l info
    envVars:
      - key: REDIS_URL
        fromService:
          name: hidayah-redis
          type: redis
          property: connectionString

  # New: Celery Beat (task scheduler)
  - type: worker
    name: hidayah-celery-beat
    runtime: python
    rootDir: backend
    buildCommand: pip install -r requirements.txt
    startCommand: celery -A core beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler

databases:
  - name: hidayah-redis
    type: redis
    plan: free
```

---

## Phase-by-phase rollout

### Phase 1 — Redis + CBT session (2–3 days)
- Add `django-redis` and configure `CACHES` in settings
- Add `start_session`, `save_answer`, `submit_session` endpoints to `ExamViewSet`
- Update `CBTInterface.jsx` to use session endpoints
- Test: start exam, refresh browser mid-exam, verify answers restored and timer correct
- No AI worker changes yet; seed data and existing DB still serve questions

### Phase 2 — AI worker + rate limiting (1–2 days)
- Build `ai_worker/` FastAPI app (generate + score endpoints)
- Deploy to Render as a separate service
- Update `ai_engine/views.py` to proxy through worker + Redis rate limiting
- Keep `services.py` as fallback when `AI_WORKER_URL` not set
- Test: AI Hub generates questions, rate limit fires after 3 requests

### Phase 3 — Celery + pre-generation (2–3 days)
- Add Celery + Celery Beat to Django
- Deploy Celery worker and Beat as Render worker services
- Implement `regenerate_ai_banks` and `warm_redis_cache` tasks
- Add Celery Beat schedule in Django admin (or via `CELERY_BEAT_SCHEDULE`)
- Test: trigger nightly tasks manually, verify Redis banks populated, verify AI Hub uses cache

### Phase 4 — PDF ingestion pipeline (3–4 days)
- Add `/ingest/pdf` endpoint to worker (pdfplumber + OpenAI parse)
- Add `IngestJob` model + migration
- Add `ingest_pdf` Celery task
- Build admin review UI at `/admin/curriculum` — list parsed questions, bulk approve, edit, discard
- Test: upload a 10-page JAMB PDF, verify questions appear in review queue, approve and publish

### Phase 5 — CSV/JSON import + bulk seed (1–2 days)
- Add CSV upload to `/admin/curriculum`
- Build `seed.py` extension for `--section questions`
- Populate `fixtures/jamb_questions_sample.json` with 100+ curated questions
- Test: import CSV, verify questions appear in ExamHub

### Phase 6 — JAMB CBT unified session (2–3 days)
- Add `POST /api/exams/jamb_session/` endpoint (multi-subject, Redis-backed)
- Update `JambCBT.jsx` to use the session protocol
- Test: start JAMB CBT with 4 subjects, navigate between subjects, refresh mid-exam, verify state recovery

---

## What the worker never does

- Database queries (no Django ORM, no SQL)
- JWT validation (Django handles auth before calling the worker)
- Wallet checks (Django only)
- User profile lookups (Django only)
- File storage (Django/Cloudinary only)
- WebSocket connections (Django Channels handles live class)
