/*
 * Put this file at:
 *   apps/eos_core/eos_core/eos_core/page/scorecard_grid/scorecard_grid.js
 * (the page already exists, so no JSON changes are needed).
 * Then: bench build, and hard refresh (Ctrl/Cmd+Shift+R).
 *
 * One page, left sidebar with 3 views: Scorecard, Rocks, To-Dos.
 * Everything is in an IIFE and every CSS class is prefixed "nn-".
 */
(function () {
	"use strict";

	/* ---------- CONFIG: change these to match your app ---------- */
	const CFG = {
		api: { create_issue: "eos_core.eos_core.doctype.issue.issue.create_issue_from_metric" },

		base_timeframe: "Weekly",
		scorecard: { doctype: "Scorecard", team: "team", timeframe: "timeframe", archived: "archived" },
		group: { doctype: "Measurable Group", scorecard: "scorecard", name: "group_name", order: "order", archived: "archived" },

		/* EOS Metric: field names are AUTO-DETECTED from the doctype.
		   Only set a value here if auto-detect picks the wrong field. */
		measurable: {
			doctype: "EOS Metric",
			title: null, goal: null, goal_op: null, unit: null, owner: null,
			scorecard: null, group: null, archived: null
		},

		/* Scorecard Entry (from your screenshot) */
		entry: { doctype: "Scorecard Entry", measurable: "metric", date: "week_start_date", value: "actual_value", manual: "is_manual" },

		/* Rock: auto-detected too. Override only if needed. */
		rock: { doctype: "Rock", title: null, status: null, owner: null, due: null, company: null, table: null },

		/* To Do (from your screenshot) */
		todo: {
			doctype: "To Do", title: "todo_name", status: "status", owner: "owner_user", team: "team",
			rock: "rock", due: "due_date", priority: "priority", archived: "archived"
		}
	};

	const TIMEFRAMES = [["Week", "Weekly"], ["Month", "Monthly"], ["Quarter", "Quarterly"], ["Year", "Annual"]];
	const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
	const NAV = [
		["scorecard", "Scorecard", "chart"],
		["rocks", "Rocks", "mountain"],
		["todos", "To-Dos", "check"]
	];

	const IC = {
		"chevron-down": '<path d="m6 9 6 6 6-6"/>',
		"chevron-up": '<path d="m18 15-6-6-6 6"/>',
		"chevron-right": '<path d="m9 18 6-6-6-6"/>',
		"alert": '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
		"trend": '<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
		"help": '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
		"thumb": '<path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/>',
		"clock": '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
		"search": '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
		"refresh": '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
		"users": '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
		"chart": '<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="m19 9-5 5-4-4-3 3"/>',
		"mountain": '<path d="m8 3 4 8 5-5 5 15H2L8 3z"/>',
		"check": '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="m9 12 2 2 4-4"/>',
		"sliders": '<line x1="21" x2="14" y1="4" y2="4"/><line x1="10" x2="3" y1="4" y2="4"/><line x1="21" x2="12" y1="12" y2="12"/><line x1="8" x2="3" y1="12" y2="12"/><line x1="21" x2="16" y1="20" y2="20"/><line x1="12" x2="3" y1="20" y2="20"/><line x1="14" x2="14" y1="2" y2="6"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="16" x2="16" y1="18" y2="22"/>',
		"plus": '<path d="M5 12h14"/><path d="M12 5v14"/>'
	};
	const ic = (n, s) => `<svg class="nn-svg" width="${s || 16}" height="${s || 16}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${IC[n] || ""}</svg>`;

	class EOSNinety {
		constructor(wrapper) {
			this.wrapper = wrapper;
			this.page = frappe.ui.make_app_page({ parent: wrapper, title: __("EOS"), single_column: true });
			$(wrapper).find(".page-head").hide();

			this.s = {
				view: "scorecard",
				timeframe: "Week", range: 13, team: "All Teams", search: "", attention: false,
				sc_owner: true, sc_goal: true, sc_avg: true, sc_total: true,
				todo_tab: "Team", todo_archive: false, todo_owner: "All", todo_team: "All Teams", todo_search: "",
				rock_view: "List", rock_owner: "All", rock_status: "All", rock_team: "All", rock_search: "", sc_collapsed: false, banner_off: false
			};
			this.data = { periods: [], metrics: [] };
			this.rocks = [];
			this.todos = [];
			this.open_rocks = {};

			this.css();
			this.shell();
			this.go(this.s.view);
		}

		/* ================= helpers ================= */
		esc(v) { return frappe.utils.escape_html(v == null ? "" : String(v)); }
		ini(n) { return (n || "?").split(/\s+/).slice(0, 2).map(w => w[0] || "").join("").toUpperCase(); }
		av(n) { return `<span class="nn-av" title="${this.esc(n)}">${this.esc(this.ini(n))}</span>`; }
		fdate(d) {
			if (!d) return "";
			const x = new Date(d);
			return isNaN(x) ? this.esc(d) : `${x.getDate()} ${MONTHS[x.getMonth()]}`;
		}
		is_overdue(d) { return d && new Date(d) < new Date(new Date().toDateString()); }
		is_today(d) { return d && new Date(d).toDateString() === new Date().toDateString(); }

		/* frappe.xcall rejects on server errors; this never throws */
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

		/* ================= shell ================= */
		css() {
			$("#nn-css, #nn-css-v2").remove();
			$("head").append(`<style id="nn-css-v2">
			.nn{display:flex;min-height:100vh;background:#fff;color:#1f2a37;font-size:13px;
				font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
			.nn *{box-sizing:border-box}
			.nn-svg{flex-shrink:0;vertical-align:middle}
			.nn button{font-family:inherit}
			/* sidebar */
			.nn-side{width:218px;flex-shrink:0;background:#f7f8f7;border-right:1px solid #e8eaec;padding:14px 10px;display:flex;flex-direction:column}
			.nn-co{display:flex;align-items:center;gap:9px;padding:6px 8px 16px;font-weight:600;color:#111827;font-size:13px;line-height:1.25}
			.nn-logo{width:26px;height:26px;border-radius:7px;background:#14532d;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0}
			.nn-nav{display:flex;align-items:center;gap:11px;padding:9px 10px;border-radius:8px;cursor:pointer;color:#374151;margin-bottom:2px;font-size:13px}
			.nn-nav:hover{background:#eceeed}
			.nn-nav.on{background:#e8ebe9;color:#111827;font-weight:600}
			.nn-sfoot{margin-top:auto;border-top:1px solid #e5e7eb;padding:12px 8px 0;display:flex;align-items:center;gap:9px;color:#374151}
			/* page */
			.nn-main{flex:1;min-width:0}
			.nn-top{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:22px 28px 0}
			.nn-title{font-size:22px;font-weight:700;color:#0f172a;line-height:1.2}
			.nn-sub{font-size:12.5px;color:#6b7280;margin-top:3px}
			.nn-tabs{display:flex;gap:24px;padding:0 28px;margin-top:16px}
			.nn-tab{padding:10px 0;cursor:pointer;color:#6b7280;border-bottom:2px solid transparent;font-weight:500;display:flex;align-items:center;gap:6px}
			.nn-tab:hover{color:#14532d}
			.nn-tab.on{color:#14532d;border-bottom-color:#14532d;font-weight:600}
			.nn-bar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:11px 28px;border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb}
			.nn-sp{flex:1}
			.nn-body{padding:20px 28px 48px}
			.nn-narrow{max-width:880px;margin:0 auto}
			/* controls */
			.nn-pill{display:inline-flex;align-items:center;gap:6px;border:1px solid #d9dde1;background:#fff;border-radius:999px;padding:0 12px;height:32px;font-size:12px;color:#1f2a37;cursor:pointer;white-space:nowrap}
			.nn-pill:hover{background:#f6f7f8}
			.nn-pill .k{color:#6b7280}
			.nn-ibtn{display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border:1px solid #d9dde1;border-radius:8px;background:#fff;color:#4b5563;cursor:pointer}
			.nn-ibtn:hover{background:#f6f7f8}
			.nn-btn{display:inline-flex;align-items:center;gap:6px;border:1px solid #d9dde1;background:#fff;color:#1f2a37;border-radius:8px;padding:0 12px;height:32px;cursor:pointer;font-size:12px;font-weight:500;white-space:nowrap}
			.nn-btn:hover{background:#f6f7f8}
			.nn-btn.pri{background:#14532d;border-color:#14532d;color:#fff}
			.nn-btn.pri:hover{background:#0f4424}
			.nn-btn.round{border-radius:999px;height:36px;padding:0 16px}
			.nn-search{position:relative;display:inline-flex;align-items:center}
			.nn-search .nn-svg{position:absolute;left:10px;color:#9ca3af}
			.nn-search input{border:1px solid #d9dde1;border-radius:8px;height:32px;padding:0 10px 0 32px;font-size:12px;width:230px;outline:none;background:#fff;box-shadow:none}
			.nn-search input:focus{border-color:#14532d}
			.nn-link{background:none;border:0;color:#6b7280;cursor:pointer;margin-right:14px;font-size:12px}
			.nn-switch-l{display:inline-flex;align-items:center;gap:8px;margin:0;color:#374151;font-size:12px}
			.nn-sw{width:36px;height:20px;background:#d1d5db;border-radius:20px;position:relative;cursor:pointer;flex-shrink:0;display:inline-block}
			.nn-sw.on{background:#14532d}
			.nn-sw:after{content:"";position:absolute;top:3px;left:3px;width:14px;height:14px;border-radius:50%;background:#fff;transition:.15s}
			.nn-sw.on:after{left:19px}
			.nn-menu{position:fixed;background:#fff;border:1px solid #e5e7eb;border-radius:10px;box-shadow:0 10px 28px rgba(16,24,40,.14);z-index:1050;padding:8px;min-width:200px}
			.nn-mi{padding:8px 12px;border-radius:6px;cursor:pointer;font-size:12.5px}
			.nn-mi:hover{background:#f3f4f6}
			.nn-mi.on{font-weight:600;color:#14532d}
			.nn-row{display:flex;justify-content:space-between;align-items:center;padding:8px 6px;gap:14px}
			.nn-banner{display:flex;align-items:center;justify-content:space-between;gap:12px;background:#eef2ef;border:1px solid #e2e8e4;border-radius:8px;padding:14px 18px;margin-bottom:18px;font-weight:600}
			.nn-warn{background:#fff7ed;border-color:#fed7aa;color:#9a3412;font-weight:500;display:block}
			.nn-empty{text-align:center;padding:44px;color:#6b7280}
			/* cards */
			.nn-card{border:1px solid #e8eaec;border-radius:10px;background:#fff;margin-bottom:18px;box-shadow:0 1px 2px rgba(16,24,40,.04);overflow:hidden}
			.nn-card-h{display:flex;justify-content:space-between;align-items:center;padding:16px 20px;gap:12px}
			.nn-card-t{font-size:18px;font-weight:700;color:#0f172a;display:flex;align-items:center;gap:10px}
			.nn-card-r{display:flex;align-items:center;gap:8px}
			.nn-cnt{background:#f1f3f4;border-radius:5px;padding:1px 8px;font-size:14px;font-weight:600;color:#374151}
			.nn-ico-c{width:34px;height:34px;border-radius:50%;background:#f1f3f4;color:#6b7280;display:flex;align-items:center;justify-content:center}
			.nn-av{display:inline-flex;width:24px;height:24px;border-radius:50%;background:#9ca3af;color:#fff;font-size:9px;align-items:center;justify-content:center;font-weight:600}
			.nn-av.lg{width:34px;height:34px;font-size:12px}
			/* scorecard table */
			.nn-scroll{overflow:auto}
			.nn-tbl{width:100%;border-collapse:collapse;margin:0}
			.nn-tbl th{font-size:11.5px;font-weight:500;color:#6b7280;text-align:center;padding:7px 10px;border:1px solid #eceff1;background:#fff;white-space:nowrap;vertical-align:middle}
			.nn-tbl th.l,.nn-tbl td.l{text-align:left}
			.nn-tbl th.cur{color:#111827;font-weight:600}
			.nn-tbl td{border:1px solid #eceff1;padding:0 10px;height:31px;font-size:12px;text-align:center;white-space:nowrap}
			.nn-tbl td.r{text-align:right;padding-right:14px}
			.nn-tbl tr:hover td{background:#fafbfa}
			.nn-tbl td.t{text-align:left;min-width:260px;color:#111827}
			.nn-tbl td.c{padding:0;min-width:104px}
			.nn-tbl td.ok{background:#eaf5ee;color:#1f6f43}
			.nn-tbl td.bad{background:#fde8e8;color:#c0392b}
			.nn-in{width:100%;height:30px;border:0;background:transparent;text-align:center;color:inherit;font-size:12px;outline:none;box-shadow:none;padding:0 4px}
			.nn-in:focus{background:#fff;box-shadow:inset 0 0 0 2px #14532d}
			.nn-warn-i{color:#f08c45}.nn-good{color:#2f9e5f}.nn-nod{color:#6b7280}
			.nn-mini{border:1px solid #d9dde1;background:#fff;border-radius:6px;padding:3px 8px;font-size:10.5px;cursor:pointer}
			/* rocks */
			.nn-rock,.nn-ms{display:grid;grid-template-columns:20px 100px minmax(0,1fr) 230px 44px 66px 24px;gap:10px;align-items:center;padding:0 16px;min-height:44px;border-top:1px solid #f0f2f3}
			.nn-rock.noown{grid-template-columns:20px 100px minmax(0,1fr) 230px 66px 24px}
			.nn-rock:not(.hd){cursor:pointer}
			.nn-rock:not(.hd):hover{background:#fafbfa}
			.nn-rock.hd{min-height:30px;font-size:11.5px;color:#6b7280;border-top:0}
			.nn-ms{grid-template-columns:20px 24px minmax(0,1fr) 230px 44px 66px 24px;background:#fbfcfb}
			.nn-ms.noown{grid-template-columns:20px 24px minmax(0,1fr) 230px 66px 24px}
			.nn-rt a{color:#111827;cursor:pointer;text-decoration:none}
			.nn-badge{display:inline-flex;align-items:center;gap:5px;border-radius:6px;padding:3px 8px;font-size:11.5px;font-weight:500;background:#e7f0fb;color:#2563a8;border:1px solid #d5e5f7}
			.nn-badge.off{background:#fdeceb;color:#c0392b;border-color:#f8d4d1}
			.nn-badge.done{background:#e6f5ec;color:#1f6f43;border-color:#cdebd8}
			.nn-prog{display:flex;align-items:center;gap:8px;justify-content:flex-end;font-size:11px;color:#6b7280}
			.nn-bar2{height:6px;width:70px;background:#e5e7eb;border-radius:6px;overflow:hidden;flex-shrink:0}
			.nn-bar2>div{height:100%;background:#14532d}
			.nn-chip{border:1px solid #d9dde1;border-radius:5px;padding:1px 7px;font-size:11px;color:#4b5563;background:#fff;white-space:nowrap}
			.nn-chk{width:18px;height:18px;border:1.5px solid #b7bdc4;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;background:#fff;color:#fff}
			.nn-chk.done{background:#14532d;border-color:#14532d}
			.nn-chk:hover{border-color:#14532d}
			.nn-dots{color:#9ca3af;text-align:center;letter-spacing:1px}
			.nn-due{font-size:12px;color:#374151;text-align:right}
			.nn-add{padding:12px 20px;color:#14532d;cursor:pointer;font-weight:500;font-size:12.5px}
			.nn-board{display:flex;gap:14px;overflow:auto;padding-bottom:8px}
			.nn-col{min-width:250px;flex:1;background:#f7f8f7;border-radius:10px;padding:12px}
			.nn-col-t{font-weight:600;margin-bottom:10px;display:flex;justify-content:space-between}
			.nn-kcard{background:#fff;border:1px solid #e8eaec;border-radius:8px;padding:10px 12px;margin-bottom:8px;cursor:pointer}
			/* todos */
			.nn-todo{display:grid;grid-template-columns:28px minmax(0,1fr) 24px 70px 50px 24px;gap:10px;align-items:center;padding:0 20px;min-height:42px;border-top:1px solid #f0f2f3}
			.nn-todo:not(.hd):hover{background:#fafbfa}
			.nn-todo.hd{min-height:30px;font-size:11.5px;color:#6b7280;border-top:0}
			.nn-red{color:#dc2626}
			.nn-flag{width:18px;height:18px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:700}
			.nn-flag.red{background:#dc2626}.nn-flag.dark{background:#111827}
			.nn-foot{display:flex;justify-content:space-between;align-items:center;padding:6px 20px;border-top:1px solid #f0f2f3;font-size:11.5px;color:#6b7280}
			@media(max-width:900px){.nn-side{display:none}}
			</style>`);
		}

		shell() {
			const co = (frappe.boot.sysdefaults && frappe.boot.sysdefaults.company) || "EOS";
			const items = NAV.map(([k, l, i]) => `<div class="nn-nav" data-view="${k}">${ic(i, 17)}<span>${__(l)}</span></div>`).join("");
			this.$root = $(`<div class="nn">
				<div class="nn-side">
					<div class="nn-co"><span class="nn-logo">${this.esc(co.charAt(0).toUpperCase())}</span><span>${this.esc(co)}</span></div>
					${items}
					<div class="nn-sfoot">${this.av(frappe.session.user_fullname)}<span>${this.esc(frappe.session.user_fullname || frappe.session.user)}</span></div>
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
		get tf() { return this.s.timeframe === "Trends" ? "Week" : this.s.timeframe; }

		go(view) {
			this.close_menu();
			this.s.view = view;
			this.$root.find(".nn-nav").removeClass("on").filter(`[data-view="${view}"]`).addClass("on");
			if (view === "scorecard") this.load_scorecard();
			else if (view === "rocks") this.load_rocks();
			else this.load_todos();
		}

		close_menu() { $(".nn-menu").remove(); }
		place_menu($m, anchor, left_align) {
			this.close_menu();
			$("body").append($m);
			const r = anchor.getBoundingClientRect();
			const w = $m.outerWidth();
			const left = left_align ? r.left : r.right - w;
			$m.css({ top: r.bottom + 6, left: Math.max(8, Math.min(left, window.innerWidth - w - 8)) });
		}
		pick_menu(anchor, options, current, cb) {
			const $m = $(`<div class="nn-menu" style="min-width:170px"></div>`);
			options.forEach(o => {
				const [val, label] = Array.isArray(o) ? o : [o, o];
				$(`<div class="nn-mi ${val === current ? "on" : ""}">${this.esc(label)}</div>`)
					.on("click", () => { this.close_menu(); cb(val); }).appendTo($m);
			});
			this.place_menu($m, anchor, true);
		}
		pill(id, k, v) {
			return `<button class="nn-pill" id="${id}" data-menu><span class="k">${k}:</span> ${this.esc(v)} ${ic("chevron-down", 14)}</button>`;
		}
		top(title, sub, create_label) {
			return `<div class="nn-top"><div><div class="nn-title">${title}</div><div class="nn-sub">${sub}</div></div>
				<div><button class="nn-btn pri" id="nn-create" style="height:34px;padding:0 18px">${create_label}</button></div></div>`;
		}
		search_box(id, ph, val) {
			return `<div class="nn-search">${ic("search", 14)}<input id="${id}" placeholder="${ph}" value="${this.esc(val)}"></div>`;
		}



		/* ================= SCORECARD (real data from the Scorecard doctype) ================= */
		make_periods(tf, n) {
			const f = d => d.getDate() + " " + MONTHS[d.getMonth()];
			const t = new Date();
			t.setHours(0, 0, 0, 0);
			const out = [];
			for (let i = 0; i < n; i++) {
				let a, b, label;
				if (tf === "Week") {
					a = new Date(t); a.setDate(t.getDate() - ((t.getDay() + 6) % 7) - 7 * i);
					b = new Date(a); b.setDate(a.getDate() + 6);
					label = `${f(a)} - ${f(b)}`;
				} else if (tf === "Month") {
					a = new Date(t.getFullYear(), t.getMonth() - i, 1);
					b = new Date(a.getFullYear(), a.getMonth() + 1, 0);
					label = `${MONTHS[a.getMonth()]} ${a.getFullYear()}`;
				} else if (tf === "Quarter") {
					const q = Math.floor(t.getMonth() / 3) - i;
					a = new Date(t.getFullYear(), q * 3, 1);
					b = new Date(a.getFullYear(), a.getMonth() + 3, 0);
					label = `Q${Math.floor(a.getMonth() / 3) + 1} ${a.getFullYear()}`;
				} else {
					a = new Date(t.getFullYear() - i, 0, 1);
					b = new Date(a.getFullYear(), 11, 31);
					label = String(a.getFullYear());
				}
				out.push({
					key: frappe.datetime.obj_to_str(a), end: frappe.datetime.obj_to_str(b),
					label: i ? label : "Current " + tf, sub: i ? "" : label, current: i === 0, year: a.getFullYear()
				});
			}
			return out;
		}

		period_key(date_str, tf) {
			const d = frappe.datetime.str_to_obj(date_str);
			if (!d || isNaN(d)) return null;
			let a;
			if (tf === "Week") { a = new Date(d); a.setDate(d.getDate() - ((d.getDay() + 6) % 7)); }
			else if (tf === "Month") a = new Date(d.getFullYear(), d.getMonth(), 1);
			else if (tf === "Quarter") a = new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1);
			else a = new Date(d.getFullYear(), 0, 1);
			return frappe.datetime.obj_to_str(a);
		}

		owner_name(o) {
			if (!o) return "";
			return /@/.test(o) ? (frappe.user.full_name(o) || o) : o;
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
			const r = { ">": n > g, "<": n < g, "<=": n <= g, "=": n === g, "==": n === g }[m.goal_op];
			return r === undefined ? n >= g : r;
		}
		nums(m) { return (m.values || []).filter(v => v != null && v !== "" && !isNaN(Number(v))).map(Number); }
		health(m) {
			const r = (m.values || []).slice(0, 3).filter(v => v != null && v !== "");
			return !r.length ? "nod" : this.meets(m, r[0]) ? "good" : "off";
		}

		async ensure_meta(dt) {
			try {
				if (!frappe.get_meta(dt)) await new Promise(r => frappe.model.with_doctype(dt, r));
				return frappe.get_meta(dt) || null;
			} catch (e) { return null; }
		}
		pick(meta, list) { return list.find(f => (meta.fields || []).some(x => x.fieldname === f)); }
		link_to(meta, dt) { const f = (meta.fields || []).find(x => x.fieldtype === "Link" && x.options === dt); return f && f.fieldname; }
		must(res, label) { if (!res.ok) throw new Error(`${label}: ${res.error}`); return res.data || []; }

		norm_op(v) {
			const t = String(v || "").toLowerCase();
			if (["<=", ">=", "<", ">", "=", "=="].includes(t.trim())) return t.trim();
			if (/≥|at least|greater.*equal|more.*equal|min/.test(t)) return ">=";
			if (/≤|at most|less.*equal|max/.test(t)) return "<=";
			if (/greater|more|above|over/.test(t)) return ">";
			if (/less|below|under/.test(t)) return "<";
			if (/equal|exact/.test(t)) return "=";
			return ">=";
		}
		norm_unit(v) {
			const t = String(v || "").toLowerCase();
			if (/\$|currency|usd|amount|money/.test(t)) return "$";
			if (/%|percent/.test(t)) return "%";
			return "";
		}

		async metric_spec() {
			const M = CFG.measurable;
			const meta = await this.ensure_meta(M.doctype);
			if (!meta) throw new Error(`Doctype "${M.doctype}" not found`);
			const pk = l => this.pick(meta, l);
			const sp = {
				title: M.title || pk(["metric_name", "measurable", "title", "metric", "measurable_name", "name1"]) || meta.title_field || "name",
				goal: M.goal || pk(["goal", "target", "goal_value", "target_value"]),
				goal_op: M.goal_op || pk(["goal_operator", "goal_op", "operator", "comparison", "goal_type"]),
				unit: M.unit || pk(["unit", "unit_type", "measure_unit", "value_type", "format"]),
				owner: M.owner || pk(["owner_user", "metric_owner", "assigned_to", "responsible"]) || "owner",
				scorecard: M.scorecard || this.link_to(meta, "Scorecard"),
				group: M.group || this.link_to(meta, CFG.group.doctype),
				archived: M.archived || pk(["archived"])
			};
			console.log("EOS Metric field mapping:", sp);
			return sp;
		}

		async load_scorecard() {
			this.$main.html(`<div class="nn-empty">${__("Loading scorecard…")}</div>`);
			this.sc_error = null;
			this.sc_note = null;
			this.data = { periods: this.make_periods(this.tf, this.s.range), metrics: [] };
			try { await this.load_scorecard_data(); }
			catch (e) { console.error(e); this.sc_error = e.message || String(e); }
			this.render_scorecard();
		}

		async load_scorecard_data() {
			const s = this.s, C = CFG, P = this.data.periods;
			const sp = await this.metric_spec();

			/* 1. Scorecards (weekly ones are the base; other timeframes roll up from them) */
			const sf = {};
			sf[C.scorecard.timeframe] = C.base_timeframe;
			sf[C.scorecard.archived] = 0;
			const sc = this.must(await this.list(C.scorecard.doctype, ["name", C.scorecard.team + " as team"], sf), C.scorecard.doctype);
			this.teams = ["All Teams"].concat([...new Set(sc.map(x => x.team).filter(Boolean))]);
			const team_of = {};
			sc.forEach(x => (team_of[x.name] = x.team));
			const names = sc.filter(x => s.team === "All Teams" || x.team === s.team).map(x => x.name);
			if (!names.length) { this.sc_note = __("No weekly Scorecard found for this team."); return; }

			/* 2. Measurable Groups (optional) */
			const G = C.group, gmap = {};
			const gf = {}; gf[G.scorecard] = ["in", names]; gf[G.archived] = 0;
			const gbase = ["name", G.name + " as group_name", G.scorecard + " as scorecard"];
			/* "order" is a SQL reserved word, so try it quoted and fall back to no ordering */
			let gr = await this.list(G.doctype, gbase.concat(["`" + G.order + "` as ord"]), gf, "modified asc", 500);
			if (!gr.ok) gr = await this.list(G.doctype, gbase, gf, "modified asc", 500);
			(gr.ok ? gr.data : []).forEach(g => (gmap[g.name] = g));

			/* 3. Metrics */
			const mf = {};
			if (sp.scorecard) mf[sp.scorecard] = ["in", names];
			else if (sp.group) mf[sp.group] = ["in", Object.keys(gmap).length ? Object.keys(gmap) : ["__none__"]];
			if (sp.archived) mf[sp.archived] = 0;

			const fields = ["name", sp.title + " as title", sp.owner + " as owner_user"];
			if (sp.goal) fields.push(sp.goal + " as goal");
			if (sp.goal_op) fields.push(sp.goal_op + " as goal_op");
			if (sp.unit) fields.push(sp.unit + " as unit");
			if (sp.scorecard) fields.push(sp.scorecard + " as scorecard");
			if (sp.group) fields.push(sp.group + " as grp");
			const ms = this.must(await this.list(C.measurable.doctype, fields, mf, "creation asc", 1000), C.measurable.doctype);

			const metrics = ms.map(m => {
				const g = gmap[m.grp];
				return {
					id: m.name, title: m.title, owner: this.owner_name(m.owner_user),
					team: team_of[m.scorecard] || (g && team_of[g.scorecard]) || "",
					group: g ? g.group_name : "", gord: g ? Number(g.ord) || 0 : 9999,
					goal_op: this.norm_op(m.goal_op), goal: m.goal, unit: this.norm_unit(m.unit),
					values: Array(P.length).fill(null), entries: {}
				};
			});
			metrics.sort((a, b) => a.gord - b.gord);
			this.data.metrics = metrics;
			if (!metrics.length) { this.sc_note = __("No metrics are linked to this scorecard."); return; }

			/* 4. Entries */
			const E = C.entry;
			const ef = {}; ef[E.measurable] = ["in", metrics.map(m => m.id)];
			ef[E.date] = ["between", [P[P.length - 1].key, P[0].end]];
			const es = this.must(await this.list(E.doctype, ["name", E.measurable + " as metric", E.date + " as date", E.value + " as value"], ef, "creation asc", 20000), E.doctype);

			const idx = {}, by_id = {};
			P.forEach((p, i) => (idx[p.key] = i));
			metrics.forEach(m => (by_id[m.id] = m));
			es.forEach(e => {
				const m = by_id[e.metric], k = this.period_key(e.date, this.tf), i = idx[k];
				if (!m || i === undefined || e.value == null || e.value === "") return;
				const v = Number(e.value);
				if (this.tf === "Week") { m.values[i] = v; m.entries[k] = e.name; }
				else m.values[i] = (m.values[i] || 0) + v;
			});
		}


		render_scorecard() {
			const s = this.s, tf = this.tf, trends = s.timeframe === "Trends";
			const teams = this.teams || ["All Teams"];
			const unit = { Week: "Weeks", Month: "Months", Quarter: "Quarters", Year: "Years" }[tf];
			const label = (TIMEFRAMES.find(t => t[0] === tf) || [])[1];
			const need = this.data.metrics.some(m => this.health(m) !== "good");
			const tabs = [["Trends", __("Trends")]].concat(TIMEFRAMES.map(([k, l]) => [k, __(l)]));

			this.$main.html(`
				${this.top(__("Scorecard"), __("Record and evaluate key metrics, streamlined for strategic success."), __("Create"))}
				<div class="nn-tabs">${tabs.map(([k, l]) => `<div class="nn-tab nn-tf ${s.timeframe === k ? "on" : ""}" data-tf="${k}">${l}</div>`).join("")}</div>
				<div class="nn-bar">
					${this.pill("nn-team", __("Team"), s.team)}
					${this.pill("nn-view", __("View by"), tf)}
					${this.pill("nn-range", __("Date Range"), `${__("Last")} ${s.range} ${unit}`)}
					<span class="nn-ibtn" id="nn-cols" data-menu title="${__("Columns")}">${ic("sliders", 15)}</span>
					<div class="nn-sp"></div>
					<button class="nn-btn" id="nn-manager">${__("Go to Measurable Manager")}</button>
					${this.search_box("nn-search", __("Search Measurables…"), s.search)}
				</div>
				<div class="nn-body">
					${this.sc_error ? `<div class="nn-banner nn-warn">⚠ ${__("Could not load data.")}<br>${this.esc(this.sc_error)}</div>` : ""}
					${this.sc_note ? `<div class="nn-banner">${this.esc(this.sc_note)}</div>` : ""}
					${need && !this.sc_error && !s.banner_off && !trends ? `<div class="nn-banner"><span>${__("See what needs your team's attention")}</span><span>
						<button class="nn-link" id="nn-notnow">${__("Not now")}</button>
						<button class="nn-btn pri round" id="nn-attn">${s.attention ? __("Show all") : __("Find what needs attention")}</button></span></div>` : ""}
					<div class="nn-card">
						<div class="nn-card-h"><div class="nn-card-t">${trends ? __("Trends") : label + " KPIs"} <span class="nn-cnt" id="nn-count">${this.data.metrics.length}</span></div>
							<div class="nn-card-r">
								<button class="nn-btn" id="nn-newm" data-menu>${__("New Measurable")} ${ic("chevron-down", 14)}</button>
								<span class="nn-ibtn" id="nn-collapse" style="border:0">${ic(s.sc_collapsed ? "chevron-down" : "chevron-up", 16)}</span>
							</div></div>
						<div class="nn-scroll" id="nn-grid" style="${s.sc_collapsed ? "display:none" : ""}"></div>
					</div>
				</div>`);

			const self = this, $m = this.$main;
			$m.find(".nn-tf").on("click", function () { s.timeframe = $(this).attr("data-tf"); self.load_scorecard(); });
			$m.find("#nn-team").on("click", function (e) { e.stopPropagation(); self.pick_menu(this, teams, s.team, v => { s.team = v; self.load_scorecard(); }); });
			$m.find("#nn-view").on("click", function (e) { e.stopPropagation(); self.pick_menu(this, TIMEFRAMES.map(t => [t[0], t[0]]), tf, v => { s.timeframe = v; self.load_scorecard(); }); });
			$m.find("#nn-range").on("click", function (e) {
				e.stopPropagation();
				self.pick_menu(this, [4, 8, 13, 26].map(n => [n, `${__("Last")} ${n} ${unit}`]), s.range, v => { s.range = v; self.load_scorecard(); });
			});
			$m.find("#nn-cols").on("click", function (e) { e.stopPropagation(); self.cols_menu(this); });
			$m.find("#nn-manager").on("click", () => frappe.set_route("List", CFG.measurable.doctype));
			$m.find("#nn-search").on("input", function () { s.search = $(this).val(); self.render_grid(); });
			$m.find("#nn-notnow").on("click", () => { s.banner_off = true; this.render_scorecard(); });
			$m.find("#nn-attn").on("click", () => { s.attention = !s.attention; this.render_scorecard(); });
			$m.find("#nn-create").on("click", () => frappe.new_doc(CFG.measurable.doctype));
			$m.find("#nn-collapse").on("click", () => { s.sc_collapsed = !s.sc_collapsed; this.render_scorecard(); });
			$m.find("#nn-newm").on("click", function (e) {
				e.stopPropagation();
				self.pick_menu(this, [["m", __("New Measurable")], ["g", __("New Group")]], null,
					v => frappe.new_doc(v === "m" ? CFG.measurable.doctype : CFG.group.doctype));
			});
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

		render_trends() {
			const rows = this.data.metrics.map(m => {
				const recent = (m.values || []).slice(0, 3).map(v => (v == null || v === "" ? null : v)).filter(v => v !== null);
				const off = recent.filter(v => !this.meets(m, v)).length;
				return { m, off, n: recent.length, last: recent[0] };
			}).filter(r => r.off > 0).sort((a, b) => b.off - a.off);

			this.$main.find("#nn-count").text(rows.length);
			this.$main.find("#nn-grid").html(`<table class="nn-tbl"><thead><tr>
				<th class="l">${__("Measurable")}</th><th>${__("Owner")}</th><th>${__("Goal")}</th><th>${__("Last value")}</th><th>${__("Off-track (last 3 weeks)")}</th></tr></thead>
				<tbody>${rows.map(r => `<tr><td class="t">${this.esc(r.m.title)}</td><td>${this.av(r.m.owner)}</td>
					<td>${r.m.goal == null || r.m.goal === "" ? "" : this.esc(r.m.goal_op) + " " + this.fmt(r.m, r.m.goal)}</td>
					<td class="bad">${this.fmt(r.m, r.last)}</td><td><strong>${r.off}</strong> / ${r.n}</td></tr>`).join("") ||
				`<tr><td colspan="5"><div class="nn-empty">${__("Nothing is trending off track.")}</div></td></tr>`}</tbody></table>`);
		}

		render_grid() {
			if (this.s.timeframe === "Trends") return this.render_trends();
			const s = this.s, week = this.tf === "Week";
			const periods = this.data.periods;
			const q = (s.search || "").toLowerCase();
			const metrics = this.data.metrics.filter(m =>
				(!q || (m.title || "").toLowerCase().includes(q)) && (!s.attention || this.health(m) !== "good"));
			this.$main.find("#nn-count").text(metrics.length);

			const year = periods.length ? periods[0].year : "";
			const fixed = 3 + (+s.sc_owner) + (+s.sc_goal) + (+s.sc_avg) + (+s.sc_total);
			const head = `<thead>
				<tr><th colspan="${fixed}" style="border:0"></th>
					<th colspan="${periods.length + 1}" class="l" style="border:0;border-left:1px solid #eceff1;color:#9ca3af">${this.esc(year)}</th></tr>
				<tr><th style="width:34px"><input type="checkbox"></th><th style="width:56px;line-height:1.2">${__("View")}<br>${__("Trend")}</th><th class="l">${__("Title")}</th>
					${s.sc_owner ? `<th>${__("Owner")}</th>` : ""}${s.sc_goal ? `<th>${__("Goal")}</th>` : ""}
					${s.sc_avg ? `<th>${__("Average")}</th>` : ""}${s.sc_total ? `<th>${__("Total")}</th>` : ""}
					${periods.map(p => `<th class="${p.current ? "cur" : ""}">${p.current ? "<span style='color:#14b8a6'>●</span> " : ""}${this.esc(p.label)}${p.sub ? `<div style="font-weight:400;color:#9ca3af">${this.esc(p.sub)}</div>` : ""}</th>`).join("")}
					<th>${__("Action")}</th></tr></thead>`;

			const cur = (periods.find(p => p.current) || {}).key || "";
			const has_groups = metrics.some(m => m.group);
			let last = null;
			const rows = metrics.map(m => {
				const i = this.data.metrics.indexOf(m);
				const n = this.nums(m);
				const tot = n.length ? n.reduce((a, b) => a + b, 0) : null;
				const avg = n.length ? tot / n.length : null;
				const h = this.health(m);
				const icon = { good: `<span class="nn-good">${ic("trend", 16)}</span>`, off: `<span class="nn-warn-i">${ic("alert", 16)}</span>`, nod: `<span class="nn-nod">${ic("help", 16)}</span>` }[h];
				const cells = periods.map((p, pi) => {
					const v = m.values[pi];
					const ok = this.meets(m, v);
					const cls = ok === null ? "c" : ok ? "c ok" : "c bad";
					return `<td class="${cls}">${week
						? `<input class="nn-in" data-i="${i}" data-p="${pi}" value="${this.esc(v == null ? "" : v)}" title="${this.esc(this.fmt(m, v))}">`
						: this.fmt(m, v)}</td>`;
				}).join("");
				let gh = "";
				if (has_groups && m.group !== last) {
					last = m.group;
					gh = `<tr><td colspan="${fixed + periods.length + 1}" class="l" style="background:#f8f9f8;font-weight:600;color:#374151;padding-left:14px">${this.esc(m.group || __("Ungrouped"))}</td></tr>`;
				}
				return gh + `<tr><td><input type="checkbox"></td><td>${icon}</td><td class="t">${this.esc(m.title)}</td>
					${s.sc_owner ? `<td>${this.av(m.owner)}</td>` : ""}
					${s.sc_goal ? `<td>${m.goal == null || m.goal === "" ? "" : this.esc(m.goal_op) + " " + this.fmt(m, m.goal)}</td>` : ""}
					${s.sc_avg ? `<td class="r">${avg == null ? "" : this.fmt(m, avg)}</td>` : ""}
					${s.sc_total ? `<td class="r">${tot == null ? "" : this.fmt(m, tot)}</td>` : ""}
					${cells}
					<td>${h === "off" ? `<button class="nn-mini nn-issue" data-id="${this.esc(m.id)}" data-week="${this.esc(cur)}">${__("Make it an Issue")}</button>` : ""}</td></tr>`;
			}).join("");

			this.$main.find("#nn-grid").html(`<table class="nn-tbl">${head}<tbody>${rows ||
				`<tr><td colspan="${fixed + periods.length + 1}"><div class="nn-empty">${__("No measurables found.")}</div></td></tr>`}</tbody></table>`);

			const self = this;
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
			const E = CFG.entry, value = raw === "" ? null : Number(raw);
			if (value !== null && isNaN(value)) {
				frappe.show_alert({ message: __("Enter a number"), indicator: "red" });
				return this.render_grid();
			}
			const existing = m.entries[period.key];
			let res;
			if (existing && value === null) {
				res = await this.call("frappe.client.delete", { doctype: E.doctype, name: existing });
			} else if (existing) {
				const fn = {}; fn[E.value] = value; if (E.manual) fn[E.manual] = 1;
				res = await this.call("frappe.client.set_value", { doctype: E.doctype, name: existing, fieldname: fn });
			} else if (value !== null) {
				const doc = { doctype: E.doctype };
				doc[E.measurable] = m.id; doc[E.date] = period.key; doc[E.value] = value;
				if (E.manual) doc[E.manual] = 1;
				res = await this.call("frappe.client.insert", { doc });
				if (res.ok && res.data) m.entries[period.key] = res.data.name;
			} else return;

			if (!res.ok) {
				frappe.msgprint({ title: __("Could not save"), message: this.esc(res.error), indicator: "red" });
				return this.load_scorecard();
			}
			if (value === null) delete m.entries[period.key];
			m.values[p] = value;
			this.render_grid();
			frappe.show_alert({ message: __("{0} updated", [m.title]), indicator: "green" });
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
		async rock_spec() {
			const R = CFG.rock;
			const meta = await this.ensure_meta(R.doctype);
			if (!meta) throw new Error(`Doctype "${R.doctype}" not found`);
			const pk = l => this.pick(meta, l);
			const tbl = (R.table && meta.fields.find(f => f.fieldname === R.table)) ||
				meta.fields.find(f => f.fieldtype === "Table" && /milestone/i.test(f.options || "")) ||
				meta.fields.find(f => f.fieldtype === "Table");
			const sp = {
				title: R.title || pk(["title", "rock_name", "rock_title", "name1"]) || meta.title_field || "name",
				status: R.status || pk(["status", "rock_status"]),
				owner: R.owner || pk(["owner_user", "rock_owner", "assigned_to"]) || "owner",
				due: R.due || pk(["due_date", "due", "end_date", "target_date"]),
				company: R.company || pk(["is_company_rock", "company_rock", "is_company"]),
				type: pk(["rock_type", "type", "level", "rock_level"]),
				team: pk(["team"]), archived: pk(["archived", "is_archived"]),
				table: tbl && tbl.fieldname, ms: null
			};
			if (tbl) {
				const cm = await this.ensure_meta(tbl.options);
				if (cm) {
					const cp = l => this.pick(cm, l);
					const done = cp(["completed", "is_completed", "done", "complete", "is_done", "status"]);
					sp.ms = {
						title: cp(["title", "milestone", "milestone_name", "description", "name1"]),
						due: cp(["due_date", "due", "target_date", "date"]),
						done, done_f: cm.fields.find(f => f.fieldname === done)
					};
				}
			}
			console.log("EOS Rock field mapping:", sp);
			return sp;
		}

		ms_is_done(sp, row) {
			const f = sp.ms && sp.ms.done_f;
			if (!f) return false;
			const v = row[f.fieldname];
			return f.fieldtype === "Check" ? !!+v : /complet|done|closed|finish/i.test(v || "");
		}

		ms_done_value(sp, done) {
			const f = sp.ms.done_f;
			if (f.fieldtype === "Check") return done ? 1 : 0;
			const opts = (f.options || "").split("\n").filter(Boolean);
			return done ? opts.find(o => /complet|done|closed|finish/i.test(o)) || opts[opts.length - 1]
				: opts.find(o => !/complet|done|closed|finish/i.test(o)) || opts[0];
		}

		async load_rocks() {
			this.$main.html(`<div class="nn-empty">${__("Loading rocks…")}</div>`);
			this.rocks_error = null;
			this.rocks = [];
			try {
				const sp = (this.rock_sp = await this.rock_spec());
				const R = CFG.rock;
				const fields = ["name", sp.title + " as title", sp.owner + " as owner_user"];
				if (sp.status) fields.push(sp.status + " as status");
				if (sp.due) fields.push(sp.due + " as due");
				if (sp.company) fields.push(sp.company + " as company_flag");
				if (sp.type) fields.push(sp.type + " as rock_type");
				if (sp.team) fields.push(sp.team + " as team");
				if (sp.archived) fields.push(sp.archived + " as arch_flag");
				const list = this.must(await this.list(R.doctype, fields, {}, "creation asc", 500), R.doctype);

				const docs = sp.table
					? await Promise.all(list.map(r => this.call("frappe.client.get", { doctype: R.doctype, name: r.name })))
					: [];
				this.rocks = list.map((r, i) => {
					const d = docs[i] && docs[i].ok ? docs[i].data : {};
					const rows = sp.table && sp.ms ? d[sp.table] || [] : [];
					const company = sp.company ? !!+r.company_flag : /company/i.test(r.rock_type || "");
					return {
						name: r.name, title: r.title, status: r.status, owner: this.owner_name(r.owner_user), due: r.due, is_company: company,
						team: r.team, archived: sp.archived ? !!+r.arch_flag : /archiv/i.test(r.status || ""),
						milestones: rows.map(m => ({
							row: m.name, title: sp.ms.title ? m[sp.ms.title] : "", due: sp.ms.due ? m[sp.ms.due] : null, done: this.ms_is_done(sp, m)
						}))
					};
				});
			} catch (e) { console.error(e); this.rocks_error = e.message || String(e); }
			this.render_rocks();
		}

		status_badge(st) {
			if (!st) return "";
			const t = String(st).toLowerCase();
			const cls = /off|behind|risk|late|blocked/.test(t) ? "off" : /done|complet/.test(t) ? "done" : "";
			return `<span class="nn-badge ${cls}">${ic("thumb", 13)}${this.esc(st)}</span>`;
		}

		rock_row(r, show_owner, chip) {
			const done = r.milestones.filter(m => m.done).length;
			const pct = r.milestones.length ? (done / r.milestones.length) * 100 : 0;
			const open = this.open_rocks[r.name];
			const na = show_owner ? "" : " noown";
			const ms = open ? r.milestones.map((m, i) => `
				<div class="nn-ms${na}"><span></span><span><span class="nn-chk ${m.done ? "done" : ""}" data-rock="${this.esc(r.name)}" data-ms="${i}">${m.done ? ic("check", 11).replace('<rect width="18" height="18" x="3" y="3" rx="2"/>', "") : ""}</span></span>
					<span>${this.esc(m.title)}</span><span></span>${show_owner ? `<span>${this.av(r.owner)}</span>` : ""}
					<span class="nn-due">${this.fdate(m.due)}</span><span class="nn-dots">···</span></div>`).join("") : "";
			return `<div class="nn-rock${na}" data-rock="${this.esc(r.name)}">
				<span>${ic(open ? "chevron-down" : "chevron-right", 15)}</span>
				<span>${this.status_badge(r.status)}</span>
				<span class="nn-rt"><a class="nn-rlink" data-name="${this.esc(r.name)}">${this.esc(r.title)}</a></span>
				<span class="nn-prog">${chip && r.is_company ? `<span class="nn-chip">${__("Company Rock")}</span>` : ""}<span class="nn-bar2"><div style="width:${pct}%"></div></span><span>${done}/${r.milestones.length}</span></span>
				${show_owner ? `<span>${this.av(r.owner)}</span>` : ""}
				<span class="nn-due">${this.fdate(r.due)}</span><span class="nn-dots">···</span></div>${ms}`;
		}

		rock_head(show_owner) {
			return `<div class="nn-rock hd${show_owner ? "" : " noown"}"><span></span><span>${__("Status")}</span><span>${__("Title")}</span>
				<span style="text-align:right">${__("Milestone progress")}</span>${show_owner ? `<span>${__("Owner")}</span>` : ""}<span style="text-align:right">${__("Due by")}</span><span></span></div>`;
		}

		render_rocks() {
			const s = this.s;
			const uniq = k => [...new Set(this.rocks.map(r => r[k]).filter(Boolean))];
			const q = (s.rock_search || "").toLowerCase();
			const list = this.rocks.filter(r =>
				(s.rock_view === "Archive" ? r.archived : !r.archived) &&
				(s.rock_owner === "All" || r.owner === s.rock_owner) &&
				(s.rock_status === "All" || r.status === s.rock_status) &&
				(s.rock_team === "All" || r.team === s.rock_team) &&
				(!q || (r.title || "").toLowerCase().includes(q)));
			const teams = uniq("team");

			let body = "";
			if (s.rock_view === "Planning Board") {
				const cols = {};
				list.forEach(r => (cols[r.status || __("No status")] = cols[r.status || __("No status")] || []).push(r));
				body = `<div class="nn-board">${Object.keys(cols).map(k => `<div class="nn-col"><div class="nn-col-t"><span>${this.esc(k)}</span><span class="nn-cnt">${cols[k].length}</span></div>
					${cols[k].map(r => {
					const d = r.milestones.filter(m => m.done).length;
					return `<div class="nn-kcard nn-rlink" data-name="${this.esc(r.name)}"><div style="font-weight:600;margin-bottom:8px">${this.esc(r.title)}</div>
							<div class="nn-prog" style="justify-content:space-between"><span>${this.av(r.owner)}</span><span>${d}/${r.milestones.length} · ${this.fdate(r.due)}</span></div></div>`;
				}).join("")}</div>`).join("") || `<div class="nn-empty">${__("No rocks")}</div>`}</div>`;
			} else {
				const company = list.filter(r => r.is_company);
				const by_owner = {};
				list.forEach(r => (by_owner[r.owner || __("Unassigned")] = by_owner[r.owner || __("Unassigned")] || []).push(r));
				s.rock_collapsed = s.rock_collapsed || {};

				body = `<div class="nn-card"><div class="nn-card-h"><div class="nn-card-t"><span class="nn-ico-c">${ic("users", 17)}</span>${__("Company Rocks")} <span class="nn-cnt">${company.length}</span></div></div>
					${this.rock_head(true)}${company.map(r => this.rock_row(r, true, false)).join("") || `<div class="nn-empty">${__("No company rocks")}</div>`}</div>`;

				body += Object.keys(by_owner).map(o => {
					const closed = s.rock_collapsed[o];
					return `<div class="nn-card"><div class="nn-card-h"><div class="nn-card-t">${this.av(o).replace('class="nn-av"', 'class="nn-av lg"')}${this.esc(o)} <span class="nn-cnt">${by_owner[o].length}</span></div>
						<span class="nn-ibtn nn-fold" data-o="${this.esc(o)}" style="border:0">${ic(closed ? "chevron-down" : "chevron-up", 18)}</span></div>
						${closed ? "" : this.rock_head(false) + by_owner[o].map(r => this.rock_row(r, false, true)).join("") + `<div class="nn-add nn-addrock">+ ${__("Add Rock")}</div>`}</div>`;
				}).join("");
			}

			this.$main.html(`
				${this.top(__("Rocks"), __("Set and track quarterly goals to help your team consistently hit their targets."), __("Create"))}
				<div class="nn-tabs">${["List", "Planning Board", "Archive"].map(t => `<div class="nn-tab nn-rv ${s.rock_view === t ? "on" : ""}" data-v="${t}">${__(t)}</div>`).join("")}</div>
				<div class="nn-bar">
					${teams.length ? this.pill("nn-rteam", __("Team"), s.rock_team === "All" ? __("All") : s.rock_team) : ""}
					${this.pill("nn-rowner", __("Owner"), s.rock_owner === "All" ? __("All") : s.rock_owner)}
					${this.pill("nn-rstatus", __("Status"), s.rock_status === "All" ? __("All") : s.rock_status)}
					<div class="nn-sp"></div>
					<span class="nn-ibtn" id="nn-refresh" title="${__("Refresh")}">${ic("refresh", 15)}</span>
					${this.search_box("nn-rsearch", __("Search Rocks…"), s.rock_search)}
				</div>
				<div class="nn-body"><div class="${s.rock_view === "Planning Board" ? "" : "nn-narrow"}">
					${this.rocks_error ? `<div class="nn-banner nn-warn">⚠ ${__("Could not load Rocks:")} ${this.esc(this.rocks_error)}</div>` : ""}
					${body}
				</div></div>`);

			const self = this, $m = this.$main;
			$m.find("#nn-create, .nn-addrock").on("click", () => frappe.new_doc(CFG.rock.doctype));
			$m.find(".nn-rv").on("click", function () { s.rock_view = $(this).attr("data-v"); self.render_rocks(); });
			$m.find("#nn-refresh").on("click", () => this.load_rocks());
			const opt = (id, key, vals) => $m.find(id).on("click", function (e) {
				e.stopPropagation();
				self.pick_menu(this, [["All", __("All")]].concat(vals.map(v => [v, v])), s[key], v => { s[key] = v; self.render_rocks(); });
			});
			opt("#nn-rteam", "rock_team", teams);
			opt("#nn-rowner", "rock_owner", uniq("owner"));
			opt("#nn-rstatus", "rock_status", uniq("status"));
			$m.find("#nn-rsearch").on("input", function () {
				s.rock_search = $(this).val();
				const pos = this.selectionStart;
				self.render_rocks();
				const el = self.$main.find("#nn-rsearch")[0]; el.focus(); el.setSelectionRange(pos, pos);
			});
			$m.find(".nn-fold").on("click", function () { const o = $(this).attr("data-o"); s.rock_collapsed[o] = !s.rock_collapsed[o]; self.render_rocks(); });
			$m.find(".nn-rlink").on("click", function (e) { e.stopPropagation(); frappe.set_route("Form", CFG.rock.doctype, $(this).attr("data-name")); });
			$m.find(".nn-rock:not(.hd)").on("click", function () {
				const k = $(this).attr("data-rock");
				self.open_rocks[k] = !self.open_rocks[k];
				self.render_rocks();
			});
			$m.find(".nn-chk").on("click", function (e) {
				e.stopPropagation();
				self.toggle_ms($(this).attr("data-rock"), +$(this).attr("data-ms"));
			});
		}


		async toggle_ms(rock_name, i) {
			const sp = this.rock_sp, r = this.rocks.find(x => x.name === rock_name), m = r && r.milestones[i];
			if (!m || !sp || !sp.ms || !sp.ms.done_f) return frappe.show_alert({ message: __("Milestone has no completion field"), indicator: "orange" });
			m.done = !m.done;
			this.render_rocks();

			const doc = await this.call("frappe.client.get", { doctype: CFG.rock.doctype, name: rock_name });
			let ok = doc.ok, err = doc.error;
			if (ok) {
				const d = doc.data;
				(d[sp.table] || []).forEach(row => { if (row.name === m.row) row[sp.ms.done] = this.ms_done_value(sp, m.done); });
				const save = await this.call("frappe.client.save", { doc: d });
				ok = save.ok; err = save.error;
			}
			if (!ok) {
				m.done = !m.done;
				this.render_rocks();
				frappe.msgprint({ title: __("Could not save milestone"), message: this.esc(err), indicator: "red" });
			}
		}

		/* ================= TO-DOS (custom "To Do" doctype) ================= */
		async todo_spec() {
			if (this.todo_sp) return this.todo_sp;
			const T = CFG.todo;
			const meta = await this.ensure_meta(T.doctype);
			if (!meta) throw new Error(`Doctype "${T.doctype}" not found`);
			const opts = f => ((meta.fields.find(x => x.fieldname === f) || {}).options || "").split("\n").filter(Boolean);
			const st = opts(T.status), pr = opts(T.priority);
			this.todo_sp = {
				statuses: st, priorities: pr,
				closed: st.find(o => /complet|done|closed|finish/i.test(o)),
				reopen: st.find(o => !/complet|done|closed|finish|cancel/i.test(o)) || st[0]
			};
			return this.todo_sp;
		}

		async load_todos() {
			this.$main.html(`<div class="nn-empty">${__("Loading to-dos…")}</div>`);
			const s = this.s, T = CFG.todo;
			this.todo_error = null;
			this.todos = [];
			try {
				const sp = await this.todo_spec();
				const f = {};
				f[T.archived] = s.todo_archive ? 1 : 0;
				if (!s.todo_archive && sp.closed) f[T.status] = ["!=", sp.closed];
				if (s.todo_tab === "Private") { f[T.owner] = frappe.session.user; f[T.team] = ["is", "not set"]; }
				else f[T.team] = s.todo_team !== "All Teams" ? s.todo_team : ["is", "set"];

				const fields = ["name", T.title + " as title", T.status + " as status", T.owner + " as owner_user",
					T.team + " as team", T.due + " as due", T.priority + " as priority", T.rock + " as rock"];
				this.todos = this.must(await this.list(T.doctype, fields, f, T.due + " asc", 500), T.doctype);

				if (!this.all_teams) {
					const t = await this.list(T.doctype, [T.team + " as team"], { [T.team]: ["is", "set"] }, "modified desc", 500);
					this.all_teams = [...new Set((t.ok ? t.data : []).map(x => x.team))];
				}
			} catch (e) { console.error(e); this.todo_error = e.message || String(e); }
			this.render_todos();
		}

		render_todos() {
			const s = this.s;
			const q = (s.todo_search || "").toLowerCase();
			const owners = [...new Set(this.todos.map(t => t.owner_user).filter(Boolean))];
			const teams = this.all_teams || [];
			const list = this.todos.filter(t =>
				(s.todo_owner === "All" || t.owner_user === s.todo_owner) &&
				(!q || (t.title || "").toLowerCase().includes(q)));
			const closed = this.todo_sp && this.todo_sp.closed;

			const rows = list.map(t => {
				const done = t.status === closed;
				const over = this.is_overdue(t.due) && !done;
				const today = this.is_today(t.due) && !done;
				const flag = over ? `<span class="nn-flag red">!</span>` : today ? `<span class="nn-flag dark">${ic("clock", 11)}</span>` : "";
				return `<div class="nn-todo"><span><span class="nn-chk ${done ? "done" : ""}" data-name="${this.esc(t.name)}">${done ? ic("check", 11).replace('<rect width="18" height="18" x="3" y="3" rx="2"/>', "") : ""}</span></span>
					<span class="nn-open" data-name="${this.esc(t.name)}" style="cursor:pointer;${done ? "text-decoration:line-through;color:#9ca3af" : ""}">${this.esc(t.title)}</span>
					<span>${flag}</span><span class="nn-due ${over ? "nn-red" : ""}">${this.fdate(t.due)}</span>
					<span>${this.av(this.owner_name(t.owner_user))}</span><span class="nn-dots">···</span></div>`;
			}).join("");

			this.$main.html(`
				${this.top(__("To-Dos"), __("Create, assign, and track deadlines for critical tasks."), __("Create"))}
				<div class="nn-tabs">${["Team", "Private"].map(t => `<div class="nn-tab nn-tt ${s.todo_tab === t ? "on" : ""}" data-t="${t}">${__(t)}</div>`).join("")}</div>
				<div class="nn-bar">
					${s.todo_tab === "Team" ? this.pill("nn-tteam", __("Team"), s.todo_team === "All Teams" ? __("All") : s.todo_team) : ""}
					${this.pill("nn-towner", __("Owner"), s.todo_owner === "All" ? __("All") : this.owner_name(s.todo_owner))}
					<label class="nn-switch-l"><span class="nn-sw ${s.todo_archive ? "on" : ""}" id="nn-arch"></span>${__("Archive")}</label>
					<div class="nn-sp"></div>
					<span class="nn-ibtn" id="nn-refresh" title="${__("Refresh")}">${ic("refresh", 15)}</span>
					${this.search_box("nn-tsearch", __("Search To-Dos…"), s.todo_search)}
				</div>
				<div class="nn-body"><div class="nn-narrow">
					${this.todo_error ? `<div class="nn-banner nn-warn">⚠ ${__("Could not load To-Dos:")} ${this.esc(this.todo_error)}</div>` : ""}
					<div class="nn-card">
						<div class="nn-card-h"><div class="nn-card-t">${__(s.todo_tab)} ${__("To-Dos")} <span class="nn-cnt">${list.length}</span></div></div>
						<div class="nn-todo hd"><span></span><span>${__("Title")}</span><span></span><span style="text-align:right">${__("Due By")} ↓</span><span>${__("Owner")}</span><span></span></div>
						${rows || `<div class="nn-empty">${__("Nothing here.")}</div>`}
						<div class="nn-foot"><span class="nn-add nn-addtodo" style="padding:8px 0">+ ${__("Add To-Do")}</span>
							<span>${__("Items per page")}: 100 &nbsp;&nbsp; ${list.length ? 1 : 0} – ${list.length} ${__("of")} ${list.length}</span></div>
					</div>
				</div></div>`);

			const self = this, $m = this.$main;
			$m.find(".nn-tt").on("click", function () { s.todo_tab = $(this).attr("data-t"); self.load_todos(); });
			$m.find("#nn-tteam").on("click", function (e) {
				e.stopPropagation();
				self.pick_menu(this, [["All Teams", __("All")]].concat(teams.map(t => [t, t])), s.todo_team, v => { s.todo_team = v; self.load_todos(); });
			});
			$m.find("#nn-towner").on("click", function (e) {
				e.stopPropagation();
				self.pick_menu(this, [["All", __("All")]].concat(owners.map(o => [o, self.owner_name(o)])), s.todo_owner, v => { s.todo_owner = v; self.render_todos(); });
			});
			$m.find("#nn-arch").on("click", () => { s.todo_archive = !s.todo_archive; this.load_todos(); });
			$m.find("#nn-refresh").on("click", () => this.load_todos());
			$m.find("#nn-create, .nn-addtodo").on("click", () => this.add_todo());
			$m.find("#nn-tsearch").on("input", function () {
				s.todo_search = $(this).val();
				const pos = this.selectionStart;
				self.render_todos();
				const el = self.$main.find("#nn-tsearch")[0]; el.focus(); el.setSelectionRange(pos, pos);
			});
			$m.find(".nn-open").on("click", function () { frappe.set_route("Form", CFG.todo.doctype, $(this).attr("data-name")); });
			$m.find(".nn-chk").on("click", function () { self.toggle_todo($(this).attr("data-name")); });
		}


		async toggle_todo(name) {
			const T = CFG.todo, sp = this.todo_sp, t = this.todos.find(x => x.name === name);
			if (!t || !sp || !sp.closed) return frappe.show_alert({ message: __("No 'Completed' status found on To Do"), indicator: "orange" });
			const status = t.status === sp.closed ? sp.reopen : sp.closed;
			const res = await this.call("frappe.client.set_value", { doctype: T.doctype, name, fieldname: T.status, value: status });
			if (!res.ok) return frappe.msgprint({ title: __("Could not update"), message: this.esc(res.error), indicator: "red" });
			frappe.show_alert({ message: status === sp.closed ? __("To-Do completed") : __("To-Do reopened"), indicator: "green" });
			this.load_todos();
		}

		add_todo() {
			const T = CFG.todo, sp = this.todo_sp || { priorities: [] };
			const fields = [
				{ fieldname: "title", fieldtype: "Data", label: __("To-Do Name"), reqd: 1 },
				{ fieldname: "due", fieldtype: "Date", label: __("Due Date"), default: frappe.datetime.get_today() },
				{ fieldname: "owner_user", fieldtype: "Link", options: "User", label: __("Owner"), default: frappe.session.user },
				{ fieldname: "team", fieldtype: "Link", options: "Team", label: __("Team"), default: this.s.todo_tab === "Team" && this.s.todo_team !== "All Teams" ? this.s.todo_team : "" },
				{ fieldname: "priority", fieldtype: "Select", label: __("Priority"), options: sp.priorities.join("\n") },
				{ fieldname: "rock", fieldtype: "Link", options: "Rock", label: __("Rock") }
			];
			const d = new frappe.ui.Dialog({
				title: __("New To-Do"), fields,
				primary_action_label: __("Add"),
				primary_action: async v => {
					const doc = { doctype: T.doctype };
					doc[T.title] = v.title; doc[T.due] = v.due; doc[T.owner] = v.owner_user;
					if (v.team) doc[T.team] = v.team;
					if (v.priority) doc[T.priority] = v.priority;
					if (v.rock) doc[T.rock] = v.rock;
					if (sp.reopen) doc[T.status] = sp.reopen;
					const res = await this.call("frappe.client.insert", { doc });
					if (!res.ok) return frappe.msgprint({ title: __("Could not add"), message: this.esc(res.error), indicator: "red" });
					d.hide();
					frappe.show_alert({ message: __("To-Do added"), indicator: "green" });
					this.load_todos();
				}
			});
			d.show();
		}
	}


	/* ================= ENTRY POINT ================= */
	/* Frappe registers the page under its Page name (usually with hyphens).
	   Pick whichever key actually exists so this works either way. */
	const PAGE_KEY = ["scorecard-grid", "scorecard_grid"].find(k => frappe.pages[k]);
	if (!PAGE_KEY) {
		console.error("EOS: no page registered. Existing keys:", Object.keys(frappe.pages));
		return;
	}
	frappe.pages[PAGE_KEY].on_page_load = function (wrapper) {
		try {
			wrapper.eos_page = new EOSNinety(wrapper);
		} catch (e) {
			console.error("EOS failed to start:", e);
			$(wrapper).append(`<pre style="padding:20px;color:#b00;white-space:pre-wrap">EOS failed to start:\n${frappe.utils.escape_html(e.stack || e.message)}</pre>`);
		}
	};
})();