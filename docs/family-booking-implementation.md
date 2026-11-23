# Family & Sibling Tutor Booking Implementation Guide

This document details the architecture, fee calculation formulas, database models, payment fulfillment lifecycle, and frontend integration for the **Family & Sibling Tutoring Engine** on the Hidayah platform.

---

## 1. Overview & Business Model

Modeled after international tutoring platforms (e.g., Outschool, Preply, Cambly Kids), this feature enables parents and guardians to book private or semi-private sessions for multiple family members under a single consolidated invoice, automated scheduling pipeline, and sibling discount model.

### Supported Booking Modes

| Mode | Value | Description | Pricing Model |
| :--- | :--- | :--- | :--- |
| **Individual (1-on-1)** | `INDIVIDUAL` | Standard private 1-on-1 session for a single child. | 100% of tutor base hourly rate. |
| **Learn Together (Shared Cohort)** | `FAMILY_SHARED` | All siblings attend the **same session** simultaneously with the tutor. | Base rate + incremental sibling add-ons (**saves up to 55%**). |
| **Separate 1-on-1s (Bundle)** | `FAMILY_BUNDLE` | Each child receives dedicated, private 1-on-1 slots with the tutor. | Tiered multi-student invoice discount (**10% - 20% off**). |

---

## 2. Dynamic Fee Calculation Formulas

The pricing logic is centralized in [`backend/classes/family_pricing.py`](file:///c:/Users/tughytuhgj/OneDrive/Desktop/hidayah-project/backend/classes/family_pricing.py).

### A. Shared Family Cohort (`FAMILY_SHARED`)

All $N$ siblings participate in the same virtual classroom session. The session cost applies an incremental multiplier to the tutor's base rate:

$$\text{Session Cost} = \text{Base Hourly Rate} \times \text{Hours} \times \left(1 + \sum_{k=2}^{N} \alpha_k \right)$$

* **Child 1 (Base):** $100\%$ ($1.0$)
* **Child 2 Add-on ($\alpha_2$):** $+35\%$ ($0.35$) $\rightarrow$ *65% sibling discount*
* **Child 3 Add-on ($\alpha_3$):** $+25\%$ ($0.25$) $\rightarrow$ *75% sibling discount*
* **Child 4+ Add-on ($\alpha_{4+}$):** $+20\%$ each ($0.20$) $\rightarrow$ *80% sibling discount*

$$\text{4-Week Cycle Total} = \text{Session Cost} \times (\text{Days per Week} \times 4)$$
$$\text{Sibling Discount Amount} = \text{Undiscounted Total} - \text{Cycle Total}$$

### B. Family Multi-Child Bundle (`FAMILY_BUNDLE`)

Each child has separate private 1-on-1 slots. The parent receives an overall volume discount on the invoice:

* **2 Children:** $10\%$ off total invoice
* **3 Children:** $15\%$ off total invoice
* **4+ Children:** $20\%$ off total invoice

---

## 3. Database Schema Extensions

### `Booking` Model ([`backend/classes/models.py`](file:///c:/Users/tughytuhgj/OneDrive/Desktop/hidayah-project/backend/classes/models.py))

Added in migration `0018_booking_booking_type_booking_original_price_and_more.py`:

```python
class Booking(models.Model):
    BOOKING_TYPE_CHOICES = (
        ('INDIVIDUAL', 'Individual (1-on-1)'),
        ('FAMILY_SHARED', 'Family Shared Class'),
        ('FAMILY_BUNDLE', 'Family Individual Bundle'),
    )

    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='student_bookings')
    parent = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='parent_bookings')
    participating_students = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='family_class_bookings', blank=True)
    booking_type = models.CharField(max_length=30, choices=BOOKING_TYPE_CHOICES, default='INDIVIDUAL')
    
    price = models.DecimalField(max_digits=10, decimal_places=2)                     # Final payable amount
    original_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)  # Undiscounted total
    sibling_discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    sibling_discount_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
```

---

## 4. Payment & Automated Class Fulfillment Lifecycle

When payment is confirmed via Paystack webhook or internal wallet debit:

```
[Payment Success] 
       │
       ▼
fulfill_and_generate_sessions_for_booking(booking)
       │
       ├─► 1. Update StudentProfile for all participating children
       │      • assigned_tutor = booking.tutor
       │      • payment_status = 'PAID'
       │      • enrolled_courses.add(subject)
       │
       ├─► 2. Create / Update Enrollment records for each child
       │      • status = 'APPROVED'
       │
       ├─► 3. If FAMILY_SHARED: Create or retrieve Batch
       │      • Batch.name = "Family Cohort: [Subject] ([Parent/Student Name])"
       │      • Batch.students.set(participating_students)
       │
       ├─► 4. Generate 4 Weeks of ScheduledSession entries
       │      • Scheduled for all normalized day/time slots
       │      • Bound to the Batch and all participating children
       │      • Unified live classroom link (/live/{session.id} or tutor's meeting link)
       │
       └─► 5. Booking marked paid=True, approved=True, notifications dispatched
```

Key file: [`backend/payments/services.py`](file:///c:/Users/tughytuhgj/OneDrive/Desktop/hidayah-project/backend/payments/services.py)

---

## 5. API Endpoints

### 1. Dynamic Pricing Quote
* **URL:** `POST /api/classes/family-pricing/`
* **Access:** Public / Authenticated
* **Request Payload:**
```json
{
  "tutor_id": 12,
  "hours_per_session": 1.0,
  "days_per_week": 2,
  "student_count": 2,
  "booking_type": "FAMILY_SHARED",
  "weeks": 4
}
```
* **Response:**
```json
{
  "booking_type": "FAMILY_SHARED",
  "student_count": 2,
  "base_hourly_rate": 3000.0,
  "hours_per_session": 1.0,
  "days_per_week": 2,
  "total_sessions": 8,
  "base_session_cost": 3000.0,
  "original_price": 48000.0,
  "discount_amount": 15600.0,
  "discount_percentage": 32.5,
  "final_price": 32400.0,
  "price_per_session": 4050.0,
  "tier_description": "Family Shared Cohort (2 siblings learning together)"
}
```

### 2. Create Family Booking
* **URL:** `POST /api/classes/booking/request/`
* **Access:** Authenticated (Student or Parent)
* **Request Payload:**
```json
{
  "tutor_id": 12,
  "subject": "Quran & Tajweed",
  "booking_type": "FAMILY_SHARED",
  "student_ids": [5, 6],
  "hours_per_session": 1.0,
  "schedule": [
    {"day": "Monday", "time": "16:00-17:00"},
    {"day": "Wednesday", "time": "16:00-17:00"}
  ],
  "preferred_start_date": "2026-11-25"
}
```

### 3. Payment Initiation & Wallet Checkout
* **Paystack:** `POST /api/payments/booking/initiate/<booking_id>/`
* **Wallet:** `POST /api/payments/booking/wallet-pay/<booking_id>/`
* **Security:** Permissions allow student, parent, or any participating child to pay.

---

## 6. Frontend UI Components

1. **[`frontend/src/components/BookingModal.jsx`](file:///c:/Users/tughytuhgj/OneDrive/Desktop/hidayah-project/frontend/src/components/BookingModal.jsx):**
   * Detects if the logged-in user is a Parent (`role === 'PARENT'`).
   * Fetches the parent's registered children from `/api/parents/dashboard/child_dashboard/`.
   * Displays mode selectors: *Individual*, *Learn Together (Shared)*, and *Separate 1-on-1s (Bundle)*.
   * Checkbox list for selecting participating siblings.
   * Live pricing preview showing original price, sibling discount badge, and final fee.
2. **[`frontend/src/pages/BookingRequest.jsx`](file:///c:/Users/tughytuhgj/OneDrive/Desktop/hidayah-project/frontend/src/pages/BookingRequest.jsx):**
   * Passes `booking_type` and `student_ids` in the booking creation payload.

---

## 7. Verification & Automated Tests

All test cases are located in [`backend/tests/test_family_booking.py`](file:///c:/Users/tughytuhgj/OneDrive/Desktop/hidayah-project/backend/tests/test_family_booking.py) and executed via:

```bash
backend\venv\Scripts\python.exe backend\manage.py test tests.test_family_booking
```

### Test Coverage:
* `test_single_student_individual_fee`: Verifies standard baseline 1-on-1 price with 0% discount.
* `test_shared_family_cohort_two_siblings`: Verifies 35% add-on formula (32.5% net family savings).
* `test_shared_family_cohort_three_siblings`: Verifies 3-child add-on formula (46.7% net family savings).
* `test_family_bundle_separate_sessions`: Verifies 10% volume discount on separate 1-on-1 slots.
* `test_api_family_pricing_quote`: Verifies the `/api/classes/family-pricing/` REST endpoint.
* `test_parent_create_family_booking_and_payment_fulfillment`: Full end-to-end journey verifying parent booking creation, Paystack/wallet payment fulfillment, `Batch` generation, recurring `ScheduledSession` creation for both children, and room link provisioning.
* `test_student_registration_creates_pending_booking_and_requires_payment`: Full end-to-end journey verifying student registration with tutor/subject creates a pending `Booking` (`paid=False, approved=False`), sets `StudentProfile.payment_status='UNPAID'`, prevents premature session generation, renders "Pending Payment" on dashboard, transitions to "Waiting for Admin Approval" upon payment, and generates classes with live room links upon Admin approval.

---

## 8. Registration & Booking Payment Lifecycle

### Lifecycle States

```
[Student Registration with Tutor/Subject]
        │
        ├─► StudentProfile created: payment_status='UNPAID', approval_status='PENDING'
        ├─► Enrollment created: status='PENDING'
        ├─► Booking created: paid=False, approved=False
        └─► ZERO ScheduledSessions generated prematurely
        │
        ▼
[Student Logs In / Overview Dashboard]
        │
        ├─► StudentOverview renders "Pending Payment" banner with "Pay Now" button
        └─► Classes timetable displays "Classes appear here once your booking is finalized and paid"
        │
        ▼
[Student Completes Payment (Paystack / Wallet)]
        │
        ├─► Booking updated: paid=True, approved=False
        ├─► Notifications dispatched: "Payment Confirmed — Waiting for Admin Approval"
        └─► StudentOverview renders "⏳ Waiting for Admin Approval" banner
        │
        ▼
[Admin Approves Booking (Admin Bookings Panel)]
        │
        ├─► Booking updated: approved=True
        ├─► fulfill_and_generate_sessions_for_booking(booking) executes:
        │      • ScheduledSession instances created for 4 weeks with per-session fee
        │      • Live classroom meeting links provisioned (/live/{session.id} or tutor's room)
        │      • StudentProfile.payment_status updated to 'PAID'
        │      • Enrollment.status updated to 'APPROVED'
        └─► Student and tutor receive confirmation notifications with class link
```
