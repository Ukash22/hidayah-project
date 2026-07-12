# Mobile / Capacitor Audit — Findings

Audit #8 from the [audit index](../audit-index.md). Scope: Capacitor config, viewport behaviour, native plugin usage, offline behaviour, push notification wiring.

Setup found: Capacitor 8, `webDir: ../frontend/dist` (frontend bundle shipped inside the app), **zero plugins installed**, Android + iOS platforms present.

Severity: 🔴 App-breaking · 🟠 High · 🟡 Medium · 🟢 Low

---

## M1 🔴 CORS blocks every API call from the installed app — ✅ Fixed

`CORS_ALLOWED_ORIGINS` listed only the Render domains and localhost dev ports. The Capacitor webview serves the bundle from `https://localhost` (Android) / `capacitor://localhost` (iOS) — **neither was allowed, so every API request from the installed app fails preflight**. The app cannot log in at all.

**Fixed:** both origins added to `CORS_ALLOWED_ORIGINS` in `backend/core/settings.py`.

## M2 🔴 Live classes cannot access camera/microphone — ✅ Fixed

- **Android:** `AndroidManifest.xml` declared only `INTERNET`. WebRTC (`getUserMedia`) in the webview requires `CAMERA`, `RECORD_AUDIO`, and `MODIFY_AUDIO_SETTINGS`.
- **iOS:** `Info.plist` had no `NSCameraUsageDescription` / `NSMicrophoneUsageDescription` — iOS **kills the app instantly** when the webview requests media without them.

**Fixed:** Android permissions declared; iOS usage descriptions added. (Capacitor's bridge grants webview `getUserMedia` requests once the OS-level permissions are held.)

## M3 🟠 Paystack payment flow strands users outside the app — ⬜ Needs design decision

`PaymentPage` does `window.location.href = authorization_url`. In the webview this navigates the app itself to Paystack, and Paystack's success redirect goes to `https://hidayah-frontend.onrender.com/payment/callback` — the **hosted web app**, a different origin from the bundled app. The user lands on the hosted site's login screen (no token in that origin's storage), inside the webview, with the bundled app effectively gone until restart.

**Options (pick one):**
1. **`@capacitor/browser`** — open Paystack in the system browser sheet, poll `/api/payments/status/` in the app while it's open, close the sheet on confirmation. Least moving parts, recommended.
2. Deep link (`App` plugin + custom URL scheme) as the Paystack callback for app builds — cleanest UX, more setup (backend must vary `callback_url` per client).
3. Leave web-only payments; hide top-up in the app (Apple may require this anyway for iOS review, since off-store payment for digital services violates App Store rules — **check policy before shipping iOS**).

## M4 🟠 Notch/status-bar overlap — ✅ Fixed (viewport), 🟡 shell padding pending

`index.html` viewport lacked `viewport-fit=cover`; fixed sticky headers (TopBar, CBT header) can sit under the iOS notch/Android status bar.

**Fixed:** `viewport-fit=cover` added. **Pending:** add `padding-top: env(safe-area-inset-top)` to the fixed TopBar/Navbar and `env(safe-area-inset-bottom)` to bottom drawers when testing on a notched device.

## M5 🟡 Push notifications not wired

No `@capacitor/push-notifications` plugin; backend `notifications` app is in-app-only (bell icon). Wiring push = plugin + FCM/APNs setup + a device-token model + send hooks in `core/tasks.py`. Worthwhile once the app ships, meaningless before then. Defer.

## M6 🟡 Offline behaviour

The shell loads offline (bundled assets) but every screen needs the API. The FetchError/ErrorBoundary work from the error-handling audit already provides graceful "couldn't load → retry" UX, which is the right level for this app. No service worker needed. Consider `@capacitor/network` later for an explicit offline banner.

## M7 🟢 Placeholder app identity

`appId: com.hidayah.testapp`, `appName: "Hidayah Test"`. **The appId cannot be changed after store publication** without shipping a brand-new app. Decide the final reverse-DNS id (e.g. `com.hidayah.app`) before any store upload; also regenerate icons/splash (`@capacitor/assets`) — currently default Capacitor icons.

## M8 🟢 No StatusBar/SplashScreen config

No `@capacitor/status-bar` or `@capacitor/splash-screen` plugins; defaults will show a white flash and default splash. Cosmetic; bundle with the store-prep work in M7.
