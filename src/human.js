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
    setTimeout(r, rand(minOrPreset || 200, max || 800)),
  );
}

export function humanScroll() {
  const amount = rand(-30, 60);
  window.scrollBy({ top: amount, behavior: "smooth" });
  return humanDelay(DELAY.TINY);
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
  const opts = { key: char, code: code, bubbles: true, composed: true };
  el.dispatchEvent(new KeyboardEvent("keydown", opts));
  el.dispatchEvent(new KeyboardEvent("keypress", opts));
  el.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
  el.dispatchEvent(new KeyboardEvent("keyup", opts));
}

function setNativeValue(el, value) {
  const nativeSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value"
  )?.set;
  if (nativeSetter) {
    nativeSetter.call(el, value);
  } else {
    el.value = value;
  }
}

export async function humanType(el, text) {
  await humanFocus(el);
  if (el.value) {
    setNativeValue(el, "");
    el.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
    el.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
    await humanDelay(DELAY.SHORT);
  }
  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (char.match(/[a-zA-Z]/) && Math.random() < 0.04) {
      const typo = String.fromCharCode(char.charCodeAt(0) + rand(-2, 2));
      setNativeValue(el, el.value + typo);
      fireKeyEvents(el, typo);
      await humanDelay(DELAY.TINY);

      setNativeValue(el, el.value.slice(0, -1));
      el.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Backspace", bubbles: true, composed: true }),
      );
      el.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
      el.dispatchEvent(
        new KeyboardEvent("keyup", { key: "Backspace", bubbles: true, composed: true }),
      );
      await humanDelay(DELAY.BACKSPACE);
    }

    setNativeValue(el, el.value + char);
    fireKeyEvents(el, char);

    if (i > 0 && i % rand(5, 10) === 0) {
      await humanDelay(DELAY.TYPING_PAUSE);
    } else {
      await humanDelay(DELAY.TYPING);
    }
  }

  el.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
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

export async function simulateMobileTouch(el) {
  if (!el) return;
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) {
    el.click(); // Fallback if element is not visually rendered
    return;
  }

  // Generate a random coordinate somewhere inside the element's bounding box
  const clientX = Math.round(rect.left + (rect.width * (0.2 + Math.random() * 0.6)));
  const clientY = Math.round(rect.top + (rect.height * (0.2 + Math.random() * 0.6)));

  const touchObj = new Touch({
    identifier: Date.now(),
    target: el,
    clientX: clientX,
    clientY: clientY,
    radiusX: 2.5,
    radiusY: 2.5,
    rotationAngle: 10,
    force: 0.5,
  });

  const evtOpts = {
    bubbles: true,
    cancelable: true,
    composed: true,
    clientX: clientX,
    clientY: clientY,
    touches: [touchObj],
    targetTouches: [touchObj],
    changedTouches: [touchObj]
  };

  el.dispatchEvent(new TouchEvent("touchstart", evtOpts));
  await humanDelay(30, 80);

  el.dispatchEvent(new TouchEvent("touchend", evtOpts));
  await humanDelay(10, 30);
  
  el.dispatchEvent(new PointerEvent("pointerdown", { ...evtOpts, pointerId: 1, pointerType: "touch" }));
  el.dispatchEvent(new MouseEvent("mousedown", evtOpts));
  await humanDelay(10, 30);
  
  el.dispatchEvent(new PointerEvent("pointerup", { ...evtOpts, pointerId: 1, pointerType: "touch" }));
  el.dispatchEvent(new MouseEvent("mouseup", evtOpts));
  
  el.click(); // The browser normally dispatches this last
}

export async function humanClick(el) {
  if (!el) return;
  await humanDelay(300, 800);
  await simulateMobileTouch(el);
}

export async function humanClickNext() {
  await humanDelay(DELAY.LONG);
  const btn = getElementByXpath("//button[.//span[text()='Next']]");
  log("humanClickNext:", btn ? "✓ found" : "✗ not found");
  if (btn) await simulateMobileTouch(btn);
}

export async function humanSelectDropdown(containerSelector, optionText) {
  const container = document.querySelector(containerSelector);
  log("selectDropdown:", containerSelector, container ? "✓" : "✗");
  if (!container) return;

  const trigger = container.querySelector('[role="combobox"]');
  log("selectDropdown trigger:", trigger ? "✓" : "✗");
  if (!trigger) return;

  await humanDelay(400, 900);
  await simulateMobileTouch(trigger);
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
      await simulateMobileTouch(opt);
      log("selectDropdown: clicked", optionText);
      return;
    }
  }
  log("selectDropdown: NOT FOUND", optionText);
}
