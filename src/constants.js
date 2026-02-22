export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const API_BASE = "https://api-google-maker.cloudflare-5e0.workers.dev";
export const API_TIMEOUT = 30000;
export const API_MAX_RETRIES = 3;
export const API_RETRY_BASE_MS = 1000;
export const SMS_POLL_INTERVAL = 3000;
export const SMS_TIMEOUT = 90000;

export const DELAY = {
  TINY: [15, 40],
  SHORT: [100, 250],
  MEDIUM: [250, 600],
  LONG: [400, 800],
  EXTRA_LONG: [800, 1500],
  TYPING: [30, 80],
  TYPING_PAUSE: [150, 300],
  BACKSPACE: [40, 90],
};

export const STATE = {
  IDLE: "IDLE",
  SIGNING_IN: "SIGNING_IN",
  FILLING_NAME: "FILLING_NAME",
  FILLING_BIRTHDAY: "FILLING_BIRTHDAY",
  FILLING_USERNAME: "FILLING_USERNAME",
  FILLING_PASSWORD: "FILLING_PASSWORD",
  PHONE_VERIFICATION: "PHONE_VERIFICATION",
  WAITING_SMS: "WAITING_SMS",
  FILLING_RECOVERY: "FILLING_RECOVERY",
  SKIPPING_RECOVERY_PHONE: "SKIPPING_RECOVERY_PHONE",
  CONFIRMING: "CONFIRMING",
  ACCEPTING_TERMS: "ACCEPTING_TERMS",
  COMPLETED: "COMPLETED",
  ERROR: "ERROR",
};

export const TAG = "[GoogleAccounts]";
export const SESSION_KEY = "gah_config";
export const SETTINGS_KEY = "gah_settings";
