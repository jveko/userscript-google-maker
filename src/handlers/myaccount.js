import { STATE } from "../constants.js";
import { log } from "../log.js";
import { transition, getConfig } from "../state.js";
import { apiRequestWithRetry } from "../api.js";
import { clearSession } from "../session.js";

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
}
