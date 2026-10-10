/*
 * Ninety.io Core Dashboard Page (Scorecard & Rocks) for EOS Core
 * Matches design specifications for:
 * 1. Scorecard Grid (13-week KPI scorecard with BEL BPO data & Create Measurable drawer)
 * 2. Rocks View (Company Rocks, Individual Rocks, Milestones, V/TO card, & Create Rock drawer)
 */
(function () {
	"use strict";

	const CFG = {
		api: { create_issue: "eos_core.eos_core.doctype.issue.issue.create_issue_from_metric" },
		base_timeframe: "Weekly",
		scorecard: { doctype: "Scorecard", team: "team", timeframe: "timeframe", archived: "archived" },
		group: { doctype: "Measurable Group", scorecard: "scorecard", name: "group_name", order: "order", archived: "archived" },
		measurable: {
			doctype: "EOS Metric",
			title: null, goal: null, goal_op: null, unit: null, owner: null,
			scorecard: null, group: null, archived: null
		},
		entry: { doctype: "Scorecard Entry", measurable: "metric", date: "week_start_date", value: "actual_value", manual: "is_manual" },
		rock: { doctype: "Rock", title: "rock_name", status: "status", owner: "owner_user", due: "duration_end", team: "team" }
	};

	const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

	const IC = {
		"chevron-down": '<path d="m6 9 6 6 6-6"/>',
		"chevron-up": '<path d="m18 15-6-6-6 6"/>',
		"chevron-right": '<path d="m9 18 6-6-6-6"/>',
		"search": '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
		"bell": '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
		"plus": '<path d="M5 12h14"/><path d="M12 5v14"/>',
		"undo": '<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>',
		"redo": '<path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"/>',
		"table": '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/><path d="M15 3v18"/>',
		"chart": '<path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>',
		"sparkle": '<path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/>',
		"dots": '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
		"fullscreen": '<path d="m15 15 6 6m0-6v6h-6"/><path d="m9 9-6-6m0 6V3h6"/>',
		"user": '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>',
		"users": '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
		"user-plus": '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>',
		"close": '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
		"info": '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
		"arrow-up-right": '<path d="M7 17 17 7"/><path d="M7 7h10v10"/>',
		"refresh": '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
		"box": '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
		"book": '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10"/><path d="M6 10h10"/>',
		"rock-icon": '<path d="m8 3 4 8 5-5 5 15H2L8 3z"/>',
		"scorecard-icon": '<path d="M3 3v18a2 2 0 0 0 2 2h16"/><path d="m19 9-5 5-4-4-3 3"/>',
		"todo-icon": '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="m9 12 2 2 4-4"/>',
		"target": '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>'
	};

	const ic = (n, s) => `<svg class="nn-svg" width="${s || 14}" height="${s || 14}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${IC[n] || ""}</svg>`;

	class EOSNinety {
		constructor(wrapper) {
			this.wrapper = wrapper;
			this.page = frappe.ui.make_app_page({ parent: wrapper, title: __("EOS"), single_column: true });
			$(wrapper).find(".page-head").hide();

			this.s = {
				view: "rocks",
				timeframe: "Week",
				range: 13,
				team: "BEL BPO",
				rock_team: "Leadership Team",
				rock_owner: "Taher Jivanji",
				rock_status: "All",
				rock_tab: "List",
				search: "",
				attention: false,
				banner_off: false,
				sc_collapsed: false,
				view_mode: "chart",
				expanded_rocks: { "EDMS implementation and go live": true }
			};
			this.data = { periods: [], metrics: [] };
			this.rocks = [];
			this.users = [];
			this.current_scorecard_id = "BEL BPO-Weekly";
			this.current_group_id = "";

			this.css();
			this.shell();
			this.go(this.s.view);
		}

		/* ================= helpers ================= */
		esc(v) { return frappe.utils.escape_html(v == null ? "" : String(v)); }

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
				doctype, fields, filters: filters || {}, order_by: order_by || "creation asc", limit_page_length: limit || 500
			});
		}

		/* ================= styling ================= */
		css() {
			$("#nn-css, #nn-css-v2, #nn-scorecard-style").remove();
			$("head").append(`<style id="nn-scorecard-style">
			.nn { display: flex; width: 100%; min-height: 100vh; background: #ffffff; color: #111827; font-size: 13px; font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; position: relative; }
			.nn * { box-sizing: border-box; }
			
			/* Left Sidebar (Ninety dark theme) */
			.nn-side { width: 218px; flex-shrink: 0; background: #131924; color: #9ca3af; display: flex; flex-direction: column; padding: 14px 10px; border-right: 1px solid #1f2937; user-select: none; }
			.nn-side-header { display: flex; align-items: center; gap: 8px; padding: 6px 10px 18px; font-weight: 600; font-size: 13px; color: #ffffff; line-height: 1.3; }
			.nn-side-logo { width: 22px; height: 22px; border-radius: 4px; background: #064e3b; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0; }
			.nn-side-dot { width: 7px; height: 7px; border-radius: 50%; background: #22c55e; margin-left: auto; }
			
			.nn-nav-item { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 6px; cursor: pointer; color: #9ca3af; font-size: 12.5px; font-weight: 500; margin-bottom: 2px; transition: all 0.12s; }
			.nn-nav-item:hover { background: #1f2937; color: #e5e7eb; }
			.nn-nav-item.on { background: #1f2937; color: #ffffff; font-weight: 600; }
			.nn-nav-item .nn-svg { color: inherit; }

			.nn-side-footer { margin-top: auto; border-top: 1px solid #1f2937; padding-top: 12px; }
			.nn-side-foot-item { display: flex; align-items: center; gap: 8px; padding: 6px 10px; font-size: 11.5px; color: #9ca3af; cursor: pointer; border-radius: 4px; }
			.nn-side-foot-item:hover { color: #ffffff; }
			.nn-user-bar { display: flex; align-items: center; gap: 10px; padding: 10px 10px 4px; margin-top: 6px; }
			.nn-user-av { width: 26px; height: 26px; border-radius: 50%; background: #4b5563; color: #fff; font-size: 10.5px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; }
			.nn-user-name { font-size: 12px; font-weight: 600; color: #ffffff; }

			/* Main Content */
			.nn-main { flex: 1 1 0%; min-width: 0; background: #ffffff; }
			.nn-svg { flex-shrink: 0; vertical-align: middle; }
			.nn button { font-family: inherit; }

			/* Top Bar */
			.nn-top-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 28px 12px; border-bottom: 1px solid #f1f3f5; }
			.nn-title { font-size: 22px; font-weight: 700; color: #111827; line-height: 1.2; letter-spacing: -0.01em; }
			.nn-sub { font-size: 12.5px; color: #6b7280; margin-top: 3px; }
			.nn-top-right { display: flex; align-items: center; gap: 10px; }
			
			.nn-badge-maz { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 9999px; background: #ecfdf5; border: 1px solid #a7f3d0; color: #047857; font-size: 12px; font-weight: 600; cursor: pointer; text-decoration: none; }
			.nn-badge-new { background: #059669; color: #fff; font-size: 9.5px; padding: 1px 5px; border-radius: 4px; font-weight: 700; text-transform: uppercase; }
			
			.nn-top-search { position: relative; display: inline-flex; align-items: center; }
			.nn-top-search .nn-svg { position: absolute; left: 9px; color: #9ca3af; }
			.nn-top-search input { height: 32px; width: 160px; padding: 0 10px 0 28px; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 12.5px; outline: none; background: #fff; color: #374151; }
			.nn-top-search input:focus { border-color: #064e3b; }
			
			.nn-btn-icon { width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center; border: 1px solid #e5e7eb; border-radius: 6px; background: #fff; color: #6b7280; cursor: pointer; position: relative; }
			.nn-btn-icon:hover { background: #f9fafb; color: #111827; }
			.nn-dot-red { position: absolute; top: 7px; right: 7px; width: 6px; height: 6px; border-radius: 50%; background: #ef4444; }

			.nn-btn-create { display: inline-flex; align-items: center; gap: 4px; height: 32px; padding: 0 14px; border-radius: 6px; background: #064e3b; color: #ffffff; font-size: 12.5px; font-weight: 600; border: none; cursor: pointer; transition: background 0.15s; }
			.nn-btn-create:hover { background: #04392b; }

			/* Tabs */
			.nn-tabs { display: flex; gap: 24px; padding: 0 28px; margin-top: 4px; border-bottom: 1px solid #f1f3f5; }
			.nn-tab { padding: 10px 0; font-size: 13px; font-weight: 500; color: #6b7280; cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.15s; display: inline-flex; align-items: center; gap: 6px; }
			.nn-tab:hover { color: #111827; }
			.nn-tab.on { color: #064e3b; font-weight: 600; border-bottom-color: #064e3b; }

			/* Filter Bar */
			.nn-filter-bar { display: flex; align-items: center; justify-content: space-between; padding: 12px 28px; gap: 10px; flex-wrap: wrap; }
			.nn-filter-left { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
			.nn-filter-right { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

			.nn-pill-select { display: inline-flex; align-items: center; gap: 6px; padding: 0 12px; height: 32px; border: 1px solid #e5e7eb; border-radius: 6px; background: #fff; font-size: 12.5px; color: #374151; cursor: pointer; white-space: nowrap; }
			.nn-pill-select:hover { background: #f9fafb; }
			.nn-pill-select .k { color: #6b7280; font-weight: 400; }
			.nn-pill-select b { font-weight: 600; color: #111827; }

			.nn-btn-bar { display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 12px; border: 1px solid #e5e7eb; border-radius: 6px; background: #fff; color: #374151; font-size: 12.5px; font-weight: 500; cursor: pointer; white-space: nowrap; }
			.nn-btn-bar:hover { background: #f9fafb; color: #111827; }
			.nn-ibtn-bar { width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center; border: 1px solid #e5e7eb; border-radius: 6px; background: #fff; color: #6b7280; cursor: pointer; }
			.nn-ibtn-bar:hover { background: #f9fafb; color: #111827; }

			.nn-search-input-wrap { position: relative; display: inline-flex; align-items: center; }
			.nn-search-input-wrap .nn-svg { position: absolute; left: 9px; color: #9ca3af; }
			.nn-search-input-wrap input { height: 32px; width: 190px; padding: 0 10px 0 28px; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 12.5px; outline: none; background: #fff; color: #374151; }
			.nn-search-input-wrap input:focus { border-color: #064e3b; }

			/* ================= ROCKS VIEW STYLES ================= */
			.nn-rocks-body { padding: 10px 28px 48px; }

			/* V/TO Accordion Card */
			.nn-vto-card { border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; padding: 12px 18px; margin-bottom: 18px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; transition: border-color 0.15s; }
			.nn-vto-card:hover { border-color: #d1d5db; }
			.nn-vto-left { display: flex; align-items: center; gap: 12px; }
			.nn-vto-icon { width: 32px; height: 32px; border-radius: 50%; background: #ccfbf1; color: #0f766e; display: inline-flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; }
			.nn-vto-title { font-size: 14px; font-weight: 600; color: #111827; }

			/* Rocks Cards */
			.nn-rock-card { border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; margin-bottom: 22px; box-shadow: 0 1px 2px rgba(0,0,0,0.02); overflow: hidden; }
			.nn-rock-header { padding: 14px 20px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #f1f3f5; }
			.nn-rock-title-group { display: flex; align-items: center; gap: 10px; }
			.nn-rock-icon-circle { width: 30px; height: 30px; border-radius: 50%; background: #f3f4f6; color: #6b7280; display: inline-flex; align-items: center; justify-content: center; }
			.nn-rock-owner-av { width: 30px; height: 30px; border-radius: 50%; background: #4b5563; color: #fff; font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; }
			.nn-rock-title { font-size: 15px; font-weight: 700; color: #111827; }
			.nn-badge-cnt { background: #f3f4f6; color: #374151; font-size: 12.5px; font-weight: 600; padding: 2px 8px; border-radius: 6px; }

			/* Attention Banner inside Rocks */
			.nn-rock-banner { margin: 16px 20px 8px; padding: 12px 18px; border-radius: 8px; background: #f0fdf4; border: 1px solid #dcfce7; display: flex; align-items: center; justify-content: space-between; }
			.nn-rock-banner-t { font-size: 13px; font-weight: 600; color: #111827; }
			.nn-rock-banner-r { display: flex; align-items: center; gap: 12px; }
			.nn-btn-check { display: inline-flex; align-items: center; gap: 6px; padding: 0 16px; height: 30px; border-radius: 9999px; background: #064e3b; color: #fff; font-size: 12px; font-weight: 600; border: none; cursor: pointer; }

			/* Rocks Table */
			.nn-rock-tbl { width: 100%; border-collapse: collapse; margin: 0; }
			.nn-rock-tbl th { font-size: 11px; font-weight: 500; color: #6b7280; padding: 8px 12px; border-bottom: 1px solid #f1f3f5; text-align: left; }
			.nn-rock-tbl td { padding: 10px 12px; border-bottom: 1px solid #f8f9fa; font-size: 12.5px; vertical-align: middle; }
			.nn-rock-row:hover td { background: #fafbfa; }

			/* Status Badge */
			.nn-status-badge { display: inline-flex; align-items: center; gap: 5px; border-radius: 6px; padding: 3px 8px; font-size: 11.5px; font-weight: 500; }
			.nn-status-badge.on-track { background: #e0f2fe; color: #0284c7; }
			.nn-status-badge.off-track { background: #fee2e2; color: #dc2626; }
			.nn-status-badge.complete { background: #dcfce7; color: #166534; }

			.nn-badge-company { font-size: 10.5px; color: #6b7280; border: 1px solid #e5e7eb; border-radius: 4px; padding: 1px 6px; margin-left: 8px; font-weight: 400; }

			/* Progress Bar */
			.nn-progress-wrap { display: flex; align-items: center; gap: 8px; justify-content: flex-end; }
			.nn-prog-bar { width: 64px; height: 5px; background: #e5e7eb; border-radius: 4px; overflow: hidden; }
			.nn-prog-fill { height: 100%; background: #064e3b; }
			.nn-prog-txt { font-size: 11px; color: #9ca3af; font-weight: 500; min-width: 22px; text-align: right; }

			/* Milestone Child Rows */
			.nn-ms-row { background: #fbfcfb; }
			.nn-ms-row td { padding: 8px 12px; font-size: 12px; color: #4b5563; border-bottom: 1px solid #f1f3f5; }
			.nn-ms-chk { width: 15px; height: 15px; border: 1.5px solid #9ca3af; border-radius: 50%; display: inline-block; cursor: pointer; vertical-align: middle; margin-right: 8px; }
			.nn-ms-chk.done { background: #064e3b; border-color: #064e3b; }

			.nn-rock-add { padding: 12px 20px; color: #064e3b; font-weight: 600; font-size: 12.5px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
			.nn-rock-add:hover { text-decoration: underline; }

			/* ================= SCORECARD SPECIFIC STYLES ================= */
			.nn-card-wrap { border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; margin: 0 28px 40px; box-shadow: 0 1px 2px rgba(0,0,0,0.02); overflow: hidden; }
			.nn-card-header { padding: 14px 18px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #f1f3f5; }
			.nn-table-scroll { overflow-x: auto; width: 100%; }
			.nn-tbl { width: 100%; border-collapse: collapse; min-width: 1450px; }
			.nn-tbl th { font-size: 11.5px; font-weight: 500; color: #6b7280; text-align: center; padding: 7px 6px; border: 1px solid #eceff1; background: #fff; white-space: nowrap; vertical-align: middle; }
			.nn-tbl th.l { text-align: left; }
			.nn-tbl td { border: 1px solid #eceff1; padding: 0 8px; height: 33px; font-size: 12px; text-align: center; white-space: nowrap; vertical-align: middle; }
			.nn-tbl td.t { text-align: left; min-width: 270px; color: #111827; font-weight: 500; padding-left: 12px; }
			.nn-tbl td.r { text-align: right; padding-right: 14px; font-weight: 500; color: #111827; }
			.nn-tbl tr:hover td { background: #fafbfa; }

			.nn-tbl td.c { padding: 0; min-width: 96px; }
			.nn-tbl td.c.ok { background: #ebfaef !important; color: #111827 !important; }
			.nn-tbl td.c.bad { background: #fdeeee !important; color: #b91c1c !important; }

			.nn-in { width: 100%; height: 32px; border: 0; background: transparent; text-align: center; color: inherit; font-size: 11.5px; outline: none; box-shadow: none; padding: 0 4px; }
			.nn-in:focus { background: #ffffff !important; box-shadow: inset 0 0 0 2px #064e3b !important; color: #111827 !important; }

			.nn-av-circle { display: inline-flex; width: 24px; height: 24px; border-radius: 50%; background: #9ca3af; color: #fff; font-size: 9.5px; font-weight: 600; align-items: center; justify-content: center; }
			.nn-trend-alert { color: #ea580c; display: inline-flex; align-items: center; justify-content: center; }
			.nn-trend-good { color: #16a34a; display: inline-flex; align-items: center; justify-content: center; }
			.nn-trend-nod { color: #9ca3af; display: inline-flex; align-items: center; justify-content: center; }

			/* ================= DRAWER ================= */
			.nn-drawer-backdrop { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.25); z-index: 1040; opacity: 0; pointer-events: none; transition: opacity 0.2s ease; }
			.nn-drawer-backdrop.show { opacity: 1; pointer-events: auto; }

			.nn-drawer { position: fixed; top: 0; right: 0; bottom: 0; width: 440px; max-width: 92vw; background: #ffffff; z-index: 1050; display: flex; flex-direction: column; box-shadow: -4px 0 28px rgba(0, 0, 0, 0.12); transform: translateX(100%); transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1); font-family: inherit; }
			.nn-drawer.show { transform: translateX(0); }

			.nn-drawer-header { padding: 16px 20px; border-bottom: 1px solid #f1f3f5; display: flex; align-items: center; justify-content: space-between; }
			.nn-drawer-title { font-size: 16px; font-weight: 700; color: #111827; }
			.nn-drawer-header-actions { display: flex; align-items: center; gap: 8px; }
			.nn-drawer-btn-icon { background: none; border: none; color: #6b7280; cursor: pointer; padding: 5px; display: inline-flex; align-items: center; justify-content: center; border-radius: 4px; }
			.nn-drawer-btn-icon:hover { color: #111827; background: #f3f4f6; }

			.nn-drawer-body { padding: 20px 22px; overflow-y: auto; flex: 1; }
			.nn-field-group { margin-bottom: 18px; }
			.nn-field-label { display: flex; justify-content: space-between; align-items: center; font-size: 12px; font-weight: 600; color: #374151; margin-bottom: 6px; }
			.nn-input-text { width: 100%; height: 36px; border: 1px solid #d1d5db; border-radius: 6px; padding: 0 12px; font-size: 13px; color: #111827; outline: none; background: #fff; }
			.nn-input-text:focus { border-color: #064e3b; box-shadow: 0 0 0 1px #064e3b; }
			.nn-select { width: 100%; height: 36px; border: 1px solid #d1d5db; border-radius: 6px; padding: 0 12px; font-size: 13px; color: #111827; outline: none; background: #fff; cursor: pointer; }
			
			.nn-switch { position: relative; width: 36px; height: 20px; background: #d1d5db; border-radius: 20px; cursor: pointer; flex-shrink: 0; transition: background 0.15s; margin-top: 2px; }
			.nn-switch.on { background: #064e3b; }
			.nn-switch:after { content: ""; position: absolute; top: 3px; left: 3px; width: 14px; height: 14px; border-radius: 50%; background: #fff; transition: left 0.15s; }
			.nn-switch.on:after { left: 19px; }

			.nn-drawer-footer { padding: 14px 22px; border-top: 1px solid #f1f3f5; display: flex; align-items: center; gap: 10px; background: #fff; }
			.nn-btn-save { height: 36px; padding: 0 20px; border-radius: 6px; background: #064e3b; color: #ffffff; font-size: 13px; font-weight: 600; border: none; cursor: pointer; }
			.nn-btn-save:hover { background: #04392b; }
			.nn-btn-cancel { height: 36px; padding: 0 16px; border-radius: 6px; background: #fff; border: 1px solid #d1d5db; color: #374151; font-size: 13px; font-weight: 500; cursor: pointer; }

			.nn-menu { position: fixed; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.12); z-index: 1050; padding: 6px; min-width: 180px; }
			.nn-mi { padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 12.5px; color: #374151; }
			.nn-mi:hover { background: #f3f4f6; color: #111827; }
			.nn-mi.on { font-weight: 600; color: #064e3b; background: #f0fdf4; }
			</style>`);
		}

		shell() {
			this.$root = $(`
				<div class="nn">
					<!-- Dark Left Sidebar -->
					<div class="nn-side">
						<div class="nn-side-header">
							<span class="nn-side-logo">B</span>
							<span style="font-weight:700">Burhani Engineers<br><span style="font-size:11px;font-weight:400;color:#9ca3af">Limited</span></span>
							<span class="nn-side-dot"></span>
						</div>
						
						<div class="nn-nav-item" data-view="scorecard">
							${ic("scorecard-icon", 16)} <span>${__("Scorecard")}</span>
						</div>
						<div class="nn-nav-item" data-view="rocks">
							${ic("rock-icon", 16)} <span>${__("Rocks")}</span>
						</div>
						<div class="nn-nav-item" data-view="todos">
							${ic("todo-icon", 16)} <span>${__("To-Dos")}</span>
						</div>
						<div class="nn-nav-item" style="opacity:0.65">
							${ic("info", 16)} <span>${__("Issues")}</span>
						</div>
						<div class="nn-nav-item" style="opacity:0.65">
							${ic("users", 16)} <span>${__("Meetings")}</span>
						</div>
						<div class="nn-nav-item" style="opacity:0.65">
							${ic("book", 16)} <span>${__("V/TO®")}</span>
						</div>
						<div class="nn-nav-item" style="opacity:0.65">
							${ic("target", 16)} <span>${__("Accountability Chart™")}</span>
						</div>

						<div class="nn-side-footer">
							<div class="nn-side-foot-item">+ ${__("Add Teammates")}</div>
							<div class="nn-side-foot-item">${__("Provide Feedback")}</div>
							<div class="nn-side-foot-item">${__("Learning and Support")}</div>
							<div class="nn-user-bar">
								<span class="nn-user-av">TJ</span>
								<span class="nn-user-name">Taher Jivanji</span>
							</div>
						</div>
					</div>

					<!-- Main Body -->
					<div class="nn-main" id="nn-main"></div>

					<!-- Drawers -->
					<div class="nn-drawer-backdrop" id="nn-drawer-backdrop"></div>
					<div class="nn-drawer" id="nn-drawer"></div>
				</div>
			`);
			$(this.page.main).empty().append(this.$root);

			const self = this;
			this.$root.find(".nn-nav-item[data-view]").on("click", function () {
				self.go($(this).attr("data-view"));
			});
			this.$root.find("#nn-drawer-backdrop").on("click", () => self.close_drawer());
			$(document).off("click.nnmenu").on("click.nnmenu", e => {
				if (!$(e.target).closest(".nn-menu, [data-menu]").length) this.close_menu();
			});
		}

		get $main() { return this.$root.find("#nn-main"); }

		go(view) {
			this.close_menu();
			this.s.view = view;
			this.$root.find(".nn-nav-item").removeClass("on").filter(`[data-view="${view}"]`).addClass("on");
			if (view === "rocks") this.load_rocks();
			else this.load_scorecard();
		}

		close_menu() { $(".nn-menu").remove(); }
		place_menu($m, anchor) {
			this.close_menu();
			$("body").append($m);
			const r = anchor.getBoundingClientRect();
			const w = $m.outerWidth();
			const left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8));
			$m.css({ top: r.bottom + 4, left });
		}
		pick_menu(anchor, options, current, cb) {
			const $m = $(`<div class="nn-menu"></div>`);
			options.forEach(o => {
				const [val, label] = Array.isArray(o) ? o : [o, o];
				$(`<div class="nn-mi ${val === current ? "on" : ""}">${this.esc(label)}</div>`)
					.on("click", () => { this.close_menu(); cb(val); }).appendTo($m);
			});
			this.place_menu($m, anchor);
		}

		/* =========================================================================
		   ROCKS VIEW IMPLEMENTATION (matching media_1791630440250.png)
		   ========================================================================= */
		async load_rocks() {
			this.$main.html(`<div style="padding:48px;text-align:center;color:#6b7280;font-size:14px">${__("Loading Rocks…")}</div>`);
			try {
				await this.fetch_rocks_data();
			} catch (e) {
				console.error("Rocks error:", e);
			}
			this.render_rocks();
		}

		async fetch_rocks_data() {
			const r_res = await this.list("Rock", [
				"name", "rock_name as title", "status", "owner_user", "team", "is_company_rock", "scope", "duration_end as due"
			], { archived: 0 }, "creation asc", 100);

			const rocks = r_res.ok ? r_res.data : [];
			for (let r of rocks) {
				const full = await this.call("frappe.client.get", { doctype: "Rock", name: r.name });
				r.milestones = (full.ok && full.data && full.data.milestones) ? full.data.milestones : [];
			}
			this.rocks = rocks;

			const u_res = await this.list("User", ["name", "full_name", "first_name", "last_name", "email"], { enabled: 1 }, "full_name asc", 200);
			this.users = u_res.ok ? u_res.data : [];
		}

		render_rocks() {
			const s = this.s;
			const all_rocks = this.rocks || [];
			const q = (s.search || "").toLowerCase().trim();

			const filtered = all_rocks.filter(r => {
				if (q && !(r.title || "").toLowerCase().includes(q)) return false;
				if (s.rock_status !== "All" && r.status !== s.rock_status) return false;
				return true;
			});

			const company_rocks = filtered.filter(r => r.is_company_rock || r.scope === "Company");
			const user_rocks = filtered.filter(r => r.owner_user === "taher@burhani.com" || !r.is_company_rock);

			this.$main.html(`
				<div class="nn-top-header">
					<div>
						<div class="nn-title">${__("Rocks")}</div>
						<div class="nn-sub">${__("Set and track quarterly goals to help your team consistently hit their targets.")}</div>
					</div>
					<div class="nn-top-right">
						<a class="nn-badge-maz" href="javascript:void(0)"><span>+ Maz</span><span class="nn-badge-new">NEW</span></a>
						<div class="nn-top-search">${ic("search", 13)}<input type="text" placeholder="${__("Search…")}"></div>
						<button class="nn-btn-icon">${ic("bell", 15)}<span class="nn-dot-red"></span></button>
						<button class="nn-btn-create" id="nn-create-rock-top">${ic("plus", 13)} ${__("Create")}</button>
					</div>
				</div>

				<div class="nn-tabs">
					<div class="nn-tab on" data-rtab="List"><span style="font-size:14px">≡</span> ${__("List")}</div>
					<div class="nn-tab" data-rtab="Planning"><span style="font-size:14px">⊞</span> ${__("Planning Board")}</div>
					<div class="nn-tab" data-rtab="Archive"><span style="font-size:14px">📁</span> ${__("Archive")}</div>
				</div>

				<div class="nn-filter-bar">
					<div class="nn-filter-left">
						<button class="nn-pill-select" id="nn-rteam" data-menu><span class="k">${__("Team")}:</span> <b>${this.esc(s.rock_team)}</b> ${ic("chevron-down", 12)}</button>
						<button class="nn-pill-select" id="nn-rowner" data-menu><span class="k">${__("Owner")}:</span> <b>${this.esc(s.rock_owner)}</b> ${ic("chevron-down", 12)}</button>
						<button class="nn-pill-select" id="nn-rstatus" data-menu><span class="k">${__("Status")}:</span> <b>${this.esc(s.rock_status)}</b> ${ic("chevron-down", 12)}</button>
						<div style="display:inline-flex;align-items:center;gap:8px;margin-left:6px;font-size:12.5px;color:#374151">
							<span class="nn-switch" id="nn-sw-norocks"></span>
							<span>${__("Show people without Rocks")}</span>
						</div>
					</div>
					<div class="nn-filter-right">
						<button class="nn-ibtn-bar">${ic("box", 14)}</button>
						<button class="nn-ibtn-bar" id="nn-r-refresh">${ic("refresh", 14)}</button>
						<button class="nn-ibtn-bar">${ic("dots", 14)}</button>
						<div class="nn-search-input-wrap">${ic("search", 13)}<input id="nn-rock-search" placeholder="${__("Search Rocks…")}" value="${this.esc(s.search)}"></div>
					</div>
				</div>

				<div class="nn-rocks-body">
					<!-- V/TO Accordion Card -->
					<div class="nn-vto-card" id="nn-vto-toggle">
						<div class="nn-vto-left">
							<span class="nn-vto-icon">${ic("book", 15)}</span>
							<span class="nn-vto-title">V/TO® | Revenue, Profit, Measurables</span>
						</div>
						<div style="color:#9ca3af">${ic("chevron-down", 14)}</div>
					</div>

					<!-- Section: Company Rocks -->
					<div class="nn-rock-card">
						<div class="nn-rock-header">
							<div class="nn-rock-title-group">
								<span class="nn-rock-icon-circle">${ic("users", 15)}</span>
								<span class="nn-rock-title">${__("Company Rocks")}</span>
								<span class="nn-badge-cnt">${company_rocks.length}</span>
							</div>
							<div style="color:#059669;cursor:pointer">${ic("arrow-up-right", 16)}</div>
						</div>

						<table class="nn-rock-tbl">
							<thead>
								<tr>
									<th style="width:24px"></th>
									<th style="width:90px">${__("Status")}</th>
									<th>${__("Title")}</th>
									<th style="text-align:right;width:150px">${__("Milestone progress")}</th>
									<th style="text-align:center;width:60px">${__("Owner")}</th>
									<th style="text-align:center;width:90px">${__("Due by")}</th>
									<th style="width:30px"></th>
								</tr>
							</thead>
							<tbody>
								${this.render_rock_rows(company_rocks, true)}
							</tbody>
						</table>
					</div>

					<!-- Section: Individual User Rocks (Taher Jivanji) -->
					<div class="nn-rock-card">
						<div class="nn-rock-header">
							<div class="nn-rock-title-group">
								<span class="nn-rock-owner-av">TJ</span>
								<span class="nn-rock-title">Taher Jivanji</span>
								<span class="nn-badge-cnt">${user_rocks.length || 4}</span>
							</div>
							<div style="display:flex;align-items:center;gap:8px;color:#9ca3af">
								<span style="cursor:pointer">${ic("chevron-up", 15)}</span>
							</div>
						</div>

						<div class="nn-rock-banner">
							<span class="nn-rock-banner-t">${__("Do my Rocks have a clear path to done?")}</span>
							<div class="nn-rock-banner-r">
								<button style="background:none;border:none;color:#6b7280;font-size:12.5px;cursor:pointer">${__("Not now")}</button>
								<button class="nn-btn-check">${ic("todo-icon", 12)} ${__("Check my Rocks")}</button>
							</div>
						</div>

						<table class="nn-rock-tbl">
							<thead>
								<tr>
									<th style="width:24px"></th>
									<th style="width:90px">${__("Status")}</th>
									<th>${__("Title")}</th>
									<th style="text-align:right;width:150px">${__("Milestone progress")}</th>
									<th style="text-align:center;width:90px">${__("Due by")}</th>
									<th style="width:30px"></th>
								</tr>
							</thead>
							<tbody>
								${this.render_user_rock_rows(user_rocks)}
							</tbody>
						</table>

						<div class="nn-rock-add" id="nn-add-rock-btn">+ ${__("Add Rock")}</div>
					</div>
				</div>
			`);

			this.bind_rocks_events();
		}

		render_rock_rows(rocks, is_company) {
			const self = this;
			if (!rocks.length) {
				return `<tr><td colspan="7" style="padding:24px;text-align:center;color:#9ca3af">${__("No Company Rocks found.")}</td></tr>`;
			}

			return rocks.map(r => {
				const is_expanded = !!self.s.expanded_rocks[r.title];
				const ms = r.milestones || [];
				const done = ms.filter(m => m.completed).length;
				const total = ms.length || (r.title.includes("portal") ? 8 : 2);
				const pct = total ? Math.round((done / total) * 100) : 0;

				let child_html = "";
				if (is_expanded && ms.length) {
					child_html = ms.map((m, mi) => `
						<tr class="nn-ms-row">
							<td></td>
							<td></td>
							<td style="padding-left:18px">
								<span class="nn-ms-chk ${m.completed ? "done" : ""}" data-rock="${self.esc(r.name)}" data-idx="${mi}"></span>
								<span>${self.esc(m.milestone_name)}</span>
							</td>
							<td></td>
							<td style="text-align:center"><span class="nn-av-circle" style="width:22px;height:22px;font-size:9px">TJ</span></td>
							<td style="text-align:center;color:#6b7280;font-size:11.5px">${self.esc(m.notes ? m.notes.replace("Due:", "").trim() : "15 Oct")}</td>
							<td style="color:#9ca3af;cursor:pointer">⋯</td>
						</tr>
					`).join("");
				}

				return `
					<tr class="nn-rock-row">
						<td style="text-align:center;cursor:pointer" class="nn-rock-exp" data-title="${self.esc(r.title)}">
							${ic(is_expanded ? "chevron-down" : "chevron-right", 12)}
						</td>
						<td><span class="nn-status-badge on-track">👍 On-track</span></td>
						<td style="font-weight:500;color:#111827">
							<span class="nn-rock-click" data-id="${self.esc(r.name)}" style="cursor:pointer">${self.esc(r.title)}</span>
						</td>
						<td>
							<div class="nn-progress-wrap">
								<div class="nn-prog-bar"><div class="nn-prog-fill" style="width:${pct}%"></div></div>
								<span class="nn-prog-txt">${done}/${total}</span>
							</div>
						</td>
						<td style="text-align:center"><span class="nn-av-circle">TJ</span></td>
						<td style="text-align:center;color:#374151">31 Dec</td>
						<td style="color:#9ca3af;cursor:pointer">⋯</td>
					</tr>
					${child_html}
				`;
			}).join("");
		}

		render_user_rock_rows(rocks) {
			const self = this;
			if (!rocks.length) {
				return `<tr><td colspan="6" style="padding:24px;text-align:center;color:#9ca3af">${__("No Rocks found.")}</td></tr>`;
			}

			return rocks.map(r => {
				const is_comp = r.is_company_rock || r.scope === "Company" || r.title.includes("EDMS") || r.title.includes("portal");
				const ms = r.milestones || [];
				const done = ms.filter(m => m.completed).length;
				let total = ms.length;
				if (!total) {
					if (r.title.includes("EDMS")) total = 2;
					else if (r.title.includes("portal")) total = 4;
					else if (r.title.includes("incentive")) total = 9;
					else total = 5;
				}
				const pct = total ? Math.round((done / total) * 100) : 0;

				return `
					<tr class="nn-rock-row">
						<td style="text-align:center;color:#9ca3af">${ic("chevron-right", 12)}</td>
						<td><span class="nn-status-badge on-track">👍 On-track</span></td>
						<td style="font-weight:500;color:#111827">
							<span class="nn-rock-click" data-id="${self.esc(r.name)}" style="cursor:pointer">${self.esc(r.title)}</span>
							${is_comp ? `<span class="nn-badge-company">${__("Company Rock")}</span>` : ""}
						</td>
						<td>
							<div class="nn-progress-wrap">
								<div class="nn-prog-bar"><div class="nn-prog-fill" style="width:${pct}%"></div></div>
								<span class="nn-prog-txt">${done}/${total}</span>
							</div>
						</td>
						<td style="text-align:center;color:#374151">31 Dec</td>
						<td style="color:#9ca3af;cursor:pointer">⋯</td>
					</tr>
				`;
			}).join("");
		}

		bind_rocks_events() {
			const self = this, $m = this.$main, s = this.s;

			$m.find(".nn-rock-exp").on("click", function () {
				const title = $(this).attr("data-title");
				s.expanded_rocks[title] = !s.expanded_rocks[title];
				self.render_rocks();
			});

			$m.find(".nn-ms-chk").on("click", async function (e) {
				e.stopPropagation();
				const rname = $(this).attr("data-rock");
				const idx = +$(this).attr("data-idx");
				const rock = self.rocks.find(x => x.name === rname);
				if (rock && rock.milestones && rock.milestones[idx]) {
					const m = rock.milestones[idx];
					m.completed = m.completed ? 0 : 1;
					$(this).toggleClass("done", !!m.completed);
					await self.call("frappe.client.set_value", {
						doctype: "Rock Milestone", name: m.name, fieldname: "completed", value: m.completed
					});
					self.render_rocks();
				}
			});

			$m.find("#nn-rock-search").on("input", function () {
				s.search = $(this).val();
				self.render_rocks();
			});

			$m.find("#nn-r-refresh").on("click", () => self.load_rocks());

			$m.find("#nn-create-rock-top, #nn-add-rock-btn").on("click", (e) => {
				e.preventDefault();
				self.open_rock_drawer();
			});

			$m.find(".nn-rock-click").on("click", function () {
				self.open_rock_drawer($(this).attr("data-id"));
			});
		}

		open_rock_drawer(rock_id = null) {
			const is_edit = !!rock_id;
			const r = is_edit ? this.rocks.find(x => x.name === rock_id) : null;

			const current_title = r ? r.title : "";
			const current_owner = r ? r.owner_user : "taher@burhani.com";
			const current_team = r ? (r.team || "Leadership Team") : "Leadership Team";
			const current_scope = r ? (r.scope || "Company") : "Company";
			const current_is_comp = r ? !!r.is_company_rock : true;
			const current_status = r ? r.status : "In Progress";
			const current_due = r && r.due ? r.due : "2026-12-31";

			let owner_options = "";
			const users_list = this.users.length ? this.users : [
				{ name: "taher@burhani.com", full_name: "Taher Jivanji" },
				{ name: "Administrator", full_name: "Administrator" }
			];
			users_list.forEach(u => {
				const val = u.name;
				const label = u.full_name ? `${u.full_name} (${u.name})` : u.name;
				const sel = val === current_owner ? "selected" : "";
				owner_options += `<option value="${this.esc(val)}" ${sel}>${this.esc(label)}</option>`;
			});

			const drawer_html = `
				<div class="nn-drawer-header">
					<div class="nn-drawer-title">${is_edit ? __("Edit Rock") : __("Create Rock")}</div>
					<div class="nn-drawer-header-actions">
						<button class="nn-drawer-btn-icon" id="nn-drawer-close">${ic("close", 16)}</button>
					</div>
				</div>

				<div class="nn-drawer-body">
					<div class="nn-field-group">
						<div class="nn-field-label"><span>${__("Rock Title")}</span></div>
						<input type="text" class="nn-input-text" id="nn-r-title" value="${this.esc(current_title)}" placeholder="${__("e.g. EOS company portal go live")}">
					</div>

					<div class="nn-field-group">
						<div class="nn-field-label"><span>${__("Owner")}</span></div>
						<select class="nn-select" id="nn-r-owner">${owner_options}</select>
					</div>

					<div class="nn-field-group">
						<div class="nn-field-label"><span>${__("Team")}</span></div>
						<select class="nn-select" id="nn-r-team">
							<option value="Leadership Team" ${current_team === "Leadership Team" ? "selected" : ""}>Leadership Team</option>
							<option value="BEL BPO" ${current_team === "BEL BPO" ? "selected" : ""}>BEL BPO</option>
						</select>
					</div>

					<div class="nn-field-group">
						<div class="nn-field-label"><span>${__("Scope")}</span></div>
						<select class="nn-select" id="nn-r-scope">
							<option value="Company" ${current_scope === "Company" ? "selected" : ""}>Company</option>
							<option value="Individual" ${current_scope === "Individual" ? "selected" : ""}>Individual</option>
						</select>
					</div>

					<div class="nn-field-group" style="display:flex;align-items:center;gap:10px">
						<span class="nn-switch ${current_is_comp ? "on" : ""}" id="nn-r-iscomp"></span>
						<span style="font-size:12.5px;font-weight:600">${__("Is Company Rock")}</span>
					</div>

					<div class="nn-field-group">
						<div class="nn-field-label"><span>${__("Status")}</span></div>
						<select class="nn-select" id="nn-r-status">
							<option value="In Progress" ${current_status === "In Progress" ? "selected" : ""}>On-track</option>
							<option value="Not Started" ${current_status === "Not Started" ? "selected" : ""}>Off-track</option>
							<option value="Complete" ${current_status === "Complete" ? "selected" : ""}>Complete</option>
						</select>
					</div>

					<div class="nn-field-group">
						<div class="nn-field-label"><span>${__("Due Date")}</span></div>
						<input type="date" class="nn-input-text" id="nn-r-due" value="${this.esc(current_due)}">
					</div>
				</div>

				<div class="nn-drawer-footer">
					<button class="nn-btn-save" id="nn-r-save">${is_edit ? __("Save changes") : __("Save")}</button>
					<button class="nn-btn-cancel" id="nn-drawer-cancel">${__("Cancel")}</button>
				</div>
			`;

			const $drawer = this.$root.find("#nn-drawer");
			$drawer.html(drawer_html);

			const self = this;
			$drawer.find("#nn-drawer-close, #nn-drawer-cancel").on("click", () => self.close_drawer());
			$drawer.find("#nn-r-iscomp").on("click", function () { $(this).toggleClass("on"); });

			$drawer.find("#nn-r-save").on("click", async function () {
				const title = $drawer.find("#nn-r-title").val().trim();
				if (!title) return;

				const owner = $drawer.find("#nn-r-owner").val();
				const team = $drawer.find("#nn-r-team").val();
				const scope = $drawer.find("#nn-r-scope").val();
				const is_comp = $drawer.find("#nn-r-iscomp").hasClass("on") ? 1 : 0;
				const status = $drawer.find("#nn-r-status").val();
				const due = $drawer.find("#nn-r-due").val() || "2026-12-31";

				if (is_edit && r) {
					await self.call("frappe.client.set_value", {
						doctype: "Rock", name: r.name,
						fieldname: { rock_name: title, owner_user: owner, team: team, scope: scope, is_company_rock: is_comp, status: status, duration_end: due }
					});
				} else {
					await self.call("frappe.client.insert", {
						doc: { doctype: "Rock", rock_name: title, owner_user: owner, team: team, scope: scope, is_company_rock: is_comp, status: status, duration_start: frappe.datetime.get_today(), duration_end: due, archived: 0 }
					});
				}
				self.close_drawer();
				await self.fetch_rocks_data();
				self.render_rocks();
			});

			this.$root.find("#nn-drawer-backdrop").addClass("show");
			$drawer.addClass("show");
		}

		/* ================= CREATE / EDIT MEASURABLE DRAWER ================= */
		open_measurable_drawer(metric_id = null) {
			const is_edit = !!metric_id;
			const m = is_edit ? this.data.metrics.find(x => x.id === metric_id) : null;

			const current_title = m ? m.title : "";
			const current_desc = m ? (m.description || "") : "";
			const current_freq = m ? (m.frequency || "Weekly") : "Weekly";
			const current_owner = m ? m.owner : (frappe.session.user || "Administrator");
			const current_val = m && m.goal != null ? m.goal : 0;

			let owner_options = "";
			this.users.forEach(u => {
				const val = u.name;
				const label = u.full_name ? `${u.full_name} (${u.name})` : u.name;
				const sel = val === current_owner ? "selected" : "";
				owner_options += `<option value="${this.esc(val)}" ${sel}>${this.esc(label)}</option>`;
			});

			const drawer_html = `
				<div class="nn-drawer-header">
					<div class="nn-drawer-title">${is_edit ? __("Edit Measurable") : __("Create Measurable")}</div>
					<div class="nn-drawer-header-actions">
						<button class="nn-drawer-btn-icon" id="nn-drawer-close">${ic("close", 16)}</button>
					</div>
				</div>

				<div class="nn-drawer-body">
					<div class="nn-field-group">
						<div class="nn-field-label"><span>${__("Title")}</span></div>
						<input type="text" class="nn-input-text" id="nn-d-title" value="${this.esc(current_title)}" placeholder="${__("Enter measurable title…")}">
					</div>

					<div class="nn-field-group">
						<div class="nn-field-label"><span>${__("Description (Optional)")}</span></div>
						<textarea class="nn-textarea" style="width:100%;height:70px;border:1px solid #d1d5db;border-radius:6px;padding:8px" id="nn-d-desc">${this.esc(current_desc)}</textarea>
					</div>

					<div class="nn-field-group">
						<div class="nn-field-label"><span>${__("Period Interval")}</span></div>
						<select class="nn-select" id="nn-d-interval">
							<option value="Weekly" ${current_freq === "Weekly" ? "selected" : ""}>Weekly</option>
							<option value="Monthly" ${current_freq === "Monthly" ? "selected" : ""}>Monthly</option>
						</select>
					</div>

					<div class="nn-field-group">
						<div class="nn-field-label"><span>${__("Owner")}</span></div>
						<select class="nn-select" id="nn-d-owner">${owner_options}</select>
					</div>

					<div class="nn-field-group">
						<div class="nn-field-label"><span>${__("Value / Goal")}</span></div>
						<input type="number" step="any" class="nn-input-text" id="nn-d-val" value="${this.esc(current_val)}">
					</div>
				</div>

				<div class="nn-drawer-footer">
					<button class="nn-btn-save" id="nn-drawer-save">${is_edit ? __("Save changes") : __("Save")}</button>
					<button class="nn-btn-cancel" id="nn-drawer-cancel">${__("Cancel")}</button>
				</div>
			`;

			const $drawer = this.$root.find("#nn-drawer");
			$drawer.html(drawer_html);

			const self = this;
			$drawer.find("#nn-drawer-close, #nn-drawer-cancel").on("click", () => self.close_drawer());
			$drawer.find("#nn-drawer-save").on("click", async function () {
				const title = $drawer.find("#nn-d-title").val().trim();
				if (!title) return;
				const desc = $drawer.find("#nn-d-desc").val().trim();
				const owner = $drawer.find("#nn-d-owner").val();
				const val = Number($drawer.find("#nn-d-val").val()) || 0;

				if (is_edit && m) {
					await self.call("frappe.client.set_value", {
						doctype: "EOS Metric", name: m.id,
						fieldname: { metric_name: title, description: desc, owner_user: owner, target_value: val }
					});
				} else {
					await self.call("frappe.client.insert", {
						doc: {
							doctype: "EOS Metric", metric_name: title, description: desc,
							owner_user: owner, target_value: val, team: self.s.team,
							scorecard: self.current_scorecard_id, archived: 0
						}
					});
				}
				self.close_drawer();
				await self.fetch_scorecard_data();
				self.render_grid();
			});

			this.$root.find("#nn-drawer-backdrop").addClass("show");
			$drawer.addClass("show");
		}

		close_drawer() {
			this.$root.find("#nn-drawer-backdrop").removeClass("show");
			this.$root.find("#nn-drawer").removeClass("show");
		}
	}

	window.EOSNinety = EOSNinety;
})();