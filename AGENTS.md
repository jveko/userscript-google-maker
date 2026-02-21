# AGENTS.md

## Project Overview
Modular Tampermonkey userscript that automates Google account signup flow with SMS verification. Source is split into ES modules under `src/`, bundled by esbuild into a single IIFE userscript for deployment. Targets iOS Safari/Userscripts app.

## Architecture
- **Modular source** (`src/`) → esbuild bundles → `dist/google-accounts.user.js`
- **Cloudflare Worker API** (`api-google-maker.cloudflare-5e0.workers.dev`) for profile generation, SMS handling, and account confirmation
- **Session persistence** via `GM_setValue`/`GM_getValue` (cross-origin, persists across `accounts.google.com` ↔ `myaccount.google.com`)
- **URL polling** (`setInterval`) detects page changes and dispatches to async page handlers
- **Human-like simulation** layer (typing, delays, scrolling) for anti-detection

## Source Structure
```
src/
  main.js              — entry point, route table, init logic
  constants.js          — MONTH_NAMES, API_BASE, DELAY, STATE, etc.
  state.js              — mutable shared state (config, currentState, smsPoller)
  log.js                — log panel + log() function
  session.js            — GM_setValue/GM_getValue persistence
  api.js                — apiRequest, apiRequestWithRetry, fetchConfig
  human.js              — humanDelay, humanType, humanScroll, etc.
  helpers.js            — waitFor (MutationObserver), getElementByXpath
  sms.js                — SMS poller management
  handlers/
    signin.js, name.js, birthday.js, username.js, password.js,
    phone.js, sms-code.js, recovery.js, confirmation.js, terms.js,
    myaccount.js
  ui/
    panel.js            — floating control panel (start/clear buttons)
  banner.txt            — userscript header block (version lives here)
```

## Code Style
- ES modules in `src/`, bundled into single IIFE by esbuild
- `GM_xmlhttpRequest` for cross-origin API calls (Tampermonkey API)
- Async page handlers using `waitFor()` (MutationObserver) + `humanType()`/`humanDelay()` helpers
- XPath (`getElementByXpath`) for buttons, CSS selectors for inputs
- Logging via custom `log()` that writes to both `console.log` and an on-page panel
- No TypeScript, no linter, no formatter — keep it plain ES2017+ JS
- Follow existing patterns: `async function handleXxxPage()` naming, `await humanDelay()` between actions

## Versioning & Deployment
- **Bump `@version` in `src/banner.txt`** on every change (semver: major.minor.patch)
- **Build:** `npm run build` (esbuild bundles `src/main.js` → `dist/google-accounts.user.js`)
- **Watch:** `npm run watch` (rebuilds on file changes)
- **Deploy:** `./deploy.sh` (builds + deploys to Cloudflare Pages)
- **Install URL:** `https://google-maker.pages.dev/google-accounts.user.js`
