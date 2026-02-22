import { STATE } from "../constants.js";
import { log } from "../log.js";
import { transition, getState, getConfig } from "../state.js";
import { apiRequestWithRetry } from "../api.js";
import { clearSession, startNewSession, getSettings } from "../session.js";
import { humanDelay } from "../human.js";

export async function handleMyAccountPage() {
  transition(STATE.COMPLETED);
  log("→ handleMyAccountPage (account created successfully)");
  try {
    const data = await apiRequestWithRetry(
      "PATCH",
      "/confirm/" + encodeURIComponent(getConfig().id),
    );
    log("Confirm response:", JSON.stringify(data));
  } catch (err) {
    log("Confirm error:", err);
  }
  
  clearSession();

  const settings = getSettings();
  if (settings.mode === "continuous") {
    log("Infinite mode active: waiting 4s then restarting...");
    await humanDelay(4000, 5000);
    
    // Check if user clicked stop or reset during the delay
    if (getState() === STATE.COMPLETED) {
      log("Restarting flow...");
      startNewSession();
      window.location.href = "https://accounts.google.com/AddSession";
    } else {
      log("Infinite loop aborted because state changed (user intervened).");
    }
  }
}
