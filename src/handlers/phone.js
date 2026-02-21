import { STATE, DELAY } from "../constants.js";
import { log } from "../log.js";
import { transition, getConfig, setLastPath } from "../state.js";
import { humanScroll, humanDelay, humanFillInput, humanClickNext } from "../human.js";
import { waitFor } from "../helpers.js";
import { apiRequestWithRetry } from "../api.js";
import { saveSession } from "../session.js";

function hasPhoneRejectionError() {
  const text = document.body.textContent;
  return text.includes("has been used too many times") ||
    text.includes("cannot be used for verification");
}

export async function handlePhoneVerificationPage() {
  transition(STATE.PHONE_VERIFICATION);
  log("→ handlePhoneVerificationPage");

  await waitFor("#phoneNumberId");

  const config = getConfig();
  const numberRejected = hasPhoneRejectionError();

  if (numberRejected || config.phoneNumber) {
    log(
      numberRejected
        ? "Phone number rejected, renewing"
        : "Returning to phone page, renewing number",
    );
    try {
      const renewData = await apiRequestWithRetry("POST", "/sms/renew", {
        email: config.email,
      });
      log("Renew response:", JSON.stringify(renewData));
      config.phoneNumber = renewData.phoneNumber;
      saveSession();
    } catch (err) {
      log("Renew error after retries:", err);
      return false;
    }
    await humanDelay(1000, 2000);
  } else {
    let data;
    try {
      data = await apiRequestWithRetry("POST", "/sms/request", {
        email: config.email,
      });
    } catch (err) {
      log("SMS request error after retries:", err);
      return false;
    }
    log("SMS request response:", JSON.stringify(data));
    config.phoneNumber = data.phoneNumber;
    saveSession();
  }

  await humanScroll();
  await humanDelay(1000, 3000);

  await humanFillInput("#phoneNumberId", config.phoneNumber);
  await humanClickNext();

  setTimeout(() => {
    if (hasPhoneRejectionError()) {
      log("Detected 'too many times' error after submit, re-running handler");
      setLastPath("");
      handlePhoneVerificationPage().catch((e) =>
        log("Re-run handler error:", e),
      );
    }
  }, 5000);

  return true;
}
