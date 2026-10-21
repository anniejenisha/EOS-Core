/* =====================================================================
   TALENT MANAGEMENT MODULE FOR BURHANI ERP PORTAL
   ===================================================================== */

const wrapper = document;
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => s == null ? '' : String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

let TALENT_BOOTSTRAP = {
    kpis: { total_employees: 0, checked_in_today: 0, pending_requests: 0, late_arrivals: 0 },
    dropdowns: {
        employees: [], shift_types: [], leave_types: [], departments: [], designations: [],
        companies: [], genders: [], holiday_lists: [], job_applicants: [], job_offers: [],
        appraisal_cycles: [], vehicles: [], salary_structures: [], expense_claim_types: [],
        branches: [], grades: [], employment_types: [], salutations: [], users: [],
        default_company: ''
    },
    counts: {}
};
let BOOTSTRAP = TALENT_BOOTSTRAP;

/* Universal Frappe API Caller */
async function talentCall(method, args = {}) {
    if (typeof apiCall === 'function') {
        const res = await apiCall(method, args);
        if (res && res.error) throw new Error(res.message);
        return res;
    }
    const url = `/api/method/${method}`;
    const headers = { 'Accept': 'application/json', 'Content-Type': 'application/json' };
    if (window.csrf_token && window.csrf_token !== 'None') {
        headers['X-Frappe-CSRF-Token'] = window.csrf_token;
    }
    const res = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(args)
    });
    if (!res.ok) {
        const errText = await res.text();
        let parsed;
        try { parsed = JSON.parse(errText); } catch (e) {}
        throw new Error((parsed && (parsed.message || parsed.exception)) || `HTTP ${res.status}`);
    }
    const json = await res.json();
    return json.message || json;
}

/* Polyfill window.frappe if running on portal */
if (!window.frappe) window.frappe = {};
if (typeof window.frappe.call !== 'function' || !window.frappe.desk) {
    window.frappe.call = function (opts) {
        talentCall(opts.method, opts.args || {}).then(res => {
            if (opts.callback) opts.callback({ message: res });
        }).catch(err => {
            if (opts.error) opts.error(err);
            else console.error('[Talent API error]:', err);
        });
    };
}
if (!window.frappe.msgprint) {
    window.frappe.msgprint = function (m) {
        toast(typeof m === 'string' ? m : JSON.stringify(m));
    };
}
if (!window.frappe.set_route) {
    window.frappe.set_route = function (...r) {
        window.open('/app/' + r.join('/'), '_blank');
    };
}

/* =====================================================================
   LIVE BACKEND CALLS
   ===================================================================== */
function fetchTalentBootstrap() {
    frappe.call({
        method: 'hrpro.hrpro.page.talent_management.talent_management.get_talent_bootstrap',
        callback: function (r) {
            if (r && r.message) {
                TALENT_BOOTSTRAP = r.message;
                BOOTSTRAP = r.message;
                const k = TALENT_BOOTSTRAP.kpis || {};
                const tMod = MODULES.find(m => m.id === 'talent');
                if (tMod) {
                    tMod.cards = [
                        ['Employees', String(k.total_employees || 0), 'active in organization'],
                        ['Checked in today', String(k.checked_in_today || 0), 'recorded check-ins'],
                        ['Pending requests', String(k.pending_requests || 0), 'awaiting approval', k.pending_requests > 0 ? 'warn' : ''],
                        ['Late arrivals', String(k.late_arrivals || 0), 'this week']
                    ];
                }
                if (S.mod === 'talent') {
                    renderRail();
                    renderSide();
                    if (S.view === 'workspace' || S.page === 'overview') renderTalentWorkspace();
                }
            }
        }
    });
}

function fetchTalentList() {
    const set = curSet();
    if (!set || !set.doctype) return;

    S.loading = true;
    renderTalentList();

    frappe.call({
        method: 'hrpro.hrpro.page.talent_management.talent_management.get_doctype_records',
        args: {
            doctype: set.doctype,
            search: S.q || '',
            status: (S.vw === 'all' || S.vw === 'attn' || S.vw === 'mine') ? '' : S.vw,
            owner_filter: S.vw === 'mine' ? (USER.name || (window.frappe && frappe.session && frappe.session.user)) : ''
        },
        callback: function (r) {
            S.loading = false;
            if (r && r.message) {
                const rawList = r.message.records || [];
                set.rows = rawList.map(doc => {
                    const row = { id: doc.name, owner: doc.owner || 'System', ...doc };
                    if (doc.employee_name) row.employee_name = doc.employee_name;
                    else if (doc.employee) row.employee_name = doc.employee;
                    return row;
                });
                set.loaded = true;
                renderTalentList();
            }
        },
        error: function () {
            S.loading = false;
            renderTalentList();
        }
    });
}

function fetchTalentRecordDetails(recordId) {
    const set = curSet();
    if (!set || !set.doctype) return;

    frappe.call({
        method: 'hrpro.hrpro.page.talent_management.talent_management.get_record_details',
        args: {
            doctype: set.doctype,
            name: recordId
        },
        callback: function (r) {
            if (r && r.message) {
                const d = r.message.doc;
                const existing = findRec(set, recordId);
                if (existing) {
                    Object.assign(existing, d);
                } else {
                    set.rows.push({ id: d.name, owner: d.owner || 'System', ...d });
                }
                if (r.message.comments) {
                    const k = S.mod + S.page + recordId;
                    S.act[k] = r.message.comments.map(c => ({
                        who: c.comment_by || 'User',
                        t: (window.frappe && frappe.datetime) ? frappe.datetime.comment_when(c.creation) : c.creation,
                        text: c.content,
                        note: true
                    }));
                }
                renderTalentRecord();
            }
        }
    });
}

/* =====================================================================
   TALENT VIEWS
   ===================================================================== */
function renderTalentWorkspace() {
    const m = mod();
    const short = Object.entries(PAGES).filter(([k]) => k.startsWith(m.id + ':') && SETS[PAGES[k].set]);
    const cards = m.nav.filter(([l, , k]) => k).map(([l, , k]) => `
        <div class="panel" style="padding:16px">
            <h3 style="font-size:14px;font-weight:600;margin-bottom:10px;color:var(--g900)">${l}</h3>
            <div style="display:flex;flex-direction:column;gap:6px">
                ${k.map(c => {
                    const count = TALENT_BOOTSTRAP.counts && TALENT_BOOTSTRAP.counts[c] != null
                        ? `<span style="font-size:11px;background:var(--g100);color:var(--g900);padding:2px 8px;border-radius:99px;font-weight:600">${TALENT_BOOTSTRAP.counts[c]}</span>`
                        : '';
                    return `<button class="btn" style="justify-content:space-between;width:100%" data-act="nav" data-id="${slug(c)}">
                        <span>${c}</span><div style="display:flex;align-items:center;gap:6px">${count}${icon('chev')}</div>
                    </button>`;
                }).join('')}
            </div>
        </div>
    `).join('');
    const singles = m.nav.filter(([l, , k]) => !k && slug(l) !== 'overview');
    const main = $('#main');
    if (!main) return;
    main.innerHTML = `<div class="ph">
        <div>
            <h1>${m.name}</h1>
            <p style="color:var(--ink-2);font-size:13.5px;margin-top:2px">${m.blurb || 'Live HR, shifts, attendance, leaves, payroll and talent operations on Frappe ERP'}</p>
        </div>
        <div class="row">
            <button class="btn primary" data-act="nav" data-id="shift-request">${icon('plus')}New Shift Request</button>
        </div>
    </div>
    <div class="cards" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:24px">
        ${(typeof m.cards === 'function' ? m.cards() : m.cards).map(c => `
            <div class="panel ncard ${c[3] || ''}" style="padding:18px">
                <small style="display:block;color:var(--ink-3);font-size:12px;margin-bottom:4px">${c[0]}</small>
                <strong style="display:block;font-size:26px;font-weight:700;color:var(--g900)">${c[1]}</strong>
                <em style="display:block;color:var(--ink-2);font-size:12px;font-style:normal;margin-top:4px">${c[2] || '&nbsp;'}</em>
            </div>
        `).join('')}
    </div>
    ${short.length ? `
        <div class="section" style="margin-bottom:24px">
            <h2 style="font-size:16px;font-weight:700;margin-bottom:12px;color:var(--g900)">Shortcuts &amp; Live Document Counts</h2>
            <div class="shortcuts" style="display:flex;gap:10px;flex-wrap:wrap">
                ${short.map(([k, p]) => {
                    const count = TALENT_BOOTSTRAP.counts && TALENT_BOOTSTRAP.counts[p.dt] != null
                        ? TALENT_BOOTSTRAP.counts[p.dt]
                        : (SETS[p.set] && SETS[p.set].rows ? SETS[p.set].rows.length : 0);
                    return `<button class="btn" data-act="nav" data-id="${k.split(':')[1]}">
                        ${p.dt}
                        <span class="cnt" style="margin-left:8px;background:var(--g100);color:var(--g900);padding:2px 8px;border-radius:99px;font-size:11px;font-weight:600">
                            ${count}
                        </span>
                    </button>`;
                }).join('')}
            </div>
        </div>
    ` : ''}
    <div class="section" style="margin-bottom:24px">
        <h2 style="font-size:16px;font-weight:700;margin-bottom:12px;color:var(--g900)">Documents</h2>
        <div class="links" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px">
            ${cards}
            ${singles.length ? `
                <div class="panel" style="padding:16px">
                    <h3 style="font-size:14px;font-weight:600;margin-bottom:10px;color:var(--g900)">Other</h3>
                    <div style="display:flex;flex-direction:column;gap:6px">
                        ${singles.map(([l]) => `
                            <button class="btn" style="justify-content:space-between;width:100%" data-act="nav" data-id="${slug(l)}">
                                <span>${l}</span>${icon('chev')}
                            </button>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        </div>
    </div>`;
}

function renderTalentList() {
    const set = curSet(), name = dt();
    let html = `<div class="ph"><h1>${name}</h1><div class="row"><button class="btn" data-act="refresh-list" title="Reload live from ERP">${icon('file')}Refresh</button><button class="btn primary" data-act="create">${icon('plus')}Add ${name}</button></div></div>`;
    if (!set) {
        html += `<div class="panel"><div class="empty"><h3>No ${name} records found</h3><p>Records you add in the ERP site will appear here.</p><button class="btn primary" data-act="create">${icon('plus')}Add ${name}</button></div></div>`;
        $('#main').innerHTML = html;
        return;
    }

    const rows = visibleRows(set), all = set.rows, hasOwner = all.some(r => r.owner), hasSt = !!set.statuses;
    if (S.sel.size) {
        html += `<div class="bulk" style="display:flex;align-items:center;gap:12px;padding:12px 16px;background:var(--g100);border-radius:var(--r);margin-bottom:16px"><b>${S.sel.size} selected</b>${set.approve ? `<button class="mini ok" data-act="bulk-ok">${set.approve.okLabel}</button><button class="mini" data-act="bulk-no">${set.approve.noLabel}</button>` : ''}<button class="mini" data-act="bulk-export">Export</button><span class="sp" style="flex:1"></span><button class="mini" data-act="bulk-clear">Clear</button></div>`;
    } else {
        const chip = (id, l, n) => `<button class="chip" data-act="view" data-id="${id}" aria-pressed="${S.vw === id}">${l}<small>${n}</small></button>`;
        html += `<div class="cp" style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin-bottom:16px"><div class="search">${icon('search')}<input class="field" id="q" placeholder="Search by ID or name..." value="${S.q.replace(/"/g, '&quot;')}" aria-label="Search list"></div>
            <div class="chips">${chip('all', 'All', all.length)}${set.attention ? chip('attn', 'Needs attention', all.filter(r => set.attention.includes(r.status)).length) : ''}${hasOwner ? chip('mine', 'Assigned to me', all.filter(r => r.owner === USER.name).length) : ''}</div>
            <div class="cp-r" style="margin-left:auto;display:flex;gap:10px;align-items:center">${hasSt ? `<button class="chip" data-act="grp" aria-pressed="${S.grp}">Group by status</button><div class="seg" role="group" aria-label="View" style="display:flex;border:1px solid var(--line-2);border-radius:var(--r);overflow:hidden"><button class="btn" style="border:none;border-radius:0;height:32px" data-act="lay" data-id="list" aria-pressed="${S.lay === 'list'}">${icon('list')}List</button><button class="btn" style="border:none;border-radius:0;height:32px" data-act="lay" data-id="board" aria-pressed="${S.lay === 'board'}">${icon('board')}Kanban</button></div>` : ''}</div></div>`;
    }

    if (S.loading) {
        html += `<div class="panel" style="padding:48px;text-align:center"><div class="spinner-border spinner-border-sm text-secondary" role="status" style="width:24px;height:24px;border:3px solid var(--line-2);border-top-color:var(--g800);border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 12px"></div><p style="color:var(--ink-2);font-weight:500">Loading live data from Frappe site...</p></div>`;
    } else if (!rows.length) {
        html += `<div class="panel"><div class="empty"><h3>No ${name} records found in ERP site</h3><p>Create a new document to store it directly in the Frappe site database.</p><button class="btn primary" data-act="create">${icon('plus')}Add ${name}</button></div></div>`;
    } else if (S.lay === 'board' && hasSt) {
        html += `<div class="board">${set.statuses.map(s => {
            const rs = rows.filter(r => r.status === s);
            return `<section class="col"><h4>${s}<span>${rs.length}</span></h4>${rs.map(r => {
                const meta = set.cols.filter(c => !['pill', 'strong'].includes(c.t) && c.k !== set.titleKey).slice(0, 2).map(c => fmt(r[c.k])).join(' · ');
                return `<button class="card" data-act="open" data-id="${r.id}"><small>${r.id}</small><strong>${r[set.titleKey] || r.id}</strong><p>${meta}</p>${r.owner ? `<div class="by"><span class="avatar" title="${r.owner}">${initials(r.owner)}</span></div>` : ''}</button>`;
            }).join('')}</section>`;
        }).join('')}</div>`;
    } else {
        const ncol = set.cols.length + 1 + (set.approve ? 1 : 0);
        const row = r => `<tr data-act="open" data-id="${r.id}" class="${S.sel.has(r.id) ? 'sel' : ''}" style="cursor:pointer"><td class="ck" style="width:40px" onclick="event.stopPropagation()"><input type="checkbox" data-act="sel" data-id="${r.id}" ${S.sel.has(r.id) ? 'checked' : ''} aria-label="Select ${r.id}"></td>${set.cols.map(c => cell(c, r[c.k])).join('')}${set.approve ? `<td class="act" onclick="event.stopPropagation()">${r.status === set.approve.from ? `<button class="mini ok" data-act="approve" data-id="${r.id}">${set.approve.okLabel}</button><button class="mini" data-act="reject" data-id="${r.id}">${set.approve.noLabel}</button>` : ''}</td>` : ''}</tr>`;
        let body = '';
        if (S.grp && hasSt) set.statuses.forEach(s => { const rs = rows.filter(r => r.status === s); if (rs.length) body += `<tr class="grp" style="background:var(--g100);font-weight:600"><td colspan="${ncol}">${s} · ${rs.length}</td></tr>` + rs.map(row).join(''); });
        else body = rows.map(row).join('');
        html += `<div class="panel"><div class="scroll"><table><thead><tr><th class="ck" style="width:40px"><input type="checkbox" data-act="selall" aria-label="Select all" ${S.sel.size && rows.every(r => S.sel.has(r.id)) ? 'checked' : ''}></th>${set.cols.map(c => `<th class="${c.t === 'num' ? 'num' : ''}">${c.l}</th>`).join('')}${set.approve ? '<th class="act"></th>' : ''}</tr></thead><tbody>${body}</tbody></table></div><div class="foot" style="padding:12px 16px;color:var(--ink-3);font-size:12.5px;display:flex;justify-content:space-between"><span>${rows.length} of ${all.length} ${all.length === 1 ? 'record' : 'records'}</span><span>Connected to Frappe ERP site</span></div></div>`;
    }

    $('#main').innerHTML = html;
}

function renderTalentRecordFieldInput(f, r) {
        let options = [];
        if (f.source && BOOTSTRAP.dropdowns && BOOTSTRAP.dropdowns[f.source]) {
            const src = BOOTSTRAP.dropdowns[f.source];
            if (src.length && typeof src[0] === 'object') {
                options = src.map(x => [x.value, x.label]);
            } else {
                options = src.map(x => [x, x]);
            }
        } else if (f.o) {
            options = f.o.map(x => Array.isArray(x) ? x : [x, x]);
        }

        const curVal = (r[f.k] != null && r[f.k] !== '') ? String(r[f.k]) : '';

        if (f.t === 'select') {
            if (curVal && !options.some(([v]) => String(v) === curVal)) {
                options.unshift([curVal, curVal]);
            }
            return `<select class="field rec-field" id="rf-${f.k}" data-k="${f.k}" aria-label="${esc(f.l)}">
                <option value="">Select ${esc(f.l)}...</option>
                ${options.map(([v, l]) => `<option value="${esc(v)}" ${curVal === String(v) ? 'selected' : ''}>${esc(l)}</option>`).join('')}
            </select>`;
        } else if (f.t === 'textarea') {
            return `<textarea class="field rec-field" id="rf-${f.k}" data-k="${f.k}" placeholder="${esc(f.ph || ('Enter ' + f.l + '...'))}" style="height:74px;padding:8px 12px;font:inherit;resize:vertical">${esc(curVal)}</textarea>`;
        } else if (f.t === 'checkbox' || f.t === 'check') {
            const isChecked = Boolean(r[f.k]);
            return `<div class="check-wrap" style="display:flex;align-items:flex-start;gap:10px;padding:4px 0">
                <input class="field-check rec-field" id="rf-${f.k}" data-k="${f.k}" type="checkbox" ${isChecked ? 'checked' : ''} style="width:18px;height:18px;cursor:pointer;margin-top:2px;accent-color:var(--brand,#0070f3)">
                <div style="flex:1">
                    <label for="rf-${f.k}" style="cursor:pointer;font-weight:600;font-size:13px;color:var(--ink-2);margin:0;display:block">${esc(f.l)}</label>
                    ${f.desc ? `<div class="f-desc" style="font-size:11px;color:var(--ink-3);margin-top:2px;line-height:1.4">${esc(f.desc)}</div>` : ''}
                </div>
            </div>`;
        } else if (f.t === 'date') {
            const dVal = curVal ? curVal.split('T')[0] : '';
            return `<input class="field rec-field" id="rf-${f.k}" data-k="${f.k}" type="date" value="${esc(dVal)}">`;
        } else if (f.t === 'datetime-local') {
            let dtVal = '';
            if (curVal) {
                try {
                    const d = new Date(curVal);
                    if (!isNaN(d.getTime())) {
                        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
                        dtVal = d.toISOString().slice(0, 16);
                    }
                } catch (e) { }
            }
            return `<input class="field rec-field" id="rf-${f.k}" data-k="${f.k}" type="datetime-local" value="${esc(dtVal)}">`;
        } else if (f.t === 'number') {
            return `<input class="field rec-field" id="rf-${f.k}" data-k="${f.k}" type="number" step="any" placeholder="${esc(f.ph || ('Enter ' + f.l + '...'))}" value="${esc(curVal)}">`;
        } else {
            return `<input class="field rec-field" id="rf-${f.k}" data-k="${f.k}" type="${f.t || 'text'}" placeholder="${esc(f.ph || ('Enter ' + f.l + '...'))}" value="${esc(curVal)}">`;
        }
    }

function renderTalentRecordFieldBlock(f, r, i) {
        if (f.k === 'naming_series') return '';

        const isExitSec = f.section === 'Exit & Leaving' || f.exitOnly;
        const secHtml = f.section ? `
            <div class="form-section-title ${isExitSec ? 'sec-exit-leaving' : ''}" style="grid-column:1/-1;margin-top:20px;padding-top:14px;border-top:1px solid var(--line);font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:var(--brand,#0070f3);display:flex;align-items:center;gap:6px">
                <span>${esc(f.section)}</span>
            </div>
        ` : '';

        if (f.t === 'checkbox' || f.t === 'check') {
            return `${secHtml}<div class="f f-checkbox ${isExitSec ? 'sec-exit-leaving' : ''}" data-field="${f.k}">${renderTalentRecordFieldInput(f, r)}</div>`;
        }

        const isReq = Boolean(f.req);
        const isFull = f.t === 'textarea' || f.full;

        return `${secHtml}
        <div class="f ${isFull ? 'full-width' : ''} ${isExitSec ? 'sec-exit-leaving' : ''}" data-field="${f.k}" style="${isFull ? 'grid-column:1/-1;' : ''}">
            <label for="rf-${f.k}">${esc(f.l)}${isReq ? ' *' : ' (optional)'}</label>
            ${renderTalentRecordFieldInput(f, r)}
            ${f.desc ? `<div class="f-desc" style="font-size:11px;color:var(--ink-3);margin-top:2px;line-height:1.35">${esc(f.desc)}</div>` : ''}
            ${isReq ? `<div class="err">${esc(f.l)} is required.</div>` : ''}
        </div>`;
    }

function bindTalentRecordEvents(r) {
        const formEl = $(`#rec-form-${r.id}`, wrapper);
        if (!formEl) return;

        // Immediately clear error style when user inputs or changes any field in record form
        formEl.querySelectorAll('.rec-field').forEach(inp => {
            const clearBad = () => {
                const fBlock = inp.closest('.f');
                if (fBlock && inp.value && String(inp.value).trim()) {
                    fBlock.classList.remove('bad');
                }
            };
            inp.addEventListener('input', clearBad);
            inp.addEventListener('change', clearBad);
            inp.addEventListener('keyup', clearBad);
        });

        // Exit & Leaving section visibility: only show when status is Except Active
        const statusEl = formEl.querySelector('.rec-field[data-k="status"]');
        if (statusEl) {
            const toggleExit = () => {
                const showExit = statusEl.value && statusEl.value !== 'Active';
                formEl.querySelectorAll('.sec-exit-leaving').forEach(el => {
                    el.style.display = showExit ? '' : 'none';
                });
            };
            statusEl.addEventListener('change', toggleExit);
            toggleExit();
        }

        // When User ID changes, auto fill first name and last name if empty
        const userEl = formEl.querySelector('.rec-field[data-k="user_id"]');
        if (userEl) {
            userEl.addEventListener('change', () => {
                const uVal = userEl.value;
                if (!uVal) return;
                const fnEl = formEl.querySelector('.rec-field[data-k="first_name"]');
                const uObj = (BOOTSTRAP.dropdowns.users || []).find(x => x.value === uVal);
                if (fnEl && !fnEl.value && uObj) {
                    const cleanName = (uObj.label || '').split(' (')[0].trim();
                    if (cleanName) {
                        const parts = cleanName.split(' ');
                        fnEl.value = parts[0];
                        const lnEl = formEl.querySelector('.rec-field[data-k="last_name"]');
                        if (lnEl && !lnEl.value && parts.length > 1) {
                            lnEl.value = parts.slice(1).join(' ');
                        }
                    }
                }
            });
        }

        // When Employee changes (for forms referencing employee), sync company and name
        const empEl = formEl.querySelector('.rec-field[data-k="employee"]');
        if (empEl) {
            empEl.addEventListener('change', () => {
                const empId = empEl.value;
                const empObj = (BOOTSTRAP.dropdowns.employees || []).find(x => x.value === empId);
                if (empObj) {
                    if (empObj.company) {
                        const compEl = formEl.querySelector('.rec-field[data-k="company"]');
                        if (compEl && !compEl.value) compEl.value = empObj.company;
                    }
                    const enEl = formEl.querySelector('.rec-field[data-k="employee_name"]');
                    if (enEl && !enEl.value) {
                        const nameOnly = (empObj.label || '').split(' - ')[1] || empObj.label;
                        enEl.value = nameOnly || empObj.value;
                    }
                }
            });
        }

        // Allow keyboard shortcut Ctrl+S / Cmd+S inside record view to save
        formEl.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                saveTalentRecord(r.id);
            }
        });
    }

function renderTalentRecord() {
        const set = curSet(), r = findRec(set, S.rec);
        if (!r) { S.view = 'list'; return renderTalentList(); }
        const ap = set.approve && r.status === set.approve.from;

        // Fallback for first_name if employee record only has employee_name loaded
        if (!r.first_name && r.employee_name) {
            const parts = r.employee_name.split(' ');
            r.first_name = parts[0];
            if (parts.length > 1 && !r.last_name) r.last_name = parts.slice(1).join(' ');
        }

        const formFields = (set.form && set.form.length) ? set.form : [
            { k: 'title', l: 'Title', t: 'text', req: true }
        ];

        const comments = (S.act[S.mod + S.page + r.id] || []);
        const firstSectionTitle = (set.noun === 'employee') ? 'Basic Details' : 'Record Details';

        $('#main', wrapper).innerHTML = `
            <div class="ph">
                <div style="display:flex;align-items:center;gap:12px">
                    <button class="icon-btn" data-act="back" title="Back to list" aria-label="Back">${icon('back')}</button>
                    <h1>${esc(r[set.titleKey] || r.id)}<span class="sub">${esc(r.id)}</span></h1>
                    ${r.status ? `<span class="pill ${TONE[r.status] || 'neutral'}">${esc(r.status)}</span>` : ''}
                </div>
                <div class="row">
                    <button class="btn primary" id="btn-save-record-top" data-act="save-record" data-id="${esc(r.id)}">${icon('check')} Save Changes</button>
                    ${set.doctype ? `<button class="btn" data-act="open-desk-form" data-dt="${esc(set.doctype)}" data-id="${esc(r.id)}">${icon('file')}Open in Desk</button>` : ''}
                    ${ap ? `<button class="btn" data-act="reject" data-id="${esc(r.id)}">${esc(set.approve.noLabel)}</button><button class="btn primary" data-act="approve" data-id="${esc(r.id)}">${icon('check')}${esc(set.approve.okLabel)}</button>` : ''}
                </div>
            </div>
            <div class="rec-full">
                <div class="panel" style="padding:24px;width:100%">
                   
                    <form class="rec-form" id="rec-form-${r.id}" onsubmit="return false;">
                        <div class="form-section-title" style="grid-column:1/-1;margin-top:0;padding-top:0;border-top:none;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:var(--brand,#0070f3);display:flex;align-items:center;gap:6px">
                            <span>${firstSectionTitle}</span>
                        </div>
                        <div class="f" data-field="_id">
                            <label>ID</label>
                            <input class="field" value="${esc(r.id)}" readonly disabled style="background:var(--g100);color:var(--ink-2);font-weight:600;cursor:not-allowed" title="Document ID (Cannot be changed)">
                        </div>
                        ${formFields.map((f, i) => renderTalentRecordFieldBlock(f, r, i)).join('')}
                    </form>
                    <div style="margin-top:24px;padding-top:16px;border-top:1px solid var(--line);display:flex;justify-content:flex-end;align-items:center;gap:12px">
                        <button class="btn" data-act="back">Cancel</button>
                        <button class="btn primary" id="btn-save-record-bot" data-act="save-record" data-id="${esc(r.id)}">${icon('check')} Save Changes</button>
                    </div>
                </div>

                <div class="rec-meta-grid">
                    ${r.owner ? `<div class="panel" style="padding:20px;height:fit-content"><h3 style="font-size:14px;font-weight:700;margin-bottom:12px;color:var(--g900)">Created by</h3><div class="meta" style="display:flex;align-items:center;gap:10px"><span class="avatar">${initials(r.owner)}</span><div><b>${esc(r.owner)}</b></div></div></div>` : ''}
                    <div class="panel" style="padding:20px">
                        <h3 style="font-size:14px;font-weight:700;margin-bottom:12px;color:var(--g900)">ERP Activity &amp; Comments</h3>
                        <div class="tl" style="display:flex;flex-direction:column;gap:12px;max-height:360px;overflow-y:auto;padding-right:4px">${comments.length ? comments.map(e => `<div class="ev ${e.note ? 'note' : ''}" style="font-size:13px"><b>${esc(e.who)}</b> ${e.note ? 'commented' : esc(e.text)} <span style="color:var(--ink-3);font-size:11px">${esc(e.t)}</span>${e.note ? `<p style="margin-top:4px;padding:8px;background:var(--g100);border-radius:6px">${esc(e.text)}</p>` : ''}</div>`).join('') : '<p style="color:var(--ink-3);font-size:13px">No comments yet.</p>'}</div>
                        <div class="compose" style="display:flex;gap:8px;margin-top:16px">
                            <input class="field" style="flex:1" id="note" placeholder="Add a comment to ERP record..." aria-label="Add a comment">
                            <button class="btn primary" data-act="note" aria-label="Post comment">${icon('send')}</button>
                        </div>
                    </div>
                </div>
            </div>`;

        bindTalentRecordEvents(r);
    }

function openTalentDrawer() {
        const set = curSet();
        const formFields = set ? set.form : [{ k: 'title', l: 'Title', t: 'text', req: true }];
        const drawer = $('#drawer', wrapper);
        if (!drawer) return;

        const renderFieldInput = (f, i) => {
            let options = [];
            if (f.source && BOOTSTRAP.dropdowns && BOOTSTRAP.dropdowns[f.source]) {
                const src = BOOTSTRAP.dropdowns[f.source];
                if (src.length && typeof src[0] === 'object') {
                    options = src.map(x => [x.value, x.label]);
                } else {
                    options = src.map(x => [x, x]);
                }
            } else if (f.o) {
                options = f.o.map(x => Array.isArray(x) ? x : [x, x]);
            }

            if (f.t === 'select') {
                return `<select class="field" id="d${i}" data-k="${f.k}" aria-label="${f.l}">
                    <option value="">Select ${f.l}...</option>
                    ${options.map(([v, l]) => `<option value="${String(v).replace(/"/g, '&quot;')}" ${f.def && String(f.def) === String(v) ? 'selected' : ''}>${String(l).replace(/</g, '&lt;')}</option>`).join('')}
                </select>`;
            } else if (f.t === 'textarea') {
                return `<textarea class="field" id="d${i}" data-k="${f.k}" placeholder="${f.ph || ''}" style="height:70px;padding:8px 12px;font:inherit;resize:vertical"></textarea>`;
            } else if (f.t === 'checkbox' || f.t === 'check') {
                return `<div class="check-wrap" style="display:flex;align-items:flex-start;gap:10px;padding:4px 0">
                    <input class="field-check" id="d${i}" data-k="${f.k}" type="checkbox" ${f.def ? 'checked' : ''} style="width:18px;height:18px;cursor:pointer;margin-top:2px;accent-color:var(--brand,#0070f3)">
                    <div style="flex:1">
                        <label for="d${i}" style="cursor:pointer;font-weight:600;font-size:13px;color:var(--ink-2);margin:0;display:block">${f.l}</label>
                        ${f.desc ? `<div class="f-desc" style="font-size:11px;color:var(--ink-3);margin-top:2px;line-height:1.4">${f.desc}</div>` : ''}
                    </div>
                </div>`;
            } else {
                return `<input class="field" id="d${i}" data-k="${f.k}" type="${f.t || 'text'}" placeholder="${f.ph || ''}" value="${f.def || ''}">`;
            }
        };

        const renderFieldBlock = (f, i) => {
            const isExitSec = f.section === 'Exit & Leaving' || f.exitOnly;
            const secHtml = f.section ? `
                <div class="form-section-title ${isExitSec ? 'sec-exit-leaving' : ''}" style="margin-top:16px;padding-top:12px;border-top:1px solid var(--line);font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;color:var(--brand,#0070f3);display:flex;align-items:center;gap:6px">
                    <span>${f.section}</span>
                </div>
            ` : '';

            if (f.t === 'checkbox' || f.t === 'check') {
                return `${secHtml}<div class="f f-checkbox ${isExitSec ? 'sec-exit-leaving' : ''}" data-field="${f.k}">${renderFieldInput(f, i)}</div>`;
            }

            const isReq = Boolean(f.req);

            return `${secHtml}
            <div class="f ${isExitSec ? 'sec-exit-leaving' : ''}" data-field="${f.k}">
                <label for="d${i}">${f.l}${isReq ? ' *' : ' (optional)'}</label>
                ${renderFieldInput(f, i)}
                ${f.desc ? `<div class="f-desc" style="font-size:11px;color:var(--ink-3);margin-top:2px;line-height:1.3">${f.desc}</div>` : ''}
                ${isReq ? `<div class="err">${f.l} is required.</div>` : ''}
            </div>`;
        };

        drawer.innerHTML = `<header><h2>New ${dt()} (Store to ERP)</h2><button class="icon-btn" data-act="close" aria-label="Close">${icon('x')}</button></header>
            <div class="body">${formFields.map((f, i) => renderFieldBlock(f, i)).join('')}</div>
            <footer><button class="btn" data-act="close">Cancel</button><button class="btn primary" id="btn-save-drawer" data-act="save">Save to ERP Site</button></footer>`;

        // Pre-populate intelligent ERP defaults
        formFields.forEach((f, i) => {
            const el = drawer.querySelector(`.field[data-k="${f.k}"], .field-check[data-k="${f.k}"]`) || drawer.querySelector(`#d${i}`);
            if (!el) return;
            if (f.t === 'checkbox' || f.t === 'check') {
                el.checked = !!f.def;
                return;
            }
            if (f.k === 'company' && BOOTSTRAP.dropdowns && BOOTSTRAP.dropdowns.default_company && !el.value) {
                el.value = BOOTSTRAP.dropdowns.default_company;
            } else if ((f.k === 'posting_date' || f.k === 'start_date' || f.k === 'date' || f.k === 'from_date' || f.k === 'transfer_date' || f.k === 'promotion_date' || f.k === 'date_of_joining' || f.k === 'boarding_begins_on') && f.t === 'date' && !el.value) {
                el.value = new Date().toISOString().split('T')[0];
            } else if (f.k === 'time' && f.t === 'datetime-local' && !el.value) {
                const now = new Date();
                now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
                el.value = now.toISOString().slice(0, 16);
            } else if (f.def && !el.value) {
                el.value = f.def;
            }
        });

        // Exit & Leaving section visibility: remove at new employee creation, only show when status is Except Active
        const statusEl = drawer.querySelector('.field[data-k="status"]');
        if (statusEl) {
            const toggleExit = () => {
                const showExit = statusEl.value && statusEl.value !== 'Active';
                drawer.querySelectorAll('.sec-exit-leaving').forEach(el => {
                    el.style.display = showExit ? '' : 'none';
                });
            };
            statusEl.addEventListener('change', toggleExit);
            toggleExit();
        }

        // Immediately clear error style when user inputs or changes any field
        drawer.querySelectorAll('.field, .field-check').forEach(inp => {
            const clearBad = () => {
                const fBlock = inp.closest('.f');
                if (fBlock && inp.value && String(inp.value).trim()) {
                    fBlock.classList.remove('bad');
                }
            };
            inp.addEventListener('input', clearBad);
            inp.addEventListener('change', clearBad);
            inp.addEventListener('keyup', clearBad);
        });

        // When user_id changes, auto-fill first_name if currently empty
        const userEl = drawer.querySelector('.field[data-k="user_id"]');
        if (userEl) {
            userEl.addEventListener('change', () => {
                const uVal = userEl.value;
                if (!uVal) return;
                const fnEl = drawer.querySelector('.field[data-k="first_name"]');
                const uObj = (BOOTSTRAP.dropdowns.users || []).find(x => x.value === uVal);
                if (fnEl && !fnEl.value && uObj) {
                    const cleanName = (uObj.label || '').split(' (')[0].trim();
                    if (cleanName) {
                        const parts = cleanName.split(' ');
                        fnEl.value = parts[0];
                        const lnEl = drawer.querySelector('.field[data-k="last_name"]');
                        if (lnEl && !lnEl.value && parts.length > 1) {
                            lnEl.value = parts.slice(1).join(' ');
                        }
                    }
                }
            });
        }

        // When employee changes, sync company and employee name
        const empEl = drawer.querySelector('.field[data-k="employee"]');
        if (empEl) {
            empEl.addEventListener('change', () => {
                const empId = empEl.value;
                const empObj = (BOOTSTRAP.dropdowns.employees || []).find(x => x.value === empId);
                if (empObj) {
                    if (empObj.company) {
                        const compEl = drawer.querySelector('.field[data-k="company"]');
                        if (compEl) compEl.value = empObj.company;
                    }
                    const enEl = drawer.querySelector('.field[data-k="employee_name"]');
                    if (enEl && !enEl.value) {
                        const nameOnly = (empObj.label || '').split(' - ')[1] || empObj.label;
                        enEl.value = nameOnly || empObj.value;
                    }
                }
            });
        }

        // When job applicant changes, sync applicant name or employee name
        const jaEl = drawer.querySelector('.field[data-k="job_applicant"]');
        if (jaEl) {
            jaEl.addEventListener('change', () => {
                const jaVal = jaEl.value;
                const jaObj = (BOOTSTRAP.dropdowns.job_applicants || []).find(x => x.value === jaVal);
                if (jaObj) {
                    const anEl = drawer.querySelector('.field[data-k="applicant_name"]') || drawer.querySelector('.field[data-k="employee_name"]');
                    if (anEl) {
                        const nameOnly = (jaObj.label || '').split(' (')[0];
                        anEl.value = nameOnly || jaObj.value;
                    }
                }
            });
        }

        document.body.classList.add('drawer-open');
        drawer.setAttribute('aria-hidden', 'false');
        setTimeout(() => { const f = $('#drawer .field', wrapper); f && f.focus(); }, 200);
    }

function closeTalentDrawer() {
        document.body.classList.remove('drawer-open');
        const drawer = $('#drawer', wrapper);
        if (drawer) drawer.setAttribute('aria-hidden', 'true');
    }

function saveTalentDrawer() {
        const set = curSet();
        if (!set) { closeTalentDrawer(); return; }

        const drawer = $('#drawer', wrapper);
        if (!drawer) return;

        const vals = {};
        let hasErrors = false;

        const formFields = set.form || [];
        formFields.forEach((f, i) => {
            const el = drawer.querySelector(`.field[data-k="${f.k}"], .field-check[data-k="${f.k}"]`) || drawer.querySelector(`#d${i}`);
            if (!el) return;

            const fBlock = el.closest('.f');
            const isReq = Boolean(f.req);

            if (f.t === 'checkbox' || f.t === 'check') {
                vals[f.k] = el.checked ? 1 : 0;
                if (fBlock) fBlock.classList.remove('bad');
                return;
            }

            const val = (el.value != null ? String(el.value).trim() : '');

            // Only mandatory (*) fields are validated. Optional fields are never marked bad.
            if (isReq) {
                // If first_name is empty but user_id is selected, allow auto-derivation from user
                const userIdInput = drawer.querySelector('.field[data-k="user_id"]');
                const hasSelectedUser = userIdInput && userIdInput.value && userIdInput.value.trim();

                if (!val && f.k === 'first_name' && hasSelectedUser) {
                    if (fBlock) fBlock.classList.remove('bad');
                } else if (!val) {
                    if (fBlock) fBlock.classList.add('bad');
                    hasErrors = true;
                } else {
                    if (fBlock) fBlock.classList.remove('bad');
                }
            } else {
                if (fBlock) fBlock.classList.remove('bad');
            }

            // If entered, store in vals, otherwise empty string/null so ERP stores empty
            if (val !== '') {
                vals[f.k] = f.t === 'number' ? Number(val) : val;
            } else {
                vals[f.k] = '';
            }
        });

        if (hasErrors) {
            toast('Please fill in all mandatory (*) fields');
            const firstBad = drawer.querySelector('.f.bad');
            if (firstBad) {
                firstBad.scrollIntoView({ behavior: 'smooth', block: 'center' });
                const inp = firstBad.querySelector('.field');
                if (inp) inp.focus();
            }
            return;
        }

        // ERP Site Validation Conditions
        if (vals.from_date && vals.to_date && vals.to_date < vals.from_date) {
            toast('To Date cannot be before From Date');
            return;
        }
        if (vals.start_date && vals.end_date && vals.end_date < vals.start_date) {
            toast('End Date cannot be before Start Date');
            return;
        }
        if (vals.date_of_birth && vals.date_of_joining && vals.date_of_joining < vals.date_of_birth) {
            toast('Date of Joining cannot be before Date of Birth');
            return;
        }
        if (vals.date_of_joining && vals.relieving_date && vals.relieving_date < vals.date_of_joining) {
            toast('Relieving Date cannot be before Date of Joining');
            return;
        }
        if (vals.date_of_joining && vals.contract_end_date && vals.contract_end_date < vals.date_of_joining) {
            toast('Contract End Date cannot be before Date of Joining');
            return;
        }
        if (vals.probation_start_date && vals.probation_end_date && vals.probation_end_date < vals.probation_start_date) {
            toast('Probation End Date cannot be before Probation Start Date');
            return;
        }
        if (vals.status === 'Left' && !vals.relieving_date) {
            toast('Relieving Date is required when Status is Left');
            return;
        }

        const saveBtn = $('#btn-save-drawer', wrapper);
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.textContent = 'Storing in ERP...';
        }

        // Store document directly to Frappe ERP site database
        frappe.call({
            method: 'hrpro.hrpro.page.talent_management.talent_management.create_talent_record',
            args: {
                doctype: set.doctype,
                data: JSON.stringify(vals)
            },
            callback: function (r) {
                if (saveBtn) {
                    saveBtn.disabled = false;
                    saveBtn.textContent = 'Save to ERP Site';
                }
                if (r && r.message && r.message.success) {
                    closeTalentDrawer();
                    toast(`${dt()} ${r.message.name} created and stored in ERP site`);
                    fetchTalentList();
                    fetchTalentBootstrap();
                } else {
                    const msg = (r && r.message && r.message.message) || 'Error storing document';
                    frappe.msgprint ? frappe.msgprint(msg) : toast(msg);
                }
            },
            error: function (err) {
                if (saveBtn) {
                    saveBtn.disabled = false;
                    saveBtn.textContent = 'Save to ERP Site';
                }
                const msg = err && err.message ? err.message : 'Failed to save to ERP site';
                frappe.msgprint ? frappe.msgprint(msg) : toast(msg);
            }
        });
    }

function saveTalentRecord(recordId) {
        const set = curSet();
        if (!set || !set.doctype) return;
        const r = findRec(set, recordId || S.rec);
        if (!r) return;

        const formEl = $(`#rec-form-${r.id}`, wrapper);
        if (!formEl) return;

        const vals = {};
        let hasErrors = false;
        const formFields = set.form || [];

        formFields.forEach((f, i) => {
            if (f.k === 'naming_series') return;
            const el = formEl.querySelector(`.rec-field[data-k="${f.k}"]`);
            if (!el) return;

            const fBlock = el.closest('.f');
            const isReq = Boolean(f.req);

            if (f.t === 'checkbox' || f.t === 'check') {
                vals[f.k] = el.checked ? 1 : 0;
                if (fBlock) fBlock.classList.remove('bad');
                return;
            }

            const val = (el.value != null ? String(el.value).trim() : '');

            // Only mandatory (*) fields are validated
            if (isReq) {
                // If first_name is empty but user_id is selected, allow auto-derivation
                const userIdInput = formEl.querySelector('.rec-field[data-k="user_id"]');
                const hasSelectedUser = userIdInput && userIdInput.value && userIdInput.value.trim();

                if (!val && f.k === 'first_name' && hasSelectedUser) {
                    if (fBlock) fBlock.classList.remove('bad');
                } else if (!val) {
                    if (fBlock) fBlock.classList.add('bad');
                    hasErrors = true;
                } else {
                    if (fBlock) fBlock.classList.remove('bad');
                }
            } else {
                if (fBlock) fBlock.classList.remove('bad');
            }

            if (val !== '') {
                vals[f.k] = f.t === 'number' ? Number(val) : val;
            } else {
                vals[f.k] = '';
            }
        });

        if (hasErrors) {
            toast('Please fill in all mandatory (*) fields');
            const firstBad = formEl.querySelector('.f.bad');
            if (firstBad) {
                firstBad.scrollIntoView({ behavior: 'smooth', block: 'center' });
                const inp = firstBad.querySelector('.rec-field');
                if (inp) inp.focus();
            }
            return;
        }

        // Logic date validations
        if (vals.from_date && vals.to_date && vals.to_date < vals.from_date) {
            toast('To Date cannot be before From Date');
            return;
        }
        if (vals.start_date && vals.end_date && vals.end_date < vals.start_date) {
            toast('End Date cannot be before Start Date');
            return;
        }
        if (vals.date_of_birth && vals.date_of_joining && vals.date_of_joining < vals.date_of_birth) {
            toast('Date of Joining cannot be before Date of Birth');
            return;
        }
        if (vals.date_of_joining && vals.relieving_date && vals.relieving_date < vals.date_of_joining) {
            toast('Relieving Date cannot be before Date of Joining');
            return;
        }
        if (vals.date_of_joining && vals.contract_end_date && vals.contract_end_date < vals.date_of_joining) {
            toast('Contract End Date cannot be before Date of Joining');
            return;
        }
        if (vals.probation_start_date && vals.probation_end_date && vals.probation_end_date < vals.probation_start_date) {
            toast('Probation End Date cannot be before Probation Start Date');
            return;
        }
        if (vals.status === 'Left' && !vals.relieving_date) {
            toast('Relieving Date is required when Status is Left');
            return;
        }

        const saveBtns = $$(`[data-act="save-record"]`, wrapper);
        saveBtns.forEach(b => {
            b.disabled = true;
            b.dataset.prevHtml = b.innerHTML;
            b.innerHTML = `${icon('check')} Storing in ERP...`;
        });

        frappe.call({
            method: 'hrpro.hrpro.page.talent_management.talent_management.update_talent_record',
            args: {
                doctype: set.doctype,
                name: r.id,
                data: JSON.stringify(vals)
            },
            freeze: true,
            freeze_message: window.__ ? __('Saving changes to ERP...') : 'Saving changes to ERP...',
            callback: function (res) {
                saveBtns.forEach(b => {
                    b.disabled = false;
                    if (b.dataset.prevHtml) b.innerHTML = b.dataset.prevHtml;
                });

                if (res && res.message && res.message.success) {
                    const updatedDoc = res.message.doc;
                    Object.assign(r, updatedDoc);
                    toast(`Saved ${r.id} to ERP successfully`);
                    renderTalentRecord();
                } else {
                    const msg = (res && res.message && res.message.message) || (res && res._server_messages) || 'Failed to save changes to ERP';
                    toast(typeof msg === 'string' ? msg : JSON.stringify(msg));
                }
            },
            error: function (err) {
                saveBtns.forEach(b => {
                    b.disabled = false;
                    if (b.dataset.prevHtml) b.innerHTML = b.dataset.prevHtml;
                });
                const msg = err && err.message ? err.message : 'Failed to save changes to ERP site';
                frappe.msgprint ? frappe.msgprint(msg) : toast(msg);
            }
        });
    }

function postTalentNote() {
        const i = $('#note', wrapper);
        if (!i || !i.value.trim()) return;
        const set = curSet();
        if (!set || !set.doctype || !S.rec) return;

        const commentText = i.value.trim();
        i.value = '';

        frappe.call({
            method: 'hrpro.hrpro.page.talent_management.talent_management.add_record_comment',
            args: {
                doctype: set.doctype,
                name: S.rec,
                content: commentText
            },
            callback: function (r) {
                if (r && r.message && r.message.success) {
                    toast('Comment saved to ERP record');
                    const k = S.mod + S.page + S.rec;
                    if (!S.act[k]) S.act[k] = [];
                    const c = r.message.comment;
                    S.act[k].unshift({
                        who: c.comment_by || 'User',
                        t: frappe.datetime ? frappe.datetime.comment_when(c.creation) : 'just now',
                        text: c.content,
                        note: true
                    });
                    const tl = $('.tl', wrapper);
                    if (tl) {
                        tl.innerHTML = S.act[k].map(e => `<div class="ev ${e.note ? 'note' : ''}" style="font-size:13px"><b>${esc(e.who)}</b> ${e.note ? 'commented' : esc(e.text)} <span style="color:var(--ink-3);font-size:11px">${esc(e.t)}</span>${e.note ? `<p style="margin-top:4px;padding:8px;background:var(--g100);border-radius:6px">${esc(e.text)}</p>` : ''}</div>`).join('');
                    }
                }
            }
        });
    }

function decideTalentRecord(id, ok, silent) {
        const set = curSet(), r = findRec(set, id), a = set.approve;
        if (!r || !a) return;
        const newStatus = ok ? a.ok : a.no;

        if (window.frappe && frappe.call && set.doctype) {
            frappe.call({
                method: 'hrpro.hrpro.page.talent_management.talent_management.update_record_status',
                args: {
                    doctype: set.doctype,
                    name: id,
                    status: newStatus
                },
                callback: function (res) {
                    if (res && res.message && res.message.success) {
                        r.status = newStatus;
                        renderMain();
                        fetchTalentBootstrap();
                        if (!silent) toast(`${dt()} ${r.id} marked ${newStatus}`);
                    }
                }
            });
        } else {
            r.status = newStatus;
            renderMain();
            if (!silent) toast(`${dt()} ${r.status.toLowerCase()}`);
        }
    }

function renderTalent() {
    if (S.view === 'record') {
        renderTalentRecord();
    } else if (S.view === 'list') {
        renderTalentList();
    } else {
        renderTalentWorkspace();
    }
}

function talentAct(a, el, e) {
    switch (a) {
        case 'save-record':
            saveTalentRecord(el.dataset.id || S.rec);
            break;
        case 'refresh-list':
            fetchTalentList();
            fetchTalentBootstrap();
            toast('Reloaded live from Frappe ERP site');
            break;
        case 'open-desk-form': {
            const dt = el.dataset.dt, docId = el.dataset.id;
            if (window.frappe && frappe.set_route) frappe.set_route('Form', dt, docId);
            else window.open(`/app/${dt}/${docId}`, '_blank');
            break;
        }
        case 'desk-home': {
            if (window.frappe && frappe.set_route) frappe.set_route('workspaces/HR');
            else window.open('/app/workspaces/HR', '_blank');
            break;
        }
        case 'settings': {
            if (window.frappe && frappe.set_route) frappe.set_route('Form', 'HR Settings');
            else window.open('/app/Form/HR%20Settings', '_blank');
            break;
        }
    }
}
