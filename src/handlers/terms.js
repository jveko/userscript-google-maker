import { STATE, DELAY } from "../constants.js";
import { log } from "../log.js";
import { transition } from "../state.js";
import { humanDelay, rand } from "../human.js";
import { getElementByXpath } from "../helpers.js";

export async function handleTermsPage() {
  transition(STATE.ACCEPTING_TERMS);
  log("→ handleTermsPage");
  await humanDelay(1000, 2000);

  const scrollContainer =
    document.querySelector('[class*="scroll"], [style*="overflow"]') ||
    document.querySelector("main section") ||
    document.scrollingElement;

  if (scrollContainer) {
    log("Scrolling terms to bottom...");
    await new Promise((resolve) => {
      let steps = 0;
      const maxSteps = 200;
      const step = () => {
        if (++steps > maxSteps) {
          log("Scroll safety limit reached");
          resolve();
          return;
        }
        const target =
          scrollContainer === document.scrollingElement
            ? document.body.scrollHeight
            : scrollContainer.scrollHeight;
        const current =
          scrollContainer === document.scrollingElement
            ? window.scrollY + window.innerHeight
            : scrollContainer.scrollTop + scrollContainer.clientHeight;

        if (current < target - 10) {
          const amount = rand(80, 200);
          scrollContainer.scrollBy({ top: amount, behavior: "smooth" });
          setTimeout(step, rand(300, 800));
        } else {
          resolve();
        }
      };
      step();
    });
    log("Finished scrolling terms");
  }

  await humanDelay(DELAY.EXTRA_LONG);
  const btn = getElementByXpath("//button[.//span[text()='I agree']]");
  log("I agree btn:", btn ? "✓" : "✗");
  if (btn) btn.click();
  return true;
}
