import { STATE } from "./constants.js";
import { log } from "./log.js";

const ALLOWED = {
  [STATE.IDLE]:                     [STATE.SIGNING_IN],
  [STATE.SIGNING_IN]:               [STATE.FILLING_NAME, STATE.SECURITY_CHALLENGE],
  [STATE.FILLING_NAME]:             [STATE.FILLING_BIRTHDAY],
  [STATE.FILLING_BIRTHDAY]:         [STATE.FILLING_USERNAME],
  [STATE.FILLING_USERNAME]:         [STATE.FILLING_PASSWORD, STATE.IDLE],
  [STATE.FILLING_PASSWORD]:         [STATE.PHONE_VERIFICATION],
  [STATE.PHONE_VERIFICATION]:       [STATE.WAITING_SMS],
  [STATE.WAITING_SMS]:              [STATE.FILLING_RECOVERY, STATE.SKIPPING_RECOVERY_PHONE, STATE.PHONE_VERIFICATION],
  [STATE.FILLING_RECOVERY]:         [STATE.SKIPPING_RECOVERY_PHONE, STATE.CONFIRMING],
  [STATE.SKIPPING_RECOVERY_PHONE]:  [STATE.CONFIRMING],
  [STATE.CONFIRMING]:               [STATE.ACCEPTING_TERMS],
  [STATE.ACCEPTING_TERMS]:          [STATE.NAVIGATING_SECURITY],
  [STATE.NAVIGATING_SECURITY]:      [STATE.NAVIGATING_RECOVERY_EMAIL],
  [STATE.NAVIGATING_RECOVERY_EMAIL]:[STATE.VERIFYING_RECOVERY_EMAIL],
  [STATE.VERIFYING_RECOVERY_EMAIL]: [STATE.COMPLETED],
  [STATE.SECURITY_CHALLENGE]:       [STATE.NAVIGATING_SECURITY],
  [STATE.COMPLETED]:                [STATE.IDLE],
  [STATE.ERROR]:                    [STATE.IDLE],
};

let currentState = STATE.IDLE;
let config = null;
let smsPoller = null;
let lastPath = "";
let lastErrorMsg = "";
let handlerInFlight = false;
let submitLockUntil = 0;

export function getState() { return currentState; }
export function getLastErrorMsg() { return lastErrorMsg; }
export function getConfig() { return config; }
export function setConfig(c) { config = c; }
export function getSmsPoller() { return smsPoller; }
export function setSmsPoller(p) { smsPoller = p; }
export function getLastPath() { return lastPath; }
export function setLastPath(p) { lastPath = p; }
export function isHandlerInFlight() { return handlerInFlight; }
export function setHandlerInFlight(v) { handlerInFlight = v; }
export function setSubmitLock(ms) { submitLockUntil = Date.now() + ms; }
export function isSubmitLocked() { return Date.now() < submitLockUntil; }
export function clearSubmitLock() { submitLockUntil = 0; }

export function transition(state, errorMsg = "") {
  if (state === currentState) return;
  const allowed = ALLOWED[currentState] || [];
  if (state !== STATE.ERROR && !allowed.includes(state)) {
    log.error("Invalid transition:", currentState, "→", state);
    lastErrorMsg = `Invalid transition: ${currentState} → ${state}`;
    currentState = STATE.ERROR;
    return;
  }
  log("State:", currentState, "→", state, errorMsg ? `(${errorMsg})` : "");
  currentState = state;
  if (state === STATE.ERROR) {
    lastErrorMsg = errorMsg;
  }
}
