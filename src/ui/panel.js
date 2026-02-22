import { STATE, SESSION_KEY } from "../constants.js";
import { log } from "../log.js";
import { transition, getState, setLastPath } from "../state.js";
import { stopSmsPoller } from "../sms.js";
import { clearSession } from "../session.js";

function createDraggableButton() {
  const btn = document.createElement("button");
  btn.textContent = "⚙️";
  btn.style.cssText =
    "position:fixed;top:20px;left:20px;z-index:10000;" +
    "width:48px;height:48px;font-size:24px;cursor:grab;" +
    "background:#1a73e8;color:#fff;border:none;border-radius:50%;" +
    "box-shadow:0 2px 8px rgba(0,0,0,0.3);transition:opacity 0.2s;";
  btn.onmouseenter = () => (btn.style.opacity = "0.85");
  btn.onmouseleave = () => (btn.style.opacity = "1");
  return btn;
}

function makeDraggable(el, onTap) {
  let isDragging = false;
  let startX, startY, initialLeft, initialTop;

  const handleStart = (e) => {
    isDragging = true;
    const touch = e.touches ? e.touches[0] : e;
    startX = touch.clientX;
    startY = touch.clientY;
    initialLeft = el.offsetLeft;
    initialTop = el.offsetTop;
    el.style.cursor = "grabbing";
    e.preventDefault();
  };

  const handleMove = (e) => {
    if (!isDragging) return;
    const touch = e.touches ? e.touches[0] : e;
    el.style.left = initialLeft + (touch.clientX - startX) + "px";
    el.style.top = initialTop + (touch.clientY - startY) + "px";
    e.preventDefault();
  };

  const handleEnd = (e) => {
    if (!isDragging) return;
    isDragging = false;
    el.style.cursor = "grab";
    const touch = e.changedTouches ? e.changedTouches[0] : e;
    const dx = Math.abs(touch.clientX - startX);
    const dy = Math.abs(touch.clientY - startY);
    if (dx < 5 && dy < 5) onTap();
  };

  el.addEventListener("mousedown", handleStart);
  el.addEventListener("touchstart", handleStart);
  document.addEventListener("mousemove", handleMove);
  document.addEventListener("touchmove", handleMove, { passive: false });
  document.addEventListener("mouseup", handleEnd);
  document.addEventListener("touchend", handleEnd);

  return function cleanup() {
    document.removeEventListener("mousemove", handleMove);
    document.removeEventListener("touchmove", handleMove);
    document.removeEventListener("mouseup", handleEnd);
    document.removeEventListener("touchend", handleEnd);
  };
}

function createDialogButton(text, bgColor) {
  const btn = document.createElement("button");
  btn.textContent = text;
  btn.style.cssText =
    "padding:10px 20px;font-size:16px;font-weight:bold;cursor:pointer;" +
    "background:" + bgColor + ";color:#fff;border:none;border-radius:8px;" +
    "box-shadow:0 2px 4px rgba(0,0,0,0.2);transition:opacity 0.2s;";
  btn.onmouseenter = () => (btn.style.opacity = "0.85");
  btn.onmouseleave = () => (btn.style.opacity = "1");
  return btn;
}

export function createStartButton(hasSession) {
  const toggleBtn = createDraggableButton();

  const dialog = document.createElement("div");
  dialog.style.cssText =
    "position:fixed;top:80px;left:20px;z-index:9999;" +
    "background:#fff;border-radius:12px;box-shadow:0 4px 16px rgba(0,0,0,0.2);" +
    "padding:16px;display:none;flex-direction:column;gap:12px;min-width:200px;";

  const cleanupDrag = makeDraggable(toggleBtn, () => {
    dialog.style.display =
      dialog.style.display === "none" ? "flex" : "none";
  });

  const startBtn = createDialogButton("▶ Start", "#1a73e8");
  startBtn.onclick = () => {
    transition(STATE.SIGNING_IN);
    GM_setValue(SESSION_KEY, { started: true });
    dialog.style.display = "none";
    showRunningState();
    log("Started by user - navigating to AddSession");
    setLastPath("");
    window.location.href = "https://accounts.google.com/AddSession";
  };

  const cancelBtn = createDialogButton("⏹ Cancel", "#d93025");
  cancelBtn.onclick = () => {
    clearSession();
    transition(STATE.IDLE);
    setLastPath("");
    stopSmsPoller();
    dialog.style.display = "none";
    showIdleState();
    log("Session cancelled by user");
  };

  const clearBtn = createDialogButton("🗑 Clear", "#5f6368");
  clearBtn.onclick = () => {
    clearSession();
    transition(STATE.IDLE);
    setLastPath("");
    stopSmsPoller();
    clearBtn.textContent = "✓ Cleared";
    setTimeout(() => {
      clearBtn.textContent = "🗑 Clear";
    }, 1500);
    log("Session cleared by user");
  };

  function showIdleState() {
    startBtn.style.display = "block";
    cancelBtn.style.display = "none";
    toggleBtn.style.background = "#1a73e8";
  }

  function showRunningState() {
    startBtn.style.display = "none";
    cancelBtn.style.display = "block";
    toggleBtn.style.background = "#d93025";
  }

  dialog.appendChild(startBtn);
  dialog.appendChild(cancelBtn);
  dialog.appendChild(clearBtn);
  document.body.appendChild(toggleBtn);
  document.body.appendChild(dialog);

  if (hasSession) {
    showRunningState();
  } else {
    showIdleState();
  }

  log("Control panel injected");
}
