import { STATE, DELAY } from "../constants.js";
import { log } from "../log.js";
import { transition } from "../state.js";
import { humanDelay, humanClick } from "../human.js";
import { getElementByXpath } from "../helpers.js";

export async function handleSecurityPage() {
  transition(STATE.NAVIGATING_RECOVERY_EMAIL);
  log("→ handleSecurityPage");
  await humanDelay(DELAY.LONG);

  const link = getElementByXpath("//a[contains(@href, 'recovery/email')]");
  log("Recovery email link:", link ? "✓" : "✗");
  if (link) {
    await humanClick(link);
  }
  return true;
}
