import { DELAY } from "./constants.js";
import { log } from "./log.js";
import { getElementByXpath } from "./helpers.js";

export function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function gaussianRand(min, max) {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  num = num / 6 + 0.5;
  num = Math.max(0, Math.min(1, num));
  return Math.floor(min + num * (max - min));
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

    if (char.match(/[a-zA-Z]/) && Math.random() < 0.09) {
      const typo = String.fromCharCode(char.charCodeAt(0) + rand(-2, 2));
      setNativeValue(el, el.value + typo);
      fireKeyEvents(el, typo);
      
      // longer delay realizing the mistake
      await humanDelay(300, 600);

      setNativeValue(el, el.value.slice(0, -1));
      el.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Backspace", bubbles: true, composed: true }),
      );
      el.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
      el.dispatchEvent(
        new KeyboardEvent("keyup", { key: "Backspace", bubbles: true, composed: true }),
      );
      
      // wait before typing the correct char
      await humanDelay(DELAY.BACKSPACE);
    }

    setNativeValue(el, el.value + char);
    fireKeyEvents(el, char);

    // Ramp-up: first 3 chars typed slower as fingers find the keys
    const rampup = i < 3 ? 1.6 - i * 0.2 : 1.0;

    if (char === " " || char === "@" || char === ".") {
      await humanDelay(gaussianRand(DELAY.TYPING_PAUSE[0], DELAY.TYPING_PAUSE[1]));
    } else if (i > 0 && i % rand(5, 10) === 0) {
      await humanDelay(gaussianRand(DELAY.TYPING_PAUSE[0], DELAY.TYPING_PAUSE[1]));
    } else {
      const base = gaussianRand(DELAY.TYPING[0], DELAY.TYPING[1]);
      await new Promise((r) => setTimeout(r, Math.round(base * rampup)));
    }
  }

  el.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
  await humanDelay(100, 300);
}

export async function humanFillInput(selector, value) {
  const el = document.querySelector(selector);
  if (el) {
    if (el.value === value) return el;
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
    radiusX: 1.5 + Math.random() * 3.5,
    radiusY: 1.5 + Math.random() * 3.5,
    rotationAngle: Math.random() * 25,
    force: 0.3 + Math.random() * 0.5,
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
  // Variable hold: quick flick (40-70ms), normal tap (70-150ms), deliberate press (150-250ms)
  const holdRoll = Math.random();
  const holdMs = holdRoll < 0.4 ? rand(40, 70) : holdRoll < 0.85 ? rand(70, 150) : rand(150, 250);
  await humanDelay(holdMs, holdMs);

  el.dispatchEvent(new TouchEvent("touchend", evtOpts));
  await humanDelay(10, 40);
  
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
  if (btn) {
    await simulateMobileTouch(btn);
    // wait slightly before continuing so DOM has time to react naturally
    await humanDelay(DELAY.SHORT);
  }
}

export async function humanIdle() {
  const roll = Math.random();
  if (roll < 0.25) {
    const amount = rand(-25, 45);
    window.scrollBy({ top: amount, behavior: "smooth" });
    await humanDelay(DELAY.SHORT);
  } else if (roll < 0.4) {
    await humanDelay(DELAY.MEDIUM);
  } else if (roll < 0.5) {
    // Distraction pause — user glanced at a notification or zoned out
    await humanDelay(2500, 5000);
  }
}

export async function humanReadPage() {
  await humanDelay(DELAY.LONG);
  for (let i = 0; i < rand(1, 3); i++) {
    window.scrollBy({ top: rand(30, 100), behavior: "smooth" });
    await humanDelay(gaussianRand(600, 1800));
  }
  if (Math.random() < 0.3) {
    window.scrollBy({ top: rand(-60, -20), behavior: "smooth" });
    await humanDelay(DELAY.SHORT);
  }
}

export async function humanSurveyPage() {
  // Look at the whole form before starting to fill it
  if (Math.random() < 0.4) return; // not every time
  const scrollDown = rand(150, 350);
  window.scrollBy({ top: scrollDown, behavior: "smooth" });
  await humanDelay(gaussianRand(800, 2000));
  window.scrollBy({ top: -scrollDown + rand(-30, 30), behavior: "smooth" });
  await humanDelay(DELAY.SHORT);
}

export async function humanRevisitField(selector) {
  if (Math.random() < 0.7) return; // only ~30% of the time
  const el = document.querySelector(selector);
  if (!el) return;
  await simulateMobileTouch(el);
  await humanDelay(gaussianRand(400, 1200));
  // blur away without changing anything
  el.blur();
  el.dispatchEvent(new Event("blur", { bubbles: true }));
  await humanDelay(DELAY.SHORT);
}

export async function humanTogglePasswordVisibility() {
  if (Math.random() < 0.6) return; // only ~40% of the time
  // Google uses a button/div near the password input to toggle visibility
  const toggle =
    document.querySelector('div[jsname="YRMmle"]') ||
    document.querySelector('[aria-label*="Show password"]') ||
    document.querySelector('input[name="Passwd"]')?.parentElement?.querySelector('[role="button"]');
  if (!toggle) return;
  await humanDelay(DELAY.MEDIUM);
  await simulateMobileTouch(toggle);
  await humanDelay(gaussianRand(800, 2000)); // look at the password
  await simulateMobileTouch(toggle); // hide it again
  await humanDelay(DELAY.SHORT);
}

export async function humanSelectDropdown(containerSelector, optionText) {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  const trigger = container.querySelector('[role="combobox"]');
  if (!trigger) return;

  await humanDelay(DELAY.MEDIUM);
  await simulateMobileTouch(trigger);
  await humanDelay(DELAY.SHORT);

  let options = container.querySelectorAll('li[role="option"]');
  if (options.length === 0) {
    options = document.querySelectorAll('li[role="option"]');
  }

  for (const opt of options) {
    if (opt.textContent.trim() === optionText) {
      // simulate scanning the list
      await humanDelay(DELAY.MEDIUM);
      await simulateMobileTouch(opt);
      return;
    }
  }
  log.warn("selectDropdown: option not found:", optionText);
}
