import { STATE, DELAY } from "../constants.js";
import { log } from "../log.js";
import { transition, getConfig } from "../state.js";
import { humanScroll, humanDelay, humanFillInput } from "../human.js";
import { waitFor, getElementByXpath } from "../helpers.js";

export async function handleRecoveryEmailPage() {
  transition(STATE.FILLING_RECOVERY);
  log("→ handleRecoveryEmailPage");
  await waitFor("#recoveryEmailId");
  await humanScroll();
  await humanDelay(DELAY.MEDIUM);
  await humanFillInput("#recoveryEmailId", getConfig().recoveryEmail);

  await humanDelay(DELAY.LONG);
  const btn =
    document.querySelector("#recoveryNext button") ||
    getElementByXpath("//button[.//span[text()='Next']]");
  if (btn) btn.click();
  return true;
}
