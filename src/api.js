import { API_BASE, API_TIMEOUT, API_MAX_RETRIES, API_RETRY_BASE_MS, MONTH_NAMES } from "./constants.js";
import { log } from "./log.js";
import { setConfig } from "./state.js";
import { saveSession } from "./session.js";

function apiRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const opts = {
      method,
      url: API_BASE + path,
      headers: { "Content-Type": "application/json" },
      timeout: API_TIMEOUT,
      onload: (res) => {
        let body;
        try { body = JSON.parse(res.responseText); } catch (_) { body = null; }
        if (res.status < 200 || res.status >= 300) {
          log("API HTTP error:", res.status, res.statusText);
          const err = new Error("HTTP " + res.status);
          err.status = res.status;
          err.body = body;
          reject(err);
          return;
        }
        if (body !== null) {
          resolve(body);
        } else {
          reject(new Error("Invalid JSON response"));
        }
      },
      onerror: (err) => reject(err),
      ontimeout: () => reject(new Error("Request timed out")),
    };
    if (body) opts.data = JSON.stringify(body);
    GM_xmlhttpRequest(opts);
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
        log("API retry", attempt + 1, "in", backoff + "ms:", err.message || err);
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
