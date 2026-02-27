"use strict";

import { TAG, STATE, SESSION_KEY } from "./constants.js";
import { log } from "./log.js";
import { transition, getState, getLastPath, setLastPath, isHandlerInFlight, setHandlerInFlight, isSubmitLocked, clearSubmitLock } from "./state.js";
import { loadSession, startNewSession } from "./session.js";
import { stopSmsPoller } from "./sms.js";
import { createStartButton, triggerStart } from "./ui/panel.js";
import { handleSignInPage } from "./handlers/signin.js";
import { handleNamePage } from "./handlers/name.js";
import { handleBirthdayGenderPage } from "./handlers/birthday.js";
import { handleUsernamePage } from "./handlers/username.js";
import { handlePasswordPage } from "./handlers/password.js";
import { handlePhoneVerificationPage } from "./handlers/phone.js";
import { handleSmsCodePage } from "./handlers/sms-code.js";
import { handleRecoveryEmailPage } from "./handlers/recovery.js";
import { handleRecoveryPhonePage } from "./handlers/recovery-phone.js";
import { handleConfirmationPage } from "./handlers/confirmation.js";
import { handleTermsPage } from "./handlers/terms.js";
import { handleSecurityChallengePage } from "./handlers/security-challenge.js";
import { handleSecurityPage } from "./handlers/security.js";
import { handleRecoveryVerifyPage } from "./handlers/recovery-verify.js";
import { handleMyAccountPage } from "./handlers/myaccount.js";

const HANDLER_TIMEOUT = 120000; // 2 minutes
const RERUN_COOLDOWN = 5000;    // 5s before retrying same-URL handler

function withTimeout(promise, timeoutMs, label) {
  let t;
  const timeout = new Promise((_, reject) => {
    t = setTimeout(() => reject(new Error("Timeout: " + label)), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(t));
}

console.log(TAG, "Script loaded on", window.location.href);

// Auto-start: if on the trigger URL, set flag and redirect to accounts page
if (window.location.hostname === "example.com" && window.location.pathname === "/autostart") {
  console.log(TAG, "Auto-start triggered via URL");
  GM_setValue("gah_autostart", true);
  window.location.href = "https://accounts.google.com/lifecycle/steps/signup/name";
}

// Only run on top-level pages of accounts.google.com or myaccount.google.com
else if (
  window.location.hostname !== "accounts.google.com" &&
  window.location.hostname !== "myaccount.google.com"
) {
  console.log(TAG, "Skipping - not on target domain");
} else {
  console.log(TAG, "Initializing...");

  // ---- ROUTE TABLE ----

  const ROUTES = [
    { match: "/signup/name", handler: handleNamePage, state: STATE.FILLING_NAME },
    { match: "/signup/birthdaygender", handler: handleBirthdayGenderPage, state: STATE.FILLING_BIRTHDAY },
    { match: "/signup/username", handler: handleUsernamePage, state: STATE.FILLING_USERNAME },
    { match: "/signup/password", handler: handlePasswordPage, state: STATE.FILLING_PASSWORD },
    { match: "/signup/startmtsmsidv", handler: handlePhoneVerificationPage, state: STATE.PHONE_VERIFICATION },
    { match: "/signup/verifyphone/idv", handler: handleSmsCodePage, state: STATE.WAITING_SMS },
    { match: "/signup/addrecoveryemail", handler: handleRecoveryEmailPage, state: STATE.FILLING_RECOVERY },
    { match: "/signup/webaddrecoveryphone", handler: handleRecoveryPhonePage, state: STATE.SKIPPING_RECOVERY_PHONE },
    { match: "/signup/confirmation", handler: handleConfirmationPage, state: STATE.CONFIRMING },
    { match: "/signup/termsofservice", handler: handleTermsPage, state: STATE.ACCEPTING_TERMS },
    { match: "/signin/challenge/pwd", handler: handleSecurityChallengePage, state: STATE.SECURITY_CHALLENGE },
  ];

  // ---- MYACCOUNT ROUTE TABLE ----

  const MYACCOUNT_ROUTES = [
    { match: "/recovery/email", handler: handleRecoveryVerifyPage, state: STATE.VERIFYING_RECOVERY_EMAIL },
    { match: "/security", handler: handleSecurityPage, state: STATE.NAVIGATING_RECOVERY_EMAIL },
  ];

  // ---- PAGE DETECTION (URL polling) ----

  const lastDispatchAt = {};

  function detectAndRun() {
    if (getState() === STATE.IDLE || getState() === STATE.ERROR) return;
    if (isHandlerInFlight()) return;

    const path = window.location.pathname;
    const pathChanged = path !== getLastPath();

    if (pathChanged) {
      setLastPath(path);
      clearSubmitLock();
      log("URL changed:", path);

      if (getState() === STATE.WAITING_SMS && !path.includes("/signup/verifyphone/idv")) {
        stopSmsPoller();
      }
    }

    const route = ROUTES.find((r) => path.includes(r.match));
    const key = route ? route.match : "signin";

    if (!pathChanged) {
      if (isSubmitLocked()) return;
      if (Date.now() - (lastDispatchAt[key] || 0) < RERUN_COOLDOWN) return;
    }

    const stepId = key.replace(/^\//, "");
    const startTime = Date.now();

    setHandlerInFlight(true);
    log.step("▶", stepId);

    withTimeout(
      Promise.resolve(route ? route.handler() : handleSignInPage()),
      HANDLER_TIMEOUT,
      stepId
    )
      .then((result) => {
        const dur = ((Date.now() - startTime) / 1000).toFixed(1);
        if (result === false) {
          log.error("✗", stepId, dur + "s", "FAILED");
          transition(STATE.ERROR, "Handler failed on " + path);
        } else {
          log.step("✓", stepId, dur + "s");
        }
      })
      .catch((err) => {
        const dur = ((Date.now() - startTime) / 1000).toFixed(1);
        log.error("✗", stepId, dur + "s", err.message || "Unknown error");
        transition(STATE.ERROR, err.message || "Unknown error occurred");
      })
      .finally(() => {
        setHandlerInFlight(false);
        lastDispatchAt[key] = Date.now();
      });
  }

  const lastMyAccountDispatchAt = {};

  function detectAndRunMyAccount() {
    if (getState() === STATE.IDLE || getState() === STATE.ERROR) return;
    if (isHandlerInFlight()) return;

    const path = window.location.pathname;
    const pathChanged = path !== getLastPath();

    if (pathChanged) {
      setLastPath(path);
      clearSubmitLock();
      log("myaccount URL changed:", path);
    }

    const route = MYACCOUNT_ROUTES.find((r) => path.includes(r.match));
    const handler = route ? route.handler : handleMyAccountPage;
    const key = route ? route.match : "myaccount";

    if (!pathChanged) {
      if (isSubmitLocked()) return;
      if (Date.now() - (lastMyAccountDispatchAt[key] || 0) < RERUN_COOLDOWN) return;
    }

    const stepId = key === "myaccount" ? "myaccount" : key.replace(/^\//, "");
    const startTime = Date.now();

    setHandlerInFlight(true);
    log.step("▶", stepId);

    withTimeout(
      Promise.resolve(handler()),
      HANDLER_TIMEOUT,
      stepId
    )
      .then((result) => {
        const dur = ((Date.now() - startTime) / 1000).toFixed(1);
        if (result === false) {
          log.error("✗", stepId, dur + "s", "FAILED");
          transition(STATE.ERROR, "Handler failed on " + path);
        } else {
          log.step("✓", stepId, dur + "s");
        }
      })
      .catch((err) => {
        const dur = ((Date.now() - startTime) / 1000).toFixed(1);
        log.error("✗", stepId, dur + "s", err.message || "Unknown error");
        transition(STATE.ERROR, err.message || "Unknown error occurred");
      })
      .finally(() => {
        setHandlerInFlight(false);
        lastMyAccountDispatchAt[key] = Date.now();
      });
  }

  // ---- INIT ----

  if (window.location.hostname === "myaccount.google.com") {
    log("On myaccount.google.com");

    async function tryLoadSessionAndRun() {
      const MAX_RETRIES = 5;
      const RETRY_DELAY = 2000;
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        if (loadSession()) {
          log("Session found on attempt " + attempt);
          transition(STATE.ACCEPTING_TERMS);
          log("Resuming from session on myaccount");
          createStartButton(true);
          setInterval(detectAndRunMyAccount, 400);
          detectAndRunMyAccount();
          return;
        }
        log.warn("Session not found, retry " + attempt + "/" + MAX_RETRIES);
        await new Promise((r) => setTimeout(r, RETRY_DELAY));
      }
      log("No session found after " + MAX_RETRIES + " retries, showing Start button");
      createStartButton(false);
    }

    tryLoadSessionAndRun().catch((err) => log.error("myaccount init error:", err));
  } else {
    const hasSession = loadSession();
    setInterval(detectAndRun, 400);
    if (hasSession) {
      transition(STATE.SIGNING_IN);
      log("Resuming from session");
      createStartButton(true);
      detectAndRun();
    } else {
      log("No session, showing Start button");
      createStartButton(false);

      if (GM_getValue("gah_autostart", false)) {
        GM_deleteValue("gah_autostart");
        log("Auto-start: triggering Start");
        setTimeout(() => {
          if (triggerStart) triggerStart();
        }, 500);
      }
    }
  }
}
