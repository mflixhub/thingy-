// ==UserScript==
// @name         Sub2s Auto-Bypass + Key Grabber v3.3
// @version      3.3
// @description  authtool code -> Cloudflare -> GET KEY -> OPEN LINK -> sub2s -> key
// @match        https://authtool.app/*
// @match        https://api.sub2s.com/*
// @match        https://*.sub2s.com/*
// @match        https://*.layma.net/*
// @match        https://layma.net/*
// @match        https://ontops.link/*
// @match        https://*.ontops.link/*
// @match        *://*/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';
  if (window.__sub2sV33) return;
  window.__sub2sV33 = true;
  const S = window.__kchState = window.__kchState || {};
  const CHAIN = /sub2s\.com|layma\.net|ontops\.link|authtool\.app/;

  /* kill ad popups opened by the chain */
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

  const LINK_RE  = /(?:https?:\/\/)?(?:api\.)?sub2s\.com\/l\/([a-z0-9]+)/i;
  const CODE_RE  = /[?&]code=([a-f0-9-]{20,})/i;

  function findChainLink() {
    const parts = [];
    $$('a').forEach(a => { parts.push(a.href); parts.push(a.textContent); });
    $$('input, textarea').forEach(i => parts.push(i.value));
    if (document.body) parts.push(document.body.innerText);
    for (const p of parts) {
      const m = p && LINK_RE.exec(p);
      if (m) return 'https://api.sub2s.com/l/' + m[1];
    }
    return null;
  }

  function extractResult() {
    let h = location.href;
    try { h = decodeURIComponent(decodeURIComponent(h)); } catch (e) {}
    const m = h.match(/[?&]result=([^&#\s]+)/);
    return m ? m[1] : null;
  }

  /* ---------- purple panel ---------- */
  const panel = document.createElement('div');
  panel.style.cssText = 'position:fixed;bottom:16px;right:16px;z-index:2147483647;width:272px;background:linear-gradient(160deg,#241a3f,#17102a);border:1px solid #9d6bff;border-radius:14px;padding:12px;font:13px/1.4 system-ui;color:#f3edff;box-shadow:0 6px 24px rgba(124,77,255,.45)';
  panel.innerHTML = `
    <div style="font-weight:700;margin-bottom:6px;color:#c9b3ff">🔑 Sub2s Helper v3.3</div>
    <div id="kch-status" style="color:#b9a8e8;margin-bottom:8px">starting…</div>
    <div id="kch-logs" style="max-height:110px;overflow:auto;font-size:11px;color:#8f7fc9;margin-bottom:8px"></div>
    <label style="display:flex;gap:6px;align-items:center;font-size:12px;cursor:pointer">
      <input type="checkbox" id="kch-auto" checked> auto-run
    </label>`;
  document.documentElement.appendChild(panel);
  const status = m => { const el = $('#kch-status'); if (el) el.textContent = m; };
  const log = m => { const el = $('#kch-logs'); if (!el) return;
    const d = document.createElement('div'); d.textContent = '• ' + m; el.prepend(d); };

  /* ---------- start box: paste code / full link ---------- */
  function showStartBox() {
    if ($('#kch-startbox')) return;
    const box = document.createElement('div');
    box.id = 'kch-startbox';
    box.style.cssText = 'position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:2147483647;width:min(92vw,460px);background:linear-gradient(160deg,#2a1d4d,#160f2b);border:2px solid #9d6bff;border-radius:16px;padding:20px;box-shadow:0 0 50px rgba(124,77,255,.5);text-align:center;font-family:system-ui';
    box.innerHTML = `
      <div style="color:#f3edff;font-weight:700;font-size:16px;margin-bottom:4px">🔑 Paste your code or link</div>
      <div style="color:#8f7fc9;font-size:12px;margin-bottom:12px">e.g. ed41310cc-d7dd-4dbe-b4c8-80bc6db06ed7 or the full authtool.app/get-key/?code=… link</div>
      <input id="kch-codein" type="text" placeholder="code or link…" spellcheck="false"
        style="width:100%;padding:12px 14px;border-radius:10px;border:1px solid #5b3fa8;background:#120b24;color:#f3edff;font-size:14px;outline:none;box-sizing:border-box">
      <button id="kch-gogo" style="margin-top:12px;width:100%;padding:12px;border:0;border-radius:10px;cursor:pointer;background:linear-gradient(135deg,#7c4dff,#9d6bff);color:#fff;font-size:15px;font-weight:700">GO ⚡</button>`;
    document.body.appendChild(box);
    const input = box.querySelector('#kch-codein');
    const go = () => {
      const raw = input.value.trim();
      if (!raw) return;
      let code = null;
      const m1 = CODE_RE.exec(raw);
      const m2 = raw.match(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i);
      if (m1) code = m1[1]; else if (m2) code = raw;
      if (!code) { input.style.borderColor = '#ff5b7f'; return; }
      box.remove();
      log('starting with code ' + code);
      status('going to code page…');
      location.href = 'https://authtool.app/get-key/?code=' + encodeURIComponent(code);
    };
    box.querySelector('#kch-gogo').addEventListener('click', go);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    input.focus();
  }

  /* ---------- final key banner ---------- */
  function showKeyBanner(key) {
    if (S.bannerShown) return; S.bannerShown = true;
    try { navigator.clipboard.writeText(key); log('copied to clipboard'); } catch (e) {}
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
      navigator.clipboard.writeText(key).then(() => { b.querySelector('#kch-copy').textContent = '✅ COPIED'; });
    };
  }

  /* ---------- authtool steps ---------- */
  async function runAuthtool() {
    const key = extractResult();
    if (key) {                        // 🏁 final key page
      status('✅ KEY READY');
      showKeyBanner(key);
      return;
    }
    if (!CODE_RE.test(location.href)) {   // no code, no result -> show start box
      status('paste your code above 👆');
      showStartBox();
      return;
    }
    // code page: wait for Cloudflare, then GET KEY
    if (!S.gotKey) {
      if ($('iframe[src*="challenges.cloudflare"]') && !S.cfNoted) {
        S.cfNoted = true;
        status('⚠️ click the Cloudflare checkbox ONCE if it appears');
        log('waiting for Cloudflare…');
      }
      const btn = byText(['GET KEY']);
      if (btn) {
        S.gotKey = true;
        await sleep(500);
        btn.click();
        log('clicked GET KEY');
        status('getting key link…');
      }
      return;
    }
    // after GET KEY: key-link page -> grab /l/ link and go (same tab — no popup block)
    if (!S.openedLink) {
      const url = findChainLink();
      if (url) {
        S.openedLink = true;
        log('found key link: ' + url);
        status('opening key link…');
        setTimeout(() => { location.href = url; }, 600);
      }
    }
  }

  /* ---------- sub2s steps ---------- */
  async function runSub2s() {
    if (!S.started) {
      const start = byText(['BẮT ĐẦU VƯỢT LINK', 'BẮT ĐẦU', 'GET LINK']);
      if (start) {
        S.started = true;
        log('clicked BẮT ĐẦU VƯỆT LINK');
        status('starting bypass…');
        await sleep(600);
        start.click();
        return;
      }
    }
    if (!S.robotClicked) {
      const robot = $$('img').find(im => /lock\.png/i.test(im.src) && !/unlock/i.test(im.src));
      if (robot) {
        S.robotClicked = true;
        log('clicked robot check');
        robot.click();
      }
    }
    if ($('iframe[src*="challenges.cloudflare"]') && !S.cfNoted) {
      S.cfNoted = true;
      status('⚠️ click the Cloudflare checkbox ONCE if it asks');
    }
    if (!S.continued) {
      const go = byText(['TIẾP TỤC', 'CONTINUE']);
      if (go) {
        S.continued = true;
        await sleep(700);
        go.click();
        log('pressed CONTINUE');
        status('redirecting…');
      }
    }
  }

  /* ---------- route ---------- */
  const host = location.hostname;
  const run = () => {
    if (host.includes('authtool.app')) return runAuthtool();
    if (host.includes('sub2s.com'))    return runSub2s();
    const key = extractResult();       // layma / ontops hops
    if (key && !S.hopped) {
      S.hopped = true;
      log('got key from hop — going to key page');
      status('almost there…');
      setTimeout(() => {
        location.href = 'https://authtool.app/get-key/?result=' + encodeURIComponent(key);
      }, 800);
    } else if (!key && !S.hopNoted) {
      S.hopNoted = true;
      status('passing through ' + host + '…');
    }
  };

  run();
  setInterval(() => {
    const auto = $('#kch-auto');
    if (auto && auto.checked) run();
  }, 2500);
})();
