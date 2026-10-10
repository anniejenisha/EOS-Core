/*
 * Put this file at:
 *   apps/eos_core/eos_core/public/js/scorecard_grid.js
 *
 * One page, left sidebar with 3 views: Scorecard, Rocks, To-Dos.
 * Everything is wrapped in an IIFE and every CSS class is prefixed "nn-".
 *
 * Page JS (e.g. eos_core/eos_core/page/eos/eos.js) should be:
 *   frappe.pages["eos"].on_page_load = function (wrapper) { new EOSNinety(wrapper); };
 * and this file must be loaded (hooks.py -> app_include_js = "/assets/eos_core/js/scorecard_grid.js").
 */
(function () {
	"use strict";

	/* ---------- CONFIG (change field names here only) ---------- */
	const CFG = {
		api: {
			scorecard_read: "eos_core.eos_core.doctype.scorecard.scorecard.get_grid_view",
			scorecard_rollup: "eos_core.eos_core.doctype.scorecard.scorecard.get_rollup_view",
			scorecard_write: "eos_core.eos_core.doctype.scorecard.scorecard.update_scorecard_entry",
			create_issue: "eos_core.eos_core.doctype.issue.issue.create_issue_from_metric",
			rock_complete: "eos_core.eos_core.doctype.rock.rock.mark_complete"
		},
		metric_doctype: "EOS Metric",
		rock: {
			doctype: "Rock",
			title: "title",
			status: "status",
			owner: "owner_name",
			due: "due_date",
			is_company: "is_company_rock",
			milestones_table: "milestones",
			ms_title: "title",
			ms_due: "due_date",
			ms_done: "completed"
		},
		// ToDo: "owner" in Frappe is the CREATOR, the assignee is "allocated_to"
		todo: { doctype: "ToDo", assignee: "allocated_to", due: "date" }
	};

	const TIMEFRAMES = [["Week", "Weekly"], ["Month", "Monthly"], ["Quarter", "Quarterly"], ["Year", "Annual"]];
	const RANGES = { Week: [4, 8, 13, 26], Month: [3, 6, 12], Quarter: [4, 8], Year: [3, 5] };
	const RANGE_DEFAULT = { Week: 13, Month: 12, Quarter: 4, Year: 3 };
	const RANGE_UNIT = { Week: "Weeks", Month: "Months", Quarter: "Quarters", Year: "Years" };
	const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

	const ICON = {
		scorecard: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/></svg>`,
		rocks: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 20l6-11 4 6 3-4 5 9z"/></svg>`,
		todos: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 12l3 3 5-6"/></svg>`
	};
	const NAV = [["scorecard", "Scorecard"], ["rocks", "Rocks"], ["todos", "To-Dos"]];

	class EOSNinety {
		constructor(wrapper) {
			this.wrapper = wrapper;
			this.page = frappe.ui.make_app_page({ parent: wrapper, title: __("EOS"), single_column: true });
			$(wrapper).find(".page-head").hide();

			this.s = {
				view: "scorecard",
				timeframe: "Week", range: 13, team: "All Teams", search: "", attention: false, banner_off: false,
				sc_owner: true, sc_goal: true, sc_avg: true, sc_total: true,
				rock_owner: "All", rock_status: "All", rock_search: "",
				todo_tab: "Team", todo_archive: false, todo_owner: "All", todo_search: "", todo_dir: "asc"
			};
			this.data = { periods: [], metrics: [] };
			this.rocks = [];
			this.todos = [];
			this.open_rocks = {};

			this.css();
			this.shell();
			this.go(this.s.view);
		}

		/* ================= HELPERS ================= */
		esc(v) { return frappe.utils.escape_html(v == null ? "" : String(v)); }
		ini(n) { return (n || "?").split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase() || "?"; }
		av(n) { return `<span class="nn-av" title="${this.esc(n)}">${this.esc(this.ini(n))}</span>`; }
		uname(u) {
			if (!u) return "";
			try { return (frappe.user && frappe.user.full_name && frappe.user.full_name(u)) || u; } catch (e) { return u; }
		}
		pd(d) { // parse YYYY-MM-DD as LOCAL date (avoids timezone shift)
			if (!d) return null;
			const m = String(d).match(/^(\d{4})-(\d{2})-(\d{2})/);
			return m ? new Date(+m[1], +m[2] - 1, +m[3]) : (isNaN(new Date(d)) ? null : new Date(d));
		}
		fdate(d) {
			const x = this.pd(d);
			return x ? `${x.getDate()} ${MONTHS[x.getMonth()]}` : "";
		}
		today0() { return new Date(new Date().toDateString()); }
		is_overdue(d) { const x = this.pd(d); return !!x && x < this.today0(); }
		is_today(d) { const x = this.pd(d); return !!x && x.getTime() === this.today0().getTime(); }

		async call(method, args) {
			try { return { ok: true, data: await frappe.xcall(method, args || {}) }; }
			catch (e) {
				console.error("EOS call failed:", method, e);
				let msg = "Request failed";
				try {
					const sm = (e && (e._server_messages || (e.responseJSON && e.responseJSON._server_messages)));
					if (sm) msg = JSON.parse(JSON.parse(sm)[0]).message;
					else if (e && e.responseJSON && e.responseJSON.exception) msg = e.responseJSON.exception;
					else if (e && e.exception) msg = e.exception;
					else if (e && e.message) msg = e.message;
					else if (typeof e === "string") msg = e;
				} catch (_) { /* ignore */ }
				return { ok: false, error: String(msg).replace(/<[^>]+>/g, "") };
			}
		}

		list(doctype, fields, filters, order_by, limit) {
			return this.call("frappe.client.get_list", {
				doctype, fields, filters: filters || {}, order_by: order_by || "modified desc", limit_page_length: limit || 500
			});
		}

		/* ================= SHELL ================= */
		css() {
			if (document.getElementById("nn-css")) return;
			$("head").append(`<style id="nn-css">
			.nn{display:flex;min-height:calc(100vh - 70px);background:#fff;color:#1f2937;font-size:13px;
				font-family:-apple-system,BlinkMacSystemFont,"Inter","Segoe UI",Roboto,sans-serif}
			.nn *{box-sizing:border-box}
			.nn-side{width:210px;flex-shrink:0;border-right:1px solid #e5e7eb;padding:14px 10px;background:#fafafa;display:flex;flex-direction:column}
			.nn-co{display:flex;align-items:center;gap:8px;font-weight:600;padding:6px 8px 14px;color:#111827;font-size:13px;line-height:1.3}
			.nn-co-l{width:26px;height:26px;border-radius:6px;background:#14532d;color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0}
			.nn-nav{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:6px;cursor:pointer;color:#374151;margin-bottom:2px}
			.nn-nav:hover{background:#efefef}
			.nn-nav.on{background:#e8eeea;color:#14532d;font-weight:600}
			.nn-me{margin-top:auto;display:flex;align-items:center;gap:8px;padding:10px 8px;border-top:1px solid #e5e7eb;font-weight:500}
			.nn-main{flex:1;min-width:0;padding:22px 28px 40px}
			.nn-title{font-size:22px;font-weight:700;color:#111827}
			.nn-sub{font-size:12.5px;color:#6b7280;margin-top:2px}
			.nn-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
			.nn-hr{display:flex;align-items:center;gap:8px}
			.nn-tabs{display:flex;gap:22px;margin-top:16px;border-bottom:1px solid #e5e7eb}
			.nn-tab{padding:9px 2px;cursor:pointer;color:#6b7280;border-bottom:2px solid transparent;font-weight:500}
			.nn-tab.on{color:#14532d;border-bottom-color:#14532d;font-weight:600}
			.nn-bar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:12px 0;border-bottom:1px solid #e5e7eb;margin-bottom:16px}
			.nn-sp{flex:1}
			.nn-pill{border:1px solid #d1d5db;background:#fff;border-radius:999px;padding:6px 12px;font-size:12px;color:#374151;outline:none;height:auto;width:auto}
			.nn-btn{border:1px solid #d1d5db;background:#fff;color:#374151;border-radius:6px;padding:6px 12px;cursor:pointer;font-size:12px;font-weight:500;white-space:nowrap}
			.nn-btn:hover{background:#f3f4f6}
			.nn-btn.pri{background:#14532d;border-color:#14532d;color:#fff}
			.nn-btn.pri:hover{background:#166534}
			.nn-search{border:1px solid #d1d5db;border-radius:6px;padding:6px 10px;font-size:12px;min-width:200px;outline:none;height:auto;width:auto}
			.nn-banner{display:flex;align-items:center;justify-content:space-between;gap:12px;background:#eef3f0;border:1px solid #dfe8e3;border-radius:6px;padding:13px 16px;margin-bottom:16px;font-weight:600}
			.nn-warn{background:#fff7ed;border-color:#fed7aa;color:#9a3412;font-weight:500}
			.nn-link{background:none;border:0;color:#6b7280;cursor:pointer;margin-right:12px;font-weight:400}
			.nn-card{border:1px solid #e5e7eb;border-radius:8px;margin-bottom:20px;background:#fff;overflow:hidden}
			.nn-card-h{display:flex;justify-content:space-between;align-items:center;padding:14px 16px}
			.nn-card-t{font-size:16px;font-weight:700;display:flex;align-items:center;gap:10px}
			.nn-cnt{background:#f3f4f6;border-radius:4px;padding:1px 7px;font-size:13px;font-weight:600}
			.nn-scroll{overflow:auto}
			.nn-tbl{width:100%;border-collapse:collapse;margin:0}
			.nn-tbl th{font-size:11px;font-weight:500;color:#6b7280;text-align:center;padding:8px 10px;border:1px solid #eef0f2;background:#fff;white-space:nowrap}
			.nn-tbl th.l,.nn-tbl td.l{text-align:left}
			.nn-tbl th.cur{color:#111827;font-weight:600}
			.nn-tbl td{border:1px solid #eef0f2;padding:0 10px;height:34px;font-size:12px;text-align:center;white-space:nowrap}
			.nn-tbl tr:hover td{background:#fafafa}
			.nn-tbl td.t{text-align:left;min-width:260px;color:#111827}
			.nn-tbl td.c{padding:0;min-width:96px}
			.nn-tbl td.ok,.nn-tbl tr:hover td.ok{background:#e8f5ec;color:#1b6b3a}
			.nn-tbl td.bad,.nn-tbl tr:hover td.bad{background:#fdecec;color:#c0392b}
			.nn-in{width:100%;height:33px;border:0;background:transparent;text-align:center;color:inherit;font-size:12px;outline:none;box-shadow:none;border-radius:0}
			.nn-in:focus{background:#fff;box-shadow:inset 0 0 0 2px #14532d}
			.nn-av{display:inline-flex;width:26px;height:26px;border-radius:50%;background:#9ca3af;color:#fff;font-size:9px;align-items:center;justify-content:center;font-weight:600;flex-shrink:0}
			.nn-av.lg{width:34px;height:34px;font-size:12px}
			.nn-good{color:#16a34a}.nn-off{color:#ea580c}.nn-nod{color:#6b7280}
			.nn-mini{border:1px solid #d1d5db;background:#fff;border-radius:5px;padding:3px 8px;font-size:10px;cursor:pointer}
			.nn-empty{text-align:center;padding:44px;color:#6b7280}
			.nn-menu{position:fixed;background:#fff;border:1px solid #e5e7eb;border-radius:8px;box-shadow:0 10px 25px rgba(0,0,0,.12);z-index:1050;padding:14px;min-width:240px}
			.nn-row{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f3f4f6;gap:10px}
			.nn-sw{width:38px;height:21px;background:#d1d5db;border-radius:20px;position:relative;cursor:pointer;flex-shrink:0;display:inline-block}
			.nn-sw.on{background:#14532d}
			.nn-sw:after{content:"";position:absolute;top:3px;left:3px;width:15px;height:15px;border-radius:50%;background:#fff;transition:.15s}
			.nn-sw.on:after{left:20px}
			/* rocks */
			.nn-rock{display:grid;grid-template-columns:24px 92px 1fr 130px 150px 40px 70px 30px;gap:10px;align-items:center;padding:11px 16px;border-top:1px solid #f3f4f6;cursor:pointer}
			.nn-rock:hover{background:#fafafa}
			.nn-rock-hd{cursor:default;font-size:11px;color:#6b7280;border-top:0}
			.nn-rock-hd:hover{background:#fff}
			.nn-ms{display:grid;grid-template-columns:24px 92px 1fr 130px 150px 40px 70px 30px;gap:10px;align-items:center;padding:10px 16px;border-top:1px solid #f3f4f6;background:#fafafa}
			.nn-chk{width:18px;height:18px;border:1.5px solid #9ca3af;border-radius:50%;display:inline-block;cursor:pointer;background:#fff;flex-shrink:0}
			.nn-chk.done{background:#14532d;border-color:#14532d}
			.nn-chev{color:#6b7280;font-size:11px;cursor:pointer;text-align:center}
			.nn-badge{border-radius:4px;padding:2px 8px;font-size:11px;font-weight:600;display:inline-block;background:#dbeafe;color:#1d4ed8}
			.nn-badge.on-track{background:#e0f2fe;color:#0369a1}
			.nn-badge.off-track{background:#fee2e2;color:#b91c1c}
			.nn-badge.complete,.nn-badge.completed{background:#dcfce7;color:#166534}
			.nn-tag{border:1px solid #d1d5db;border-radius:4px;padding:2px 8px;font-size:11px;color:#6b7280;display:inline-block}
			.nn-bar2{height:6px;background:#e5e7eb;border-radius:6px;overflow:hidden;flex:1}
			.nn-bar2>div{height:100%;background:#14532d}
			.nn-prog{display:flex;align-items:center;gap:8px;font-size:11px;color:#6b7280}
			.nn-grp{display:flex;align-items:center;gap:12px}
			.nn-add{padding:12px 16px;border-top:1px solid #f3f4f6;color:#14532d;cursor:pointer;font-weight:500}
			.nn-add:hover{background:#fafafa}
			/* todos */
			.nn-todo{display:grid;grid-template-columns:30px 1fr 30px 90px 60px 30px;gap:10px;align-items:center;padding:11px 16px;border-top:1px solid #f3f4f6}
			.nn-todo:hover{background:#fafafa}
			.nn-todo-hd{font-size:11px;color:#6b7280;border-top:0}
			.nn-todo-hd:hover{background:#fff}
			.nn-red{color:#dc2626}
			.nn-dot{width:14px;height:14px;border-radius:50%;background:#dc2626;display:inline-flex;color:#fff;font-size:9px;align-items:center;justify-content:center;font-weight:700}
			.nn-clock{width:14px;height:14px;border-radius:50%;background:#111827;display:inline-block}
			.nn-dots{color:#9ca3af;cursor:pointer;text-align:center}
			.nn-foot{display:flex;justify-content:space-between;align-items:center;border-top:1px solid #f3f4f6}
			.nn-foot .nn-add{border-top:0}
			.nn-foot .nn-pg{padding:0 16px;font-size:11px;color:#6b7280}
			@media(max-width:900px){.nn-side{display:none}.nn-rock,.nn-ms{grid-template-columns:24px 1fr 40px}.nn-rock>*:nth-child(2),.nn-rock>*:nth-child(4),.nn-rock>*:nth-child(5){display:none}}
			</style>`);
		}

		shell() {
			let company = "EOS";
			try { company = frappe.defaults.get_default("company") || (frappe.boot.sysdefaults || {}).company || "EOS"; } catch (e) { /* ignore */ }
			const me = frappe.session.user_fullname || frappe.session.user || "";
			const items = NAV.map(([k, l]) =>
				`<div class="nn-nav" data-view="${k}">${ICON[k]}<span>${__(l)}</span></div>`).join("");
			this.$root = $(`<div class="nn">
				<div class="nn-side">
					<div class="nn-co"><span class="nn-co-l">${this.esc(this.ini(company))}</span><span>${this.esc(company)}</span></div>
					${items}
					<div class="nn-me">${this.av(me)}<span>${this.esc(me)}</span></div>
				</div>
				<div class="nn-main" id="nn-main"></div></div>`);
			$(this.page.main).empty().append(this.$root);

			const self = this;
			this.$root.on("click", ".nn-nav", function () { self.go($(this).attr("data-view")); });
			$(document).off("click.nnmenu").on("click.nnmenu", e => {
				if (!$(e.target).closest(".nn-menu, [data-menu]").length) this.close_menu();
			});
		}

		get $main() { return this.$root.find("#nn-main"); }

		go(view) {
			this.close_menu();
			this.s.view = view;
			this.$root.find(".nn-nav").removeClass("on").filter(`[data-view="${view}"]`).addClass("on");
			if (view === "scorecard") this.load_scorecard();
			else if (view === "rocks") this.load_rocks();
			else this.load_todos();
		}

		close_menu() { $(".nn-menu").remove(); }
		place_menu($m, anchor) {
			this.close_menu();
			$("body").append($m);
			const r = anchor.getBoundingClientRect();
			$m.css({ top: r.bottom + 6, left: Math.max(8, r.right - $m.outerWidth()) });
		}

		head(title, sub, right) {
			return `<div class="nn-head"><div><div class="nn-title">${title}</div>
				<div class="nn-sub">${sub}</div></div><div class="nn-hr">${right || ""}</div></div>`;
		}

		/* ================= SCORECARD ================= */
		range_label(d) {
			const e = new Date(d); e.setDate(e.getDate() + 6);
			return `${d.getDate()} ${MONTHS[d.getMonth()]} - ${e.getDate()} ${MONTHS[e.getMonth()]}`;
		}

		normalize(raw, timeframe) {
			if (!raw) return null;
			if (Array.isArray(raw)) raw = { metrics: raw };

			let periods = (raw.periods || raw.weeks || raw.columns || []).map((p, i) =>
				typeof p === "string"
					? { key: p, period_start: p, label: p, sub: "", current: /current/i.test(p) }
					: {
						key: p.key || p.period_start || p.name || p.period || p.start_date || String(i),
						period_start: p.period_start || p.key || p.name || String(i),
						label: p.label || p.title || p.name || p.period || String(i),
						sub: p.sub || "",
						current: !!p.current || /current/i.test(p.label || ""),
						year: p.year
					});

			// build values aligned to ORIGINAL period order
			let metrics = (raw.metrics || raw.rows || raw.data || []).map(m => {
				let values = m.values;
				if (!values) {
					const src = m.entries || m.periods || {};
					values = periods.map(p => (src[p.key] !== undefined ? src[p.key] : null));
				} else if (Array.isArray(values) && values.length && typeof values[0] === "object" && values[0] !== null) {
					values = periods.map(p => {
						const f = m.values.find(v => v.period_start === p.period_start || v.key === p.key || v.label === p.label);
						return f ? f.value : null;
					});
				} else {
					values = values.slice();
				}
				return {
					id: m.id || m.name || m.title,
					title: m.title || m.measurable || m.metric_name || m.name || "",
					owner: m.owner_name || m.owner_user || m.owner || "",
					team: m.team || "",
					goal_op: m.goal_op || m.operator || ">=",
					goal: m.goal !== undefined ? m.goal : m.target_value !== undefined ? m.target_value : m.target,
					unit: m.unit || "",
					values
				};
			});

			// if periods are real dates -> sort newest first, mark current week, build "28 Sep - 4 Oct" labels
			const dates = periods.map(p => this.pd(p.period_start));
			if (periods.length && dates.every(Boolean)) {
				const order = periods.map((_, i) => i).sort((a, b) => dates[b] - dates[a]);
				const today = this.today0();
				periods = order.map(i => {
					const p = Object.assign({}, periods[i]), d = dates[i];
					p.year = d.getFullYear();
					if (timeframe === "Week") {
						const e = new Date(d); e.setDate(e.getDate() + 6);
						p.current = today >= d && today <= e;
						const rl = this.range_label(d);
						if (p.current) { p.label = "Current Week"; p.sub = rl; } else { p.label = rl; p.sub = ""; }
					}
					return p;
				});
				metrics.forEach(m => { m.values = order.map(i => (m.values[i] === undefined ? null : m.values[i])); });
			}
			return { periods, metrics };
		}

		fmt(m, v) {
			if (v == null || v === "") return "";
			const n = Number(v);
			if (isNaN(n)) return this.esc(v);
			const s = n.toLocaleString(undefined, { maximumFractionDigits: 2 });
			return m.unit === "$" ? "$" + s : m.unit === "%" ? s + "%" : s;
		}

		meets(m, v) {
			const g = Number(m.goal), n = Number(v);
			if (v == null || v === "" || isNaN(n) || isNaN(g)) return null;
			const r = { ">": n > g, ">=": n >= g, "<": n < g, "<=": n <= g, "=": n === g, "==": n === g }[m.goal_op];
			return r === undefined ? n >= g : r;
		}

		nums(m) { return (m.values || []).filter(v => v != null && v !== "" && !isNaN(Number(v))).map(Number); }
		health(m) {
			const r = (m.values || []).slice(0, 3).filter(v => v != null && v !== "");
			return !r.length ? "nod" : this.meets(m, r[0]) ? "good" : "off";
		}

		async load_scorecard() {
			this.$main.html(`<div class="nn-empty">${__("Loading scorecard…")}</div>`);
			const tf = this.s.timeframe;
			const method = tf === "Week" ? CFG.api.scorecard_read : CFG.api.scorecard_rollup;
			const res = await this.call(method, {
				team: this.s.team, timeframe: tf, view_by: tf, periods: this.s.range, range_weeks: this.s.range
			});
			if (this.s.view !== "scorecard") return;

			this.sc_error = null;
			if (res.ok && res.data) {
				this.data = this.normalize(res.data, tf) || { periods: [], metrics: [] };
			} else {
				this.sc_error = res.error || "No data returned";
				this.data = { periods: [], metrics: [] };
			}
			this.render_scorecard();
		}

		render_scorecard() {
			const s = this.s;
			const teams = ["All Teams"].concat([...new Set(this.data.metrics.map(m => m.team).filter(Boolean))]);
			const label = (TIMEFRAMES.find(t => t[0] === s.timeframe) || [])[1];
			const need = this.data.metrics.some(m => this.health(m) !== "good");
			const ranges = RANGES[s.timeframe] || [s.range];

			this.$main.html(`
				${this.head(__("Scorecard"), __("Record and evaluate key metrics, streamlined for strategic success."),
				`<input class="nn-search" id="nn-gsearch" placeholder="${__("Search Measurables…")}" value="${this.esc(s.search)}">`)}
				<div class="nn-tabs">${TIMEFRAMES.map(([k, l]) =>
					`<div class="nn-tab nn-tf ${s.timeframe === k ? "on" : ""}" data-tf="${k}">${l}</div>`).join("")}</div>
				<div class="nn-bar">
					<select class="nn-pill" id="nn-team">${teams.map(t => `<option ${t === s.team ? "selected" : ""}>${this.esc(t)}</option>`).join("")}</select>
					<select class="nn-pill" id="nn-range">${ranges.map(n => `<option value="${n}" ${n === s.range ? "selected" : ""}>${__("Last")} ${n} ${RANGE_UNIT[s.timeframe]}</option>`).join("")}</select>
					<button class="nn-btn" id="nn-cols" data-menu>⚙ ${__("Columns")} ▾</button>
					<div class="nn-sp"></div>
					<button class="nn-btn" id="nn-refresh">⟳ ${__("Refresh")}</button>
					<button class="nn-btn" id="nn-mm">${__("Go to Measurable Manager")}</button>
				</div>
				${this.sc_error ? `<div class="nn-banner nn-warn">⚠ ${__("Scorecard API error:")} ${this.esc(this.sc_error)}</div>` : ""}
				${need && !this.sc_error && !s.banner_off ? `<div class="nn-banner"><span>${__("See what needs your team's attention")}</span><span>
					<button class="nn-link" id="nn-notnow">${__("Not now")}</button>
					<button class="nn-btn pri" id="nn-attn">${s.attention ? __("Show all") : __("Find what needs attention")}</button></span></div>` : ""}
				<div class="nn-card">
					<div class="nn-card-h"><div class="nn-card-t">${label} KPIs <span class="nn-cnt" id="nn-count">${this.data.metrics.length}</span></div>
					<button class="nn-btn" id="nn-newm">${__("New Measurable")} ▾</button></div>
					<div class="nn-scroll" id="nn-grid"></div>
				</div>`);

			const self = this, $m = this.$main;
			$m.find(".nn-tf").on("click", function () {
				s.timeframe = $(this).attr("data-tf"); s.range = RANGE_DEFAULT[s.timeframe]; self.load_scorecard();
			});
			$m.find("#nn-team").on("change", function () { s.team = $(this).val(); self.load_scorecard(); });
			$m.find("#nn-range").on("change", function () { s.range = +$(this).val(); self.load_scorecard(); });
			$m.find("#nn-gsearch").on("input", function () { s.search = $(this).val(); self.render_grid(); });
			$m.find("#nn-attn").on("click", () => { s.attention = !s.attention; this.render_scorecard(); });
			$m.find("#nn-notnow").on("click", () => { s.banner_off = true; s.attention = false; this.render_scorecard(); });
			$m.find("#nn-refresh").on("click", () => this.load_scorecard());
			$m.find("#nn-mm").on("click", () => frappe.set_route("List", CFG.metric_doctype));
			$m.find("#nn-newm").on("click", () => frappe.new_doc(CFG.metric_doctype));
			$m.find("#nn-cols").on("click", function (e) { e.stopPropagation(); self.cols_menu(this); });
			this.render_grid();
		}

		cols_menu(anchor) {
			const sw = (l, k) => `<div class="nn-row"><span>${l}</span><div class="nn-sw ${this.s[k] ? "on" : ""}" data-k="${k}"></div></div>`;
			const $m = $(`<div class="nn-menu">${sw(__("Owner"), "sc_owner")}${sw(__("Goal"), "sc_goal")}${sw(__("Average"), "sc_avg")}${sw(__("Total"), "sc_total")}</div>`);
			$m.on("click", ".nn-sw", e => {
				const k = $(e.currentTarget).attr("data-k");
				this.s[k] = !this.s[k];
				$(e.currentTarget).toggleClass("on");
				this.render_grid();
			});
			this.place_menu($m, anchor);
		}

		render_grid() {
			const s = this.s, week = s.timeframe === "Week";
			const periods = this.data.periods.slice(0, s.range);
			const q = (s.search || "").toLowerCase();
			const metrics = this.data.metrics.filter(m =>
				(s.team === "All Teams" || !m.team || m.team === s.team) &&
				(!q || (m.title || "").toLowerCase().includes(q)) &&
				(!s.attention || this.health(m) !== "good"));

			const fixed = 3 + (+s.sc_owner) + (+s.sc_goal) + (+s.sc_avg) + (+s.sc_total);
			const year = periods.length ? (periods[0].year || new Date().getFullYear()) : "";
			const head = `<thead>
				<tr><th colspan="${fixed}" style="border:0"></th>
					<th colspan="${periods.length + 1}" class="l" style="border:0;color:#9ca3af">${this.esc(year)}</th></tr>
				<tr><th style="width:30px"><input type="checkbox" id="nn-all"></th><th>${__("View Trend")}</th><th class="l">${__("Title")}</th>
					${s.sc_owner ? `<th>${__("Owner")}</th>` : ""}${s.sc_goal ? `<th>${__("Goal")}</th>` : ""}
					${s.sc_avg ? `<th>${__("Average")}</th>` : ""}${s.sc_total ? `<th>${__("Total")}</th>` : ""}
					${periods.map(p => `<th class="${p.current ? "cur" : ""}">${p.current ? "<span style='color:#14532d'>●</span> " : ""}${this.esc(p.label)}${p.sub ? `<div style="font-weight:400;color:#9ca3af">${this.esc(p.sub)}</div>` : ""}</th>`).join("")}
					<th>${__("Action")}</th></tr></thead>`;

			const cur = (this.data.periods.find(p => p.current) || this.data.periods[0] || {}).key || "";
			const rows = metrics.map(m => {
				const i = this.data.metrics.indexOf(m);
				const n = this.nums(m).slice(0, periods.length || undefined);
				const tot = n.length ? n.reduce((a, b) => a + b, 0) : null;
				const avg = n.length ? tot / n.length : null;
				const h = this.health(m);
				const icon = { good: `<span class="nn-good">↗</span>`, off: `<span class="nn-off">⚠</span>`, nod: `<span class="nn-nod">?</span>` }[h];
				const cells = periods.map((p, pi) => {
					const v = (m.values || [])[pi];
					const ok = this.meets(m, v);
					const cls = ok === null ? "c" : ok ? "c ok" : "c bad";
					return `<td class="${cls}">${week
						? `<input class="nn-in" data-i="${i}" data-p="${pi}" value="${this.esc(v == null ? "" : v)}" title="${this.esc(this.fmt(m, v))}">`
						: this.fmt(m, v)}</td>`;
				}).join("");
				return `<tr data-row="${i}"><td><input type="checkbox" class="nn-sel"></td><td>${icon}</td><td class="t">${this.esc(m.title)}</td>
					${s.sc_owner ? `<td>${this.av(m.owner)}</td>` : ""}
					${s.sc_goal ? `<td>${this.esc(m.goal_op)} ${m.unit === "$" ? "$" : ""}${this.esc(m.goal == null ? "" : m.goal)}${m.unit === "%" ? "%" : ""}</td>` : ""}
					${s.sc_avg ? `<td>${avg == null ? "" : this.fmt(m, avg)}</td>` : ""}
					${s.sc_total ? `<td>${tot == null ? "" : this.fmt(m, tot)}</td>` : ""}
					${cells}
					<td>${h === "off" ? `<button class="nn-mini nn-issue" data-id="${this.esc(m.id)}" data-week="${this.esc(cur)}">${__("Make it an Issue")}</button>` : ""}</td></tr>`;
			}).join("");

			this.$main.find("#nn-grid").html(`<table class="nn-tbl">${head}<tbody>${rows ||
				`<tr><td colspan="${fixed + periods.length + 1}"><div class="nn-empty">${__("No measurables found.")}</div></td></tr>`}</tbody></table>`);
			this.$main.find("#nn-count").text(metrics.length);

			const self = this;
			this.$main.find("#nn-all").on("change", function () { self.$main.find(".nn-sel").prop("checked", this.checked); });
			this.$main.find(".nn-in").on("change", function () {
				self.edit_cell(+$(this).attr("data-i"), +$(this).attr("data-p"), $(this).val());
			});
			this.$main.find(".nn-issue").on("click", function () {
				self.make_issue($(this).attr("data-id"), $(this).attr("data-week"));
			});
		}

		async edit_cell(i, p, raw) {
			const m = this.data.metrics[i], period = this.data.periods[p];
			if (!m || !period) return;
			const value = raw === "" ? null : raw;
			const old = m.values[p];
			m.values[p] = value;
			this.render_grid();

			const res = await this.call(CFG.api.scorecard_write, {
				metric: m.id,
				week_start_date: period.period_start || period.key,
				actual_value: value
			});

			if (res.ok) {
				frappe.show_alert({ message: __("{0} updated", [this.esc(m.title)]), indicator: "green" });
			} else {
				m.values[p] = old;
				frappe.msgprint({ title: __("Could not save"), message: this.esc(res.error), indicator: "red" });
				this.load_scorecard();
			}
		}

		make_issue(id, week) {
			const m = this.data.metrics.find(x => x.id === id);
			frappe.confirm(__("Create an Issue from <b>{0}</b>?", [this.esc(m ? m.title : id)]), async () => {
				const res = await this.call(CFG.api.create_issue, { metric: id, week_start_date: week });
				res.ok
					? frappe.show_alert({ message: __("Issue created"), indicator: "green" })
					: frappe.msgprint({ title: __("Could not create issue"), message: this.esc(res.error), indicator: "red" });
			});
		}

		/* ================= ROCKS ================= */
		skey(st) { return String(st || "").toLowerCase().trim().replace(/[\s_]+/g, "-"); }

		async load_rocks() {
			this.$main.html(`<div class="nn-empty">${__("Loading rocks…")}</div>`);
			const R = CFG.rock;
			const res = await this.list(R.doctype, ["name", R.title + " as title", R.status + " as status",
				R.owner + " as owner_name", R.due + " as due", R.is_company + " as is_company"], {}, R.due + " asc");
			this.rocks_error = null;
			if (res.ok && res.data) {
				this.rocks = res.data;
				await Promise.all(this.rocks.map(async r => {
					r.milestones = [];
					const d = await this.call("frappe.client.get", { doctype: R.doctype, name: r.name });
					if (d.ok && d.data && d.data[R.milestones_table]) {
						r.milestones = d.data[R.milestones_table].map(m => ({
							name: m.name, title: m[R.ms_title], due: m[R.ms_due], done: !!m[R.ms_done]
						}));
					}
				}));
			} else {
				this.rocks_error = `${R.doctype}: ${res.error}`;
				this.rocks = [];
			}
			if (this.s.view !== "rocks") return;
			this.render_rocks();
		}

		render_rocks() {
			const s = this.s;
			const owners = ["All"].concat([...new Set(this.rocks.map(r => r.owner_name).filter(Boolean))]);
			const statuses = ["All"].concat([...new Set(this.rocks.map(r => r.status).filter(Boolean))]);
			this.$main.html(`
				${this.head(__("Rocks"), __("Set and track quarterly goals to help your team consistently hit their targets."),
				`<input class="nn-search" id="nn-rsearch" placeholder="${__("Search Rocks…")}" value="${this.esc(s.rock_search)}">
				 <button class="nn-btn pri" id="nn-newrock">${__("Create")}</button>`)}
				<div class="nn-tabs"><div class="nn-tab on">${__("List")}</div></div>
				<div class="nn-bar">
					<select class="nn-pill" id="nn-r-owner">${owners.map(o => `<option value="${this.esc(o)}" ${o === s.rock_owner ? "selected" : ""}>${__("Owner")}: ${this.esc(o)}</option>`).join("")}</select>
					<select class="nn-pill" id="nn-r-status">${statuses.map(o => `<option value="${this.esc(o)}" ${o === s.rock_status ? "selected" : ""}>${__("Status")}: ${this.esc(o)}</option>`).join("")}</select>
					<div class="nn-sp"></div>
					<button class="nn-btn" id="nn-r-refresh">⟳</button>
				</div>
				${this.rocks_error ? `<div class="nn-banner nn-warn">⚠ ${__("Could not load Rocks:")} ${this.esc(this.rocks_error)}</div>` : ""}
				<div id="nn-rlist"></div>`);

			const self = this;
			this.$main.find("#nn-newrock").on("click", () => frappe.new_doc(CFG.rock.doctype));
			this.$main.find("#nn-r-refresh").on("click", () => this.load_rocks());
			this.$main.find("#nn-rsearch").on("input", function () { s.rock_search = $(this).val(); self.render_rock_list(); });
			this.$main.find("#nn-r-owner").on("change", function () { s.rock_owner = $(this).val(); self.render_rock_list(); });
			this.$main.find("#nn-r-status").on("change", function () { s.rock_status = $(this).val(); self.render_rock_list(); });
			this.render_rock_list();
		}

		render_rock_list() {
			const s = this.s, q = (s.rock_search || "").toLowerCase();
			const f = this.rocks.filter(r =>
				(s.rock_owner === "All" || r.owner_name === s.rock_owner) &&
				(s.rock_status === "All" || r.status === s.rock_status) &&
				(!q || (r.title || "").toLowerCase().includes(q)));

			const co = f.filter(r => r.is_company);
			const by = {};
			f.forEach(r => { (by[r.owner_name || __("Unassigned")] = by[r.owner_name || __("Unassigned")] || []).push(r); });

			let html = `<div class="nn-card"><div class="nn-card-h"><div class="nn-card-t">${__("Company Rocks")} <span class="nn-cnt">${co.length}</span></div></div>${this.rock_block(co, true)}</div>`;
			Object.keys(by).forEach(o => {
				html += `<div class="nn-card"><div class="nn-card-h"><div class="nn-grp">${this.av(o).replace("nn-av", "nn-av lg")}<div class="nn-card-t">${this.esc(o)} <span class="nn-cnt">${by[o].length}</span></div></div></div>${this.rock_block(by[o], false)}
					<div class="nn-add nn-add-rock">+ ${__("Add Rock")}</div></div>`;
			});
			this.$main.find("#nn-rlist").html(html);

			const self = this, $l = this.$main.find("#nn-rlist");
			$l.find(".nn-add-rock").on("click", () => frappe.new_doc(CFG.rock.doctype));
			$l.find(".nn-rock-toggle").on("click", function () {
				const id = $(this).attr("data-id");
				self.open_rocks[id] = !self.open_rocks[id];
				self.render_rock_list();
			});
			$l.find(".nn-rock-chk").on("click", function (e) { e.stopPropagation(); self.toggle_rock($(this).attr("data-id")); });
			$l.find(".nn-rock-open").on("click", function (e) { e.stopPropagation(); frappe.set_route("Form", CFG.rock.doctype, $(this).attr("data-id")); });
			$l.find(".nn-ms-chk").on("click", function (e) { e.stopPropagation(); self.toggle_ms($(this).attr("data-id"), $(this).attr("data-ms")); });
		}

		rock_block(items, show_owner) {
			if (!items.length) return `<div class="nn-empty">${__("No rocks found.")}</div>`;
			const hd = `<div class="nn-rock nn-rock-hd"><div></div><div>${__("Status")}</div><div>${__("Title")}</div><div style="text-align:left">${__("Milestone progress")}</div><div>${show_owner ? __("Owner") : ""}</div><div>${__("Due by")}</div><div></div><div></div></div>`;
			const rows = items.map(r => {
				const open = !!this.open_rocks[r.name];
				const k = this.skey(r.status);
				const done = k === "complete" || k === "completed";
				const ms = r.milestones || [];
				const dcnt = ms.filter(m => m.done).length;
				const pct = ms.length ? Math.round(dcnt / ms.length * 100) : 0;
				const ms_rows = open ? ms.map((m, mi) => `
					<div class="nn-ms"><div></div>
					<div><span class="nn-chk nn-ms-chk ${m.done ? "done" : ""}" data-id="${this.esc(r.name)}" data-ms="${this.esc(m.name)}"></span></div>
					<div style="color:${m.done ? "#9ca3af" : "#374151"};${m.done ? "text-decoration:line-through" : ""}">${this.esc(m.title)}</div>
					<div></div><div>${this.av(r.owner_name)}</div>
					<div style="font-size:11px;color:${this.is_overdue(m.due) && !m.done ? "#dc2626" : "#6b7280"}">${this.fdate(m.due)}</div><div></div><div></div></div>`).join("") : "";
				return `<div class="nn-rock nn-rock-toggle" data-id="${this.esc(r.name)}">
					<div class="nn-chev">${open ? "▼" : "▶"}</div>
					<div><span class="nn-badge ${this.esc(k)}">${this.esc(r.status || "Off-track")}</span></div>
					<div style="font-weight:500"><span class="nn-rock-open" data-id="${this.esc(r.name)}" style="cursor:pointer">${this.esc(r.title)}</span>
						${r.is_company && !show_owner ? ` <span class="nn-tag">${__("Company Rock")}</span>` : ""}</div>
					<div class="nn-prog"><div class="nn-bar2"><div style="width:${pct}%"></div></div><span>${dcnt}/${ms.length}</span></div>
					<div>${show_owner ? this.av(r.owner_name) : ""}</div>
					<div style="font-size:11px;color:${this.is_overdue(r.due) && !done ? "#dc2626" : "#6b7280"}">${this.fdate(r.due)}</div>
					<div><span class="nn-chk nn-rock-chk ${done ? "done" : ""}" data-id="${this.esc(r.name)}" title="${__("Mark complete")}"></span></div>
					<div class="nn-dots">⋯</div></div>${ms_rows}`;
			}).join("");
			return hd + rows;
		}

		async toggle_rock(id) {
			const r = this.rocks.find(x => x.name === id);
			if (!r) return;
			const k = this.skey(r.status), done = k === "complete" || k === "completed";
			const prev = r.status;
			r.status = done ? "On-track" : "Complete";
			this.render_rock_list();
			let res = await this.call(CFG.api.rock_complete, { rock: id, complete: !done });
			if (!res.ok) // fallback: plain field update
				res = await this.call("frappe.client.set_value", { doctype: CFG.rock.doctype, name: id, fieldname: CFG.rock.status, value: r.status });
			if (!res.ok) {
				r.status = prev;
				frappe.show_alert({ message: __("Could not update rock"), indicator: "red" });
				this.render_rock_list();
			}
		}

		async toggle_ms(rock, ms_name) {
			const R = CFG.rock;
			const r = this.rocks.find(x => x.name === rock);
			const m = r && r.milestones.find(x => x.name === ms_name);
			if (!m) return;
			m.done = !m.done;
			this.render_rock_list();
			let ok = false;
			const d = await this.call("frappe.client.get", { doctype: R.doctype, name: rock });
			if (d.ok && d.data) {
				const row = (d.data[R.milestones_table] || []).find(x => x.name === ms_name);
				if (row) {
					row[R.ms_done] = m.done ? 1 : 0;
					ok = (await this.call("frappe.client.save", { doc: d.data })).ok;
				}
			}
			if (!ok) {
				m.done = !m.done;
				frappe.show_alert({ message: __("Could not update milestone"), indicator: "red" });
				this.render_rock_list();
			}
		}

		/* ================= TO-DOS ================= */
		async load_todos() {
			this.$main.html(`<div class="nn-empty">${__("Loading to-dos…")}</div>`);
			const T = CFG.todo;
			const res = await this.list(T.doctype,
				["name", "description", "owner", T.assignee + " as assignee", T.due + " as due", "status"],
				{ status: ["in", ["Open", "Closed"]] }, T.due + " asc");
			if (this.s.view !== "todos") return;
			this.todos_error = null;
			if (res.ok && res.data) this.todos = res.data;
			else { this.todos_error = res.error; this.todos = []; }
			this.render_todos();
		}

		render_todos() {
			const s = this.s;
			const owners = ["All"].concat([...new Set(this.todos.map(t => t.assignee || t.owner).filter(Boolean))]);
			this.$main.html(`
				${this.head(__("To-Dos"), __("Create, assign, and track deadlines for critical tasks."),
				`<input class="nn-search" id="nn-tsearch" placeholder="${__("Search To-Dos…")}" value="${this.esc(s.todo_search)}">
				 <button class="nn-btn pri" id="nn-newtodo">${__("Create")}</button>`)}
				<div class="nn-tabs">
					<div class="nn-tab nn-td-tab ${s.todo_tab === "Team" ? "on" : ""}" data-t="Team">${__("Team")}</div>
					<div class="nn-tab nn-td-tab ${s.todo_tab === "Private" ? "on" : ""}" data-t="Private">${__("Private")}</div>
				</div>
				<div class="nn-bar">
					<select class="nn-pill" id="nn-td-owner">${owners.map(o => `<option value="${this.esc(o)}" ${o === s.todo_owner ? "selected" : ""}>${__("Owner")}: ${this.esc(o === "All" ? o : this.uname(o))}</option>`).join("")}</select>
					<span style="display:flex;align-items:center;gap:8px"><span class="nn-sw ${s.todo_archive ? "on" : ""}" id="nn-td-arch"></span>${__("Archive")}</span>
					<div class="nn-sp"></div>
					<button class="nn-btn" id="nn-td-refresh">⟳</button>
				</div>
				${this.todos_error ? `<div class="nn-banner nn-warn">⚠ ${__("Could not load To-Dos:")} ${this.esc(this.todos_error)}</div>` : ""}
				<div class="nn-card" id="nn-tlist" style="max-width:850px;margin:0 auto 20px"></div>`);

			const self = this;
			this.$main.find("#nn-newtodo").on("click", () => this.add_todo());
			this.$main.find("#nn-tsearch").on("input", function () { s.todo_search = $(this).val(); self.render_todo_list(); });
			this.$main.find(".nn-td-tab").on("click", function () { s.todo_tab = $(this).attr("data-t"); self.render_todos(); });
			this.$main.find("#nn-td-owner").on("change", function () { s.todo_owner = $(this).val(); self.render_todo_list(); });
			this.$main.find("#nn-td-arch").on("click", function () { s.todo_archive = !s.todo_archive; $(this).toggleClass("on"); self.render_todo_list(); });
			this.$main.find("#nn-td-refresh").on("click", () => this.load_todos());
			this.render_todo_list();
		}

		render_todo_list() {
			const s = this.s, q = (s.todo_search || "").toLowerCase(), me = frappe.session.user;
			const items = this.todos.filter(t => {
				const open = (t.status || "Open") === "Open";
				const who = t.assignee || t.owner;
				if (s.todo_archive ? open : !open) return false;
				if (s.todo_tab === "Private" && who !== me) return false;
				if (s.todo_owner !== "All" && who !== s.todo_owner) return false;
				if (q && !String(t.description || "").replace(/<[^>]+>/g, "").toLowerCase().includes(q)) return false;
				return true;
			}).sort((a, b) => {
				const x = a.due ? new Date(a.due) : null, y = b.due ? new Date(b.due) : null;
				if (!x && !y) return 0; if (!x) return 1; if (!y) return -1;
				return s.todo_dir === "asc" ? x - y : y - x;
			});

			this.$main.find("#nn-tlist").html(`
				<div class="nn-card-h"><div class="nn-card-t">${s.todo_tab === "Team" ? __("Team To-Dos") : __("Private To-Dos")} <span class="nn-cnt">${items.length}</span></div></div>
				${this.todo_block(items)}
				<div class="nn-foot"><div class="nn-add nn-add-todo">+ ${__("Add To-Do")}</div><div class="nn-pg">${items.length ? `1 – ${items.length} of ${items.length}` : "0"}</div></div>`);

			const self = this, $l = this.$main.find("#nn-tlist");
			$l.find(".nn-add-todo").on("click", () => this.add_todo());
			$l.find(".nn-todo-chk").on("click", function () { self.toggle_todo($(this).attr("data-id")); });
			$l.find(".nn-todo-open").on("click", function () { frappe.set_route("Form", CFG.todo.doctype, $(this).attr("data-id")); });
			$l.find(".nn-sort").on("click", () => { s.todo_dir = s.todo_dir === "asc" ? "desc" : "asc"; self.render_todo_list(); });
		}

		todo_block(items) {
			if (!items.length) return `<div class="nn-empty">${__("No to-dos found.")}</div>`;
			const s = this.s;
			const hd = `<div class="nn-todo nn-todo-hd"><div></div><div>${__("Title")}</div><div></div>
				<div class="nn-sort" style="cursor:pointer">${__("Due By")} ${s.todo_dir === "asc" ? "↓" : "↑"}</div><div>${__("Owner")}</div><div></div></div>`;
			const rows = items.map(t => {
				const done = (t.status || "Open") === "Closed";
				const od = this.is_overdue(t.due) && !done;
				const td = this.is_today(t.due) && !done;
				const txt = String(t.description || "").replace(/<[^>]+>/g, "").trim();
				const who = this.uname(t.assignee || t.owner);
				return `<div class="nn-todo">
					<div><span class="nn-chk nn-todo-chk ${done ? "done" : ""}" data-id="${this.esc(t.name)}"></span></div>
					<div class="nn-todo-open" data-id="${this.esc(t.name)}" style="cursor:pointer;color:${done ? "#9ca3af" : "#111827"};${done ? "text-decoration:line-through" : ""}">${this.esc(txt)}</div>
					<div>${od ? `<span class="nn-dot">!</span>` : td ? `<span class="nn-clock"></span>` : ""}</div>
					<div class="${od ? "nn-red" : ""}" style="font-size:12px;color:${od ? "#dc2626" : "#6b7280"}">${this.fdate(t.due)}</div>
					<div>${this.av(who)}</div>
					<div class="nn-dots nn-todo-open" data-id="${this.esc(t.name)}">⋯</div></div>`;
			}).join("");
			return hd + rows;
		}

		add_todo() {
			frappe.prompt([
				{ fieldname: "description", label: __("Title"), fieldtype: "Small Text", reqd: 1 },
				{ fieldname: "date", label: __("Due By"), fieldtype: "Date", default: frappe.datetime.get_today() },
				{ fieldname: "allocated_to", label: __("Owner"), fieldtype: "Link", options: "User", default: frappe.session.user }
			], async v => {
				const res = await this.call("frappe.client.insert", {
					doc: Object.assign({ doctype: CFG.todo.doctype, status: "Open", priority: "Medium" },
						{ description: v.description, date: v.date, allocated_to: v.allocated_to })
				});
				if (res.ok) { frappe.show_alert({ message: __("To-Do created"), indicator: "green" }); this.load_todos(); }
				else frappe.msgprint({ title: __("Could not create to-do"), message: this.esc(res.error), indicator: "red" });
			}, __("New To-Do"), __("Create"));
		}

		async toggle_todo(id) {
			const t = this.todos.find(x => x.name === id);
			if (!t) return;
			const prev = t.status || "Open";
			t.status = prev === "Closed" ? "Open" : "Closed";
			this.render_todo_list();
			const res = await this.call("frappe.client.set_value", { doctype: CFG.todo.doctype, name: id, fieldname: "status", value: t.status });
			if (!res.ok) {
				t.status = prev;
				frappe.show_alert({ message: __("Could not update to-do"), indicator: "red" });
				this.render_todo_list();
			}
		}
	}

	window.EOSNinety = EOSNinety;
})();