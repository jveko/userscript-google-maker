import { log } from "./log.js";
import { setSubmitLock, clearSubmitLock } from "./state.js";

export function createIsolatedContainer(id) {
  const host = document.createElement("div");
  // Use a completely random ID to avoid simple querySelector detection
  host.id = id || "ext-" + Math.random().toString(36).substr(2, 9);
  
  // Position the host element out of standard layout flow but ensure it spans the viewport
  host.style.cssText = "position:fixed; top:0; left:0; width:0; height:0; z-index:2147483647; overflow:visible; pointer-events:none;";
  
  document.documentElement.appendChild(host);
  
  // Create a CLOSED shadow root. 
  // This means `host.shadowRoot` will return null to page scripts.
  const shadow = host.attachShadow({ mode: "closed" });
  
  return { host, shadow };
}

export function getElementByXpath(path) {
  return document.evaluate(
    path,
    document,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null,
  ).singleNodeValue;
}

export function awaitNavigationOrError(errorChecks, { timeout = 5000, lockMs = 15000 } = {}) {
  setSubmitLock(lockMs);
  return new Promise((resolve) => {
    const startPath = window.location.pathname;
    
    const checkState = () => {
      if (window.location.pathname !== startPath) return false;
      for (const check of errorChecks) {
        if (check()) return true;
      }
      return undefined;
    };

    const settle = (value) => {
      observer.disconnect();
      clearInterval(interval);
      clearTimeout(timer);
      if (value !== null) clearSubmitLock();
      resolve(value);
    };

    const tick = () => {
      const state = checkState();
      if (state !== undefined) settle(state);
    };

    const interval = setInterval(tick, 500);

    const observer = new MutationObserver(tick);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    const timer = setTimeout(() => settle(null), timeout);
  });
}

export function waitFor(selector, timeout) {
  return new Promise((resolve, reject) => {
    const isVisible = (el) => el.offsetWidth > 0 || el.offsetHeight > 0;

    const el = document.querySelector(selector);
    if (el && isVisible(el)) {
      return resolve(el);
    }

    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el && isVisible(el)) {
        observer.disconnect();
        resolve(el);
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });

    setTimeout(() => {
      observer.disconnect();
      log.warn("waitFor: TIMEOUT", selector);
      reject(new Error("Timeout waiting for " + selector));
    }, timeout || 10000);
  });
}
