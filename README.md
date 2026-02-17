# Alemancenter Mobile

Modern React Native (Expo) app that mirrors the existing Next.js frontend features.

## Requirements
- Node.js 18+
- Expo CLI (`npm i -g expo-cli`)

## Setup
1. Install deps:
   ```bash
   npm install
   ```
2. Copy env file:
   ```bash
   cp .env.example .env
   ```
3. Update `.env` values:
   - `EXPO_PUBLIC_API_URL` -> your Laravel API base URL (e.g. https://api.alemancenter.com/api)
   - `EXPO_PUBLIC_FRONTEND_KEY` -> same value as `FRONTEND_API_KEY` in Laravel
   - `EXPO_PUBLIC_SITE_URL` -> public site URL (used for legal pages)

## Run
```bash
npm run start
```

## Quality Checks
```bash
npm run typecheck
npm run lint
```

## Notes
- The backend uses `FrontendApiGuard`. Mobile requests **must** include `X-Frontend-Key`.
- Country selection is persisted and sent via `X-Country-Id` / `X-Country-Code` headers.
- Replace placeholder icons in `assets/` before store submission.
- Legal pages are shown via WebView and require your public site URLs to be live.

## Store Compliance Checklist
- Privacy policy and terms available in-app (Legal screen).
- Contact screen provides user support channel.
- No background location or device permissions requested.


