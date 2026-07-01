# KYC Identity Verification — Implementation Guide

> Reusable reference for adding admin-driven KYC to a FastAPI + React Native + React Admin stack.
> Based on the Robust Home Solutions implementation (Nigeria, DOJAH NIN verification).

---

## Strategy Overview

**Model: Admin-driven review with optional automated helper**

Users submit their identity documents → status goes to `pending_review` → admin reviews in the dashboard and makes the final approve/reject decision. An optional automated NIN lookup (DOJAH for Nigeria) can be triggered by admin as a helper, but admin retains full control regardless of the automated result.

```
User submits KYC
      ↓
kyc_status = pending_review
      ↓
Admin opens user drawer
      ↓
[Optional] Admin clicks "Check NIN with DOJAH"
    → backend calls DOJAH NIN API
    → shows result inline (name match, DOB, gender)
      ↓
Admin clicks Approve or Reject (with optional reason)
      ↓
kyc_status = approved / rejected
```

### Why this model?

- **Trust**: Automated identity checks are used as informational signals, not gatekeepers. Admin has full context and can approve even if the name fuzzy-match fails (e.g. shortened names, local aliases).
- **Compliance**: In Nigeria, NIN verification via DOJAH requires a business wallet/compliance approval before production. Admin-driven lets you go live on sandbox (or without DOJAH at all) and add automation later.
- **Auditability**: Every approve/reject is tied to an admin action, not an algorithm.

### Role differentiation

| | Workers | Clients |
|---|---|---|
| Submits | NIN + Gov ID photo + Selfie | NIN only |
| Job gate | Cannot apply until `approved` | No gate |
| Admin review | Yes | Yes |
| DOJAH check | Admin-initiated, optional | Admin-initiated, optional |

---

## Tech Stack Components

| Layer | Tech |
|---|---|
| Backend | FastAPI, SQLModel, PostgreSQL, Alembic |
| Mobile | React Native (Expo), `expo-image-picker`, `@tanstack/react-query` |
| Admin frontend | React, Chakra UI, `@tanstack/react-query` |
| ID provider | DOJAH (`https://api.dojah.io`) — Nigeria NIN lookup |
| File storage | Cloudinary (or local filesystem in dev) |

---

## Backend

### 1. Config (`backend/app/core/config.py`)

```python
DOJAH_APP_ID: str | None = None
DOJAH_SECRET_KEY: str | None = None
DOJAH_BASE_URL: str = "https://api.dojah.io"  # same URL for sandbox & production
```

> Sandbox vs production is determined by which API keys you use — not by the URL.

### 2. Database model (`backend/app/models.py`)

Add to your `UserProfile` model:

```python
import enum
from datetime import datetime

class KYCStatus(str, enum.Enum):
    not_started    = "not_started"
    pending_review = "pending_review"
    approved       = "approved"
    rejected       = "rejected"

# In UserProfile SQLModel:
kyc_status: KYCStatus = Field(
    default=KYCStatus.not_started,
    sa_column=sa.Column(
        sa.Enum(KYCStatus, name="kycstatus"),
        nullable=False,
        server_default="not_started"
    )
)
kyc_nin: str | None = Field(default=None, max_length=20)
kyc_id_document_url: str | None = Field(default=None, max_length=500)
kyc_selfie_url: str | None = Field(default=None, max_length=500)
kyc_rejection_reason: str | None = Field(default=None, max_length=500)
kyc_submitted_at: datetime | None = Field(default=None)
```

Mirror these fields in your `UserProfilePublic` response model (with `| None` defaults so existing API callers don't break).

### 3. Alembic migration

```python
# down_revision = "<previous_migration_id>"

def upgrade():
    op.add_column("userprofile", sa.Column("kyc_status", sa.String(), nullable=False, server_default="not_started"))
    op.add_column("userprofile", sa.Column("kyc_nin", sa.String(20), nullable=True))
    op.add_column("userprofile", sa.Column("kyc_id_document_url", sa.String(500), nullable=True))
    op.add_column("userprofile", sa.Column("kyc_selfie_url", sa.String(500), nullable=True))
    op.add_column("userprofile", sa.Column("kyc_rejection_reason", sa.String(500), nullable=True))
    op.add_column("userprofile", sa.Column("kyc_submitted_at", sa.DateTime(), nullable=True))

def downgrade():
    for col in ["kyc_submitted_at", "kyc_rejection_reason", "kyc_selfie_url",
                "kyc_id_document_url", "kyc_nin", "kyc_status"]:
        op.drop_column("userprofile", col)
```

### 4. KYC router (`backend/app/api/routes/kyc.py`)

```python
from datetime import datetime, timezone
import httpx
from fastapi import APIRouter, HTTPException, status
from sqlmodel import Session

from app.api.deps import CurrentUser, SessionDep, get_current_active_superuser
from app.core.config import settings
from app.models import KYCStatus, UserProfile

router = APIRouter(prefix="/kyc", tags=["kyc"])


# ── User-facing endpoints ──────────────────────────────────────────────────────

@router.get("/status")
def get_kyc_status(current_user: CurrentUser, session: SessionDep):
    """Returns the current user's KYC fields."""
    profile = session.get(UserProfile, current_user.id)
    if not profile:
        return {"kyc_status": "not_started", "kyc_rejection_reason": None}
    return {
        "kyc_status": profile.kyc_status,
        "kyc_nin": profile.kyc_nin,
        "kyc_rejection_reason": profile.kyc_rejection_reason,
        "kyc_submitted_at": profile.kyc_submitted_at,
    }


@router.post("/submit")
def submit_kyc(
    payload: dict,   # { nin, id_document_url?, selfie_url? }
    current_user: CurrentUser,
    session: SessionDep,
):
    """Saves KYC data and sets status to pending_review."""
    profile = session.get(UserProfile, current_user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    nin = (payload.get("nin") or "").strip()
    if not nin or len(nin) < 11:
        raise HTTPException(status_code=422, detail="Valid 11-digit NIN required")

    profile.kyc_nin = nin
    profile.kyc_id_document_url = payload.get("id_document_url") or profile.kyc_id_document_url
    profile.kyc_selfie_url = payload.get("selfie_url") or profile.kyc_selfie_url
    profile.kyc_status = KYCStatus.pending_review
    profile.kyc_submitted_at = datetime.now(timezone.utc)
    profile.kyc_rejection_reason = None
    session.add(profile)
    session.commit()
    session.refresh(profile)
    return profile


# ── Admin-only endpoints ───────────────────────────────────────────────────────

@router.post("/{user_id}/dojah-check", dependencies=[Depends(get_current_active_superuser)])
async def dojah_check(user_id: str, session: SessionDep):
    """Calls DOJAH NIN API with user's stored NIN. Does NOT change kyc_status."""
    profile = session.get(UserProfile, user_id)
    if not profile or not profile.kyc_nin:
        raise HTTPException(status_code=404, detail="No NIN on file for this user")

    if not settings.DOJAH_APP_ID or not settings.DOJAH_SECRET_KEY:
        raise HTTPException(status_code=503, detail="DOJAH not configured on this server")

    return await _check_nin_dojah(profile.kyc_nin, profile.user.full_name or "")


@router.post("/{user_id}/approve", dependencies=[Depends(get_current_active_superuser)])
def approve_kyc(user_id: str, session: SessionDep):
    profile = session.get(UserProfile, user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    profile.kyc_status = KYCStatus.approved
    profile.kyc_rejection_reason = None
    session.add(profile)
    session.commit()
    return {"kyc_status": profile.kyc_status}


@router.post("/{user_id}/reject", dependencies=[Depends(get_current_active_superuser)])
def reject_kyc(user_id: str, payload: dict, session: SessionDep):
    profile = session.get(UserProfile, user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    profile.kyc_status = KYCStatus.rejected
    profile.kyc_rejection_reason = payload.get("reason") or "Rejected by admin"
    session.add(profile)
    session.commit()
    return {"kyc_status": profile.kyc_status}


# ── DOJAH helper ───────────────────────────────────────────────────────────────

async def _check_nin_dojah(nin: str, full_name: str) -> dict:
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(
            f"{settings.DOJAH_BASE_URL}/api/v1/kyc/nin",
            params={"nin": nin},
            headers={
                "Authorization": settings.DOJAH_SECRET_KEY,
                "AppId": settings.DOJAH_APP_ID,
            },
        )
    if r.status_code != 200:
        return {"matched": False, "reason": "DOJAH lookup failed"}

    entity = r.json().get("entity") or {}
    if not entity:
        return {"matched": False, "reason": "NIN not found in government database"}

    dojah_name = f"{entity.get('first_name', '')} {entity.get('last_name', '')}".strip()
    matched = any(
        w.lower() in dojah_name.lower()
        for w in full_name.split()
        if len(w) > 2
    )
    return {
        "matched": matched,
        "dojah_name": dojah_name,
        "dob": entity.get("date_of_birth"),
        "gender": entity.get("gender"),
        "reason": "" if matched else f"Name mismatch: '{full_name}' vs DOJAH '{dojah_name}'",
    }
```

### 5. Register the router (`backend/app/api/main.py`)

```python
from app.api.routes import kyc
api_router.include_router(kyc.router)
```

### 6. Job application gate (`backend/app/api/routes/jobs.py`)

In `apply_for_job`, after the role check:

```python
from app.models import KYCStatus

if not current_user.profile or current_user.profile.kyc_status != KYCStatus.approved:
    raise HTTPException(
        status_code=403,
        detail="Complete identity verification before applying for jobs"
    )
```

### 7. Environment variables

```ini
# .env / Railway / hosting provider
DOJAH_APP_ID=your_sandbox_app_id
DOJAH_SECRET_KEY=your_sandbox_secret_key
```

- Get sandbox keys from the DOJAH dashboard → API Keys section.
- Swap for live keys after completing DOJAH onboarding (compliance + wallet).
- If these vars are absent, the DOJAH check endpoint returns 503. All other KYC endpoints still work — admin can approve/reject without DOJAH.

---

## Mobile (React Native / Expo)

### 1. API service additions (`services/api.ts`)

```typescript
export type KYCStatus = "not_started" | "pending_review" | "approved" | "rejected"

// Add to UserProfileData:
kyc_status: KYCStatus
kyc_nin: string | null
kyc_rejection_reason: string | null

// New API object:
export const kycApi = {
  getStatus: () => api.get<{ kyc_status: KYCStatus; kyc_rejection_reason: string | null }>("/kyc/status"),
  submit: (payload: { nin: string; id_document_url?: string; selfie_url?: string }) =>
    api.post("/kyc/submit", payload),
}

// Update uploadsApi folder type to include:
// "kyc-documents" | "kyc-selfies"
```

### 2. KYC submission screen (`app/kyc.tsx`)

Key structure:
- Load current status via `kycApi.getStatus()`
- Show `StatusBanner` based on current status
- Show submission form only when `status === "not_started" || status === "rejected"`
- NIN input: numeric, `maxLength={11}`, strip non-digits with `.replace(/\D/g, "")`
- ID document upload: `ImagePicker.launchImageLibraryAsync({ mediaTypes: MediaTypeOptions.Images })`
- Selfie upload: `ImagePicker.launchCameraAsync({ quality: 0.8 })`
- Both uploads go to `POST /uploads?folder=kyc-documents` / `?folder=kyc-selfies`
- Submit via `kycApi.submit({ nin, id_document_url, selfie_url })`
- Required packages: `expo-image-picker` (`npx expo install expo-image-picker`)

### 3. Profile screen KYC banner (`app/(tabs)/profile.tsx`)

For workers — show a banner based on KYC status:

| Status | Color | Action |
|---|---|---|
| `not_started` | Orange | Tappable → `/kyc` |
| `pending_review` | Blue | Non-tappable |
| `approved` | Green | Non-tappable |
| `rejected` | Red (with reason) | Tappable → `/kyc` |

For clients — show a small "Verified" badge when `kyc_status === "approved"`.

### 4. Edit profile — client NIN field (`app/profile/edit.tsx`)

For clients (non-workers), add an optional NIN field in Personal Info:
- `nin` state initialized from `profile.kyc_nin`
- Inline Submit button calls `kycApi.submit({ nin })`
- Show "Under review" text when `kyc_status === "pending_review"`
- Disable Submit button and show "Verified ✓" when `kyc_status === "approved"`

### 5. Job detail — Apply button gate (`app/jobs/[id].tsx`)

```typescript
// Fetch worker's own profile to check KYC status
const { data: myProfile } = useQuery<UserProfileData>({
  queryKey: ["myProfile"],
  queryFn: async () => (await profileApi.getMyProfile()).data,
  enabled: !!id && isWorker,
  staleTime: 60_000,
})

// In the render, replace the Apply button:
{isWorker && job.status === "pending" && !isHiredWorker && (
  myProfile?.kyc_status !== "approved" ? (
    // Orange button → navigates to /kyc
    // Show explanatory text for pending_review
  ) : (
    // Normal blue Apply button → opens apply modal
  )
)}
```

---

## Admin Frontend (React)

### Key additions to the users admin page

**Types:**
```typescript
type KYCStatus = "not_started" | "pending_review" | "approved" | "rejected"

// Add to UserProfile interface:
kyc_status?: KYCStatus
kyc_nin?: string | null
kyc_id_document_url?: string | null
kyc_selfie_url?: string | null
kyc_rejection_reason?: string | null
kyc_submitted_at?: string | null
```

**Helper components:**
```tsx
function KYCBadge({ status }: { status?: KYCStatus | null }) {
  const map = {
    not_started:    { label: "Not Started", colorPalette: "gray" },
    pending_review: { label: "Pending",     colorPalette: "orange" },
    approved:       { label: "Approved",    colorPalette: "green" },
    rejected:       { label: "Rejected",    colorPalette: "red" },
  }
  const cfg = map[status ?? "not_started"] ?? map.not_started
  return <Badge colorPalette={cfg.colorPalette} size="sm">{cfg.label}</Badge>
}

function maskNin(nin: string): string {
  if (nin.length <= 6) return nin
  return nin.slice(0, 3) + "*".repeat(nin.length - 6) + nin.slice(-3)
}
```

**Users table:** Add a KYC column showing `<KYCBadge status={user.profile?.kyc_status} />`.

**User detail drawer — KYC section:**

State needed inside the drawer component:
```typescript
const [dojahResult, setDojahResult] = useState<{ matched: boolean; dojah_name?: string; dob?: string; gender?: string; reason?: string } | null>(null)
const [showRejectInput, setShowRejectInput] = useState(false)
const [rejectReason, setRejectReason] = useState("")
```

Three separate mutations:
- `dojahMutation` → `POST /kyc/{userId}/dojah-check` → sets `dojahResult`
- `kycApproveMutation` → `POST /kyc/{userId}/approve`
- `kycRejectMutation` → `POST /kyc/{userId}/reject` with `{ reason }`

Section renders:
1. Status badge + masked NIN + submitted date (always)
2. "View Document" + "View Selfie" links (workers with uploaded docs)
3. Rejection reason box (when `kyc_rejection_reason` is set)
4. "Check NIN with DOJAH" button (when NIN on file) + inline result card
5. Approve/Reject buttons (when status is `pending_review` or `rejected`)
6. "Revoke KYC Approval" button (when status is `approved`)

---

## File Upload for KYC Documents

Uses the same upload endpoint as job images. Pass `?folder=kyc-documents` or `?folder=kyc-selfies`:

```
POST /uploads?folder=kyc-documents   → ID document (photo or PDF)
POST /uploads?folder=kyc-selfies     → Selfie photo
```

In dev (no Cloudinary): files saved to `./uploads/` on the server.
In prod (Cloudinary configured): uploaded to `robust-home/kyc-documents/` etc.

Cloudinary `resource_type="auto"` handles both images and PDFs automatically.

---

## DOJAH Notes (Nigeria-specific)

- **Sandbox**: Create account at `dojah.io`, skip compliance/wallet — sandbox API keys are available immediately.
- **Test NINs**: DOJAH provides test NINs in their sandbox documentation for verifying the integration.
- **Production**: Complete DOJAH onboarding (company details, compliance, fund wallet) before going live.
- **Name matching**: The implementation does a loose "any word from the user's registered name appears in the DOJAH name" check. This handles partial names and middle name omissions. Admin can override regardless.
- **DOJAH endpoint used**: `GET /api/v1/kyc/nin?nin={nin}` with headers `Authorization: <secret_key>` and `AppId: <app_id>`.
- **Response structure**: `{ entity: { first_name, last_name, date_of_birth, gender, ... } }`

---

## Adapting to Other Countries / Providers

| Country | Identity provider | API type |
|---|---|---|
| Nigeria | DOJAH | NIN, BVN, Voter ID, Driver's License |
| Ghana | GhanaPostGPS / Dojah | Ghana Card |
| Kenya | Africa's Talking / Smile Identity | National ID |
| South Africa | Smile Identity | National ID |
| Generic | Onfido, Sumsub, Veriff | Passport, Driver's License (global) |

To swap the provider, only `_check_nin_dojah()` in `kyc.py` needs to change. The rest of the flow (status machine, admin UI, mobile screens) is provider-agnostic.

---

## Testing Checklist

| Test | Expected |
|---|---|
| Worker submits KYC (NIN + docs) | `kyc_status = pending_review` |
| Worker tries to apply without KYC | 403 from backend; orange button on mobile |
| Admin DOJAH check | Inline result card in drawer |
| Admin approves without DOJAH | Worker can apply immediately |
| Admin approves after DOJAH check | Worker can apply immediately |
| Admin rejects with reason | Worker sees reason on mobile + resubmit form |
| Worker resubmits after rejection | `kyc_status = pending_review` again |
| Client submits NIN only | `kyc_status = pending_review` (no doc required) |
| Client KYC approved | Green "Verified" badge on profile |
| Alembic migration | `alembic upgrade head` adds all 6 columns cleanly |
| DOJAH keys absent | DOJAH check returns 503; approve/reject still works |
