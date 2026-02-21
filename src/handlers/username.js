import { STATE, DELAY } from "../constants.js";
import { log } from "../log.js";
import { transition, getConfig, setLastPath } from "../state.js";
import { humanScroll, humanDelay, humanFillInput, humanClickNext } from "../human.js";
import { waitFor, getElementByXpath } from "../helpers.js";
import { clearSession } from "../session.js";

function checkUsernameTaken() {
  const bodyText = document.body.innerText;
  const isTaken = bodyText.includes("That username is taken");
  const isAlreadyUsed =
    bodyText.includes("already been used") ||
    bodyText.includes("already exists") ||
    bodyText.includes("is already in use");

  if (!isTaken && !isAlreadyUsed) return false;

  if (isTaken) {
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
    );
    while (walker.nextNode()) {
      if (walker.currentNode.textContent.trim() === "Available:") {
        const container = walker.currentNode.parentElement;
        const suggestion = container.querySelector("button");
        if (suggestion) {
          suggestion.click();
          humanClickNext().catch((err) => log("Click next error:", err));
          return true;
        }
      }
    }
  }

  log("Username/email unavailable, clearing session and restarting");
  clearSession();
  transition(STATE.IDLE);
  setLastPath("");
  window.location.href = "https://accounts.google.com/AddSession";
  return true;
}

export async function handleUsernamePage() {
  transition(STATE.FILLING_USERNAME);
  log("→ handleUsernamePage");

  if (checkUsernameTaken()) return true;

  await waitFor('input[name="usernameRadio"], input[name="Username"]');
  await humanScroll();
  await humanDelay(DELAY.LONG);

  const customRadio = document.querySelector(
    'input[name="usernameRadio"][value="custom"]',
  );
  if (customRadio) {
    customRadio.click();
    await humanDelay(DELAY.MEDIUM);
  }

  await humanFillInput('input[name="Username"]', getConfig().username);
  await humanClickNext();
  return true;
}
