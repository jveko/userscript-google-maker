import { STATE } from "../constants.js";
import { log } from "../log.js";
import { transition } from "../state.js";
import { humanDelay, humanClick, humanIdle, humanScroll, simulateMobileTouch } from "../human.js";
import { getElementByXpath } from "../helpers.js";
import { DELAY } from "../constants.js";

export async function handleSignInPage() {
  transition(STATE.SIGNING_IN);
  log("→ handleSignInPage");
  await humanIdle();
  await humanScroll();
  const btn = getElementByXpath("//button[.//span[text()='Create account']]");
  log("Create account btn:", btn ? "✓" : "✗");
  if (!btn) return false;
  await humanDelay(DELAY.MEDIUM);
  await simulateMobileTouch(btn);
  await humanDelay(DELAY.SHORT);
  const option = getElementByXpath(
    "//li[.//span[text()='For my personal use']]",
  );
  if (option) {
    await humanDelay(DELAY.SHORT);
    await simulateMobileTouch(option);
  }
  return true;
}
