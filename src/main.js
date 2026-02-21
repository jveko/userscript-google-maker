"use strict";

import { TAG, STATE, SESSION_KEY } from "./constants.js";
import { log } from "./log.js";
import { transition, getState, getLastPath, setLastPath } from "./state.js";
import { loadSession } from "./session.js";
import { stopSmsPoller } from "./sms.js";
import { createStartButton } from "./ui/panel.js";
import { handleSignInPage } from "./handlers/signin.js";
import { handleNamePage } from "./handlers/name.js";
import { handleBirthdayGenderPage } from "./handlers/birthday.js";
import { handleUsernamePage } from "./handlers/username.js";
import { handlePasswordPage } from "./handlers/password.js";
import { handlePhoneVerificationPage } from "./handlers/phone.js";
import { handleSmsCodePage } from "./handlers/sms-code.js";
import { handleRecoveryEmailPage } from "./handlers/recovery.js";
import { handleConfirmationPage } from "./handlers/confirmation.js";
import { handleTermsPage } from "./handlers/terms.js";
import { handleMyAccountPage } from "./handlers/myaccount.js";

console.log(TAG, "Script loaded on", window.location.href);

// Only run on top-level pages of accounts.google.com or myaccount.google.com
const hostname = window.location.hostname;
if (
  hostname !== "accounts.google.com" &&
  hostname !== "myaccount.google.com"
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
    { match: "/signup/confirmation", handler: handleConfirmationPage, state: STATE.CONFIRMING },
    { match: "/signup/termsofservice", handler: handleTermsPage, state: STATE.ACCEPTING_TERMS },
  ];

  // ---- PAGE DETECTION (URL polling) ----

  function detectAndRun() {
    if (getState() === STATE.IDLE) return;
    const path = window.location.pathname;
    if (path === getLastPath()) return;
    setLastPath(path);
    log("URL changed:", path);

    // Stop SMS poller when navigating away from SMS page
    if (getState() === STATE.WAITING_SMS && !path.includes("/signup/verifyphone/idv")) {
      stopSmsPoller();
    }

    const route = ROUTES.find((r) => path.includes(r.match));
    const handler = route ? route.handler() : handleSignInPage();

    if (handler && typeof handler.catch === "function") {
      handler.catch((err) => log("Handler error:", err));
    }
  }

  // ---- INIT ----

  if (window.location.hostname === "myaccount.google.com") {
    log("On myaccount.google.com");
    if (loadSession()) {
      log("Session found, confirming account");
      handleMyAccountPage();
    } else {
      log("No session found, showing Start button");
      createStartButton();
    }
  } else {
    if (loadSession()) {
      transition(STATE.SIGNING_IN);
      log("Resuming from session");
      setInterval(detectAndRun, 1000);
      detectAndRun();
    } else {
      log("No session, showing Start button");
      setInterval(detectAndRun, 1000);
      createStartButton();
    }
  }
}
