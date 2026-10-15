/* =====================================================================
   D. STATE + HELPERS
   ===================================================================== */
const $ = (s, r = document) => r.querySelector(s);
const slug = s => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const S = {
  view: 'workspace',
  mod: 'eos',
  page: 'overview',
  rec: null,
  lay: 'list',
  vw: 'all',
  grp: false,
  q: '',
  sel: new Set(),
  act: {},
  palI: 0,
  hidden: false,
  open: new Set(['eos:overview'])
};

const fmt = v => typeof v === 'number' ? v.toLocaleString('en-KE') : v;
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const initials = n => n.replace(/[^A-Za-z ]/g, '').split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase();
const mobile = () => innerWidth <= 900;
const mod = () => MODULES.find(m => m.id === S.mod) || MODULES[0];
const pgDef = () => PAGES[S.mod + ':' + S.page];
const curSet = () => pgDef() ? SETS[pgDef().set] : null;
const navLabel = () => {
  for (const [l, , k] of mod().nav) {
    if (slug(l) === S.page) return l;
    if (k) for (const c of k) if (slug(c) === S.page) return c;
  }
  return '';
};
const dt = () => pgDef() ? pgDef().dt : navLabel();
const parentOf = (m, p) => {
  const e = m.nav.find(([l, , k]) => k && k.some(c => slug(c) === p));
  return e ? slug(e[0]) : null;
};
const findRec = (set, id) => set && set.rows.find(r => r.id === id);

function go(m, p, rec = null) {
  S.mod = m;
  S.page = p || 'overview';
  S.rec = rec;
  S.view = rec ? 'record' : S.page === 'overview' ? 'workspace' : (S.mod === 'eos' ? 'workspace' : 'list');
  S.lay = 'list';
  S.vw = 'all';
  S.grp = false;
  S.q = '';
  S.sel = new Set();
  const par = parentOf(mod(), S.page);
  if (par) S.open.add(S.mod + ':' + par);
  document.body.classList.remove('nav-open');
  render();
  enter();
  const page = $('.page');
  if (page) page.scrollTop = 0;
}

function home() {
  go('eos', 'overview');
}

function enter() {
  const m = $('#main');
  if (m) {
    m.classList.remove('enter');
    void m.offsetWidth;
    m.classList.add('enter');
  }
}

function toast(m) {
  const t = $('#toast');
  if (!t) return;
  t.textContent = m;
  t.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => t.classList.remove('show'), 2000);
}

/* =====================================================================
   E. SHELL RENDER (100% EOS ONLY)
   ===================================================================== */
function renderRail() {
  const brand = BRAND.logo ? `<img src="${BRAND.logo}" alt="${BRAND.name}" style="width:38px;height:38px;object-fit:contain" onerror="if(!this.dataset.fallback){this.dataset.fallback=1;this.src='/files/bel-logo-256.png?v=2.0.6';}else{this.outerHTML='<span>${BRAND.mono}</span>';}">` : `<span>${BRAND.mono}</span>`;
  const rail = $('#rail');
  if (!rail) return;
  rail.innerHTML = `<button class="brand ${BRAND.logo ? 'has-logo' : ''}" data-act="home" title="${BRAND.name}" aria-label="${BRAND.name} home">${brand}</button>` +
   `<button class="rb" data-act="mod" data-id="eos" title="EOS" aria-label="EOS" aria-current="true">${icon('target')}</button>` +
   `<span class="spacer"></span><button class="rb" title="Settings" aria-label="Settings">${icon('sliders')}</button>`;
}

function renderTop() {
  const exp = S.hidden;
  const top = $('#top');
  if (!top) return;
  top.innerHTML = `<button class="icon-btn menu-btn" data-act="menu" aria-label="Open navigation">${icon('menu')}</button>
   ${exp ? `<button class="icon-btn exp" data-act="sbtoggle" aria-label="Show sidebar" title="Show sidebar">${icon('panel')}</button>` : ''}
   <div class="crumbs" style="display:flex;align-items:center;gap:8px">
     <img src="${BRAND.logo}" style="width:22px;height:22px;object-fit:contain" alt="BEL" onerror="this.style.display='none'">
     ${crumbs()}
   </div>
   <button class="cmdk" data-act="pal" aria-label="Search">${icon('search')}<span>Search</span><kbd>Ctrl+K</kbd></button>
   <button class="icon-btn" aria-label="Notifications" style="position:relative">${icon('bell')}<span class="dot"></span></button><div class="avatar" title="${USER.name}">${USER.initial}</div>`;
}

function renderSide() {
  const m = MODULES[0];
  const head = `<div style="display:flex;align-items:center;gap:10px">
    <div style="width:32px;height:32px;border-radius:6px;overflow:hidden;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:transparent">
      <img src="${BRAND.logo}" style="width:100%;height:100%;object-fit:contain" alt="BEL" onerror="if(!this.dataset.fallback){this.dataset.fallback=1;this.src='/files/bel-logo-256.png?v=2.0.6';}else{this.outerHTML='<span style=\\'font-weight:700\\'>B</span>';}">
    </div>
    <div><h2>${m.name}</h2><p>${m.blurb}</p></div>
  </div><button class="icon-btn" data-act="sbtoggle" aria-label="Hide sidebar" title="Hide sidebar">${icon('panel')}</button>`;
  const nav = m.nav.map(([l, ic, kids]) => {
    const id = slug(l);
    if (!kids) return `<button class="nv" data-act="nav" data-id="${id}" ${S.page === id ? 'aria-current="page"' : ''}>${icon(ic)}<span class="lbl">${l}</span></button>`;
    const open = S.open.has(m.id + ':' + id), has = kids.some(k => slug(k) === S.page);
    return `<button class="nv ${has ? 'has' : ''}" data-act="tg" data-id="${id}" aria-expanded="${open}">${icon(ic)}<span class="lbl">${l}</span>${icon('chev', 'chev')}</button>
     <div class="kids ${open ? 'open' : ''}"><div>${kids.map(k => `<button class="kid" data-act="nav" data-id="${slug(k)}" ${S.page === slug(k) ? 'aria-current="page"' : ''}>${k}</button>`).join('')}</div></div>`;
  }).join('');
  const side = $('#side');
  if (side) side.innerHTML = `<div class="side-in"><div class="sb-head">${head}</div><nav class="sb-nav">${nav}</nav></div>`;
}

function crumbs() {
  const sep = '<span class="sep">/</span>';
  return `<b>EOS</b>${S.page && S.page !== 'overview' ? sep + '<b>' + navLabel() + '</b>' : ''}`;
}

/* =====================================================================
   F. VIEWS
   ===================================================================== */
function assigned() {
  const out = [];
  for (const [k, p] of Object.entries(PAGES)) {
    const set = SETS[p.set];
    if (!set || !set.attention) continue;
    const [m, pg] = k.split(':');
    set.rows.forEach(r => {
      if (r.owner === USER.name && set.attention.includes(r.status)) out.push({ m, pg, dt: p.dt, r, set });
    });
  }
  return out;
}

function renderHome() {
  renderEos();
}

function renderWorkspace() {
  const m = mod();
  const short = Object.entries(PAGES).filter(([k]) => k.startsWith(m.id + ':'));
  const cards = m.nav.filter(([l, , k]) => k).map(([l, , k]) => `<div class="panel" style="padding:16px"><h3 style="font-size:14px;font-weight:600;margin-bottom:10px;color:var(--g900)">${l}</h3><div style="display:flex;flex-direction:column;gap:6px">${k.map(c => `<button class="btn" style="justify-content:space-between;width:100%" data-act="nav" data-id="${slug(c)}"><span>${c}</span>${icon('chev')}</button>`).join('')}</div></div>`).join('');
  const singles = m.nav.filter(([l, , k]) => !k && slug(l) !== 'overview');
  const main = $('#main');
  if (!main) return;
  main.innerHTML = `<div class="ph"><h1>${m.name}</h1></div>
   <div class="cards" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:24px">${(typeof m.cards === 'function' ? m.cards() : m.cards).map(c => `<div class="panel ncard ${c[3] || ''}" style="padding:16px"><small style="display:block;color:var(--ink-3);font-size:12px;margin-bottom:4px">${c[0]}</small><strong style="display:block;font-size:24px;font-weight:700;color:var(--g900)">${c[1]}</strong><em style="display:block;color:var(--ink-2);font-size:12px;font-style:normal;margin-top:2px">${c[2] || '&nbsp;'}</em></div>`).join('')}</div>
   ${short.length ? `<div class="section" style="margin-bottom:24px"><h2 style="font-size:16px;font-weight:700;margin-bottom:12px;color:var(--g900)">Shortcuts</h2><div class="shortcuts" style="display:flex;gap:10px;flex-wrap:wrap">${short.map(([k, p]) => `<button class="btn" data-act="nav" data-id="${k.split(':')[1]}">${p.dt}<span class="cnt" style="margin-left:6px;background:var(--g100);padding:1px 6px;border-radius:99px;font-size:11px">${SETS[p.set].rows.length}</span></button>`).join('')}</div></div>` : ''}
   <div class="section"><h2 style="font-size:16px;font-weight:700;margin-bottom:12px;color:var(--g900)">Documents</h2><div class="links" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px">${cards}${singles.length ? `<div class="panel" style="padding:16px"><h3 style="font-size:14px;font-weight:600;margin-bottom:10px;color:var(--g900)">Other</h3><div style="display:flex;flex-direction:column;gap:6px">${singles.map(([l]) => `<button class="btn" style="justify-content:space-between;width:100%" data-act="nav" data-id="${slug(l)}"><span>${l}</span>${icon('chev')}</button>`).join('')}</div></div>` : ''}</div></div>`;
}

function visibleRows(set) {
  let r = set.rows;
  if (S.vw === 'attn') r = r.filter(x => set.attention.includes(x.status));
  if (S.vw === 'mine') r = r.filter(x => x.owner === USER.name);
  const q = S.q.trim().toLowerCase();
  if (q) r = r.filter(x => Object.values(x).join(' ').toLowerCase().includes(q));
  return r;
}
const cell = (c, v) => c.t === 'pill' ? `<td><span class="pill ${TONE[v] || 'neutral'}">${v}</span></td>` : `<td class="${c.t || ''}">${fmt(v)}</td>`;

function renderList() {
  const set = curSet(), name = dt();
  let html = `<div class="ph"><h1>${name}</h1><div class="row"><button class="btn primary" data-act="create">${icon('plus')}Add ${name}</button></div></div>`;
  if (!set) {
    html += `<div class="panel"><div class="empty"><h3>No ${name} records</h3><p>Records you add will be listed here.</p><button class="btn primary" data-act="create">${icon('plus')}Add ${name}</button></div></div>`;
    $('#main').innerHTML = html;
    return;
  }
  const rows = visibleRows(set), all = set.rows, hasOwner = all.some(r => r.owner), hasSt = !!set.statuses;
  if (S.sel.size) {
    html += `<div class="bulk" style="display:flex;align-items:center;gap:12px;padding:12px 16px;background:var(--g100);border-radius:var(--r);margin-bottom:16px"><b>${S.sel.size} selected</b>${set.approve ? `<button class="mini ok" data-act="bulk-ok">${set.approve.okLabel}</button><button class="mini" data-act="bulk-no">${set.approve.noLabel}</button>` : ''}<button class="mini" data-act="bulk-export">Export</button><span class="sp" style="flex:1"></span><button class="mini" data-act="bulk-clear">Clear</button></div>`;
  } else {
    const chip = (id, l, n) => `<button class="chip" data-act="view" data-id="${id}" aria-pressed="${S.vw === id}">${l}<small>${n}</small></button>`;
    html += `<div class="cp" style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin-bottom:16px"><div class="search">${icon('search')}<input class="field" id="q" placeholder="Search by ID or name" value="${S.q.replace(/"/g, '&quot;')}" aria-label="Search list"></div>
     <div class="chips">${chip('all', 'All', all.length)}${set.attention ? chip('attn', 'Needs attention', all.filter(r => set.attention.includes(r.status)).length) : ''}${hasOwner ? chip('mine', 'Assigned to me', all.filter(r => r.owner === USER.name).length) : ''}</div>
     <div class="cp-r" style="margin-left:auto;display:flex;gap:10px;align-items:center">${hasSt ? `<button class="chip" data-act="grp" aria-pressed="${S.grp}">Group by status</button><div class="seg" role="group" aria-label="View" style="display:flex;border:1px solid var(--line-2);border-radius:var(--r);overflow:hidden"><button class="btn" style="border:none;border-radius:0;height:32px" data-act="lay" data-id="list" aria-pressed="${S.lay === 'list'}">${icon('list')}List</button><button class="btn" style="border:none;border-radius:0;height:32px" data-act="lay" data-id="board" aria-pressed="${S.lay === 'board'}">${icon('board')}Kanban</button></div>` : ''}</div></div>`;
  }
  if (!rows.length) {
    html += `<div class="panel"><div class="empty"><h3>No matching records</h3><p>Change the search or choose “All”.</p></div></div>`;
  } else if (S.lay === 'board' && hasSt) {
    html += `<div class="board">${set.statuses.map(s => {
      const rs = rows.filter(r => r.status === s);
      return `<section class="col"><h4>${s}<span>${rs.length}</span></h4>${rs.map(r => {
        const meta = set.cols.filter(c => !['pill', 'strong'].includes(c.t) && c.k !== set.titleKey).slice(0, 2).map(c => fmt(r[c.k])).join(' · ');
        return `<button class="card" data-act="open" data-id="${r.id}"><small>${r.id}</small><strong>${r[set.titleKey]}</strong><p>${meta}</p>${r.owner ? `<div class="by"><span class="avatar" title="${r.owner}">${initials(r.owner)}</span></div>` : ''}</button>`;
      }).join('')}</section>`;
    }).join('')}</div>`;
  } else {
    const ncol = set.cols.length + 1 + (set.approve ? 1 : 0);
    const row = r => `<tr data-act="open" data-id="${r.id}" class="${S.sel.has(r.id) ? 'sel' : ''}"><td class="ck" style="width:40px"><input type="checkbox" data-act="sel" data-id="${r.id}" ${S.sel.has(r.id) ? 'checked' : ''} aria-label="Select ${r.id}"></td>${set.cols.map(c => cell(c, r[c.k])).join('')}${set.approve ? `<td class="act">${r.status === set.approve.from ? `<button class="mini ok" data-act="approve" data-id="${r.id}">${set.approve.okLabel}</button><button class="mini" data-act="reject" data-id="${r.id}">${set.approve.noLabel}</button>` : ''}</td>` : ''}</tr>`;
    let body = '';
    if (S.grp && hasSt) set.statuses.forEach(s => { const rs = rows.filter(r => r.status === s); if (rs.length) body += `<tr class="grp" style="background:var(--g100);font-weight:600"><td colspan="${ncol}">${s} · ${rs.length}</td></tr>` + rs.map(row).join(''); });
    else body = rows.map(row).join('');
    html += `<div class="panel"><div class="scroll"><table><thead><tr><th class="ck" style="width:40px"><input type="checkbox" data-act="selall" aria-label="Select all" ${S.sel.size && rows.every(r => S.sel.has(r.id)) ? 'checked' : ''}></th>${set.cols.map(c => `<th class="${c.t === 'num' ? 'num' : ''}">${c.l}</th>`).join('')}${set.approve ? '<th class="act"></th>' : ''}</tr></thead><tbody>${body}</tbody></table></div><div class="foot" style="padding:12px 16px;color:var(--ink-3);font-size:12.5px">${rows.length} of ${all.length} ${all.length === 1 ? 'record' : 'records'}</div></div>`;
  }
  $('#main').innerHTML = html;
}

function actFor(set, r) {
  const k = S.mod + S.page + r.id;
  if (!S.act[k]) {
    S.act[k] = [{ who: r.owner || 'System', t: '3 days ago', text: 'created this ' + set.noun }];
    if (set.statuses && !['Draft', 'Planning', 'Vacant'].includes(r.status)) S.act[k].push({ who: r.owner || 'System', t: '2 days ago', text: 'changed Status to ' + r.status });
  }
  return S.act[k];
}

function renderRecord() {
  const set = curSet(), r = findRec(set, S.rec);
  if (!r) { S.view = 'list'; return renderList(); }
  const ap = set.approve && r.status === set.approve.from;
  const fields = set.cols.filter(c => !(c.t === 'pill' && set.statuses));
  const total = r.items ? r.items.reduce((s, i) => s + i[1] * i[2], 0) : 0;
  $('#main').innerHTML = `
   <div class="ph"><div style="display:flex;align-items:center;gap:12px"><h1>${r[set.titleKey]}<span class="sub">${r.id}</span></h1>${r.status ? `<span class="pill ${TONE[r.status] || 'neutral'}">${r.status}</span>` : ''}</div>
     <div class="row">${ap ? `<button class="btn" data-act="reject" data-id="${r.id}">${set.approve.noLabel}</button><button class="btn primary" data-act="approve" data-id="${r.id}">${icon('check')}${set.approve.okLabel}</button>` : ''}</div></div>
   <div class="rec" style="display:grid;grid-template-columns:2fr 1fr;gap:20px"><div>
     <div class="panel" style="padding:20px"><h3 style="font-size:16px;font-weight:700;margin-bottom:16px;color:var(--g900)">Details</h3><dl style="display:grid;grid-template-columns:1fr 1fr;gap:16px">${fields.map(c => `<div><dt style="font-size:12px;color:var(--ink-3);margin-bottom:4px">${c.l}</dt><dd style="font-size:14px;font-weight:500">${c.t === 'pill' ? `<span class="pill ${TONE[r[c.k]] || 'neutral'}">${r[c.k]}</span>` : fmt(r[c.k])}</dd></div>`).join('')}</dl></div>
     ${r.items ? `<div class="panel" style="margin-top:16px;padding:20px"><h3 style="font-size:16px;font-weight:700;margin-bottom:16px;color:var(--g900)">Items</h3><div class="scroll"><table style="min-width:520px"><thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Rate (KES)</th><th class="num">Amount (KES)</th></tr></thead><tbody>${r.items.map(i => `<tr><td>${i[0]}</td><td class="num">${fmt(i[1])}</td><td class="num">${fmt(i[2])}</td><td class="num">${fmt(i[1] * i[2])}</td></tr>`).join('')}</tbody><tfoot><tr><td colspan="3" style="font-weight:700;padding:12px 16px">Total</td><td class="num" style="font-weight:700;padding:12px 16px">${fmt(total)}</td></tr></tfoot></table></div></div>` : ''}
    </div>
    <div>
     ${r.owner ? `<div class="panel" style="padding:20px"><h3 style="font-size:14px;font-weight:700;margin-bottom:12px;color:var(--g900)">Assigned to</h3><div class="meta" style="display:flex;align-items:center;gap:10px"><span class="avatar">${initials(r.owner)}</span><div><b>${r.owner}</b></div></div></div>` : ''}
     <div class="panel" style="margin-top:${r.owner ? 16 : 0}px;padding:20px"><h3 style="font-size:14px;font-weight:700;margin-bottom:12px;color:var(--g900)">Activity</h3><div class="tl" style="display:flex;flex-direction:column;gap:12px">${actFor(set, r).slice().reverse().map(e => `<div class="ev ${e.note ? 'note' : ''}" style="font-size:13px"><b>${e.who}</b> ${e.note ? 'commented' : e.text} <span style="color:var(--ink-3);font-size:11px">${e.t}</span>${e.note ? `<p style="margin-top:4px;padding:8px;background:var(--g100);border-radius:6px">${e.text}</p>` : ''}</div>`).join('')}</div>
      <div class="compose" style="display:flex;gap:8px;margin-top:16px"><input class="field" style="flex:1" id="note" placeholder="Add a comment" aria-label="Add a comment"><button class="btn primary" data-act="note" aria-label="Post comment">${icon('send')}</button></div></div>
    </div></div>`;
}

function renderMain() {
  renderEos();
}

function render() {
  renderRail();
  renderSide();
  renderTop();
  renderMain();
  const app = $('#app');
  if (app) app.classList.toggle('sb-off', S.hidden || S.view === 'home');
}

/* =====================================================================
   G. ACTIONS
   ===================================================================== */
function decide(id, ok, silent) {
  const set = curSet(), r = findRec(set, id), a = set.approve;
  if (!r || !a) return;
  r.status = ok ? a.ok : a.no;
  actFor(set, r).push({ who: USER.name, t: 'Just now', text: 'changed Status to ' + r.status });
  if (!silent) toast(`${dt()} ${r.status.toLowerCase()}`);
}

function openDrawer() {
  if (S.mod === 'eos') return eosDrawer();
  const set = curSet(), form = set ? set.form : [['Name', 'name', 'text']];
  $('#drawer').innerHTML = `<header><h2>New ${dt()}</h2><button class="icon-btn" data-act="close" aria-label="Close">${icon('x')}</button></header>
   <div class="body">${form.map((f, i) => `<div class="f"><label for="d${i}">${f[0]}</label>${f[2] === 'select' ? `<select class="field" id="d${i}" data-k="${f[1]}">${f[3].map(o => `<option>${o}</option>`).join('')}</select>` : `<input class="field" id="d${i}" data-k="${f[1]}" type="${f[2]}" placeholder="${f[3] || ''}">`}<div class="err">${f[0]} is required.</div></div>`).join('')}</div>
   <footer><button class="btn" data-act="close">Cancel</button><button class="btn primary" data-act="save">Save</button></footer>`;
  document.body.classList.add('drawer-open');
  $('#drawer').setAttribute('aria-hidden', 'false');
  setTimeout(() => { const f = $('#drawer .field'); f && f.focus(); }, 230);
}

function closeDrawer() {
  document.body.classList.remove('drawer-open');
  const d = $('#drawer');
  if (d) d.setAttribute('aria-hidden', 'true');
}

function saveDrawer() {
  if (S.mod === 'eos') return eosSave();
  const set = curSet();
  if (!set) { closeDrawer(); toast(dt() + ' saved'); return; }
  const vals = {}; let bad = false;
  document.querySelectorAll('#drawer [data-k]').forEach((el, i) => {
    const empty = !el.value.trim();
    el.closest('.f').classList.toggle('bad', empty && i === 0);
    if (empty && i === 0) bad = true;
    vals[el.dataset.k] = el.type === 'number' ? Number(el.value || 0) : el.value.trim() || '—';
  });
  if (bad) return;
  if (!vals.id) {
    const n = Math.max(0, ...set.rows.map(r => parseInt(String(r.id).replace(/\D/g, '')) || 0)) + 1;
    vals.id = (set.prefix || '') + String(n).padStart(4, '0');
  }
  if (set.statuses) vals.status = set.newStatus;
  if (set.rows.some(r => r.owner)) vals.owner = USER.name;
  set.rows.unshift(vals);
  closeDrawer();
  renderMain();
  toast(dt() + ' saved');
}

function postNote() {
  const i = $('#note');
  if (!i || !i.value.trim()) return;
  const set = curSet(), r = findRec(set, S.rec);
  actFor(set, r).push({ who: USER.name, t: 'Just now', text: i.value.trim(), note: true });
  renderMain();
  toast('Comment added');
}

/* Command palette */
function commands() {
  const c = [{ g: 'Go to', l: 'Home', run: home }];
  if (S.view === 'list' || S.view === 'record') c.unshift({ g: 'Actions', l: 'Add ' + dt(), h: 'C', run: openDrawer });
  MODULES.forEach(m => {
    c.push({ g: 'Go to', l: m.name, h: 'Module', run: () => go(m.id, 'overview') });
    m.nav.forEach(([l, , k]) => {
      if (k) k.forEach(x => c.push({ g: 'Go to', l: `${m.name} / ${x}`, run: () => go(m.id, slug(x)) }));
      else if (slug(l) !== 'overview') c.push({ g: 'Go to', l: `${m.name} / ${l}`, run: () => go(m.id, slug(l)) });
    });
  });
  for (const [k, p] of Object.entries(PAGES)) {
    const [m, pg] = k.split(':'), set = SETS[p.set];
    if (set) {
      set.rows.forEach(r => c.push({ g: 'Records', l: `${r.id} · ${r[set.titleKey]}`, h: p.dt, run: () => go(m, pg, r.id) }));
    }
  }
  return c;
}

function renderPal() {
  const q = $('#palIn').value.trim().toLowerCase();
  let it = commands();
  if (q) it = it.filter(x => q.split(' ').every(w => x.l.toLowerCase().includes(w)));
  it = it.slice(0, 10);
  S.palI = Math.min(S.palI, Math.max(0, it.length - 1));
  let last = '';
  $('#palList').innerHTML = it.length ? it.map((x, i) => {
    const g = x.g !== last ? `<li class="g">${x.g}</li>` : '';
    last = x.g;
    return g + `<li class="it" role="option" data-act="palrun" data-i="${i}" aria-selected="${i === S.palI}">${x.l}${x.h ? `<small>${x.h}</small>` : ''}</li>`;
  }).join('') : '<li class="none">No results. Try a document ID or module name.</li>';
  renderPal.items = it;
}

function openPal() {
  document.body.classList.add('pal-open');
  $('#palIn').value = '';
  S.palI = 0;
  renderPal();
  $('#palIn').focus();
}

function closePal() {
  document.body.classList.remove('pal-open');
}

/* =====================================================================
   H. EVENTS
   ===================================================================== */
document.addEventListener('click', e => {
  if (e.target.id === 'scrim') { closeDrawer(); document.body.classList.remove('nav-open'); return; }
  if (e.target.id === 'palWrap') { closePal(); return; }
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const a = el.dataset.act, id = el.dataset.id;
  switch (a) {
   case 'home': home(); break;
   case 'mod': go(id, 'overview'); if (mobile()) document.body.classList.add('nav-open'); break;
   case 'nav': go(S.mod, id); break;
   case 'tg': {
     const k = S.mod + ':' + id, o = !S.open.has(k);
     o ? S.open.add(k) : S.open.delete(k);
     el.setAttribute('aria-expanded', o);
     if (el.nextElementSibling) el.nextElementSibling.classList.toggle('open', o);
     break;
   }
   case 'sbtoggle': S.hidden = !S.hidden; render(); break;
   case 'menu': document.body.classList.toggle('nav-open'); break;
   case 'view': S.vw = id; renderMain(); break;
   case 'grp': S.grp = !S.grp; renderMain(); break;
   case 'lay': S.lay = id; renderMain(); break;
   case 'sel': S.sel.has(id) ? S.sel.delete(id) : S.sel.add(id); renderMain(); break;
   case 'selall': {
     const rows = visibleRows(curSet());
     rows.every(r => S.sel.has(r.id)) ? S.sel.clear() : rows.forEach(r => S.sel.add(r.id));
     renderMain();
     break;
   }
   case 'open': S.rec = id; S.view = 'record'; render(); enter(); $('.page').scrollTop = 0; break;
   case 'back': S.rec = null; S.view = 'list'; render(); enter(); break;
   case 'approve': decide(id, true); renderMain(); break;
   case 'reject': decide(id, false); renderMain(); break;
   case 'bulk-ok': case 'bulk-no': {
     const n = S.sel.size, ok = a === 'bulk-ok', f = curSet().approve.from;
     S.sel.forEach(i => { const r = findRec(curSet(), i); if (r.status === f) decide(i, ok, true); });
     S.sel.clear(); renderMain(); toast(n + ' updated');
     break;
   }
   case 'bulk-export': toast(S.sel.size + ' records exported'); S.sel.clear(); renderMain(); break;
   case 'bulk-clear': S.sel.clear(); renderMain(); break;
   case 'create': openDrawer(); break;
   case 'close': closeDrawer(); break;
   case 'save': saveDrawer(); break;
   case 'pal': openPal(); break;
   case 'palrun': { const it = renderPal.items[+el.dataset.i]; closePal(); it && it.run(); break; }
   case 'work': go(el.dataset.m, el.dataset.p, id); break;
   case 'note': postNote(); break;
   default: if (typeof eosAct === 'function') eosAct(a, el, e);
  }
});

document.addEventListener('input', e => {
  if (e.target.id === 'q') {
    S.q = e.target.value;
    const p = e.target.selectionStart;
    renderMain();
    const n = $('#q');
    if (n) { n.focus(); n.setSelectionRange(p, p); }
  }
  if (e.target.id === 'palIn') { S.palI = 0; renderPal(); }
});

document.addEventListener('keydown', e => {
  const typing = /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName);
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    document.body.classList.contains('pal-open') ? closePal() : openPal();
    return;
  }
  if (document.body.classList.contains('pal-open')) {
    const n = Math.max((renderPal.items || []).length, 1);
    if (e.key === 'ArrowDown') { e.preventDefault(); S.palI = (S.palI + 1) % n; renderPal(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); S.palI = (S.palI - 1 + n) % n; renderPal(); }
    else if (e.key === 'Enter') { const it = renderPal.items[S.palI]; if (it) { closePal(); it.run(); } }
    else if (e.key === 'Escape') closePal();
    return;
  }
  if (e.key === 'Escape') { closeDrawer(); document.body.classList.remove('nav-open'); }
  if (e.key === 'Enter' && e.target.id === 'note') postNote();
  if (!typing && !e.metaKey && !e.ctrlKey) {
    if (e.key === 'c' && S.view === 'list') { e.preventDefault(); openDrawer(); }
    if (e.key === '/' && $('#q')) { e.preventDefault(); $('#q').focus(); }
  }
});

// Initial boot
render();
