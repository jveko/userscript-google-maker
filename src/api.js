import { API_BASE, API_TIMEOUT, API_MAX_RETRIES, API_RETRY_BASE_MS, MONTH_NAMES } from "./constants.js";
import { log } from "./log.js";
import { setConfig } from "./state.js";
import { saveSession } from "./session.js";

function apiRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    let hasResolved = false;

    // Failsafe timeout in case GM_xmlhttpRequest silently hangs in Stay Safari
    const failsafeTimeout = setTimeout(() => {
      if (!hasResolved) {
        hasResolved = true;
        reject(new Error("API timeout (Failsafe)"));
      }
    }, API_TIMEOUT + 5000);

    const finish = () => {
      if (!hasResolved) {
        hasResolved = true;
        clearTimeout(failsafeTimeout);
        return true;
      }
      return false;
    };

    const opts = {
      method,
      url: API_BASE + path,
      headers: { "Content-Type": "application/json" },
      timeout: API_TIMEOUT,
      onload: (res) => {
        if (!finish()) return;
        let resBody;
        try { resBody = JSON.parse(res.responseText); } catch (_) { resBody = null; }
        if (res.status < 200 || res.status >= 300) {
          log.error("API HTTP error:", res.status, res.statusText);
          const err = new Error("HTTP " + res.status);
          err.status = res.status;
          err.body = resBody;
          reject(err);
          return;
        }
        if (resBody !== null) {
          resolve(resBody);
        } else {
          reject(new Error("Invalid JSON response"));
        }
      },
      onerror: (err) => {
        if (!finish()) return;
        reject(new Error(err?.error || "Network error (onerror fired)"));
      },
      ontimeout: () => {
        if (!finish()) return;
        reject(new Error("Request timed out (ontimeout fired)"));
      },
      onabort: () => {
        if (!finish()) return;
        reject(new Error("Request aborted"));
      }
    };
    if (body) opts.data = JSON.stringify(body);
    
    try {
      GM_xmlhttpRequest(opts);
    } catch (e) {
      if (finish()) {
        reject(new Error("GM_xmlhttpRequest failed to execute: " + e.message));
      }
    }
  });
}

export async function apiRequestWithRetry(method, path, body) {
  let lastError;
  for (let attempt = 0; attempt < API_MAX_RETRIES; attempt++) {
    try {
      return await apiRequest(method, path, body);
    } catch (err) {
      lastError = err;
      if (attempt < API_MAX_RETRIES - 1) {
        const backoff = API_RETRY_BASE_MS * Math.pow(2, attempt);
        log.warn("API retry", attempt + 1, "in", backoff + "ms:", err.message || err);
        await new Promise((r) => setTimeout(r, backoff));
      }
    }
  }
  throw lastError;
}

export { apiRequest };

export async function regenerateEmail(id) {
  return apiRequestWithRetry("PATCH", "/email/" + id, {});
}

export async function fetchConfig() {
  log("Fetching config from API...");
  const data = await apiRequestWithRetry("POST", "/generate", {});
  const config = {
    id: data.id,
    firstName: data.firstName,
    lastName: data.lastName,
    birthMonth: MONTH_NAMES[parseInt(data.birthMonth, 10) - 1] || "January",
    birthDay: String(parseInt(data.birthDay, 10)),
    birthYear: data.birthYear,
    gender: data.gender.charAt(0).toUpperCase() + data.gender.slice(1),
    email: data.email,
    username: data.email.split("@")[0],
    password: data.password,
    recoveryEmail: data.recoveryEmail,
  };
  setConfig(config);
  log("CONFIG:", JSON.stringify(config));
  saveSession();
  return config;
}
