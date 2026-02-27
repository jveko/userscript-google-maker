import { STATE, DELAY } from "../constants.js";
import { log } from "../log.js";
import { transition } from "../state.js";
import { humanDelay, humanClick, rand } from "../human.js";

function findButtonByText(text, exact = true) {
  const buttons = document.querySelectorAll("button");
  for (const btn of buttons) {
    const inner = btn.innerText.trim();
    if (exact ? inner === text : inner.includes(text)) return btn;
  }
  return null;
}

function findScrollableContainer() {
  const candidates = [
    document.querySelector('div[role="main"]'),
    document.querySelector('main'),
    document.querySelector('c-wiz'),
    document.querySelector('#yDmH0d'),
  ].filter(Boolean);

  for (const el of candidates) {
    if (el.scrollHeight > el.clientHeight + 10) return el;
  }
  return document.scrollingElement || document.documentElement;
}

function scrollUntilVisible(buttonText) {
  return new Promise((resolve) => {
    const container = findScrollableContainer();
    let totalScrolled = 0;
    log("Scroll container:", container.tagName || "document",
        "scrollHeight:", container.scrollHeight);

    const tick = () => {
      const btn = findButtonByText(buttonText);
      if (btn && btn.offsetParent !== null && btn.offsetHeight > 0) {
        log("Button visible:", buttonText);
        resolve(btn);
        return;
      }

      const scrollHeight = container.scrollHeight;
      if (totalScrolled >= scrollHeight) {
        log.warn("Scrolled to bottom, button not found:", buttonText);
        resolve(null);
        return;
      }

      const distance = rand(80, 150);
      container.scrollBy(0, distance);
      totalScrolled += distance;

      setTimeout(tick, rand(80, 150));
    };

    tick();
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
  await humanDelay(1000, 2000);

  await handlePrivacySettings();
  await humanDelay(DELAY.MEDIUM);

  log("Scrolling to 'I agree' button...");
  const agreeBtn = await scrollUntilVisible("I agree");

  if (agreeBtn) {
    await humanDelay(DELAY.EXTRA_LONG);
    log("Clicking 'I agree'");
    await humanClick(agreeBtn);

    // Wait for Google to process, then force a clean navigation to myaccount.
    // Stay extension on iOS Safari fails to inject scripts after Google's
    // cross-domain redirect chain, but works on clean top-level navigations.
    await humanDelay(4000, 6000);
    if (window.location.hostname === "accounts.google.com") {
      log("Forcing clean navigation to myaccount.google.com");
      window.location.href = "https://myaccount.google.com";
    }
  } else {
    log.warn("'I agree' button not found after scrolling");
  }

  return true;
}
