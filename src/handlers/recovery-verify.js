import { STATE, DELAY, RECOVERY_POLL_INTERVAL, RECOVERY_TIMEOUT } from "../constants.js";
import { log } from "../log.js";
import { transition, getState, getConfig } from "../state.js";
import { apiRequest } from "../api.js";
import { humanDelay, humanFillInput, humanClick } from "../human.js";
import { waitFor, getElementByXpath } from "../helpers.js";
import { clearSession, startNewSession, getSettings } from "../session.js";

export async function handleRecoveryVerifyPage() {
  transition(STATE.VERIFYING_RECOVERY_EMAIL);
  log("→ handleRecoveryVerifyPage");

  // Click "Verify recovery email" button
  await humanDelay(DELAY.LONG);
  const verifyBtn =
    getElementByXpath("//button[contains(., 'Verify recovery email')]") ||
    document.querySelector('button[aria-label="Verify recovery email"]');
  log("Verify recovery email btn:", verifyBtn ? "✓" : "✗");
  if (verifyBtn) {
    await humanClick(verifyBtn);
  }

  // Wait for the verification dialog input
  await humanDelay(DELAY.MEDIUM);
  const codeInput =
    await waitFor('div[role="dialog"] input', 15000).catch(() => null) ||
    document.querySelector('input[name="ca"]');

  // Poll for recovery code
  const code = await waitForRecoveryCode(getConfig().id);
  if (!code) {
    log.error("Failed to get recovery code");
    transition(STATE.ERROR, "Recovery code timeout");
    return false;
  }

  // Enter code
  await humanDelay(DELAY.MEDIUM);
  const inputSelector = document.querySelector('div[role="dialog"] input') ? 'div[role="dialog"] input' : 'input[name="ca"]';
  await humanFillInput(inputSelector, code);

  // Click Verify button in dialog
  await humanDelay(DELAY.LONG);
  const submitBtn =
    getElementByXpath("//div[@role='dialog']//button[contains(., 'Verify')]") ||
    document.querySelector('button[aria-label="Verify your recovery email"]');
  log("Verify submit btn:", submitBtn ? "✓" : "✗");
  if (submitBtn) {
    await humanClick(submitBtn);
  }

  await humanDelay(DELAY.EXTRA_LONG);

  // Flow complete
  transition(STATE.COMPLETED);
  log("Recovery email verified, account setup complete!");
  clearSession();

  const settings = getSettings();
  if (settings.mode === "continuous") {
    log("Continuous mode active: waiting 4s then restarting...");
    await humanDelay(4000, 5000);
    if (getState() === STATE.COMPLETED) {
      log("Restarting flow...");
      startNewSession();
      window.location.href = "https://accounts.google.com/AddSession";
    } else {
      log("Loop aborted because state changed (user intervened).");
    }
  }

  return true;
}

async function waitForRecoveryCode(id) {
  const startTime = Date.now();
  while (Date.now() - startTime < RECOVERY_TIMEOUT) {
    const elapsed = Date.now() - startTime;
    log("Polling recovery code, elapsed:", elapsed + "ms");
    try {
      const data = await apiRequest("GET", "/recovery/" + encodeURIComponent(id));
      log("Recovery poll response:", JSON.stringify(data));
      if (data.status === "found" && data.code) {
        return data.code;
      }
    } catch (err) {
      log.error("Recovery poll error:", err);
    }
    await new Promise((r) => setTimeout(r, RECOVERY_POLL_INTERVAL));
  }
  log.warn("Recovery code polling timed out");
  return null;
}
