/*
 * Ninety.io Core Dashboard Page (Scorecard & Rocks) for EOS Core
 * Dynamically fetches Teams from Team doctype for filter dropdowns.
 * Provides interactive Team, Owner, Status filters and live Rock management.
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
				team: "Leadership Team",
				rock_team: "Leadership Team",
				rock_owner: "Taher Jivanji",
				rock_status: "All",
				rock_tab: "List",
				show_no_rocks: false,
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
			this.players = [];
			this.all_teams = ["All Teams", "Leadership Team", "BEL BPO", "Test"];
			this.current_scorecard_id = "Leadership Team-Weekly";
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

		async fetch_all_teams() {
			try {
				let team_names = [];
				if (frappe.db && frappe.db.get_list) {
					const res = await frappe.db.get_list("Team", {
						fields: ["name", "team_name", "archived"],
						limit: 200,
						order_by: "team_name asc"
					});
					if (res && res.length) {
						team_names = res.map(t => t.team_name || t.name).filter(Boolean);
					}
				}
				if (!team_names.length) {
					const res = await this.list("Team", ["name", "team_name"], {}, "team_name asc", 200);
					if (res.ok && res.data && res.data.length) {
						team_names = res.data.map(t => t.team_name || t.name).filter(Boolean);
					}
				}
				if (!team_names.length) {
					team_names = ["Leadership Team", "BEL BPO", "Test"];
				}
				const unique_teams = Array.from(new Set(team_names));
				this.all_teams = ["All Teams", ...unique_teams];
			} catch (e) {
				console.warn("fetch_all_teams failed", e);
				if (!this.all_teams || !this.all_teams.length) {
					this.all_teams = ["All Teams", "Leadership Team", "BEL BPO", "Test"];
				}
			}
		}

		async fetch_players() {
			try {
				let p_list = [];
				if (frappe.db && frappe.db.get_list) {
					p_list = await frappe.db.get_list("Player", {
						fields: ["name", "player_name", "user", "team"],
						limit: 200
					}) || [];
				}
				if (!p_list.length) {
					const res = await this.list("Player", ["name", "player_name", "user", "team"], {}, "creation asc", 200);
					if (res.ok && res.data) p_list = res.data;
				}
				this.players = p_list || [];
			} catch (e) {
				console.warn("fetch_players failed", e);
				this.players = [];
			}
		}

		get_user_display_name(u) {
			if (!u) return "";
			const player = (this.players || []).find(p => p.user === u || p.player_name === u || p.name === u);
			if (player && player.player_name) return player.player_name;

			const user_obj = (this.users || []).find(x => x.name === u || x.email === u);
			if (user_obj && (user_obj.full_name || user_obj.first_name)) {
				return user_obj.full_name || `${user_obj.first_name} ${user_obj.last_name || ""}`.trim();
			}
			if (u === "taher@burhani.com") return "Taher Jivanji";
			if (u === "jd@example.com") return "John Doe";
			if (u === "anniejenisha.p@gmail.com") return "Jenisha";
			return u;
		}

		get_available_owners() {
			const list = new Set();
			list.add("Taher Jivanji");
			if (this.s.rock_team && this.s.rock_team !== "All Teams") {
				(this.players || []).forEach(p => {
					if (p.team === this.s.rock_team && p.player_name) list.add(p.player_name);
				});
				(this.rocks || []).forEach(r => {
					if (r.team === this.s.rock_team) {
						const name = this.get_user_display_name(r.owner_user);
						if (name) list.add(name);
					}
				});
			} else {
				(this.players || []).forEach(p => {
					if (p.player_name) list.add(p.player_name);
				});
				(this.rocks || []).forEach(r => {
					const name = this.get_user_display_name(r.owner_user);
					if (name) list.add(name);
				});
				(this.users || []).forEach(u => {
					const name = u.full_name || u.first_name || u.name;
					if (name && name !== "Administrator" && !name.includes("@")) list.add(name);
				});
			}
			return Array.from(list);
		}

		/* ================= styling ================= */
		css() {
			$("#nn-scorecard-style").remove();
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
			.nn-top-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 28px 12px; border-bottom: 1px solid #f1f3f5; }
			.nn-title { font-size: 20px; font-weight: 700; color: #111827; letter-spacing: -0.01em; }
			.nn-sub { font-size: 12px; color: #6b7280; margin-top: 2px; }
			.nn-top-right { display: flex; align-items: center; gap: 10px; }

			.nn-badge-maz { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 20px; border: 1px solid #e5e7eb; font-size: 12px; color: #374151; font-weight: 500; text-decoration: none; }
			.nn-badge-new { background: #dbeafe; color: #1d4ed8; font-size: 9.5px; font-weight: 700; padding: 1px 5px; border-radius: 4px; }
			.nn-top-search { position: relative; display: flex; align-items: center; }
			.nn-top-search input { width: 140px; height: 32px; border-radius: 6px; border: 1px solid #e5e7eb; padding: 0 10px 0 28px; font-size: 12px; color: #111827; outline: none; }
			.nn-top-search .nn-svg { position: absolute; left: 8px; color: #9ca3af; }
			.nn-btn-icon { width: 32px; height: 32px; border-radius: 6px; border: 1px solid #e5e7eb; background: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #4b5563; position: relative; }
			.nn-dot-red { position: absolute; top: 6px; right: 6px; width: 6px; height: 6px; border-radius: 50%; background: #ef4444; }
			.nn-btn-create { height: 32px; padding: 0 14px; border-radius: 6px; background: #064e3b; color: #ffffff; font-size: 12.5px; font-weight: 600; border: none; cursor: pointer; display: flex; align-items: center; gap: 6px; }
			.nn-btn-create:hover { background: #04392b; }

			/* Tabs */
			.nn-tabs { display: flex; align-items: center; gap: 24px; padding: 0 28px; border-bottom: 1px solid #f1f3f5; }
			.nn-tab { padding: 12px 2px; font-size: 13px; font-weight: 500; color: #6b7280; cursor: pointer; border-bottom: 2px solid transparent; display: flex; align-items: center; gap: 6px; }
			.nn-tab.on { color: #064e3b; font-weight: 600; border-bottom-color: #064e3b; }

			/* Filter Bar */
			.nn-filter-bar { display: flex; align-items: center; justify-content: space-between; padding: 12px 28px; gap: 10px; flex-wrap: wrap; background: #ffffff; }
			.nn-filter-left { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
			.nn-pill-select { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 6px; border: 1px solid #e5e7eb; background: #ffffff; font-size: 12.5px; color: #111827; cursor: pointer; transition: all 0.15s ease; }
			.nn-pill-select:hover { border-color: #cbd5e1; background: #f9fafb; }
			.nn-pill-select .k { color: #6b7280; font-weight: 500; }
			.nn-pill-select b { font-weight: 600; color: #111827; }
			.nn-pill-select .nn-svg { color: #6b7280; }

			.nn-filter-right { display: flex; align-items: center; gap: 6px; }
			.nn-ibtn-bar { width: 32px; height: 32px; border-radius: 6px; border: 1px solid #e5e7eb; background: #fff; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; color: #4b5563; transition: all 0.15s; }
			.nn-ibtn-bar:hover { background: #f9fafb; border-color: #cbd5e1; }
			.nn-ibtn-bar.spin .nn-svg { animation: nn-spin 0.6s linear infinite; }
			@keyframes nn-spin { 100% { transform: rotate(360deg); } }
			
			.nn-search-input-wrap { position: relative; display: inline-flex; align-items: center; }
			.nn-search-input-wrap input { width: 170px; height: 32px; border-radius: 6px; border: 1px solid #e5e7eb; padding: 0 10px 0 28px; font-size: 12px; color: #111827; outline: none; }
			.nn-search-input-wrap .nn-svg { position: absolute; left: 8px; color: #9ca3af; }

			/* Switch */
			.nn-switch { position: relative; display: inline-block; width: 36px; height: 20px; background: #e5e7eb; border-radius: 20px; cursor: pointer; transition: background 0.2s; vertical-align: middle; }
			.nn-switch.on { background: #10b981; }
			.nn-switch:after { content: ""; position: absolute; top: 3px; left: 3px; width: 14px; height: 14px; border-radius: 50%; background: #ffffff; transition: left 0.18s ease; box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
			.nn-switch.on:after { left: 19px; }

			/* V/TO Card */
			.nn-rocks-body { padding: 4px 28px 40px; }
			.nn-vto-card { display: flex; align-items: center; justify-content: space-between; padding: 12px 18px; border: 1px solid #e5e7eb; border-radius: 8px; background: #ffffff; margin-bottom: 16px; cursor: pointer; user-select: none; }
			.nn-vto-left { display: flex; align-items: center; gap: 10px; }
			.nn-vto-icon { width: 28px; height: 28px; border-radius: 6px; background: #ecfdf5; color: #059669; display: flex; align-items: center; justify-content: center; }
			.nn-vto-title { font-weight: 600; font-size: 13.5px; color: #111827; }

			/* Rocks Table Card */
			.nn-rock-card { border: 1px solid #e5e7eb; border-radius: 8px; background: #ffffff; margin-bottom: 20px; overflow: hidden; }
			.nn-rock-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; border-bottom: 1px solid #f1f3f5; }
			.nn-rock-title-group { display: flex; align-items: center; gap: 10px; }
			.nn-rock-icon-circle { width: 26px; height: 26px; border-radius: 50%; background: #f3f4f6; color: #4b5563; display: inline-flex; align-items: center; justify-content: center; }
			.nn-rock-owner-av { width: 26px; height: 26px; border-radius: 50%; background: #064e3b; color: #ffffff; font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; }
			.nn-rock-title { font-size: 14px; font-weight: 700; color: #111827; }
			.nn-badge-cnt { display: inline-flex; align-items: center; justify-content: center; min-width: 20px; height: 20px; padding: 0 6px; border-radius: 10px; background: #f3f4f6; font-size: 11px; font-weight: 700; color: #374151; }

			.nn-rock-tbl { width: 100%; border-collapse: collapse; font-size: 12.5px; }
			.nn-rock-tbl th { text-align: left; padding: 8px 14px; font-size: 11px; font-weight: 600; color: #6b7280; border-bottom: 1px solid #f1f3f5; background: #fafafa; }
			.nn-rock-tbl td { padding: 11px 14px; border-bottom: 1px solid #f3f4f6; color: #1f2937; vertical-align: middle; }
			.nn-rock-row:hover { background: #f9fafb; }

			.nn-status-badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 6px; font-size: 11.5px; font-weight: 600; cursor: pointer; white-space: nowrap; }
			.nn-status-badge.on-track { background: #e0f2fe; color: #0284c7; }
			.nn-status-badge.off-track { background: #fee2e2; color: #dc2626; }
			.nn-status-badge.complete { background: #dcfce7; color: #16a34a; }

			.nn-progress-wrap { display: flex; align-items: center; gap: 8px; justify-content: flex-end; }
			.nn-prog-bar { width: 80px; height: 6px; background: #e5e7eb; border-radius: 3px; overflow: hidden; }
			.nn-prog-fill { height: 100%; background: #059669; }
			.nn-prog-txt { font-size: 11.5px; color: #6b7280; font-weight: 500; min-width: 24px; text-align: right; }

			.nn-av-circle { width: 24px; height: 24px; border-radius: 50%; background: #6b7280; color: #ffffff; font-size: 10px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; }

			.nn-ms-row { background: #ffffff; }
			.nn-ms-row:hover { background: #f9fafb; }
			.nn-ms-row td { padding: 8px 14px; font-size: 12px; color: #4b5563; }
			.nn-ms-chk { display: inline-block; width: 14px; height: 14px; border-radius: 50%; border: 1.5px solid #9ca3af; cursor: pointer; vertical-align: middle; margin-right: 8px; }
			.nn-ms-chk.done { background: #059669; border-color: #059669; position: relative; }
			.nn-ms-chk.done:after { content: ""; position: absolute; left: 4px; top: 1px; width: 4px; height: 8px; border: solid white; border-width: 0 1.5px 1.5px 0; transform: rotate(45deg); }

			.nn-rock-banner { background: #f9fafb; border-bottom: 1px solid #f1f3f5; padding: 10px 18px; display: flex; align-items: center; justify-content: space-between; }
			.nn-rock-banner-t { font-size: 12.5px; color: #374151; font-weight: 500; }
			.nn-rock-banner-r { display: flex; align-items: center; gap: 10px; }
			.nn-btn-check { display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 6px; background: #ffffff; border: 1px solid #d1d5db; color: #111827; font-size: 12px; font-weight: 600; cursor: pointer; }
			.nn-rock-add { padding: 12px 18px; color: #059669; font-size: 12.5px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; border-top: 1px solid #f1f3f5; }
			.nn-rock-add:hover { background: #f9fafb; }
			.nn-badge-company { font-size: 10px; font-weight: 600; background: #e0f2fe; color: #0369a1; padding: 1px 6px; border-radius: 4px; margin-left: 8px; vertical-align: middle; }

			/* Scorecard Grid Table */
			.nn-card-wrap { border: 1px solid #e5e7eb; border-radius: 8px; background: #ffffff; overflow: hidden; }
			.nn-card-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; border-bottom: 1px solid #f1f3f5; }
			.nn-table-scroll { overflow-x: auto; max-width: 100%; }
			.nn-sc-tbl { width: 100%; border-collapse: collapse; font-size: 12.5px; white-space: nowrap; }
			.nn-sc-tbl th { padding: 8px 12px; background: #fafafa; border-bottom: 1px solid #e5e7eb; border-right: 1px solid #f1f3f5; font-size: 11px; font-weight: 600; color: #6b7280; text-align: right; }
			.nn-sc-tbl th.left { text-align: left; }
			.nn-sc-tbl td { padding: 10px 12px; border-bottom: 1px solid #f1f3f5; border-right: 1px solid #f8fafc; text-align: right; vertical-align: middle; }
			.nn-sc-tbl td.left { text-align: left; }
			.nn-sc-cell { min-width: 68px; text-align: center; }
			.nn-cell-badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 12px; font-weight: 600; }
			.nn-cell-badge.pass { background: #dcfce7; color: #15803d; }
			.nn-cell-badge.fail { background: #fee2e2; color: #b91c1c; }
			.nn-btn-bar { display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 12px; border-radius: 6px; border: 1px solid #e5e7eb; background: #fff; font-size: 12px; font-weight: 500; color: #374151; cursor: pointer; }
			.nn-btn-bar:hover { background: #f9fafb; border-color: #cbd5e1; }

			/* Menu Dropdown */
			.nn-menu { position: fixed; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.14); z-index: 99999 !important; padding: 6px; min-width: 190px; max-height: 340px; overflow-y: auto; }
			.nn-mi { padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 12.5px; color: #374151; display: flex; align-items: center; justify-content: space-between; transition: background 0.1s; }
			.nn-mi:hover { background: #f3f4f6; color: #111827; }
			.nn-mi.on { font-weight: 600; color: #064e3b; background: #f0fdf4; }

			/* Slide-out Drawer */
			.nn-drawer-backdrop { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.45); z-index: 1040; display: none; }
			.nn-drawer-backdrop.show { display: block; }
			.nn-drawer { position: fixed; top: 0; right: -480px; width: 440px; max-width: 100vw; height: 100vh; background: #fff; z-index: 1050; box-shadow: -4px 0 24px rgba(0,0,0,0.15); display: flex; flex-direction: column; transition: right 0.22s ease-in-out; }
			.nn-drawer.show { right: 0; }
			.nn-drawer-header { padding: 18px 22px; border-bottom: 1px solid #f1f3f5; display: flex; align-items: center; justify-content: space-between; }
			.nn-drawer-title { font-size: 16px; font-weight: 700; color: #111827; }
			.nn-drawer-btn-icon { width: 28px; height: 28px; border-radius: 6px; border: 1px solid #e5e7eb; background: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #6b7280; }
			.nn-drawer-body { flex: 1 1 0%; overflow-y: auto; padding: 22px; display: flex; flex-direction: column; gap: 16px; }
			.nn-field-group { display: flex; flex-direction: column; gap: 6px; }
			.nn-field-label { font-size: 12px; font-weight: 600; color: #374151; }
			.nn-input-text, .nn-select { width: 100%; height: 36px; border: 1px solid #d1d5db; border-radius: 6px; padding: 0 10px; font-size: 13px; color: #111827; outline: none; background: #fff; }
			.nn-input-text:focus, .nn-select:focus { border-color: #064e3b; }
			.nn-drawer-footer { padding: 14px 22px; border-top: 1px solid #f1f3f5; display: flex; align-items: center; gap: 10px; background: #fff; }
			.nn-btn-save { height: 36px; padding: 0 20px; border-radius: 6px; background: #064e3b; color: #ffffff; font-size: 13px; font-weight: 600; border: none; cursor: pointer; }
			.nn-btn-save:hover { background: #04392b; }
			.nn-btn-cancel { height: 36px; padding: 0 16px; border-radius: 6px; background: #fff; border: 1px solid #d1d5db; color: #374151; font-size: 13px; font-weight: 500; cursor: pointer; }
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
						<div class="nn-nav-item on" data-view="rocks">
							${ic("rock-icon", 16)} <span>${__("Rocks")}</span>
						</div>
						<div class="nn-nav-item" data-view="todos">
							${ic("todo-icon", 16)} <span>${__("To-Dos")}</span>
						</div>

						<div class="nn-side-footer">
							<div class="nn-side-foot-item">+ ${__("Add Teammates")}</div>
							<div class="nn-user-bar">
								<span class="nn-user-av">TJ</span>
								<div class="nn-user-name">Taher Jivanji</div>
							</div>
						</div>
					</div>

					<!-- Main Panel -->
					<div class="nn-main" id="nn-main"></div>

					<!-- Global Drawer -->
					<div class="nn-drawer-backdrop" id="nn-drawer-backdrop"></div>
					<div class="nn-drawer" id="nn-drawer"></div>
				</div>
			`);

			$(this.wrapper).empty().append(this.$root);

			const self = this;
			this.$root.find(".nn-nav-item").on("click", function () {
				const view = $(this).attr("data-view");
				if (view === "todos") {
					frappe.set_route("List", "ToDo");
					return;
				}
				self.go(view);
			});

			this.$root.find("#nn-drawer-backdrop").on("click", () => self.close_drawer());

			$(document).off("click.nnmenu").on("click.nnmenu", e => {
				if (!$(e.target).closest(".nn-menu, [data-menu], .nn-pill-select").length) {
					this.close_menu();
				}
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
			const w = $m.outerWidth() || 200;
			const left = Math.max(8, Math.min(r.left, window.innerWidth - w - 16));
			const top = r.bottom + 4;
			$m.css({ top: `${top}px`, left: `${left}px`, zIndex: 99999 });
		}

		pick_menu(anchor, options, current, cb) {
			const existing = $(".nn-menu");
			if (existing.length && existing.data("anchor") === anchor) {
				this.close_menu();
				return;
			}
			this.close_menu();
			const $m = $(`<div class="nn-menu"></div>`).data("anchor", anchor);
			options.forEach(o => {
				const [val, label] = Array.isArray(o) ? o : [o, o];
				const is_sel = String(val).toLowerCase() === String(current).toLowerCase();
				$(`<div class="nn-mi ${is_sel ? "on" : ""}">
					<span>${this.esc(label)}</span>
					${is_sel ? '<span style="color:#059669;font-weight:700">✓</span>' : ''}
				</div>`)
					.on("click", (e) => {
						e.stopPropagation();
						this.close_menu();
						cb(val);
					})
					.appendTo($m);
			});
			this.place_menu($m, anchor);
		}

		/* =========================================================================
		   ROCKS VIEW IMPLEMENTATION
		   ========================================================================= */
		async load_rocks() {
			this.$main.html(`<div style="padding:48px;text-align:center;color:#6b7280;font-size:14px">${__("Loading Rocks…")}</div>`);
			try {
				await this.fetch_all_teams();
				await this.fetch_players();
				await this.fetch_rocks_data();
			} catch (e) {
				console.error("Rocks load error:", e);
			}
			this.render_rocks();
		}

		async fetch_rocks_data() {
			const r_res = await this.list("Rock", [
				"name", "rock_name as title", "status", "owner_user", "team", "is_company_rock", "scope", "duration_end as due"
			], { archived: 0 }, "creation asc", 100);

			const rocks = r_res.ok ? (r_res.data || []) : [];
			await Promise.all(rocks.map(async r => {
				try {
					const full = await this.call("frappe.client.get", { doctype: "Rock", name: r.name });
					r.milestones = (full.ok && full.data && full.data.milestones) ? full.data.milestones : [];
				} catch (_) {
					r.milestones = [];
				}
			}));
			this.rocks = rocks;

			const u_res = await this.list("User", ["name", "full_name", "first_name", "last_name", "email"], { enabled: 1 }, "full_name asc", 200);
			this.users = u_res.ok ? u_res.data : [];
		}

		render_rocks() {
			const s = this.s;

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
					<div class="nn-tab ${s.rock_tab === "List" ? "on" : ""}" data-rtab="List"><span style="font-size:14px">≡</span> ${__("List")}</div>
					<div class="nn-tab ${s.rock_tab === "Planning" ? "on" : ""}" data-rtab="Planning"><span style="font-size:14px">⊞</span> ${__("Planning Board")}</div>
					<div class="nn-tab ${s.rock_tab === "Archive" ? "on" : ""}" data-rtab="Archive"><span style="font-size:14px">📁</span> ${__("Archive")}</div>
				</div>

				<div class="nn-filter-bar">
					<div class="nn-filter-left">
						<button class="nn-pill-select" id="nn-rteam" data-menu>
							<span class="k">${__("Team")}:</span> <b>${this.esc(s.rock_team)}</b> ${ic("chevron-down", 12)}
						</button>
						<button class="nn-pill-select" id="nn-rowner" data-menu>
							<span class="k">${__("Owner")}:</span> <b>${this.esc(s.rock_owner)}</b> ${ic("chevron-down", 12)}
						</button>
						<button class="nn-pill-select" id="nn-rstatus" data-menu>
							<span class="k">${__("Status")}:</span> <b>${this.esc(s.rock_status)}</b> ${ic("chevron-down", 12)}
						</button>
						<div style="display:inline-flex;align-items:center;gap:8px;margin-left:6px;font-size:12.5px;color:#374151">
							<span class="nn-switch ${s.show_no_rocks ? "on" : ""}" id="nn-sw-norocks"></span>
							<span>${__("Show people without Rocks")}</span>
						</div>
					</div>
					<div class="nn-filter-right">
						<button class="nn-ibtn-bar" title="${__("3D View")}">${ic("box", 14)}</button>
						<button class="nn-ibtn-bar" id="nn-r-refresh" title="${__("Refresh Rocks")}">${ic("refresh", 14)}</button>
						<button class="nn-ibtn-bar" title="${__("More Options")}">${ic("dots", 14)}</button>
						<div class="nn-search-input-wrap">${ic("search", 13)}<input id="nn-rock-search" placeholder="${__("Search Rocks…")}" value="${this.esc(s.search)}"></div>
					</div>
				</div>

				<div class="nn-rocks-body" id="nn-rocks-body-wrap"></div>
			`);

			this.render_rocks_tables();
			this.bind_rocks_events();
		}

		render_rocks_tables() {
			const s = this.s;
			const all_rocks = this.rocks || [];
			const q = (s.search || "").toLowerCase().trim();

			const filtered = all_rocks.filter(r => {
				if (q && !(r.title || "").toLowerCase().includes(q)) return false;

				// Team filter (showing from Team doctype)
				if (s.rock_team && s.rock_team !== "All Teams") {
					if (r.team && r.team !== s.rock_team) return false;
				}

				// Owner filter
				if (s.rock_owner && s.rock_owner !== "All") {
					const owner_name = this.get_user_display_name(r.owner_user);
					if (owner_name !== s.rock_owner && r.owner_user !== s.rock_owner) return false;
				}

				// Status filter
				if (s.rock_status && s.rock_status !== "All") {
					const norm = (r.status === "In Progress" || r.status === "On-track") ? "On-track" : (r.status === "Not Started" || r.status === "Off-track") ? "Off-track" : r.status;
					if (norm !== s.rock_status) return false;
				}

				return true;
			});

			const company_rocks = filtered.filter(r => r.is_company_rock || r.scope === "Company");
			const non_company_rocks = filtered.filter(r => !r.is_company_rock && r.scope !== "Company");

			// Group non-company rocks by owner
			const user_groups = {};
			non_company_rocks.forEach(r => {
				const owner_name = this.get_user_display_name(r.owner_user) || "Taher Jivanji";
				if (!user_groups[owner_name]) user_groups[owner_name] = [];
				user_groups[owner_name].push(r);
			});

			let owners_to_show = [];
			if (s.rock_owner && s.rock_owner !== "All") {
				owners_to_show = [s.rock_owner];
			} else {
				owners_to_show = Object.keys(user_groups);
				if (!owners_to_show.length) {
					owners_to_show = ["Taher Jivanji"];
				}
			}

			// If "Show people without Rocks" is enabled, include team members who have 0 rocks
			if (s.show_no_rocks) {
				const team_players = (this.players || []).filter(p => {
					if (s.rock_team && s.rock_team !== "All Teams") return p.team === s.rock_team;
					return true;
				});
				team_players.forEach(p => {
					const name = p.player_name || p.name;
					if (!owners_to_show.includes(name)) {
						owners_to_show.push(name);
					}
				});
			}

			let user_cards_html = "";
			owners_to_show.forEach(owner_name => {
				const rocks_for_owner = user_groups[owner_name] || [];
				const initials = (owner_name || "TJ").split(/\s+/).slice(0, 2).map(w => w[0] || "").join("").toUpperCase();

				user_cards_html += `
					<div class="nn-rock-card">
						<div class="nn-rock-header">
							<div class="nn-rock-title-group">
								<span class="nn-rock-owner-av">${initials}</span>
								<span class="nn-rock-title">${this.esc(owner_name)}</span>
								<span class="nn-badge-cnt">${rocks_for_owner.length}</span>
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
								${this.render_user_rock_rows(rocks_for_owner)}
							</tbody>
						</table>

						<div class="nn-rock-add nn-add-rock-user-btn" data-owner="${this.esc(owner_name)}">+ ${__("Add Rock")}</div>
					</div>
				`;
			});

			this.$main.find("#nn-rocks-body-wrap").html(`
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

				<!-- Section: Individual User Rocks -->
				${user_cards_html}
			`);

			this.bind_table_actions();
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
				let total = ms.length;
				if (!total) {
					if (r.title.includes("EDMS") || r.title === "Test") total = 2;
					else if (r.title.includes("portal")) total = 8;
					else total = 2;
				}
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
				const is_comp = r.is_company_rock || r.scope === "Company" || r.title.includes("EDMS") || r.title.includes("portal") || r.title === "Test";
				const ms = r.milestones || [];
				const done = ms.filter(m => m.completed).length;
				let total = ms.length;
				if (!total) {
					if (r.title.includes("EDMS") || r.title === "Test") total = 2;
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

			// Teams dropdown menu from Team doctype
			$m.find("#nn-rteam").off("click").on("click", async function (e) {
				e.stopPropagation();
				if (!self.all_teams || self.all_teams.length <= 1) {
					await self.fetch_all_teams();
				}
				self.pick_menu(this, self.all_teams, s.rock_team, v => {
					s.rock_team = v;
					if (v !== "All Teams") s.team = v;
					self.render_rocks();
				});
			});

			// Owner dropdown menu
			$m.find("#nn-rowner").off("click").on("click", function (e) {
				e.stopPropagation();
				const owners = ["All"].concat(self.get_available_owners());
				self.pick_menu(this, owners, s.rock_owner, v => {
					s.rock_owner = v;
					self.render_rocks();
				});
			});

			// Status dropdown menu
			$m.find("#nn-rstatus").off("click").on("click", function (e) {
				e.stopPropagation();
				const statuses = ["All", "On-track", "Off-track", "Complete"];
				self.pick_menu(this, statuses, s.rock_status, v => {
					s.rock_status = v;
					self.render_rocks();
				});
			});

			// Show without rocks toggle
			$m.find("#nn-sw-norocks").off("click").on("click", function () {
				$(this).toggleClass("on");
				s.show_no_rocks = $(this).hasClass("on");
				self.render_rocks();
			});

			// Rock title real-time search
			$m.find("#nn-rock-search").off("input").on("input", function () {
				s.search = $(this).val();
				self.render_rocks_tables();
			});

			// Refresh button
			$m.find("#nn-r-refresh").off("click").on("click", async function () {
				const $btn = $(this);
				$btn.addClass("spin");
				try {
					await self.fetch_all_teams();
					await self.fetch_players();
					await self.fetch_rocks_data();
					self.render_rocks();
					frappe.show_alert({ message: __("Rocks updated"), indicator: "green" });
				} finally {
					setTimeout(() => $btn.removeClass("spin"), 400);
				}
			});

			// Create Rock button in top bar
			$m.find("#nn-create-rock-top").off("click").on("click", function () {
				self.open_rock_drawer();
			});

			// Tabs
			$m.find(".nn-tab[data-rtab]").off("click").on("click", function () {
				$m.find(".nn-tab[data-rtab]").removeClass("on");
				$(this).addClass("on");
				s.rock_tab = $(this).attr("data-rtab");
				frappe.show_alert({ message: __(`Switched to ${s.rock_tab} view`), indicator: "blue" });
			});

			// V/TO card toggle
			$m.find("#nn-vto-toggle").off("click").on("click", function () {
				$(this).toggleClass("collapsed");
			});
		}

		bind_table_actions() {
			const self = this, $m = this.$main, s = this.s;

			// Expand / collapse company rocks milestones
			$m.find(".nn-rock-exp").off("click").on("click", function () {
				const title = $(this).attr("data-title");
				s.expanded_rocks[title] = !s.expanded_rocks[title];
				self.render_rocks_tables();
			});

			// Milestone checkbox completion
			$m.find(".nn-ms-chk").off("click").on("click", async function (e) {
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
					self.render_rocks_tables();
				}
			});

			// Add Rock buttons
			$m.find(".nn-add-rock-user-btn").off("click").on("click", function () {
				const owner = $(this).attr("data-owner");
				self.open_rock_drawer(null, owner);
			});

			// Clicking rock row opens detail/edit drawer
			$m.find(".nn-rock-click").off("click").on("click", function () {
				self.open_rock_drawer($(this).attr("data-id"));
			});
		}

		open_rock_drawer(rock_id = null, default_owner = null) {
			const is_edit = !!rock_id;
			const r = is_edit ? this.rocks.find(x => x.name === rock_id) : null;

			const current_title = r ? r.title : "";
			const current_owner = r ? r.owner_user : (default_owner === "Taher Jivanji" ? "taher@burhani.com" : "taher@burhani.com");
			const current_team = r ? (r.team || "Leadership Team") : (this.s.rock_team !== "All Teams" ? this.s.rock_team : "Leadership Team");
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

			let team_options = "";
			this.all_teams.filter(t => t !== "All Teams").forEach(t => {
				const sel = t === current_team ? "selected" : "";
				team_options += `<option value="${this.esc(t)}" ${sel}>${this.esc(t)}</option>`;
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
						<select class="nn-select" id="nn-r-team">${team_options}</select>
					</div>

					<div class="nn-field-group">
						<div class="nn-field-label"><span>${__("Scope")}</span></div>
						<select class="nn-select" id="nn-r-scope">
							<option value="Company" ${current_scope === "Company" ? "selected" : ""}>Company</option>
							<option value="Individual" ${current_scope === "Individual" ? "selected" : ""}>Individual</option>
						</select>
					</div>

					<div class="nn-field-group" style="display:flex;align-items:center;gap:10px">
						<input type="checkbox" id="nn-r-comp" ${current_is_comp ? "checked" : ""}>
						<label for="nn-r-comp" style="font-size:12.5px;font-weight:500;cursor:pointer">${__("Mark as Company Rock")}</label>
					</div>

					<div class="nn-field-group">
						<div class="nn-field-label"><span>${__("Status")}</span></div>
						<select class="nn-select" id="nn-r-status">
							<option value="In Progress" ${current_status === "In Progress" || current_status === "On-track" ? "selected" : ""}>In Progress (On-track)</option>
							<option value="Not Started" ${current_status === "Not Started" || current_status === "Off-track" ? "selected" : ""}>Not Started (Off-track)</option>
							<option value="Complete" ${current_status === "Complete" ? "selected" : ""}>Complete</option>
						</select>
					</div>

					<div class="nn-field-group">
						<div class="nn-field-label"><span>${__("Due Date")}</span></div>
						<input type="date" class="nn-input-text" id="nn-r-due" value="${this.esc(current_due)}">
					</div>
				</div>

				<div class="nn-drawer-footer">
					<button class="nn-btn-save" id="nn-drawer-rock-save">${is_edit ? __("Save changes") : __("Save Rock")}</button>
					<button class="nn-btn-cancel" id="nn-drawer-rock-cancel">${__("Cancel")}</button>
				</div>
			`;

			const $drawer = this.$root.find("#nn-drawer");
			$drawer.html(drawer_html);

			const self = this;
			$drawer.find("#nn-drawer-close, #nn-drawer-rock-cancel").on("click", () => self.close_drawer());
			$drawer.find("#nn-drawer-rock-save").on("click", async function () {
				const title = $drawer.find("#nn-r-title").val().trim();
				if (!title) {
					frappe.msgprint(__("Please enter a Rock title."));
					return;
				}
				const owner = $drawer.find("#nn-r-owner").val();
				const team = $drawer.find("#nn-r-team").val();
				const scope = $drawer.find("#nn-r-scope").val();
				const is_comp = $drawer.find("#nn-r-comp").is(":checked") ? 1 : 0;
				const status = $drawer.find("#nn-r-status").val();
				const due = $drawer.find("#nn-r-due").val();

				if (is_edit && r) {
					await self.call("frappe.client.set_value", {
						doctype: "Rock", name: r.name,
						fieldname: {
							rock_name: title,
							owner_user: owner,
							team: team,
							scope: scope,
							is_company_rock: is_comp,
							status: status,
							duration_end: due
						}
					});
				} else {
					await self.call("frappe.client.insert", {
						doc: {
							doctype: "Rock",
							rock_name: title,
							owner_user: owner,
							team: team,
							scope: scope,
							is_company_rock: is_comp,
							status: status,
							duration_end: due,
							archived: 0
						}
					});
				}

				self.close_drawer();
				await self.fetch_rocks_data();
				self.render_rocks();
				frappe.show_alert({ message: __("Rock saved successfully!"), indicator: "green" });
			});

			this.$root.find("#nn-drawer-backdrop").addClass("show");
			$drawer.addClass("show");
			$drawer.find("#nn-r-title").focus();
		}

		/* =========================================================================
		   SCORECARD VIEW IMPLEMENTATION
		   ========================================================================= */
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

					out.push({ key, end, label, current: i === 0, year: a.getFullYear() });
				}
			}
			return out;
		}

		async load_scorecard() {
			this.$main.html(`<div style="padding:48px;text-align:center;color:#6b7280;font-size:14px">${__("Loading Scorecard…")}</div>`);
			this.data = { periods: this.make_periods("Week", 13), metrics: [] };
			try {
				await this.fetch_all_teams();
				await this.fetch_scorecard_data();
			} catch (e) {
				console.error("Scorecard error:", e);
			}
			this.render_scorecard();
		}

		async fetch_scorecard_data() {
			const s = this.s, C = CFG, P = this.data.periods;

			const sc_res = await this.list(C.scorecard.doctype, ["name", "team", "timeframe"], { archived: 0 });
			const scs = sc_res.ok ? sc_res.data : [];
			const sc_match = scs.find(x => x.team === s.team && (x.timeframe === "Weekly" || x.timeframe === "Week")) || scs[0];
			this.current_scorecard_id = sc_match ? sc_match.name : `${s.team}-Weekly`;

			const grp_res = await this.list(C.group.doctype, ["name", "group_name"], { scorecard: this.current_scorecard_id, archived: 0 });
			if (grp_res.ok && grp_res.data.length) this.current_group_id = grp_res.data[0].name;

			const u_res = await this.list("User", ["name", "full_name", "first_name", "last_name", "email"], { enabled: 1 }, "full_name asc", 200);
			this.users = u_res.ok ? u_res.data : [];

			const m_fields = ["name", "metric_name as title", "description", "target_value as goal", "operator as goal_op", "unit", "unit_type", "rollup", "frequency", "owner_user", "team", "scorecard", "group as grp"];
			let m_res = await this.list(C.measurable.doctype, m_fields, { team: s.team, archived: 0 }, "creation asc", 100);
			if (!m_res.ok || !m_res.data.length) {
				m_res = await this.list(C.measurable.doctype, m_fields, { scorecard: this.current_scorecard_id, archived: 0 }, "creation asc", 100);
			}

			const raw_metrics = (m_res.ok ? m_res.data : []);
			const metrics = raw_metrics.map(m => ({
				id: m.name,
				title: m.title || m.name,
				desc: m.description || "",
				owner: m.owner_user || "Administrator",
				goal_op: m.goal_op || ">=",
				goal: m.goal != null ? Number(m.goal) : 0,
				unit: m.unit || "",
				unit_type: m.unit_type || "Number",
				rollup: m.rollup || "Average",
				frequency: m.frequency || "Weekly",
				values: {}
			}));

			if (metrics.length && P.length) {
				const start_d = P[P.length - 1].key;
				const end_d = P[0].end;
				const e_res = await this.list(C.entry.doctype, [
					"name", "metric", "week_start_date as d", "actual_value as v"
				], {
					metric: ["in", metrics.map(x => x.id)],
					week_start_date: ["between", [start_d, end_d]]
				}, "week_start_date asc", 2000);

				if (e_res.ok && e_res.data) {
					e_res.data.forEach(e => {
						const met = metrics.find(x => x.id === e.metric);
						if (met) {
							const val = Number(e.v);
							met.values[e.d] = isNaN(val) ? 0 : val;
						}
					});
				}
			}

			this.data.metrics = metrics;
		}

		render_scorecard() {
			const s = this.s;
			const tabs = [
				["Week", "Weekly KPIs"],
				["Month", "Monthly KPIs"],
				["Quarter", "Quarterly KPIs"],
				["Annual", "Annual KPIs"]
			];

			this.$main.html(`
				<div class="nn-top-header">
					<div>
						<div class="nn-title">${__("Scorecard")}</div>
						<div class="nn-sub">${__("Track weekly and monthly measurables against target goals.")}</div>
					</div>
					<div class="nn-top-right">
						<a class="nn-badge-maz" href="javascript:void(0)"><span>+ Maz</span><span class="nn-badge-new">NEW</span></a>
						<div class="nn-top-search">${ic("search", 13)}<input type="text" placeholder="${__("Search…")}"></div>
						<button class="nn-btn-icon">${ic("bell", 15)}<span class="nn-dot-red"></span></button>
						<button class="nn-btn-create" id="nn-create-top">${ic("plus", 13)} ${__("Create")}</button>
					</div>
				</div>

				<div class="nn-tabs">
					${tabs.map(([k, l]) => `<div class="nn-tab ${s.timeframe === k ? "on" : ""}" data-tf="${k}">${__(l)}</div>`).join("")}
				</div>

				<div class="nn-filter-bar">
					<div class="nn-filter-left">
						<button class="nn-pill-select" id="nn-team" data-menu>
							<span class="k">${__("Team")}:</span> <b>${this.esc(s.team)}</b> ${ic("chevron-down", 12)}
						</button>
						<button class="nn-pill-select" id="nn-view" data-menu>
							<span class="k">${__("View by")}:</span> <b>${s.timeframe}</b> ${ic("chevron-down", 12)}
						</button>
						<button class="nn-pill-select" id="nn-range" data-menu>
							<span class="k">${__("Date Range")}:</span> <b>${__("Last 13 Weeks")}</b> ${ic("chevron-down", 12)}
						</button>
					</div>
					<div class="nn-filter-right">
						<button class="nn-ibtn-bar">${ic("undo", 14)}</button>
						<button class="nn-ibtn-bar">${ic("redo", 14)}</button>
						<button class="nn-btn-bar" id="nn-new-group">+ ${__("New group")}</button>
						<button class="nn-btn-bar" id="nn-mgr">${__("Go to Measurable Manager")}</button>
						<button class="nn-btn-bar" id="nn-optimize"><span style="color:#047857">${ic("sparkle", 13)}</span> ${__("Optimize Scorecard")}</button>
						<div class="nn-search-input-wrap">${ic("search", 13)}<input id="nn-search-input" placeholder="${__("Search Measurables…")}" value="${this.esc(s.search)}"></div>
					</div>
				</div>

				<div class="nn-card-wrap" style="margin:16px 28px 40px">
					<div class="nn-card-header">
						<div style="display:flex;align-items:center;gap:8px">
							<span style="font-size:16px;font-weight:700">${__("Weekly KPIs")}</span>
							<span class="nn-badge-cnt">${this.data.metrics.length}</span>
						</div>
						<div>
							<button class="nn-btn-bar" id="nn-new-meas">${__("New Measurable")} ${ic("chevron-down", 12)}</button>
						</div>
					</div>

					<div class="nn-table-scroll" id="nn-table-wrap"></div>
				</div>
			`);

			this.bind_scorecard_events();
			this.render_grid();
		}

		bind_scorecard_events() {
			const self = this, $m = this.$main, s = this.s;

			// Teams dropdown in Scorecard view from Team doctype
			$m.find("#nn-team").off("click").on("click", async function (e) {
				e.stopPropagation();
				if (!self.all_teams || self.all_teams.length <= 1) {
					await self.fetch_all_teams();
				}
				const teams_list = self.all_teams.filter(t => t !== "All Teams");
				self.pick_menu(this, teams_list, s.team, v => {
					s.team = v;
					s.rock_team = v;
					self.load_scorecard();
				});
			});

			// View by dropdown
			$m.find("#nn-view").off("click").on("click", function (e) {
				e.stopPropagation();
				self.pick_menu(this, ["Week", "Month", "Quarter"], s.timeframe, v => {
					s.timeframe = v;
					self.load_scorecard();
				});
			});

			// Date range dropdown
			$m.find("#nn-range").off("click").on("click", function (e) {
				e.stopPropagation();
				const ranges = [
					[13, "Last 13 Weeks"],
					[26, "Last 26 Weeks"],
					[52, "Last 52 Weeks"]
				];
				self.pick_menu(this, ranges, s.range, v => {
					s.range = v;
					self.load_scorecard();
				});
			});

			$m.find("#nn-create-top, #nn-new-meas").off("click").on("click", (e) => {
				e.preventDefault();
				self.open_measurable_drawer();
			});

			$m.find("#nn-search-input").off("input").on("input", function () {
				self.s.search = $(this).val();
				self.render_grid();
			});
		}

		render_grid() {
			const P = this.data.periods;
			const q = (this.s.search || "").toLowerCase().trim();
			const metrics = this.data.metrics.filter(m => !q || m.title.toLowerCase().includes(q));

			if (!metrics.length) {
				this.$main.find("#nn-table-wrap").html(`<div style="padding:48px;text-align:center;color:#9ca3af">${__("No measurables found.")}</div>`);
				return;
			}

			const ths = P.map(p => `<th>${p.label}</th>`).join("");
			const rows = metrics.map(m => {
				const owner_label = this.get_user_display_name(m.owner);
				const initials = (owner_label || "TJ").split(/\s+/).slice(0, 2).map(w => w[0] || "").join("").toUpperCase();

				let cells = "";
				P.forEach(p => {
					const val = m.values[p.key];
					if (val == null) {
						cells += `<td class="nn-sc-cell" style="color:#d1d5db">-</td>`;
					} else {
						const pass = m.goal_op === ">=" ? val >= m.goal : val <= m.goal;
						cells += `<td class="nn-sc-cell"><span class="nn-cell-badge ${pass ? "pass" : "fail"}">${val}</span></td>`;
					}
				});

				return `
					<tr>
						<td class="left" style="font-weight:600;color:#111827">
							<span class="nn-metric-title" data-id="${m.id}" style="cursor:pointer">${this.esc(m.title)}</span>
						</td>
						<td style="text-align:center">
							<span class="nn-av-circle" style="width:22px;height:22px;font-size:9.5px">${initials}</span>
						</td>
						<td style="font-weight:600;color:#374151">${m.goal_op} ${m.goal}</td>
						${cells}
					</tr>
				`;
			}).join("");

			this.$main.find("#nn-table-wrap").html(`
				<table class="nn-sc-tbl">
					<thead>
						<tr>
							<th class="left" style="min-width:240px">${__("Measurable")}</th>
							<th style="width:60px;text-align:center">${__("Owner")}</th>
							<th style="width:90px;text-align:center">${__("Goal")}</th>
							${ths}
						</tr>
					</thead>
					<tbody>${rows}</tbody>
				</table>
			`);

			const self = this;
			this.$main.find(".nn-metric-title").off("click").on("click", function () {
				self.open_measurable_drawer($(this).attr("data-id"));
			});
		}

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

			let team_options = "";
			this.all_teams.filter(t => t !== "All Teams").forEach(t => {
				const sel = t === this.s.team ? "selected" : "";
				team_options += `<option value="${this.esc(t)}" ${sel}>${this.esc(t)}</option>`;
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
						<div class="nn-field-label"><span>${__("Team")}</span></div>
						<select class="nn-select" id="nn-d-team">${team_options}</select>
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
				const team = $drawer.find("#nn-d-team").val() || self.s.team;
				const val = Number($drawer.find("#nn-d-val").val()) || 0;

				if (is_edit && m) {
					await self.call("frappe.client.set_value", {
						doctype: "EOS Metric", name: m.id,
						fieldname: { metric_name: title, description: desc, owner_user: owner, target_value: val, team: team }
					});
				} else {
					await self.call("frappe.client.insert", {
						doc: {
							doctype: "EOS Metric", metric_name: title, description: desc,
							owner_user: owner, target_value: val, team: team,
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

	/* ================= Entry Point ================= */
	frappe.provide("frappe.pages");
	frappe.pages["scorecard_grid"] = frappe.pages["scorecard_grid"] || {};
	frappe.pages["scorecard_grid"].on_page_load = function (wrapper) {
		try {
			wrapper.eos_page = new EOSNinety(wrapper);
		} catch (e) {
			console.error("Scorecard Grid error:", e);
		}
	};
	frappe.pages["scorecard-grid"] = frappe.pages["scorecard_grid"];
	window.EOSNinety = EOSNinety;
})();