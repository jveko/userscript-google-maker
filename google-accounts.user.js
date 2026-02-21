// ==UserScript==
// @name         Google Accounts Helper
// @namespace    https://github.com/dimaz/userscripts
// @version      2.1.0
// @description  Automates Google account signup flow
// @author       dimaz
// @match        https://accounts.google.com/*
// @match        https://myaccount.google.com/*
// @grant        GM_xmlhttpRequest
// @connect      api-google-maker.cloudflare-5e0.workers.dev
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @run-at       document-idle
// @noframes
// ==/UserScript==

(function () {
  "use strict";

  // ---- MONTH NUMBER TO NAME ----
  const MONTH_NAMES = [
    '', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const API_BASE = 'https://api-google-maker.cloudflare-5e0.workers.dev';
  const SMS_POLL_INTERVAL = 3000;
  const SMS_TIMEOUT = 180000;

  const TAG = '[GAH]';
  let logPanel = null;

  function createLogPanel() {
    logPanel = document.createElement('div');
    logPanel.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:99999;'
      + 'max-height:8vh;overflow-y:auto;background:rgba(0,0,0,0.85);'
      + 'color:#0f0;font-family:monospace;font-size:11px;padding:8px;'
      + 'border-top:2px solid #333;display:none;';
    document.body.appendChild(logPanel);
  }

  function log(...args) {
    console.log(TAG, ...args);
    if (!logPanel) createLogPanel();
    logPanel.style.display = 'block';
    const line = document.createElement('div');
    line.style.cssText = 'padding:2px 0;border-bottom:1px solid #222;word-break:break-all;';
    const time = new Date().toLocaleTimeString();
    line.textContent = '[' + time + '] ' + args.map(a =>
      typeof a === 'object' ? JSON.stringify(a) : String(a)
    ).join(' ');
    logPanel.appendChild(line);
    logPanel.scrollTop = logPanel.scrollHeight;
  }

  let CONFIG = null;

  const SESSION_KEY = 'gah_config';

  function saveSession() {
    GM_setValue(SESSION_KEY, JSON.stringify(CONFIG));
    log('Session saved');
  }

  function loadSession() {
    const saved = GM_getValue(SESSION_KEY, null);
    if (saved) {
      CONFIG = JSON.parse(saved);
      log('Session restored:', JSON.stringify(CONFIG));
      return true;
    }
    return false;
  }

  function clearSession() {
    GM_deleteValue(SESSION_KEY);
  }

  function fetchConfig() {
    return new Promise((resolve, reject) => {
      log('Fetching config from API...');
      GM_xmlhttpRequest({
        method: 'POST',
        url: API_BASE + '/generate',
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify({}),
        onload: (res) => {
          try {
            const data = JSON.parse(res.responseText);
            CONFIG = {
              firstName: data.firstName,
              lastName: data.lastName,
              birthMonth: MONTH_NAMES[parseInt(data.birthMonth, 10)] || 'January',
              birthDay: String(parseInt(data.birthDay, 10)),
              birthYear: data.birthYear,
              gender: data.gender.charAt(0).toUpperCase() + data.gender.slice(1),
              email: data.email,
              username: data.email.split('@')[0],
              password: data.password,
              recoveryEmail: data.recoveryEmail,
            };
            log('CONFIG:', JSON.stringify(CONFIG));
            saveSession();
            resolve(CONFIG);
          } catch (e) {
            log('Parse error:', e);
            reject(e);
          }
        },
        onerror: (err) => {
          log('API error:', err);
          reject(err);
        },
      });
    });
  }

  function apiRequest(method, path, body) {
    return new Promise((resolve, reject) => {
      const opts = {
        method,
        url: API_BASE + path,
        headers: { 'Content-Type': 'application/json' },
        onload: (res) => {
          try {
            resolve(JSON.parse(res.responseText));
          } catch (e) {
            reject(e);
          }
        },
        onerror: (err) => reject(err),
      };
      if (body) opts.data = JSON.stringify(body);
      GM_xmlhttpRequest(opts);
    });
  }

  // ---- HUMAN-LIKE SIMULATION HELPERS ----

  function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function humanDelay(min, max) {
    return new Promise((resolve) => setTimeout(resolve, rand(min || 800, max || 2500)));
  }

  function humanScroll() {
    const amount = rand(-30, 60);
    window.scrollBy({ top: amount, behavior: 'smooth' });
    return humanDelay(200, 500);
  }

  function humanFocus(el) {
    el.focus();
    el.dispatchEvent(new Event('focus', { bubbles: true }));
    return humanDelay(200, 600);
  }

  function fireKeyEvents(el, char) {
    const opts = { key: char, code: 'Key' + char.toUpperCase(), bubbles: true };
    el.dispatchEvent(new KeyboardEvent('keydown', opts));
    el.dispatchEvent(new KeyboardEvent('keypress', opts));
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new KeyboardEvent('keyup', opts));
  }

  function humanType(el, text) {
    return new Promise(async (resolve) => {
      await humanFocus(el);
      el.value = '';
      for (let i = 0; i < text.length; i++) {
        const char = text[i];

        // ~8% chance of typo on letters
        if (char.match(/[a-zA-Z]/) && Math.random() < 0.08) {
          const typo = String.fromCharCode(char.charCodeAt(0) + rand(-2, 2));
          el.value += typo;
          fireKeyEvents(el, typo);
          await humanDelay(30, 80);

          // backspace
          el.value = el.value.slice(0, -1);
          el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }));
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new KeyboardEvent('keyup', { key: 'Backspace', bubbles: true }));
          await humanDelay(80, 200);
        }

        el.value += char;
        fireKeyEvents(el, char);

        // variable typing speed: occasional pause every ~5-10 chars
        if (i > 0 && i % rand(5, 10) === 0) {
          await humanDelay(300, 700);
        } else {
          await humanDelay(50, 150);
        }
      }

      el.dispatchEvent(new Event('change', { bubbles: true }));
      await humanDelay(100, 300);
      resolve();
    });
  }

  async function humanFillInput(selector, value) {
    const el = document.querySelector(selector);
    log('humanFillInput:', selector, '→', value, el ? '✓' : '✗');
    if (el) {
      await humanType(el, value);
    }
    return el;
  }

  async function humanClick(el) {
    if (!el) return;
    await humanDelay(300, 800);
    el.click();
  }

  async function humanClickNext() {
    await humanDelay(800, 2000);
    const btn = getElementByXpath("//button[.//span[text()='Next']]");
    log('humanClickNext:', btn ? '✓ found' : '✗ not found');
    if (btn) btn.click();
  }

  async function humanSelectDropdown(containerSelector, optionText) {
    const container = document.querySelector(containerSelector);
    log('selectDropdown:', containerSelector, container ? '✓' : '✗');
    if (!container) return;

    const trigger = container.querySelector('[role="combobox"]');
    log('selectDropdown trigger:', trigger ? '✓' : '✗');
    if (!trigger) return;

    await humanDelay(400, 900);
    trigger.click();
    await humanDelay(300, 600);

    let options = container.querySelectorAll('li[role="option"]');
    if (options.length === 0) {
      options = document.querySelectorAll('li[role="option"]');
      log('selectDropdown: using global options, count:', options.length);
    } else {
      log('selectDropdown: using container options, count:', options.length);
    }

    for (const opt of options) {
      if (opt.textContent.trim() === optionText) {
        await humanDelay(200, 500);
        opt.click();
        log('selectDropdown: clicked', optionText);
        return;
      }
    }
    log('selectDropdown: NOT FOUND', optionText);
  }

  // ---- BASIC HELPERS ----

  function getElementByXpath(path) {
    return document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
  }

  function waitFor(selector, timeout) {
    log('waitFor:', selector);
    return new Promise((resolve, reject) => {
      const el = document.querySelector(selector);
      if (el) {
        log('waitFor: found immediately', selector);
        return resolve(el);
      }

      const observer = new MutationObserver(() => {
        const el = document.querySelector(selector);
        if (el) {
          observer.disconnect();
          log('waitFor: found via observer', selector);
          resolve(el);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });

      setTimeout(() => {
        observer.disconnect();
        log('waitFor: TIMEOUT', selector);
        reject(new Error('Timeout waiting for ' + selector));
      }, timeout || 10000);
    });
  }

  // ---- PAGE HANDLERS ----

  async function handleSignInPage() {
    log('→ handleSignInPage');
    const btn = getElementByXpath("//button[.//span[text()='Create account']]");
    log('Create account btn:', btn ? '✓' : '✗');
    if (!btn) return false;
    await humanDelay(1000, 3000);
    btn.click();
    await humanDelay(500, 1200);
    const option = getElementByXpath("//li[.//span[text()='For my personal use']]");
    if (option) option.click();
    return true;
  }

  async function handleNamePage() {
    log('→ handleNamePage');
    await waitFor('#firstName');
    await humanScroll();
    await humanDelay(500, 1500);
    await humanFillInput('#firstName', CONFIG.firstName);
    await humanDelay(300, 800);
    await humanFillInput('#lastName', CONFIG.lastName);
    await humanClickNext();
    return true;
  }

  async function handleBirthdayGenderPage() {
    log('→ handleBirthdayGenderPage');
    await waitFor('#day');
    await humanScroll();
    await humanDelay(500, 1500);

    await humanSelectDropdown('#month', CONFIG.birthMonth);
    await humanDelay(300, 700);
    await humanFillInput('#day', CONFIG.birthDay);
    await humanDelay(300, 700);
    await humanFillInput('#year', CONFIG.birthYear);
    await humanDelay(400, 900);
    await humanSelectDropdown('#gender', CONFIG.gender);

    await humanDelay(800, 2000);
    const nextBtn = document.querySelector('#birthdaygenderNext button')
      || getElementByXpath("//button[.//span[text()='Next']]");
    if (nextBtn) nextBtn.click();
    return true;
  }

  async function handleUsernamePage() {
    log('→ handleUsernamePage');
    await waitFor('input[name="usernameRadio"], input[name="Username"]');
    await humanScroll();
    await humanDelay(800, 2000);

    const customRadio = document.querySelector('input[name="usernameRadio"][value="custom"]');
    if (customRadio) {
      customRadio.click();
      await humanDelay(500, 1000);
    }

    await humanFillInput('input[name="Username"]', CONFIG.username);
    await humanClickNext();
    return true;
  }

  function handleUsernameTaken() {
    const bodyText = document.body.innerText;
    const isTaken = bodyText.includes('That username is taken');
    const isAlreadyUsed = bodyText.includes('already been used')
      || bodyText.includes('already exists')
      || bodyText.includes('is already in use');

    if (!isTaken && !isAlreadyUsed) return false;

    if (isTaken) {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        if (walker.currentNode.textContent.trim() === 'Available:') {
          const container = walker.currentNode.parentElement;
          const suggestion = container.querySelector('button');
          if (suggestion) {
            suggestion.click();
            humanClickNext();
            return true;
          }
        }
      }
    }

    log('Username/email unavailable, clearing session and restarting');
    clearSession();
    started = false;
    lastPath = '';
    window.location.href = 'https://accounts.google.com/AddSession';
    return true;
  }

  async function handlePasswordPage() {
    log('→ handlePasswordPage');
    await waitFor('input[name="Passwd"]');
    await humanScroll();
    await humanDelay(500, 1500);
    await humanFillInput('input[name="Passwd"]', CONFIG.password);
    await humanDelay(400, 1000);
    await humanFillInput('input[name="PasswdAgain"]', CONFIG.password);

    await humanDelay(800, 2000);
    const btn = document.querySelector('#createpasswordNext button')
      || getElementByXpath("//button[.//span[text()='Next']]");
    if (btn) btn.click();
    return true;
  }

  async function handlePhoneVerificationPage() {
    log('→ handlePhoneVerificationPage');

    await waitFor('#phoneNumberId');

    const errorEl = document.querySelector('#c29 .Ekjuhf');
    if (errorEl && errorEl.textContent.includes('has been used too many times')) {
      log('Phone number rejected, requesting new number via renew');
      try {
        const renewData = await apiRequest('POST', '/sms/renew', { email: CONFIG.email });
        log('Renew response:', JSON.stringify(renewData));
      } catch (err) {
        log('Renew error:', err);
        return true;
      }
      await humanDelay(1000, 2000);
    }

    await humanScroll();
    await humanDelay(1000, 3000);

    const data = await apiRequest('POST', '/sms/request', { email: CONFIG.email });
    log('SMS request response:', JSON.stringify(data));
    await humanFillInput('#phoneNumberId', data.phoneNumber);
    await humanClickNext();
    return true;
  }

  let smsPoller = null;

  async function handleSmsCodePage() {
    log('→ handleSmsCodePage');
    if (smsPoller) clearInterval(smsPoller);

    const startTime = Date.now();
    await waitFor('#code');

    smsPoller = setInterval(() => {
      const elapsed = Date.now() - startTime;
      log('Polling SMS code, elapsed:', elapsed + 'ms');

      if (elapsed > SMS_TIMEOUT) {
        log('SMS timeout, clicking "Get new code"');
        clearInterval(smsPoller);
        smsPoller = null;
        const resendBtn = getElementByXpath("//button[.//span[text()='Get new code']]");
        if (resendBtn) {
          resendBtn.click();
          lastPath = '';
        }
        return;
      }

      apiRequest('GET', '/sms/poll/' + encodeURIComponent(CONFIG.email)).then(async (data) => {
        log('Poll response:', JSON.stringify(data));
        if (data.status === 'received' && data.code) {
          clearInterval(smsPoller);
          smsPoller = null;
          await humanDelay(500, 1500);
          await humanFillInput('#code', data.code);
          await humanClickNext();
        }
      }).catch((err) => log('Poll error:', err));
    }, SMS_POLL_INTERVAL);
    return true;
  }

  async function handleRecoveryEmailPage() {
    log('→ handleRecoveryEmailPage');
    await waitFor('#recoveryEmailId');
    await humanScroll();
    await humanDelay(500, 1500);
    await humanFillInput('#recoveryEmailId', CONFIG.recoveryEmail);

    await humanDelay(800, 2000);
    const btn = document.querySelector('#recoveryNext button')
      || getElementByXpath("//button[.//span[text()='Next']]");
    if (btn) btn.click();
    return true;
  }

  async function handleConfirmationPage() {
    log('→ handleConfirmationPage');
    await humanScroll();
    await humanDelay(1500, 4000);
    await humanClickNext();
    return true;
  }

  async function handleTermsPage() {
    log('→ handleTermsPage');
    await humanDelay(1000, 2000);

    const scrollContainer = document.querySelector('[class*="scroll"], [style*="overflow"]')
      || document.querySelector('main section')
      || document.scrollingElement;

    if (scrollContainer) {
      log('Scrolling terms to bottom...');
      await new Promise((resolve) => {
        const step = () => {
          const target = scrollContainer === document.scrollingElement
            ? document.body.scrollHeight
            : scrollContainer.scrollHeight;
          const current = scrollContainer === document.scrollingElement
            ? window.scrollY + window.innerHeight
            : scrollContainer.scrollTop + scrollContainer.clientHeight;

          if (current < target - 10) {
            const amount = rand(80, 200);
            scrollContainer.scrollBy({ top: amount, behavior: 'smooth' });
            setTimeout(step, rand(300, 800));
          } else {
            resolve();
          }
        };
        step();
      });
      log('Finished scrolling terms');
    }

    await humanDelay(1500, 3000);
    const btn = getElementByXpath("//button[.//span[text()='I agree']]");
    log('I agree btn:', btn ? '✓' : '✗');
    if (btn) btn.click();
    return true;
  }

  function handleMyAccountPage() {
    log('→ handleMyAccountPage (account created successfully)');
    apiRequest('PATCH', '/confirm/' + encodeURIComponent(CONFIG.email)).then((data) => {
      log('Confirm response:', JSON.stringify(data));
      clearSession();
    }).catch((err) => log('Confirm error:', err));
  }

  // ---- FLOATING START BUTTON ----

  function createStartButton() {
    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;top:20px;right:20px;z-index:99999;'
      + 'display:flex;gap:8px;';

    const startBtn = document.createElement('button');
    startBtn.textContent = '▶ Start';
    startBtn.style.cssText = 'padding:10px 20px;font-size:16px;font-weight:bold;cursor:pointer;'
      + 'background:#1a73e8;color:#fff;border:none;border-radius:24px;'
      + 'box-shadow:0 2px 8px rgba(0,0,0,0.3);transition:opacity 0.2s;';
    startBtn.onmouseenter = () => startBtn.style.opacity = '0.85';
    startBtn.onmouseleave = () => startBtn.style.opacity = '1';
    startBtn.onclick = () => {
      startBtn.textContent = '⏳ Loading...';
      startBtn.disabled = true;
      fetchConfig().then(() => {
        started = true;
        container.remove();
        log('Started by user');
        lastPath = '';
        window.location.href = 'https://accounts.google.com/AddSession';
      }).catch(() => {
        startBtn.textContent = '✗ Retry';
        startBtn.disabled = false;
      });
    };

    const clearBtn = document.createElement('button');
    clearBtn.textContent = '🗑 Clear';
    clearBtn.style.cssText = 'padding:10px 20px;font-size:16px;font-weight:bold;cursor:pointer;'
      + 'background:#d93025;color:#fff;border:none;border-radius:24px;'
      + 'box-shadow:0 2px 8px rgba(0,0,0,0.3);transition:opacity 0.2s;';
    clearBtn.onmouseenter = () => clearBtn.style.opacity = '0.85';
    clearBtn.onmouseleave = () => clearBtn.style.opacity = '1';
    clearBtn.onclick = () => {
      clearSession();
      started = false;
      lastPath = '';
      if (smsPoller) {
        clearInterval(smsPoller);
        smsPoller = null;
      }
      clearBtn.textContent = '✓ Cleared';
      setTimeout(() => { clearBtn.textContent = '🗑 Clear'; }, 1500);
      log('Session cleared by user');
    };

    container.appendChild(startBtn);
    container.appendChild(clearBtn);
    document.body.appendChild(container);
    log('Start & Clear buttons injected');
  }

  // ---- PAGE DETECTION (URL polling) ----

  function detectAndRun() {
    if (!started) return;
    const path = window.location.pathname;
    if (path === lastPath) return;
    lastPath = path;
    log('URL changed:', path);

    if (path.includes('/signup/name')) {
      handleNamePage();
    } else if (path.includes('/signup/birthdaygender')) {
      handleBirthdayGenderPage();
    } else if (path.includes('/signup/username')) {
      if (!handleUsernameTaken()) {
        handleUsernamePage();
      }
    } else if (path.includes('/signup/password')) {
      handlePasswordPage();
    } else if (path.includes('/signup/startmtsmsidv')) {
      handlePhoneVerificationPage();
    } else if (path.includes('/signup/verifyphone/idv')) {
      handleSmsCodePage();
    } else if (path.includes('/signup/addrecoveryemail')) {
      handleRecoveryEmailPage();
    } else if (path.includes('/signup/confirmation')) {
      handleConfirmationPage();
    } else if (path.includes('/signup/termsofservice')) {
      handleTermsPage();
    } else {
      handleSignInPage();
    }
  }

  // ---- INIT ----

  let started = false;
  let lastPath = '';

  if (window.location.hostname === 'myaccount.google.com') {
    if (loadSession()) {
      handleMyAccountPage();
    }
    return;
  }

  if (loadSession()) {
    started = true;
    log('Resuming from session');
    setInterval(detectAndRun, 1000);
    detectAndRun();
  } else {
    setInterval(detectAndRun, 1000);
    createStartButton();
  }
})();
