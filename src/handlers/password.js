import { STATE, DELAY } from "../constants.js";
import { log } from "../log.js";
import { transition, getConfig } from "../state.js";
import { humanScroll, humanDelay, humanFillInput } from "../human.js";
import { waitFor, getElementByXpath } from "../helpers.js";

export async function handlePasswordPage() {
  transition(STATE.FILLING_PASSWORD);
  log("→ handlePasswordPage");
  await waitFor('input[name="Passwd"]');
  await humanScroll();
  await humanDelay(DELAY.MEDIUM);
  const config = getConfig();
  await humanFillInput('input[name="Passwd"]', config.password);
  await humanDelay(400, 1000);
  await humanFillInput('input[name="PasswdAgain"]', config.password);

  await humanDelay(DELAY.LONG);
  const btn =
    document.querySelector("#createpasswordNext button") ||
    getElementByXpath("//button[.//span[text()='Next']]");
  if (btn) btn.click();
  return true;
}
