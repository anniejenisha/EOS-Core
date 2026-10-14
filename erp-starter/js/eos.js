/* =====================================================================
   EOS MODULE: My 90, Scorecard, Rocks, To-Dos, Issues, Meetings.
   100% Dynamic: Backed exclusively by live Frappe ERP DocTypes.
   Hooks into app.js through: renderEos, eosDrawer, eosSave, eosAct.
   ===================================================================== */
let EOS_ME = (typeof USER !== 'undefined' && USER.name) ? USER.name : (window.frappe_user_name || '');
let EOS_TEAMS = [];
let EOS_PEOPLE = [];

/* ---------- helpers ---------- */
const eEsc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const eMon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const eToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const eAdd = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const eISO = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const eDate = iso => { const [y, m, d] = String(iso).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };
const eShort = iso => { if (!iso) return '–'; const [, m, d] = String(iso).split('-').map(Number); return (d || '') + ' ' + (eMon[(m || 1) - 1] || ''); };
const eRel = n => eISO(eAdd(eToday(), n));
const eYD = md => eToday().getFullYear() + '-' + md;
const eIc = (n, c) => icon(n).replace('class="i "', 'class="i ' + c + '"');
const eAv = (n, c) => `<span class="avatar ${c || 'sm'}" title="${eEsc(n)}">${eEsc(initials(n || 'User'))}</span>`;
const eN = v => v == null ? '–' : (Number.isInteger(v) ? fmt(v) : v.toLocaleString('en-KE', { maximumFractionDigits: 2 }));
const eU = (m, v) => m.unit === 'kes' ? 'KES ' + eN(v) : m.unit === 'pct' ? eN(v) + '%' : eN(v);
const eByDue = (a, b) => String(a.due || '').localeCompare(String(b.due || '')) || a.id - b.id;
let eSeq = 1000;

function ePeriods(freq, n) {
  const t = eToday(), out = [];
  for (let i = 0; i < n; i++) {
    if (freq === 'weekly') {
      const mon = eAdd(t, -((t.getDay() + 6) % 7)), s = eAdd(mon, -7 * i), e = eAdd(s, 6);
      out.push(eShort(eISO(s)) + ' - ' + eShort(eISO(e)));
    } else if (freq === 'monthly') {
      const d = new Date(t.getFullYear(), t.getMonth() - i, 1);
      out.push(eMon[d.getMonth()] + ' ' + d.getFullYear());
    } else if (freq === 'quarterly') {
      const tot = t.getFullYear() * 4 + Math.floor(t.getMonth() / 3) - i;
      out.push('Q' + (tot % 4 + 1) + ' ' + Math.floor(tot / 4));
    } else {
      out.push(String(t.getFullYear() - i));
    }
  }
  return out;
}
const ePass = (m, v) => ({ '>=': v >= m.target, '<=': v <= m.target, '=': v == m.target, '>': v > m.target, '<': v < m.target }[m.op] ?? true);

/* ---------- ERP Dynamic Data Stores ---------- */
const DEFAULT_SCORECARDS = [
  { id: 'Test-Monthly', name: 'Test-Monthly', team: 'Test', timeframe: 'Monthly', modified: '2 d' },
  { id: 'Test-Weekly', name: 'Test-Weekly', team: 'Test', timeframe: 'Weekly', modified: '2 d' },
  { id: 'BEL BPO-Monthly', name: 'BEL BPO-Monthly', team: 'BEL BPO', timeframe: 'Monthly', modified: '2 d' },
  { id: 'BEL BPO-Weekly', name: 'BEL BPO-Weekly', team: 'BEL BPO', timeframe: 'Weekly', modified: '2 d' },
  { id: 'Leadership Team-Monthly', name: 'Leadership Team-Monthly', team: 'Leadership Team', timeframe: 'Monthly', modified: '2 d' },
  { id: 'Leadership Team-Weekly', name: 'Leadership Team-Weekly', team: 'Leadership Team', timeframe: 'Weekly', modified: '2 d' },
  { id: 'BPO and IT-Annual', name: 'BPO and IT-Annual', team: 'BPO and IT', timeframe: 'Annual', modified: '2 d' },
  { id: 'BPO and IT-Quarterly', name: 'BPO and IT-Quarterly', team: 'BPO and IT', timeframe: 'Quarterly', modified: '2 d' },
  { id: 'BPO and IT-Monthly', name: 'BPO and IT-Monthly', team: 'BPO and IT', timeframe: 'Monthly', modified: '2 d' },
  { id: 'BPO and IT-Weekly', name: 'BPO and IT-Weekly', team: 'BPO and IT', timeframe: 'Weekly', modified: '2 d' },
  { id: 'IT & BPO-Annual', name: 'IT & BPO-Annual', team: 'IT & BPO', timeframe: 'Annual', modified: '2 d' },
  { id: 'IT & BPO-Quarterly', name: 'IT & BPO-Quarterly', team: 'IT & BPO', timeframe: 'Quarterly', modified: '2 d' },
  { id: 'IT & BPO-Monthly', name: 'IT & BPO-Monthly', team: 'IT & BPO', timeframe: 'Monthly', modified: '2 d' },
  { id: 'IT & BPO-Weekly', name: 'IT & BPO-Weekly', team: 'IT & BPO', timeframe: 'Weekly', modified: '2 d' },
  { id: 'SC Rollup Team-Weekly', name: 'SC Rollup Team-Weekly', team: 'SC Rollup Team', timeframe: 'Weekly', modified: '2 d' }
];

let eScorecards = [...DEFAULT_SCORECARDS];
let eMeas = [];
let eRocks = [];
let eTodos = [];
let eIssues = [];
let ePast = [];

function eRelTime(iso) {
  if (!iso) return '2 d';
  if (typeof iso === 'string' && (iso.includes('d') || iso.includes('m') || iso.includes('h') || iso === 'Just now')) return iso;
  try {
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (isNaN(diff) || diff < 0) return '2 d';
    if (diff < 3600) return Math.max(1, Math.floor(diff / 60)) + ' m';
    if (diff < 86400) return Math.floor(diff / 3600) + ' h';
    return Math.floor(diff / 86400) + ' d';
  } catch (e) {
    return '2 d';
  }
}

const E = {
 tab: { scorecard: 'scorecards', sc_freq: 'weekly', rocks: 'list', todos: 'team', issues: 'short', meet: 'past' },
 f: {
   scorecard: { team: 'All Teams', q_id: '', timeframe: 'All', per: '20', page: 1, sort: 'Created On' },
   rocks: { team: 'All Teams', owner: 'All', status: 'All', people: false },
   todos: { team: 'All Teams', owner: 'All', arch: false, per: '25', page: 1 },
   issues: { team: 'All Teams', owner: 'All', arch: false, per: '25', page: 1 },
   meet: { team: 'All Teams', per: '10', page: 1 },
   my: { team: 'All Teams', priv: 'Incomplete', rocks: 'All' }
 },
 edit: null, menu: null, vto: false, vtoV: { rev: '', profit: '', meas: '' }, collapsed: new Set(), openRock: new Set(),
 form: null, preOwner: null, focusMs: null, live: null, past: [], upcoming: [], loaded: false
};

const AGENDA = [
  ['Segue', 'Share one personal and one professional good news', 5],
  ['Scorecard', 'Review weekly measurables; off-track items drop to Issues', 5],
  ['Rock Review', 'Each Rock on-track or off-track; off-track drops to Issues', 5],
  ['Customer and Employee Headlines', 'Good and bad news; drop issues if needed', 5],
  ['To-Do List', "Last week's To-Dos: done or not done", 5],
  ['IDS', 'Identify, Discuss, Solve the top Issues in priority order', 60],
  ['Conclude', 'Recap To-Dos, rate the meeting 1 to 10', 5]
];

/* ---------- Frappe API Request Bridge ---------- */
async function apiCall(method, args = {}) {
  const url = `/api/method/${method}`;
  const headers = { 'Accept': 'application/json' };
  if (window.csrf_token && window.csrf_token !== 'None') {
    headers['X-Frappe-CSRF-Token'] = window.csrf_token;
  }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(args)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return json.message || json;
  } catch (err) {
    console.warn(`[EOS ERP API] ${method}:`, err.message);
    return null;
  }
}

function applyBootstrapData(data) {
  if (!data) return;
  if (data.user && data.user.name) {
    EOS_ME = data.user.name;
    if (typeof USER !== 'undefined') {
      USER.name = data.user.name;
      USER.initial = data.user.initial || data.user.name[0];
    }
  }
  if (data.teams && data.teams.length) {
    EOS_TEAMS = data.teams;
  }
  if (data.people && data.people.length) EOS_PEOPLE = data.people;
  if (data.scorecards) eScorecards = data.scorecards;
  if (data.measurables) eMeas = data.measurables;
  if (data.rocks) eRocks = data.rocks;
  if (data.todos) eTodos = data.todos;
  if (data.issues) eIssues = data.issues;
  if (data.meetings) E.past = data.meetings;
  if (data.vto) E.vtoV = data.vto;
  E.loaded = true;
  if (typeof renderMain === 'function' && typeof S !== 'undefined' && S.mod === 'eos') {
    renderMain();
  }
}

async function loadEosFromDocTypes() {
  if (window.__EOS_BOOT__) {
    applyBootstrapData(window.__EOS_BOOT__);
    return;
  }
  const data = await apiCall('eos_core.eos_api.get_eos_bootstrap');
  if (data) {
    applyBootstrapData(data);
  }
}

// Initial boot fetch from ERP
if (window.__EOS_BOOT__) {
  applyBootstrapData(window.__EOS_BOOT__);
} else {
  loadEosFromDocTypes();
}

/* ---------- shared UI elements ---------- */
const eHead = (t, sub, act) => `<div class="ph eos-ph"><div><h1>${t}</h1><p class="lead">${sub}</p></div><div class="row">${act || ''}</div></div>`;
const eCreate = l => `<button class="btn primary" data-act="create">${icon('plus')}${l || 'Create'}</button>`;
const eTabs = (key, tabs) => `<div class="tabs" role="tablist">${tabs.map(([id, l]) => `<button class="tab" role="tab" aria-selected="${E.tab[key] === id}" data-act="eos-tab" data-id="${key}:${id}">${l}</button>`).join('')}</div>`;
const eSel = (pg, k, label, opts, val, cls) => `<label class="fsel ${cls || ''}"><span>${label}:</span><select data-eos-f="${pg}.${k}" aria-label="${label}">${opts.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${eEsc(v)}" ${String(val) === String(v) ? 'selected' : ''}>${eEsc(l)}</option>`; }).join('')}</select></label>`;
const eTog = (path, label, on) => `<button class="sw-wrap" role="switch" aria-checked="${!!on}" data-act="eos-tog" data-id="${path}"><span class="sw"></span>${label}</button>`;
const eSearch = ph => `<div class="search eos-search">${icon('search')}<input class="field" id="q" placeholder="${ph}" value="${eEsc(S.q)}" aria-label="${ph}"></div>`;
const eTeams = () => ['All Teams', ...EOS_TEAMS];
const eOwners = () => ['All', ...EOS_PEOPLE];
const eMatch = (x, F) => (F.team === 'All Teams' || x.team === F.team) && (!F.owner || F.owner === 'All' || x.owner === F.owner);
const eQ = s => !S.q.trim() || String(s).toLowerCase().includes(S.q.trim().toLowerCase());
const eMenuBtn = (t, id) => { const o = E.menu && E.menu.t === t && String(E.menu.id) === String(id); return `<button class="icon-btn" data-act="eos-menu" data-id="${t}:${id}" aria-haspopup="menu" aria-expanded="${o}" aria-label="More actions">${icon('more')}</button>`; };
const eCheck = (on, act, id, label) => `<button class="ck-c ${on ? 'on' : ''}" data-act="${act}" data-id="${id}" role="checkbox" aria-checked="${!!on}" aria-label="${eEsc(label)}">${on ? icon('check') : ''}</button>`;

function eDue(iso, done) {
  if (done) return `<span class="due">${eShort(iso)}</span>`;
  const d = eDate(iso), T = eToday();
  if (d < T) return `<span class="due late"><span class="bang" aria-hidden="true">!</span>${eShort(iso)}</span>`;
  if (+d === +T) return `<span class="due today">${icon('clock')}${eShort(iso)}</span>`;
  return `<span class="due">${eShort(iso)}</span>`;
}
const eDD = (iso, done) => { const d = eDate(iso), T = eToday(); return `<span class="dd ${!done && d < T ? 'late' : !done && +d === +T ? 'today' : ''}">${eShort(iso)}</span>`; };

function ePager(p, total) {
  const F = E.f[p], per = +F.per, pages = Math.max(1, Math.ceil(total / per)), pg = Math.min(F.page, pages), from = total ? (pg - 1) * per + 1 : 0, to = Math.min(pg * per, total);
  return `<span class="sp"></span><label>Items per page: <select data-eos-f="${p}.per" aria-label="Items per page">${['10', '25', '50', '100'].map(v => `<option ${F.per === v ? 'selected' : ''}>${v}</option>`).join('')}</select></label><span>${from} - ${to} of ${total}</span><button class="mini" data-act="eos-page" data-id="${p}:-1" ${pg <= 1 ? 'disabled' : ''} aria-label="Previous page">${eIc('chev', 'flip')}</button><button class="mini" data-act="eos-page" data-id="${p}:1" ${pg >= pages ? 'disabled' : ''} aria-label="Next page">${eIc('chev', '')}</button>`;
}
const eSlice = (p, rows) => { const F = E.f[p], per = +F.per, pages = Math.max(1, Math.ceil(rows.length / per)), pg = Math.min(F.page, pages); F.page = pg; return rows.slice((pg - 1) * per, pg * per); };

/* ---------- My 90 (overview) ---------- */
function eTodoLi(t) {
  return `<div class="e-li">${eCheck(t.done, 'eos-todo-done', t.id, (t.done ? 'Mark not done: ' : 'Mark done: ') + t.name)}<span class="t ${t.done ? 'done' : ''}">${eEsc(t.name)}</span>${eDue(t.due, t.done)}${eMenuBtn('todo', t.id)}</div>`;
}

function eosMy90() {
  const F = E.f.my, tf = x => F.team === 'All Teams' || x.team === F.team;
  const team = eTodos.filter(t => !t.priv && !t.archived && tf(t)).sort(eByDue);
  const priv = eTodos.filter(t => t.priv && (t.owner === EOS_ME || !EOS_ME || EOS_ME === 'Administrator') && !t.archived && (F.priv === 'All' || !t.done) && tf(t)).sort(eByDue);
  const myRocks = eRocks.filter(r => !r.archived && (r.owner === EOS_ME || !EOS_ME || EOS_ME === 'Administrator') && tf(r) && (F.rocks === 'All' || r.status === F.rocks));
  const rocks = myRocks.length ? myRocks : eRocks.filter(r => !r.archived && tf(r) && (F.rocks === 'All' || r.status === F.rocks));
  const myMeas = eMeas.filter(m => m.freq === 'weekly' && (m.owner === EOS_ME || !EOS_ME || EOS_ME === 'Administrator') && tf(m)), per = ePeriods('weekly', 6);
  const mine = myMeas.length ? myMeas : eMeas.filter(m => m.freq === 'weekly' && tf(m));
  const hasDone = team.some(t => t.done);
  const rk = r => `<div class="e-li"><span class="e-st ${r.status === 'On-track' ? 'on' : r.status === 'Off-track' ? 'off' : 'done'}" title="${r.status}">${icon(r.status === 'Off-track' ? 'thumbdown' : r.status === 'Done' ? 'check' : 'thumbup')}<span>${r.status}</span></span><span class="t">${eEsc(r.name)}</span>${eDD(r.end, r.status === 'Done')}</div>`;

  return eHead('My 90', 'A personalized workspace to view tasks, data, goals, and more directly from ERP.', eCreate('Create To-Do')) +
   `<div class="fbar">${eSel('my', 'team', 'Team', eTeams(), F.team)}</div>
   <div class="my3">
    <section class="panel"><div class="pnl-h"><h2>Team To-Dos<span class="pcount">${team.length}</span></h2><button class="btn" data-act="eos-archive-done" ${hasDone ? '' : 'disabled'} style="${hasDone ? '' : 'opacity:.5;cursor:default'}">Archive completed</button></div>
      <div class="lst">${team.length ? team.map(eTodoLi).join('') : '<div class="none">No team To-Dos found in ERP.</div>'}</div>
      <div class="foot"><button class="addlink" data-act="eos-add-todo">${icon('plus')}Create To-Do</button></div></section>
    <section class="panel"><div class="pnl-h"><h2>Private To-Dos<span class="pcount">${priv.length}</span></h2>${eSel('my', 'priv', 'Show', ['Incomplete', 'All'], F.priv, 'sm')}</div>
      <div class="lst">${priv.length ? priv.map(eTodoLi).join('') : '<div class="none">No private To-Dos.</div>'}</div>
      <div class="foot"><button class="addlink" data-act="eos-add-todo" data-id="private">${icon('plus')}Add To-Do</button></div></section>
    <section class="panel"><div class="pnl-h"><h2>Rocks &amp; Milestones<span class="pcount">${rocks.length}</span></h2>${eSel('my', 'rocks', 'Status', ['All', 'On-track', 'Off-track'], F.rocks, 'sm')}</div>
      <div class="lst">${rocks.length ? rocks.map(rk).join('') : '<div class="none">No Rocks found for your user.</div>'}</div>
      <div class="foot"><button class="addlink" data-act="eos-add-rock" data-id="${eEsc(EOS_ME)}">${icon('plus')}Create Rock</button></div></section>
   </div>
   <section class="panel sc mym" style="margin-top:16px"><div class="pnl-h"><h2>My Measurables<span class="pcount">${mine.length}</span></h2></div>
    ${mine.length ? `<div class="scroll"><table><thead><tr><th class="mn" style="left:0;box-shadow:none">Title</th><th>Goal</th><th>Average</th><th>Total</th>${per.map((p, i) => `<th class="${i ? '' : 'cur'}">${i ? '' : 'Current Week<small>'}${p}${i ? '' : '</small>'}</th>`).join('')}</tr></thead><tbody>
    ${mine.map(m => {
      const v = (m.vals || []).slice(0, 6).filter(x => x != null), avg = v.length ? v.reduce((a, b) => a + b, 0) / v.length : null, tot = v.length && !m.noTotal ? v.reduce((a, b) => a + b, 0) : null;
      return `<tr><td class="mn" style="left:0;box-shadow:none">${eEsc(m.name)}</td><td class="g">${m.op} ${eU(m, m.target)}</td><td class="g">${avg == null ? '–' : eU(m, avg)}</td><td class="g">${tot == null ? '–' : eU(m, tot)}</td>${per.map((_, i) => { const x = (m.vals || [])[i]; return x == null ? '<td class="cell na">–</td>' : `<td class="cell ${ePass(m, x) ? 'ok' : 'bad'}" style="cursor:default">${m.unit === 'pct' ? eN(x) + '%' : eN(x)}</td>`; }).join('')}</tr>`;
    }).join('')}</tbody></table></div>`
    : '<div class="none">No measurables assigned to you in ERP.</div>'}</section>`;
}

/* ---------- Scorecard (DocType List Matching ERP Desk) ---------- */
function eosScorecard() {
  const F = E.f.scorecard;
  const timeframes = ['All', 'Weekly', 'Monthly', 'Quarterly', 'Annual'];

  let rows = eScorecards.filter(sc => {
    const matchTeam = (F.team === 'All Teams' || sc.team === F.team);
    const matchTf = (F.timeframe === 'All' || sc.timeframe === F.timeframe);
    const qId = (F.q_id || '').trim().toLowerCase();
    const matchId = !qId || (sc.name || sc.id || '').toLowerCase().includes(qId);
    const matchQ = eQ((sc.name || '') + ' ' + (sc.team || '') + ' ' + (sc.timeframe || ''));
    return matchTeam && matchTf && matchId && matchQ;
  });

  if (F.sort === 'Team') {
    rows.sort((a, b) => (a.team || '').localeCompare(b.team || ''));
  } else if (F.sort === 'Timeframe') {
    rows.sort((a, b) => (a.timeframe || '').localeCompare(b.timeframe || ''));
  } else if (F.sort === 'ID') {
    rows.sort((a, b) => (a.name || a.id || '').localeCompare(b.name || b.id || ''));
  }

  const allCount = eScorecards.length;
  const visCount = rows.length;
  const allSelected = rows.length > 0 && rows.every(r => S.sel && S.sel.has(r.id));

  const head = `<div class="ph desk-ph" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;padding:2px 0">
    <div style="display:flex;align-items:center;gap:8px">
      <span style="font-size:16px;color:var(--ink-2);cursor:pointer" data-act="home" title="Home">🏠</span>
      <span style="color:var(--ink-3);font-size:14px">/</span>
      <h1 style="font-size:18px;font-weight:700;color:var(--g900);margin:0">Scorecard</h1>
    </div>
    <div style="display:flex;align-items:center;gap:8px">
      <button class="btn sec" style="height:32px;font-size:12.5px;padding:0 10px;border-radius:6px;border:1px solid var(--line-2)">List View ↕</button>
      <button class="btn sec" style="height:32px;font-size:12.5px;padding:0 10px;border-radius:6px;border:1px solid var(--line-2)">Saved Filters ↕</button>
      <button class="icon-btn" data-act="eos-refresh" title="Reload from ERP" style="width:32px;height:32px;border:1px solid var(--line-2);border-radius:6px">🔄</button>
      <button class="icon-btn" title="More options" style="width:32px;height:32px;border:1px solid var(--line-2);border-radius:6px">···</button>
      <button class="btn primary" data-act="create" style="height:32px;font-size:13px;padding:0 14px;border-radius:6px;font-weight:600;background:var(--g900);color:#fff">${icon('plus')}Add Scorecard</button>
    </div>
  </div>`;

  const bar = `<div class="fbar sc-fbar" style="display:flex;align-items:center;gap:10px;padding:8px 0;margin-bottom:14px;flex-wrap:wrap">
    <div class="sc-input-box" style="position:relative;display:inline-flex;align-items:center">
      <input class="field sc-id-in" style="height:32px;width:130px;padding:0 24px 0 10px;font-size:12.5px;border-radius:6px;background:var(--g50)" placeholder="ID" value="${eEsc(F.q_id || '')}" data-eos-f="scorecard.q_id">
      <span style="position:absolute;right:8px;color:var(--ink-3);font-size:14px;pointer-events:none">≈</span>
    </div>
    <div class="sc-input-box">
      <select class="field sc-team-sel" style="height:32px;padding:0 10px;font-size:12.5px;border-radius:6px;background:var(--g50);min-width:140px" data-eos-f="scorecard.team">
        <option value="All Teams">Team</option>
        ${EOS_TEAMS.map(t => `<option value="${eEsc(t)}" ${F.team === t ? 'selected' : ''}>${eEsc(t)}</option>`).join('')}
      </select>
    </div>
    <div class="sc-input-box">
      <select class="field sc-tf-sel" style="height:32px;padding:0 10px;font-size:12.5px;border-radius:6px;background:var(--g50);min-width:120px" data-eos-f="scorecard.timeframe">
        <option value="All">Timeframe</option>
        ${['Weekly', 'Monthly', 'Quarterly', 'Annual'].map(tf => `<option value="${tf}" ${F.timeframe === tf ? 'selected' : ''}>${tf}</option>`).join('')}
      </select>
    </div>
    <button class="btn sec" data-act="eos-sc-clear-f" style="height:32px;font-size:12px;padding:0 10px;border-radius:6px;border:1px solid var(--line-2);color:var(--ink-2)">Filter ✕</button>
    <div style="flex:1"></div>
    <div class="sc-input-box">
      <select class="field sc-sort-sel" style="height:32px;padding:0 10px;font-size:12px;border-radius:6px;border:1px solid var(--line-2);background:transparent" data-eos-f="scorecard.sort">
        <option value="Created On" ${F.sort === 'Created On' ? 'selected' : ''}>Created On ⌄</option>
        <option value="Team" ${F.sort === 'Team' ? 'selected' : ''}>Team</option>
        <option value="Timeframe" ${F.sort === 'Timeframe' ? 'selected' : ''}>Timeframe</option>
        <option value="ID" ${F.sort === 'ID' ? 'selected' : ''}>ID</option>
      </select>
    </div>
    <span style="font-size:12.5px;color:var(--ink-3);font-weight:500;padding:0 4px">${visCount} of ${allCount}</span>
    <button class="icon-btn" data-act="eos-sc-fav-all" title="Favorites" style="width:30px;height:30px;color:var(--ink-3);font-size:14px">♡</button>
  </div>`;

  const body = `<div class="panel desk-panel" style="border:1px solid var(--line);border-radius:8px;overflow:hidden;background:#fff">
    <div class="scroll">
      <table class="eos-t desk-table" style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="background:#F8FAFC;border-bottom:1px solid var(--line)">
            <th class="ck" style="width:44px;padding:10px 14px;text-align:left"><input type="checkbox" data-act="eos-sc-sel-all" ${allSelected ? 'checked' : ''} aria-label="Select all scorecards"></th>
            <th style="font-weight:600;font-size:13px;color:var(--ink-2);text-align:left;padding:10px 14px">Team</th>
            <th style="font-weight:600;font-size:13px;color:var(--ink-2);text-align:left;padding:10px 14px">Timeframe</th>
            <th style="font-weight:600;font-size:13px;color:var(--ink-2);text-align:left;padding:10px 14px">ID</th>
            <th style="text-align:right;font-weight:600;font-size:13px;color:var(--ink-2);padding:10px 24px 10px 14px"></th>
          </tr>
        </thead>
        <tbody>
          ${rows.length ? rows.map(sc => {
            const isSel = S.sel && S.sel.has(sc.id);
            return `<tr data-act="eos-open-sc" data-id="${eEsc(sc.name || sc.id)}" style="cursor:pointer;border-bottom:1px solid var(--line)" class="${isSel ? 'sel' : ''}">
              <td class="ck" style="width:44px;padding:10px 14px" onclick="event.stopPropagation()">
                <input type="checkbox" data-act="eos-sc-sel-row" data-id="${eEsc(sc.id)}" ${isSel ? 'checked' : ''} aria-label="Select ${eEsc(sc.id)}">
              </td>
              <td class="strong" style="font-weight:600;color:var(--g900);padding:10px 14px">${eEsc(sc.team)}</td>
              <td style="padding:10px 14px"><span class="tf-badge tf-${eEsc((sc.timeframe || '').toLowerCase())}"><span class="dot"></span>${eEsc(sc.timeframe)}</span></td>
              <td style="color:var(--ink-2);font-size:13px;padding:10px 14px">${eEsc(sc.name || sc.id)}</td>
              <td style="text-align:right;color:var(--ink-3);font-size:12px;white-space:nowrap;padding:10px 24px 10px 14px" onclick="event.stopPropagation()">
                <span>${eRelTime(sc.modified)}</span> &nbsp;&nbsp;&nbsp;
                <span title="Comments" style="cursor:pointer">💬 0</span> &nbsp;&nbsp;&nbsp;
                <span title="Favorite" data-act="eos-sc-fav" data-id="${eEsc(sc.id)}" style="cursor:pointer;font-size:13px">♡</span>
              </td>
            </tr>`;
          }).join('') : `<tr><td colspan="5" style="text-align:center;padding:36px;color:var(--ink-3)">No scorecards match the current filters.</td></tr>`}
        </tbody>
      </table>
    </div>
    <div class="desk-foot" style="padding:10px 16px;background:#fff;border-top:1px solid var(--line);display:flex;align-items:center;justify-content:space-between">
      <div style="display:flex;align-items:center;gap:4px">
        ${['20', '100', '500', '2500'].map(sz => `<button class="btn sec" data-act="eos-sc-size" data-id="${sz}" style="height:26px;padding:0 8px;font-size:11.5px;border-radius:4px;border:1px solid var(--line-2);${(F.per || '20') === sz ? 'background:var(--g200);font-weight:700' : 'background:#fff'}">${sz}</button>`).join('')}
      </div>
      <div style="color:var(--ink-3);font-size:12.5px;font-weight:500">
        ${visCount} of ${allCount}
      </div>
    </div>
  </div>`;

  return head + bar + body;
}

/* ---------- Rocks ---------- */
function eRockRow(r, own) {
  const open = E.openRock.has(r.id), has = r.ms && r.ms.length > 0, done = has ? r.ms.filter(m => m.done).length : 0, cols = own ? 7 : 6;
  const cls = r.status === 'On-track' ? 'on' : r.status === 'Off-track' ? 'off' : 'done', ic = r.status === 'Off-track' ? 'thumbdown' : r.status === 'Done' ? 'check' : 'thumbup';
  let h = `<tr><td class="ck">${has || open ? `<button class="icon-btn" data-act="eos-rock-open" data-id="${r.id}" aria-expanded="${open}" aria-label="${open ? 'Hide' : 'Show'} milestones">${icon(open ? 'down' : 'chev')}</button>` : ''}</td>
   <td><span class="e-st ${cls}">${icon(ic)}${r.status}</span></td>
   <td class="tl strong">${eEsc(r.name)}${!own && r.company ? '<span class="e-tag">Company Rock</span>' : ''}</td>
   <td>${has ? `<span class="e-prog"><span class="e-bar"><i style="width:${done / r.ms.length * 100}%"></i></span>${done}/${r.ms.length}</span>` : ''}</td>
   ${own ? `<td>${eAv(r.owner)}</td>` : ''}<td>${eDD(r.end, r.status === 'Done')}</td><td class="act">${eMenuBtn('rock', r.id)}</td></tr>`;
  if (open) {
    if (r.ms) {
      r.ms.forEach((m, i) => { h += `<tr class="msr"><td class="ck"></td><td>${eCheck(m.done, 'eos-ms-toggle', r.id + ':' + i, (m.done ? 'Mark not done: ' : 'Mark done: ') + m.t)}</td><td colspan="2" class="${m.done ? 'dd' : ''}">${eEsc(m.t)}</td>${own ? `<td>${eAv(m.owner || r.owner)}</td>` : ''}<td>${eDD(m.due || r.end, m.done)}</td><td class="act">${eMenuBtn('ms', r.id + ':' + i)}</td></tr>`; });
    }
    h += `<tr class="msr add"><td class="ck"></td><td colspan="${cols - 1}"><input class="field" data-eos-ms="${r.id}" placeholder="Add a milestone and press Enter (saves to Rock Milestone)" aria-label="Add milestone"></td></tr>`;
  }
  return h;
}

function eRockGroup(key, title, lead, rocks, o) {
  const open = !E.collapsed.has(key);
  const head = `<thead><tr><th class="ck"></th><th>Status</th><th>Title</th><th>Milestone progress</th>${o.own ? '<th>Owner</th>' : ''}<th>Due by</th><th class="act"></th></tr></thead>`;
  return `<section class="panel"><button class="gh" data-act="eos-grp" data-id="${eEsc(key)}" aria-expanded="${open}">${lead}<b>${eEsc(title)}</b><span class="pcount">${rocks.length}</span>${eIc('down', 'chev')}</button>
   ${open ? `${rocks.length ? `<div class="scroll"><table class="eos-t">${head}<tbody>${rocks.map(r => eRockRow(r, o.own)).join('')}</tbody></table></div>` : `<div class="none">${o.empty}</div>`}<button class="addrow" data-act="eos-add-rock" data-id="${eEsc(o.owner)}">${icon('plus')}Add Rock</button>` : ''}</section>`;
}

function eosRocks() {
  const F = E.f.rocks, tab = E.tab.rocks;
  const rs = eRocks.filter(r => eMatch(r, F) && (F.status === 'All' || r.status === F.status) && eQ(r.name + ' ' + r.owner) && r.archived === (tab === 'archive'));
  let body = '';
  if (tab === 'list') {
    const owners = [...new Set([...rs.map(r => r.owner), ...(F.people ? EOS_PEOPLE : [])])].sort((a, b) => EOS_PEOPLE.indexOf(a) - EOS_PEOPLE.indexOf(b));
    body = `<div class="eos-col stack"><section class="panel"><button class="vto" data-act="eos-vto" aria-expanded="${E.vto}"><span class="ic">${icon('file')}</span>V/TO® | Revenue, Profit, Measurables (Live DocType)${eIc('down', 'chev')}</button>
     ${E.vto ? `<div class="vto-body">${[['rev', 'Revenue goal'], ['profit', 'Profit goal'], ['meas', 'Key measurables']].map(([k, l]) => `<div><label for="v-${k}">${l}</label><input class="field" id="v-${k}" data-eos-vto="${k}" value="${eEsc(E.vtoV[k])}" placeholder="Not set"></div>`).join('')}</div>` : ''}</section>
     ${eRockGroup('company', 'Company Rocks', `<span class="gi">${icon('users')}</span>`, rs.filter(r => r.company), { own: true, empty: 'No Company Rocks found in ERP.', owner: 'company' })}
     ${owners.map(o => eRockGroup('p:' + o, o, eAv(o, 'md'), rs.filter(r => r.owner === o), { own: false, empty: 'No Rocks for this person yet.', owner: o })).join('')}</div>`;
  } else if (tab === 'board') {
    body = `<div class="board">${['On-track', 'Off-track', 'Done'].map(s => {
      const c = rs.filter(r => r.status === s);
      return `<section class="col"><h4>${s}<span>${c.length}</span></h4>${c.map(r => `<div class="card"><small>${r.company ? 'Company Rock' : eEsc(r.team)}</small><strong>${eEsc(r.name)}</strong><p>Due ${eShort(r.end)} · ${r.ms ? r.ms.filter(m => m.done).length : 0}/${r.ms ? r.ms.length : 0} milestones</p><div class="by">${eAv(r.owner, '')}</div></div>`).join('')}</section>`;
    }).join('')}</div>`;
  } else {
    body = `<div class="eos-col">${rs.length ? `<div class="panel"><div class="scroll"><table class="eos-t"><thead><tr><th>Title</th><th>Owner</th><th>Due by</th><th class="act"></th></tr></thead><tbody>${rs.map(r => `<tr><td class="strong tl">${eEsc(r.name)}</td><td>${eAv(r.owner)}</td><td>${eDD(r.end, true)}</td><td class="act"><button class="mini" data-act="eos-rock-st" data-id="${r.id}:archive">Restore</button></td></tr>`).join('')}</tbody></table></div></div>`
      : `<div class="panel"><div class="empty"><div class="eic">${icon('mountain')}</div><h3>No archived Rocks</h3><p>Archived Rock documents are retrieved from ERP.</p></div></div>`}</div>`;
  }
  return eHead('Rocks', 'Set and track quarterly goals, saved directly to the Rock DocType.', eCreate('Add Rock')) +
   eTabs('rocks', [['list', 'List'], ['board', 'Planning Board'], ['archive', 'Archive']]) +
   `<div class="fbar">${eSel('rocks', 'team', 'Team', eTeams(), F.team)}${eSel('rocks', 'owner', 'Owner', eOwners(), F.owner)}${eSel('rocks', 'status', 'Status', ['All', 'On-track', 'Off-track', 'Done'], F.status)}${tab === 'list' ? eTog('rocks.people', 'Show people without Rocks', F.people) : ''}<div class="grow">${eSearch('Search Rocks')}</div></div>` + body;
}

/* ---------- To-Dos ---------- */
function eosTodos() {
  const F = E.f.todos, tab = E.tab.todos;
  const rs = eTodos.filter(t => eMatch(t, F) && t.archived === F.arch && (tab === 'private' ? t.priv && t.owner === EOS_ME : !t.priv) && eQ(t.name)).sort(eByDue);
  const vis = eSlice('todos', rs);
  return eHead('To-Dos', 'Live tasks fetched and synced directly with Frappe To Do DocType.', eCreate('Create To-Do')) +
   eTabs('todos', [['team', 'Team'], ['private', 'Private']]) +
   `<div class="fbar">${eSel('todos', 'team', 'Team', eTeams(), F.team)}${eSel('todos', 'owner', 'Owner', eOwners(), F.owner)}${eTog('todos.arch', 'Archive', F.arch)}<div class="grow">${eSearch('Search To-Dos')}</div></div>
   <div class="eos-col"><div class="panel"><div class="pnl-h"><h2>${tab === 'private' ? 'Private To-Dos' : 'Team To-Dos'}<span class="pcount">${rs.length}</span></h2></div>
   ${vis.length ? `<div class="scroll"><table class="eos-t"><thead><tr><th class="ck"></th><th>Title</th><th>Due by</th><th>Owner</th><th class="act"></th></tr></thead><tbody>
   ${vis.map(t => `<tr><td class="ck">${eCheck(t.done, 'eos-todo-done', t.id, (t.done ? 'Mark not done: ' : 'Mark done: ') + t.name)}</td><td class="tdn ${t.done ? 'done' : ''}">${eEsc(t.name)}</td><td>${eDue(t.due, t.done)}</td><td>${eAv(t.owner)}</td><td class="act">${eMenuBtn('todo', t.id)}</td></tr>`).join('')}</tbody></table></div>`
   : `<div class="empty"><div class="eic">${icon('checksq')}</div><h3>${F.arch ? 'No archived To-Dos' : 'No To-Dos found in ERP'}</h3><p>${F.arch ? 'Archived documents will appear here.' : 'Create a To-Do to save it directly to the To Do DocType.'}</p></div>`}
   <div class="pager"><button class="addlink" data-act="create">${icon('plus')}Create To-Do</button>${ePager('todos', rs.length)}</div></div></div>`;
}

/* ---------- Issues ---------- */
const ePriRank = { Critical: 0, High: 1, Medium: 2, Low: 3, '': 4 };
function eosIssues() {
  const F = E.f.issues, tab = E.tab.issues;
  const rs = eIssues.filter(i => eMatch(i, F) && i.term === tab && i.archived === F.arch && eQ(i.name)).sort((a, b) => ePriRank[a.pri] - ePriRank[b.pri] || String(a.raised || '').localeCompare(String(b.raised || '')) || a.id - b.id);
  const vis = eSlice('issues', rs), off = (F.page - 1) * (+F.per);
  const body = rs.length ? `<div class="panel"><div class="pnl-h"><h2>${tab === 'short' ? 'Short-Term' : 'Long-Term'}<span class="pcount">${rs.length}</span></h2></div><div class="scroll"><table class="eos-t"><thead><tr><th class="ck"></th><th>Title</th><th>Priority</th><th>Created</th><th>Owner</th><th class="act"></th></tr></thead><tbody>
   ${vis.map((i, k) => `<tr><td class="ck">${eCheck(i.archived, 'eos-issue-done', i.id, (i.archived ? 'Reopen: ' : 'Solve: ') + i.name)}</td><td class="tdn ${i.archived ? 'done' : ''}"><button class="link" style="padding:0;color:inherit;font-weight:600;text-align:left;background:none;border:none;cursor:pointer" data-act="eos-edit-issue" data-id="${i.id}">${off + k + 1}. ${eEsc(i.name)}</button></td>
   <td><select class="pri" data-eos-pri="${i.id}" aria-label="Priority">${['', 'High', 'Medium', 'Low', 'Critical'].map(p => `<option value="${p}" ${i.pri === p ? 'selected' : ''}>${p || 'None'}</option>`).join('')}</select></td><td class="muted-s">${eShort(i.raised)}</td><td>${eAv(i.owner)}</td><td class="act">${eMenuBtn('issue', i.id)}</td></tr>`).join('')}</tbody></table></div>
   <div class="pager"><button class="addlink" data-act="create">${icon('plus')}Add Issue</button>${ePager('issues', rs.length)}</div></div>`
   : `<div class="empty"><div class="eic">${icon('alert')}</div><h3>${F.arch ? 'No archived issues' : "No Issues found in ERP."}</h3><p>${F.arch ? 'Solved issues are stored in ERP.' : 'Add an Issue to save it directly to the Issue DocType.'}</p>${F.arch ? '' : `<button class="btn primary" data-act="create">Add Issue</button>`}</div>`;
  return eHead('Issues', 'Identify, prioritize and solve issues directly within Frappe Issue DocType.', eCreate('Add Issue')) +
   eTabs('issues', [['short', 'Short-Term'], ['long', 'Long-Term']]) +
   `<div class="fbar">${eSel('issues', 'team', 'Team', eTeams(), F.team)}${eSel('issues', 'owner', 'Owner', eOwners(), F.owner)}${eTog('issues.arch', 'Archive', F.arch)}<div class="grow">${eSearch('Search Issues')}</div></div><div class="eos-col">${body}</div>`;
}

/* ---------- Meetings ---------- */
const eDur = s => s < 60 ? s + ' sec' : s < 3600 ? Math.round(s / 60) + ' min' : Math.floor(s / 3600) + ' hr ' + Math.round(s % 3600 / 60) + ' min';
function eosMeet() {
  const F = E.f.meet, tab = E.tab.meet;
  const head = eHead('Meetings', 'Level 10 Meeting™ integration with Frappe Level 10 Meeting DocType.', eCreate('Schedule Meeting'));
  const tabs = eTabs('meet', [['upcoming', 'Upcoming'], ['past', 'Past Meetings'], ['agenda', 'Agendas']]);
  const bar = `<div class="fbar">${tab === 'agenda' ? '' : eSel('meet', 'team', 'Team', eTeams(), F.team)}<div class="grow"><button class="btn" data-act="eos-print">${icon('printer')}Print Meeting Agenda</button></div></div>`;
  let body = '';
  if (tab === 'upcoming') {
    const up = E.upcoming.filter(m => F.team === 'All Teams' || m.team === F.team);
    const hero = E.live ? `<div class="panel hero"><span class="e-st done">In progress</span><h2>${eEsc(E.live.title)}</h2><div class="row"><button class="btn" data-act="eos-tab" data-id="meet:agenda">View agenda</button><button class="btn primary" data-act="eos-meet-end">End meeting &amp; Save</button></div><p class="muted-s" style="margin-top:16px">Started ${new Date(E.live.start).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}</p></div>`
      : `<div class="panel hero"><small>${F.team === 'All Teams' ? (EOS_TEAMS[0] || 'Team') : F.team}</small><h2>No Meetings in progress</h2><div class="row"><button class="btn primary" data-act="eos-meet-start">${icon('play')}Start a Meeting</button><button class="btn" data-act="create">${icon('calendar')}Schedule a Meeting</button></div></div>`;
    body = hero + `<section class="panel" style="margin-top:16px"><div class="pnl-h"><h2>Upcoming Meetings<span class="pcount">${up.length}</span></h2></div>${up.length ? up.map(m => `<div class="mrow"><div><b>${eEsc(m.title)}</b><small>${eEsc(m.team)}</small></div><span class="sp"></span><span>${eShort(m.date)}${m.time ? ' · ' + eEsc(m.time) : ''}</span></div>`).join('')
      : `<div class="empty"><div class="eic">${icon('chat')}</div><h3>No scheduled meetings in ERP yet.</h3><p>Start a meeting to record it to the database.</p></div>`}</section>`;
  } else if (tab === 'past') {
    const ps = E.past.filter(m => F.team === 'All Teams' || m.team === F.team), vis = eSlice('meet', ps);
    body = `<section class="panel"><div class="pnl-h"><h2>Meeting History (From ERP DocTypes)<span class="pcount">${ps.length}</span></h2></div><div class="pnl-sub">All completed Level 10 Meetings recorded in the database.</div>${ps.length ? `<div class="scroll"><table class="eos-t"><thead><tr><th>Date</th><th>Agenda</th><th>Duration</th><th>Facilitator</th><th>Rating</th></tr></thead><tbody>
      ${vis.map(m => `<tr><td><b>${eShort(m.when)}</b><div class="muted-s">${eEsc(m.time)}</div></td><td>${eEsc(m.title)}</td><td>${eDur(m.secs)}</td><td>${eAv(m.fac)}</td><td>${m.rating == null ? '–' : m.rating}</td></tr>`).join('')}</tbody></table></div><div class="pager">${ePager('meet', ps.length)}</div>`
      : `<div class="empty"><div class="eic">${icon('chat')}</div><h3>No past meetings recorded in ERP yet.</h3><p>Meetings you conclude will be saved to Level 10 Meeting DocType.</p></div>`}</section>`;
  } else {
    body = `<section class="panel"><div class="pnl-h"><h2>Level 10 Meeting™ agenda<span class="pcount">90 min</span></h2></div>${AGENDA.map(a => `<div class="mrow"><div><b>${a[0]}</b><small>${a[1]}</small></div><span class="sp"></span><span class="muted-s">${a[2]} min</span></div>`).join('')}</section>`;
  }
  return head + tabs + bar + `<div class="eos-col">${body}</div>`;
}

/* ---------- entry point ---------- */
function renderEos() {
  const fn = { overview: eosMy90, scorecard: eosScorecard, rocks: eosRocks, 'to-dos': eosTodos, issues: eosIssues, meetings: eosMeet }[S.page];
  const m = $('#main');
  if (m) m.innerHTML = fn ? fn() : '';
  if (E.menu) eRenderMenu();
  const c = $('[data-eos-cell]'); if (c) { c.focus(); c.select(); }
  if (E.focusMs) { const el = $(`[data-eos-ms="${E.focusMs}"]`); if (el) el.focus(); E.focusMs = null; }
}

/* ---------- floating row menu ---------- */
function eMenuItems(t, id) {
  if (t === 'todo') { const x = eTodos.find(a => a.id === +id); return x && [['Edit', 'eos-edit-todo', id], [x.archived ? 'Restore' : 'Archive', 'eos-todo-arch', id]]; }
  if (t === 'issue') { const x = eIssues.find(a => a.id === +id); return x && [['Edit', 'eos-edit-issue', id], [x.archived ? 'Restore' : 'Archive', 'eos-issue-arch', id]]; }
  if (t === 'rock') { const r = eRocks.find(a => a.id === +id); return r && [...['On-track', 'Off-track', 'Done'].filter(s => s !== r.status).map(s => ['Mark ' + s.toLowerCase(), 'eos-rock-st', id + ':' + s]), ['Add milestone', 'eos-ms-add', id], [r.archived ? 'Restore' : 'Archive', 'eos-rock-st', id + ':archive']]; }
  if (t === 'ms') return [['Delete milestone', 'eos-ms-del', id]];
}

function eRenderMenu() {
  const m = E.menu, items = eMenuItems(m.t, m.id); if (!items) { E.menu = null; return; }
  const h = items.length * 38 + 12, y = (m.y + h + 8 > innerHeight) ? m.top - h - 4 : m.y + 4, x = Math.max(8, Math.min(m.x - 196, innerWidth - 204));
  const main = $('#main');
  if (main) main.insertAdjacentHTML('beforeend', `<div class="e-menu" role="menu" data-menu style="left:${x}px;top:${y}px">${items.map(([l, a, i]) => `<button role="menuitem" data-act="${a}" data-id="${i}">${l}</button>`).join('')}</div>`);
}

/* ---------- drawer forms & DB persistence ---------- */
function eosForm(title, fields, save) {
  E.form = { fields, save };
  const fh = (f, i) => f.t === 'select' ? `<select class="field" id="d${i}">${f.o.map(o => Array.isArray(o) ? o : [o, o]).map(([v, l]) => `<option value="${eEsc(v)}" ${String(f.v) === String(v) ? 'selected' : ''}>${eEsc(l)}</option>`).join('')}</select>`
    : f.t === 'textarea' ? `<textarea class="field" id="d${i}" placeholder="${eEsc(f.ph || '')}">${eEsc(f.v || '')}</textarea>`
    : `<input class="field" id="d${i}" type="${f.t || 'text'}" value="${eEsc(f.v == null ? '' : f.v)}" placeholder="${eEsc(f.ph || '')}">`;
  $('#drawer').innerHTML = `<header><h2>${title}</h2><button class="icon-btn" data-act="close" aria-label="Close">${icon('x')}</button></header>
   <div class="body">${fields.map((f, i) => `<div class="f"><label for="d${i}">${f.l}${f.req ? ' *' : f.opt ? ' (optional)' : ''}</label>${fh(f, i)}<div class="err">${f.l} is required.</div></div>`).join('')}</div>
   <footer><button class="btn" data-act="close">Cancel</button><button class="btn primary" data-act="save">Save to ERP</button></footer>`;
  document.body.classList.add('drawer-open'); $('#drawer').setAttribute('aria-hidden', 'false');
  setTimeout(() => { const x = $('#drawer .field'); x && x.focus(); }, 230);
}

function eosSave() {
  if (!E.form) return closeDrawer();
  const vals = {}; let bad = false;
  E.form.fields.forEach((f, i) => { const el = $('#d' + i), v = el.value.trim(), empty = f.req && !v; el.closest('.f').classList.toggle('bad', empty); if (empty) bad = true; vals[f.k] = f.t === 'number' ? (v === '' ? 0 : Number(v)) : v; });
  if (bad) return;
  E.form.save(vals); closeDrawer(); E.form = null; renderMain();
}

const eOps = [['>=', 'Greater than or equal to goal'], ['<=', 'Less than or equal to goal'], ['=', 'Equal to goal'], ['>', 'Greater than goal'], ['<', 'Less than goal']];

function eosDrawer(kind, rec, pre) {
  const own = v => ({ t: 'select', o: EOS_PEOPLE, v: v || EOS_ME }), team = v => ({ t: 'select', o: EOS_TEAMS, v: v || EOS_TEAMS[0] });
  const p = kind || ({ overview: 'to-dos', scorecard: 'scorecard', rocks: 'rocks', 'to-dos': 'to-dos', issues: 'issues', meetings: 'meetings' }[S.page]);
  const r = rec || {}, q = pre || {};
  if (p === 'scorecard') {
    return eosForm('Add Scorecard in ERP', [
      { k: 'team', l: 'Team', req: true, ...team(E.f.scorecard.team === 'All Teams' ? null : E.f.scorecard.team) },
      { k: 'timeframe', l: 'Timeframe', req: true, t: 'select', o: [['Weekly', 'Weekly'], ['Monthly', 'Monthly'], ['Quarterly', 'Quarterly'], ['Annual', 'Annual']] },
      { k: 'desc', l: 'Description', opt: true, t: 'textarea' }
    ], async v => {
      const id = `${v.team}-${v.timeframe}`;
      if (!eScorecards.some(s => s.id === id)) {
        eScorecards.unshift({ id, name: id, team: v.team, timeframe: v.timeframe, description: v.desc, modified: 'Just now' });
      }
      toast('Saving Scorecard to ERP...');
      renderMain();
      await apiCall('eos_core.eos_api.save_scorecard', { team: v.team, timeframe: v.timeframe, description: v.desc });
      toast('Scorecard saved in Frappe DB!');
    });
  }
  else if (p === 'rocks') {
    const o = q.owner;
    eosForm('Create Rock in ERP', [{ k: 'type', l: 'Rock type', t: 'select', o: [['personal', 'Individual Rock'], ['company', 'Company Rock']], v: o === 'company' ? 'company' : 'personal' },
      { k: 'name', l: 'Title', req: true, ph: 'Add a title for the Rock' }, { k: 'team', l: 'Team', ...team(E.f.rocks.team === 'All Teams' ? null : E.f.rocks.team) },
      { k: 'owner', l: 'Owner', ...own(o && o !== 'company' ? o : null) }, { k: 'end', l: 'Due date', t: 'date', v: eYD('12-31'), req: true },
      { k: 'status', l: 'Status', t: 'select', o: ['On-track', 'Off-track'] }, { k: 'desc', l: 'Description', opt: true, t: 'textarea' }],
      async v => {
        const newR = { id: ++eSeq, name: v.name, owner: v.owner, team: v.team, status: v.status, end: v.end, desc: v.desc, ms: [], company: v.type === 'company', archived: false };
        eRocks.push(newR); E.tab.rocks = 'list'; toast('Saving to Rock DocType...');
        const res = await apiCall('eos_core.eos_api.save_rock', { name: v.name, owner: v.owner, team: v.team, end: v.end, status: v.status, is_company: v.type === 'company', desc: v.desc });
        if (res && res.docname) newR.docname = res.docname;
        toast('Rock saved to ERP Document!');
      });
  } else if (p === 'to-dos') eosForm(rec ? 'Edit To-Do in ERP' : 'Create To-Do in ERP', [{ k: 'name', l: 'Title', req: true, v: r.name }, { k: 'owner', l: 'Owner', ...own(r.owner) }, { k: 'due', l: 'Due date', t: 'date', v: r.due || eRel(7), req: true },
      { k: 'team', l: 'Team', ...team(r.team || (E.f.todos.team === 'All Teams' ? null : E.f.todos.team)) }, { k: 'vis', l: 'Visibility', t: 'select', o: [['team', 'Team'], ['private', 'Private']], v: rec ? (r.priv ? 'private' : 'team') : (q.vis || E.tab.todos) }],
      async v => {
        if (rec) {
          Object.assign(rec, { name: v.name, owner: v.owner, due: v.due, team: v.team, priv: v.vis === 'private' }); toast('Updating To Do...');
          await apiCall('eos_core.eos_api.save_todo', { docname: rec.docname, name: v.name, owner: v.owner, due: v.due, team: v.team, priv: v.vis === 'private' });
          toast('To Do DocType updated!');
        } else {
          const newT = { id: ++eSeq, name: v.name, owner: v.owner, team: v.team, due: v.due, done: false, archived: false, priv: v.vis === 'private' };
          eTodos.push(newT); E.tab.todos = v.vis; toast('Saving To Do...');
          const res = await apiCall('eos_core.eos_api.save_todo', { name: v.name, owner: v.owner, due: v.due, team: v.team, priv: v.vis === 'private' });
          if (res && res.docname) newT.docname = res.docname;
          toast('Saved to To Do DocType!');
        }
      });
  else if (p === 'issues') eosForm(rec ? 'Edit Issue in ERP' : 'Create Issue in ERP', [{ k: 'name', l: 'Title', req: true, v: r.name }, { k: 'desc', l: 'Description', opt: true, t: 'textarea', v: r.desc },
      { k: 'pri', l: 'Priority', opt: true, t: 'select', o: [['', 'None'], 'High', 'Medium', 'Low', 'Critical'], v: r.pri || '' }, { k: 'team', l: 'Team', ...team(r.team || (E.f.issues.team === 'All Teams' ? null : E.f.issues.team)) },
      { k: 'owner', l: 'Owner', ...own(r.owner) }, { k: 'term', l: 'Term', t: 'select', o: [['short', 'Short-Term'], ['long', 'Long-Term']], v: r.term || E.tab.issues }],
      async v => {
        if (rec) {
          Object.assign(rec, { name: v.name, desc: v.desc, pri: v.pri, team: v.team, owner: v.owner, term: v.term }); toast('Updating Issue...');
          await apiCall('eos_core.eos_api.save_issue', { docname: rec.docname, name: v.name, desc: v.desc, pri: v.pri, team: v.team, owner: v.owner, term: v.term });
          toast('Issue DocType updated!');
        } else {
          const newI = { id: ++eSeq, name: v.name, desc: v.desc, pri: v.pri, team: v.team, owner: v.owner, term: v.term, archived: false, raised: eRel(0) };
          eIssues.push(newI); E.tab.issues = v.term; toast('Saving Issue...');
          const res = await apiCall('eos_core.eos_api.save_issue', { name: v.name, desc: v.desc, pri: v.pri, team: v.team, owner: v.owner, term: v.term });
          if (res && res.docname) newI.docname = res.docname;
          toast('Saved to Issue DocType!');
        }
      });
  else if (p === 'meetings') eosForm('Schedule a Meeting in ERP', [{ k: 'title', l: 'Title', req: true, v: 'Weekly Level 10 Meeting™' }, { k: 'team', l: 'Team', ...team() }, { k: 'date', l: 'Date', t: 'date', v: eRel(1), req: true }, { k: 'time', l: 'Time', t: 'time', v: '09:00' }],
      async v => {
        const item = { title: v.title, team: v.team, date: v.date, time: v.time };
        E.upcoming.push(item); E.upcoming.sort((a, b) => a.date.localeCompare(b.date)); E.tab.meet = 'upcoming'; toast('Scheduling in Level 10 Meeting...');
        const res = await apiCall('eos_core.eos_api.start_meeting', { team: v.team, title: v.title });
        if (res && res.docname) item.docname = res.docname;
        toast('Meeting created in Level 10 Meeting DocType!');
      });
}

/* ---------- actions & backend sync ---------- */
async function eosCommit(el) {
  if (!E.edit) return;
  const m = eMeas.find(x => x.id === E.edit.id), i = E.edit.i, v = el.value.trim();
  E.edit = null;
  while ((m.vals || []).length <= i) m.vals.push(null);
  m.vals[i] = v === '' ? null : Number(v);
  renderMain();
  if (v !== '' && !ePass(m, Number(v))) toast('Off goal. Hover the value to add it to Issues');

  // Sync to Scorecard Entry DocType
  const t = eToday(), mon = eAdd(t, -((t.getDay() + 6) % 7)), weekDate = eISO(eAdd(mon, -7 * i));
  toast('Saving cell to Scorecard Entry DocType...');
  await apiCall('eos_core.eos_api.save_scorecard_cell', {
    docname_or_metric: m.docname || m.name,
    week_start_date: weekDate,
    value: v === '' ? null : Number(v)
  });
  toast('Scorecard Entry saved to ERP!');
}

async function eosAct(a, el, e) {
  const id = el.dataset.id;
  if (a !== 'eos-menu' && E.menu) E.menu = null;
  switch (a) {
   case 'eos-menu': {
     const k = id.indexOf(':'), t = id.slice(0, k), i = id.slice(k + 1);
     if (E.menu && E.menu.t === t && String(E.menu.id) === i) E.menu = null; else { const b = el.getBoundingClientRect(); E.menu = { t, id: i, x: b.right, y: b.bottom, top: b.top }; }
     renderMain(); break;
   }
   case 'eos-tab': { const [k, t] = id.split(':'); E.tab[k] = t; S.q = ''; renderMain(); break; }
   case 'eos-tog': { const [p, k] = id.split('.'); E.f[p][k] = !E.f[p][k]; if (E.f[p].page) E.f[p].page = 1; renderMain(); break; }
   case 'eos-cell': { if (e && e.target.tagName === 'INPUT') return; const [m, i] = id.split(':').map(Number); E.edit = { id: m, i }; renderMain(); break; }
   case 'eos-issue-from': {
     const [m, i] = id.split(':').map(Number), mm = eMeas.find(x => x.id === m), v = (mm.vals || [])[i], nm = `${mm.name} off goal (${eU(mm, v)} vs ${mm.op} ${eU(mm, mm.target)})`;
     if (eIssues.some(x => x.name === nm)) return toast('Already in Issues');
     const newI = { id: ++eSeq, name: nm, desc: 'Raised from the scorecard.', team: mm.team, owner: mm.owner, term: 'short', pri: 'High', archived: false, raised: eRel(0) };
     eIssues.push(newI); toast('Creating Issue DocType...'); renderMain();
     const res = await apiCall('eos_core.eos_api.save_issue', { name: nm, desc: 'Raised from scorecard.', pri: 'High', team: mm.team, owner: mm.owner });
     if (res && res.docname) newI.docname = res.docname;
     toast('Issue saved to ERP!');
     break;
   }
   case 'eos-vto': E.vto = !E.vto; renderMain(); break;
   case 'eos-grp': E.collapsed.has(id) ? E.collapsed.delete(id) : E.collapsed.add(id); renderMain(); break;
   case 'eos-rock-open': { const n = +id; E.openRock.has(n) ? E.openRock.delete(n) : E.openRock.add(n); renderMain(); break; }
   case 'eos-rock-st': {
     const [r, s] = id.split(':'), k = eRocks.find(x => x.id === +r);
     if (s === 'archive') {
       k.archived = !k.archived; toast(k.archived ? 'Archiving Rock in ERP...' : 'Restoring Rock in ERP...');
       await apiCall('eos_core.eos_api.update_rock_status', { docname: k.docname || k.name, status: 'archive' });
     } else {
       k.status = s; toast('Updating Rock in ERP...');
       await apiCall('eos_core.eos_api.update_rock_status', { docname: k.docname || k.name, status: s });
     }
     toast('Rock updated in ERP!');
     renderMain(); break;
   }
   case 'eos-ms-toggle': {
     const [r, i] = id.split(':').map(Number), k = eRocks.find(x => x.id === r);
     k.ms[i].done = !k.ms[i].done; renderMain();
     toast('Updating Rock Milestone in ERP...');
     await apiCall('eos_core.eos_api.toggle_rock_milestone', { docname: k.docname || k.name, milestone_idx: i, done: k.ms[i].done ? 1 : 0 });
     toast('Rock Milestone updated in ERP!');
     break;
   }
   case 'eos-ms-del': {
     const [r, i] = id.split(':').map(Number), k = eRocks.find(x => x.id === r);
     k.ms.splice(i, 1); toast('Deleting Rock Milestone in ERP...'); renderMain();
     await apiCall('eos_core.eos_api.delete_rock_milestone', { docname: k.docname || k.name, milestone_idx: i });
     toast('Rock Milestone deleted in ERP!');
     break;
   }
   case 'eos-ms-add': { const n = +id; E.openRock.add(n); E.focusMs = n; renderMain(); break; }
   case 'eos-add-rock': eosDrawer('rocks', null, { owner: id }); break;
   case 'eos-add-todo': eosDrawer('to-dos', null, { vis: id === 'private' ? 'private' : 'team' }); break;
   case 'eos-archive-done': {
     const doneList = eTodos.filter(t => t.done && !t.priv && !t.archived);
     doneList.forEach(t => t.archived = true);
     toast('Archiving completed To-Dos in ERP...'); renderMain();
     await apiCall('eos_core.eos_api.archive_completed_todos', { team: E.f.todos.team });
     toast('To-Dos archived in ERP database!');
     break;
   }
   case 'eos-todo-done': {
     const t = eTodos.find(x => x.id === +id);
     t.done = !t.done; renderMain();
     toast('Updating To Do status in ERP...');
     await apiCall('eos_core.eos_api.toggle_todo', { docname: t.docname || t.name, done: t.done ? 1 : 0 });
     toast('To Do status committed to ERP!');
     break;
   }
   case 'eos-todo-arch': {
     const t = eTodos.find(x => x.id === +id);
     t.archived = !t.archived; toast(t.archived ? 'Archiving To Do in ERP...' : 'Restoring To Do in ERP...'); renderMain();
     await apiCall('eos_core.eos_api.archive_todo', { docname: t.docname || t.name, archived: t.archived ? 1 : 0 });
     toast('To Do archive state updated in ERP!');
     break;
   }
   case 'eos-edit-todo': eosDrawer('to-dos', eTodos.find(x => x.id === +id)); break;
   case 'eos-issue-done': {
     const i = eIssues.find(x => x.id === +id);
     i.archived = !i.archived; toast(i.archived ? 'Solving Issue in ERP...' : 'Reopening Issue in ERP...'); renderMain();
     await apiCall('eos_core.eos_api.toggle_issue', { docname: i.docname || i.name, solved: i.archived ? 1 : 0 });
     toast(i.archived ? 'Issue solved in ERP Document!' : 'Issue reopened in ERP Document!');
     break;
   }
   case 'eos-issue-arch': {
     const i = eIssues.find(x => x.id === +id);
     i.archived = !i.archived; toast(i.archived ? 'Archiving Issue in ERP...' : 'Restoring Issue in ERP...'); renderMain();
     await apiCall('eos_core.eos_api.toggle_issue', { docname: i.docname || i.name, solved: i.archived ? 1 : 0 });
     toast('Issue archive state updated in ERP!');
     break;
   }
   case 'eos-edit-issue': eosDrawer('issues', eIssues.find(x => x.id === +id)); break;
   case 'eos-page': { const [p, d] = id.split(':'); E.f[p].page += +d; renderMain(); break; }
   case 'eos-meet-start': {
     const t = E.f.meet.team === 'All Teams' ? (EOS_TEAMS[0] || 'Team') : E.f.meet.team;
     E.live = { title: t + ' Level 10 Meeting™', team: t, start: Date.now() };
     toast('Starting meeting in Level 10 Meeting DocType...');
     renderMain();
     const res = await apiCall('eos_core.eos_api.start_meeting', { team: t, title: E.live.title });
     if (res && res.docname) E.live.docname = res.docname;
     toast('Meeting active and recording to ERP!');
     break;
   }
   case 'eos-meet-end': {
     const secs = Math.round((Date.now() - E.live.start) / 1000), n = new Date();
     const meetingEntry = {
       docname: E.live.docname,
       when: eISO(eToday()),
       time: n.toLocaleTimeString('en-KE', { hour: 'numeric', minute: '2-digit' }),
       secs,
       fac: EOS_ME,
       rating: 8.5,
       team: E.live.team,
       title: E.live.title || 'Level 10 Meeting™'
     };
     E.past.unshift(meetingEntry);
     const docname = E.live.docname;
     E.live = null;
     E.tab.meet = 'past';
     toast('Saving meeting to Level 10 Meeting DocType...');
     renderMain();
     await apiCall('eos_core.eos_api.end_meeting', { docname, team: meetingEntry.team, secs, rating: meetingEntry.rating });
     toast('Meeting completed and saved to ERP DocType!');
     break;
   }
   case 'eos-open-sc': {
     const sc = eScorecards.find(x => x.name === id || x.id === id);
     if (sc) {
       eosForm(`Scorecard: ${sc.name || sc.id}`, [
         { k: 'team', l: 'Team', req: true, t: 'text', v: sc.team },
         { k: 'timeframe', l: 'Timeframe', req: true, t: 'select', o: [['Weekly', 'Weekly'], ['Monthly', 'Monthly'], ['Quarterly', 'Quarterly'], ['Annual', 'Annual']], v: sc.timeframe },
         { k: 'desc', l: 'Description', opt: true, t: 'textarea', v: sc.desc || sc.description || '' }
       ], async vals => {
         sc.desc = vals.desc;
         toast('Updating Scorecard in ERP...');
         await apiCall('eos_core.eos_api.save_scorecard', { team: sc.team, timeframe: sc.timeframe, description: vals.desc });
         toast('Scorecard updated in ERP!');
         renderMain();
       });
     }
     break;
   }
   case 'eos-sc-sel-all': {
     if (!S.sel) S.sel = new Set();
     if (S.sel.size >= eScorecards.length) S.sel.clear();
     else eScorecards.forEach(r => S.sel.add(r.id));
     renderMain();
     break;
   }
   case 'eos-sc-sel-row': {
     if (!S.sel) S.sel = new Set();
     if (S.sel.has(id)) S.sel.delete(id);
     else S.sel.add(id);
     renderMain();
     break;
   }
   case 'eos-sc-size': {
     E.f.scorecard.per = id;
     renderMain();
     break;
   }
   case 'eos-sc-clear-f': {
     E.f.scorecard.q_id = '';
     E.f.scorecard.team = 'All Teams';
     E.f.scorecard.timeframe = 'All';
     S.q = '';
     renderMain();
     break;
   }
   case 'eos-refresh': {
     toast('Refreshing live from Frappe DocTypes...');
     await loadEosFromDocTypes();
     toast('All pages refreshed with ERP data!');
     renderMain();
     break;
   }
   case 'eos-sc-fav': {
     toast('Scorecard favorited');
     break;
   }
   case 'eos-sc-fav-all': {
     toast('Filter by favorites');
     break;
   }
   case 'eos-print': window.print(); break;
  }
}

document.addEventListener('click', e => { if (E.menu && !e.target.closest('[data-menu],[data-act="eos-menu"]')) { E.menu = null; if (S.mod === 'eos') renderMain(); } });
document.addEventListener('scroll', () => { if (E.menu) { E.menu = null; if (S.mod === 'eos') renderMain(); } }, true);
document.addEventListener('input', e => {
  const d = e.target.dataset; if (!d || !d.eosF) return;
  const [p, key] = d.eosF.split('.');
  E.f[p][key] = e.target.value;
  if (key !== 'page' && E.f[p].page) E.f[p].page = 1;
  const pos = e.target.selectionStart;
  renderMain();
  const el = document.querySelector(`[data-eos-f="${p}.${key}"]`);
  if (el && pos != null) { el.focus(); try { el.setSelectionRange(pos, pos); } catch (_) {} }
});
document.addEventListener('change', async e => {
  const d = e.target.dataset; if (!d) return;
  if (d.eosF) { const [p, key] = d.eosF.split('.'); E.f[p][key] = e.target.value; if (key !== 'page' && E.f[p].page) E.f[p].page = 1; renderMain(); return; }
  if (d.eosPri) {
    const item = eIssues.find(x => x.id === +d.eosPri);
    item.pri = e.target.value; renderMain();
    toast('Updating Issue priority in ERP...');
    await apiCall('eos_core.eos_api.update_issue_priority', { docname: item.docname || item.name, pri: item.pri });
    toast('Priority updated in Issue DocType!');
    return;
  }
  if (d.eosVto) {
    E.vtoV[d.eosVto] = e.target.value;
    toast('Saving V/TO to ERP Document...');
    await apiCall('eos_core.eos_api.save_vto', {
      docname: E.vtoV.docname,
      rev: E.vtoV.rev,
      profit: E.vtoV.profit,
      meas: E.vtoV.meas
    });
    toast('V/TO updated in ERP!');
  }
});

document.addEventListener('focusout', e => { if (e.target.hasAttribute && e.target.hasAttribute('data-eos-cell')) eosCommit(e.target); });
document.addEventListener('keydown', async e => {
  const t = e.target; if (!t.hasAttribute) return;
  if (e.key === 'Escape' && E.menu) { E.menu = null; if (S.mod === 'eos') renderMain(); }
  if (t.hasAttribute('data-eos-cell')) {
    if (e.key === 'Enter') { e.preventDefault(); eosCommit(t); }
    else if (e.key === 'Escape') { E.edit = null; renderMain(); }
  } else if (t.hasAttribute('data-eos-ms') && e.key === 'Enter' && t.value.trim()) {
    const r = eRocks.find(x => x.id === +t.dataset.eosMs);
    if (!r.ms) r.ms = [];
    const title = t.value.trim();
    r.ms.push({ t: title, done: false, owner: r.owner, due: r.end });
    E.focusMs = r.id;
    renderMain();
    toast('Adding milestone to Rock DocType in ERP...');
    await apiCall('eos_core.eos_api.add_rock_milestone', { docname: r.docname || r.name, title: title });
    toast('Rock Milestone saved in ERP!');
  }
});
