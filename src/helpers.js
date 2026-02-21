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

export function waitFor(selector, timeout) {
  log("waitFor:", selector);
  return new Promise((resolve, reject) => {
    const el = document.querySelector(selector);
    if (el) {
      log("waitFor: found immediately", selector);
      return resolve(el);
    }

    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) {
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
