import { STATE, DELAY } from "../constants.js";
import { log } from "../log.js";
import { transition, getConfig } from "../state.js";
import { humanDelay, humanFillInput, humanIdle, humanScroll, humanTogglePasswordVisibility, simulateMobileTouch } from "../human.js";
import { waitFor, getElementByXpath } from "../helpers.js";

export async function handleSecurityChallengePage() {
  transition(STATE.SECURITY_CHALLENGE);
  log("→ handleSecurityChallengePage");
  await waitFor('input[name="Passwd"]');
  await humanScroll();
  await humanDelay(DELAY.MEDIUM);
  await humanIdle();
  await humanFillInput('input[name="Passwd"]', getConfig().password);
  await humanTogglePasswordVisibility();
  await humanIdle();

  await humanDelay(DELAY.LONG);
  const btn =
    document.querySelector("#passwordNext") ||
    getElementByXpath("//button[.//span[text()='Next']]");
  log("Clicking Next on security challenge");
  if (btn) await simulateMobileTouch(btn);
  return true;
}
