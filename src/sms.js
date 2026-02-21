import { log } from "./log.js";
import { getSmsPoller, setSmsPoller } from "./state.js";

export function stopSmsPoller() {
  const poller = getSmsPoller();
  if (poller) {
    clearInterval(poller);
    setSmsPoller(null);
    log("SMS poller stopped");
  }
}
