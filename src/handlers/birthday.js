import { STATE, DELAY } from "../constants.js";
import { log } from "../log.js";
import { transition, getConfig } from "../state.js";
import { humanScroll, humanDelay, humanFillInput, humanSelectDropdown, humanClickNext } from "../human.js";
import { waitFor, awaitNavigationOrError } from "../helpers.js";

function hasBirthdayError() {
  const text = document.body.textContent;
  return text.includes("Please enter a valid date") ||
    text.includes("You must meet certain age requirements") ||
    text.includes("Please enter a valid year");
}

export async function handleBirthdayGenderPage() {
  transition(STATE.FILLING_BIRTHDAY);
  log("→ handleBirthdayGenderPage");
  await waitFor("#day");
  await humanScroll();
  await humanDelay(DELAY.MEDIUM);

  const config = getConfig();
  await humanSelectDropdown("#month", config.birthMonth);
  await humanDelay(DELAY.TYPING_PAUSE);
  await humanFillInput("#day", config.birthDay);
  await humanDelay(DELAY.TYPING_PAUSE);
  await humanFillInput("#year", config.birthYear);
  await humanDelay(400, 900);
  await humanSelectDropdown("#gender", config.gender);

  await humanClickNext();

  const hasError = await awaitNavigationOrError([hasBirthdayError]);
  if (hasError) {
    log.warn("Detected birthday/age requirement error.");
    return false;
  }

  return true;
}
