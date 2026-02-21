import { STATE } from "../constants.js";
import { log } from "../log.js";
import { transition } from "../state.js";
import { humanDelay, humanClick } from "../human.js";
import { getElementByXpath } from "../helpers.js";
import { DELAY } from "../constants.js";

export async function handleSignInPage() {
  transition(STATE.SIGNING_IN);
  log("→ handleSignInPage");
  const btn = getElementByXpath("//button[.//span[text()='Create account']]");
  log("Create account btn:", btn ? "✓" : "✗");
  if (!btn) return false;
  await humanDelay(1000, 3000);
  btn.click();
  await humanDelay(DELAY.MEDIUM);
  const option = getElementByXpath(
    "//li[.//span[text()='For my personal use']]",
  );
  if (option) option.click();
  return true;
}
