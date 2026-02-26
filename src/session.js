import { SESSION_KEY, SETTINGS_KEY, MONTH_NAMES } from "./constants.js";
import { log } from "./log.js";
import { getConfig, setConfig } from "./state.js";

export function saveSession() {
  GM_setValue(SESSION_KEY, getConfig());
  log("Session saved");
}

export function startNewSession() {
  GM_setValue(SESSION_KEY, { started: true });
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
    log.error("Failed to load session:", e);
    clearSession();
  }
  return false;
}

export function clearSession() {
  GM_deleteValue(SESSION_KEY);
}

export function getSettings() {
  try {
    return GM_getValue(SETTINGS_KEY, { mode: "single" });
  } catch (e) {
    return { mode: "single" };
  }
}

export function saveSettings(settings) {
  GM_setValue(SETTINGS_KEY, settings);
}
