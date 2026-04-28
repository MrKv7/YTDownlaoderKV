/**
 * ================================================================
 *   K TEC SOLUTIONS — YT Downloader v3.0 | app.js
 * ================================================================
 */

'use strict';

/* ──────────────────────────────────────────────────────────────
   STATE
────────────────────────────────────────────────────────────── */
const State = {
  video:      null,
  rawUrl:     '',
  liveCount:  312,
  alertTimer: null,
};

/* ──────────────────────────────────────────────────────────────
   BOOT
────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  Canvas.init();
  Clock.init();
  ScrollFx.init();
  Counters.init();
  LiveUsers.init();
  Health.ping();
  Reveal.init();
  Nav.init();
  UI.wireInput();
  UI.setYear();
  console.log(
    '%c K Tec Solutions — YT Downloader v3.0 ',
    'background:#ff0000;color:#fff;font-weight:900;font-size:13px;padding:4px 12px;border-radius:4px'
  );
});

/* ──────────────────────────────────────────────────────────────
   CANVAS PARTICLES
────────────────────────────────────────────────────────────── */
const Canvas = {
  el:   null,
  ctx:  null,
  pts:  [],

  init() {
    this.el  = document.getElementById('bgCanvas');
    if (!this.el) return;
    this.ctx = this.el.getContext('2d');
    this.resize();
    this.seed();
    this.draw();
    window.addEventListener('resize', () => { this.resize(); this.seed(); }, { passive: true });
  },

  resize() {
    this.el.width  = window.innerWidth;
    this.el.height = window.innerHeight;
  },

  seed() {
    this.pts = [];
    const n = Math.min(50, Math.floor(window.innerWidth * window.innerHeight / 26000));
    const c = ['#ff0000','#ff3333','#ff6666','#ff9999','#cc0000'];
    for (let i = 0; i < n; i++) {
      this.pts.push({
        x:     Math.random() * this.el.width,
        y:     Math.random() * this.el.height,
        r:     Math.random() * 2 + 0.8,
        col:   c[i % c.length],
        vx:    (Math.random() - 0.5) * 0.3,
        vy:    -(Math.random() * 0.45 + 0.15),
        alpha: Math.random() * 0.4 + 0.08,
      });
    }
  },

  draw() {
    const { ctx, el, pts } = this;
    ctx.clearRect(0, 0, el.width, el.height);
    for (const p of pts) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle   = p.col;
      ctx.shadowBlur  = 8;
      ctx.shadowColor = p.col;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      p.x += p.vx;
      p.y += p.vy;
      if (p.y < -10)             p.y  = el.height + 10;
      if (p.x < -10)             p.x  = el.width  + 10;
      if (p.x > el.width  + 10)  p.x  = -10;
    }
    requestAnimationFrame(() => this.draw());
  },
};

/* ──────────────────────────────────────────────────────────────
   LIVE CLOCK
────────────────────────────────────────────────────────────── */
const Clock = {
  init() {
    this.tick();
    setInterval(() => this.tick(), 1000);
  },
  tick() {
    const d = new Date();
    const p = v => String(v).padStart(2, '0');
    UI.setText('lcTime', `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`);
    UI.setText('lcTz',   (Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC').split('/').pop() || 'UTC');
  },
};

/* ──────────────────────────────────────────────────────────────
   SCROLL EFFECTS
────────────────────────────────────────────────────────────── */
const ScrollFx = {
  init() {
    window.addEventListener('scroll', () => {
      /* back-to-top */
      const bt = document.getElementById('backTop');
      if (bt) bt.classList.toggle('show', window.scrollY > 380);

      /* active nav */
      const ids     = ['hero','how-it-works','features','faq'];
      let   current = 'hero';
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && window.scrollY >= el.offsetTop - 130) current = id;
      }
      document.querySelectorAll('.dnav').forEach(a =>
        a.classList.toggle('active', a.getAttribute('href') === `#${current}`)
      );
    }, { passive: true });
  },
};

/* ──────────────────────────────────────────────────────────────
   ANIMATED COUNTERS
────────────────────────────────────────────────────────────── */
const Counters = {
  init() {
    document.querySelectorAll('.counter[data-target]').forEach(el => {
      const target = parseInt(el.dataset.target);
      const dur    = 2200;
      const t0     = performance.now();
      const run    = now => {
        const p = Math.min((now - t0) / dur, 1);
        const e = 1 - Math.pow(1 - p, 3);
        const v = Math.floor(e * target);
        el.textContent =
          target === 1500000 ? (v >= 1e6 ? (v/1e6).toFixed(2)+'M+' : v.toLocaleString()) :
          target === 100     ? v + '%' : v + '+';
        if (p < 1) requestAnimationFrame(run);
      };
      requestAnimationFrame(run);
    });
  },
};

/* ──────────────────────────────────────────────────────────────
   LIVE USERS
────────────────────────────────────────────────────────────── */
const LiveUsers = {
  init() {
    setInterval(() => {
      State.liveCount = Math.max(190, Math.min(410, State.liveCount + Math.floor(Math.random()*7) - 3));
      UI.setText('liveUsers', State.liveCount);
    }, 3500);
  },
};

/* ──────────────────────────────────────────────────────────────
   HEALTH CHECK
────────────────────────────────────────────────────────────── */
const Health = {
  async ping() {
    const pill = document.getElementById('srvPill');
    const txt  = document.getElementById('srvTxt');
    try {
      const r = await fetch('/api/health');
      const d = await r.json();
      if (d.status === 'online') {
        if (pill) pill.className = 'srv-pill online';
        if (txt)  txt.textContent = 'Server Online';
      } else {
        if (pill) pill.className = 'srv-pill offline';
        if (txt)  txt.textContent = 'yt-dlp Missing';
        Alert.show('error','Setup Required',
          'yt-dlp is not installed. Download yt-dlp.exe from github.com/yt-dlp/yt-dlp/releases and place it in the project root folder, then restart the server.');
      }
    } catch {
      if (pill) pill.className = 'srv-pill offline';
      if (txt)  txt.textContent = 'Server Offline';
    }
  },
};

/* ──────────────────────────────────────────────────────────────
   NAVIGATION
────────────────────────────────────────────────────────────── */
const Nav = {
  init() {
    const burger = document.getElementById('burger');
    if (burger) burger.addEventListener('click', () => {
      document.getElementById('mobNav')?.classList.toggle('open');
    });
    document.addEventListener('click', e => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id  = a.getAttribute('href');
      if (id === '#') return;
      const el  = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      window.scrollTo({ top: el.offsetTop - 72, behavior: 'smooth' });
    });
  },
};

/* ──────────────────────────────────────────────────────────────
   REVEAL ON SCROLL
────────────────────────────────────────────────────────────── */
const Reveal = {
  init() {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('.appear').forEach(el => io.observe(el));
  },
};

/* ──────────────────────────────────────────────────────────────
   UI HELPERS
────────────────────────────────────────────────────────────── */
const UI = {
  setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = String(val ?? '');
  },

  show(id) { const el=document.getElementById(id); if(el) el.style.display='block'; },
  hide(id) { const el=document.getElementById(id); if(el) el.style.display='none';  },

  setYear() {
    UI.setText('fyear', new Date().getFullYear());
  },

  wireInput() {
    const inp = document.getElementById('urlInput');
    const clr = document.getElementById('sClear');
    if (!inp) return;

    inp.addEventListener('input', () => {
      if (clr) clr.style.display = inp.value ? 'flex' : 'none';
    });
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') App.fetchInfo(); });
    inp.addEventListener('paste', () => {
      setTimeout(() => {
        const v = inp.value;
        if (v.includes('youtube.com') || v.includes('youtu.be'))
          Toast.show('info', '🎬 YouTube URL detected! Click Fetch Video.');
      }, 80);
    });
  },

  setBtnState(loading) {
    const btn  = document.getElementById('sBtn');
    const on   = btn?.querySelector('.s-btn-on');
    const spin = btn?.querySelector('.s-btn-load');
    const inp  = document.getElementById('urlInput');
    if (loading) {
      if (on)   on.style.display   = 'none';
      if (spin) spin.style.display = 'flex';
      if (btn)  btn.disabled       = true;
      if (inp)  inp.disabled       = true;
    } else {
      if (on)   on.style.display   = 'flex';
      if (spin) spin.style.display = 'none';
      if (btn)  btn.disabled       = false;
      if (inp)  inp.disabled       = false;
    }
  },
};

/* ──────────────────────────────────────────────────────────────
   ALERT
────────────────────────────────────────────────────────────── */
const Alert = {
  show(type, title, msg) {
    const wrap = document.getElementById('alertWrap');
    const box  = document.getElementById('alertBox');
    const ico  = document.getElementById('alertIco');
    if (!wrap) return;
    wrap.style.display = 'block';
    if (box) box.className = `alert-box${type === 'success' ? ' ok' : ''}`;
    if (ico) ico.className = `alert-ico fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'}`;
    UI.setText('alertTitle', title);
    UI.setText('alertMsg',   msg);
    clearTimeout(State.alertTimer);
    State.alertTimer = setTimeout(() => Alert.close(), 8000);
  },
  close() {
    const el = document.getElementById('alertWrap');
    if (el) el.style.display = 'none';
  },
};

/* ──────────────────────────────────────────────────────────────
   TOAST
────────────────────────────────────────────────────────────── */
const Toast = {
  show(type, msg) {
    const stack = document.getElementById('toastStack');
    if (!stack) return;
    const icons = { ok:'fa-check-circle', err:'fa-times-circle', info:'fa-circle-info' };
    const el    = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span>${msg}</span>`;
    stack.appendChild(el);
    setTimeout(() => {
      el.style.cssText = 'opacity:0;transform:translateY(10px);transition:all .3s ease';
      setTimeout(() => el.remove(), 320);
    }, 3800);
  },
};

/* ──────────────────────────────────────────────────────────────
   LOADING STEPS
────────────────────────────────────────────────────────────── */
const Steps = {
  ids: ['ls1','ls2','ls3','ls4'],
  reset() {
    this.ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.className = 'lstep';
    });
  },
  async run() {
    this.reset();
    for (let i = 0; i < this.ids.length; i++) {
      await sleep(i * 650);
      if (i > 0) {
        const prev = document.getElementById(this.ids[i-1]);
        if (prev) { prev.classList.remove('active'); prev.classList.add('done'); }
      }
      const cur = document.getElementById(this.ids[i]);
      if (cur) cur.classList.add('active');
    }
  },
};

/* ──────────────────────────────────────────────────────────────
   PROGRESS
────────────────────────────────────────────────────────────── */
const Progress = {
  show(quality, title) {
    UI.show('progPanel');
    UI.setText('progTitle', `Downloading: ${title.slice(0,55)}…`);
    UI.setText('progSub',   `Quality: ${quality} — Connecting…`);
    UI.setText('progTag',   quality);
    this.fill(0);
    this.steps(0);
    const ico = document.getElementById('progIco');
    if (ico) ico.classList.remove('done');
    setTimeout(() => document.getElementById('progPanel')
      ?.scrollIntoView({ behavior:'smooth', block:'center' }), 200);
  },

  hide() { UI.hide('progPanel'); },

  fill(pct) {
    const bar = document.getElementById('progFill');
    const txt = document.getElementById('progPct');
    if (bar) bar.style.width  = `${pct}%`;
    if (txt) txt.textContent  = `${pct}%`;
  },

  stats(speed, done, total, etaSec) {
    UI.setText('pSpeed', `${speed} MB/s`);
    UI.setText('pDone',  `${done} MB`);
    UI.setText('pTotal', total !== '?' ? `${total} MB` : 'Calculating…');
    const eta = document.getElementById('pEta');
    if (!eta) return;
    if (etaSec > 0) {
      const m = Math.floor(etaSec / 60);
      const s = Math.floor(etaSec % 60);
      eta.textContent = m > 0 ? `${m}m ${s}s` : `${s}s`;
    } else {
      eta.textContent = 'Almost done…';
    }
  },

  resetSteps() {
    ['ps1','ps2','ps3','ps4'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.className = 'pstep';
    });
  },

  steps(pct) {
    const map = [
      { id:'ps1', from:0,  to:12  },
      { id:'ps2', from:12, to:45  },
      { id:'ps3', from:45, to:96  },
      { id:'ps4', from:96, to:100 },
    ];
    map.forEach(s => {
      const el = document.getElementById(s.id);
      if (!el) return;
      el.classList.remove('active','done');
      if      (pct >= s.to)   el.classList.add('done');
      else if (pct >= s.from) el.classList.add('active');
    });
  },

  finish(quality) {
    this.fill(100);
    this.steps(100);
    UI.setText('progSub', '✅ Download complete! Check your Downloads folder.');
    const ico = document.getElementById('progIco');
    if (ico) ico.classList.add('done');
    Toast.show('ok', `✅ ${quality} downloaded!`);
    setTimeout(() => this.hide(), 10000);
  },
};

/* ──────────────────────────────────────────────────────────────
   QUALITY CARDS
────────────────────────────────────────────────────────────── */
const Cards = {
  BADGES: {
    '4320p'     : { lbl:'8K',      cls:'uhd' },
    '2160p'     : { lbl:'4K UHD',  cls:'uhd' },
    '1440p'     : { lbl:'2K QHD',  cls:'uhd' },
    '1080p'     : { lbl:'Full HD', cls:'fhd' },
    '720p'      : { lbl:'HD',      cls:'hd'  },
    '480p'      : { lbl:'SD',      cls:'sd'  },
    '360p'      : { lbl:'SD',      cls:'sd'  },
    '240p'      : { lbl:'Low',     cls:'sd'  },
    '144p'      : { lbl:'Low',     cls:'sd'  },
    'Audio Only': { lbl:'MP3',     cls:'aud' },
  },

  render(qualities, rawUrl, title) {
    const grid = document.getElementById('qGrid');
    if (!grid) return;
    grid.innerHTML = '';

    const keys = Object.keys(qualities);
    UI.setText('qCount', keys.length);

    if (!keys.length) {
      grid.innerHTML = `<div class="no-quality"><i class="fas fa-exclamation-circle"></i><p>No formats found for this video.</p></div>`;
      return;
    }

    keys.forEach(key => {
      const q       = qualities[key];
      const isAudio = !!(q.isAudio || key === 'Audio Only');
      grid.appendChild(this.make(q, key, rawUrl, title, isAudio));
    });
  },

  make(q, key, rawUrl, title, isAudio) {
    const card = document.createElement('div');
    card.className = `qc qi ${isAudio ? 'is-aud qa' : 'qv'}`;

    const { lbl, cls } = this.BADGES[key] || { lbl: key, cls: 'sd' };
    const eu = encodeURIComponent(rawUrl);
    const et = encodeURIComponent(title);
    const ef = encodeURIComponent(q.formatId || '');
    const ek = encodeURIComponent(key);

    card.innerHTML = `
      <div class="qc-top">
        <div class="qc-label">
          <div class="qc-ico ${isAudio ? 'aud' : 'vid'}">
            <i class="fas fa-${isAudio ? 'music' : 'film'}"></i>
          </div>
          <div>
            <div class="qc-name">${key}</div>
            <div class="qc-sub">${isAudio ? 'MP3 Audio' : (q.container || 'mp4').toUpperCase() + ' Video'}</div>
          </div>
        </div>
        <div class="qc-bdgs">
          <span class="qbdg ${cls}">${lbl}</span>
          ${!isAudio && q.fps ? `<span class="qbdg fps">${q.fps}fps</span>` : ''}
        </div>
      </div>
      <div class="qc-details">
        <div class="qc-det"><i class="fas fa-database"></i>${q.filesize || 'Unknown'}</div>
        <div class="qc-det"><i class="fas fa-file-video"></i>.${isAudio ? 'mp3' : (q.container || 'mp4')}</div>
        ${!isAudio && q.width  ? `<div class="qc-det"><i class="fas fa-expand-arrows-alt"></i>${q.width}×${q.height}</div>` : ''}
        ${isAudio  && q.abr   ? `<div class="qc-det"><i class="fas fa-headphones"></i>${q.abr}kbps</div>`  : ''}
        ${!isAudio && q.vcodec ? `<div class="qc-det"><i class="fas fa-code"></i>${q.vcodec}</div>`         : ''}
      </div>
      <button class="dl-btn ${isAudio ? 'aud' : ''}"
        onclick="App.download('${eu}','${ef}','${ek}','${et}',${isAudio})">
        <i class="fas fa-download"></i> Download ${key}
      </button>`;

    return card;
  },
};

/* ──────────────────────────────────────────────────────────────
   APP  (global — called from HTML onclick attrs)
────────────────────────────────────────────────────────────── */
const App = {

  /* Clear URL input */
  clearUrl() {
    const inp = document.getElementById('urlInput');
    const clr = document.getElementById('sClear');
    if (inp) { inp.value = ''; inp.focus(); }
    if (clr) clr.style.display = 'none';
  },

  /* Mobile nav */
  closeMobNav() { document.getElementById('mobNav')?.classList.remove('open'); },

  /* FAQ */
  toggleFaq(el) {
    const open = el.classList.contains('open');
    document.querySelectorAll('.faq-card.open').forEach(c => c.classList.remove('open'));
    if (!open) el.classList.add('open');
  },

  /* Quality filter */
  filterQ(type) {
    document.querySelectorAll('.q-tab').forEach(t => t.classList.remove('active'));
    document.getElementById(`tab-${type}`)?.classList.add('active');
    document.querySelectorAll('.qi').forEach(c => {
      const show =
        type === 'all'   ||
        (type === 'video' && c.classList.contains('qv')) ||
        (type === 'audio' && c.classList.contains('qa'));
      c.style.display = show ? 'block' : 'none';
    });
  },

  /* ── FETCH VIDEO INFO ─────────────────────────────────────── */
  async fetchInfo() {
    const inp = document.getElementById('urlInput');
    const url = (inp?.value || '').trim();

    if (!url) {
      Alert.show('error','No URL','Please paste a YouTube video URL into the search box.');
      inp?.focus(); return;
    }
    if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
      Alert.show('error','Invalid URL','Please enter a valid YouTube URL (youtube.com or youtu.be).');
      return;
    }

    State.rawUrl = url;
    UI.setBtnState(true);
    UI.show('secLoading');
    UI.hide('secResult');
    Alert.close();

    Steps.run(); /* animated steps — non-blocking */

    try {
      const res  = await fetch(`/api/info?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Unknown error');

      State.video = data.video;
      this._renderResult(data.video, url);

      UI.hide('secLoading');
      UI.show('secResult');
      Toast.show('ok', `✅ ${data.video.qualityCount} download formats found!`);

      setTimeout(() =>
        document.getElementById('secResult')?.scrollIntoView({ behavior:'smooth', block:'start' }), 200);

    } catch (err) {
      console.error('[fetchInfo]', err);
      UI.hide('secLoading');
      Alert.show('error','Fetch Failed', err.message || 'Could not retrieve video info. Check the URL and try again.');
      Toast.show('err', '❌ ' + (err.message || 'Fetch failed'));
    } finally {
      UI.setBtnState(false);
    }
  },

  /* ── Render result section ────────────────────────────────── */
  _renderResult(v, url) {
    const thumb = document.getElementById('vThumb');
    if (thumb) {
      thumb.src     = v.thumbnail;
      thumb.onerror = () => { thumb.src = `https://img.youtube.com/vi/${v.id}/hqdefault.jpg`; };
    }

    UI.setText('vDur',      v.duration);
    UI.setText('vChannel',  v.channel);
    UI.setText('vTitle',    v.title);
    UI.setText('vViews',    v.views + ' views');
    UI.setText('vLikes',    v.likes);
    UI.setText('vDurChip',  v.duration);
    UI.setText('vDate',     v.uploadDate);
    UI.setText('vComments', v.comments);
    UI.setText('vUrl',      url);

    const desc = document.getElementById('vDesc');
    if (desc) desc.innerHTML = `<p>${v.description || 'No description available.'}</p>`;

    const yw = document.getElementById('watchYT');
    if (yw) yw.href = url;

    Cards.render(v.qualities, url, v.title);
    this.filterQ('all');
    Progress.hide();
  },

  /* ── DOWNLOAD ─────────────────────────────────────────────── */
  async download(eu, ef, ek, et, isAudio) {
    const rawUrl   = decodeURIComponent(eu);
    const formatId = decodeURIComponent(ef);
    const quality  = decodeURIComponent(ek);
    const title    = decodeURIComponent(et);

    if (!formatId || formatId === 'undefined') {
      Alert.show('error','Format Unavailable','This format is not available. Please choose another quality.');
      return;
    }

    Progress.show(quality, title);
    Progress.resetSteps();
    Toast.show('info', `⬇️ Starting ${quality} download…`);

    const dlUrl = `/api/download?url=${eu}&formatId=${ef}&quality=${ek}&title=${et}&audio=${isAudio}`;

    try {
      const response = await fetch(dlUrl);

      if (!response.ok) {
        let msg = `Server error ${response.status}`;
        try { const j = await response.json(); msg = j.error || msg; } catch { /* not JSON */ }
        throw new Error(msg);
      }

      const total  = parseInt(response.headers.get('content-length') || '0');
      const reader = response.body.getReader();
      const chunks = [];
      let   recv   = 0;
      let   lastTs = Date.now();
      let   lastB  = 0;

      Progress.steps(12);

      /* stream read loop */
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value);
        recv += value.length;

        const now = Date.now();
        const dt  = (now - lastTs) / 1000;

        if (dt >= 0.5) {
          const speed    = (recv - lastB) / dt;
          const speedMB  = (speed / 1_048_576).toFixed(2);
          const doneMB   = (recv  / 1_048_576).toFixed(1);
          const totalMB  = total  ? (total  / 1_048_576).toFixed(1) : '?';
          const pct      = total  ? Math.min(96, Math.floor((recv / total) * 100)) : 0;
          const etaSec   = (total && speed > 0) ? (total - recv) / speed : 0;

          Progress.fill(pct);
          Progress.stats(speedMB, doneMB, totalMB, etaSec);
          Progress.steps(pct);

          lastTs = now;
          lastB  = recv;
        }
      }

      /* assemble blob and trigger browser save */
      Progress.fill(99);
      Progress.steps(98);

      const ext      = isAudio ? 'mp3' : 'mp4';
      const mime     = isAudio ? 'audio/mpeg' : 'video/mp4';
      const blob     = new Blob(chunks, { type: mime });
      const bUrl     = URL.createObjectURL(blob);
      const safeName = title.replace(/[^\w\s\-_.]/g,'').trim().replace(/\s+/g,'_').slice(0,90) || 'video';
      const filename = `${safeName}_${quality}.${ext}`;

      const a = document.createElement('a');
      a.href     = bUrl;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(bUrl), 30_000);

      Progress.finish(quality);

    } catch (err) {
      console.error('[download]', err);
      Progress.hide();
      Alert.show('error','Download Failed', err.message || 'Download failed. Please try again.');
      Toast.show('err', '❌ ' + (err.message || 'Download error'));
    }
  },

  /* ── Alert close (called from HTML) ──────────────────────── */
  closeAlert() { Alert.close(); },

  /* ── Reset ────────────────────────────────────────────────── */
  reset() {
    State.video  = null;
    State.rawUrl = '';

    const inp = document.getElementById('urlInput');
    const clr = document.getElementById('sClear');
    if (inp) { inp.value = ''; inp.disabled = false; }
    if (clr) clr.style.display = 'none';

    UI.hide('secLoading');
    UI.hide('secResult');
    Progress.hide();
    Alert.close();

    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => document.getElementById('urlInput')?.focus(), 500);
    Toast.show('info', '🔄 Ready for a new download!');
  },
};

/* ──────────────────────────────────────────────────────────────
   UTILITY
────────────────────────────────────────────────────────────── */
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }