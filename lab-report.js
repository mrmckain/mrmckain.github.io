/* "Report a problem" button for the lab tool pages.
 * Add to a page's <head>:  <script src="/lab-report.js" data-app="Muninn"></script>
 * Reports go to the bug_reports table in the Genomic Sampling Database (Muninn's Supabase project).
 * Anyone can send one; only lab admins can read them. Uses the public (publishable) key only.
 */
(function () {
  if (window.__labReport) return;
  window.__labReport = true;
  const SUPA = "https://mzawzneyfuxlznukftua.supabase.co";
  const KEY = "sb_publishable_oRMONDQM9onsQCZCZ9EKwQ_JDGuOlKB";
  const me = document.currentScript;
  const APP = (me && me.dataset.app) || location.pathname.split("/").filter(Boolean)[0] || "mckainlab.org";

  // Remember the page's script errors, so a report says what broke as well as what it looked like
  const errors = [];
  const keep = t => { errors.push(new Date().toISOString().slice(11, 19) + " " + String(t).slice(0, 400)); if (errors.length > 8) errors.shift(); };
  window.addEventListener("error", e => keep((e.message || "Error") + (e.filename ? ` (${e.filename.split("/").pop()}:${e.lineno})` : "")));
  window.addEventListener("unhandledrejection", e => keep("Unhandled: " + (e.reason && (e.reason.message || e.reason))));

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (_) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (_) {} },
  };
  // Signed in to Muninn or Greenhouse on this site? Then the report records who sent it.
  function session() {
    try {
      const s = JSON.parse(store.get("sb-mzawzneyfuxlznukftua-auth-token") || "null");
      if (s && s.access_token && (!s.expires_at || s.expires_at * 1000 > Date.now() + 30000)) return s;
    } catch (_) {}
    return null;
  }
  // What part of the page was open: the active tab, plus any open dialog
  function section() {
    const pick = sel => { const el = document.querySelector(sel); return el ? el.innerText.replace(/[▾▴▸▼]/g, "").replace(/\s+/g, " ").trim().slice(0, 80) : ""; };
    const tab = pick('[aria-selected="true"]') || pick("nav .active") || pick(".tabs .active") || pick(".tab.active") || pick(".nav .active");
    const dlg = pick(".modal h3, .modal-head h3, dialog[open] h2, dialog[open] h3, [role=dialog] h2, [role=dialog] h3");
    return [tab && "Tab: " + tab, dlg && "Dialog: " + dlg, location.hash && "Link: " + location.hash].filter(Boolean).join(" · ").slice(0, 300);
  }

  function mount() {
    const host = document.createElement("div");
    host.id = "lab-report";
    const pageStyle = document.createElement("style");
    pageStyle.textContent = "@media print { #lab-report { display: none !important; } }";
    document.head.appendChild(pageStyle);
    document.body.appendChild(host);
    const root = host.attachShadow({ mode: "open" });
    root.innerHTML = `
      <style>
        :host { all: initial; }
        * { box-sizing: border-box; font-family: "DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
        .btn { position: fixed; left: 14px; bottom: 14px; z-index: 2147483000; display: flex; align-items: center; gap: 6px;
          padding: 7px 12px 7px 10px; border-radius: 999px; border: 1px solid #c9d2c2; background: #ffffffee; color: #2f4a2f;
          font-size: 12.5px; font-weight: 500; cursor: pointer; box-shadow: 0 2px 8px #0002; opacity: .82; }
        .btn:hover, .btn:focus-visible { opacity: 1; border-color: #00a583; outline: none; }
        .btn svg { width: 15px; height: 15px; }
        @media (max-width: 600px) { .btn .t { display: none; } .btn { padding: 8px; } }
        .bg { position: fixed; inset: 0; z-index: 2147483001; background: #0006; display: flex; align-items: center; justify-content: center; padding: 16px; }
        .box { background: #fff; color: #1d2a1d; width: 100%; max-width: 480px; border-radius: 12px; box-shadow: 0 10px 40px #0004; max-height: calc(100vh - 32px); overflow: auto; }
        .hd { display: flex; justify-content: space-between; align-items: center; padding: 16px 18px 6px; }
        h3 { margin: 0; font-size: 17px; color: #0b3d23; }
        .x { border: 0; background: none; font-size: 22px; line-height: 1; cursor: pointer; color: #667; }
        .bd { padding: 6px 18px 4px; }
        .sub { font-size: 12.5px; color: #5f6b5f; margin: 0 0 12px; }
        label { display: block; font-size: 13px; font-weight: 600; margin: 10px 0 4px; }
        label span { font-weight: 400; color: #7a857a; }
        textarea, input { width: 100%; font-size: 14px; padding: 8px 10px; border: 1px solid #c9d2c2; border-radius: 8px; color: inherit; background: #fff; }
        textarea { resize: vertical; min-height: 84px; }
        textarea:focus, input:focus { outline: 2px solid #00a58355; border-color: #00a583; }
        .ctx { font-size: 12px; color: #6b766b; background: #f4f6f1; border-radius: 8px; padding: 8px 10px; margin-top: 12px; word-break: break-word; }
        .ft { display: flex; justify-content: flex-end; gap: 8px; padding: 14px 18px 16px; }
        .ft button { font-size: 14px; padding: 8px 14px; border-radius: 8px; border: 1px solid #c9d2c2; background: #fff; cursor: pointer; }
        .ft .go { background: #00795f; border-color: #00795f; color: #fff; font-weight: 600; }
        .ft .go:disabled { opacity: .6; cursor: default; }
        .msg { font-size: 13px; margin-top: 10px; min-height: 1em; }
        .msg.err { color: #b3261e; }
        .done { padding: 26px 18px; text-align: center; font-size: 15px; }
        .done b { display: block; font-size: 17px; color: #0b3d23; margin-bottom: 6px; }
      </style>
      <button class="btn" type="button" title="Report a problem with this page" aria-label="Report a problem with this page">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2l1.9 1.9M16 2l-1.9 1.9M9 7.1V6a3 3 0 0 1 6 0v1.1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6z"/><path d="M12 20v-9M6.5 13H3M21 13h-3.5M6 9.5L3.5 8M18 9.5L20.5 8M6.4 17.5L4 19.5M17.6 17.5l2.4 2"/></svg>
        <span class="t">Report a problem</span>
      </button>`;
    root.querySelector(".btn").onclick = () => open(root);
  }

  function open(root) {
    const s = session(), where = section();
    const name = store.get("lab-report-name") || (s && s.user && s.user.email) || "";
    const wrap = document.createElement("div");
    wrap.className = "bg";
    wrap.innerHTML = `
      <div class="box" role="dialog" aria-modal="true" aria-labelledby="lr-h">
        <div class="hd"><h3 id="lr-h">Report a problem</h3><button class="x" type="button" aria-label="Close">×</button></div>
        <div class="bd">
          <p class="sub">Tell us what went wrong on this page. It goes straight to the lab admins.</p>
          <label for="lr-what">What happened? *</label>
          <textarea id="lr-what" maxlength="5000" placeholder="e.g. I clicked Save on a new population and nothing happened."></textarea>
          <label for="lr-exp">What should it do instead? <span>(optional)</span></label>
          <textarea id="lr-exp" maxlength="5000" placeholder="e.g. It should save and open the new population."></textarea>
          <label for="lr-name">Your name <span>(optional, so we can ask you about it)</span></label>
          <input id="lr-name" maxlength="120" value="" />
          <div class="ctx">Sent along with it: <b>${esc(APP)}</b>${where ? " · " + esc(where) : ""}, this page's address, your browser and screen size${errors.length ? `, and ${errors.length} error${errors.length === 1 ? "" : "s"} the page hit` : ""}.</div>
          <div class="msg" id="lr-msg"></div>
        </div>
        <div class="ft"><button type="button" class="cancel">Cancel</button><button type="button" class="go">Send report</button></div>
      </div>`;
    root.appendChild(wrap);
    wrap.querySelector("#lr-name").value = name;
    const close = () => { wrap.remove(); document.removeEventListener("keydown", onKey, true); };
    const onKey = e => { if (e.key === "Escape") { e.stopPropagation(); close(); } };
    document.addEventListener("keydown", onKey, true);
    wrap.addEventListener("click", e => { if (e.target === wrap) close(); });
    wrap.querySelector(".x").onclick = close;
    wrap.querySelector(".cancel").onclick = close;
    // Keep typing inside the form from triggering the page's own keyboard shortcuts
    ["keydown", "keyup", "keypress"].forEach(t => wrap.addEventListener(t, e => e.stopPropagation()));
    setTimeout(() => wrap.querySelector("#lr-what").focus(), 30);
    wrap.querySelector(".go").onclick = async () => {
      const what = wrap.querySelector("#lr-what").value.trim();
      const expected = wrap.querySelector("#lr-exp").value.trim();
      const who = wrap.querySelector("#lr-name").value.trim();
      const msg = wrap.querySelector("#lr-msg"), btn = wrap.querySelector(".go");
      if (what.length < 3) { msg.className = "msg err"; msg.textContent = "Please describe what happened."; return; }
      if (who) store.set("lab-report-name", who);
      btn.disabled = true; btn.textContent = "Sending…"; msg.className = "msg"; msg.textContent = "";
      const row = {
        app: APP.slice(0, 60), page_url: location.href.slice(0, 2000), page_title: (document.title || "").slice(0, 300) || null,
        section: where || null, what_happened: what.slice(0, 5000), expected: expected.slice(0, 5000) || null,
        reporter_name: who.slice(0, 120) || null, user_agent: navigator.userAgent.slice(0, 500),
        screen: `${window.innerWidth}×${window.innerHeight} @${window.devicePixelRatio || 1}x`.slice(0, 40),
        page_errors: errors.length ? errors.join("\n").slice(0, 4000) : null,
      };
      try {
        await send(row, session());
        wrap.querySelector(".box").innerHTML = `<div class="done"><b>Thanks, it's been sent.</b>The lab admins will take a look.</div>
          <div class="ft"><button type="button" class="go">Close</button></div>`;
        wrap.querySelector(".go").onclick = close;
      } catch (e) {
        btn.disabled = false; btn.textContent = "Send report";
        msg.className = "msg err"; msg.textContent = "Couldn't send it (" + e.message + "). Please try again, or tell Michael directly.";
      }
    };
  }

  async function send(row, s) {
    const post = token => fetch(SUPA + "/rest/v1/bug_reports", {
      method: "POST",
      // The publishable key goes in apikey only; a signed-in person's token adds who sent it
      headers: Object.assign({ apikey: KEY, "Content-Type": "application/json", Prefer: "return=minimal" }, token ? { Authorization: "Bearer " + token } : {}),
      body: JSON.stringify(row),
    });
    let r = await post(s && s.access_token);
    if (!r.ok && s && (r.status === 401 || r.status === 403)) r = await post(null);   // stale sign-in: send it anonymously
    if (!r.ok) throw new Error((await r.text()).slice(0, 160) || "error " + r.status);
  }
  function esc(t) { return String(t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

  if (document.body) mount(); else document.addEventListener("DOMContentLoaded", mount);
})();
