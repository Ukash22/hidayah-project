# Security Audit — Backend & Frontend Vulnerability Review

Full security review of the Hidayah codebase. Findings are organised by severity, each with the specific file(s), the problem, and the recommended fix. Where a finding was confirmed safe on inspection, it is noted as such.

---

## CRITICAL

---

### 1. SECRET_KEY — Hardcoded Insecure Fallback

**File:** `backend/core/settings.py:32`

```python
SECRET_KEY = os.getenv("SECRET_KEY", "django-insecure-mz8str1t$b3(46n3@)^99ije#lciwj!=roqey#2%nxir*s^4^s")
```

**Problem**
The `os.getenv` call has a hardcoded fallback that begins with `django-insecure-`. If the environment variable is ever missing (CI, staging, a developer's machine without a `.env`), Django silently falls back to this known-compromised value. JWT tokens signed with this key would be forgeable by anyone who reads the source.

**Fix**
Remove the fallback entirely. Let the application crash loudly on startup rather than run with an insecure key.
```python
SECRET_KEY = os.environ["SECRET_KEY"]  # KeyError if missing — intentional
```

---

### 2. DEBUG — Defaults to True in Production

**File:** `backend/core/settings.py:35`

```python
DEBUG = os.getenv("DEBUG", "True").lower() == "true"
```

**Problem**
If the `DEBUG` environment variable is not set, Django runs in debug mode. Debug mode exposes: full Python tracebacks in the browser, the interactive debugger, a list of all URL patterns, SQL queries, and sensitive settings values. This is the single most dangerous misconfiguration in Django.

**Fix**
Default to `"False"`:
```python
DEBUG = os.getenv("DEBUG", "False").lower() == "true"
```

---

### 3. ALLOWED_HOSTS — Logic is Inverted

**File:** `backend/core/settings.py:37–41`

```python
ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")
if "*" not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append("*")
```

**Problem**
The condition reads: "if wildcard is NOT already in the list, add it." This means `*` is always appended unless the env var already contains `*`. The effect is that Django accepts requests from any Host header on every deployment, defeating the ALLOWED_HOSTS protection entirely.

**Fix**
Invert the logic — only add `*` when explicitly in debug mode:
```python
ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")
if DEBUG and "*" not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append("*")
```

---

## HIGH

---

### 4. WebSocket Consumers — No Authentication Check on connect()

**File:** `backend/whiteboard/consumers.py` — `BoardConsumer.connect()` and `SignalingConsumer.connect()`

**Problem**
Both consumers call `await self.accept()` without ever checking `self.scope['user'].is_authenticated`. An unauthenticated WebSocket client (e.g. an anonymous browser tab or a script) can connect to any whiteboard room and participate fully in the session — including receiving and injecting drawing events.

`AuthMiddlewareStack` populates `self.scope['user']`, but it does not enforce authentication. The check must be done in the consumer.

**Fix**
```python
async def connect(self):
    if not self.scope['user'].is_authenticated:
        await self.close(code=4001)
        return
    # ... rest of connect
```

---

### 5. Admin Payment Views — Rely on Runtime Role Check, not Permission Class

**File:** `backend/payments/views.py` — `AdminWalletActionView`, `AdminTransactionListView`

```python
permission_classes = [IsAuthenticated]
# then inside the handler:
if not request.user.is_staff:
    return Response({'error': 'Unauthorized'}, status=403)
```

**Problem**
Using `IsAuthenticated` at the class level means any authenticated user — student, parent, tutor — can reach the view handler. The `is_staff` guard inside the handler is a second line of defence, not the first. If the runtime check is ever refactored away or accidentally removed, the endpoint becomes fully open to all logged-in users. DRF permissions are the correct enforcement layer.

**Fix**
```python
permission_classes = [IsAdminUser]
```
Remove the `if not request.user.is_staff` check — the permission class makes it redundant.

---

### 6. Cloudinary Signature Endpoint — No Authentication Required

**File:** `backend/tutors/views.py` — `cloudinary_signature` action

**Problem**
The endpoint that generates a signed Cloudinary upload URL is decorated with `permission_classes = []`, making it accessible to anonymous users. Any user without an account can obtain a valid Cloudinary signature and upload arbitrary files to the project's Cloudinary account, incurring storage costs and potentially hosting malicious content.

**Fix**
```python
@action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
def cloudinary_signature(self, request):
```

---

### 7. REST Framework — BasicAuthentication and SessionAuthentication Alongside JWT

**File:** `backend/core/settings.py:269–273`

```python
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.BasicAuthentication',
        'rest_framework.authentication.SessionAuthentication',
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
```

**Problem**
`BasicAuthentication` sends credentials as base64-encoded plaintext and is suitable only over HTTPS with no exceptions. On HTTP (local dev, misconfigured staging) it transmits passwords in a trivially decodable form. It also opens CSRF vectors when paired with `SessionAuthentication`. The app's frontend exclusively uses JWTs — neither basic auth nor session auth is needed in the API layer.

**Fix**
```python
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
```

---

### 8. JWT Stored in localStorage — Vulnerable to XSS

**File:** `frontend/src/context/AuthContext.jsx` (stores token), all API service files (read token)

**Problem**
JWTs stored in `localStorage` are accessible to any JavaScript running on the page, including injected scripts from XSS vulnerabilities, browser extensions, or compromised third-party libraries. An XSS attack that reads `localStorage.getItem('token')` can exfiltrate the token silently, enabling session hijacking that persists until the token expires.

**Fix (recommended):** Store the access token in memory (React state/context) and use an `httpOnly` cookie for the refresh token. The access token never touches persistent storage; refresh happens server-side via the cookie.

**Fix (lower effort):** At minimum, move from `localStorage` to `sessionStorage` — tokens are cleared when the browser tab closes, reducing the exposure window. Pair with short-lived access tokens (15 min) and silent refresh.

Note: This is the hardest item to fix without breaking the existing auth flow. Should be planned as a dedicated workstream.

---

## MEDIUM

---

### 9. Cloudinary Upload — No File Type or Size Validation (Frontend)

**File:** `frontend/src/services/cloudinaryService.js`

**Problem**
Files are uploaded to Cloudinary with no client-side validation of:
- **File type**: A user can upload `.exe`, `.js`, `.html`, or any other file type as a "profile picture" or "teaching material".
- **File size**: A 500MB video can be uploaded as a profile picture, consuming Cloudinary bandwidth quota and degrading upload UX.

Note: Cloudinary's backend enforces its own limits per resource type, but validation should fail fast on the client rather than waiting for a rejected API call.

**Fix**
```js
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE_MB = 5;

function validateFile(file, allowedTypes = ALLOWED_TYPES, maxMb = MAX_SIZE_MB) {
    if (!allowedTypes.includes(file.type)) throw new Error(`File type not allowed: ${file.type}`);
    if (file.size > maxMb * 1024 * 1024) throw new Error(`File exceeds ${maxMb}MB limit`);
}
```
For document/material uploads, define a separate allowed-types list (`application/pdf`, `application/vnd.ms-powerpoint`, etc.).

---

### 10. Raw Exception Messages Leaked to API Responses

**File:** Multiple backend views — grep for `str(e)` in `backend/`

**Problem**
Several views catch exceptions and return `str(e)` directly in the API response:
```python
except Exception as e:
    return Response({'error': str(e)}, status=500)
```
This can expose internal implementation details: Python class names, database table names, file system paths, ORM query fragments, and third-party library error strings. These details aid an attacker in mapping the system.

**Fix**
Return a generic user-facing message in production. Log the full exception server-side:
```python
except Exception as e:
    import logging
    logger = logging.getLogger(__name__)
    logger.exception("Unexpected error in %s", self.__class__.__name__)
    return Response({'error': 'An unexpected error occurred. Please try again.'}, status=500)
```

---

### 11. WebSocket Consumers — Debug print() Statements

**File:** `backend/whiteboard/consumers.py`

**Problem**
Multiple `print()` calls throughout both consumers output session data, user information, and event payloads to stdout. In production (Daphne/gunicorn), stdout is written to server logs which may be stored in log aggregation systems without appropriate access controls. Sensitive data (board IDs, user identifiers, session content) should not be in raw log output.

**Fix**
Replace all `print()` calls with `logging.getLogger(__name__).debug(...)`. Debug-level log lines are suppressed in production unless the log level is explicitly set to DEBUG.

---

### 12. No Rate Limiting on Login and Password Reset

**File:** `backend/` — login endpoint, `ForgotPassword` view

**Problem**
The login endpoint and the password reset request endpoint have no rate limiting. An attacker can:
- Perform credential stuffing attacks (try thousands of username/password combinations) against the login endpoint.
- Enumerate valid email addresses via the password reset endpoint (if error messages differ for known vs unknown emails).
- Cause email quota exhaustion by triggering thousands of password reset emails.

**Fix**
Apply Django's built-in throttling via DRF:
```python
REST_FRAMEWORK = {
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '20/minute',
        'user': '200/minute',
    }
}
```
Apply a stricter custom throttle to the login and password-reset views specifically (`5/minute` for anon).

---

## LOW / INFORMATIONAL

---

### 13. Paystack Webhook — CONFIRMED SAFE (No Action Required)

**File:** `backend/payments/views.py` — `PaystackWebhookView`, `backend/payments/paystack_service.py`

**Initial concern:** `permission_classes = []` on the webhook endpoint.

**Verdict:** Intentionally open — webhook endpoints by definition must be reachable by the payment processor without credentials. Paystack does not send JWTs. The endpoint validates the `x-paystack-signature` header using HMAC SHA-512 against `PAYSTACK_SECRET_KEY` (read from environment with no insecure default) in `paystack_service.py`. This is the correct and recommended pattern.

---

## Summary Priority Matrix

| # | Severity | Issue | File(s) | Effort |
|---|---|---|---|---|
| 1 | 🔴 Critical | SECRET_KEY hardcoded fallback | `settings.py:32` | Low |
| 2 | 🔴 Critical | DEBUG defaults to True | `settings.py:35` | Low |
| 3 | 🔴 Critical | ALLOWED_HOSTS logic inverted | `settings.py:37–41` | Low |
| 4 | 🟠 High | WebSocket consumers — no auth check | `whiteboard/consumers.py` | Low |
| 5 | 🟠 High | Admin payment views — wrong permission class | `payments/views.py` | Low |
| 6 | 🟠 High | Cloudinary signature endpoint — AllowAny | `tutors/views.py` | ⚠️ Accepted Risk |
| 7 | 🟠 High | BasicAuthentication in REST_FRAMEWORK | `settings.py:269–273` | Low |
| 8 | 🟠 High | JWT in localStorage — XSS exposure | `AuthContext.jsx` + all services | High |
| 9 | 🟡 Medium | No file type/size validation on upload | `cloudinaryService.js` | Low |
| 10 | 🟡 Medium | Raw exception messages in API responses | Multiple backend views | Medium |
| 11 | 🟡 Medium | print() statements in WebSocket consumers | `whiteboard/consumers.py` | Low |
| 12 | 🟡 Medium | No rate limiting on login / password reset | Backend views | Medium |
| 13 | ✅ Pass | Paystack webhook signature validation | `payments/paystack_service.py` | — |
