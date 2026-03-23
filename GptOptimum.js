// ==UserScript==
// @name         GPT Optimum
// @namespace    https://github.com/YashRana738/GptOptimum
// @version      2.1
// @description  Improves ChatGPT performance by virtualizing off-screen messages.
// @author       Yash Rana
// @license      MIT
// @homepageURL  https://github.com/YashRana738/GptOptimum
// @supportURL   https://github.com/YashRana738/GptOptimum/issues
// @match        *://chatgpt.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';

  // ── Helpers ──────────────────────────────────────────────────
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => root.querySelectorAll(s);
  const isChatRoute = () => location.pathname.startsWith('/c/');
  const getChatId = () => {
    const m = location.pathname.match(/^\/c\/([a-f0-9-]+)/);
    return m ? m[1] : null;
  };

  // ── Settings (GM storage) ───────────────────────────────────
  const DEFAULTS = { enabled: true, debug: false, aggressive: false, instantNewChat: true };

  const cfg = {
    get(k) { return GM_getValue(k, DEFAULTS[k]); },
    set(k, v) { GM_setValue(k, v); },
    all() { return { enabled: this.get('enabled'), debug: this.get('debug'), aggressive: this.get('aggressive'), instantNewChat: this.get('instantNewChat') }; },
  };

  // ── Early UI lock (document-start) ──────────────────────────
  if (cfg.get('enabled') && isChatRoute()) {
    const bootId = getChatId();
    const storedBootId = cfg.get('lastChatId');
    const isNewChat = bootId && storedBootId && storedBootId < bootId && cfg.get('instantNewChat');
    if (!isNewChat) {
      document.documentElement.classList.add('cgv-loading');
    }
    if (bootId && (!storedBootId || bootId > storedBootId)) cfg.set('lastChatId', bootId);
  }

  // ── CSS ─────────────────────────────────────────────────────
  GM_addStyle(`
    /* === Theme tokens === */
    :root{--cgv-bg:#fff;--cgv-text:#0d0d0d;--cgv-muted:#666;--cgv-border:#e5e5e5;--cgv-shadow:0 4px 6px -1px rgb(0 0 0/.1);--cgv-primary:#10a37f}
    html.dark,:root{--cgv-bg:#fff;--cgv-text:#0d0d0d;--cgv-muted:#666;--cgv-border:#e5e5e5}
    html.dark{--cgv-bg:#2f2f2f;--cgv-text:#ececec;--cgv-muted:#b4b4b4;--cgv-border:#424242;--cgv-shadow:0 4px 6px -1px rgb(0 0 0/.5)}
    @media(prefers-color-scheme:dark){html:not(.light){--cgv-bg:#2f2f2f;--cgv-text:#ececec;--cgv-muted:#b4b4b4;--cgv-border:#424242;--cgv-shadow:0 4px 6px -1px rgb(0 0 0/.5)}}

    /* === Loading lock === */
    html.cgv-loading body{pointer-events:none!important;user-select:none!important;cursor:wait!important}

    /* === Virtualization === */
    .cgv-off{content-visibility:hidden}
    .cgv-msg{transition:opacity .1s ease-in-out}

    /* === Debug overlay === */
    body.cgv-debug .cgv-off{background:rgba(255,0,0,.1)!important;border:1px dashed red!important;position:relative}
    body.cgv-debug .cgv-off::after{content:"Unloaded";position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:red;font-weight:700;font-size:14px;pointer-events:none}

    /* === Wrapper (holds pill + popup) === */
    .cgv-wrap{position:fixed;bottom:24px;right:24px;z-index:999999;display:flex;flex-direction:column;align-items:flex-end;pointer-events:auto}

    /* === Indicator pill === */
    .cgv-pill{
      display:flex;align-items:center;
      background:var(--cgv-bg);color:var(--cgv-text);
      border:1px solid var(--cgv-border);box-shadow:var(--cgv-shadow);
      padding:8px 14px;border-radius:20px;
      font:500 13px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
      cursor:pointer;white-space:nowrap;box-sizing:border-box;
      opacity:0;transform:translateY(10px);
      gap:8px;max-width:220px;
      transition:opacity .25s ease,
        transform .4s cubic-bezier(.34,1.56,.64,1),
        max-width .4s cubic-bezier(.4,0,.2,1),
        padding .4s cubic-bezier(.4,0,.2,1),
        height .4s cubic-bezier(.4,0,.2,1),
        border-radius .4s cubic-bezier(.4,0,.2,1),
        border-color .25s,
        gap .4s cubic-bezier(.4,0,.2,1);
      height:34px;overflow:hidden;
    }
    .cgv-pill.on{opacity:1;transform:translateY(0)}

    /* Collapsed — max-width 220→30 is fully animatable, padding fills the circle */
    .cgv-pill.mini{
      max-width:30px;
      padding:10px;
      border-radius:50%;
      gap:0;
      height:30px;
    }
    .cgv-pill.mini .cgv-dot{margin:0}

    /* Expand pill on hover even when collapsed */
    .cgv-wrap:hover .cgv-pill.mini{max-width:220px;padding:8px 14px;border-radius:20px;height:34px;gap:8px}
    .cgv-wrap:hover .cgv-pill.mini .cgv-label{max-width:150px}

    /* Dot */
    .cgv-dot{
      width:8px;height:8px;min-width:8px;min-height:8px;
      border-radius:50%;flex-shrink:0;position:relative;z-index:2;
      background:var(--cgv-primary);box-shadow:0 0 6px var(--cgv-primary);
      animation:cgv-pulse 2s infinite;
      transition:background .25s,box-shadow .25s,border .25s;
    }
    /* Label — max-width clips text smoothly, NO opacity change so it slides not fades */
    .cgv-label{
      display:inline-block;overflow:hidden;
      max-width:150px;
      transition:max-width .4s cubic-bezier(.4,0,.2,1);
    }
    .cgv-pill.mini .cgv-label{max-width:0}

    /* States */
    .cgv-pill.busy{border-color:var(--cgv-primary);opacity:1!important}
    .cgv-pill.busy .cgv-dot{animation:cgv-spin .8s linear infinite;background:0 0;border:2px solid var(--cgv-primary);border-top-color:transparent;width:10px;height:10px;box-shadow:none}

    /* Disabled state — red dot */
    .cgv-pill.dead{border-color:#ef4444}
    .cgv-pill.dead .cgv-dot{background:#ef4444;box-shadow:0 0 6px #ef4444;animation:none}

    @keyframes cgv-spin{to{transform:rotate(360deg)}}
    @keyframes cgv-pulse{0%,100%{opacity:.5}50%{opacity:1}}

    /* === Blocker banner === */
    .cgv-block{
      position:fixed;bottom:24px;right:24px;
      background:#ef4444;color:#fff;padding:10px 18px;border-radius:25px;
      font:600 13px -apple-system,sans-serif;
      box-shadow:0 10px 25px -5px rgba(239,68,68,.4);
      z-index:1000000;display:flex;align-items:center;gap:8px;
      transform:translateY(120px);opacity:0;
      transition:transform .6s cubic-bezier(.68,-.6,.32,1.6),opacity .35s;
    }
    .cgv-block.on{transform:translateY(0);opacity:1}
    .cgv-block svg{width:16px;height:16px;stroke:currentColor;stroke-width:2.5;fill:none}
    .cgv-pill.pushed{transform:translateY(-64px)!important}

    /* === Popup panel === */
    .cgv-panel{
      position:absolute;bottom:calc(100% + 14px);right:0;width:290px;
      background:var(--cgv-bg);color:var(--cgv-text);
      border:1px solid var(--cgv-border);border-radius:18px;
      box-shadow:0 8px 28px rgba(0,0,0,.16);
      font-family:'Inter',-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
      opacity:0;transform:translateY(6px) scale(.97);pointer-events:none;
      transition:opacity .18s,transform .22s cubic-bezier(.34,1.56,.64,1);
      z-index:1000001;overflow:visible;
    }
    /* Hover bridge */
    .cgv-panel::after{content:"";position:absolute;top:100%;left:0;right:0;height:22px}
    .cgv-wrap:hover .cgv-panel{opacity:1;transform:translateY(0) scale(1);pointer-events:auto}

    .cgv-ph{padding:18px 16px 8px;text-align:center}
    .cgv-ph h3{margin:0;font-size:15px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:8px}
    .cgv-ph p{margin:3px 0 0;font-size:11px;color:var(--cgv-muted)}
    .cgv-ph .cgv-hd{width:9px;height:9px;background:var(--cgv-primary);border-radius:50%;box-shadow:0 0 6px var(--cgv-primary);flex-shrink:0}

    .cgv-pc{padding:8px 16px 16px}

    /* Loading overlay inside panel */
    .cgv-loading-msg{
      display:none;padding:28px 16px;text-align:center;
      font-size:13px;font-weight:500;color:var(--cgv-muted);
    }
    .cgv-loading-msg .cgv-lspin{
      display:inline-block;width:18px;height:18px;border:2px solid var(--cgv-border);
      border-top-color:var(--cgv-primary);border-radius:50%;
      animation:cgv-spin .7s linear infinite;margin-bottom:10px;
    }
    .cgv-panel.loading .cgv-pc{display:none}
    .cgv-panel.loading .cgv-loading-msg{display:block}

    /* Card */
    .cgv-card{
      background:var(--cgv-bg);border:1px solid var(--cgv-border);border-radius:14px;
      padding:12px 14px;margin-bottom:8px;
      display:flex;align-items:center;justify-content:space-between;
      box-shadow:0 1px 3px rgba(0,0,0,.05);cursor:pointer;
      transition:border-color .2s,transform .15s;
    }
    .cgv-card:last-child{margin-bottom:0}
    .cgv-card:hover{border-color:var(--cgv-primary);transform:translateY(-1px)}
    .cgv-card.off{opacity:.45;pointer-events:none;filter:grayscale(.5)}
    .cgv-card.main{border-color:var(--cgv-primary);margin-bottom:14px}
    .cgv-ci{display:flex;flex-direction:column;gap:1px}
    .cgv-cl{font-size:13px;font-weight:500}
    .cgv-cd{font-size:10.5px;color:var(--cgv-muted)}

    /* Toggle switch */
    .cgv-sw{position:relative;display:inline-block;width:34px;height:19px;flex-shrink:0}
    .cgv-sw input{opacity:0;width:0;height:0}
    .cgv-sl{
      position:absolute;cursor:pointer;inset:0;
      background:var(--cgv-border);border-radius:19px;
      transition:.25s cubic-bezier(.4,0,.2,1);
    }
    .cgv-sl::before{
      content:"";position:absolute;width:13px;height:13px;left:3px;bottom:3px;
      background:#fff;border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,.2);
      transition:.25s cubic-bezier(.4,0,.2,1);
    }
    .cgv-sw input:checked+.cgv-sl{background:var(--cgv-primary)}
    .cgv-sw input:checked+.cgv-sl::before{transform:translateX(15px)}

    .cgv-ft{padding:0 16px 12px;text-align:center;font-size:10px;color:var(--cgv-muted);opacity:.5}
  `);

  // ── Virtualizer ─────────────────────────────────────────────
  class Virtualizer {
    constructor() {
      this.enabled = false;
      this.aggressive = false;
      this.io = null;
    }

    boot(enabled, aggressive) {
      this.enabled = enabled;
      this.aggressive = aggressive;
      if (enabled) this._createObserver();
    }

    _margin() { return this.aggressive ? '5% 0px' : '100% 0px'; }

    _createObserver() {
      this.io?.disconnect();
      this.io = new IntersectionObserver(entries => {
        if (!this.enabled) return;
        for (const e of entries) {
          if (e.isIntersecting) this._restore(e.target);
          else this._unload(e.target);
        }
      }, { rootMargin: this._margin(), threshold: 0 });
      $$('.cgv-msg').forEach(el => this.io.observe(el));
    }

    setEnabled(v) {
      this.enabled = v;
      if (v) this._createObserver();
      else { this.io?.disconnect(); $$('.cgv-off').forEach(el => this._restore(el)); }
    }

    setAggressive(v) {
      const changed = this.aggressive !== v;
      this.aggressive = v;
      if (changed && this.enabled) this._createObserver();
    }

    setDebug(v) {
      document.body?.classList.toggle('cgv-debug', v);
    }

    observe(el) { this.io?.observe(el); }

    _unload(el) {
      if (el.classList.contains('cgv-off')) return;
      const h = Math.round(el.getBoundingClientRect().height);
      if (h < 60) return;
      el.style.containIntrinsicSize = `auto ${h}px`;
      el.classList.add('cgv-off');
    }
    _restore(el) {
      if (!el.classList.contains('cgv-off')) return;
      el.classList.remove('cgv-off');
      el.style.containIntrinsicSize = '';
    }
  }

  const virt = new Virtualizer();

  // ── Selectors ───────────────────────────────────────────────
  const MSG_SEL = '[data-message-author-role],article,[data-testid^="conversation-turn-"]';

  // ── App ─────────────────────────────────────────────────────
  class App {
    constructor() {
      this.tracked = new Set();
      this.pill = null;
      this.wrap = null;
      this.blocker = null;
      this.panel = null;
      this.busy = isChatRoute();
      this.lastUrl = location.href;
      this.collapseTimer = null;
      this.statusLock = false;
    }

    async run() {
      await this._waitBody();
      const s = cfg.all();

      virt.boot(s.enabled, s.aggressive);
      virt.setDebug(s.debug);

      this._buildUI(s);
      this._observe();
      this._watchUrl();

      if (s.enabled && this.busy) this._optimise();
      else { this.busy = false; this._unlock(); this._sync(s.enabled); }
    }

    // ── Input blocker during optimisation ──────────────────────
    _blockInputs() {
      const handler = e => {
        if (!this.busy || !virt.enabled) return;
        // Never block events inside our UI wrapper
        if (this.wrap?.contains(e.target)) return;
        e.stopImmediatePropagation();
        e.preventDefault();
      };
      for (const t of ['keydown', 'keyup', 'keypress', 'contextmenu', 'mousedown', 'click', 'dblclick', 'auxclick'])
        window.addEventListener(t, handler, true);
    }

    // ── URL change detection (SPA) ────────────────────────────
    _watchUrl() {
      setInterval(() => {
        if (location.href === this.lastUrl) return;
        const prevUrl = this.lastUrl;
        this.lastUrl = location.href;
        // Was the previous page the homepage (not a /c/ chat route)?
        const cameFromHome = !prevUrl.includes('/c/');

        if (isChatRoute() && virt.enabled) {
          const newId = getChatId();

          // ── Instant optimise new chats ──
          if (newId) {
            const storedId = cfg.get('lastChatId');
            if (!storedId || newId > storedId) {
              cfg.set('lastChatId', newId);
            }
            if (cfg.get('instantNewChat') && cameFromHome && storedId && storedId < newId) {
              this.tracked.clear();
              this.busy = false;
              this._unlock();
              this.pill?.classList.remove('pushed');
              this.blocker?.classList.remove('on');
              this.panel?.classList.remove('loading');
              const lbl = $('.cgv-label', this.pill);
              if (lbl) lbl.textContent = 'New chat detected';
              this.statusLock = true;
              this.pill?.classList.remove('busy', 'dead', 'mini');
              this.pill?.classList.add('on');
              this._scheduleCollapse(3000);
              this._observeNewChat();
              return;
            }
          }

          this.tracked.clear();
          this.busy = true;
          document.documentElement.classList.add('cgv-loading');
          this._showBusy();
          setTimeout(() => { if (this.busy) { this.pill?.classList.add('pushed'); this.blocker?.classList.add('on'); } }, 400);
          this._optimise(true);
        } else {
          this.busy = false;
          this._unlock();
          this._sync(virt.enabled);
          this.pill?.classList.remove('pushed');
          this.blocker?.classList.remove('on');
        }
      }, 500);
    }

    // ── Wait for <body> ───────────────────────────────────────
    _waitBody() {
      return new Promise(r => {
        if (document.body) return r();
        new MutationObserver((_, o) => { if (document.body) { o.disconnect(); r(); } })
          .observe(document.documentElement, { childList: true });
      });
    }

    // ── Build all UI elements ─────────────────────────────────
    _buildUI(s) {
      // Wrapper
      this.wrap = document.createElement('div');
      this.wrap.className = 'cgv-wrap';

      // Pill
      this.pill = document.createElement('div');
      this.pill.className = 'cgv-pill';
      this.pill.innerHTML = '<div class="cgv-dot"></div><span class="cgv-label">Optimised</span>';
      this.pill.addEventListener('click', () => {
        if (this.busy) return;
        this.pill.classList.toggle('mini');
        if (this.pill.classList.contains('mini')) { clearTimeout(this.collapseTimer); }
        else this._scheduleCollapse();
      });

      // Blocker
      this.blocker = document.createElement('div');
      this.blocker.className = 'cgv-block';
      this.blocker.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg><span>Input temporarily blocked</span>';

      // Panel
      this.panel = this._buildPanel(s);

      // Initial state
      if (this.busy && s.enabled) {
        this._showBusy();
        setTimeout(() => { if (this.busy) { this.pill.classList.add('pushed'); this.blocker.classList.add('on'); } }, 400);
      }

      this.wrap.append(this.panel, this.pill);
      document.body.append(this.wrap, this.blocker);
      this._blockInputs();
    }

    // ── Build settings panel ──────────────────────────────────
    _buildPanel(s) {
      const el = document.createElement('div');
      el.className = 'cgv-panel' + (this.busy ? ' loading' : '');
      el.innerHTML = `
        <div class="cgv-ph"><h3><div class="cgv-hd"></div>GPT Optimum</h3><p>Optimize ChatGPT Performance</p></div>
        <div class="cgv-loading-msg"><div class="cgv-lspin"></div><br>Please wait for chat to load</div>
        <div class="cgv-pc">
          ${this._card('enabled', 'Enable Optimise', 'Unload off-screen items', s.enabled, 'main')}
          ${this._card('instantNewChat', 'Instant New Chats', 'Skip optimisation on new chats', s.instantNewChat, 'dep')}
          ${this._card('aggressive', 'Aggressive Mode', 'Tighter margins, more unloading', s.aggressive, 'dep')}
          ${this._card('debug', 'Debug Mode', 'Highlight unloaded elements', s.debug, 'dep')}
        </div>
        <div class="cgv-ft"><a href="https://github.com/YashRana738/GptOptimum" target="_blank" style="color:inherit;text-decoration:none;opacity:0.7">v2.1 by Yash Rana</a></div>`;

      // Wire toggles
      const enabledTgl = $('[data-key="enabled"] input', el);
      const instantTgl = $('[data-key="instantNewChat"] input', el);
      const aggrTgl = $('[data-key="aggressive"] input', el);
      const debugTgl = $('[data-key="debug"] input', el);
      const deps = $$('.dep', el);

      const syncDeps = () => deps.forEach(c => c.classList.toggle('off', !enabledTgl.checked));
      syncDeps();

      enabledTgl.addEventListener('change', () => {
        const on = enabledTgl.checked;
        cfg.set('enabled', on);
        virt.setEnabled(on);
        syncDeps();
        if (on && isChatRoute()) {
          this.busy = true;
          this.tracked.clear();
          this.scanMessages();
          this._optimise();
        } else if (!on) {
          this.busy = false;
          this._unlock();
        }
        this._sync(on);
      });

      instantTgl.addEventListener('change', () => {
        cfg.set('instantNewChat', instantTgl.checked);
      });

      aggrTgl.addEventListener('change', () => {
        cfg.set('aggressive', aggrTgl.checked);
        virt.setAggressive(aggrTgl.checked);
      });

      debugTgl.addEventListener('change', () => {
        cfg.set('debug', debugTgl.checked);
        virt.setDebug(debugTgl.checked);
      });

      // Card click → toggle
      $$('.cgv-card', el).forEach(card => {
        card.addEventListener('click', e => {
          if (e.target.tagName === 'INPUT' || e.target.classList.contains('cgv-sl')) return;
          if (card.classList.contains('off')) return;
          const inp = $('input', card);
          inp.checked = !inp.checked;
          inp.dispatchEvent(new Event('change'));
        });
      });

      return el;
    }

    _card(key, label, desc, checked, cls) {
      return `<div class="cgv-card ${cls}" data-key="${key}"><div class="cgv-ci"><span class="cgv-cl">${label}</span><span class="cgv-cd">${desc}</span></div><label class="cgv-sw"><input type="checkbox"${checked ? ' checked' : ''}><span class="cgv-sl"></span></label></div>`;
    }

    // ── Indicator state management ────────────────────────────
    _sync(enabled) {
      if (!this.pill) return;
      const lbl = $('.cgv-label', this.pill);

      this.pill.classList.remove('busy', 'dead', 'mini', 'pushed');
      clearTimeout(this.collapseTimer);
      this.blocker?.classList.remove('on');

      // Update panel loading state
      this.panel?.classList.toggle('loading', this.busy);

      if (this.busy && virt.enabled) {
        lbl.textContent = 'Optimising';
        this.pill.classList.add('busy', 'on');
        return;
      }

      // Always show the pill — green when enabled, red dot when disabled
      this.pill.classList.add('on');
      if (enabled) {
        if (!this.statusLock) lbl.textContent = 'Optimised';
        this._scheduleCollapse();
      } else {
        if (!this.statusLock) lbl.textContent = 'Disabled';
        this.pill.classList.add('dead');
        // Collapse to compact dot when disabled
        this._scheduleCollapse(800);
      }
    }

    _showBusy() {
      if (!this.pill) return;
      const lbl = $('.cgv-label', this.pill);
      lbl.textContent = 'Optimising';
      this.pill.classList.remove('mini', 'dead');
      this.pill.classList.add('busy', 'on');
      this.panel?.classList.add('loading');
    }

    _scheduleCollapse(delay = 4000) {
      clearTimeout(this.collapseTimer);
      this.collapseTimer = setTimeout(() => {
        this.statusLock = false;
        if (!this.busy && this.pill) this.pill.classList.add('mini');
      }, delay);
    }

    // ── Optimisation cycle ────────────────────────────────────
    _optimise(requireClear = false) {
      let ticks = 0, cleared = !requireClear;
      const iv = setInterval(() => {
        ticks++;
        const msgs = $$(MSG_SEL);
        if (requireClear && !cleared) {
          if (msgs.length === 0 || ticks > 50) { cleared = true; ticks = 0; }
          return;
        }
        if (msgs.length > 0 || ticks > 600) {
          clearInterval(iv);
          if (msgs.length > 0) this.scanMessages();
          setTimeout(() => {
            this.busy = false;
            this.pill?.classList.remove('pushed');
            this.blocker?.classList.remove('on');
            this.panel?.classList.remove('loading');
            this._unlock();
            this._sync(virt.enabled);
          }, 400);
        }
      }, 100);
    }

    // ── Background observer for new chats (no blocking) ──────
    _observeNewChat() {
      let ticks = 0;
      const iv = setInterval(() => {
        ticks++;
        const msgs = $$(MSG_SEL);
        if (msgs.length > 0) {
          clearInterval(iv);
          this.scanMessages();
          this._sync(virt.enabled);
        }
        if (ticks > 300) clearInterval(iv); // 30s timeout
      }, 100);
    }

    _unlock() {
      document.documentElement.classList.remove('cgv-loading');
    }

    // ── Message tracking ──────────────────────────────────────
    scanMessages() { $$(MSG_SEL).forEach(m => this._track(m)); }

    _track(el) {
      if (this.tracked.has(el)) return;
      this.tracked.add(el);
      el.classList.add('cgv-msg');
      virt.observe(el);
    }

    _observe() {
      new MutationObserver(muts => {
        for (const m of muts) {
          if (m.type !== 'childList') continue;
          for (const n of m.addedNodes) {
            if (n.nodeType !== 1) continue;
            if (n.matches?.(MSG_SEL)) this._track(n);
            $$(MSG_SEL, n).forEach(c => this._track(c));
          }
        }
      }).observe(document.body, { childList: true, subtree: true });
    }
  }

  new App().run();
})();
