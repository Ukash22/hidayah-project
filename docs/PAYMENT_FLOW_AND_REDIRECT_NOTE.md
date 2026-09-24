# Payment Redirection & Flow Documentation

**Date:** September 11, 2026  
**Related Components:**  
- `frontend/src/pages/PaymentPage.jsx`  
- `frontend/src/pages/PaymentCallback.jsx`  
- `frontend/src/App.jsx`  
- `backend/payments/paystack_service.py`  
- `backend/core/settings.py`  
- `backend/.env`  

---

## 1. Summary of Redirection Flow

When a payment is made (tuition, subject booking, or wallet funding), the platform redirects to the student dashboard through the following lifecycle:

### A. Online Gateway Payments (Card, Transfer, USSD via Paystack / Mock Mode)
1. **Initiation (`PaymentPage.jsx`)**:
   - The user selects a payment method and clicks "Pay".
   - The frontend requests `/api/payments/initiate/` or `/api/payments/booking/initiate/{id}/`.
   - The backend creates a transaction reference and returns the `authorization_url`.
2. **Gateway / Callback Redirection (`paystack_service.py`)**:
   - Once completed at the gateway (or simulated in mock mode), the browser is redirected to:
     ```text
     {FRONTEND_URL}/payment/callback?reference={reference}
     ```
3. **Verification & Dashboard Redirection (`PaymentCallback.jsx`)**:
   - `PaymentCallback.jsx` extracts the `reference` query parameter and calls:
     ```text
     GET /api/payments/verify/{reference}/
     ```
   - On successful confirmation:
     - Displays "Payment Successful!" with the reference ID and transaction amount.
     - Provides a **"📄 Download Receipt"** button (PDF generation).
     - Provides a **"Go to Dashboard"** button for immediate navigation.
     - Starts a 5-second automatic redirect countdown:
       ```javascript
       const destination = user?.role === 'PARENT' ? '/parent' : '/student';
       setTimeout(() => {
           navigate(destination);
       }, 5000);
       ```
4. **Student Portal Shell Routing (`App.jsx`)**:
   - Navigating to `/student` enters the nested student portal routes:
     ```jsx
     <Route path="/student" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentShell /></ProtectedRoute>}>
         <Route index element={<Navigate to="overview" replace />} />
         <Route path="overview" element={<StudentOverview />} />
     </Route>
     ```
   - The index route immediately lands the student on **`/student/overview`** (the Student Dashboard).

---

### B. Wallet Balance Payments
- In `PaymentPage.jsx`, if the student pays using their internal wallet balance:
- The frontend calls `POST /api/payments/booking/wallet-pay/{bookingId}/`.
- On success (`response.data.success`), it navigates directly to the dashboard with flash state:
  ```javascript
  navigate(user?.role === 'PARENT' ? '/parent' : '/student', {
      state: { message: 'Payment processed successfully using your wallet balance!' }
  });
  ```

---

## 2. Issues Discovered and Fixes Applied

### 1. Missing `FRONTEND_URL` in Backend Environment & Settings
- **Problem**: In `backend/payments/paystack_service.py`, payment initialization uses:
  ```python
  payload["callback_url"] = f"{settings.FRONTEND_URL}/payment/callback"
  ```
  and for mock mode:
  ```python
  frontend_url = getattr(settings, 'FRONTEND_URL', 'https://hidayah-frontend.onrender.com')
  ```
  Neither `settings.py` nor `backend/.env` had defined `FRONTEND_URL`. Consequently, in local development, payments were redirecting out of `http://localhost:5173` to the live production domain (`https://hidayah-frontend.onrender.com/payment/callback`), where local references failed or required separate login.
- **Fix**:
  - Added `FRONTEND_URL` in `backend/core/settings.py`:
    ```python
    FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:5173' if DEBUG else 'https://hidayah-frontend.onrender.com')
    ```
  - Added `FRONTEND_URL=http://localhost:5173` in `backend/.env`.

### 2. Role-Aware Redirection in Frontend
- **Problem**: `PaymentCallback.jsx` and `PaymentPage.jsx` were hardcoded to `navigate('/student')`. If a parent paid fees for their child, navigating to `/student` caused `ProtectedRoute` to trigger an extra redirect loop back to `/parent`.
- **Fix**:
  - Updated both automatic timeout and button clicks to dynamically evaluate:
    ```javascript
    const destination = user?.role === 'PARENT' ? '/parent' : '/student';
    navigate(destination);
    ```
  - Students smoothly land on `/student/overview` (Student Dashboard), while parents smoothly land on `/parent/overview` (Parent Dashboard).
