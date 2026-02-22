import { STATE } from "./constants.js";
import { log } from "./log.js";

let currentState = STATE.IDLE;
let config = null;
let smsPoller = null;
let lastPath = "";
let lastErrorMsg = "";

export function getState() { return currentState; }
export function getLastErrorMsg() { return lastErrorMsg; }
export function getConfig() { return config; }
export function setConfig(c) { config = c; }
export function getSmsPoller() { return smsPoller; }
export function setSmsPoller(p) { smsPoller = p; }
export function getLastPath() { return lastPath; }
export function setLastPath(p) { lastPath = p; }

export function transition(state, errorMsg = "") {
  log("State:", currentState, "→", state, errorMsg ? `(${errorMsg})` : "");
  currentState = state;
  if (state === STATE.ERROR) {
    lastErrorMsg = errorMsg;
  }
}
