export const LANDING_PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>QB Portal API</title>
<style>
  :root { --green: #39d353; --green-dim: #1f6f3a; --bg: #0a0f0b; --ink: #e8f3ea; --muted: #6b7c6f; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; }
  body {
    font-family: ui-monospace, "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace;
    background: radial-gradient(900px 600px at 50% -10%, rgba(57,211,83,0.10), transparent 60%), var(--bg);
    color: var(--ink);
    display: grid; place-items: center; min-height: 100vh;
    -webkit-font-smoothing: antialiased;
  }
  .card { text-align: center; padding: 40px; max-width: 560px; }
  .badge {
    display: inline-flex; align-items: center; gap: 8px;
    border: 1px solid rgba(57,211,83,0.25); border-radius: 999px;
    padding: 6px 14px; font-size: 12px; letter-spacing: 0.12em;
    color: var(--green); background: rgba(57,211,83,0.06); text-transform: uppercase;
  }
  .dot {
    width: 8px; height: 8px; border-radius: 50%; background: var(--green);
    box-shadow: 0 0 0 0 rgba(57,211,83,0.7); animation: pulse 2s infinite;
  }
  @keyframes pulse {
    0% { box-shadow: 0 0 0 0 rgba(57,211,83,0.6); }
    70% { box-shadow: 0 0 0 10px rgba(57,211,83,0); }
    100% { box-shadow: 0 0 0 0 rgba(57,211,83,0); }
  }
  h1 {
    margin-top: 28px; font-size: 44px; font-weight: 700; letter-spacing: -0.02em;
    background: linear-gradient(180deg, #ffffff, #9fe6ad);
    -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
  }
  h1 span { color: var(--green); -webkit-text-fill-color: var(--green); }
  p.sub { margin-top: 12px; color: var(--muted); font-size: 14px; line-height: 1.6; }
  .links { margin-top: 32px; display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
  a.link {
    text-decoration: none; color: var(--ink); font-size: 13px;
    border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 10px 16px;
    transition: border-color .2s, color .2s, background .2s;
  }
  a.link:hover { border-color: var(--green); color: var(--green); background: rgba(57,211,83,0.05); }
  .foot { margin-top: 40px; color: var(--muted); font-size: 11px; letter-spacing: 0.08em; }
</style>
</head>
<body>
  <div class="card">
    <div class="badge"><span class="dot"></span> API Online</div>
    <h1>QB<span>.</span>Portal</h1>
    <p class="sub">QuickBooks Customer Ordering Portal &mdash; backend service.<br/>Nothing to see here. The API is running.</p>
    <div class="links">
      <a class="link" href="/health">Health</a>
      <a class="link" href="/api">API Docs</a>
    </div>
    <div class="foot">QB PORTAL BE</div>
  </div>
</body>
</html>`;
