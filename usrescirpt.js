// ==UserScript==
// @name         Sub2s Auto-Bypass + Key Grabber v3
// @version      3.0
// @description  Start -> robot check -> CONTINUE -> hops -> GET KEY -> copy
// @match        https://api.sub2s.com/*
// @match        https://*.sub2s.com/*
// @match        https://*.layma.net/*
// @match        https://ontops.link/*
// @match        https://authtool.app/*
// @match        *://*/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';
  if (window.__sub2sV3) return;          // don't run twice on SPAs
  window.__sub2sV3 = true;

  /* 0. kill ad/scareware popups opened by the chain (but never kill authtool/sub2s tabs) */
  const CHAIN = /sub2s\.com|layma\.net|ontops\.link|authtool\.app/;
  let fromChain = false;
  try { fromChain = CHAIN.test(window.opener.location.href); } catch (e) {}
  try { fromChain = fromChain || CHAIN.test(document.referrer); } catch (e) {}
  if (window.opener && fromChain && !CHAIN.test(location.hostname)) {
    setTimeout(() => window.close(), 400);
    return;
  }

  const $  = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const visible = el => !!el && !el.disabled && el.getAttribute('aria-disabled') !== 'true' && el.offsetParent !== null;
  const byText = words => $$('button, a, input[type="button"], input[type="submit"], [role="button"]')
    .find(b => {
      const t = ((b.innerText || b.value || '') + '').toUpperCase().replace(/\s+/g, ' ').trim();
      return t && words.some(w => t.includes(w)) && visible(b);
    });

  function extractResult() {
    let h = location.href;
    try { h = decodeURIComponent(decodeURIComponent(h)); } catch (e) {}
    const m = h.match(/[?&]result=([^&#\s]+)/);
    return m ? m[1] : null;
  }

  function copyKey(k) {
    try { navigator.clipboard.writeText(k); log('copied to clipboard'); }
    catch (e) { log('clipboard blocked — copy manually'); }
  }

  /* ---------- UI panel ---------- */
  const panel = document.createElement('div');
  panel.style.cssText = 'position:fixed;bottom:16px;right:16px;z-index:2147483647;width:270px;background:#1e1b2e;border:1px solid #7c4dff;border-radius:12px;padding:12px;font:13px/1.4 system-ui;color:#fff;box-shadow:0 4px 20px rgba(0,0,0,.5)';
  panel.innerHTML = `
    <div style="font-weight:700;margin-bottom:6px;color:#c1c0ff">🔑 Sub2s Helper v3</div>
    <div id="kch-status" style="color:#aaa;margin-bottom:8px">starting…</div>
    <div id="kch-logs" style="max-height:110px;overflow:auto;font-size:11px;color:#8f8f9f;margin-bottom:8px"></div>
    <label style="display:flex;gap:6px;align-items:center;font-size:12px;cursor:pointer">
      <input type="checkbox" id="kch-auto" checked> auto-run
    </label>`;
  document.documentElement.appendChild(panel);
  const status = m => { const el = $('#kch-status'); if (el) el.textContent = m; };
  const log = m => { const el = $('#kch-logs'); if (!el) return;
    const d = document.createElement('div'); d.textContent = '• ' + m; el.prepend(d); };

  /* ---------- big key banner ---------- */
  function showKeyBanner(key) {
    const b = document.createElement('div');
    b.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:rgba(10,8,25,.92);display:flex;align-items:center;justify-content:center;font-family:system-ui';
    b.innerHTML = `<div style="background:#1e1b2e;border:2px solid #7c4dff;border-radius:16px;padding:32px 40px;text-align:center;color:#fff;max-width:90vw">
      <div style="font-size:22px;font-weight:700;margin-bottom:8px">🎉 Your Key</div>
      <div style="font-size:14px;color:#aaa;margin-bottom:16px">Save it — it won't show again after closing</div>
      <div style="font-family:monospace;font-size:18px;background:#12101f;border-radius:8px;padding:14px 18px;margin-bottom:16px;user-select:all;word-break:break-all">${key}</div>
      <button id="kch-copy" style="background:#7c4dff;color:#fff;border:0;border-radius:8px;padding:12px 28px;font-size:15px;font-weight:600;cursor:pointer">📋 COPY KEY</button>
    </div>`;
    document.body.appendChild(b);
    b.querySelector('#kch-copy').onclick = () => {
      navigator.clipboard.writeText(key).then(() => {
        b.querySelector('#kch-copy').textContent = '✅ COPIED';
      });
    };
  }

  /* ---------- sub2s ---------- */
  async function runSub2s() {
    // A) method-selection page: BẮT ĐẦU VƯỆT LINK
    const start = byText(['BẮT ĐẦU VƯỆT LINK', 'BẮT ĐẦU', 'GET LINK']);
    if (start) {
      log('clicking "BẮT ĐẦU VƯỆT LINK"…');
      status('starting bypass…');
      await sleep(600);
      start.click();
      return;
    }

    // B) confirm page: click robot image once (ad popup auto-closes itself)
    const robot = $$('img').find(im => /lock\.png/i.test(im.src) && !/unlock/i.test(im.src));
    if (robot) {
      log('clicking robot image…');
      robot.click();
    }
    if ($('iframe[src*="challenges.cloudflare"]')) {
      status('⚠️ click the Cloudflare checkbox once if it asks');
    }

    // wait for unlock, then CONTINUE
    for (let i = 0; i < 120; i++) {
      await sleep(1000);
      const go = byText(['TIẾP TỤC', 'CONTINUE']);
      if (go) {
        await sleep(700);
        go.click();
        log('pressed CONTINUE — following redirect…');
        status('redirecting…');
        return;
      }
    }
    status('CONTINUE never appeared — click the robot image again');
  }

  /* ---------- authtool ---------- */
  async function runAuthtool() {
    const key = extractResult();
    if (key) {                       // final key page
      status('✅ KEY READY');
      log('key: ' + key);
      copyKey(key);
      showKeyBanner(key);
      return;
    }
    // code page: wait for Cloudflare success, then click GET KEY
    status('waiting for Cloudflare check…');
    if ($('iframe[src*="challenges.cloudflare"]')) {
      log('if a checkbox appears, click it once');
    }
    for (let i = 0; i < 120; i++) {
      await sleep(1000);
      const btn = byText(['GET KEY']);
      if (btn) {
        await sleep(500);
        btn.click();
        log('clicked GET KEY');
        status('fetching key…');
        return;
      }
    }
    status('GET KEY button not found');
  }

  /* ---------- route ---------- */
  const host = location.hostname;
  const run = () => {
    if (host.includes('sub2s.com')) return runSub2s();
    if (host.includes('authtool.app')) return runAuthtool();
    // layma / ontops / any hop
    const key = extractResult();
    if (key) {
      status('KEY FOUND! 🎉');
      log('key: ' + key);
      copyKey(key);
      setTimeout(() => {
        location.href = 'https://authtool.app/get-key/?result=' + encodeURIComponent(key);
      }, 1000);
    } else {
      status('hop page — waiting for redirect…');
      log(host);
    }
  };

  if ($('#kch-auto').checked) run();
  $('#kch-auto').addEventListener('change', e => { if (e.target.checked) run(); });
})();
