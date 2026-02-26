import { STATE, DELAY } from "../constants.js";
import { log } from "../log.js";
import { transition, getConfig } from "../state.js";
import { apiRequestWithRetry } from "../api.js";
import { humanDelay, humanClick } from "../human.js";
import { getElementByXpath } from "../helpers.js";

export async function handleMyAccountPage() {
  transition(STATE.NAVIGATING_SECURITY);
  log("→ handleMyAccountPage (confirming account & navigating to security)");
  try {
    const data = await apiRequestWithRetry(
      "PATCH",
      "/confirm/" + encodeURIComponent(getConfig().id),
    );
    log("Confirm response:", JSON.stringify(data));
  } catch (err) {
    log.error("Confirm error:", err);
  }

  await humanDelay(DELAY.LONG);
  const securityLink = getElementByXpath("//a[contains(., 'Security')]");
  log("Security link:", securityLink ? "✓" : "✗");
  if (securityLink) {
    await humanClick(securityLink);
  }
  return true;
}
