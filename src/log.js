import { TAG } from "./constants.js";
import { createIsolatedContainer } from "./helpers.js";

let logPanel = null;

function createLogPanel() {
  logPanel = document.createElement("div");
  logPanel.style.cssText =
    "position:fixed;bottom:0;left:0;right:0;z-index:99999;" +
    "max-height:12vh;overflow-y:auto;background:rgba(0,0,0,0.85);" +
    "color:#0f0;font-family:monospace;font-size:11px;padding:8px;" +
    "border-top:2px solid #333;display:none;pointer-events:auto;";
    
  const { shadow } = createIsolatedContainer("gah-log-container");
  shadow.appendChild(logPanel);
}

export function log(...args) {
  console.log(TAG, ...args);
  if (!logPanel) createLogPanel();
  logPanel.style.display = "block";
  const line = document.createElement("div");
  line.style.cssText =
    "padding:2px 0;border-bottom:1px solid #222;word-break:break-all;";
  const time = new Date().toLocaleTimeString();
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
