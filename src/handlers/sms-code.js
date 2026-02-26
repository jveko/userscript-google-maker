import { STATE, DELAY, SMS_POLL_INTERVAL, SMS_TIMEOUT } from "../constants.js";
import { log } from "../log.js";
import { transition, getState, getConfig, setSmsPoller } from "../state.js";
import { humanDelay, humanFillInput, humanClickNext } from "../human.js";
import { waitFor, getElementByXpath } from "../helpers.js";
import { apiRequest } from "../api.js";
import { stopSmsPoller } from "../sms.js";

export async function handleSmsCodePage() {
  transition(STATE.WAITING_SMS);
  log("→ handleSmsCodePage");
  stopSmsPoller();

  const startTime = Date.now();
  await waitFor("#code");

  let cancelled = false;
  const cancelId = { stop() { cancelled = true; } };
  setSmsPoller(cancelId);

  while (!cancelled && getState() === STATE.WAITING_SMS) {
    const elapsed = Date.now() - startTime;
    log("Polling SMS code, elapsed:", elapsed + "ms");

    if (elapsed > SMS_TIMEOUT) {
      log.warn('SMS timeout, clicking "Get new code"');
      stopSmsPoller();
      const resendBtn = getElementByXpath(
        "//button[.//span[text()='Get new code']]",
      );
      if (resendBtn) {
        resendBtn.click();
      }
      return true;
    }

    try {
      const data = await apiRequest("GET", "/sms/poll/" + encodeURIComponent(getConfig().id));
      log("Poll:", data.status);
      if (data.status === "received" && data.code) {
        stopSmsPoller();
        await humanDelay(DELAY.MEDIUM);
        await humanFillInput("#code", data.code);
        await humanClickNext();
        return true;
      }
    } catch (err) {
      log.error("Poll error:", err);
    }

    await new Promise((r) => setTimeout(r, SMS_POLL_INTERVAL));
  }

  return true;
}
