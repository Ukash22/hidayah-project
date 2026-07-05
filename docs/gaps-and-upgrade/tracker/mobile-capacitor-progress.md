# Mobile / Capacitor Audit — Progress Tracker

Tracks implementation against [mobile-capacitor-audit.md](../items/mobile-capacitor-audit.md).

> After pulling these changes, rebuild the app: `cd frontend && npm run build`, then `cd ../mobile_app && npx cap sync`.

---

## Phase M-A — App-breaking fixes 🔴 ✅ Complete

| # | Item | File | Status |
|---|---|---|---|
| 1 | CORS: allow `https://localhost` + `capacitor://localhost` (webview origins) | `backend/core/settings.py` | ✅ Done |
| 2 | Android: `CAMERA`, `RECORD_AUDIO`, `MODIFY_AUDIO_SETTINGS` permissions | `mobile_app/android/.../AndroidManifest.xml` | ✅ Done |
| 3 | iOS: `NSCameraUsageDescription` + `NSMicrophoneUsageDescription` (prevents instant kill on media request) | `mobile_app/ios/App/App/Info.plist` | ✅ Done |
| 4 | `viewport-fit=cover` for notch handling | `frontend/index.html` | ✅ Done |

> **Project stage note:** the app is in development, not publishing. Phases M-B/M-C/M-D below are **publish-stage** work — revisit them when a store release is planned; nothing blocks day-to-day development.

## Phase M-B — Payment flow in the app 🟠 ⬜ Pending (design decision)

| # | Item | Status |
|---|---|---|
| 5 | Choose: `@capacitor/browser` + status polling (recommended) · deep-link callback · web-only payments. **Check App Store policy for iOS before shipping top-ups in-app.** | ⬜ Decision needed |

## Phase M-C — Device polish ⬜ Pending (needs a physical device)

| # | Item | Status |
|---|---|---|
| 6 | Safe-area padding (`env(safe-area-inset-*)`) on TopBar/Navbar/bottom drawers — verify on a notched device | ⬜ Pending |
| 7 | StatusBar + SplashScreen plugins, app icons/splash via `@capacitor/assets` | ⬜ Pending |
| 8 | Final `appId` (currently `com.hidayah.testapp` — **cannot change after store publication**) + appName | ⬜ Decision needed |

## Phase M-D — Deferred until app ships

| # | Item | Status |
|---|---|---|
| 9 | Push notifications: `@capacitor/push-notifications` + FCM/APNs + device-token model + send hooks in `core/tasks.py` | ⏸ Deferred |
| 10 | `@capacitor/network` offline banner (FetchError panels already cover graceful degradation) | ⏸ Deferred |
