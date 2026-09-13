<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Sub2s Key Getter</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; font-family:'Segoe UI',system-ui,sans-serif; }
  body {
    min-height:100vh; display:flex; align-items:center; justify-content:center;
    background:linear-gradient(160deg,#1a1030,#0d0819); color:#f3edff; padding:20px;
  }
  .card {
    width:100%; max-width:480px; background:linear-gradient(160deg,#241a3f,#17102a);
    border:1px solid #9d6bff; border-radius:20px; padding:32px 28px;
    box-shadow:0 0 60px rgba(124,77,255,.35); text-align:center;
  }
  h1 { font-size:22px; color:#c9b3ff; margin-bottom:6px; }
  p.sub { font-size:13px; color:#8f7fc9; margin-bottom:24px; }
  input {
    width:100%; padding:14px 16px; border-radius:12px; border:1px solid #5b3fa8;
    background:#120b24; color:#f3edff; font-size:15px; outline:none; margin-bottom:14px;
  }
  input:focus { border-color:#9d6bff; box-shadow:0 0 12px rgba(124,77,255,.4); }
  button.go {
    width:100%; padding:14px; border:0; border-radius:12px; cursor:pointer;
    background:linear-gradient(135deg,#7c4dff,#9d6bff); color:#fff;
    font-size:16px; font-weight:700; transition:transform .15s, box-shadow .15s;
  }
  button.go:hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(124,77,255,.5); }
  button.go:disabled { opacity:.5; cursor:not-allowed; transform:none; }
  .wait { display:none; margin-top:26px; }
  .spinner {
    width:46px; height:46px; margin:0 auto 14px; border-radius:50%;
    border:4px solid #3a2a66; border-top-color:#9d6bff; animation:spin 1s linear infinite;
  }
  @keyframes spin { to { transform:rotate(360deg); } }
  #status { font-size:13px; color:#b9a8e8; min-height:20px; margin-bottom:8px; }
  #log { font-size:11px; color:#6f5fae; max-height:80px; overflow:auto; text-align:left; }
  .result { display:none; margin-top:26px; }
  .keybox {
    font-family:monospace; font-size:17px; background:#120b24; border:1px solid #5b3fa8;
    border-radius:12px; padding:16px; margin:14px 0; user-select:all; word-break:break-all;
  }
  button.copy {
    padding:12px 30px; border:0; border-radius:10px; cursor:pointer;
    background:linear-gradient(135deg,#7c4dff,#9d6bff); color:#fff; font-size:15px; font-weight:600;
  }
  .note { margin-top:16px; font-size:11px; color:#6f5fae; }
</style>
</head>
<body>
  <div class="card">
    <h1>🔑 Sub2s Key Getter</h1>
    <p class="sub">Paste your sub2s link — everything else is automatic</p>

    <div id="inputArea">
      <input id="link" type="text" placeholder="https://api.sub2s.com/l/xxxxxxxx" spellcheck="false">
      <button class="go" id="startBtn">GET MY KEY ⚡</button>
    </div>

    <div class="wait" id="waitArea">
      <div class="spinner"></div>
      <div id="status">Starting…</div>
      <div id="log"></div>
    </div>

    <div class="result" id="resultArea">
      <div style="font-size:26px">🎉</div>
      <h1 style="margin-top:6px">Your Key</h1>
      <div class="keybox" id="keyBox"></div>
      <button class="copy" id="copyBtn">📋 COPY KEY</button>
    </div>

    <div class="note">Keep the opened tab visible — if Cloudflare asks, click its checkbox once there. Requires the Sub2s Helper v3.2 userscript.</div>
  </div>

<script>
  const linkInput = document.getElementById('link');
  const startBtn  = document.getElementById('startBtn');
  const statusEl  = document.getElementById('status');
  const logEl     = document.getElementById('log');
  let currentKey  = null;

  function setStatus(m){ statusEl.textContent = m; }
  function addLog(m){
    const d = document.createElement('div');
    d.textContent = '• ' + m;
    logEl.prepend(d);
  }

  startBtn.addEventListener('click', () => {
    let url = linkInput.value.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    if (!/sub2s\.com\/l\//i.test(url)) { setStatus('That does not look like a sub2s /l/ link'); return; }

    document.getElementById('inputArea').style.display = 'none';
    document.getElementById('waitArea').style.display = 'block';
    setStatus('Opening link…');

    // open the chain in a silent tab — user gesture, so popup blockers allow it
    const w = window.open(url + '#kch-silent', '_blank');
    if (!w) { setStatus('⚠️ Popup blocked — allow popups for this page and try again'); return; }

    // give up politely after 4 minutes
    setTimeout(() => {
      if (!currentKey) setStatus('Still working… check the other tab, it may need one Cloudflare click');
    }, 120000);
  });

  // receive progress + the final key from the helper tab
  window.addEventListener('message', (e) => {
    const d = e.data || {};
    if (d.type === 'kch-status' && d.msg) { setStatus(d.msg); addLog(d.msg); }
    if (d.type === 'kch-key' && d.key && !currentKey) {
      currentKey = d.key;
      document.getElementById('waitArea').style.display = 'none';
      document.getElementById('resultArea').style.display = 'block';
      document.getElementById('keyBox').textContent = d.key;
    }
  });

  document.getElementById('copyBtn').addEventListener('click', function(){
    navigator.clipboard.writeText(currentKey).then(() => { this.textContent = '✅ COPIED'; });
  });
</script>
</body>
</html>
