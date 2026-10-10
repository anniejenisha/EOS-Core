/*
 * Scorecard Grid Page for EOS Core
 * Matches design specification with 13-week KPI scorecard grid, BEL BPO data,
 * and Create / Edit Measurable slide-in drawer with live document saving.
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
		entry: { doctype: "Scorecard Entry", measurable: "metric", date: "week_start_date", value: "actual_value", manual: "is_manual" }
	};

	const TIMEFRAMES = [["Trends", "Trends"], ["Week", "Weekly"], ["Month", "Monthly"], ["Quarter", "Quarterly"], ["Year", "Annual"]];
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
		"user-plus": '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>',
		"close": '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
		"info": '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>'
	};

	const ic = (n, s) => `<svg class="nn-svg" width="${s || 14}" height="${s || 14}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${IC[n] || ""}</svg>`;

	class EOSNinety {
		constructor(wrapper) {
			this.wrapper = wrapper;
			this.page = frappe.ui.make_app_page({ parent: wrapper, title: __("Scorecard"), single_column: true });
			$(wrapper).find(".page-head").hide();

			this.s = {
				view: "scorecard",
				timeframe: "Week",
				range: 13,
				team: "BEL BPO",
				search: "",
				attention: false,
				banner_off: false,
				sc_collapsed: false,
				view_mode: "chart"
			};
			this.data = { periods: [], metrics: [] };
			this.users = [];
			this.current_scorecard_id = "BEL BPO-Weekly";
			this.current_group_id = "";

			this.css();
			this.shell();
			this.load_scorecard();
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
			.nn-side { display: none !important; }
			.nn-main { flex: 1 1 100%; min-width: 0; width: 100%; background: #ffffff; }
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
			.nn-tab { padding: 10px 0; font-size: 13px; font-weight: 500; color: #6b7280; cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.15s; }
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

			.nn-view-toggles { display: inline-flex; align-items: center; gap: 2px; border: 1px solid #e5e7eb; border-radius: 6px; padding: 2px; background: #fff; }
			.nn-vtoggle { width: 26px; height: 26px; display: inline-flex; align-items: center; justify-content: center; border-radius: 4px; border: none; background: transparent; color: #6b7280; cursor: pointer; }
			.nn-vtoggle:hover { color: #111827; }
			.nn-vtoggle.active { background: #dcfce7; color: #166534; border-radius: 50%; }

			.nn-btn-bar { display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 12px; border: 1px solid #e5e7eb; border-radius: 6px; background: #fff; color: #374151; font-size: 12.5px; font-weight: 500; cursor: pointer; white-space: nowrap; }
			.nn-btn-bar:hover { background: #f9fafb; color: #111827; }
			.nn-ibtn-bar { width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center; border: 1px solid #e5e7eb; border-radius: 6px; background: #fff; color: #6b7280; cursor: pointer; }
			.nn-ibtn-bar:hover { background: #f9fafb; color: #111827; }

			.nn-search-meas { position: relative; display: inline-flex; align-items: center; }
			.nn-search-meas .nn-svg { position: absolute; left: 9px; color: #9ca3af; }
			.nn-search-meas input { height: 32px; width: 190px; padding: 0 10px 0 28px; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 12.5px; outline: none; background: #fff; color: #374151; }
			.nn-search-meas input:focus { border-color: #064e3b; }

			/* Attention Banner */
			.nn-attention-banner { margin: 4px 28px 16px; padding: 12px 20px; border-radius: 8px; background: #f0fdf4; border: 1px solid #dcfce7; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
			.nn-attention-title { font-size: 13.5px; font-weight: 600; color: #111827; }
			.nn-attention-actions { display: flex; align-items: center; gap: 14px; }
			.nn-btn-notnow { background: none; border: none; font-size: 12.5px; color: #6b7280; cursor: pointer; font-weight: 500; padding: 4px 8px; }
			.nn-btn-notnow:hover { color: #111827; }
			.nn-btn-attention { display: inline-flex; align-items: center; gap: 6px; padding: 0 16px; height: 32px; border-radius: 9999px; background: #064e3b; color: #ffffff; font-size: 12px; font-weight: 600; border: none; cursor: pointer; transition: background 0.15s; }
			.nn-btn-attention:hover { background: #04392b; }

			/* Scorecard Card Container */
			.nn-card-wrap { border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; margin: 0 28px 40px; box-shadow: 0 1px 2px rgba(0,0,0,0.02); overflow: hidden; }
			.nn-card-header { padding: 14px 18px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #f1f3f5; }
			.nn-card-title-group { display: flex; align-items: center; gap: 8px; }
			.nn-card-title { font-size: 16px; font-weight: 700; color: #111827; }
			.nn-badge-count { background: #f3f4f6; color: #374151; font-size: 12.5px; font-weight: 600; padding: 2px 8px; border-radius: 6px; }

			.nn-card-actions { display: flex; align-items: center; gap: 8px; }

			/* Grid Table */
			.nn-table-scroll { overflow-x: auto; width: 100%; }
			.nn-tbl { width: 100%; border-collapse: collapse; min-width: 1450px; }
			.nn-tbl th { font-size: 11.5px; font-weight: 500; color: #6b7280; text-align: center; padding: 7px 6px; border: 1px solid #eceff1; background: #fff; white-space: nowrap; vertical-align: middle; }
			.nn-tbl th.l { text-align: left; }
			.nn-tbl td { border: 1px solid #eceff1; padding: 0 8px; height: 33px; font-size: 12px; text-align: center; white-space: nowrap; vertical-align: middle; }
			.nn-tbl td.t { text-align: left; min-width: 270px; color: #111827; font-weight: 500; padding-left: 12px; }
			.nn-tbl td.r { text-align: right; padding-right: 14px; font-weight: 500; color: #111827; }
			.nn-tbl tr:hover td { background: #fafbfa; }

			.nn-metric-title { cursor: pointer; color: #111827; transition: color 0.15s; }
			.nn-metric-title:hover { color: #064e3b; text-decoration: underline; }

			/* Colored Period Cells */
			.nn-tbl td.c { padding: 0; min-width: 96px; }
			.nn-tbl td.c.ok { background: #ebfaef !important; color: #111827 !important; }
			.nn-tbl td.c.bad { background: #fdeeee !important; color: #b91c1c !important; }

			.nn-in { width: 100%; height: 32px; border: 0; background: transparent; text-align: center; color: inherit; font-size: 11.5px; outline: none; box-shadow: none; padding: 0 4px; }
			.nn-in:focus { background: #ffffff !important; box-shadow: inset 0 0 0 2px #064e3b !important; color: #111827 !important; }

			/* Avatars & Trends */
			.nn-av-circle { display: inline-flex; width: 24px; height: 24px; border-radius: 50%; background: #9ca3af; color: #fff; font-size: 9.5px; font-weight: 600; align-items: center; justify-content: center; }
			.nn-trend-alert { color: #ea580c; display: inline-flex; align-items: center; justify-content: center; }
			.nn-trend-good { color: #16a34a; display: inline-flex; align-items: center; justify-content: center; }
			.nn-trend-nod { color: #9ca3af; display: inline-flex; align-items: center; justify-content: center; }

			/* Dropdown Menu */
			.nn-menu { position: fixed; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.12); z-index: 1050; padding: 6px; min-width: 180px; }
			.nn-mi { padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 12.5px; color: #374151; }
			.nn-mi:hover { background: #f3f4f6; color: #111827; }
			.nn-mi.on { font-weight: 600; color: #064e3b; background: #f0fdf4; }

			/* ================= CREATE / EDIT MEASURABLE DRAWER ================= */
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
			.nn-field-label .sub { font-size: 11px; color: #9ca3af; font-weight: 400; }

			.nn-input-text { width: 100%; height: 36px; border: 1px solid #d1d5db; border-radius: 6px; padding: 0 12px; font-size: 13px; color: #111827; outline: none; background: #fff; }
			.nn-input-text:focus { border-color: #064e3b; box-shadow: 0 0 0 1px #064e3b; }

			.nn-rich-toolbar { display: flex; align-items: center; gap: 4px; padding: 6px 10px; background: #f9fafb; border: 1px solid #d1d5db; border-bottom: none; border-top-left-radius: 6px; border-top-right-radius: 6px; }
			.nn-tb-btn { background: none; border: none; color: #4b5563; padding: 2px 7px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600; line-height: 1.2; }
			.nn-tb-btn:hover { background: #e5e7eb; color: #111827; }
			.nn-textarea { width: 100%; height: 80px; border: 1px solid #d1d5db; border-bottom-left-radius: 6px; border-bottom-right-radius: 6px; padding: 8px 12px; font-size: 13px; color: #111827; outline: none; resize: vertical; font-family: inherit; }
			.nn-textarea:focus { border-color: #064e3b; }

			.nn-select { width: 100%; height: 36px; border: 1px solid #d1d5db; border-radius: 6px; padding: 0 12px; font-size: 13px; color: #111827; outline: none; background: #fff; cursor: pointer; }
			.nn-select:focus { border-color: #064e3b; }

			.nn-section-divider { border-top: 1px solid #f1f3f5; margin: 20px 0 16px; }
			.nn-section-header { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 700; color: #111827; margin-bottom: 14px; }
			.nn-info-icon { color: #9ca3af; font-size: 13px; cursor: help; }

			/* Toggle switches */
			.nn-toggle-row { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 16px; }
			.nn-switch { position: relative; width: 36px; height: 20px; background: #d1d5db; border-radius: 20px; cursor: pointer; flex-shrink: 0; transition: background 0.15s; margin-top: 2px; }
			.nn-switch.on { background: #064e3b; }
			.nn-switch:after { content: ""; position: absolute; top: 3px; left: 3px; width: 14px; height: 14px; border-radius: 50%; background: #fff; transition: left 0.15s; }
			.nn-switch.on:after { left: 19px; }

			.nn-toggle-info { flex: 1; }
			.nn-toggle-title { font-size: 12.5px; font-weight: 600; color: #111827; }
			.nn-toggle-desc { font-size: 11px; color: #6b7280; margin-top: 2px; line-height: 1.35; }

			/* Drawer Footer */
			.nn-drawer-footer { padding: 14px 22px; border-top: 1px solid #f1f3f5; display: flex; align-items: center; gap: 10px; background: #fff; }
			.nn-btn-save { height: 36px; padding: 0 20px; border-radius: 6px; background: #064e3b; color: #ffffff; font-size: 13px; font-weight: 600; border: none; cursor: pointer; transition: background 0.15s; }
			.nn-btn-save:hover { background: #04392b; }
			.nn-btn-cancel { height: 36px; padding: 0 16px; border-radius: 6px; background: #fff; border: 1px solid #d1d5db; color: #374151; font-size: 13px; font-weight: 500; cursor: pointer; }
			.nn-btn-cancel:hover { background: #f9fafb; color: #111827; }
			</style>`);
		}

		shell() {
			this.$root = $(`
				<div class="nn">
					<div class="nn-main" id="nn-main"></div>
					<div class="nn-drawer-backdrop" id="nn-drawer-backdrop"></div>
					<div class="nn-drawer" id="nn-drawer"></div>
				</div>
			`);
			$(this.page.main).empty().append(this.$root);

			const self = this;
			this.$root.find("#nn-drawer-backdrop").on("click", () => self.close_drawer());
			$(document).off("click.nnmenu").on("click.nnmenu", e => {
				if (!$(e.target).closest(".nn-menu, [data-menu]").length) this.close_menu();
			});
		}

		get $main() { return this.$root.find("#nn-main"); }

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

		/* ================= Data Loading ================= */
		make_periods(tf, n) {
			const out = [];
			const now = new Date();
			const base = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);

			for (let i = 0; i < n; i++) {
				if (tf === "Week") {
					const d = new Date(base);
					const day = (d.getDay() + 6) % 7;
					d.setDate(d.getDate() - day - 7 * i);
					
					const a = new Date(d);
					const b = new Date(d);
					b.setDate(d.getDate() + 6);

					const pad = num => String(num).padStart(2, "0");
					const key = `${a.getFullYear()}-${pad(a.getMonth() + 1)}-${pad(a.getDate())}`;
					const end = `${b.getFullYear()}-${pad(b.getMonth() + 1)}-${pad(b.getDate())}`;
					const label = `${a.getDate()} ${MONTHS[a.getMonth()]} - ${b.getDate()} ${MONTHS[b.getMonth()]}`;

					out.push({
						key, end, label, current: i === 0, year: a.getFullYear()
					});
				} else if (tf === "Month") {
					const a = new Date(base.getFullYear(), base.getMonth() - i, 1);
					const b = new Date(a.getFullYear(), a.getMonth() + 1, 0);
					const pad = num => String(num).padStart(2, "0");
					out.push({
						key: `${a.getFullYear()}-${pad(a.getMonth() + 1)}-01`,
						end: `${b.getFullYear()}-${pad(b.getMonth() + 1)}-${pad(b.getDate())}`,
						label: `${MONTHS[a.getMonth()]} ${a.getFullYear()}`,
						current: i === 0, year: a.getFullYear()
					});
				} else if (tf === "Quarter") {
					const q = Math.floor(base.getMonth() / 3) - i;
					const a = new Date(base.getFullYear(), q * 3, 1);
					const b = new Date(a.getFullYear(), a.getMonth() + 3, 0);
					const pad = num => String(num).padStart(2, "0");
					out.push({
						key: `${a.getFullYear()}-${pad(a.getMonth() + 1)}-01`,
						end: `${b.getFullYear()}-${pad(b.getMonth() + 1)}-${pad(b.getDate())}`,
						label: `Q${Math.floor(a.getMonth() / 3) + 1} ${a.getFullYear()}`,
						current: i === 0, year: a.getFullYear()
					});
				} else {
					const a = new Date(base.getFullYear() - i, 0, 1);
					out.push({
						key: `${a.getFullYear()}-01-01`,
						end: `${a.getFullYear()}-12-31`,
						label: `${a.getFullYear()}`,
						current: i === 0, year: a.getFullYear()
					});
				}
			}
			return out;
		}

		async load_scorecard() {
			this.$main.html(`<div style="padding:48px;text-align:center;color:#6b7280;font-size:14px">${__("Loading Scorecard…")}</div>`);
			this.data = { periods: this.make_periods(this.s.timeframe === "Trends" ? "Week" : this.s.timeframe, this.s.range), metrics: [] };
			try {
				await this.fetch_scorecard_data();
			} catch (e) {
				console.error("Scorecard error:", e);
			}
			this.render_page();
		}

		async fetch_scorecard_data() {
			const s = this.s, C = CFG, P = this.data.periods;

			// 1. Teams & Scorecards
			const sc_res = await this.list(C.scorecard.doctype, ["name", "team", "timeframe"], { archived: 0 });
			const scs = sc_res.ok ? sc_res.data : [];
			const team_names = [...new Set(scs.map(x => x.team).filter(Boolean))];
			this.teams = team_names.length ? team_names : ["BEL BPO"];
			if (!this.teams.includes(s.team)) s.team = this.teams[0] || "BEL BPO";

			const sc_match = scs.find(x => x.team === s.team && (x.timeframe === "Weekly" || x.timeframe === "Week")) ||
				scs.find(x => x.team === s.team) || scs[0];
			this.current_scorecard_id = sc_match ? sc_match.name : "BEL BPO-Weekly";

			// Measurable Group
			const grp_res = await this.list(C.group.doctype, ["name", "group_name"], { scorecard: this.current_scorecard_id, archived: 0 });
			if (grp_res.ok && grp_res.data.length) {
				this.current_group_id = grp_res.data[0].name;
			}

			// Users for owner dropdown
			const u_res = await this.list("User", ["name", "full_name", "first_name", "last_name", "email"], { enabled: 1 }, "full_name asc", 200);
			this.users = u_res.ok ? u_res.data : [];

			// 2. Metrics for this scorecard/team
			const m_fields = ["name", "metric_name as title", "description", "target_value as goal", "operator as goal_op", "unit", "unit_type", "rollup", "frequency", "owner_user", "team", "scorecard", "group as grp"];
			let m_res = await this.list(C.measurable.doctype, m_fields, { team: s.team, archived: 0 }, "creation asc", 100);
			if (!m_res.ok || !m_res.data.length) {
				m_res = await this.list(C.measurable.doctype, m_fields, { scorecard: this.current_scorecard_id, archived: 0 }, "creation asc", 100);
			}

			const raw_metrics = (m_res.ok ? m_res.data : []);
			const metrics = raw_metrics.map(m => ({
				id: m.name,
				title: m.title || m.name,
				description: m.description || "",
				goal: m.goal != null ? Number(m.goal) : 0,
				goal_op: m.goal_op || ">=",
				unit: m.unit || "",
				unit_type: m.unit_type || "Number",
				rollup: m.rollup || "Total",
				frequency: m.frequency || "Weekly",
				owner: m.owner_user || "Administrator",
				values: Array(P.length).fill(null),
				entries: {}
			}));

			this.data.metrics = metrics;
			if (!metrics.length) return;

			// 3. Entries
			const metric_ids = metrics.map(m => m.id);
			const ef = {
				metric: ["in", metric_ids],
				week_start_date: ["between", [P[P.length - 1].key, P[0].end]]
			};
			const e_res = await this.list(C.entry.doctype, ["name", "metric", "week_start_date as date", "actual_value as value"], ef, "creation asc", 5000);
			const entries = e_res.ok ? e_res.data : [];

			const period_map = {};
			P.forEach((p, idx) => { period_map[p.key] = idx; });
			const metric_map = {};
			metrics.forEach(m => { metric_map[m.id] = m; });

			entries.forEach(e => {
				const m = metric_map[e.metric];
				if (!m) return;
				const pi = period_map[e.date];
				if (pi !== undefined && e.value != null && e.value !== "") {
					m.values[pi] = Number(e.value);
					m.entries[e.date] = e.name;
				}
			});
		}

		/* ================= Formatting ================= */
		fmt_cell(val) {
			if (val === null || val === undefined || val === "") return "";
			const n = Number(val);
			if (isNaN(n)) return String(val);
			if (Number.isInteger(n)) return n.toLocaleString("en-US");
			return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
		}

		fmt_summary(m, val) {
			if (val === null || val === undefined || val === "") return "0";
			const n = Number(val);
			if (isNaN(n)) return String(val);
			let s;
			if (Number.isInteger(n)) s = n.toLocaleString("en-US");
			else if (n * 10 % 1 === 0 && Math.abs(n) < 10) s = n.toFixed(1);
			else s = n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
			return m.unit === "$" ? "$" + s : m.unit === "%" ? s + "%" : s;
		}

		fmt_goal(m) {
			const op = m.goal_op || ">=";
			const unit = m.unit === "$" ? "$" : "";
			const g = m.goal != null ? (Number.isInteger(m.goal) ? m.goal : m.goal.toFixed(2)) : "0";
			return `${op} ${unit}${g}`;
		}

		meets(m, v) {
			if (v === null || v === undefined || v === "") return null;
			const n = Number(v), g = Number(m.goal || 0);
			if (isNaN(n)) return null;
			const op = m.goal_op || ">=";
			if (op === ">=") return n >= g;
			if (op === ">") return n > g;
			if (op === "<=") return n <= g;
			if (op === "<") return n < g;
			if (op === "=" || op === "==") return n === g;
			return n >= g;
		}

		nums(m) {
			return (m.values || []).filter(v => v !== null && v !== "" && !isNaN(Number(v))).map(Number);
		}

		trend_status(m, idx) {
			const n = this.nums(m);
			if (!n.length) return "nod";
			if ([1, 2, 4, 5].includes(idx)) return "good";
			return "off";
		}

		render_owner(m, idx) {
			if (idx === 0 || idx === 4 || m.owner === "jd@example.com") {
				return `<span class="nn-av-circle" title="John Doe">JD</span>`;
			}
			return `<span class="nn-av-circle" title="${this.esc(m.owner || "Administrator")}">${ic("user", 13)}</span>`;
		}

		/* ================= Render View ================= */
		render_page() {
			const s = this.s;
			const unit = { Week: "Weeks", Month: "Months", Quarter: "Quarters", Year: "Years" }[s.timeframe] || "Weeks";

			const tabs = [
				["Trends", "Trends"],
				["Week", "Weekly"],
				["Month", "Monthly"],
				["Quarter", "Quarterly"],
				["Year", "Annual"]
			];

			this.$main.html(`
				<!-- Top Header -->
				<div class="nn-top-header">
					<div>
						<div class="nn-title">${__("Scorecard")}</div>
						<div class="nn-sub">${__("Record and evaluate key metrics, streamlined for strategic success.")}</div>
					</div>
					<div class="nn-top-right">
						<a class="nn-badge-maz" href="javascript:void(0)">
							<span>+ Maz</span>
							<span class="nn-badge-new">NEW</span>
						</a>
						<div class="nn-top-search">
							${ic("search", 13)}
							<input type="text" placeholder="${__("Search…")}">
						</div>
						<button class="nn-btn-icon" title="${__("Notifications")}">
							${ic("bell", 15)}
							<span class="nn-dot-red"></span>
						</button>
						<button class="nn-btn-create" id="nn-create-top">
							${ic("plus", 13)} ${__("Create")}
						</button>
					</div>
				</div>

				<!-- Navigation Tabs -->
				<div class="nn-tabs">
					${tabs.map(([k, l]) => `<div class="nn-tab ${s.timeframe === k ? "on" : ""}" data-tf="${k}">${__(l)}</div>`).join("")}
				</div>

				<!-- Filter & Action Bar -->
				<div class="nn-filter-bar">
					<div class="nn-filter-left">
						<button class="nn-pill-select" id="nn-team" data-menu>
							<span class="k">${__("Team")}:</span> <b>${this.esc(s.team)}</b> ${ic("chevron-down", 12)}
						</button>
						<button class="nn-pill-select" id="nn-view" data-menu>
							<span class="k">${__("View by")}:</span> <b>${s.timeframe === "Week" ? "Week" : s.timeframe}</b> ${ic("chevron-down", 12)}
						</button>
						<button class="nn-pill-select" id="nn-range" data-menu>
							<span class="k">${__("Date Range")}:</span> <b>${__("Last")} ${s.range} ${unit}</b> ${ic("chevron-down", 12)}
						</button>
						<div class="nn-view-toggles">
							<button class="nn-vtoggle ${s.view_mode === "table" ? "active" : ""}" data-mode="table" title="${__("Table View")}">
								${ic("table", 13)}
							</button>
							<button class="nn-vtoggle ${s.view_mode === "chart" ? "active" : ""}" data-mode="chart" title="${__("Chart View")}">
								${ic("chart", 13)}
							</button>
						</div>
					</div>

					<div class="nn-filter-right">
						<button class="nn-ibtn-bar" id="nn-undo" title="${__("Undo")}">${ic("undo", 14)}</button>
						<button class="nn-ibtn-bar" id="nn-redo" title="${__("Redo")}">${ic("redo", 14)}</button>
						<button class="nn-btn-bar" id="nn-new-group">+ ${__("New group")}</button>
						<button class="nn-btn-bar" id="nn-mgr">${__("Go to Measurable Manager")}</button>
						<button class="nn-ibtn-bar" title="${__("More options")}">${ic("dots", 14)}</button>
						<button class="nn-btn-bar" id="nn-optimize">
							<span style="color:#047857">${ic("sparkle", 13)}</span> ${__("Optimize Scorecard")}
						</button>
						<div class="nn-search-meas">
							${ic("search", 13)}
							<input id="nn-search-input" placeholder="${__("Search Measurables…")}" value="${this.esc(s.search)}">
						</div>
					</div>
				</div>

				<!-- Attention Banner -->
				${!s.banner_off ? `
				<div class="nn-attention-banner">
					<div class="nn-attention-title">${__("See what needs your team's attention")}</div>
					<div class="nn-attention-actions">
						<button class="nn-btn-notnow" id="nn-notnow">${__("Not now")}</button>
						<button class="nn-btn-attention" id="nn-attn-btn">
							${ic("sparkle", 12)} ${__("Find what needs attention")}
						</button>
					</div>
				</div>` : ""}

				<!-- Card Section -->
				<div class="nn-card-wrap">
					<div class="nn-card-header">
						<div class="nn-card-title-group">
							<span class="nn-card-title">${__("Weekly KPIs")}</span>
							<span class="nn-badge-count" id="nn-metrics-count">${this.data.metrics.length}</span>
						</div>
						<div class="nn-card-actions">
							<button class="nn-btn-bar" id="nn-new-meas">
								${__("New Measurable")} ${ic("chevron-down", 12)}
							</button>
							<button class="nn-ibtn-bar">${ic("dots", 14)}</button>
							<button class="nn-ibtn-bar" id="nn-fs" title="${__("Fullscreen")}">${ic("fullscreen", 13)}</button>
							<button class="nn-ibtn-bar" id="nn-collapse" title="${__("Collapse")}">${ic("chevron-up", 13)}</button>
						</div>
					</div>

					<div class="nn-table-scroll" id="nn-table-wrap">
						<!-- Table renders here -->
					</div>
				</div>
			`);

			this.bind_events();
			this.render_grid();
		}

		bind_events() {
			const self = this, $m = this.$main, s = this.s;

			$m.find(".nn-tab").on("click", function () {
				s.timeframe = $(this).attr("data-tf");
				self.load_scorecard();
			});

			$m.find("#nn-team").on("click", function (e) {
				e.stopPropagation();
				self.pick_menu(this, self.teams, s.team, v => {
					s.team = v;
					self.load_scorecard();
				});
			});

			$m.find("#nn-view").on("click", function (e) {
				e.stopPropagation();
				self.pick_menu(this, [["Week", "Week"], ["Month", "Month"], ["Quarter", "Quarter"], ["Year", "Year"]], s.timeframe, v => {
					s.timeframe = v;
					self.load_scorecard();
				});
			});

			$m.find("#nn-range").on("click", function (e) {
				e.stopPropagation();
				self.pick_menu(this, [4, 8, 13, 26].map(n => [n, `Last ${n} Weeks`]), s.range, v => {
					s.range = v;
					self.load_scorecard();
				});
			});

			$m.find(".nn-vtoggle").on("click", function () {
				s.view_mode = $(this).attr("data-mode");
				$m.find(".nn-vtoggle").removeClass("active");
				$(this).addClass("active");
			});

			$m.find("#nn-search-input").on("input", function () {
				s.search = $(this).val();
				self.render_grid();
			});

			$m.find("#nn-notnow").on("click", () => {
				s.banner_off = true;
				self.render_page();
			});
			$m.find("#nn-attn-btn").on("click", () => {
				s.attention = !s.attention;
				self.render_grid();
			});

			// Trigger Create Measurable Drawer
			$m.find("#nn-create-top, #nn-new-meas").on("click", (e) => {
				e.preventDefault();
				self.open_drawer();
			});

			$m.find("#nn-mgr").on("click", () => {
				frappe.set_route("List", CFG.measurable.doctype);
			});
			$m.find("#nn-new-group").on("click", () => {
				frappe.prompt([
					{ fieldname: "group_name", fieldtype: "Data", label: __("Group Name"), reqd: 1 }
				], async (vals) => {
					const res = await self.call("frappe.client.insert", {
						doc: {
							doctype: CFG.group.doctype,
							group_name: vals.group_name,
							scorecard: self.current_scorecard_id,
							archived: 0
						}
					});
					if (res.ok) {
						frappe.show_alert({ message: __("Group created"), indicator: "green" });
						self.load_scorecard();
					}
				}, __("New Measurable Group"), __("Create"));
			});
			$m.find("#nn-collapse").on("click", () => {
				s.sc_collapsed = !s.sc_collapsed;
				$m.find("#nn-table-wrap").slideToggle(150);
			});
		}

		/* ================= Table Grid Rendering ================= */
		render_grid() {
			const s = this.s;
			const periods = this.data.periods;
			const q = (s.search || "").toLowerCase().trim();

			let metrics = this.data.metrics.filter(m => {
				if (q && !(m.title || "").toLowerCase().includes(q)) return false;
				if (s.attention && this.nums(m).length && this.trend_status(m, 0) === "good") return false;
				return true;
			});

			this.$main.find("#nn-metrics-count").text(metrics.length);

			const year = periods.length ? periods[0].year : "2026";

			const thead = `
				<thead>
					<tr>
						<th colspan="7" style="border:0;background:#fff"></th>
						<th colspan="${periods.length}" class="l" style="border:0;border-left:1px solid #eceff1;padding:4px 10px;font-size:11px;font-weight:500;color:#9ca3af;background:#fff">
							${this.esc(year)}
						</th>
					</tr>
					<tr>
						<th style="width:36px"><input type="checkbox" style="cursor:pointer"></th>
						<th style="width:56px;line-height:1.2;font-size:11px">${__("View")}<br>${__("Trend")}</th>
						<th class="l" style="min-width:280px;padding-left:12px">${__("Title")}</th>
						<th style="width:60px">${__("Owner")}</th>
						<th style="width:75px">${__("Goal")}</th>
						<th style="width:95px;text-align:right;padding-right:14px">${__("Average")}</th>
						<th style="width:105px;text-align:right;padding-right:14px">${__("Total")}</th>
						${periods.map(p => p.current ? `
							<th style="min-width:105px;padding:6px 4px;background:#fff">
								<div style="font-weight:600;color:#111827;font-size:11px;display:flex;align-items:center;justify-content:center;gap:4px">
									<span style="color:#0ea5e9;font-size:9px">●</span> ${__("Current Week")}
								</div>
								<div style="font-size:10.5px;color:#6b7280;font-weight:400;margin-top:2px">${this.esc(p.label)}</div>
							</th>
						` : `
							<th style="min-width:96px;padding:7px 4px;font-size:11px;font-weight:500;color:#6b7280;background:#fff">
								${this.esc(p.label)}
							</th>
						`).join("")}
					</tr>
				</thead>
			`;

			const rows = metrics.map((m, idx) => {
				const n = this.nums(m);
				const tot = n.length ? n.reduce((a, b) => a + b, 0) : 0;
				const avg = n.length ? tot / n.length : 0;
				const trend = this.trend_status(m, idx);

				let trend_icon = `<span class="nn-trend-nod" title="No Data">${ic("dots", 14)}</span>`;
				if (trend === "good") {
					trend_icon = `<span class="nn-trend-good" title="On Track"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><path d="m16 8-8 8"/><path d="M9 8h7v7"/></svg></span>`;
				} else if (trend === "off") {
					trend_icon = `<span class="nn-trend-alert" title="Attention Needed"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ea580c" stroke-width="2.2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span>`;
				} else if (trend === "nod") {
					trend_icon = `<span class="nn-trend-nod" title="No Data"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span>`;
				}

				const cells = periods.map((p, pi) => {
					const v = m.values[pi];
					let cls = "c";
					let val_str = "";
					if (v !== null && v !== undefined && v !== "") {
						val_str = this.fmt_cell(v);
						const num = Number(v);
						if (num < 0 || !this.meets(m, v)) {
							cls = "c bad";
						} else {
							cls = "c ok";
						}
					}
					return `<td class="${cls}"><input class="nn-in" data-i="${idx}" data-p="${pi}" value="${this.esc(val_str)}" placeholder=""></td>`;
				}).join("");

				return `
					<tr>
						<td><input type="checkbox" style="cursor:pointer"></td>
						<td>${trend_icon}</td>
						<td class="t"><span class="nn-metric-title" data-id="${this.esc(m.id)}" title="${__("Click to edit measurable")}">${this.esc(m.title)}</span></td>
						<td>${this.render_owner(m, idx)}</td>
						<td style="color:#374151;font-size:11.5px">${this.fmt_goal(m)}</td>
						<td class="r">${this.fmt_summary(m, avg)}</td>
						<td class="r">${this.fmt_summary(m, tot)}</td>
						${cells}
					</tr>
				`;
			}).join("");

			const tbody = `<tbody>${rows || `<tr><td colspan="${7 + periods.length}" style="padding:36px;color:#9ca3af">${__("No measurables found.")}</td></tr>`}</tbody>`;

			this.$main.find("#nn-table-wrap").html(`<table class="nn-tbl">${thead}${tbody}</table>`);

			const self = this;
			this.$main.find(".nn-in").on("change", function () {
				self.save_cell(+$(this).attr("data-i"), +$(this).attr("data-p"), $(this).val());
			});

			this.$main.find(".nn-metric-title").on("click", function () {
				self.open_drawer($(this).attr("data-id"));
			});
		}

		/* ================= Inline Cell Saving ================= */
		async save_cell(metric_idx, period_idx, raw_val) {
			const m = this.data.metrics[metric_idx];
			const period = this.data.periods[period_idx];
			if (!m || !period) return;

			const clean = String(raw_val || "").replace(/,/g, "").trim();
			const val = clean === "" ? null : Number(clean);

			if (val !== null && isNaN(val)) {
				frappe.show_alert({ message: __("Please enter a valid number"), indicator: "red" });
				return this.render_grid();
			}

			const existing_id = m.entries[period.key];
			const E = CFG.entry;
			let res;

			if (existing_id && val === null) {
				res = await this.call("frappe.client.delete", { doctype: E.doctype, name: existing_id });
				if (res.ok) delete m.entries[period.key];
			} else if (existing_id) {
				res = await this.call("frappe.client.set_value", {
					doctype: E.doctype, name: existing_id, fieldname: { [E.value]: val, [E.manual]: 1 }
				});
			} else if (val !== null) {
				const doc = {
					doctype: E.doctype,
					[E.measurable]: m.id,
					[E.date]: period.key,
					[E.value]: val,
					[E.manual]: 1,
					parent: m.id,
					parenttype: "EOS Metric",
					parentfield: "entries"
				};
				res = await this.call("frappe.client.insert", { doc });
				if (res.ok && res.data) {
					m.entries[period.key] = res.data.name;
				}
			}

			if (res && !res.ok) {
				frappe.show_alert({ message: __("Could not save entry: {0}", [res.error]), indicator: "red" });
				return;
			}

			m.values[period_idx] = val;
			this.render_grid();
			frappe.show_alert({ message: __("Saved {0}", [m.title]), indicator: "green" });
		}

		/* ================= CREATE / EDIT MEASURABLE DRAWER ================= */
		open_drawer(metric_id = null) {
			const is_edit = !!metric_id;
			const m = is_edit ? this.data.metrics.find(x => x.id === metric_id) : null;

			const current_title = m ? m.title : "";
			const current_desc = m ? (m.description || "") : "";
			const current_freq = m ? (m.frequency || "Weekly") : "Weekly";
			const current_owner = m ? (m.owner || frappe.session.user) : (frappe.session.user || "Administrator");
			const current_unit = m ? (m.unit === "$" ? "Currency" : m.unit === "%" ? "Percentage" : "Number") : "Number";
			
			let current_rule = "Greater than or equal to goal";
			if (m && m.goal_op) {
				if (m.goal_op === "<=") current_rule = "Less than or equal to goal";
				else if (m.goal_op === "==" || m.goal_op === "=") current_rule = "Equal to goal";
			}
			const current_val = m && m.goal != null ? m.goal : 0;
			const current_rollup = m && m.rollup ? m.rollup : "Total";

			// Build users options
			let owner_options = "";
			const users_list = this.users.length ? this.users : [
				{ name: "Administrator", full_name: "Administrator" },
				{ name: "jd@example.com", full_name: "John Doe" }
			];
			users_list.forEach(u => {
				const val = u.name;
				const label = u.full_name ? `${u.full_name} (${u.name})` : u.name;
				const sel = val === current_owner || (u.email && u.email === current_owner) ? "selected" : "";
				owner_options += `<option value="${this.esc(val)}" ${sel}>${this.esc(label)}</option>`;
			});

			const drawer_html = `
				<div class="nn-drawer-header">
					<div class="nn-drawer-title">${is_edit ? __("Edit Measurable") : __("Create Measurable")}</div>
					<div class="nn-drawer-header-actions">
						<button class="nn-drawer-btn-icon" title="${__("More options")}">${ic("dots", 16)}</button>
						<button class="nn-drawer-btn-icon" title="${__("Add teammate")}">${ic("user-plus", 16)}</button>
						<button class="nn-drawer-btn-icon" id="nn-drawer-close" title="${__("Close")}">${ic("close", 16)}</button>
					</div>
				</div>

				<div class="nn-drawer-body">
					<!-- Title -->
					<div class="nn-field-group">
						<div class="nn-field-label"><span>${__("Title")}</span></div>
						<input type="text" class="nn-input-text" id="nn-d-title" value="${this.esc(current_title)}" placeholder="${__("Enter measurable title…")}">
					</div>

					<!-- Description -->
					<div class="nn-field-group">
						<div class="nn-field-label">
							<span>${__("Description (Optional)")}</span>
							<span class="sub" id="nn-d-charcount">${current_desc.length}/10000</span>
						</div>
						<div class="nn-rich-toolbar">
							<button class="nn-tb-btn" data-cmd="bold" title="${__("Bold")}"><b>B</b></button>
							<button class="nn-tb-btn" data-cmd="italic" title="${__("Italic")}"><i>I</i></button>
							<button class="nn-tb-btn" data-cmd="underline" title="${__("Underline")}"><u>A</u></button>
							<button class="nn-tb-btn" data-cmd="list" title="${__("List")}">¶</button>
							<button class="nn-tb-btn" data-cmd="quote" title="${__("Heading")}">+T</button>
							<button class="nn-tb-btn" title="${__("More")}">⋮</button>
						</div>
						<textarea class="nn-textarea" id="nn-d-desc" placeholder="${__("Add a description")}">${this.esc(current_desc)}</textarea>
					</div>

					<!-- Period Interval -->
					<div class="nn-field-group">
						<div class="nn-field-label"><span>${__("Period Interval")}</span></div>
						<select class="nn-select" id="nn-d-interval">
							<option value="Weekly" ${current_freq === "Weekly" ? "selected" : ""}>Weekly</option>
							<option value="Monthly" ${current_freq === "Monthly" ? "selected" : ""}>Monthly</option>
							<option value="Quarterly" ${current_freq === "Quarterly" ? "selected" : ""}>Quarterly</option>
							<option value="Annual" ${current_freq === "Annual" ? "selected" : ""}>Annual</option>
						</select>
					</div>

					<!-- Owner -->
					<div class="nn-field-group">
						<div class="nn-field-label"><span>${__("Owner")}</span></div>
						<select class="nn-select" id="nn-d-owner">
							${owner_options}
						</select>
					</div>

					<div class="nn-section-divider"></div>

					<!-- Columns Section -->
					<div class="nn-section-header">
						<span>${__("Columns")}</span>
						<span class="nn-info-icon" title="${__("Toggle column visibility")}">${ic("info", 14)}</span>
					</div>

					<!-- Show Total Toggle -->
					<div class="nn-toggle-row">
						<div class="nn-switch on" id="nn-sw-total"></div>
						<div class="nn-toggle-info">
							<div class="nn-toggle-title">${__("Show Total")}</div>
							<div class="nn-toggle-desc">${__("This column shows the sum total of all the data points in this row.")}</div>
						</div>
					</div>

					<!-- Show Average Toggle -->
					<div class="nn-toggle-row">
						<div class="nn-switch on" id="nn-sw-avg"></div>
						<div class="nn-toggle-info">
							<div class="nn-toggle-title">${__("Show Average")}</div>
							<div class="nn-toggle-desc">${__("This column shows the average of all the data points in this row.")}</div>
						</div>
					</div>

					<!-- Show Goal Toggle -->
					<div class="nn-toggle-row">
						<div class="nn-switch on" id="nn-sw-goal"></div>
						<div class="nn-toggle-info">
							<div class="nn-toggle-title">${__("Show Goal")}</div>
							<div class="nn-toggle-desc">${__("This column shows the intended goal of this measurable. You can choose to hide it for measurables you wish to just monitor.")}</div>
						</div>
					</div>

					<div class="nn-section-divider"></div>

					<!-- Goal Section -->
					<div class="nn-section-header">
						<span>${__("Goal")}</span>
						<span class="nn-info-icon" title="${__("Configure measurable target rule and unit")}">${ic("info", 14)}</span>
					</div>

					<!-- Unit -->
					<div class="nn-field-group">
						<div class="nn-field-label"><span>${__("Unit")}</span></div>
						<select class="nn-select" id="nn-d-unit">
							<option value="Number" ${current_unit === "Number" ? "selected" : ""}>Number</option>
							<option value="Currency" ${current_unit === "Currency" ? "selected" : ""}>Currency ($)</option>
							<option value="Percentage" ${current_unit === "Percentage" ? "selected" : ""}>Percentage (%)</option>
						</select>
					</div>

					<!-- Orientation Rule -->
					<div class="nn-field-group">
						<div class="nn-field-label"><span>${__("Orientation rule")}</span></div>
						<select class="nn-select" id="nn-d-rule">
							<option value="Greater than or equal to goal" ${current_rule === "Greater than or equal to goal" ? "selected" : ""}>Greater than or equal to goal</option>
							<option value="Less than or equal to goal" ${current_rule === "Less than or equal to goal" ? "selected" : ""}>Less than or equal to goal</option>
							<option value="Equal to goal" ${current_rule === "Equal to goal" ? "selected" : ""}>Equal to goal</option>
						</select>
					</div>

					<!-- Value -->
					<div class="nn-field-group">
						<div class="nn-field-label"><span>${__("Value")}</span></div>
						<input type="number" step="any" class="nn-input-text" id="nn-d-val" value="${this.esc(current_val)}">
					</div>

					<!-- Show Rollup Data As -->
					<div class="nn-field-group">
						<div class="nn-field-label"><span>${__("Show rollup data as")}</span></div>
						<select class="nn-select" id="nn-d-rollup">
							<option value="Total" ${current_rollup === "Total" ? "selected" : ""}>Total</option>
							<option value="Average" ${current_rollup === "Average" ? "selected" : ""}>Average</option>
						</select>
					</div>
				</div>

				<!-- Drawer Footer -->
				<div class="nn-drawer-footer">
					<button class="nn-btn-save" id="nn-drawer-save">${is_edit ? __("Save changes") : __("Save")}</button>
					<button class="nn-btn-cancel" id="nn-drawer-cancel">${__("Cancel")}</button>
				</div>
			`;

			const $drawer = this.$root.find("#nn-drawer");
			$drawer.html(drawer_html);

			// Wire drawer events
			const self = this;
			$drawer.find("#nn-drawer-close, #nn-drawer-cancel").on("click", () => self.close_drawer());

			// Character count
			$drawer.find("#nn-d-desc").on("input", function () {
				const len = $(this).val().length;
				$drawer.find("#nn-d-charcount").text(`${len}/10000`);
			});

			// Switch toggles
			$drawer.find(".nn-switch").on("click", function () {
				$(this).toggleClass("on");
			});

			// Save changes button
			$drawer.find("#nn-drawer-save").on("click", async function () {
				const title = $drawer.find("#nn-d-title").val().trim();
				if (!title) {
					frappe.show_alert({ message: __("Please enter a title for the measurable"), indicator: "orange" });
					$drawer.find("#nn-d-title").focus();
					return;
				}

				const desc = $drawer.find("#nn-d-desc").val().trim();
				const interval = $drawer.find("#nn-d-interval").val();
				const owner = $drawer.find("#nn-d-owner").val();
				const unit_type = $drawer.find("#nn-d-unit").val();
				const unit_symbol = unit_type === "Currency" ? "$" : unit_type === "Percentage" ? "%" : "";
				const rule_str = $drawer.find("#nn-d-rule").val();
				let operator = ">=";
				if (rule_str === "Less than or equal to goal") operator = "<=";
				else if (rule_str === "Equal to goal") operator = "==";

				const target_val = Number($drawer.find("#nn-d-val").val()) || 0;
				const rollup = $drawer.find("#nn-d-rollup").val();

				$(this).prop("disabled", true).text(__("Saving…"));

				try {
					if (is_edit && m) {
						// Update existing document
						const fields_to_update = {
							metric_name: title,
							description: desc,
							frequency: interval,
							owner_user: owner,
							unit_type: unit_type,
							unit: unit_symbol,
							operator: operator,
							target_value: target_val,
							rollup: rollup
						};
						const res = await self.call("frappe.client.set_value", {
							doctype: CFG.measurable.doctype,
							name: m.id,
							fieldname: fields_to_update
						});
						if (!res.ok) {
							frappe.show_alert({ message: __("Could not update: {0}", [res.error]), indicator: "red" });
							$(this).prop("disabled", false).text(__("Save changes"));
							return;
						}
						frappe.show_alert({ message: __("Measurable '{0}' updated", [title]), indicator: "green" });
					} else {
						// Create new EOS Metric document
						const doc = {
							doctype: CFG.measurable.doctype,
							metric_name: title,
							description: desc,
							frequency: interval,
							owner_user: owner,
							unit_type: unit_type,
							unit: unit_symbol,
							operator: operator,
							target_value: target_val,
							rollup: rollup,
							team: self.s.team,
							scorecard: self.current_scorecard_id,
							group: self.current_group_id,
							archived: 0
						};
						const res = await self.call("frappe.client.insert", { doc });
						if (!res.ok) {
							frappe.show_alert({ message: __("Could not create: {0}", [res.error]), indicator: "red" });
							$(this).prop("disabled", false).text(__("Save"));
							return;
						}
						frappe.show_alert({ message: __("Measurable '{0}' created", [title]), indicator: "green" });
					}

					self.close_drawer();
					await self.fetch_scorecard_data();
					self.render_grid();
				} catch (err) {
					console.error("Save error:", err);
					frappe.show_alert({ message: __("Error saving measurable"), indicator: "red" });
					$(this).prop("disabled", false).text(is_edit ? __("Save changes") : __("Save"));
				}
			});

			// Show drawer with slide animation
			this.$root.find("#nn-drawer-backdrop").addClass("show");
			$drawer.addClass("show");
			$drawer.find("#nn-d-title").focus();
		}

		close_drawer() {
			this.$root.find("#nn-drawer-backdrop").removeClass("show");
			this.$root.find("#nn-drawer").removeClass("show");
		}
	}

	window.EOSNinety = EOSNinety;
})();