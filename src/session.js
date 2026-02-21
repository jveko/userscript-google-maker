import { SESSION_KEY, MONTH_NAMES } from "./constants.js";
import { log } from "./log.js";
import { getConfig, setConfig } from "./state.js";

export function saveSession() {
  GM_setValue(SESSION_KEY, getConfig());
  log("Session saved");
}

export function loadSession() {
  try {
    const data = GM_getValue(SESSION_KEY, null);
    if (data) {
      if (data.email) {
        setConfig(data);
        log("Session restored:", JSON.stringify(data));
        return true;
      }
      if (data.started) {
        log("Session started flag found");
        return true;
      }
    }
  } catch (e) {
    log("Failed to load session:", e);
    clearSession();
  }
  return false;
}

export function clearSession() {
  GM_deleteValue(SESSION_KEY);
}
