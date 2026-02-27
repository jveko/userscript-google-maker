import { STATE, DELAY } from "../constants.js";
import { log } from "../log.js";
import { transition, getConfig, setConfig } from "../state.js";
import { humanScroll, humanDelay, humanFillInput, humanClickNext, humanIdle, humanSurveyPage, simulateMobileTouch } from "../human.js";
import { waitFor, awaitNavigationOrError } from "../helpers.js";
import { clearSession, saveSession } from "../session.js";
import { regenerateEmail } from "../api.js";

const MAX_EMAIL_RETRIES = 3;
let emailRetryCount = 0;

function hasUsernameError() {
  const bodyText = document.body.innerText;
  return bodyText.includes("That username is taken") ||
    bodyText.includes("already been used") ||
    bodyText.includes("already exists") ||
    bodyText.includes("is already in use");
}

async function handleUsernameTaken() {
  const bodyText = document.body.innerText;
  const isTaken = bodyText.includes("That username is taken");

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
          await simulateMobileTouch(suggestion);
          await humanDelay(DELAY.SHORT);
          await humanClickNext();
          return await handleUsernameErrorPostClick();
        }
      }
    }
  }

  emailRetryCount++;
  if (emailRetryCount > MAX_EMAIL_RETRIES) {
    log.warn("Email retry limit reached (" + MAX_EMAIL_RETRIES + "), clearing session");
    emailRetryCount = 0;
    clearSession();
    transition(STATE.IDLE);
    window.location.href = "https://accounts.google.com/AddSession";
    return true;
  }

  const config = getConfig();
  log.warn("Username taken, regenerating email (attempt " + emailRetryCount + "/" + MAX_EMAIL_RETRIES + ")");

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
    return await handleUsernameErrorPostClick();
  } catch (err) {
    log.error("Email regeneration failed:", err.message || err);
    clearSession();
    transition(STATE.IDLE);
    window.location.href = "https://accounts.google.com/AddSession";
  }

  return true;
}

async function handleUsernameErrorPostClick() {
  const hasError = await awaitNavigationOrError([hasUsernameError]);
  if (hasError === true) {
    log.warn("Detected username error after submit, handling");
    return await handleUsernameTaken();
  }
  return true;
}

export async function handleUsernamePage() {
  transition(STATE.FILLING_USERNAME);
  log("→ handleUsernamePage");

  if (hasUsernameError()) {
    return await handleUsernameTaken();
  }

  await waitFor('input[name="usernameRadio"], input[name="Username"]');
  await humanScroll();
  await humanSurveyPage();
  await humanDelay(DELAY.LONG);

  const customRadio = document.querySelector(
    'input[name="usernameRadio"][value="custom"]',
  );
  if (customRadio) {
    await simulateMobileTouch(customRadio);
    await humanDelay(DELAY.MEDIUM);
  }

  await humanIdle();
  await humanFillInput('input[name="Username"]', getConfig().username);
  await humanClickNext();
  return await handleUsernameErrorPostClick();
}
