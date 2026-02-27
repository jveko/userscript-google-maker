import { STATE, DELAY } from "../constants.js";
import { log } from "../log.js";
import { transition } from "../state.js";
import { humanScroll, humanDelay, humanClickNext, humanReadPage } from "../human.js";

export async function handleConfirmationPage() {
  transition(STATE.CONFIRMING);
  log("→ handleConfirmationPage");
  await humanScroll();
  await humanReadPage();
  await humanDelay(DELAY.EXTRA_LONG);
  await humanClickNext();
  return true;
}
