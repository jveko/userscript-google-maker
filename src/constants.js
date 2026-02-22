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
  TINY: [30, 80],
  SHORT: [200, 500],
  MEDIUM: [500, 1500],
  LONG: [800, 2000],
  EXTRA_LONG: [1500, 4000],
  TYPING: [50, 150],
  TYPING_PAUSE: [300, 700],
  BACKSPACE: [80, 200],
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
};

export const TAG = "[GoogleAccounts]";
export const SESSION_KEY = "gah_config";
