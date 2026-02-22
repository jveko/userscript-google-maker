import { log } from "./log.js";

export function getElementByXpath(path) {
  return document.evaluate(
    path,
    document,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null,
  ).singleNodeValue;
}

export function awaitNavigationOrError(errorChecks) {
  return new Promise((resolve) => {
    const startPath = window.location.pathname;
    
    const checkState = () => {
      if (window.location.pathname !== startPath) return false;
      for (const check of errorChecks) {
        if (check()) return true;
      }
      return null;
    };

    const interval = setInterval(() => {
      const state = checkState();
      if (state !== null) {
        observer.disconnect();
        clearInterval(interval);
        resolve(state);
      }
    }, 500);

    const observer = new MutationObserver(() => {
      const state = checkState();
      if (state !== null) {
        observer.disconnect();
        clearInterval(interval);
        resolve(state);
      }
    });
    
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  });
}

export function waitFor(selector, timeout) {
  log("waitFor:", selector);
  return new Promise((resolve, reject) => {
    const isVisible = (el) => el.offsetWidth > 0 || el.offsetHeight > 0;

    const el = document.querySelector(selector);
    if (el && isVisible(el)) {
      log("waitFor: found immediately", selector);
      return resolve(el);
    }

    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el && isVisible(el)) {
        observer.disconnect();
        log("waitFor: found via observer", selector);
        resolve(el);
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });

    setTimeout(() => {
      observer.disconnect();
      log("waitFor: TIMEOUT", selector);
      reject(new Error("Timeout waiting for " + selector));
    }, timeout || 10000);
  });
}
