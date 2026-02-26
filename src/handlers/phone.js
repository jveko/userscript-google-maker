import { STATE, DELAY } from "../constants.js";
import { log } from "../log.js";
import { transition, getConfig, setLastPath } from "../state.js";
import {
  humanScroll,
  humanDelay,
  humanFillInput,
  humanClickNext,
} from "../human.js";
import { waitFor, awaitNavigationOrError } from "../helpers.js";
import { apiRequestWithRetry } from "../api.js";
import { saveSession } from "../session.js";

const MAX_PHONE_RENEW_ATTEMPTS = 5;

function hasPhoneRejectionError() {
  const text = document.body.textContent;
  return (
    text.includes("has been used too many times") ||
    text.includes("cannot be used for verification") ||
    text.includes("was a problem verifying your phone number")
  );
}

export async function handlePhoneVerificationPage() {
  transition(STATE.PHONE_VERIFICATION);
  log("→ handlePhoneVerificationPage");

  for (let attempt = 0; attempt < MAX_PHONE_RENEW_ATTEMPTS; attempt++) {
    await waitFor("#phoneNumberId");

    const config = getConfig();
    const numberRejected = hasPhoneRejectionError();

    if (attempt > 0 || numberRejected || config.phoneNumber) {
      if (numberRejected) {
        log.warn("Phone number rejected, renewing (attempt " + (attempt + 1) + "/" + MAX_PHONE_RENEW_ATTEMPTS + ")");
      } else {
        log("Returning to phone page, renewing number (attempt " + (attempt + 1) + "/" + MAX_PHONE_RENEW_ATTEMPTS + ")");
      }
      try {
        const renewData = await apiRequestWithRetry("POST", "/sms/renew", {
          id: config.id,
        });
        log("Renew success, new phone assigned");
        config.phoneNumber = renewData.phoneNumber;
        saveSession();
      } catch (err) {
        log.error("Renew error:", err);
        return false;
      }
      await humanDelay(1000, 2000);
    } else {
      let data;
      try {
        data = await apiRequestWithRetry("POST", "/sms/request", {
          id: config.id,
        });
      } catch (err) {
        log.error("SMS request error after retries:", err);
        return false;
      }
      log("SMS requested, phone assigned");
      config.phoneNumber = data.phoneNumber;
      saveSession();
    }

    await humanScroll();
    await humanDelay(1000, 2500);

    await humanFillInput("#phoneNumberId", config.phoneNumber);
    await humanClickNext();

    const hasError = await awaitNavigationOrError([hasPhoneRejectionError], {
      staleChecks: [() => { const el = document.querySelector("#phoneNumberId"); return el && el.value === ""; }]
    });
    if (hasError === false || hasError === null) {
      if (hasError === null) {
        log.warn("Page did not navigate after phone submit, allowing re-detection");
        setLastPath("");
      }
      return true;
    }

    log.warn("Detected phone rejection error after submit (attempt " + (attempt + 1) + "/" + MAX_PHONE_RENEW_ATTEMPTS + ")");
  }

  log.error("Phone verification failed after " + MAX_PHONE_RENEW_ATTEMPTS + " attempts");
  transition(STATE.ERROR, "Phone verification failed after " + MAX_PHONE_RENEW_ATTEMPTS + " attempts");
  return false;
}
