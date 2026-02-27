import { STATE, DELAY } from "../constants.js";
import { log } from "../log.js";
import { transition, getConfig } from "../state.js";
import { humanScroll, humanDelay, humanFillInput, humanIdle, simulateMobileTouch } from "../human.js";
import { waitFor, getElementByXpath } from "../helpers.js";

export async function handleRecoveryEmailPage() {
  transition(STATE.FILLING_RECOVERY);
  log("→ handleRecoveryEmailPage");
  await waitFor("#recoveryEmailId");
  await humanScroll();
  await humanDelay(DELAY.MEDIUM);
  await humanIdle();
  await humanFillInput("#recoveryEmailId", getConfig().recoveryEmail);
  await humanIdle();

  await humanDelay(DELAY.LONG);
  const btn =
    document.querySelector("#recoveryNext button") ||
    getElementByXpath("//button[.//span[text()='Next']]");
  if (btn) await simulateMobileTouch(btn);
  return true;
}
