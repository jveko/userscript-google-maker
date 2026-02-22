import { STATE, SESSION_KEY } from "../constants.js";
import { log } from "../log.js";
import { transition, getState, getConfig, setLastPath, getLastErrorMsg } from "../state.js";
import { stopSmsPoller } from "../sms.js";
import { clearSession } from "../session.js";

// --- Drag & Drop Utility ---

function makeDraggable(el, handle, onTap) {
  let isDragging = false;
  let startX, startY, initialLeft, initialTop;
  let didDrag = false;

  const handleStart = (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' && e.target !== handle) return;
    
    isDragging = true;
    didDrag = false;
    const touch = e.touches ? e.touches[0] : e;
    startX = touch.clientX;
    startY = touch.clientY;
    initialLeft = el.offsetLeft;
    initialTop = el.offsetTop;
    handle.style.cursor = "grabbing";
    if(e.cancelable && e.target === handle) e.preventDefault();
  };

  const handleMove = (e) => {
    if (!isDragging) return;
    didDrag = true;
    const touch = e.touches ? e.touches[0] : e;
    
    // Boundary checks
    let newLeft = initialLeft + (touch.clientX - startX);
    let newTop = initialTop + (touch.clientY - startY);
    
    // Snap to screen edges
    const maxLeft = window.innerWidth - el.offsetWidth;
    const maxTop = window.innerHeight - el.offsetHeight;
    
    newLeft = Math.max(0, Math.min(newLeft, maxLeft));
    newTop = Math.max(0, Math.min(newTop, maxTop));
    
    el.style.left = newLeft + "px";
    el.style.top = newTop + "px";
    
    if(e.cancelable) e.preventDefault();
  };

  const handleEnd = (e) => {
    if (!isDragging) return;
    isDragging = false;
    handle.style.cursor = "grab";
    if (!didDrag && onTap) onTap(e);
  };

  handle.addEventListener("mousedown", handleStart);
  handle.addEventListener("touchstart", handleStart, { passive: false });
  document.addEventListener("mousemove", handleMove);
  document.addEventListener("touchmove", handleMove, { passive: false });
  document.addEventListener("mouseup", handleEnd);
  document.addEventListener("touchend", handleEnd);
}

// --- UI Components ---

function createElement(tag, styles = {}, text = "", id = "") {
  const el = document.createElement(tag);
  if (text) el.textContent = text;
  if (id) el.id = "gah-" + id;
  Object.assign(el.style, styles);
  return el;
}

function createDialogButton(text, bgColor, hoverColor) {
  const btn = document.createElement("button");
  btn.textContent = text;
  btn.style.cssText = `
    flex: 1;
    padding: 10px 16px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    background: ${bgColor};
    color: #fff;
    border: none;
    border-radius: 6px;
    transition: background 0.2s, transform 0.1s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  `;
  btn.onmouseenter = () => (btn.style.background = hoverColor);
  btn.onmouseleave = () => (btn.style.background = bgColor);
  btn.onmousedown = () => (btn.style.transform = "scale(0.96)");
  btn.onmouseup = () => (btn.style.transform = "scale(1)");
  return btn;
}

function createStatRow(label, valueId) {
  const row = createElement("div", {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "6px 0",
    borderBottom: "1px solid #eee",
    fontSize: "13px",
  });
  
  const labelEl = createElement("span", { color: "#5f6368", fontWeight: "500" }, label);
  const valueEl = createElement("span", { 
    color: "#202124", 
    fontFamily: "monospace",
    fontWeight: "600",
    maxWidth: "150px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap"
  }, "-", valueId);
  
  row.appendChild(labelEl);
  row.appendChild(valueEl);
  return row;
}

// --- Main Panel Initialization ---

export function createStartButton(hasSession) {
  const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const bgMain = isDark ? "#202124" : "#ffffff";
  const bgHeader = isDark ? "#303134" : "#f1f3f4";
  const textColor = isDark ? "#e8eaed" : "#202124";
  const borderColor = isDark ? "#3c4043" : "#dadce0";

  // Main Container
  const panel = createElement("div", {
    position: "fixed",
    top: "20px",
    right: "20px",
    zIndex: "9999",
    background: bgMain,
    borderRadius: "12px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
    border: `1px solid ${borderColor}`,
    width: "280px",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    transition: "height 0.3s ease",
  });

  // Header (Draggable)
  const header = createElement("div", {
    background: bgHeader,
    padding: "12px 16px",
    cursor: "grab",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: `1px solid ${borderColor}`,
  });

  const titleGroup = createElement("div", { display: "flex", alignItems: "center", gap: "8px" });
  const statusIndicator = createElement("div", {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    background: hasSession ? "#34a853" : "#9aa0a6",
    boxShadow: hasSession ? "0 0 6px #34a853" : "none",
    transition: "background 0.3s"
  }, "", "status-dot");
  
  const title = createElement("span", { 
    fontWeight: "bold", 
    fontSize: "14px",
    color: textColor,
    userSelect: "none"
  }, "Google Maker");

  const versionSpan = createElement("span", {
    fontSize: "10px",
    color: "#80868b",
    fontWeight: "600",
    marginLeft: "4px",
    padding: "2px 4px",
    background: isDark ? "#3c4043" : "#f1f3f4",
    borderRadius: "4px",
    userSelect: "none"
  }, "v" + (typeof __VERSION__ !== "undefined" ? __VERSION__ : "dev"));

  const collapseBtn = createElement("button", {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "16px",
    color: "#5f6368",
    padding: "4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "transform 0.2s"
  }, "▼");

  titleGroup.appendChild(statusIndicator);
  titleGroup.appendChild(title);
  titleGroup.appendChild(versionSpan);
  header.appendChild(titleGroup);
  header.appendChild(collapseBtn);
  panel.appendChild(header);

  // Body Content
  const body = createElement("div", {
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  });

  // Status Section
  const statusContainer = createElement("div", {
    display: "flex",
    flexDirection: "column",
    gap: "0px",
    background: isDark ? "#303134" : "#f8f9fa",
    padding: "8px 12px",
    borderRadius: "8px",
  });
  
  statusContainer.appendChild(createStatRow("State", "stat-state"));
  statusContainer.appendChild(createStatRow("Email", "stat-email"));
  statusContainer.appendChild(createStatRow("Phone", "stat-phone"));
  
  const errorContainer = createElement("div", {
    color: "#d93025",
    fontSize: "12px",
    fontWeight: "600",
    display: "none",
    paddingTop: "8px",
    marginTop: "8px",
    borderTop: "1px solid #fce8e6",
  }, "", "stat-error");
  statusContainer.appendChild(errorContainer);
  
  // Update loop for stats
  setInterval(() => {
    const stateEl = document.getElementById("gah-stat-state");
    const emailEl = document.getElementById("gah-stat-email");
    const phoneEl = document.getElementById("gah-stat-phone");
    const errEl = document.getElementById("gah-stat-error");
    const dotEl = document.getElementById("gah-status-dot");
    const cfg = getConfig();
    const st = getState();
    const errMsg = getLastErrorMsg();
    
    if (stateEl) stateEl.textContent = st.replace("FILLING_", "").replace("_", " ");
    if (emailEl) emailEl.textContent = cfg?.email || "-";
    if (phoneEl) phoneEl.textContent = cfg?.phoneNumber || "-";
    
    if (errEl) {
      if (st === STATE.ERROR && errMsg) {
        errEl.textContent = "Error: " + errMsg;
        errEl.style.display = "block";
      } else {
        errEl.style.display = "none";
      }
    }
    
    if (dotEl) {
      if (st === STATE.IDLE) {
        dotEl.style.background = "#9aa0a6";
        dotEl.style.boxShadow = "none";
      } else if (st === STATE.COMPLETED) {
        dotEl.style.background = "#4285f4";
        dotEl.style.boxShadow = "0 0 6px #4285f4";
      } else if (st === STATE.ERROR) {
        dotEl.style.background = "#d93025";
        dotEl.style.boxShadow = "0 0 6px #d93025";
      } else {
        dotEl.style.background = "#34a853";
        dotEl.style.boxShadow = "0 0 6px #34a853";
      }
    }
    
    // Auto-sync UI buttons if state hits ERROR or COMPLETED
    if ((st === STATE.ERROR || st === STATE.COMPLETED) && startBtn.style.display === "none") {
      updateActionVisibility(false);
    }
  }, 1000);

  // Actions Section
  const actionsGroup = createElement("div", {
    display: "flex",
    gap: "8px",
  });

  const startBtn = createDialogButton("▶ Start", "#1a73e8", "#1557b0");
  const cancelBtn = createDialogButton("⏹ Stop", "#d93025", "#b31412");
  const clearBtn = createDialogButton("🗑 Reset", "#5f6368", "#3c4043");

  startBtn.onclick = () => {
    transition(STATE.SIGNING_IN);
    GM_setValue(SESSION_KEY, { started: true });
    updateActionVisibility(true);
    log("Started - navigating to AddSession");
    setLastPath("");
    window.location.href = "https://accounts.google.com/AddSession";
  };

  cancelBtn.onclick = () => {
    clearSession();
    transition(STATE.IDLE);
    setLastPath("");
    stopSmsPoller();
    updateActionVisibility(false);
    log("Session stopped");
  };

  clearBtn.onclick = () => {
    clearSession();
    transition(STATE.IDLE);
    setLastPath("");
    stopSmsPoller();
    updateActionVisibility(false);
    const ogText = clearBtn.textContent;
    clearBtn.textContent = "✓ Reset";
    clearBtn.style.background = "#34a853";
    setTimeout(() => {
      clearBtn.textContent = ogText;
      clearBtn.style.background = "#5f6368";
    }, 1500);
    log("Session reset");
  };

  function updateActionVisibility(isRunning) {
    if (isRunning) {
      startBtn.style.display = "none";
      cancelBtn.style.display = "flex";
      clearBtn.style.display = "flex";
    } else {
      startBtn.style.display = "flex";
      cancelBtn.style.display = "none";
      clearBtn.style.display = "flex";
    }
  }

  actionsGroup.appendChild(startBtn);
  actionsGroup.appendChild(cancelBtn);
  actionsGroup.appendChild(clearBtn);

  body.appendChild(statusContainer);
  body.appendChild(actionsGroup);
  panel.appendChild(body);
  document.body.appendChild(panel);

  // Logic
  updateActionVisibility(hasSession);

  let isCollapsed = false;
  makeDraggable(panel, header, () => {
    isCollapsed = !isCollapsed;
    body.style.display = isCollapsed ? "none" : "flex";
    collapseBtn.style.transform = isCollapsed ? "rotate(-90deg)" : "rotate(0deg)";
  });

  log("Advanced UI injected");
}
