import { STATE, DELAY } from "../constants.js";
import { log } from "../log.js";
import { transition, getConfig } from "../state.js";
import { humanScroll, humanDelay, humanFillInput, humanSelectDropdown } from "../human.js";
import { waitFor, getElementByXpath } from "../helpers.js";

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

  await humanDelay(DELAY.LONG);
  const nextBtn =
    document.querySelector("#birthdaygenderNext button") ||
    getElementByXpath("//button[.//span[text()='Next']]");
  if (nextBtn) nextBtn.click();
  return true;
}
