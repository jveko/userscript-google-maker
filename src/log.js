import { TAG } from "./constants.js";
import { createIsolatedContainer } from "./helpers.js";

let logPanel = null;

const LEVEL_COLORS = {
  step: "#4285f4",
  info: "#8ab4f8",
  warn: "#fbbc04",
  error: "#f28b82",
};

function createLogPanel() {
  logPanel = document.createElement("div");
  logPanel.style.cssText =
    "position:fixed;bottom:0;left:0;right:0;z-index:99999;" +
    "max-height:12vh;overflow-y:auto;background:rgba(0,0,0,0.85);" +
    "color:#8ab4f8;font-family:monospace;font-size:11px;padding:8px;" +
    "border-top:2px solid #333;display:none;pointer-events:auto;";
    
  const { shadow } = createIsolatedContainer("gah-log-container");
  shadow.appendChild(logPanel);
}

function writeLog(level, consoleFn, args) {
  consoleFn(TAG, ...args);
  if (!logPanel) createLogPanel();
  logPanel.style.display = "block";
  const line = document.createElement("div");
  line.style.cssText =
    "padding:2px 0;border-bottom:1px solid #222;word-break:break-all;color:" +
    LEVEL_COLORS[level] + ";";
  const now = new Date();
  const time =
    String(now.getHours()).padStart(2, "0") + ":" +
    String(now.getMinutes()).padStart(2, "0") + ":" +
    String(now.getSeconds()).padStart(2, "0");
  line.textContent =
    "[" + time + "] " +
    args
      .map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a)))
      .join(" ");
  logPanel.appendChild(line);
  while (logPanel.childNodes.length > 200) {
    logPanel.removeChild(logPanel.firstChild);
  }
  logPanel.scrollTop = logPanel.scrollHeight;
}

function info(...args) { writeLog("info", console.log, args); }
function warn(...args) { writeLog("warn", console.warn, args); }
function error(...args) { writeLog("error", console.error, args); }
function step(...args) { writeLog("step", console.log, args); }

export const log = Object.assign(info, { info, warn, error, step });
