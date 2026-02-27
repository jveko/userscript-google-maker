import { STATE, DELAY } from "../constants.js";
import { log } from "../log.js";
import { transition } from "../state.js";
import { humanDelay, humanClick, humanReadPage, rand } from "../human.js";

const AGREE_PATTERNS = [/^i agree$/i, /^agree$/i, /^accept all$/i, /^j'accepte$/i, /^acepto$/i, /^ich stimme zu$/i, /^setuju$/i];
const MORE_OPTIONS_PATTERNS = [/more options/i, /plus d'options/i, /más opciones/i, /weitere optionen/i, /opsi lainnya/i];

function findButtonByPattern(patterns) {
  const buttons = document.querySelectorAll('button, [role="button"]');
  for (const btn of buttons) {
    const text = btn.innerText.trim();
    if (btn.offsetHeight > 0 && patterns.some(p => p.test(text))) return btn;
  }
  return null;
}

function findButtonByText(text, exact = true) {
  const buttons = document.querySelectorAll("button");
  for (const btn of buttons) {
    const inner = btn.innerText.trim();
    if (exact ? inner === text : inner.includes(text)) return btn;
  }
  return null;
}

function findScrollableContainer() {
  // First try CSS overflow-based detection (most reliable)
  const potential = Array.from(document.querySelectorAll('main, div, section'));
  const overflowMatch = potential.find(el => {
    const style = window.getComputedStyle(el);
    return (style.overflowY === "auto" || style.overflowY === "scroll")
      && el.scrollHeight > el.clientHeight + 10
      && el.getBoundingClientRect().width > 200;
  });
  if (overflowMatch) return overflowMatch;

  // Fallback to known Google selectors
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

function scrollUntilVisible(patterns) {
  return new Promise(async (resolve) => {
    const container = findScrollableContainer();
    log("Scroll container:", container.tagName || "document",
        "scrollHeight:", container.scrollHeight);

    const isAtBottom = () =>
      container.scrollTop + container.clientHeight >= container.scrollHeight - 25;

    while (true) {
      const btn = findButtonByPattern(patterns);
      if (btn && btn.offsetParent !== null && btn.offsetHeight > 0) {
        log("Button visible");
        resolve(btn);
        return;
      }

      if (isAtBottom()) {
        log.warn("Scrolled to bottom, button not found");
        resolve(null);
        return;
      }

      const distance = rand(100, 200);
      container.scrollBy({ top: distance, behavior: "smooth" });

      // Variable scroll timing with occasional reading pauses
      if (Math.random() < 0.1) {
        await humanDelay(1000, 2500);
      } else {
        await humanDelay(250, 600);
      }
    }
  });
}

async function handlePrivacySettings() {
  const moreOptionsBtn = findButtonByPattern(MORE_OPTIONS_PATTERNS);
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
  await humanReadPage();

  await handlePrivacySettings();
  await humanDelay(DELAY.MEDIUM);

  log("Scrolling to agree button...");
  const agreeBtn = await scrollUntilVisible(AGREE_PATTERNS);

  if (agreeBtn) {
    await humanDelay(DELAY.EXTRA_LONG);
    log("Clicking agree button");
    await humanClick(agreeBtn);
  } else {
    log.warn("Agree button not found after scrolling");
  }

  return true;
}
