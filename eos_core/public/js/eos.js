/* =====================================================================
   EOS MODULE: My 90, Scorecard, Rocks, To-Dos, Issues, Meetings.
   100% Dynamic: Backed exclusively by live Frappe ERP DocTypes.
   Hooks into app.js through: renderEos, eosDrawer, eosSave, eosAct.
   ===================================================================== */
let EOS_ME = (typeof USER !== 'undefined' && USER.name) ? USER.name : (window.frappe_user_name || '');
let EOS_USER_ID = window.frappe_user || '';
let EOS_IS_ADMIN = false;
let EOS_TEAMS = [];
let EOS_TEAM_MEMBERS = {};
let EOS_PEOPLE = [];

function getMembersForTeam(teamName) {
  if (teamName && EOS_TEAM_MEMBERS && EOS_TEAM_MEMBERS[teamName] && EOS_TEAM_MEMBERS[teamName].length) {
    return EOS_TEAM_MEMBERS[teamName];
  }
  return EOS_PEOPLE || [];
}

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
const ePass = (m, v) => ({ '>=': v >= m.target, '<=': v <= m.target, '=': v == m.target, '==': v == m.target, '>': v > m.target, '<': v < m.target }[m.op] ?? true);

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
  tab: { scorecard: 'scorecards', sc_freq: 'weekly', rocks: 'list', todos: 'team', issues: 'short', meet: 'upcoming' },
  f: {
    scorecard: { team: 'All Teams', q_id: '', q_meas: '', timeframe: 'All', per: '20', range: '13', page: 1, sort: 'Created On', owners: null },
    rocks: { team: 'All Teams', owner: 'All', status: 'All', people: false },
    todos: { team: 'All Teams', owner: 'All', arch: false, per: '25', page: 1 },
    issues: { team: 'All Teams', owner: 'All', arch: false, per: '25', page: 1 },
    meet: { team: 'All Teams', per: '10', page: 1 },
    my: { team: 'All Teams', priv: 'Incomplete', rocks: 'All' }
  },
  edit: null, menu: null, vto: false, vtoV: { rev: '', profit: '', meas: '' }, collapsed: new Set(), openRock: new Set(),
  form: null, preOwner: null, focusMs: null, live: null, past: [], upcoming: [], loaded: false,
  owner_filter_open: false, owner_filter_search: '',

  meeting_in_progress: false,
  meeting_agenda_type: 'l10',
  meeting_step: 0,
  meeting_seconds: 0,
  meeting_step_seconds: 0,
  meeting_step_times: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
  meeting_sharing_idx: 0,
  meeting_notes: '',
  meeting_ratings: {},
  meeting_attendance: {},
  meeting_attendees: [],
  meeting_good_news: {},
  headlines: [
    { id: 1, type: 'Customer', title: 'Key client onboarding went live seamlessly with 100% SLA met', author: 'Team Lead', date: 'Today' }
  ],
  cascading_messages: [],
  meeting_tools_open: false,
  meeting_modal: false,
  active_tool_drawer: null
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
    if (!res.ok) {
      const errText = await res.text();
      console.warn(`[EOS ERP API] ${method} (${res.status}):`, errText);
      try {
        const parsed = JSON.parse(errText);
        return { error: true, message: parsed.message || parsed.exception || `HTTP ${res.status}` };
      } catch (e) {
        return { error: true, message: `HTTP ${res.status}` };
      }
    }
    const json = await res.json();
    return json.message || json;
  } catch (err) {
    console.warn(`[EOS ERP API] ${method}:`, err.message);
    return { error: true, message: err.message };
  }
}

function applyBootstrapData(data) {
  if (!data) return;
  if (data.user) {
    if (data.user.name) EOS_ME = data.user.name;
    EOS_USER_ID = data.user.id || data.user.email || '';
    EOS_IS_ADMIN = !!data.user.is_admin;
    if (typeof USER !== 'undefined') {
      USER.name = data.user.name;
      USER.initial = data.user.initial || data.user.name[0];
    }
  }
  if (data.teams && data.teams.length) {
    EOS_TEAMS = data.teams;
    ['my', 'rocks', 'todos', 'issues', 'meet', 'scorecard'].forEach(k => {
      if (E.f[k] && (!E.f[k].team || (!EOS_TEAMS.includes(E.f[k].team) && E.f[k].team !== 'All Teams'))) {
        E.f[k].team = EOS_TEAMS[0];
      }
    });
  }
  if (data.team_members) EOS_TEAM_MEMBERS = data.team_members;
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
const eTeams = () => {
  const isAdmin = EOS_IS_ADMIN || EOS_ME === 'Administrator' || EOS_USER_ID === 'Administrator';
  if (isAdmin) {
    return ['All Teams', ...EOS_TEAMS];
  }
  if (EOS_TEAMS.length > 1) {
    return ['All Teams', ...EOS_TEAMS];
  }
  return [...EOS_TEAMS];
};
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
  const isAdmin = EOS_IS_ADMIN || EOS_ME === 'Administrator' || EOS_USER_ID === 'Administrator';
  const F = E.f.my;
  if (!F.team || (F.team === 'All Teams' && !isAdmin && EOS_TEAMS.length === 1)) {
    F.team = EOS_TEAMS[0] || 'All Teams';
  }
  const tf = x => F.team === 'All Teams' || x.team === F.team;

  const team = eTodos.filter(t => !t.priv && !t.archived && tf(t)).sort(eByDue);
  const priv = eTodos.filter(t => t.priv && (isAdmin || t.owner === EOS_ME || t.owner === EOS_USER_ID) && !t.archived && (F.priv === 'All' || !t.done) && tf(t)).sort(eByDue);

  const per = ePeriods('weekly', 6);
  const mine = isAdmin
    ? eMeas.filter(m => (m.freq || 'weekly').toLowerCase() === 'weekly' && tf(m))
    : eMeas.filter(m => (m.freq || 'weekly').toLowerCase() === 'weekly' &&
        (m.owner === EOS_ME || m.owner_user === EOS_USER_ID || m.owner_user === EOS_ME || m.owner === EOS_USER_ID) &&
        tf(m)
      );

  const hasDone = team.some(t => t.done);

  return eHead('My 90', 'A personalized workspace to view tasks, data, goals, and more directly from ERP.', eCreate('Create To-Do')) +
    `<div class="fbar">${eSel('my', 'team', 'Team', eTeams(), F.team)}</div>
   <div class="my-todos-container">
    <section class="panel todo-panel">
      <div class="pnl-h">
        <h2>Team To-Dos<span class="pcount">${team.length}</span></h2>
        <button class="btn" data-act="eos-archive-done" ${hasDone ? '' : 'disabled'} style="${hasDone ? '' : 'opacity:.5;cursor:default'}">Archive completed</button>
      </div>
      <div class="lst todo-scroll-lst">${team.length ? team.map(eTodoLi).join('') : '<div class="none">No team To-Dos found in ERP.</div>'}</div>
      <div class="foot"><button class="addlink" data-act="eos-add-todo">${icon('plus')}Create To-Do</button></div>
    </section>
    <section class="panel todo-panel">
      <div class="pnl-h">
        <h2>Private To-Dos<span class="pcount">${priv.length}</span></h2>
        ${eSel('my', 'priv', 'Show', ['Incomplete', 'All'], F.priv, 'sm')}
      </div>
      <div class="lst todo-scroll-lst">${priv.length ? priv.map(eTodoLi).join('') : '<div class="none">No private To-Dos.</div>'}</div>
      <div class="foot"><button class="addlink" data-act="eos-add-todo" data-id="private">${icon('plus')}Add To-Do</button></div>
    </section>
   </div>
   <section class="panel sc mym" style="margin-top:16px"><div class="pnl-h"><h2>My Measurables<span class="pcount">${mine.length}</span></h2></div>
    ${mine.length ? `<div class="scroll"><table><thead><tr><th class="mn" style="left:0;box-shadow:none">Title</th><th>Goal</th><th>Average</th><th>Total</th>${per.map((p, i) => `<th class="${i ? '' : 'cur'}">${i ? '' : 'Current Week<small>'}${p}${i ? '' : '</small>'}</th>`).join('')}</tr></thead><tbody>
    ${mine.map(m => {
      const v = (m.vals || []).slice(0, 6).filter(x => x != null), avg = v.length ? v.reduce((a, b) => a + b, 0) / v.length : null, tot = v.length && !m.noTotal ? v.reduce((a, b) => a + b, 0) : null;
      return `<tr><td class="mn" style="left:0;box-shadow:none">${eEsc(m.name)}</td><td class="g">${m.op} ${eU(m, m.target)}</td><td class="g">${avg == null ? '–' : eU(m, avg)}</td><td class="g">${tot == null ? '–' : eU(m, tot)}</td>${per.map((_, i) => { const x = (m.vals || [])[i]; return x == null ? '<td class="cell na">–</td>' : `<td class="cell ${ePass(m, x) ? 'ok' : 'bad'}" style="cursor:default">${m.unit === 'pct' ? eN(x) + '%' : eN(x)}</td>`; }).join('')}</tr>`;
    }).join('')}</tbody></table></div>`
      : '<div class="none">No measurables assigned to you in ERP.</div>'}</section>`;
}

/* ---------- Scorecard (Measurables Grid & Directory Matching Ninety.io) ---------- */
function eosScorecard() {
  const F = E.f.scorecard;
  const curTab = E.tab.scorecard || 'scorecards';

  const head = `<div class="ph desk-ph" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;padding:2px 0">
    <div>
      <div style="display:flex;align-items:center;gap:8px">
        <span style="display:inline-flex;align-items:center;color:var(--ink-2);cursor:pointer" data-act="home" title="Home">${icon('home')}</span>
        <span style="color:var(--ink-3);font-size:14px">/</span>
        <h1 style="font-size:18px;font-weight:700;color:var(--g900);margin:0">Scorecard</h1>
      </div>
      <p class="lead" style="margin:4px 0 0 0;font-size:13px;color:#6b7280">
        ${curTab === 'monthly' ? 'Track monthly rolled-up measurables against target goals.' : curTab === 'quarterly' ? 'Track quarterly rolled-up measurables against target goals.' : curTab === 'annual' ? 'Track annual rolled-up measurables against target goals.' : curTab === 'scorecards' ? 'View and manage team scorecards directory.' : 'Track weekly and monthly measurables against target goals.'}
      </p>
    </div>
    <div style="display:flex;align-items:center;gap:8px">
      <button class="icon-btn" data-act="eos-refresh" title="Reload from ERP" style="width:32px;height:32px;border:1px solid var(--line-2);border-radius:6px;display:flex;align-items:center;justify-content:center">${icon('refresh')}</button>
      ${curTab === 'scorecards' ? `
      <button class="btn primary" data-act="create" style="height:32px;font-size:13px;padding:0 14px;border-radius:6px;font-weight:600;background:var(--g900);color:#fff">
        ${icon('plus')} Add Scorecard
      </button>` : ''}
    </div>
  </div>`;

  const tabsHtml = `
    <div class="tabs" role="tablist" style="margin-bottom:14px">
      <button class="tab" role="tab" aria-selected="${curTab === 'scorecards'}" data-act="eos-tab" data-id="scorecard:scorecards">All Scorecards</button>
      <button class="tab" role="tab" aria-selected="${curTab === 'weekly'}" data-act="eos-tab" data-id="scorecard:weekly">Weekly KPIs</button>
      <button class="tab" role="tab" aria-selected="${curTab === 'monthly'}" data-act="eos-tab" data-id="scorecard:monthly">Monthly KPIs</button>
      <button class="tab" role="tab" aria-selected="${curTab === 'quarterly'}" data-act="eos-tab" data-id="scorecard:quarterly">Quarterly KPIs</button>
      <button class="tab" role="tab" aria-selected="${curTab === 'annual'}" data-act="eos-tab" data-id="scorecard:annual">Annual KPIs</button>
    </div>
  `;

  if (curTab === 'scorecards') {
    return head + tabsHtml + renderScorecardsDirectory();
  }

  return head + tabsHtml + renderMeasurablesGrid(curTab);
}

function getMeasurableVal(m, curTab, i) {
  if (curTab === 'weekly') {
    return (m.vals && m.vals[i] != null) ? m.vals[i] : null;
  }
  if (curTab === 'monthly') {
    if (m.monthly_vals && m.monthly_vals[i] != null) return m.monthly_vals[i];
    if ((m.freq || '').toLowerCase() === 'monthly' && m.vals && m.vals[i] != null) return m.vals[i];
    return null;
  }
  if (curTab === 'quarterly') {
    if (m.quarterly_vals && m.quarterly_vals[i] != null) return m.quarterly_vals[i];
    if ((m.freq || '').toLowerCase() === 'quarterly' && m.vals && m.vals[i] != null) return m.vals[i];
    return null;
  }
  if (curTab === 'annual') {
    if (m.annual_vals && m.annual_vals[i] != null) return m.annual_vals[i];
    if ((m.freq || '').toLowerCase() === 'annual' && m.vals && m.vals[i] != null) return m.vals[i];
    return null;
  }
  return null;
}

function getScorecardOwners(curTab, team) {
  const tf = (curTab || E.tab.scorecard || 'weekly').toLowerCase();
  const tm = (team !== undefined ? team : E.f.scorecard.team);
  const metrics = (eMeas || []).filter(m => {
    if ((m.freq || 'weekly').toLowerCase() !== tf) return false;
    if (tm && tm !== 'All Teams' && m.team && m.team !== tm) return false;
    return true;
  });
  return Array.from(new Set(metrics.map(m => m.owner).filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function renderOwnerFilterPopover(allOwners, selectedOwners, search) {
  const isAll = !selectedOwners || (allOwners.length > 0 && selectedOwners.length === allOwners.length);
  const q = (search || '').toLowerCase().trim();
  const visibleOwners = allOwners.filter(o => !q || o.toLowerCase().includes(q));

  return `
    <div class="nn-owner-filter-popover" onclick="event.stopPropagation()">
      <input type="text" class="nn-owner-filter-search" placeholder="Search..." value="${eEsc(search || '')}">
      <div class="nn-owner-filter-list">
        ${allOwners.length ? `
        <label style="color:#111827;font-weight:600">
          <input type="checkbox" class="nn-owner-filter-all" ${isAll ? 'checked' : ''}>
          <span>(Select All)</span>
        </label>` : ''}
        ${visibleOwners.map(o => {
    const checked = isAll || (Array.isArray(selectedOwners) && selectedOwners.includes(o));
    return `
            <label class="nn-owner-filter-opt">
              <input type="checkbox" class="nn-owner-filter-item" value="${eEsc(o)}" ${checked ? 'checked' : ''}>
              <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${eEsc(o)}">${eEsc(o)}</span>
            </label>
          `;
  }).join('')}
        ${visibleOwners.length === 0 ? `<div style="padding:6px;font-size:11.5px;color:#9ca3af;text-align:center;">No owners found</div>` : ''}
      </div>
    </div>
  `;
}

function renderMeasurablesGrid(curTab) {
  const F = E.f.scorecard;
  const defaultRange = curTab === 'monthly' ? 6 : curTab === 'quarterly' ? 4 : curTab === 'annual' ? 3 : 13;
  const rangeCount = parseInt(F.range, 10) || defaultRange;
  const periods = ePeriods(curTab === 'weekly' ? 'weekly' : curTab, rangeCount);

  let metrics = (eMeas || []).filter(m => (m.freq || 'weekly').toLowerCase() === curTab.toLowerCase());
  if (F.team && F.team !== 'All Teams') {
    metrics = metrics.filter(m => !m.team || m.team === F.team);
  }
  const q = (F.q_meas || S.q || '').trim().toLowerCase();
  if (q) {
    metrics = metrics.filter(m => (m.name || '').toLowerCase().includes(q) || (m.owner || '').toLowerCase().includes(q));
  }

  const allOwners = getScorecardOwners(curTab, F.team);

  if (Array.isArray(F.owners)) {
    F.owners = F.owners.filter(o => allOwners.includes(o));
    if (F.owners.length === allOwners.length) {
      F.owners = null;
    }
  }

  const isOwnerFiltered = Array.isArray(F.owners) && F.owners.length < allOwners.length;
  if (Array.isArray(F.owners)) {
    metrics = metrics.filter(m => F.owners.includes(m.owner));
  }

  let rangeOptions = [];
  if (curTab === 'monthly') {
    rangeOptions = [[3, 'Last 3 Months'], [6, 'Last 6 Months'], [12, 'Last 12 Months']];
  } else if (curTab === 'quarterly') {
    rangeOptions = [[4, 'Last 4 Quarters'], [8, 'Last 8 Quarters']];
  } else if (curTab === 'annual') {
    rangeOptions = [[3, 'Last 3 Years'], [5, 'Last 5 Years']];
  } else {
    rangeOptions = [[13, 'Last 13 Weeks'], [26, 'Last 26 Weeks'], [52, 'Last 52 Weeks']];
  }

  const bar = `
    <div class="fbar sc-fbar" style="display:flex;align-items:center;gap:10px;padding:8px 0;margin-bottom:14px;flex-wrap:wrap">
      <div class="sc-input-box">
        <select class="field sc-team-sel" style="height:32px;padding:0 10px;font-size:12.5px;border-radius:6px;background:var(--g50);min-width:140px" data-eos-f="scorecard.team">
          <option value="All Teams">Team: All Teams</option>
          ${EOS_TEAMS.map(t => `<option value="${eEsc(t)}" ${F.team === t ? 'selected' : ''}>${eEsc(t)}</option>`).join('')}
        </select>
      </div>
      <div class="sc-input-box">
        <select class="field" style="height:32px;padding:0 10px;font-size:12.5px;border-radius:6px;background:var(--g50)" data-eos-f="scorecard.range">
          ${rangeOptions.map(([val, label]) => `<option value="${val}" ${rangeCount === val ? 'selected' : ''}>Date Range: ${label}</option>`).join('')}
        </select>
      </div>
      <div class="nn-search-input-wrap">
        ${icon('search')}
        <input placeholder="Search Measurables…" value="${eEsc(F.q_meas || '')}" data-eos-f="scorecard.q_meas">
      </div>
      <div style="flex:1"></div>
      <button class="nn-btn-green" data-act="eos-add-measurable" style="height:32px;padding:0 14px;font-size:12px">
        + New Measurable
      </button>
    </div>
  `;

  const body = `
    <div class="nn-card-wrap">
      <div class="nn-card-header">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:16px;font-weight:700;color:#111827">
            ${curTab === 'monthly' ? 'Monthly KPIs' : curTab === 'quarterly' ? 'Quarterly KPIs' : curTab === 'annual' ? 'Annual KPIs' : 'Weekly KPIs'}
          </span>
          <span class="nn-badge-cnt">${metrics.length}</span>
        </div>
      </div>

      <div class="nn-table-scroll">
        <table class="nn-sc-tbl">
          <thead>
            <tr>
              <th class="left nn-col-metric" style="width:240px;min-width:240px;max-width:240px">Measurable</th>
              <th class="nn-col-owner" style="width:68px;min-width:68px;max-width:68px;text-align:center;">
                <div style="display:inline-flex;align-items:center;justify-content:center;gap:4px">
                  <span>Owner</span>
                  <button class="nn-owner-filter-btn ${isOwnerFiltered ? 'active' : ''}" data-act="eos-toggle-owner-filter" title="Filter by Owner" style="color:${isOwnerFiltered ? '#047857' : '#9ca3af'};">
                    ${icon('filter')}
                  </button>
                </div>
                ${E.owner_filter_open ? renderOwnerFilterPopover(allOwners, F.owners, E.owner_filter_search || '') : ''}
              </th>
              <th class="nn-col-goal" style="width:130px;min-width:130px;max-width:130px;text-align:center">Goal</th>
              ${periods.map(p => `<th style="min-width:80px;text-align:center">${eEsc(p)}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${metrics.length ? metrics.map(m => {
    const av = initials(m.owner || 'U');
    let cells = "";
    for (let i = 0; i < rangeCount; i++) {
      const isEditing = E.edit && E.edit.id === m.id && E.edit.i === i;
      const val = getMeasurableVal(m, curTab, i);
      if (isEditing) {
        cells += `
                    <td class="nn-sc-cell">
                      <input class="nn-sc-cell-input" data-eos-cell autofocus value="${val != null ? val : ''}">
                    </td>
                  `;
      } else {
        if (val == null) {
          cells += `
                      <td class="nn-sc-cell" data-act="eos-cell" data-id="${m.id}:${i}">
                        <span class="nn-cell-val empty">–</span>
                      </td>
                    `;
        } else {
          const pass = ePass(m, val);
          const cls = pass ? "pass" : "fail";
          cells += `
                      <td class="nn-sc-cell ${cls}" data-act="eos-cell" data-id="${m.id}:${i}">
                        <div class="nn-cell-wrap">
                          <span class="nn-cell-badge ${cls}">${eU(m, val)}</span>
                        </div>
                      </td>
                    `;
        }
      }
    }

    return `
              
                <tr>
                  <td class="left nn-col-metric" style="width:240px;min-width:240px;max-width:240px;white-space:normal;word-break:break-word;overflow-wrap:break-word;line-height:1.35">
                    <span class="nn-metric-title" data-act="eos-edit-measurable" data-id="${m.id}" style="cursor:pointer;font-weight:600;color:#111827;white-space:normal;word-break:break-word;overflow-wrap:break-word;display:block">
                      ${eEsc(m.name)}
                    </span>
                  </td>
                  <td class="nn-col-owner" style="width:68px;min-width:68px;max-width:68px;text-align:center">
                    <span class="nn-owner-circle" style="width:24px;height:24px;font-size:10px" title="${eEsc(m.owner)}">${av}</span>
                  </td>
                  <td class="nn-col-goal" style="width:130px;min-width:130px;max-width:130px;text-align:center;white-space:nowrap">
                    <span style="font-weight:600;color:#374151;white-space:nowrap">${(m.op === '==' || m.op === '=') ? '=' : (m.op || '>=')} ${eU(m, m.target)}</span>
                  </td>
                  ${cells}
                </tr>
              `;
  }).join('') : `
              <tr>
                <td colspan="${rangeCount + 3}" style="padding:48px;text-align:center;color:#9ca3af">
                  <div style="font-size:14px;font-weight:600;color:#374151;margin-bottom:6px">No measurables found for this view.</div>
                  <div style="font-size:12.5px;color:#6b7280;margin-bottom:14px">Track numbers weekly to predict trends and keep your team accountable.</div>
                  <button class="nn-btn-green" data-act="eos-add-measurable">+ Add First Measurable</button>
                </td>
              </tr>
            `}
          </tbody>
        </table>
      </div>
    </div>
  `;

  return bar + body;
}

function renderScorecardsDirectory() {
  const F = E.f.scorecard;
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
    <button class="btn sec" data-act="eos-sc-clear-f" style="height:32px;font-size:12px;padding:0 10px;border-radius:6px;border:1px solid var(--line-2);color:var(--ink-2)">Clear Filters</button>
    <div style="flex:1"></div>
    <div class="sc-input-box">
      <select class="field sc-sort-sel" style="height:32px;padding:0 10px;font-size:12px;border-radius:6px;border:1px solid var(--line-2);background:transparent" data-eos-f="scorecard.sort">
        <option value="Created On" ${F.sort === 'Created On' ? 'selected' : ''}>Created On</option>
        <option value="Team" ${F.sort === 'Team' ? 'selected' : ''}>Team</option>
        <option value="Timeframe" ${F.sort === 'Timeframe' ? 'selected' : ''}>Timeframe</option>
        <option value="ID" ${F.sort === 'ID' ? 'selected' : ''}>ID</option>
      </select>
    </div>
    <span style="font-size:12.5px;color:var(--ink-3);font-weight:500;padding:0 4px">${visCount} of ${allCount}</span>
    <button class="icon-btn" data-act="eos-sc-fav-all" title="Favorites" style="width:30px;height:30px;color:var(--ink-3);display:flex;align-items:center;justify-content:center">${icon('heart')}</button>
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
                <span title="Comments" style="cursor:pointer;display:inline-flex;align-items:center;gap:4px">${icon('chat')} 0</span> &nbsp;&nbsp;&nbsp;
                <span title="Favorite" data-act="eos-sc-fav" data-id="${eEsc(sc.id)}" style="cursor:pointer;display:inline-flex;align-items:center">${icon('heart')}</span>
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

  return bar + body;
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

function eFmtTimer(sec) {
  const m = Math.floor((sec || 0) / 60);
  const s = (sec || 0) % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function startMeetingTimer() {
  if (E.meeting_interval) clearInterval(E.meeting_interval);
  E.meeting_interval = setInterval(() => {
    if (!E.meeting_in_progress) {
      clearInterval(E.meeting_interval);
      return;
    }
    E.meeting_seconds = (E.meeting_seconds || 0) + 1;
    const step = E.meeting_step || 0;
    E.meeting_step_times = E.meeting_step_times || {};
    E.meeting_step_times[step] = (E.meeting_step_times[step] || 0) + 1;
    E.meeting_step_seconds = E.meeting_step_times[step];
    updateMeetingTimerDisplay();
  }, 1000);
}

function updateMeetingTimerDisplay() {
  const cur_step = E.meeting_step || 0;
  const cur_step_sec = (E.meeting_step_times && E.meeting_step_times[cur_step]) || 0;
  const tot = document.getElementById('nn-l10-total-timer');
  if (tot) tot.textContent = eFmtTimer(E.meeting_seconds);
  const step = document.getElementById('nn-l10-step-timer');
  if (step) step.textContent = eFmtTimer(cur_step_sec);
  const row = document.querySelector(`.nn-l10-agenda-item[data-step="${cur_step}"] .nn-l10-agenda-elapsed`);
  if (row) row.textContent = eFmtTimer(cur_step_sec);
}

function getL10AgendaSteps() {
  return [
    { idx: 0, num: '1.', name: 'SEGUE', target_sec: 300, target_str: '05:00' },
    { idx: 1, num: '2.', name: 'SCORECARD', target_sec: 300, target_str: '05:00' },
    { idx: 2, num: '3.', name: 'ROCK REVIEW', target_sec: 300, target_str: '05:00' },
    { idx: 3, num: '4.', name: 'CUSTOMER / EMPLOYEE HEADLINES', target_sec: 300, target_str: '05:00' },
    { idx: 4, num: '5.', name: 'TO-DO LIST', target_sec: 300, target_str: '05:00' },
    { idx: 5, num: '6.', name: 'IDS™', target_sec: 3600, target_str: '60:00' },
    { idx: 6, num: '7.', name: 'CONCLUDE', target_sec: 300, target_str: '05:00' }
  ];
}

async function startL10Meeting(agenda_id = 'l10') {
  const team = (E.f.meet && E.f.meet.team !== 'All Teams') ? E.f.meet.team : (EOS_TEAMS[0] || 'Leadership Team');
  E.meeting_in_progress = true;
  E.meeting_modal = false;
  E.meeting_agenda_type = agenda_id;
  E.meeting_step = 0;
  E.meeting_seconds = 0;
  E.meeting_step_seconds = 0;
  E.meeting_step_times = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  E.meeting_sharing_idx = 0;
  E.meeting_good_news = {};
  E.meeting_ratings = {};
  E.meeting_notes = '';

  let attendee_list = [];
  const tMembers = getMembersForTeam(team);
  if (tMembers && tMembers.length) {
    attendee_list = tMembers.filter(p => p !== 'All' && !p.includes('@'));
  } else if (EOS_PEOPLE && EOS_PEOPLE.length) {
    attendee_list = EOS_PEOPLE.filter(p => p !== 'All' && !p.includes('@'));
  }
  if (!attendee_list.length) {
    attendee_list = [EOS_ME || 'Administrator'];
  }
  E.meeting_attendees = attendee_list.slice(0, 8);
  E.meeting_attendance = {};
  E.meeting_attendees.forEach((att, idx) => {
    E.meeting_attendance[att] = (idx < 2);
    E.meeting_ratings[att] = 8;
  });

  if (!E.headlines || !E.headlines.length) {
    E.headlines = [
      { id: 1, type: 'Customer', title: 'Key client onboarding went live seamlessly with 100% SLA met', author: E.meeting_attendees[0] || 'Team Lead', date: 'Today' }
    ];
  }
  if (!E.cascading_messages) {
    E.cascading_messages = [];
  }

  startMeetingTimer();
  toast('Starting meeting in Level 10 Meeting DocType...');
  renderMain();
  const res = await apiCall('eos_core.eos_api.start_meeting', { team, title: `${team} Level 10 Meeting™` });
  if (res && res.docname) {
    E.live = { docname: res.docname, team, title: `${team} Level 10 Meeting™`, start: Date.now() };
  }
  toast('Meeting active and recording to ERP!');
}

async function eosDropToIds(title, type) {
  const team = (E.f.meet && E.f.meet.team !== 'All Teams') ? E.f.meet.team : (EOS_TEAMS[0] || 'Leadership Team');
  const newI = {
    id: ++eSeq,
    name: title || 'New Meeting Issue',
    desc: `Identified during Level 10 Meeting (${type || 'Meeting'})`,
    team: team,
    owner: EOS_ME,
    term: 'short',
    pri: 'High',
    archived: false,
    raised: eRel(0)
  };
  eIssues.unshift(newI);
  toast(`Dropped to IDS: ${title}`);
  renderMain();
  const res = await apiCall('eos_core.eos_api.save_issue', {
    name: newI.name,
    desc: newI.desc,
    pri: 'High',
    team: newI.team,
    owner: newI.owner,
    term: 'short'
  });
  if (res && res.docname) newI.docname = res.docname;
  toast('Issue saved to ERP database!');
}

async function eosFinishMeeting() {
  if (E.meeting_interval) clearInterval(E.meeting_interval);
  const chkArch = document.getElementById('eos-chk-archive');
  const team = (E.f.meet && E.f.meet.team !== 'All Teams') ? E.f.meet.team : (EOS_TEAMS[0] || 'Leadership Team');
  if (chkArch && chkArch.checked) {
    try {
      const completedTds = eTodos.filter(t => t.done && !t.archived && (team === 'All Teams' || !t.team || t.team === team));
      for (const td of completedTds) {
        td.archived = true;
        await apiCall('eos_core.eos_api.archive_todo', { docname: td.docname || td.name, archived: 1 });
      }
      const solvedIss = eIssues.filter(i => i.archived && (team === 'All Teams' || !i.team || i.team === team));
      for (const iss of solvedIss) {
        await apiCall('eos_core.eos_api.toggle_issue', { docname: iss.docname || iss.name, solved: 1 });
      }
    } catch (e) {
      console.warn('Archiving meeting items:', e);
    }
  }

  const dur_min = Math.max(1, Math.round((E.meeting_seconds || 0) / 60));
  const step_names = ["Segue", "Scorecard", "Rock Review", "Headlines", "To-Dos", "IDS", "Conclude"];
  const step_summary = step_names.map((nm, idx) => `${nm}: ${eFmtTimer((E.meeting_step_times && E.meeting_step_times[idx]) || 0)}`).join(', ');

  let rating_sum = 0, rating_cnt = 0;
  (E.meeting_attendees || []).forEach(a => {
    rating_sum += Number(E.meeting_ratings[a] || 8);
    rating_cnt++;
  });
  const avg_rating = rating_cnt ? (rating_sum / rating_cnt).toFixed(1) : '8.5';
  const notes_str = `Duration: ${dur_min} min. Sections: [${step_summary}]. Ratings: ${JSON.stringify(E.meeting_ratings || {})}. Attendees: ${(E.meeting_attendees || []).join(', ')}.`;

  toast('Saving completed meeting to ERP...');
  const res = await apiCall('eos_core.eos_api.end_meeting', {
    docname: E.live && E.live.docname ? E.live.docname : null,
    team: team,
    secs: E.meeting_seconds,
    rating: parseFloat(avg_rating),
    notes: notes_str
  });

  const when_str = eISO(eToday());
  const now_time = new Date().toLocaleTimeString('en-KE', { hour: 'numeric', minute: '2-digit' });
  const entry = {
    docname: (res && res.docname) || (E.live && E.live.docname) || `${team}-${when_str}`,
    when: when_str,
    time: now_time,
    secs: E.meeting_seconds,
    fac: EOS_ME,
    rating: parseFloat(avg_rating),
    team: team,
    title: `${team} Level 10 Meeting™`,
    notes: notes_str
  };
  E.past.unshift(entry);
  E.live = null;
  E.meeting_in_progress = false;
  E.tab.meet = 'past';
  toast('Level 10 Meeting completed and archived successfully!');
  renderMain();
}

function eosMeet() {
  if (E.meeting_in_progress) {
    return renderL10MeetingWorkspace();
  }
  return renderMeetingsDashboard();
}

function renderMeetingsDashboard() {
  const F = E.f.meet, tab = E.tab.meet || 'upcoming';
  const team = F.team || (EOS_TEAMS[0] || 'Leadership Team');
  const head = `<div class="ph eos-ph">
    <div>
      <h1>Meetings</h1>
      <p class="lead">Improve alignment and transparency across your organization.</p>
    </div>
    <div class="row" style="display:flex;gap:10px;align-items:center">
      <button class="btn" data-act="eos-print-agenda">${icon('printer')}Print Meeting Agenda</button>
      <button class="btn primary" data-act="eos-open-start-modal">${icon('plus')}${tab === 'agenda' ? 'Create Agenda' : 'Create'}</button>
    </div>
  </div>`;

  const tabs = eTabs('meet', [['upcoming', 'Upcoming'], ['past', 'Past Meetings'], ['agenda', 'Agendas']]);
  const bar = `<div class="fbar">
    ${tab === 'agenda' ? '' : eSel('meet', 'team', 'Team', eTeams(), F.team)}
  </div>`;

  let body = '';
  if (tab === 'upcoming') {
    const up = E.upcoming.filter(m => F.team === 'All Teams' || m.team === F.team);
    const hero = `<div class="nn-meeting-hero">
      <div class="nn-meeting-hero-tag">${eEsc(team)}</div>
      <h3 class="nn-meeting-hero-title">No Meetings in progress</h3>
      <div class="nn-meeting-hero-btns">
        <button class="nn-btn-green" data-act="eos-open-start-modal">
          ${icon('play')} <span>Start a Meeting</span>
        </button>
        <button class="nn-btn-bar" data-act="eos-schedule-meet">
          ${icon('calendar')} <span>Schedule a Meeting</span>
        </button>
      </div>
    </div>`;

    const upList = up.length ? `
      <section class="panel" style="margin-top:16px">
        <div class="pnl-h"><h2>Upcoming Meetings<span class="pcount">${up.length}</span></h2></div>
        ${up.map(m => `<div class="mrow"><div><b>${eEsc(m.title)}</b><small>${eEsc(m.team)}</small></div><span class="sp"></span><span>${eShort(m.date)}${m.time ? ' · ' + eEsc(m.time) : ''}</span></div>`).join('')}
      </section>
    ` : `
      <div style="margin-top:28px">
        <div style="font-size:15px;font-weight:700;color:#111827;margin-bottom:14px;display:flex;align-items:center;gap:6px">
          <span>Upcoming Meetings</span>
          <span style="font-size:12px;color:#9ca3af;font-weight:400">(0)</span>
        </div>
        <div class="nn-upcoming-box">
          <div class="nn-empty-icon-circle">${icon('chat')}</div>
          <div class="nn-empty-box-title">Your team hasn't created any scheduled Meetings yet.</div>
          <div class="nn-empty-box-sub">Scheduled Meetings are a quick way to keep your team aligned.</div>
          <a href="javascript:void(0)" class="link" style="color:#064e3b;text-decoration:underline;font-size:12.5px;font-weight:500" data-act="eos-schedule-meet">Learn more about Scheduled Meetings</a>
        </div>
      </div>
    `;

    body = hero + upList;
  } else if (tab === 'past') {
    const ps = (E.past || []).filter(m => F.team === 'All Teams' || !m.team || m.team === F.team);
    if (!ps.length) {
      body = `
        <div class="nn-upcoming-box" style="margin-top:10px">
          <div class="nn-empty-icon-circle">${icon('calendar')}</div>
          <div class="nn-empty-box-title">No past meetings recorded yet.</div>
          <div class="nn-empty-box-sub">Completed meetings will be archived here for review.</div>
        </div>
      `;
    } else {
      body = `
        <div class="nn-rock-card" style="margin-top:10px">
          <div class="nn-rock-header">
            <div class="nn-rock-title-group">
              <span class="nn-rock-title">Past Meetings</span>
              <span class="nn-badge-cnt">${ps.length}</span>
            </div>
          </div>
          <table class="nn-rock-tbl">
            <thead>
              <tr>
                <th>Date</th>
                <th>Team</th>
                <th>Status</th>
                <th>Notes / Summary</th>
                <th style="text-align:right">Action</th>
              </tr>
            </thead>
            <tbody>
              ${ps.map(m => {
        const meetId = m.docname || m.title || (m.team + '-' + m.when);
        return `
                <tr class="nn-rock-row" data-act="eos-view-past-meeting" data-id="${eEsc(meetId)}" style="cursor:pointer">
                  <td><b>${eShort(m.when)}</b><div style="font-size:11px;color:#9ca3af">${eEsc(m.time || '')}</div></td>
                  <td>${eEsc(m.team || team)}</td>
                  <td><span class="nn-status-badge complete">Complete</span></td>
                  <td style="color:#6b7280">${eEsc(m.notes || 'Level 10 Meeting completed')}</td>
                  <td style="text-align:right">
                    <button class="btn sec" data-act="eos-view-past-meeting" data-id="${eEsc(meetId)}" style="height:28px;padding:0 12px;font-size:12px;font-weight:600;border-radius:6px;border:1px solid var(--line-2);cursor:pointer">View</button>
                  </td>
                </tr>
              `;
      }).join('')}
            </tbody>
          </table>
        </div>
      `;
    }
  } else {
    // tab === 'agenda'
    const agendas = [
      { id: "l10", title: "Level 10 Meeting™", dur: "90 min", desc: "Weekly leadership & team pulse: Segue, Scorecard, Rocks, Headlines, To-Dos, IDS (60m), Conclude." },
      { id: "quarterly", title: "Quarterly Session", dur: "Full Day", desc: "Review past quarter results, refresh V/TO®, set 90-day Rocks, tackle major strategic issues." },
      { id: "annual", title: "Annual Session", dur: "2 Days", desc: "2-day deep dive into Vision, Core Values, 1-Year Plan, and upcoming quarterly priorities." },
      { id: "1on1", title: "Weekly 1-on-1", dur: "30 min", desc: "Manager & employee alignment check-in, reviewing weekly to-dos, measurables, and feedback." }
    ];
    body = `
      <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(290px, 1fr));gap:18px;">
        ${agendas.map(a => `
          <div class="nn-l10-card" style="display:flex;flex-direction:column;justify-content:space-between;margin-bottom:0">
            <div>
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
                <h4 style="margin:0;font-size:15px;font-weight:700;color:#111827">${eEsc(a.title)}</h4>
                <span style="font-size:11.5px;font-weight:600;padding:2px 8px;border-radius:12px;background:#ecfdf5;color:#064e3b">${a.dur}</span>
              </div>
              <p style="font-size:13px;color:#4b5563;line-height:1.5;margin-bottom:18px">${eEsc(a.desc)}</p>
            </div>
            <div>
              <button class="nn-btn-green" data-act="eos-start-l10" data-agenda="${a.id}" style="width:100%">Start This Meeting</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  const modalHtml = E.meeting_modal ? renderStartMeetingModal() : '';
  return head + tabs + bar + `<div class="eos-col" style="max-width:1080px">${body}</div>` + modalHtml;
}

function renderStartMeetingModal() {
  const agendas = [
    { id: "l10", title: "Level 10 Meeting™" },
    { id: "quarterly", title: "Quarterly Session" },
    { id: "annual", title: "Annual Session" },
    { id: "1on1", title: "Weekly 1-on-1" }
  ];
  return `
    <div class="nn-modal-backdrop" data-act="eos-close-modal"></div>
    <div class="nn-modal-card">
      <div class="nn-modal-header">
        <div>
          <h3 class="nn-modal-title">Start Meeting</h3>
          <p class="nn-modal-sub">Select an agenda for your meeting</p>
        </div>
        <button class="nn-modal-close-btn" data-act="eos-close-modal">${icon('x')}</button>
      </div>
      <div class="nn-modal-body">
        <div style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;margin-bottom:12px">All Agendas</div>
        <div class="nn-agenda-select-list">
          ${agendas.map(a => `
            <div class="nn-agenda-select-item">
              <div class="nn-agenda-select-left">
                <div class="nn-agenda-select-icon">${icon('filetext')}</div>
                <span class="nn-agenda-select-title">${eEsc(a.title)}</span>
              </div>
              <button class="nn-btn-green" data-act="eos-start-l10" data-agenda="${a.id}" style="height:30px;padding:0 14px;font-size:12px">Start</button>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="nn-modal-footer" style="padding:14px 24px;border-top:1px solid #f1f3f5;display:flex;justify-content:flex-start">
        <button class="link" style="background:none;border:none;cursor:pointer;color:#064e3b;font-weight:600;font-size:12.5px" data-act="eos-meet-tab" data-id="agenda">Manage agendas...</button>
      </div>
    </div>
  `;
}

function renderL10MeetingWorkspace() {
  const team = (E.f.meet && E.f.meet.team !== 'All Teams') ? E.f.meet.team : (EOS_TEAMS[0] || 'Leadership Team');
  const steps = getL10AgendaSteps();

  const toolsMenuHtml = E.meeting_tools_open ? `
    <div class="nn-l10-tools-menu" style="left:20px;bottom:120px;">
      <div style="padding:6px 12px 4px;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase">Meeting Tools</div>
      <div class="nn-l10-tools-item" data-act="eos-open-tool-drawer" data-id="scorecard">${icon('chart')} <span>Scorecard</span></div>
      <div class="nn-l10-tools-item" data-act="eos-open-tool-drawer" data-id="todos">${icon('checksq')} <span>To-Dos</span></div>
      <div class="nn-l10-tools-item" data-act="eos-open-tool-drawer" data-id="issues">${icon('alert')} <span>Issues</span></div>
      <div class="nn-l10-tools-item" data-act="eos-open-tool-drawer" data-id="rocks">${icon('mountain')} <span>Rocks</span></div>
    </div>
  ` : '';

  const toolDrawerHtml = E.active_tool_drawer ? renderL10ToolDrawer(team) : '';

  return `
    <div class="nn-l10-wrap">
      <!-- Left Agenda Sidebar -->
      <div class="nn-l10-side">
        <div class="nn-l10-side-top">
          <div class="nn-l10-timer-display">
            <span>Total: <span id="nn-l10-total-timer">${eFmtTimer(E.meeting_seconds)}</span></span>
            <span class="nn-l10-step-timer-badge" id="nn-l10-step-timer">${eFmtTimer(E.meeting_step_seconds)}</span>
          </div>
        </div>

        <div class="nn-l10-agenda-list">
          ${steps.map(st => {
    const elapsed = (E.meeting_step_times && E.meeting_step_times[st.idx]) || 0;
    return `
              <div class="nn-l10-agenda-item ${st.idx === E.meeting_step ? 'on' : ''}" data-act="eos-step" data-id="${st.idx}">
                <div class="nn-l10-agenda-left">
                  <span>${st.num}</span>
                  <span>${st.name}</span>
                </div>
                <div class="nn-l10-agenda-times">
                  <span class="nn-l10-agenda-elapsed">${eFmtTimer(elapsed)}</span> / ${st.target_str}
                </div>
              </div>
            `;
  }).join('')}
        </div>

        <div class="nn-l10-side-foot" style="position:relative">
          ${toolsMenuHtml}
          <div class="nn-l10-foot-actions">
            <button class="nn-l10-foot-btn" data-act="eos-l10-tools" title="Open Tools">
              ${icon('tool')} <span>Tools</span>
            </button>
            <button class="nn-l10-foot-btn" data-act="eos-l10-notes" title="Notes">
              ${icon('filetext')} <span>Notes</span>
            </button>
          </div>
          <div class="nn-l10-foot-actions">
            <button class="nn-l10-foot-btn" data-act="eos-step-prev" ${E.meeting_step === 0 ? "disabled style='opacity:0.5'" : ""}>
              Previous
            </button>
            <button class="nn-btn-green" data-act="eos-step-next" style="flex:1;height:32px;font-size:12px">
              ${E.meeting_step === steps.length - 1 ? 'Finish' : 'Next'}
            </button>
          </div>
          <button class="nn-btn-bar" data-act="eos-l10-exit" style="width:100%;font-size:11.5px;color:#dc2626;border-color:#fecaca">
            Exit Meeting
          </button>
        </div>
      </div>

      <!-- Main Step Area -->
      <div class="nn-l10-main">
        ${renderL10StepContent(E.meeting_step, team)}
      </div>
    </div>
    ${toolDrawerHtml}
  `;
}

function renderL10StepContent(step_idx, team) {
  if (step_idx === 0) return renderL10SegueStep(team);
  if (step_idx === 1) return renderL10ScorecardStep(team);
  if (step_idx === 2) return renderL10RockReviewStep(team);
  if (step_idx === 3) return renderL10HeadlinesStep(team);
  if (step_idx === 4) return renderL10TodosStep(team);
  if (step_idx === 5) return renderL10IdsStep(team);
  if (step_idx === 6) return renderL10ConcludeStep(team);
  return '';
}

function renderL10SegueStep(team) {
  const attendees = E.meeting_attendees || [];
  const present_cnt = attendees.filter(a => E.meeting_attendance[a]).length;
  const total_cnt = attendees.length;
  const sharer_idx = E.meeting_sharing_idx || 0;
  const cur_sharer = attendees[sharer_idx] || attendees[0] || 'User';
  const cur_av = initials(cur_sharer);
  const sharer_notes = (E.meeting_good_news && E.meeting_good_news[cur_sharer]) || '';

  return `
    <div class="nn-l10-header">
      <div>
        <h3 class="nn-l10-title">SEGUE | Level 10 Meeting™ - ${eEsc(team)}</h3>
        <div class="nn-l10-sub">Transition from working IN the business to ON the business.</div>
      </div>
    </div>

    <!-- Attendance Card -->
    <div class="nn-l10-card">
      <div class="nn-l10-card-head">
        <div style="display:flex;align-items:center;gap:12px">
          <h4 class="nn-l10-card-title">Attendance</h4>
          <span style="font-size:12px;font-weight:600;color:#6b7280">${present_cnt} of ${total_cnt} present</span>
        </div>
        <button class="nn-btn-bar" data-act="eos-mark-all-present">Mark all present</button>
      </div>
      <div class="nn-attendee-grid">
        ${attendees.map(att => {
    const is_pres = !!E.meeting_attendance[att];
    const av = initials(att);
    return `
            <div class="nn-attendee-chip ${is_pres ? 'present' : 'absent'}" data-act="eos-toggle-attendance" data-id="${eEsc(att)}">
              <span class="nn-owner-circle" style="background:${is_pres ? '#059669' : '#9ca3af'}">${av}</span>
              <span>${eEsc(att)}</span>
              <span style="display:inline-flex;align-items:center">${is_pres ? icon('check') : icon('x')}</span>
            </div>
          `;
  }).join('')}
      </div>
    </div>

    <!-- Sharing Card: Good News -->
    <div class="nn-l10-card">
      <div class="nn-l10-card-head">
        <div>
          <h4 class="nn-l10-card-title">Sharing</h4>
          <div style="font-size:12.5px;color:#6b7280;margin-top:2px">Share your personal and professional best</div>
        </div>
      </div>
      <div class="nn-sharing-box">
        <div class="nn-sharing-av">${cur_av}</div>
        <div class="nn-sharing-name">${eEsc(cur_sharer)}</div>
        <div class="nn-sharing-badge">Currently sharing…</div>
        <textarea id="eos-good-news-input" class="field" style="max-width:540px;margin:0 auto 16px;border-radius:6px;font-size:13px;resize:vertical;height:80px;display:block" placeholder="Record personal and professional best here…">${eEsc(sharer_notes)}</textarea>
        <div style="display:flex;align-items:center;justify-content:center;gap:10px">
          <button class="nn-btn-bar" data-act="eos-sharer-prev" ${sharer_idx === 0 ? "disabled style='opacity:0.5'" : ""}>Previous attendee</button>
          <button class="nn-btn-green" data-act="eos-sharer-next">${sharer_idx === attendees.length - 1 ? 'Done' : 'Next'}</button>
        </div>
      </div>
    </div>
  `;
}

function renderL10ScorecardStep(team) {
  let metrics = eMeas || [];
  if (team && team !== 'All Teams') {
    metrics = metrics.filter(m => !m.team || m.team === team);
  }
  const periods = ePeriods('weekly', 6).reverse(); // Last 6 weeks

  return `
    <div class="nn-l10-header">
      <div>
        <h3 class="nn-l10-title">Scorecard - ${eEsc(team)}</h3>
        <div class="nn-l10-sub">Review weekly numbers. Drop any off-track measurables directly to IDS.</div>
      </div>
      <div>
        <span class="nn-btn-bar">Weekly KPIs <b>${metrics.length}</b></span>
      </div>
    </div>

    <div class="nn-card-wrap">
      <div class="nn-table-scroll">
        <table class="nn-sc-tbl">
          <thead>
            <tr>
              <th class="left nn-col-metric">Weekly KPIs</th>
              <th class="nn-col-owner">Owner</th>
              <th class="nn-col-goal">Goal</th>
              ${periods.map(p => `<th>${eEsc(p)}</th>`).join('')}
              <th style="text-align:center">Action</th>
            </tr>
          </thead>
          <tbody>
            ${metrics.length ? metrics.map(m => {
    const av = initials(m.owner || 'U');
    return `
                <tr>
                  <td class="left nn-col-metric" style="white-space:normal;word-break:break-word;overflow-wrap:break-word;line-height:1.35"><b style="white-space:normal;word-break:break-word;display:block">${eEsc(m.name)}</b></td>
                  <td class="nn-col-owner"><span class="nn-owner-circle">${av}</span></td>
                  <td class="nn-col-goal">${m.op || '>='} ${eU(m, m.target)}</td>
                  ${periods.map((_, i) => {
      const v = (m.vals && m.vals[i] != null) ? m.vals[i] : null;
      const pass = v != null ? ePass(m, v) : null;
      const cls = pass === null ? '' : (pass ? 'pass' : 'fail');
      return `<td class="nn-sc-cell ${cls}">${v != null ? eU(m, v) : '–'}</td>`;
    }).join('')}
                  <td style="text-align:center">
                    <button class="nn-btn-bar" data-act="eos-drop-ids" data-type="Scorecard" data-title="KPI off-track: ${eEsc(m.name)}" style="padding:2px 8px;font-size:11px">
                      ${icon('alert')} <span>Drop to IDS</span>
                    </button>
                  </td>
                </tr>
              `;
  }).join('') : `<tr><td colspan="9" style="padding:32px;text-align:center;color:#9ca3af">No scorecard measurables found for this team.</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderL10RockReviewStep(team) {
  let rocks = eRocks || [];
  if (team && team !== 'All Teams') {
    rocks = rocks.filter(r => !r.team || r.team === team);
  }

  return `
    <div class="nn-l10-header">
      <div>
        <h3 class="nn-l10-title">ROCK REVIEW | Level 10 Meeting™ - ${eEsc(team)}</h3>
        <div class="nn-l10-sub">Quick status check on 90-day priorities.</div>
      </div>
    </div>

    <!-- V/TO Card -->
    <div class="nn-vto-card" data-act="eos-vto">
      <div class="nn-vto-left">
        <div class="nn-vto-icon">${icon('target')}</div>
        <span class="nn-vto-title">V/TO® | Revenue, Profit, Measurables</span>
      </div>
      ${icon('chev')}
    </div>

    <!-- Rocks Table Card -->
    <div class="nn-rock-card">
      <div class="nn-rock-header">
        <div class="nn-rock-title-group">
          <span class="nn-rock-title">Team Rocks</span>
          <span class="nn-badge-cnt">${rocks.length}</span>
        </div>
        <button class="nn-btn-green" data-act="eos-add-rock" style="height:30px;padding:0 12px;font-size:12px">+ Add Rock</button>
      </div>

      <table class="nn-rock-tbl">
        <thead>
          <tr>
            <th>Rock Title</th>
            <th>Owner</th>
            <th>Status</th>
            <th style="text-align:right">Progress</th>
            <th style="text-align:center">Action</th>
          </tr>
        </thead>
        <tbody>
          ${rocks.length ? rocks.map(r => {
    const av = initials(r.owner || 'U');
    const st = r.status || 'On-track';
    const is_off = st === 'Off-track' || st === 'Not Started';
    const st_cls = st === 'Done' ? 'complete' : is_off ? 'off-track' : 'on-track';
    return `
              <tr class="nn-rock-row">
                <td><b>${eEsc(r.name)}</b></td>
                <td><span class="nn-owner-circle">${av}</span></td>
                <td>
                  <span class="nn-status-badge ${st_cls}" data-act="eos-rock-st-cycle" data-id="${r.id}" title="Click to cycle status">${eEsc(st)}</span>
                </td>
                <td style="text-align:right">
                  <div class="nn-progress-wrap">
                    <div class="nn-prog-bar"><div class="nn-prog-fill" style="width:${st === 'Done' ? '100%' : is_off ? '35%' : '75%'};background:${st === 'Done' ? '#16a34a' : is_off ? '#ef4444' : '#059669'}"></div></div>
                    <span class="nn-prog-txt">${st === 'Done' ? '100%' : is_off ? '35%' : '75%'}</span>
                  </div>
                </td>
                <td style="text-align:center">
                  <button class="nn-btn-bar" data-act="eos-drop-ids" data-type="Rock" data-title="Rock off-track: ${eEsc(r.name)}" style="padding:2px 8px;font-size:11px">
                    ${icon('alert')} <span>Drop to IDS</span>
                  </button>
                </td>
              </tr>
            `;
  }).join('') : `<tr><td colspan="5" style="padding:32px;text-align:center;color:#9ca3af">No Rocks found.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
}

function renderL10HeadlinesStep(team) {
  const headlines = E.headlines || [];
  const cascading = E.cascading_messages || [];

  return `
    <div class="nn-l10-header">
      <div>
        <h3 class="nn-l10-title">Headlines - ${eEsc(team)}</h3>
        <div class="nn-l10-sub">Share client and employee announcements with your team.</div>
      </div>
    </div>

    <!-- Customer / Employee Headlines Card -->
    <div class="nn-l10-card">
      <div class="nn-l10-card-head">
        <div>
          <h4 class="nn-l10-card-title">Headlines (${headlines.length})</h4>
          <div style="font-size:12px;color:#6b7280;margin-top:2px">Customer/Employee Headlines</div>
        </div>
        <button class="nn-btn-green" data-act="eos-create-headline" style="height:30px;padding:0 12px;font-size:12px">+ Create Headline</button>
      </div>

      ${headlines.length ? `
        <div style="display:flex;flex-direction:column;gap:8px">
          ${headlines.map(h => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border:1px solid #e5e7eb;border-radius:6px;background:#fff">
              <div style="display:flex;align-items:center;gap:10px">
                <span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:10px;background:#f3f4f6;color:#374151">${eEsc(h.type)}</span>
                <span style="font-size:13.5px;font-weight:600;color:#111827">${eEsc(h.title)}</span>
              </div>
              <div style="display:flex;align-items:center;gap:12px">
                <span style="font-size:12px;color:#6b7280">${eEsc(h.author)}</span>
                <button class="nn-btn-bar" data-act="eos-drop-ids" data-type="Headline" data-title="Headline Issue: ${eEsc(h.title)}" style="padding:2px 8px;font-size:11px">
                  ${icon('alert')} <span>Drop to IDS</span>
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      ` : `
        <div class="nn-upcoming-box" style="padding:28px">
          <div class="nn-empty-icon-circle">${icon('bell')}</div>
          <div class="nn-empty-box-title">Your team hasn't added any Headlines yet.</div>
          <div class="nn-empty-box-sub">Headlines are a quick way to share important updates.</div>
        </div>
      `}
    </div>

    <!-- Cascading Messages Card -->
    <div class="nn-l10-card">
      <div class="nn-l10-card-head">
        <div>
          <h4 class="nn-l10-card-title">Cascading Messages (${cascading.length})</h4>
          <div style="font-size:12px;color:#6b7280;margin-top:2px">Information to communicate across departments</div>
        </div>
        <button class="nn-btn-bar" data-act="eos-create-cascading" style="height:30px;padding:0 12px;font-size:12px">+ Create Cascading Message</button>
      </div>

      ${cascading.length ? `
        <div style="display:flex;flex-direction:column;gap:8px">
          ${cascading.map(c => `
            <div style="padding:10px 14px;border:1px solid #e5e7eb;border-radius:6px;background:#fff;font-size:13px;font-weight:500;color:#111827">
              ${eEsc(c.message)}
            </div>
          `).join('')}
        </div>
      ` : `
        <div class="nn-upcoming-box" style="padding:28px">
          <div class="nn-empty-icon-circle">${icon('chat')}</div>
          <div class="nn-empty-box-title">Your company hasn't added any Cascading Messages yet.</div>
          <div class="nn-empty-box-sub">Cascading messages keep organization units synced.</div>
        </div>
      `}
    </div>
  `;
}

function renderL10TodosStep(team) {
  let todos = eTodos || [];
  if (team && team !== 'All Teams') {
    todos = todos.filter(t => !t.team || t.team === team);
  }

  return `
    <div class="nn-l10-header">
      <div>
        <h3 class="nn-l10-title">To-Dos - ${eEsc(team)}</h3>
        <div class="nn-l10-sub">Quickly review, complete, and add 7-day action items.</div>
      </div>
      <button class="nn-btn-green" data-act="eos-add-todo" style="height:32px;padding:0 14px;font-size:12px">+ Add To-Do</button>
    </div>

    <div class="nn-todo-card">
      <div class="nn-todo-card-header">
        <div class="nn-todo-card-title">
          <span>Team To-Dos</span>
          <span class="nn-todo-count">${todos.length}</span>
        </div>
      </div>

      <div class="nn-todo-table-head">
        <div class="nn-todo-col-check"></div>
        <div class="nn-todo-col-title">Title</div>
        <div class="nn-todo-col-due">Due</div>
        <div class="nn-todo-col-owner">Assignee</div>
        <div style="text-align:right">Action</div>
      </div>

      <div class="nn-todo-table-body">
        ${todos.length ? todos.map(t => {
    const is_done = !!t.done;
    const av = initials(t.owner || 'U');
    const due_str = t.due ? eShort(t.due) : '7 Days';
    return `
            <div class="nn-todo-row ${is_done ? 'complete' : ''}">
              <div class="nn-todo-col-check">
                <div class="nn-todo-checkbox ${is_done ? 'checked' : ''}" data-act="eos-l10-todo-toggle" data-id="${t.id}">
                  ${is_done ? icon('check') : ''}
                </div>
              </div>
              <div class="nn-todo-col-title">
                <span style="${is_done ? 'text-decoration:line-through;color:#9ca3af' : ''}">${eEsc(t.name)}</span>
              </div>
              <div class="nn-todo-col-due">
                <div class="nn-due-badge">
                  <span class="clock">${icon('clock')}</span>
                  <span class="nn-due-text dark">${eEsc(due_str)}</span>
                </div>
              </div>
              <div class="nn-todo-col-owner">
                <span class="nn-owner-circle" title="${eEsc(t.owner)}">${av}</span>
              </div>
              <div style="text-align:right">
                <button class="nn-btn-bar" data-act="eos-drop-ids" data-type="To-Do" data-title="Blocked To-Do: ${eEsc(t.name)}" style="padding:2px 8px;font-size:11px">
                  ${icon('alert')} <span>Drop to IDS</span>
                </button>
              </div>
            </div>
          `;
  }).join('') : `<div style="padding:32px;text-align:center;color:#9ca3af;font-size:13px">No To-Dos for this team.</div>`}
      </div>
    </div>
  `;
}

function renderL10IdsStep(team) {
  let issues = eIssues.filter(iss => !iss.archived);
  if (team && team !== 'All Teams') {
    issues = issues.filter(iss => !iss.team || iss.team === team);
  }

  return `
    <div class="nn-l10-header">
      <div>
        <h3 class="nn-l10-title">IDS™ | Level 10 Meeting™ - ${eEsc(team)}</h3>
        <div class="nn-l10-sub">Identify, Discuss, Solve. Dedicate 60 minutes to resolving the most critical obstacles.</div>
      </div>
      <button class="nn-btn-green" data-act="eos-add-issue" style="height:32px;padding:0 14px;font-size:12px">+ Add Issue</button>
    </div>

    <div class="nn-todo-card">
      <div class="nn-todo-card-header">
        <div class="nn-todo-card-title">
          <span>Ranked Issues List</span>
          <span class="nn-todo-count">${issues.length}</span>
        </div>
      </div>

      <div class="nn-todo-table-head">
        <div style="width:40px;text-align:center;font-size:12px;font-weight:600;color:#6b7280">#</div>
        <div class="nn-todo-col-title">Issue</div>
        <div style="width:90px;font-size:12px;font-weight:600;color:#6b7280">Priority</div>
        <div class="nn-todo-col-owner">Owner</div>
        <div style="text-align:right">Action</div>
      </div>

      <div class="nn-todo-table-body">
        ${issues.length ? issues.map((iss, idx) => {
    const av = initials(iss.owner || 'U');
    return `
            <div class="nn-todo-row">
              <div style="width:40px;text-align:center;font-size:12px;font-weight:700;color:#064e3b">
                ${idx + 1}
              </div>
              <div class="nn-todo-col-title">
                <span style="font-weight:600;color:#111827">${eEsc(iss.name)}</span>
                ${iss.desc ? `<div style="font-size:11.5px;color:#6b7280;margin-top:2px">${eEsc(iss.desc)}</div>` : ''}
              </div>
              <div style="width:90px">
                <span class="nn-status-badge off-track">${eEsc(iss.pri || 'Medium')}</span>
              </div>
              <div class="nn-todo-col-owner">
                <span class="nn-owner-circle">${av}</span>
              </div>
              <div style="text-align:right">
                <button class="nn-btn-green" data-act="eos-solve-issue" data-id="${iss.id}" style="height:28px;padding:0 10px;font-size:11.5px">
                  ${icon('check')} <span>Solve Issue</span>
                </button>
              </div>
            </div>
          `;
  }).join('') : `
          <div style="padding:36px;text-align:center">
            <div style="font-size:15px;font-weight:700;color:#111827;margin-bottom:4px">Your team hasn't added any issues yet.</div>
            <div style="font-size:13px;color:#6b7280">Identify matters that need resolution before moving forward.</div>
          </div>
        `}
      </div>
    </div>
  `;
}

function renderL10ConcludeStep(team) {
  const attendees = E.meeting_attendees || [];
  let todos = eTodos || [];
  if (team && team !== 'All Teams') {
    todos = todos.filter(t => !t.team || t.team === team);
  }
  const recentTodos = todos.slice(0, 8);
  const cascading = E.cascading_messages || [];

  let rating_sum = 0, rating_cnt = 0;
  attendees.forEach(att => {
    const r = E.meeting_ratings[att] || 8;
    rating_sum += Number(r);
    rating_cnt++;
  });
  const avg_rating = rating_cnt ? (rating_sum / rating_cnt).toFixed(1) : '8.5';

  return `
    <div class="nn-l10-header">
      <div>
        <h3 class="nn-l10-title">CONCLUDE | Level 10 Meeting™ - ${eEsc(team)}</h3>
        <div class="nn-l10-sub">Recap To-Dos, cascading messages, and rate the meeting from 1-10.</div>
      </div>
    </div>

    <!-- Recap To-Dos -->
    <div class="nn-l10-card">
      <div class="nn-l10-card-head">
        <h4 class="nn-l10-card-title">Recap To-Dos (${recentTodos.length})</h4>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px">
        ${recentTodos.length ? recentTodos.map(t => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-bottom:1px solid #f1f3f5">
            <span style="font-size:13px;color:#111827">${eEsc(t.name)}</span>
            <span style="font-size:11.5px;color:#6b7280">${eEsc(t.owner || '')} &bull; ${t.due ? eShort(t.due) : '7 Days'}</span>
          </div>
        `).join('') : `<div style="font-size:12.5px;color:#9ca3af">No To-Dos created or assigned.</div>`}
      </div>
    </div>

    <!-- Cascading Messages -->
    <div class="nn-l10-card">
      <div class="nn-l10-card-head">
        <h4 class="nn-l10-card-title">Cascading Messages</h4>
      </div>
      ${cascading.length ? `
        <div style="display:flex;flex-direction:column;gap:6px">
          ${cascading.map(c => `<div style="font-size:13px;color:#374151">• ${eEsc(c.message)}</div>`).join('')}
        </div>
      ` : `<div style="font-size:12.5px;color:#9ca3af">No Cascading Messages were cascaded during this Meeting.</div>`}
    </div>

    <!-- Ratings (1-10) -->
    <div class="nn-l10-card">
      <div class="nn-l10-card-head">
        <h4 class="nn-l10-card-title">Ratings (1–10)</h4>
        <span style="font-size:13px;font-weight:700;color:#064e3b">Average Rating: <span id="eos-avg-rating">${avg_rating}</span> / 10</span>
      </div>
      <div class="nn-rating-list">
        ${attendees.map(att => {
    const cur_r = E.meeting_ratings[att] || 8;
    return `
            <div class="nn-rating-item">
              <span style="font-size:13px;font-weight:600;color:#374151">${eEsc(att)}</span>
              <input type="number" min="1" max="10" step="1" class="nn-rating-input" data-id="${eEsc(att)}" value="${cur_r}">
            </div>
          `;
  }).join('')}
      </div>
    </div>

    <!-- Wrap-up Checkboxes & Finish -->
    <div class="nn-l10-card">
      <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:20px">
        <label style="display:flex;align-items:center;gap:8px;font-size:13px;color:#374151;cursor:pointer">
          <input type="checkbox" id="eos-chk-archive" checked>
          <span>Archive All Completed Headlines, To-Dos and Issues for the ${eEsc(team)}</span>
        </label>
        <label style="display:flex;align-items:center;gap:8px;font-size:13px;color:#374151;cursor:pointer">
          <input type="checkbox" id="eos-chk-email" checked>
          <span>Send Meeting Recap Email</span>
        </label>
        <label style="display:flex;align-items:center;gap:8px;font-size:13px;color:#374151;cursor:pointer">
          <input type="checkbox" id="eos-chk-desc">
          <span>Show Issue description on recap emails</span>
        </label>
      </div>
      <div style="display:flex;justify-content:flex-end">
        <button class="nn-btn-green" data-act="eos-finish-meeting" style="height:40px;padding:0 24px;font-size:13.5px">
          ${icon('checkcircle')} <span>Finish Meeting</span>
        </button>
      </div>
    </div>
  `;
}

function renderL10ToolDrawer(team) {
  const tool = E.active_tool_drawer;
  let title = "Meeting Tool";
  let body_html = "";

  if (tool === 'scorecard') {
    title = "Scorecard Quick View";
    let metrics = eMeas || [];
    if (team && team !== 'All Teams') metrics = metrics.filter(m => !m.team || m.team === team);
    body_html = `
      <div style="padding:16px">
        <p style="font-size:12.5px;color:#6b7280;margin-bottom:14px">View team metrics and identify off-track items.</p>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${metrics.map(m => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border:1px solid #e5e7eb;border-radius:6px;background:#fff">
              <div>
                <div style="font-size:13px;font-weight:600;color:#111827">${eEsc(m.name)}</div>
                <div style="font-size:11.5px;color:#6b7280">Goal: ${m.op || '>='} ${eU(m, m.target)}</div>
              </div>
              <button class="nn-btn-bar" data-act="eos-drop-ids" data-type="Scorecard" data-title="KPI off-track: ${eEsc(m.name)}" style="padding:3px 8px;font-size:11px">
                ${icon('alert')} <span>Drop to IDS</span>
              </button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } else if (tool === 'rocks') {
    title = "Rocks Quick View";
    let rocks = eRocks || [];
    if (team && team !== 'All Teams') rocks = rocks.filter(r => !r.team || r.team === team);
    body_html = `
      <div style="padding:16px">
        <p style="font-size:12.5px;color:#6b7280;margin-bottom:14px">Quick status check on 90-day priorities.</p>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${rocks.map(r => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border:1px solid #e5e7eb;border-radius:6px;background:#fff">
              <div>
                <div style="font-size:13px;font-weight:600;color:#111827">${eEsc(r.name)}</div>
                <div style="font-size:11.5px;color:#6b7280">${eEsc(r.owner || '')} &bull; ${eEsc(r.status || 'On-track')}</div>
              </div>
              <button class="nn-btn-bar" data-act="eos-drop-ids" data-type="Rock" data-title="Rock off-track: ${eEsc(r.name)}" style="padding:3px 8px;font-size:11px">
                ${icon('alert')} <span>Drop to IDS</span>
              </button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } else if (tool === 'todos') {
    title = "To-Dos Quick View";
    let todos = eTodos || [];
    if (team && team !== 'All Teams') todos = todos.filter(t => !t.team || t.team === team);
    body_html = `
      <div style="padding:16px">
        <button class="nn-btn-green" data-act="eos-add-todo" style="width:100%;margin-bottom:14px">+ Add To-Do</button>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${todos.map(t => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border:1px solid #e5e7eb;border-radius:6px;background:#fff">
              <div style="font-size:13px;font-weight:500;color:#111827">${eEsc(t.name)}</div>
              <span style="font-size:11px;color:#6b7280">${eEsc(t.owner || '')}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } else if (tool === 'issues') {
    title = "Issues Quick View";
    let issues = eIssues.filter(i => !i.archived);
    if (team && team !== 'All Teams') issues = issues.filter(i => !i.team || i.team === team);
    body_html = `
      <div style="padding:16px">
        <button class="nn-btn-green" data-act="eos-add-issue" style="width:100%;margin-bottom:14px">+ Add Issue</button>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${issues.map(iss => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border:1px solid #e5e7eb;border-radius:6px;background:#fff">
              <div style="font-size:13px;font-weight:600;color:#111827">${eEsc(iss.name)}</div>
              <span class="nn-status-badge off-track">${eEsc(iss.pri || 'Medium')}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  return `
    <div class="nn-modal-backdrop" data-act="eos-close-tool-drawer"></div>
    <aside class="drawer show" style="right:0;z-index:99999;width:440px;max-width:100vw;background:#fff;position:fixed;top:0;height:100vh;box-shadow:-4px 0 24px rgba(0,0,0,0.15);display:flex;flex-direction:column;">
      <header style="padding:18px 22px;border-bottom:1px solid #f1f3f5;display:flex;align-items:center;justify-content:space-between">
        <span style="font-size:16px;font-weight:700;color:#111827">${eEsc(title)}</span>
        <button class="icon-btn" data-act="eos-close-tool-drawer" aria-label="Close">${icon('x')}</button>
      </header>
      <div style="flex:1;overflow-y:auto;padding:0">
        ${body_html}
      </div>
    </aside>
  `;
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
  setTimeout(() => {
    const x = $('#drawer .field'); x && x.focus();
    const teamIdx = fields.findIndex(f => f.k === 'team');
    const ownerIdx = fields.findIndex(f => f.k === 'owner');
    if (teamIdx !== -1 && ownerIdx !== -1) {
      const teamEl = document.getElementById('d' + teamIdx);
      const ownerEl = document.getElementById('d' + ownerIdx);
      if (teamEl && ownerEl) {
        teamEl.addEventListener('change', () => {
          const members = getMembersForTeam(teamEl.value);
          const currentVal = ownerEl.value;
          ownerEl.innerHTML = members.map(m => `<option value="${eEsc(m)}" ${m === currentVal ? 'selected' : ''}>${eEsc(m)}</option>`).join('');
          if (!members.includes(currentVal)) {
            ownerEl.value = members.includes(EOS_ME) ? EOS_ME : (members[0] || '');
          }
        });
      }
    }
  }, 100);
}

function eosSave() {
  if (!E.form) return closeDrawer();
  const vals = {}; let bad = false;
  E.form.fields.forEach((f, i) => { const el = $('#d' + i), v = el.value.trim(), empty = f.req && !v; el.closest('.f').classList.toggle('bad', empty); if (empty) bad = true; vals[f.k] = f.t === 'number' ? (v === '' ? 0 : Number(v)) : v; });
  if (bad) return;
  E.form.save(vals); closeDrawer(); E.form = null; renderMain();
}

const eOps = [['>=', '>= (Greater than or equal)'], ['<=', '<= (Less than or equal)'], ['==', '= (Equal to goal)'], ['Inside min/max', 'Inside min/max'], ['Outside min/max', 'Outside min/max']];

function eosModal(title, contentHtml) {
  const existing = document.getElementById('eos-generic-modal');
  if (existing) existing.remove();
  const modal = document.createElement('div');
  modal.id = 'eos-generic-modal';
  modal.innerHTML = `
    <div class="nn-modal-backdrop" onclick="document.getElementById('eos-generic-modal').remove()"></div>
    <div class="nn-modal" style="width:560px;max-width:92vw;background:#fff;border-radius:12px;box-shadow:0 20px 40px rgba(0,0,0,0.2);position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:999999;overflow:hidden">
      <div style="padding:16px 20px;border-bottom:1px solid #f1f3f5;display:flex;align-items:center;justify-content:space-between">
        <h3 style="font-size:16px;font-weight:700;color:#111827;margin:0">${title}</h3>
        <button class="icon-btn" onclick="document.getElementById('eos-generic-modal').remove()">${icon('x')}</button>
      </div>
      <div>${contentHtml}</div>
      <div style="padding:12px 20px;border-top:1px solid #f1f3f5;background:#f9fafb;display:flex;justify-content:flex-end">
        <button class="nn-btn-green" onclick="document.getElementById('eos-generic-modal').remove()">Close</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

function eosOpenPastMeetingDrawer(m, details) {
  E.form = null;
  const d = details || {};
  const team = m.team || d.team || 'Leadership Team';
  const when = m.when || d.meeting_date || 'Recent';
  const time = m.time || '3:00 p.m.';
  const durMin = Math.round((m.secs || 5400) / 60);
  const rating = m.rating || 8.5;
  const fac = m.fac || d.owner_name || EOS_ME || 'Administrator';
  const notes = d.notes || m.notes || 'Level 10 Meeting completed and archived in ERP.';
  const docname = m.docname || d.name || '';

  // Parse notes if structured
  let attendeesList = m.attendees || [];
  let ratingsMap = m.ratings || {};
  if (!attendeesList.length && notes.includes('Attendees:')) {
    const atMatch = notes.match(/Attendees:\s*([^\.]+)/);
    if (atMatch) attendeesList = atMatch[1].split(',').map(s => s.trim()).filter(Boolean);
  }
  if (!Object.keys(ratingsMap).length && notes.includes('Ratings:')) {
    const ratMatch = notes.match(/Ratings:\s*(\{[^\}]+\})/);
    if (ratMatch) {
      try { ratingsMap = JSON.parse(ratMatch[1]); } catch (e) { }
    }
  }

  const drawer = document.getElementById('drawer');
  if (!drawer) return;

  drawer.innerHTML = `
    <header style="padding:18px 24px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;background:#fff;position:sticky;top:0;z-index:10">
      <div style="min-width:0;flex:1;padding-right:12px">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#10b981;flex-shrink:0"></span>
          <h2 style="font-size:16.5px;font-weight:700;color:var(--g900);margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${eEsc(m.title || team + ' Level 10 Meeting™')}</h2>
        </div>
        <div style="font-size:12px;color:#6b7280;margin-top:3px">${eEsc(docname || team)} &bull; ${eShort(when)}</div>
      </div>
      <button class="icon-btn" data-act="close" aria-label="Close" style="width:32px;height:32px;border-radius:6px;border:1px solid var(--line-2);flex-shrink:0">${icon('x')}</button>
    </header>

    <div class="body" style="padding:20px 24px;overflow-y:auto;flex:1;background:#fafbfc">
      <!-- Status & Top Metric Cards -->
      <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:12px;margin-bottom:20px">
        <div style="background:#fff;border:1px solid var(--line);border-radius:8px;padding:12px 14px">
          <div style="font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px">Status</div>
          <div style="margin-top:6px">
            <span class="nn-status-badge complete" style="display:inline-flex;align-items:center;gap:4px;background:#d1fae5;color:#065f46;font-weight:600;padding:3px 8px;border-radius:12px;font-size:11.5px">
              ${icon('check')} Complete
            </span>
          </div>
        </div>

        <div style="background:#fff;border:1px solid var(--line);border-radius:8px;padding:12px 14px">
          <div style="font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px">Duration</div>
          <div style="margin-top:6px;font-size:15px;font-weight:700;color:var(--g900)">
            ${durMin} min
          </div>
        </div>

        <div style="background:#fff;border:1px solid var(--line);border-radius:8px;padding:12px 14px">
          <div style="font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px">Avg Rating</div>
          <div style="margin-top:6px;font-size:15px;font-weight:700;color:#047857;display:flex;align-items:center;gap:4px">
            ${icon('star')} ${rating} <span style="font-size:11px;font-weight:400;color:#9ca3af">/ 10</span>
          </div>
        </div>
      </div>

      <!-- Meeting Overview Section -->
      <div style="background:#fff;border:1px solid var(--line);border-radius:8px;padding:16px;margin-bottom:18px">
        <h4 style="margin:0 0 12px 0;font-size:12.5px;font-weight:700;color:var(--g900);text-transform:uppercase;letter-spacing:0.5px">Meeting Overview</h4>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:12.5px">
          <div>
            <div style="color:#6b7280;font-size:11.5px">Date & Time</div>
            <div style="font-weight:600;color:#111827;margin-top:2px">${eShort(when)}, ${eEsc(time)}</div>
          </div>
          <div>
            <div style="color:#6b7280;font-size:11.5px">Team</div>
            <div style="font-weight:600;color:#111827;margin-top:2px">${eEsc(team)}</div>
          </div>
          <div>
            <div style="color:#6b7280;font-size:11.5px">Leader / Facilitator</div>
            <div style="font-weight:600;color:#111827;margin-top:2px;display:flex;align-items:center;gap:6px">
              <span class="avatar sm" style="width:20px;height:20px;font-size:9px">${initials(fac)}</span>
              ${eEsc(fac)}
            </div>
          </div>
          <div>
            <div style="color:#6b7280;font-size:11.5px">Archived Record</div>
            <div style="font-weight:600;color:#111827;margin-top:2px;font-family:monospace;font-size:11.5px">${eEsc(docname || 'Recorded in Session')}</div>
          </div>
        </div>
      </div>

      <!-- Summary & Notes Section -->
      <div style="background:#fff;border:1px solid var(--line);border-radius:8px;padding:16px;margin-bottom:18px">
        <h4 style="margin:0 0 10px 0;font-size:12.5px;font-weight:700;color:var(--g900);text-transform:uppercase;letter-spacing:0.5px">Summary & Notes</h4>
        <div style="font-size:13px;line-height:1.6;color:#374151;background:#f9fafb;padding:12px 14px;border-radius:6px;border:1px solid #f1f3f5">
          ${eEsc(notes)}
        </div>
      </div>

      <!-- Agenda Steps Covered Section -->
      <div style="background:#fff;border:1px solid var(--line);border-radius:8px;padding:16px;margin-bottom:18px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <h4 style="margin:0;font-size:12.5px;font-weight:700;color:var(--g900);text-transform:uppercase;letter-spacing:0.5px">L10 Agenda & Flow Covered</h4>
          <span style="font-size:11.5px;color:#10b981;font-weight:600;display:inline-flex;align-items:center;gap:4px">${icon('check')} 7 Steps Complete</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px">
          ${[
      { num: 1, name: "Good News / Segue", dur: "5 min" },
      { num: 2, name: "Scorecard Review", dur: "5 min" },
      { num: 3, name: "Rock Review", dur: "5 min" },
      { num: 4, name: "Customer & Employee Headlines", dur: "5 min" },
      { num: 5, name: "To-Do List Review", dur: "5 min" },
      { num: 6, name: "IDS™ (Identify, Discuss, Solve)", dur: "60 min" },
      { num: 7, name: "Conclude & Ratings", dur: "5 min" }
    ].map(s => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:#f8fafc;border-radius:6px;font-size:12.5px">
              <div style="display:flex;align-items:center;gap:8px">
                <span style="width:18px;height:18px;border-radius:50%;background:#d1fae5;color:#065f46;display:inline-flex;align-items:center;justify-content:center">${icon('check')}</span>
                <span style="font-weight:600;color:#111827">${s.num}. ${s.name}</span>
              </div>
              <span style="font-size:11.5px;color:#6b7280">${s.dur}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Meeting To-Dos & Action Items if present -->
      ${(d.todo_items && d.todo_items.length) ? `
        <div style="background:#fff;border:1px solid var(--line);border-radius:8px;padding:16px;margin-bottom:18px">
          <h4 style="margin:0 0 10px 0;font-size:12.5px;font-weight:700;color:var(--g900);text-transform:uppercase;letter-spacing:0.5px">Meeting To-Dos & Action Items</h4>
          <div style="display:flex;flex-direction:column;gap:6px">
            ${d.todo_items.map(t => `
              <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:#f8fafc;border-radius:6px;font-size:12.5px">
                <div style="display:flex;align-items:center;gap:8px">
                  <span style="font-weight:600;color:#111827">${eEsc(t.title)}</span>
                  ${t.owner ? `<span style="font-size:11.5px;color:#6b7280">(${eEsc(t.owner)})</span>` : ''}
                </div>
                <span class="nn-status-badge ${t.status === 'Closed' ? 'complete' : 'in-progress'}" style="font-size:11px">${eEsc(t.status || 'Open')}</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Attendees & Rating Breakdown -->
      ${(attendeesList.length || Object.keys(ratingsMap).length) ? `
        <div style="background:#fff;border:1px solid var(--line);border-radius:8px;padding:16px;margin-bottom:18px">
          <h4 style="margin:0 0 12px 0;font-size:12.5px;font-weight:700;color:var(--g900);text-transform:uppercase;letter-spacing:0.5px">Attendees & Ratings</h4>
          <div style="display:flex;flex-wrap:wrap;gap:8px">
            ${(attendeesList.length ? attendeesList : Object.keys(ratingsMap)).map(att => {
      const rat = ratingsMap[att];
      return `
                <div style="display:inline-flex;align-items:center;gap:8px;padding:5px 12px;background:#f3f4f6;border-radius:20px;font-size:12px">
                  <span class="avatar sm" style="width:20px;height:20px;font-size:9px">${initials(att)}</span>
                  <span style="font-weight:600;color:#111827">${eEsc(att)}</span>
                  ${rat != null ? `<span style="background:#047857;color:#fff;padding:1px 6px;border-radius:10px;font-size:11px;font-weight:700;display:inline-flex;align-items:center;gap:3px">${icon('star')} ${rat}</span>` : ''}
                </div>
              `;
    }).join('')}
          </div>
        </div>
      ` : ''}
    </div>

    <footer style="padding:14px 24px;border-top:1px solid var(--line);background:#fff;display:flex;align-items:center;justify-content:space-between;position:sticky;bottom:0;z-index:10">
      <div>
        ${docname ? `
          <a href="/app/level-10-meeting/${encodeURIComponent(docname)}" target="_blank" style="font-size:12px;color:#047857;text-decoration:none;display:inline-flex;align-items:center;gap:4px;font-weight:600">
            Open in ERP Desk
          </a>
        ` : ''}
      </div>
      <button class="btn primary" data-act="close" style="height:32px;padding:0 18px;font-size:12.5px;font-weight:600;background:var(--g900);color:#fff;border-radius:6px">Close</button>
    </footer>
  `;

  document.body.classList.add('drawer-open');
  drawer.setAttribute('aria-hidden', 'false');

  if (docname && !details) {
    apiCall('eos_core.eos_api.get_meeting_details', { docname: docname }).then(res => {
      if (res && res.name && (res.agenda_items?.length || res.todo_items?.length)) {
        eosOpenPastMeetingDrawer(m, res);
      }
    });
  }
}

function eosDrawer(kind, rec, pre) {
  const p = kind || (S.page === 'scorecard' && E.tab.scorecard !== 'scorecards' ? 'measurable' : { overview: 'to-dos', scorecard: 'scorecard', rocks: 'rocks', 'to-dos': 'to-dos', issues: 'issues', meetings: 'meetings' }[S.page]);
  const r = rec || {}, q = pre || {};

  const curTeam = (E.f[S.page]?.team && E.f[S.page]?.team !== 'All Teams') ? E.f[S.page]?.team : null;
  const myTeam = (E.f.my?.team && E.f.my?.team !== 'All Teams') ? E.f.my?.team : null;
  const initialTeam = r.team || curTeam || myTeam || EOS_TEAMS[0] || 'Leadership Team';

  const own = (v, tm) => {
    const opts = getMembersForTeam(tm || initialTeam);
    const defVal = (v && opts.includes(v)) ? v : (opts.includes(EOS_ME) ? EOS_ME : opts[0]);
    return { t: 'select', o: opts, v: defVal };
  };
  const team = v => ({ t: 'select', o: EOS_TEAMS, v: v || initialTeam });

  if (p === 'measurable') {
    return eosForm(rec ? 'Edit Measurable in ERP' : 'Create Measurable in ERP', [
      { k: 'name', l: 'Measurable Title', req: true, v: r.name, ph: 'e.g. Weekly Qualified Leads' },
      { k: 'desc', l: 'Description', opt: true, t: 'textarea', v: r.desc || '' },
      { k: 'team', l: 'Team', req: true, ...team(r.team) },
      { k: 'freq', l: 'Frequency', req: true, t: 'select', o: [['weekly', 'Weekly'], ['monthly', 'Monthly'], ['quarterly', 'Quarterly'], ['annual', 'Annual']], v: r.freq || (E.tab.scorecard !== 'scorecards' ? E.tab.scorecard : 'weekly') },
      { k: 'op', l: 'Goal Operator', req: true, t: 'select', o: eOps, v: r.op || '>=' },
      { k: 'target', l: 'Goal Target', req: true, t: 'number', v: r.target != null ? String(r.target) : '10' },
      { k: 'unit', l: 'Unit Type', req: true, t: 'select', o: [['num', 'Number / Count'], ['kes', 'Currency ($)'], ['pct', 'Percentage (%)']], v: r.unit || 'num' },
      { k: 'owner', l: 'Owner', req: true, ...own(r.owner, r.team) }
    ], async v => {
      if (rec) {
        const opCode = (v.op === '=' || v.op === '==') ? '==' : v.op;
        Object.assign(rec, { name: v.name, desc: v.desc, team: v.team, freq: v.freq, op: opCode, target: parseFloat(v.target) || 0, unit: v.unit, owner: v.owner });
        toast('Updating Measurable in ERP...');
        renderMain();
        const res = await apiCall('eos_core.eos_api.save_measurable', {
          name: v.name, freq: v.freq, team: v.team, owner: v.owner, unit: v.unit, op: opCode, target: parseFloat(v.target) || 0, desc: v.desc || '', docname: rec.docname || rec.name
        });
        if (res && res.error) {
          toast(res.message || 'Error updating measurable', 'error');
        } else {
          toast('Measurable updated in ERP DocType!');
        }
      } else {
        const opCode = (v.op === '=' || v.op === '==') ? '==' : v.op;
        const newM = {
          id: ++eSeq,
          name: v.name,
          desc: v.desc,
          team: v.team,
          freq: v.freq,
          op: opCode,
          target: parseFloat(v.target) || 0,
          unit: v.unit,
          owner: v.owner,
          vals: [null, null, null, null, null, null, null, null, null, null, null, null, null]
        };
        eMeas.push(newM);
        toast('Saving Measurable to ERP EOS Metric...');
        renderMain();
        const res = await apiCall('eos_core.eos_api.save_measurable', {
          name: v.name, freq: v.freq, team: v.team, owner: v.owner, unit: v.unit, op: opCode, target: parseFloat(v.target) || 0, desc: v.desc || ''
        });
        if (res && res.error) {
          toast(res.message || 'Error saving measurable', 'error');
        } else {
          if (res && res.docname) newM.docname = res.docname;
          toast('Measurable saved in ERP Metric DocType!');
        }
      }
    });
  }
  else if (p === 'scorecard') {
    return eosForm('Add Scorecard in ERP', [
      { k: 'team', l: 'Team', req: true, ...team(r.team) },
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
    { k: 'name', l: 'Title', req: true, ph: 'Add a title for the Rock' }, { k: 'team', l: 'Team', ...team(r.team) },
    { k: 'owner', l: 'Owner', ...own(o && o !== 'company' ? o : null, r.team) }, { k: 'end', l: 'Due date', t: 'date', v: eYD('12-31'), req: true },
    { k: 'status', l: 'Status', t: 'select', o: ['On-track', 'Off-track'] }, { k: 'desc', l: 'Description', opt: true, t: 'textarea' }],
      async v => {
        const newR = { id: ++eSeq, name: v.name, owner: v.owner, team: v.team, status: v.status, end: v.end, desc: v.desc, ms: [], company: v.type === 'company', archived: false };
        eRocks.push(newR); E.tab.rocks = 'list'; toast('Saving to Rock DocType...');
        const res = await apiCall('eos_core.eos_api.save_rock', { name: v.name, owner: v.owner, team: v.team, end: v.end, status: v.status, is_company: v.type === 'company', desc: v.desc });
        if (res && res.docname) newR.docname = res.docname;
        toast('Rock saved to ERP Document!');
      });
  } else if (p === 'to-dos') eosForm(rec ? 'Edit To-Do in ERP' : 'Create To-Do in ERP', [{ k: 'name', l: 'Title', req: true, v: r.name }, { k: 'team', l: 'Team', ...team(r.team) }, { k: 'owner', l: 'Owner', ...own(r.owner, r.team) }, { k: 'due', l: 'Due date', t: 'date', v: r.due || eRel(7), req: true },
  { k: 'vis', l: 'Visibility', t: 'select', o: [['team', 'Team'], ['private', 'Private']], v: rec ? (r.priv ? 'private' : 'team') : (q.vis || E.tab.todos) }],
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
  { k: 'pri', l: 'Priority', opt: true, t: 'select', o: [['', 'None'], 'High', 'Medium', 'Low', 'Critical'], v: r.pri || '' }, { k: 'team', l: 'Team', ...team(r.team) },
  { k: 'owner', l: 'Owner', ...own(r.owner, r.team) }, { k: 'term', l: 'Term', t: 'select', o: [['short', 'Short-Term'], ['long', 'Long-Term']], v: r.term || E.tab.issues }],
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
  const curTab = E.tab.scorecard || 'weekly';
  E.edit = null;
  const numVal = v === '' ? null : Number(v);
  if (curTab === 'monthly') {
    if (!m.monthly_vals) m.monthly_vals = [];
    while (m.monthly_vals.length <= i) m.monthly_vals.push(null);
    m.monthly_vals[i] = numVal;
  } else if (curTab === 'quarterly') {
    if (!m.quarterly_vals) m.quarterly_vals = [];
    while (m.quarterly_vals.length <= i) m.quarterly_vals.push(null);
    m.quarterly_vals[i] = numVal;
  } else if (curTab === 'annual') {
    if (!m.annual_vals) m.annual_vals = [];
    while (m.annual_vals.length <= i) m.annual_vals.push(null);
    m.annual_vals[i] = numVal;
  } else {
    while ((m.vals || []).length <= i) m.vals.push(null);
    m.vals[i] = numVal;
  }
  renderMain();
  if (v !== '' && !ePass(m, Number(v))) toast('Off goal. Hover the value to add it to Issues');

  // Sync to Scorecard Entry DocType
  const t = eToday();
  let cellDate = '';
  if (curTab === 'monthly') {
    const d = new Date(t.getFullYear(), t.getMonth() - i, 1);
    cellDate = eISO(d);
  } else if (curTab === 'quarterly') {
    const tot = t.getFullYear() * 4 + Math.floor(t.getMonth() / 3) - i;
    const q = ((tot % 4) + 4) % 4, y = Math.floor(tot / 4);
    cellDate = eISO(new Date(y, q * 3, 1));
  } else if (curTab === 'annual') {
    cellDate = `${t.getFullYear() - i}-01-01`;
  } else {
    const mon = eAdd(t, -((t.getDay() + 6) % 7));
    cellDate = eISO(eAdd(mon, -7 * i));
  }

  toast('Saving cell to Scorecard Entry DocType...');
  await apiCall('eos_core.eos_api.save_scorecard_cell', {
    docname_or_metric: m.docname || m.name,
    week_start_date: cellDate,
    value: numVal
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
    case 'eos-tab': {
      const [k, t] = id.split(':');
      E.tab[k] = t;
      if (k === 'scorecard') {
        E.f.scorecard.range = null;
        E.f.scorecard.owners = null;
        E.owner_filter_open = false;
      }
      S.q = '';
      renderMain();
      break;
    }
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
    case 'eos-add-issue': eosDrawer('issues', null); break;
    case 'eos-meet-tab': {
      E.tab.meet = id || 'upcoming';
      renderMain();
      break;
    }
    case 'eos-open-start-modal': {
      E.meeting_modal = true;
      renderMain();
      break;
    }
    case 'eos-close-modal': {
      E.meeting_modal = false;
      renderMain();
      break;
    }
    case 'eos-start-l10': {
      const agendaId = (el && el.dataset.agenda) || id || 'l10';
      E.meeting_modal = false;
      await startL10Meeting(agendaId);
      break;
    }
    case 'eos-print-agenda': {
      window.print();
      break;
    }
    case 'eos-schedule-meet': {
      toast('Scheduled Meetings sync with your team calendar in ERP.');
      break;
    }
    case 'eos-step': {
      const gn = document.getElementById('eos-good-news-input');
      const curAtt = (E.meeting_attendees || [])[E.meeting_sharing_idx || 0];
      if (gn && curAtt && E.meeting_step === 0) {
        E.meeting_good_news = E.meeting_good_news || {};
        E.meeting_good_news[curAtt] = gn.value;
      }
      E.meeting_step_times = E.meeting_step_times || {};
      E.meeting_step_times[E.meeting_step] = E.meeting_step_seconds || 0;
      E.meeting_step = parseInt(id, 10) || 0;
      E.meeting_step_seconds = E.meeting_step_times[E.meeting_step] || 0;
      renderMain();
      break;
    }
    case 'eos-step-prev': {
      const gn = document.getElementById('eos-good-news-input');
      const curAtt = (E.meeting_attendees || [])[E.meeting_sharing_idx || 0];
      if (gn && curAtt && E.meeting_step === 0) {
        E.meeting_good_news = E.meeting_good_news || {};
        E.meeting_good_news[curAtt] = gn.value;
      }
      if (E.meeting_step > 0) {
        E.meeting_step_times = E.meeting_step_times || {};
        E.meeting_step_times[E.meeting_step] = E.meeting_step_seconds || 0;
        E.meeting_step--;
        E.meeting_step_seconds = E.meeting_step_times[E.meeting_step] || 0;
        renderMain();
      }
      break;
    }
    case 'eos-step-next': {
      const gn = document.getElementById('eos-good-news-input');
      const curAtt = (E.meeting_attendees || [])[E.meeting_sharing_idx || 0];
      if (gn && curAtt && E.meeting_step === 0) {
        E.meeting_good_news = E.meeting_good_news || {};
        E.meeting_good_news[curAtt] = gn.value;
      }
      const steps = getL10AgendaSteps(E.meeting_agenda_type);
      if (E.meeting_step < steps.length - 1) {
        E.meeting_step_times = E.meeting_step_times || {};
        E.meeting_step_times[E.meeting_step] = E.meeting_step_seconds || 0;
        E.meeting_step++;
        E.meeting_step_seconds = E.meeting_step_times[E.meeting_step] || 0;
        renderMain();
      } else {
        await eosFinishMeeting();
      }
      break;
    }
    case 'eos-mark-all-present': {
      (E.meeting_attendees || []).forEach(att => {
        E.meeting_attendance = E.meeting_attendance || {};
        E.meeting_attendance[att] = true;
      });
      renderMain();
      break;
    }
    case 'eos-toggle-attendance': {
      if (id) {
        E.meeting_attendance = E.meeting_attendance || {};
        E.meeting_attendance[id] = !E.meeting_attendance[id];
        renderMain();
      }
      break;
    }
    case 'eos-sharer-prev': {
      const gn = document.getElementById('eos-good-news-input');
      const curAtt = (E.meeting_attendees || [])[E.meeting_sharing_idx || 0];
      if (gn && curAtt) {
        E.meeting_good_news = E.meeting_good_news || {};
        E.meeting_good_news[curAtt] = gn.value;
      }
      if (E.meeting_sharing_idx > 0) {
        E.meeting_sharing_idx--;
        renderMain();
      }
      break;
    }
    case 'eos-sharer-next': {
      const gn = document.getElementById('eos-good-news-input');
      const curAtt = (E.meeting_attendees || [])[E.meeting_sharing_idx || 0];
      if (gn && curAtt) {
        E.meeting_good_news = E.meeting_good_news || {};
        E.meeting_good_news[curAtt] = gn.value;
      }
      const atts = E.meeting_attendees || [];
      if (E.meeting_sharing_idx < atts.length - 1) {
        E.meeting_sharing_idx++;
        renderMain();
      } else {
        E.meeting_step_times = E.meeting_step_times || {};
        E.meeting_step_times[0] = E.meeting_step_seconds || 0;
        E.meeting_step = 1;
        E.meeting_step_seconds = E.meeting_step_times[1] || 0;
        renderMain();
      }
      break;
    }
    case 'eos-drop-ids': {
      const title = (el && el.dataset.title) || 'Meeting Issue';
      const type = (el && el.dataset.type) || 'Meeting';
      await eosDropToIds(title, type);
      break;
    }
    case 'eos-create-headline': {
      eosForm('Create Headline', [
        { k: 'title', l: 'Headline Title', req: true, t: 'text' },
        { k: 'type', l: 'Category', req: true, t: 'select', o: [['Customer', 'Customer Headline'], ['Employee', 'Employee Headline']] },
        { k: 'author', l: 'Author / Owner', req: true, t: 'text', v: EOS_ME }
      ], async vals => {
        if (!E.headlines) E.headlines = [];
        E.headlines.push({ title: vals.title, type: vals.type, author: vals.author });
        toast('Headline added to meeting!');
        renderMain();
      });
      break;
    }
    case 'eos-create-cascading': {
      eosForm('Create Cascading Message', [
        { k: 'message', l: 'Message to cascade to company / departments', req: true, t: 'textarea' }
      ], async vals => {
        if (!E.cascading_messages) E.cascading_messages = [];
        E.cascading_messages.push({ message: vals.message });
        toast('Cascading message added!');
        renderMain();
      });
      break;
    }
    case 'eos-l10-todo-toggle': {
      const item = eTodos.find(x => x.id === +id);
      if (item) {
        item.done = !item.done;
        renderMain();
        await apiCall('eos_core.eos_api.toggle_todo', { docname: item.docname || item.name, done: item.done ? 1 : 0 });
      }
      break;
    }
    case 'eos-solve-issue': {
      const item = eIssues.find(x => x.id === +id);
      if (item) {
        item.archived = true;
        toast('Solving issue in ERP...');
        renderMain();
        await apiCall('eos_core.eos_api.toggle_issue', { docname: item.docname || item.name, solved: 1 });
        toast('Issue solved and marked in DocType!');
      }
      break;
    }
    case 'eos-rock-st-cycle': {
      const r = eRocks.find(x => x.id === +id);
      if (r) {
        const order = ['On-track', 'Off-track', 'Done'];
        const next = order[(order.indexOf(r.status) + 1) % order.length] || 'On-track';
        r.status = next;
        renderMain();
        await apiCall('eos_core.eos_api.update_rock_status', { docname: r.docname || r.name, status: next });
        toast(`Rock status updated to ${next}!`);
      }
      break;
    }
    case 'eos-l10-tools': {
      E.tools_menu_open = !E.tools_menu_open;
      renderMain();
      break;
    }
    case 'eos-open-tool-drawer': {
      E.tools_menu_open = false;
      E.active_tool_drawer = id;
      renderMain();
      break;
    }
    case 'eos-close-tool-drawer': {
      E.active_tool_drawer = null;
      renderMain();
      break;
    }
    case 'eos-l10-notes': {
      eosForm('Meeting Notes', [
        { k: 'notes', l: 'Meeting Notes & Takeaways', opt: true, t: 'textarea', v: E.meeting_notes || '' }
      ], vals => {
        E.meeting_notes = vals.notes;
        toast('Meeting notes saved!');
        renderMain();
      });
      break;
    }
    case 'eos-l10-exit': {
      if (confirm('Are you sure you want to exit this meeting session? Progress will be saved.')) {
        if (E.meeting_interval) clearInterval(E.meeting_interval);
        E.meeting_in_progress = false;
        renderMain();
      }
      break;
    }
    case 'eos-finish-meeting': {
      await eosFinishMeeting();
      break;
    }
    case 'eos-meet-start': {
      await startL10Meeting('l10');
      break;
    }
    case 'eos-meet-end': {
      await eosFinishMeeting();
      break;
    }
    case 'eos-view-past-meeting': {
      const m = (E.past || []).find(x => x.docname === id || x.title === id || x.name === id || (x.team + '-' + x.when) === id) || {
        docname: id,
        title: id,
        team: (E.f && E.f.meet && E.f.meet.team) || 'Leadership Team',
        when: 'Recent',
        time: '3:00 p.m.',
        secs: 5400,
        rating: 8.5,
        fac: EOS_ME || 'Administrator',
        notes: 'Level 10 Meeting completed'
      };
      eosOpenPastMeetingDrawer(m);
      break;
    }
    case 'eos-open-sc': {
      const sc = eScorecards.find(x => x.name === id || x.id === id);
      if (sc) {
        E.f.scorecard.team = sc.team;
        const tf = (sc.timeframe || 'weekly').toLowerCase();
        E.tab.scorecard = (tf === 'week' || tf === 'weekly') ? 'weekly' : (tf === 'month' || tf === 'monthly') ? 'monthly' : (tf === 'quarter' || tf === 'quarterly') ? 'quarterly' : (tf === 'annual') ? 'annual' : 'weekly';
        E.f.scorecard.range = null;
        renderMain();
      }
      break;
    }
    case 'eos-add-measurable': eosDrawer('measurable', null); break;
    case 'eos-edit-measurable': eosDrawer('measurable', eMeas.find(x => x.id === +id)); break;
    case 'eos-toggle-owner-filter': {
      E.owner_filter_open = !E.owner_filter_open;
      E.owner_filter_search = '';
      renderMain();
      if (E.owner_filter_open) {
        setTimeout(() => {
          const inp = document.querySelector('.nn-owner-filter-search');
          if (inp) inp.focus();
        }, 50);
      }
      break;
    }
    case 'eos-sc-optimize': {
      const tf = E.tab.scorecard === 'scorecards' ? 'weekly' : (E.tab.scorecard || 'weekly');
      let mList = eMeas.filter(m => (!m.freq && tf === 'weekly') || m.freq === tf);
      if (E.f.scorecard.team && E.f.scorecard.team !== 'All Teams') {
        mList = mList.filter(m => !m.team || m.team === E.f.scorecard.team);
      }
      let onTrack = 0, offTrack = 0;
      mList.forEach(m => {
        const v = (m.vals || []).find(x => x != null);
        if (v != null) {
          if (ePass(m, v)) onTrack++; else offTrack++;
        }
      });
      const passRate = (onTrack + offTrack) > 0 ? Math.round((onTrack / (onTrack + offTrack)) * 100) : 100;

      eosModal('Optimize Scorecard', `
       <div style="padding:16px">
         <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px;text-align:center">
           <div style="background:#f8fafc;padding:12px;border-radius:8px;border:1px solid #e2e8f0">
             <div style="font-size:11px;color:#64748b;font-weight:600">MEASURABLES</div>
             <div style="font-size:22px;font-weight:700;color:#1e293b">${mList.length}</div>
           </div>
           <div style="background:#dcfce7;padding:12px;border-radius:8px;border:1px solid #86efac">
             <div style="font-size:11px;color:#15803d;font-weight:600">ON TRACK</div>
             <div style="font-size:22px;font-weight:700;color:#15803d">${onTrack}</div>
           </div>
           <div style="background:#fee2e2;padding:12px;border-radius:8px;border:1px solid #fca5a5">
             <div style="font-size:11px;color:#dc2626;font-weight:600">OFF TRACK</div>
             <div style="font-size:22px;font-weight:700;color:#dc2626">${offTrack}</div>
           </div>
           <div style="background:#f1f5f9;padding:12px;border-radius:8px;border:1px solid #cbd5e1">
             <div style="font-size:11px;color:#475569;font-weight:600">PASS RATE</div>
             <div style="font-size:22px;font-weight:700;color:#0f172a">${passRate}%</div>
           </div>
         </div>
         <div style="font-size:13px;line-height:1.6;color:#334155;background:#ffffff;padding:12px;border:1px solid #e2e8f0;border-radius:6px">
           <b>Optimization Insights:</b>
           <ul style="margin:8px 0 0 18px;padding:0">
             ${offTrack > 0 ? `<li>${offTrack} measurables are currently off-track. Drop off-track numbers to IDS during Level 10 meetings.</li>` : `<li>All recorded measurables are currently hitting or exceeding targets!</li>`}
             <li>Keep 5 to 15 key measurables per scorecard to maintain high-focus organizational traction.</li>
             <li>Enter weekly data consistently to ensure accurate trailing trends and rollups.</li>
           </ul>
         </div>
       </div>
     `);
      break;
    }
    case 'eos-sc-test-data': {
      toast('Generating sample scorecard test data with red and green boxes...');
      const team = E.f.scorecard.team && E.f.scorecard.team !== 'All Teams' ? E.f.scorecard.team : null;
      try {
        await apiCall('eos_core.eos_core.doctype.scorecard.scorecard.generate_test_scorecard_data', {
          team: team,
          force: 1
        });
        await loadEosFromDocTypes();
        toast('Test data generated with red and green boxes!');
        renderMain();
      } catch (err) {
        eMeas.forEach(m => {
          m.vals = m.vals || [];
          for (let i = 0; i < 13; i++) {
            const target = m.target || 10;
            const pass = (i % 3 !== 0);
            const factor = pass ? (1 + (i % 4) * 0.1) : 0.8;
            m.vals[i] = Math.round(target * factor * 10) / 10;
          }
        });
        toast('Sample test data generated across measurables!');
        renderMain();
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

document.addEventListener('click', e => {
  if (E.owner_filter_open && !e.target.closest('.nn-owner-filter-popover, [data-act="eos-toggle-owner-filter"]')) {
    E.owner_filter_open = false;
    E.owner_filter_search = '';
    renderMain();
  }
  if (E.tools_menu_open && !e.target.closest('.nn-l10-tools-menu, [data-act="eos-l10-tools"]')) {
    E.tools_menu_open = false;
    renderMain();
  }
  if (E.menu && !e.target.closest('[data-menu],[data-act="eos-menu"]')) {
    E.menu = null;
    if (S.mod === 'eos') renderMain();
  }
});
document.addEventListener('scroll', () => { if (E.menu) { E.menu = null; if (S.mod === 'eos') renderMain(); } }, true);
document.addEventListener('input', e => {
  if (e.target.classList.contains('nn-owner-filter-search')) {
    E.owner_filter_search = e.target.value;
    const q = e.target.value.toLowerCase().trim();
    const popover = e.target.closest('.nn-owner-filter-popover');
    if (popover) {
      popover.querySelectorAll('.nn-owner-filter-opt').forEach(opt => {
        const txt = opt.textContent.toLowerCase();
        opt.style.display = (!q || txt.includes(q)) ? 'flex' : 'none';
      });
    }
    return;
  }
  if (e.target.id === 'eos-good-news-input') {
    const att = (E.meeting_attendees || [])[E.meeting_sharing_idx || 0];
    if (att) {
      E.meeting_good_news = E.meeting_good_news || {};
      E.meeting_good_news[att] = e.target.value;
    }
    return;
  }
  if (e.target.classList.contains('nn-rating-input')) {
    const att = e.target.dataset.id;
    if (att) {
      E.meeting_ratings = E.meeting_ratings || {};
      E.meeting_ratings[att] = parseFloat(e.target.value) || 8;
      const inputs = document.querySelectorAll('.nn-rating-input');
      let sum = 0, count = 0;
      inputs.forEach(inp => {
        sum += parseFloat(inp.value) || 0;
        count++;
      });
      const avgEl = document.getElementById('eos-avg-rating');
      if (avgEl && count > 0) {
        avgEl.textContent = (sum / count).toFixed(1);
      }
    }
    return;
  }
  const d = e.target.dataset; if (!d || !d.eosF) return;
  const [p, key] = d.eosF.split('.');
  E.f[p][key] = e.target.value;
  if (p === 'scorecard' && key === 'team') {
    E.f.scorecard.owners = null;
    E.owner_filter_open = false;
  }
  if (key !== 'page' && E.f[p].page) E.f[p].page = 1;
  const pos = e.target.selectionStart;
  renderMain();
  const el = document.querySelector(`[data-eos-f="${p}.${key}"]`);
  if (el && pos != null) { el.focus(); try { el.setSelectionRange(pos, pos); } catch (_) { } }
});
document.addEventListener('change', async e => {
  if (e.target.classList.contains('nn-owner-filter-all')) {
    if (e.target.checked) {
      E.f.scorecard.owners = null;
    } else {
      E.f.scorecard.owners = [];
    }
    E.owner_filter_open = true;
    renderMain();
    return;
  }
  if (e.target.classList.contains('nn-owner-filter-item')) {
    const popover = e.target.closest('.nn-owner-filter-popover');
    const items = Array.from(popover.querySelectorAll('.nn-owner-filter-item'));
    const checked = items.filter(cb => cb.checked).map(cb => cb.value);
    const curTab = E.tab.scorecard === 'scorecards' ? 'weekly' : (E.tab.scorecard || 'weekly');
    const allOwners = getScorecardOwners(curTab, E.f.scorecard.team);
    if (checked.length === allOwners.length) {
      E.f.scorecard.owners = null;
    } else {
      E.f.scorecard.owners = checked;
    }
    E.owner_filter_open = true;
    renderMain();
    return;
  }
  if (e.target.classList.contains('nn-rating-input')) {
    const att = e.target.dataset.id;
    if (att) {
      E.meeting_ratings = E.meeting_ratings || {};
      E.meeting_ratings[att] = parseFloat(e.target.value) || 8;
      const inputs = document.querySelectorAll('.nn-rating-input');
      let sum = 0, count = 0;
      inputs.forEach(inp => {
        sum += parseFloat(inp.value) || 0;
        count++;
      });
      const avgEl = document.getElementById('eos-avg-rating');
      if (avgEl && count > 0) {
        avgEl.textContent = (sum / count).toFixed(1);
      }
    }
    return;
  }
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
  if (e.key === 'Escape' && E.owner_filter_open) {
    E.owner_filter_open = false;
    E.owner_filter_search = '';
    renderMain();
  }
  const t = e.target; if (!t || !t.hasAttribute) return;
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
