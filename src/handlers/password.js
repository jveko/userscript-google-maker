import { STATE, DELAY } from "../constants.js";
import { log } from "../log.js";
import { transition, getConfig } from "../state.js";
import { humanScroll, humanDelay, humanFillInput, humanClickNext } from "../human.js";
import { waitFor, awaitNavigationOrError } from "../helpers.js";

function hasPasswordError() {
  const text = document.body.textContent;
  return text.includes("Use 8 characters or more for your password") ||
    text.includes("Please choose a stronger password");
}

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

  await humanClickNext();

  const hasError = await awaitNavigationOrError([hasPasswordError]);
  if (hasError) {
    log("Detected password strength error. Needs to be handled or restarted.");
    return false; 
  }

  return true;
}
