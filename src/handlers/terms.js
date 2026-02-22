import { STATE, DELAY } from "../constants.js";
import { log } from "../log.js";
import { transition, getConfig } from "../state.js";
import { humanDelay, humanClick, rand } from "../human.js";
import { apiRequestWithRetry } from "../api.js";
import { clearSession } from "../session.js";

function findButtonByText(text, exact = true) {
  const buttons = document.querySelectorAll("button");
  for (const btn of buttons) {
    const inner = btn.innerText.trim();
    if (exact ? inner === text : inner.includes(text)) return btn;
  }
  return null;
}

function scrollUntilVisible(buttonText, maxAttempts = 60) {
  return new Promise((resolve) => {
    let attempts = 0;
    
    // Some Google pages put the scrollbar on a div inside the body, not the window itself
    const getScrollContainers = () => [
      document.querySelector('div[role="main"]'),
      document.querySelector('#yDmH0d'),
      document.querySelector('c-wiz'),
      document.scrollingElement,
      window
    ].filter(Boolean);

    const interval = setInterval(() => {
      const btn = findButtonByText(buttonText);
      if (btn && btn.offsetParent !== null && btn.offsetHeight > 0) {
        clearInterval(interval);
        log("Button visible:", buttonText);
        resolve(btn);
        return;
      }
      if (++attempts >= maxAttempts) {
        clearInterval(interval);
        log("Scroll limit reached, button not found:", buttonText);
        resolve(null);
        return;
      }
      
      const containers = getScrollContainers();
      for (const container of containers) {
        if (container === window) {
          window.scrollBy({ top: rand(300, 600), behavior: "smooth" });
        } else {
          try {
            container.scrollBy({ top: rand(300, 600), behavior: "smooth" });
          } catch(e) {}
        }
      }
    }, rand(400, 800));
  });
}

async function handlePrivacySettings() {
  const moreOptionsBtn = findButtonByText("More options", false);
  if (!moreOptionsBtn) {
    log("No 'More options' button found, skipping privacy settings");
    return;
  }

  log("Clicking 'More options'...");
  await humanClick(moreOptionsBtn);
  await humanDelay(DELAY.LONG);

  const radios = document.querySelectorAll('input[type="radio"]');
  for (const radio of radios) {
    const label = radio.closest("label") || document.querySelector(`label[for="${radio.id}"]`);
    if (label && label.innerText.includes("Don't save my YouTube History")) {
      log("Selecting: Don't save my YouTube History");
      await humanClick(radio);
      await humanDelay(DELAY.SHORT);
      break;
    }
  }
}

export async function handleTermsPage() {
  transition(STATE.ACCEPTING_TERMS);
  log("→ handleTermsPage");
  await humanDelay(400, 800);

  await handlePrivacySettings();
  await humanDelay(DELAY.SHORT);

  log("Scrolling to 'I agree' button...");
  const agreeBtn = await scrollUntilVisible("I agree");

  if (agreeBtn) {
    await humanDelay(DELAY.MEDIUM);
    log("Clicking 'I agree'");
    await humanClick(agreeBtn);

    // Confirm account and clear session here because myaccount.google.com
    // blocks userscript injection via CSP on iOS Safari/Stay
    await humanDelay(1000, 2000);
    try {
      const config = getConfig();
      const data = await apiRequestWithRetry(
        "PATCH",
        "/confirm/" + encodeURIComponent(config.id),
      );
      log("Confirm response:", JSON.stringify(data));
    } catch (err) {
      log("Confirm error:", err);
    }
    clearSession();
    transition(STATE.COMPLETED);
    log("Account creation completed, session cleared");
  } else {
    log("'I agree' button not found after scrolling");
  }

  return true;
}
