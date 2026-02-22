import { STATE, DELAY } from "../constants.js";
import { log } from "../log.js";
import { transition, getConfig, setConfig, setLastPath } from "../state.js";
import { humanScroll, humanDelay, humanFillInput, humanClickNext } from "../human.js";
import { waitFor, getElementByXpath } from "../helpers.js";
import { clearSession, saveSession } from "../session.js";
import { regenerateEmail } from "../api.js";

const MAX_EMAIL_RETRIES = 3;
let emailRetryCount = 0;

async function handleUsernameTaken() {
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

  emailRetryCount++;
  if (emailRetryCount > MAX_EMAIL_RETRIES) {
    log("Email retry limit reached (" + MAX_EMAIL_RETRIES + "), clearing session");
    emailRetryCount = 0;
    clearSession();
    transition(STATE.IDLE);
    setLastPath("");
    window.location.href = "https://accounts.google.com/AddSession";
    return true;
  }

  const config = getConfig();
  log("Username taken, regenerating email (attempt " + emailRetryCount + "/" + MAX_EMAIL_RETRIES + ")");

  try {
    const data = await regenerateEmail(config.id);
    log("New email: " + data.email + " (old: " + data.oldEmail + ")");
    config.email = data.email;
    config.username = data.email.split("@")[0];
    setConfig(config);
    saveSession();

    await humanDelay(DELAY.MEDIUM);
    await humanFillInput('input[name="Username"]', config.username);
    await humanClickNext();
  } catch (err) {
    log("Email regeneration failed:", err.message || err);
    clearSession();
    transition(STATE.IDLE);
    setLastPath("");
    window.location.href = "https://accounts.google.com/AddSession";
  }

  return true;
}

export async function handleUsernamePage() {
  transition(STATE.FILLING_USERNAME);
  log("→ handleUsernamePage");

  if (await handleUsernameTaken()) return true;

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
