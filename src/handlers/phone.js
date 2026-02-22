import { STATE, DELAY } from "../constants.js";
import { log } from "../log.js";
import { transition, getConfig } from "../state.js";
import { humanScroll, humanDelay, humanFillInput, humanClickNext } from "../human.js";
import { waitFor, awaitNavigationOrError } from "../helpers.js";
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
        id: config.id,
      });
      log("Renew success:", JSON.stringify(renewData));
      config.phoneNumber = renewData.phoneNumber;
      saveSession();
    } catch (err) {
      log("Renew error:", err);
      return false;
    }
    await humanDelay(400, 800);
  } else {
    let data;
    try {
      data = await apiRequestWithRetry("POST", "/sms/request", {
        id: config.id,
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
  await humanDelay(400, 1000);

  await humanFillInput("#phoneNumberId", config.phoneNumber);
  await humanClickNext();

  const hasError = await awaitNavigationOrError([hasPhoneRejectionError]);
  if (hasError) {
    log("Detected 'too many times' error after submit, re-running handler");
    return handlePhoneVerificationPage();
  }

  return true;
}
