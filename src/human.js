import { DELAY } from "./constants.js";
import { log } from "./log.js";
import { getElementByXpath } from "./helpers.js";

export function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function humanDelay(minOrPreset, max) {
  if (Array.isArray(minOrPreset)) {
    return new Promise((r) => setTimeout(r, rand(minOrPreset[0], minOrPreset[1])));
  }
  return new Promise((r) =>
    setTimeout(r, rand(minOrPreset || 800, max || 2500)),
  );
}

export function humanScroll() {
  const amount = rand(-30, 60);
  window.scrollBy({ top: amount, behavior: "smooth" });
  return humanDelay(DELAY.SHORT);
}

export function humanFocus(el) {
  el.focus();
  el.dispatchEvent(new Event("focus", { bubbles: true }));
  return humanDelay(DELAY.SHORT);
}

export function fireKeyEvents(el, char) {
  let code;
  if (/[a-zA-Z]/.test(char)) {
    code = "Key" + char.toUpperCase();
  } else if (/[0-9]/.test(char)) {
    code = "Digit" + char;
  } else if (char === " ") {
    code = "Space";
  } else {
    code = char;
  }
  const opts = { key: char, code: code, bubbles: true };
  el.dispatchEvent(new KeyboardEvent("keydown", opts));
  el.dispatchEvent(new KeyboardEvent("keypress", opts));
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new KeyboardEvent("keyup", opts));
}

export async function humanType(el, text) {
  await humanFocus(el);
  el.value = "";
  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (char.match(/[a-zA-Z]/) && Math.random() < 0.08) {
      const typo = String.fromCharCode(char.charCodeAt(0) + rand(-2, 2));
      el.value += typo;
      fireKeyEvents(el, typo);
      await humanDelay(DELAY.TINY);

      el.value = el.value.slice(0, -1);
      el.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Backspace", bubbles: true }),
      );
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(
        new KeyboardEvent("keyup", { key: "Backspace", bubbles: true }),
      );
      await humanDelay(DELAY.BACKSPACE);
    }

    el.value += char;
    fireKeyEvents(el, char);

    if (i > 0 && i % rand(5, 10) === 0) {
      await humanDelay(DELAY.TYPING_PAUSE);
    } else {
      await humanDelay(DELAY.TYPING);
    }
  }

  el.dispatchEvent(new Event("change", { bubbles: true }));
  await humanDelay(100, 300);
}

export async function humanFillInput(selector, value) {
  const el = document.querySelector(selector);
  log("humanFillInput:", selector, "→", value, el ? "✓" : "✗");
  if (el) {
    await humanType(el, value);
  }
  return el;
}

export async function humanClick(el) {
  if (!el) return;
  await humanDelay(300, 800);
  el.click();
}

export async function humanClickNext() {
  await humanDelay(DELAY.LONG);
  const btn = getElementByXpath("//button[.//span[text()='Next']]");
  log("humanClickNext:", btn ? "✓ found" : "✗ not found");
  if (btn) btn.click();
}

export async function humanSelectDropdown(containerSelector, optionText) {
  const container = document.querySelector(containerSelector);
  log("selectDropdown:", containerSelector, container ? "✓" : "✗");
  if (!container) return;

  const trigger = container.querySelector('[role="combobox"]');
  log("selectDropdown trigger:", trigger ? "✓" : "✗");
  if (!trigger) return;

  await humanDelay(400, 900);
  trigger.click();
  await humanDelay(DELAY.SHORT);

  let options = container.querySelectorAll('li[role="option"]');
  if (options.length === 0) {
    options = document.querySelectorAll('li[role="option"]');
    log("selectDropdown: using global options, count:", options.length);
  } else {
    log("selectDropdown: using container options, count:", options.length);
  }

  for (const opt of options) {
    if (opt.textContent.trim() === optionText) {
      await humanDelay(DELAY.SHORT);
      opt.click();
      log("selectDropdown: clicked", optionText);
      return;
    }
  }
  log("selectDropdown: NOT FOUND", optionText);
}
