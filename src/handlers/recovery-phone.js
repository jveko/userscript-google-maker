import { STATE, DELAY } from "../constants.js";
import { log } from "../log.js";
import { transition } from "../state.js";
import { humanDelay, humanClick } from "../human.js";
import { waitFor, getElementByXpath } from "../helpers.js";

export async function handleRecoveryPhonePage() {
  transition(STATE.SKIPPING_RECOVERY_PHONE);
  log("→ handleRecoveryPhonePage (skipping)");
  await waitFor("#phoneNumberId");
  await humanDelay(DELAY.MEDIUM);

  const btn =
    document.querySelector("#recoverySkip button") ||
    getElementByXpath("//button[.//span[text()='Skip']]");
  if (btn) {
    await humanDelay(DELAY.LONG);
    await humanClick(btn);
    log("Clicked 'Skip'");
  } else {
    log.warn("'Skip' button not found on recovery phone page");
  }
  return true;
}
