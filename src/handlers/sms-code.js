import { STATE, DELAY, SMS_POLL_INTERVAL, SMS_TIMEOUT } from "../constants.js";
import { log } from "../log.js";
import { transition, getConfig, setSmsPoller, setLastPath } from "../state.js";
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

  const poller = setInterval(() => {
    const elapsed = Date.now() - startTime;
    log("Polling SMS code, elapsed:", elapsed + "ms");

    if (elapsed > SMS_TIMEOUT) {
      log('SMS timeout, clicking "Get new code"');
      stopSmsPoller();
      const resendBtn = getElementByXpath(
        "//button[.//span[text()='Get new code']]",
      );
      if (resendBtn) {
        resendBtn.click();
        setLastPath("");
      }
      return;
    }

    apiRequest("GET", "/sms/poll/" + encodeURIComponent(getConfig().email))
      .then(async (data) => {
        log("Poll response:", JSON.stringify(data));
        if (data.status === "received" && data.code) {
          stopSmsPoller();
          await humanDelay(DELAY.MEDIUM);
          await humanFillInput("#code", data.code);
          await humanClickNext();
        }
      })
      .catch((err) => log("Poll error:", err));
  }, SMS_POLL_INTERVAL);
  setSmsPoller(poller);
  return true;
}
