// ==UserScript==
// @name         Sub2s Auto-Bypass + Key Grabber v3.1
// @version      3.1
// @description  Start -> robot check -> CONTINUE -> hops -> GET KEY -> OPEN LINK -> key -> copy
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
  if (window.__sub2sV31) return;          // don't double-run
  window.__sub2sV31 = true;
  const S = window.__kchState = window.__kchState || {};   // per-page action flags

  /* 0. kill ad popups opened by the chain (never kill sub2s/authtool tabs) */
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

  const LINK_RE = /(?:https?:\/\/)?(?:api\.)?sub2s\.com\/l\/([a-z0-9]+)/i;

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

  /* ---------- purple UI panel ---------- */
  const panel = document.createElement('div');
  panel.style.cssText = 'position:fixed;bottom:16px;right:16px;z-index:2147483647;width:270px;background:linear-gradient(160deg,#241a3f,#17102a);border:1px solid #9d6bff;border-radius:14px;padding:12px;font:13px/1.4 system-ui;color:#f3edff;box-shadow:0 6px 24px rgba(124,77,255,.45)';
  panel.innerHTML = `
    <div style="font-weight:700;margin-bottom:6px;color:#c9b3ff">🔑 Sub2s Helper v3.1</div>
    <div id="kch-status" style="color:#b9a8e8;margin-bottom:8px">starting…</div>
    <div id="kch-logs" style="max-height:110px;overflow:auto;font-size:11px;color:#8f7fc9;margin-bottom:8px"></div>
    <label style="display:flex;gap:6px;align-items:center;font-size:12px;cursor:pointer">
      <input type="checkbox" id="kch-auto" checked> auto-run
    </label>`;
  document.documentElement.appendChild(panel);
  const status = m => { const el = $('#kch-status'); if (el) el.textContent = m; };
  const log = m => { const el = $('#kch-logs'); if (!el) return;
    const d = document.createElement('div'); d.textContent = '• ' + m; el.prepend(d); };

  /* ---------- big key banner ---------- */
  function showKeyBanner(key) {
    if (S.bannerShown) return; S.bannerShown = true;
    const b = document.createElement('div');
    b.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:rgba(18,10,38,.94);display:flex;align-items:center;justify-content:center;font-family:system-ui';
    b.innerHTML = `<div style="background:linear-gradient(160deg,#2a1d4d,#160f2b);border:2px solid #9d6bff;border-radius:16px;padding:32px 40px;text-align:center;color:#f3edff;max-width:90vw;box-shadow:0 0 60px rgba(124,77,255,.5)">
      <div style="font-size:22px;font-weight:700;margin-bottom:8px">🎉 Your Key</div>
      <div style="font-size:14px;color:#b9a8e8;margin-bottom:16px">Save it — it won't show again after closing</div>
      <div style="font-family:monospace;font-size:18px;background:#120b24;border-radius:8px;padding:14px 18px;margin-bottom:16px;user-select:all;word-break:break-all">${key}</div>
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
    // A) selection page: BẮT ĐẦU VƯỆT LINK
    if (!S.started) {
      const start = byText(['BẮT ĐẦU VƯỆT LINK', 'BẮT ĐẦU', 'GET LINK']);
      if (start) {
        S.started = true;
        log('clicking "BẮT ĐẦU VƯỆT LINK"…');
        status('starting bypass…');
        await sleep(600);
        start.click();
        return;
      }
    }

    // B) confirm page: robot image once
    if (!S.robotClicked) {
      const robot = $$('img').find(im => /lock\.png/i.test(im.src) && !/unlock/i.test(im.src));
      if (robot) {
        S.robotClicked = true;
        log('clicking robot image…');
        robot.click();
      }
    }
    if ($('iframe[src*="challenges.cloudflare"]') && !S.cfNoted) {
      S.cfNoted = true;
      status('⚠️ click the Cloudflare checkbox once if it asks');
    }

    // wait for unlock, then CONTINUE
    if (!S.continued) {
      const go = byText(['TIẾP TỤC', 'CONTINUE']);
      if (go) {
        S.continued = true;
        await sleep(700);
        go.click();
        log('pressed CONTINUE — following redirect…');
        status('redirecting…');
      }
    }
  }

  /* ---------- authtool ---------- */
  async function runAuthtool() {
    // 1) FINAL key page: ?result=...
    const key = extractResult();
    if (key) {
      status('✅ KEY READY');
      log('key: ' + key);
      copyKey(key);
      showKeyBanner(key);
      return;
    }

    // 2) "access the link below to get your key" page -> OPEN LINK
    if (!S.openedLink) {
      const openBtn = byText(['OPEN LINK', 'MỞ LINK']);
      const targetA = $$('a').find(a => LINK_RE.test(a.href)) ||
                      $$('a').find(a => LINK_RE.test(a.textContent || ''));
      const url = (openBtn && (openBtn.href || (LINK_RE.exec(openBtn.textContent || '') || [])[0]))
                  || (targetA && (targetA.href || targetA.textContent.trim()));
      if (openBtn || url) {
        const m = url && LINK_RE.exec(url);
        if (m) log('found key link code: ' + m[1]);
        S.openedLink = true;
        status('opening key link…');
        if (url && /^https?:\/\//.test(url)) {
          setTimeout(() => { location.href = url; }, 500);
        } else if (url) {
          setTimeout(() => { location.href = 'https://' + url.replace(/^\/+/, ''); }, 500);
        } else {
          openBtn.click();   // let the button do whatever it does
        }
        return;
      }
    }

    // 3) code page -> wait for Cloudflare success, click GET KEY
    if (!S.gotKey) {
      if ($('iframe[src*="challenges.cloudflare"]') && !S.cfNoted) {
        S.cfNoted = true;
        log('if a checkbox appears, click it once');
        status('waiting for Cloudflare check…');
      }
      const btn = byText(['GET KEY']);
      if (btn) {
        S.gotKey = true;
        await sleep(500);
        btn.click();
        log('clicked GET KEY');
        status('fetching key…');
      }
    }
  }

  /* ---------- route ---------- */
  const host = location.hostname;
  const run = () => {
    if (host.includes('sub2s.com')) return runSub2s();
    if (host.includes('authtool.app')) return runAuthtool();
    // layma / ontops / any hop
    const key = extractResult();
    if (key && !S.hopped) {
      S.hopped = true;
      status('KEY FOUND! 🎉');
      log('key: ' + key);
      copyKey(key);
      setTimeout(() => {
        location.href = 'https://authtool.app/get-key/?result=' + encodeURIComponent(key);
      }, 1000);
    } else if (!key) {
      status('hop page — waiting for redirect…');
    }
  };

  run();
  // keep re-checking every 2.5s so slow buttons / SPA renders still get caught
  setInterval(() => {
    const auto = $('#kch-auto');
    if (auto && auto.checked) run();
  }, 2500);
})();
