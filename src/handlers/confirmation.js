import { STATE, DELAY } from "../constants.js";
import { log } from "../log.js";
import { transition } from "../state.js";
import { humanScroll, humanDelay, humanClickNext } from "../human.js";

export async function handleConfirmationPage() {
  transition(STATE.CONFIRMING);
  log("→ handleConfirmationPage");
  await humanScroll();
  await humanDelay(DELAY.EXTRA_LONG);
  await humanClickNext();
  return true;
}
