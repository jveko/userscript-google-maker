import { STATE, DELAY } from "../constants.js";
import { log } from "../log.js";
import { transition, getConfig } from "../state.js";
import { humanScroll, humanDelay, humanFillInput, humanClickNext } from "../human.js";
import { waitFor } from "../helpers.js";
import { fetchConfig } from "../api.js";

export async function handleNamePage() {
  transition(STATE.FILLING_NAME);
  log("→ handleNamePage");

  const config = getConfig();
  if (!config) {
    log("Fetching config...");
    try {
      await fetchConfig();
      log("Config loaded:", getConfig().email);
    } catch (err) {
      log("Config fetch failed:", err);
      return false;
    }
  }

  await waitFor("#firstName");
  await humanScroll();
  await humanDelay(DELAY.MEDIUM);
  await humanFillInput("#firstName", getConfig().firstName);
  await humanDelay(DELAY.SHORT);
  await humanFillInput("#lastName", getConfig().lastName);
  await humanClickNext();
  return true;
}
