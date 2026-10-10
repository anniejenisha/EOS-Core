/*
 * Ninety.io Core Dashboard Page (Scorecard & Rocks) for EOS Core
 * Dynamically fetches Teams from Team doctype for filter dropdowns.
 * Provides interactive Team, Owner, Status filters and live Rock management.
 * Includes inline editable scorecard cells with Goal comparison (Red when less than goal, Green when >= goal).
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
		"arrow-down": '<line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>',
		"clock": '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
		"check": '<polyline points="20 6 9 17 4 12"/>',
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
				team: "All Teams",
				rock_team: "All Teams",
				rock_owner: "All",
				rock_status: "All",
				rock_tab: "List",
				show_no_rocks: false,
				search: "",
				attention: false,
				banner_off: false,
				sc_collapsed: false,
				view_mode: "chart",
				expanded_rocks: {},

				// To-Dos State
				todo_team: "All Teams",
				todo_owner: "All",
				todo_tab: "Team",
				todo_archive: false,
				todo_search: "",
				todo_sort_dir: "asc"
			};
			this.data = { periods: [], metrics: [] };
			this.rocks = [];
			this.todos = [];
			this.users = [];
			this.players = [];
			this.all_teams = ["All Teams"];
			this.current_scorecard_id = "";
			this.current_group_id = "";

			this.preload_doctypes();
			this.css();
			this.shell();
			this.go(this.s.view);
		}

		async preload_doctypes() {
			const dtypes = ["Rock", "To Do", "EOS Metric", "Team", "Player"];
			for (const dt of dtypes) {
				if (frappe.model && frappe.model.with_doctype) {
					try {
						await frappe.model.with_doctype(dt);
					} catch (_) {}
				}
			}
		}

		get_field_label(doctype, fieldname, fallback = "") {
			try {
				if (frappe.meta && frappe.meta.get_docfield) {
					const df = frappe.meta.get_docfield(doctype, fieldname);
					if (df && df.label) return __(df.label);
				}
				if (frappe.get_meta) {
					const meta = frappe.get_meta(doctype);
					if (meta && meta.fields) {
						const df = meta.fields.find(f => f.fieldname === fieldname);
						if (df && df.label) return __(df.label);
					}
				}
			} catch (_) {}
			return fallback ? __(fallback) : fieldname;
		}

		get_doctype_label(doctype, fallback = "") {
			try {
				if (frappe.get_meta) {
					const meta = frappe.get_meta(doctype);
					if (meta && meta.name) return __(meta.name);
				}
			} catch (_) {}
			return fallback ? __(fallback) : doctype;
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
				const unique_teams = Array.from(new Set(team_names));
				this.all_teams = ["All Teams", ...unique_teams];
				if (this.s.team === "All Teams" && unique_teams.length > 0) {
					this.s.team = unique_teams[0];
				}
			} catch (e) {
				console.warn("fetch_all_teams failed", e);
				if (!this.all_teams || !this.all_teams.length) {
					this.all_teams = ["All Teams"];
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
			return u;
		}

		get_available_owners(team = null) {
			const list = new Set();
			const active_team = team || (this.s.view === "todos" ? this.s.todo_team : this.s.rock_team);
			if (active_team && active_team !== "All Teams") {
				(this.players || []).forEach(p => {
					if (p.team === active_team && p.player_name) list.add(p.player_name);
				});
				(this.todos || []).forEach(td => {
					if (td.team === active_team) {
						const name = this.get_user_display_name(td.owner_user);
						if (name) list.add(name);
					}
				});
				(this.rocks || []).forEach(r => {
					if (r.team === active_team) {
						const name = this.get_user_display_name(r.owner_user);
						if (name) list.add(name);
					}
				});
			} else {
				(this.players || []).forEach(p => {
					if (p.player_name) list.add(p.player_name);
				});
				(this.todos || []).forEach(td => {
					const name = this.get_user_display_name(td.owner_user);
					if (name) list.add(name);
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

		get_initials(name) {
			if (!name) return "—";
			const clean = String(name).trim();
			if (clean.includes("@")) {
				return clean.substring(0, 2).toUpperCase();
			}
			const parts = clean.split(/\s+/);
			if (parts.length >= 2) {
				return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
			}
			return clean.substring(0, 2).toUpperCase();
		}

		diff_days(d1_str, d2_str) {
			const d1 = new Date(d1_str);
			const d2 = new Date(d2_str);
			return Math.round((d1 - d2) / (1000 * 60 * 60 * 24));
		}

		format_todo_due(due_str) {
			if (!due_str) return { html: `<span style="color:#9ca3af">—</span>` };
			const parts = due_str.split("-");
			if (parts.length < 3) return { html: this.esc(due_str) };
			const yr = parseInt(parts[0], 10);
			const mo = parseInt(parts[1], 10) - 1;
			const da = parseInt(parts[2], 10);
			const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
			const date_label = `${da} ${months[mo] || ""}`;

			const today_str = (frappe.datetime && frappe.datetime.get_today) ? frappe.datetime.get_today() : new Date().toISOString().slice(0, 10);
			const diff = this.diff_days(due_str, today_str);

			if (diff < 0) {
				return {
					html: `<span class="nn-due-badge"><span class="nn-due-icon red">!</span><span class="nn-due-text red">${date_label}</span></span>`
				};
			} else if (diff <= 2) {
				return {
					html: `<span class="nn-due-badge"><span class="nn-due-icon clock">${ic("clock", 11)}</span><span class="nn-due-text dark">${date_label}</span></span>`
				};
			} else {
				return {
					html: `<span class="nn-due-badge"><span class="nn-due-text gray">${date_label}</span></span>`
				};
			}
		}

		check_goal_pass(val, goal, op, min_val, max_val) {
			if (val == null || isNaN(val)) return null;
			val = Number(val);
			goal = Number(goal);
			op = (op || ">=").trim();

			if (op === ">=") return val >= goal;
			if (op === "<=") return val <= goal;
			if (op === ">") return val > goal;
			if (op === "<") return val < goal;
			if (op === "==" || op === "=") return val === goal;
			if (op === "Inside min/max") {
				const mn = min_val != null ? Number(min_val) : -Infinity;
				const mx = max_val != null ? Number(max_val) : Infinity;
				return val >= mn && val <= mx;
			}
			if (op === "Outside min/max") {
				const mn = min_val != null ? Number(min_val) : -Infinity;
				const mx = max_val != null ? Number(max_val) : Infinity;
				return val < mn || val > mx;
			}
			// Default rule: if data inputted is less than goal, it is NOT pass (returns false -> RED)
			return val >= goal;
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
			.nn-btn-bar { display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 12px; border-radius: 6px; border: 1px solid #e5e7eb; background: #fff; font-size: 12px; font-weight: 500; color: #374151; cursor: pointer; }
			.nn-btn-bar:hover { background: #f9fafb; border-color: #cbd5e1; }

			/* Interactive Editable Cells & Goal Color Badges */
			.nn-sc-cell { min-width: 72px; text-align: center; cursor: pointer; user-select: none; transition: background 0.12s ease; position: relative; }
			.nn-sc-cell:hover { background: #f3f4f6; }
			.nn-cell-val.empty { color: #9ca3af; font-size: 13px; font-weight: 500; }
			.nn-cell-badge { display: inline-flex; align-items: center; justify-content: center; min-width: 34px; padding: 3px 10px; border-radius: 6px; font-size: 12.5px; font-weight: 700; line-height: 1.2; transition: all 0.15s ease; }
			/* GREEN when >= Goal */
			.nn-cell-badge.pass { background: #dcfce7 !important; color: #15803d !important; border: 1px solid #86efac !important; }
			/* RED when < Goal */
			.nn-cell-badge.fail { background: #fee2e2 !important; color: #dc2626 !important; border: 1px solid #fca5a5 !important; }
			.nn-sc-cell-input { width: 68px; height: 28px; border: 2px solid #064e3b; border-radius: 6px; text-align: center; font-size: 12.5px; font-weight: 700; color: #111827; background: #ffffff; outline: none; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }

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

			/* To-Dos Styles (Ninety.io) */
			.nn-todos-body { padding: 24px 32px 48px; display: flex; justify-content: center; width: 100%; background: #ffffff; }
			.nn-todo-card { width: 100%; max-width: 960px; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.03); overflow: hidden; }
			.nn-todo-card-header { padding: 14px 20px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #f1f3f5; }
			.nn-todo-card-title { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 700; color: #111827; }
			.nn-todo-count { font-size: 13px; font-weight: 600; color: #6b7280; }
			.nn-todo-expand-btn { width: 28px; height: 28px; border: none; background: transparent; color: #6b7280; cursor: pointer; display: flex; align-items: center; justify-content: center; border-radius: 4px; transition: background 0.1s; }
			.nn-todo-expand-btn:hover { background: #f3f4f6; color: #111827; }

			.nn-todo-table-head { display: flex; align-items: center; padding: 10px 18px; font-size: 11.5px; font-weight: 600; color: #6b7280; border-bottom: 1px solid #f1f3f5; background: #ffffff; user-select: none; }
			.nn-todo-col-check { width: 36px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
			.nn-todo-col-title { flex: 1 1 0%; min-width: 0; padding-right: 16px; font-size: 12px; font-weight: 600; color: #6b7280; }
			.nn-todo-col-due { width: 120px; flex-shrink: 0; display: flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 600; color: #6b7280; }
			.nn-todo-col-owner { width: 70px; flex-shrink: 0; display: flex; align-items: center; font-size: 12px; font-weight: 600; color: #6b7280; }
			.nn-todo-col-actions { width: 36px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }

			.nn-todo-row { display: flex; align-items: center; padding: 11px 18px; border-bottom: 1px solid #f3f4f6; transition: background 0.12s; background: #ffffff; }
			.nn-todo-row:hover { background: #f9fafb; }
			.nn-todo-row:last-child { border-bottom: none; }

			.nn-todo-circle-check { width: 17px; height: 17px; border-radius: 50%; border: 1.5px solid #d1d5db; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.15s ease; background: #ffffff; flex-shrink: 0; }
			.nn-todo-circle-check:hover { border-color: #059669; }
			.nn-todo-circle-check.checked { background: #059669; border-color: #059669; color: #ffffff; }

			.nn-todo-row .nn-todo-col-title { font-size: 13px; font-weight: 500; color: #111827; cursor: pointer; }
			.nn-todo-row .nn-todo-col-title:hover { color: #064e3b; }
			.nn-todo-row .nn-todo-col-title.done { text-decoration: line-through; color: #9ca3af; }

			.nn-due-badge { display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; }
			.nn-due-icon.red { width: 16px; height: 16px; border-radius: 50%; background: #ef4444; color: #ffffff; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; line-height: 1; flex-shrink: 0; }
			.nn-due-text.red { color: #dc2626; font-weight: 600; }
			.nn-due-icon.clock { width: 16px; height: 16px; border-radius: 50%; background: #111827; color: #ffffff; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
			.nn-due-icon.clock .nn-svg { color: #ffffff; }
			.nn-due-text.dark { color: #111827; font-weight: 600; }
			.nn-due-text.gray { color: #6b7280; font-weight: 400; }

			.nn-owner-circle { width: 24px; height: 24px; border-radius: 50%; background: #71717a; color: #ffffff; font-size: 10px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; text-transform: uppercase; flex-shrink: 0; }
			.nn-todo-row-menu-btn { width: 24px; height: 24px; border: none; background: transparent; color: #9ca3af; cursor: pointer; display: flex; align-items: center; justify-content: center; border-radius: 4px; }
			.nn-todo-row-menu-btn:hover { background: #f3f4f6; color: #111827; }

			.nn-todo-card-footer { padding: 12px 20px; display: flex; align-items: center; justify-content: space-between; border-top: 1px solid #f1f3f5; font-size: 12px; color: #6b7280; background: #ffffff; }
			.nn-todo-add-trigger { display: inline-flex; align-items: center; gap: 4px; font-size: 12.5px; font-weight: 600; color: #374151; cursor: pointer; user-select: none; }
			.nn-todo-add-trigger:hover { color: #064e3b; }
			.nn-todo-pagination { display: flex; align-items: center; gap: 18px; }
			.nn-todo-page-size { display: inline-flex; align-items: center; gap: 4px; cursor: pointer; color: #6b7280; }
			.nn-todo-page-size b { color: #111827; font-weight: 600; }
			.nn-todo-page-info { color: #6b7280; font-weight: 500; }
			.nn-todo-page-nav { display: flex; align-items: center; gap: 4px; }
			.nn-p-btn { width: 22px; height: 22px; border: 1px solid #e5e7eb; background: #ffffff; color: #6b7280; border-radius: 4px; font-size: 11px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0; }
			.nn-p-btn:hover { background: #f3f4f6; color: #111827; border-color: #cbd5e1; }
			.nn-todo-empty { padding: 36px 20px; text-align: center; color: #9ca3af; font-size: 13px; }
			</style>`);
		}

		shell() {
			const cur_name = (frappe.session && (frappe.session.user_fullname || frappe.session.user)) || "User";
			const cur_av = this.get_initials(cur_name);

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
								<span class="nn-user-av">${this.esc(cur_av)}</span>
								<div class="nn-user-name">${this.esc(cur_name)}</div>
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
			else if (view === "todos") this.load_todos();
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
						<div class="nn-title">${this.get_doctype_label("Rock", "Rocks")}</div>
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
							<span class="k">${this.get_field_label("Rock", "team", "Team")}:</span> <b>${this.esc(s.rock_team)}</b> ${ic("chevron-down", 12)}
						</button>
						<button class="nn-pill-select" id="nn-rowner" data-menu>
							<span class="k">${this.get_field_label("Rock", "owner_user", "Owner")}:</span> <b>${this.esc(s.rock_owner)}</b> ${ic("chevron-down", 12)}
						</button>
						<button class="nn-pill-select" id="nn-rstatus" data-menu>
							<span class="k">${this.get_field_label("Rock", "status", "Status")}:</span> <b>${this.esc(s.rock_status)}</b> ${ic("chevron-down", 12)}
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
						<div class="nn-search-input-wrap">${ic("search", 13)}<input id="nn-rock-search" placeholder="${__("Search")} ${this.get_doctype_label("Rock", "Rocks")}…" value="${this.esc(s.search)}"></div>
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
				const owner_name = this.get_user_display_name(r.owner_user) || r.owner_user || "Unknown";
				if (!user_groups[owner_name]) user_groups[owner_name] = [];
				user_groups[owner_name].push(r);
			});

			let owners_to_show = [];
			if (s.rock_owner && s.rock_owner !== "All") {
				owners_to_show = [s.rock_owner];
			} else {
				owners_to_show = Object.keys(user_groups);
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
				const initials = this.get_initials(owner_name);

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
									<th style="width:90px">${this.get_field_label("Rock", "status", "Status")}</th>
									<th>${this.get_field_label("Rock", "rock_name", "Title")}</th>
									<th style="text-align:right;width:150px">${this.get_field_label("Rock", "milestones", "Milestone progress")}</th>
									<th style="text-align:center;width:90px">${this.get_field_label("Rock", "duration_end", "Due by")}</th>
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
							<span class="nn-rock-title">${__("Company")} ${this.get_doctype_label("Rock", "Rocks")}</span>
							<span class="nn-badge-cnt">${company_rocks.length}</span>
						</div>
						<div style="color:#059669;cursor:pointer">${ic("arrow-up-right", 16)}</div>
					</div>

					<table class="nn-rock-tbl">
						<thead>
							<tr>
								<th style="width:24px"></th>
								<th style="width:90px">${this.get_field_label("Rock", "status", "Status")}</th>
								<th>${this.get_field_label("Rock", "rock_name", "Title")}</th>
								<th style="text-align:right;width:150px">${this.get_field_label("Rock", "milestones", "Milestone progress")}</th>
								<th style="text-align:center;width:60px">${this.get_field_label("Rock", "owner_user", "Owner")}</th>
								<th style="text-align:center;width:90px">${this.get_field_label("Rock", "duration_end", "Due by")}</th>
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

		format_rock_due(due_str) {
			if (!due_str) return "—";
			const parts = String(due_str).split("-");
			if (parts.length < 3) return this.esc(due_str);
			const yr = parseInt(parts[0], 10);
			const mo = parseInt(parts[1], 10) - 1;
			const da = parseInt(parts[2], 10);
			const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
			return `${da} ${months[mo] || ""}`;
		}

		get_rock_status_badge(st, rname = null) {
			st = (st || "").trim();
			const is_off = st === "Not Started" || st === "Off-track";
			const is_complete = st === "Complete";
			const is_dropped = st === "Dropped";

			let cls = "on-track";
			let label = "👍 " + __("On-track");

			if (is_off) {
				cls = "off-track";
				label = "⚠️ " + __("Off-track");
			} else if (is_complete) {
				cls = "complete";
				label = "✓ " + __("Complete");
			} else if (is_dropped) {
				cls = "dropped";
				label = "✕ " + __("Dropped");
			}

			const data_attr = rname ? `data-rock="${this.esc(rname)}"` : "";
			return `<span class="nn-status-badge ${cls}" ${data_attr} title="${__("Click to change status")}">${label}</span>`;
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
				const total = ms.length;
				const pct = total ? Math.round((done / total) * 100) : 0;
				const owner_name = self.get_user_display_name(r.owner_user);
				const initials = self.get_initials(owner_name || r.owner_user || "—");
				const due_label = self.format_rock_due(r.due);

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
							<td style="text-align:center"><span class="nn-av-circle" style="width:22px;height:22px;font-size:9px">${initials}</span></td>
							<td style="text-align:center;color:#6b7280;font-size:11.5px">${self.esc(m.notes ? m.notes.replace("Due:", "").trim() : "—")}</td>
							<td style="color:#9ca3af;cursor:pointer">⋯</td>
						</tr>
					`).join("");
				}

				return `
					<tr class="nn-rock-row">
						<td style="text-align:center;cursor:pointer" class="nn-rock-exp" data-title="${self.esc(r.title)}">
							${ic(is_expanded ? "chevron-down" : "chevron-right", 12)}
						</td>
						<td>${self.get_rock_status_badge(r.status, r.name)}</td>
						<td style="font-weight:500;color:#111827">
							<span class="nn-rock-click" data-id="${self.esc(r.name)}" style="cursor:pointer">${self.esc(r.title)}</span>
						</td>
						<td>
							<div class="nn-progress-wrap">
								<div class="nn-prog-bar"><div class="nn-prog-fill" style="width:${pct}%"></div></div>
								<span class="nn-prog-txt">${done}/${total}</span>
							</div>
						</td>
						<td style="text-align:center"><span class="nn-av-circle" title="${self.esc(owner_name)}">${initials}</span></td>
						<td style="text-align:center;color:#374151">${due_label}</td>
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
				const is_comp = !!(r.is_company_rock || r.scope === "Company");
				const ms = r.milestones || [];
				const done = ms.filter(m => m.completed).length;
				const total = ms.length;
				const pct = total ? Math.round((done / total) * 100) : 0;
				const due_label = self.format_rock_due(r.due);

				return `
					<tr class="nn-rock-row">
						<td style="text-align:center;color:#9ca3af">${ic("chevron-right", 12)}</td>
						<td>${self.get_rock_status_badge(r.status, r.name)}</td>
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
						<td style="text-align:center;color:#374151">${due_label}</td>
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

			// Status badge click to quickly change rock status
			$m.find(".nn-status-badge[data-rock]").off("click").on("click", function (e) {
				e.stopPropagation();
				const rname = $(this).attr("data-rock");
				const rock = self.rocks.find(x => x.name === rname);
				if (!rock) return;

				const options = [
					["In Progress", "👍 " + __("On-track")],
					["Not Started", "⚠️ " + __("Off-track")],
					["Complete", "✓ " + __("Complete")]
				];

				const current_val = (rock.status === "Not Started" || rock.status === "Off-track") ? "Not Started" : (rock.status === "Complete" ? "Complete" : "In Progress");

				self.pick_menu(this, options, current_val, async new_val => {
					rock.status = new_val;
					await self.call("frappe.client.set_value", {
						doctype: "Rock",
						name: rname,
						fieldname: "status",
						value: new_val
					});
					self.render_rocks_tables();
					frappe.show_alert({ message: __("Rock status updated!"), indicator: "green" });
				});
			});
		}

		open_rock_drawer(rock_id = null, default_owner = null) {
			const is_edit = !!rock_id;
			const r = is_edit ? this.rocks.find(x => x.name === rock_id) : null;

			const current_title = r ? r.title : "";
			const current_owner = r ? r.owner_user : (default_owner || (frappe.session && frappe.session.user) || "");
			const current_team = r ? (r.team || "") : (this.s.rock_team !== "All Teams" ? this.s.rock_team : (this.all_teams.find(t => t !== "All Teams") || ""));
			const current_scope = r ? (r.scope || "Company") : "Company";
			const current_is_comp = r ? !!r.is_company_rock : true;
			const current_status = r ? r.status : "In Progress";
			const current_due = r && r.due ? r.due : ((frappe.datetime && frappe.datetime.add_months) ? frappe.datetime.add_months(frappe.datetime.get_today(), 3) : "");

			let owner_options = "";
			const users_list = this.users.length ? this.users : (frappe.session && frappe.session.user ? [{ name: frappe.session.user, full_name: frappe.session.user_fullname || frappe.session.user }] : []);
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
						<div class="nn-field-label"><span>${this.get_field_label("Rock", "rock_name", "Rock Title")}</span></div>
						<input type="text" class="nn-input-text" id="nn-r-title" value="${this.esc(current_title)}" placeholder="${__("e.g. EOS company portal go live")}">
					</div>

					<div class="nn-field-group">
						<div class="nn-field-label"><span>${this.get_field_label("Rock", "owner_user", "Owner")}</span></div>
						<select class="nn-select" id="nn-r-owner">${owner_options}</select>
					</div>

					<div class="nn-field-group">
						<div class="nn-field-label"><span>${this.get_field_label("Rock", "team", "Team")}</span></div>
						<select class="nn-select" id="nn-r-team">${team_options}</select>
					</div>

					<div class="nn-field-group">
						<div class="nn-field-label"><span>${this.get_field_label("Rock", "scope", "Scope")}</span></div>
						<select class="nn-select" id="nn-r-scope">
							<option value="Company" ${current_scope === "Company" ? "selected" : ""}>Company</option>
							<option value="Individual" ${current_scope === "Individual" ? "selected" : ""}>Individual</option>
						</select>
					</div>

					<div class="nn-field-group" style="display:flex;align-items:center;gap:10px">
						<input type="checkbox" id="nn-r-comp" ${current_is_comp ? "checked" : ""}>
						<label for="nn-r-comp" style="font-size:12.5px;font-weight:500;cursor:pointer">${this.get_field_label("Rock", "is_company_rock", "Mark as Company Rock")}</label>
					</div>

					<div class="nn-field-group">
						<div class="nn-field-label"><span>${this.get_field_label("Rock", "status", "Status")}</span></div>
						<select class="nn-select" id="nn-r-status">
							<option value="In Progress" ${current_status === "In Progress" || current_status === "On-track" ? "selected" : ""}>In Progress (On-track)</option>
							<option value="Not Started" ${current_status === "Not Started" || current_status === "Off-track" ? "selected" : ""}>Not Started (Off-track)</option>
							<option value="Complete" ${current_status === "Complete" ? "selected" : ""}>Complete</option>
						</select>
					</div>

					<div class="nn-field-group">
						<div class="nn-field-label"><span>${this.get_field_label("Rock", "duration_end", "Due Date")}</span></div>
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
		   TO-DOS VIEW IMPLEMENTATION (Ninety To-Dos)
		   ========================================================================= */
		async load_todos() {
			this.$main.html(`<div style="padding:48px;text-align:center;color:#6b7280;font-size:14px">${__("Loading To-Dos…")}</div>`);
			try {
				await this.fetch_all_teams();
				await this.fetch_players();
				await this.fetch_todos_data();
			} catch (e) {
				console.error("To-Dos load error:", e);
			}
			this.render_todos();
		}

		async fetch_todos_data() {
			const filters = {};
			if (this.s.todo_archive) {
				filters.archived = 1;
			} else {
				filters.archived = 0;
			}
			const res = await this.list("To Do", [
				"name", "todo_name", "status", "owner_user", "team", "due_date", "priority", "notes", "archived"
			], filters, "due_date asc, creation asc", 200);

			this.todos = res.ok ? (res.data || []) : [];

			if (!this.users || !this.users.length) {
				const u_res = await this.list("User", ["name", "full_name", "first_name", "last_name", "email"], { enabled: 1 }, "full_name asc", 200);
				this.users = u_res.ok ? u_res.data : [];
			}
		}

		render_todos() {
			const s = this.s;

			this.$main.html(`
				<div class="nn-top-header">
					<div>
						<div class="nn-title">${this.get_doctype_label("To Do", "To-Dos")}</div>
						<div class="nn-sub">${__("Create, assign, and track deadlines for critical tasks.")}</div>
					</div>
					<div class="nn-top-right">
						<a class="nn-badge-maz" href="javascript:void(0)"><span>+ Maz</span><span class="nn-badge-new">NEW</span></a>
						<div class="nn-top-search">${ic("search", 13)}<input type="text" placeholder="${__("Search…")}"></div>
						<button class="nn-btn-icon">${ic("bell", 15)}<span class="nn-dot-red"></span></button>
						<button class="nn-btn-create" id="nn-create-todo-top">${ic("plus", 13)} ${__("Create")}</button>
					</div>
				</div>

				<div class="nn-tabs">
					<div class="nn-tab ${s.todo_tab === "Team" ? "on" : ""}" data-ttab="Team">${__("Team")}</div>
					<div class="nn-tab ${s.todo_tab === "Private" ? "on" : ""}" data-ttab="Private">${__("Private")}</div>
				</div>

				<div class="nn-filter-bar">
					<div class="nn-filter-left">
						<button class="nn-pill-select" id="nn-t-team" data-menu>
							<span class="k">${this.get_field_label("To Do", "team", "Team")}:</span> <b>${this.esc(s.todo_team)}</b> ${ic("chevron-down", 12)}
						</button>
						<button class="nn-pill-select" id="nn-t-owner" data-menu>
							<span class="k">${this.get_field_label("To Do", "owner_user", "Owner")}:</span> <b>${this.esc(s.todo_owner)}</b> ${ic("chevron-down", 12)}
						</button>
						<div style="display:inline-flex;align-items:center;gap:8px;margin-left:6px;font-size:12.5px;color:#374151">
							<span class="nn-switch ${s.todo_archive ? "on" : ""}" id="nn-sw-t-archive"></span>
							<span>${this.get_field_label("To Do", "archived", "Archive")}</span>
						</div>
					</div>
					<div class="nn-filter-right">
						<button class="nn-ibtn-bar" id="nn-t-refresh" title="${__("Refresh To-Dos")}">${ic("refresh", 14)}</button>
						<button class="nn-ibtn-bar" title="${__("More Options")}">${ic("dots", 14)}</button>
						<div class="nn-search-input-wrap">${ic("search", 13)}<input id="nn-todo-search" placeholder="${__("Search")} ${this.get_doctype_label("To Do", "To-Dos")}…" value="${this.esc(s.todo_search)}"></div>
					</div>
				</div>

				<div class="nn-todos-body" id="nn-todos-body-wrap"></div>
			`);

			this.render_todos_table();
			this.bind_todos_events();
		}

		render_todos_table() {
			const s = this.s;
			const all_todos = this.todos || [];
			const q = (s.todo_search || "").toLowerCase().trim();

			let filtered = all_todos.filter(td => {
				if (q && !(td.todo_name || "").toLowerCase().includes(q) && !(td.notes || "").toLowerCase().includes(q)) return false;

				// Team filter
				if (s.todo_tab === "Team") {
					if (s.todo_team && s.todo_team !== "All Teams") {
						if (td.team && td.team !== s.todo_team) return false;
					}
				}

				// Owner filter
				if (s.todo_owner && s.todo_owner !== "All") {
					const owner_name = this.get_user_display_name(td.owner_user);
					if (owner_name !== s.todo_owner && td.owner_user !== s.todo_owner) return false;
				}

				// Private tab filter
				if (s.todo_tab === "Private") {
					const cur = (frappe.session && frappe.session.user) ? frappe.session.user : "";
					if (cur && td.owner_user !== cur) return false;
				}

				return true;
			});

			// Sort by due date
			filtered.sort((a, b) => {
				const da = a.due_date || "9999-99-99";
				const db = b.due_date || "9999-99-99";
				return s.todo_sort_dir === "desc" ? db.localeCompare(da) : da.localeCompare(db);
			});

			const table_html = `
				<div class="nn-todo-card">
					<div class="nn-todo-card-header">
						<div class="nn-todo-card-title">
							<span>${s.todo_tab === "Private" ? __("Private") : __("Team")} ${this.get_doctype_label("To Do", "To-Dos")}</span>
							<span class="nn-todo-count">${filtered.length}</span>
						</div>
						<button class="nn-todo-expand-btn" title="${__("Open in full view")}">${ic("arrow-up-right", 15)}</button>
					</div>

					<div class="nn-todo-table-head">
						<div class="nn-todo-col-check"></div>
						<div class="nn-todo-col-title">${this.get_field_label("To Do", "todo_name", "Title")}</div>
						<div class="nn-todo-col-due" id="nn-todo-sort-due" style="cursor:pointer;" title="${__("Sort by Due Date")}">
							<span>${this.get_field_label("To Do", "due_date", "Due Date")}</span> ${ic(s.todo_sort_dir === "desc" ? "chevron-up" : "arrow-down", 11)}
						</div>
						<div class="nn-todo-col-owner">${this.get_field_label("To Do", "owner_user", "Owner")}</div>
						<div class="nn-todo-col-actions"></div>
					</div>

					<div class="nn-todo-table-body">
						${filtered.length === 0 ? `
							<div class="nn-todo-empty">${__("No To-Dos match the selected filters.")}</div>
						` : filtered.map(td => {
							const is_complete = td.status === "Complete";
							const due_info = this.format_todo_due(td.due_date);
							const owner_name = this.get_user_display_name(td.owner_user);
							const initials = this.get_initials(owner_name || td.owner_user || "");

							return `
								<div class="nn-todo-row" data-id="${this.esc(td.name)}">
									<div class="nn-todo-col-check">
										<div class="nn-todo-circle-check ${is_complete ? "checked" : ""}" data-id="${this.esc(td.name)}" title="${is_complete ? __("Mark Not Started") : __("Mark Complete")}">
											${is_complete ? ic("check", 11) : ""}
										</div>
									</div>
									<div class="nn-todo-col-title ${is_complete ? "done" : ""}" data-action="edit" data-id="${this.esc(td.name)}" title="${__("Click to edit")}">
										${this.esc(td.todo_name)}
									</div>
									<div class="nn-todo-col-due">
										${due_info.html}
									</div>
									<div class="nn-todo-col-owner">
										<span class="nn-owner-circle" title="${this.esc(owner_name)}">${this.esc(initials)}</span>
									</div>
									<div class="nn-todo-col-actions">
										<button class="nn-todo-row-menu-btn" data-id="${this.esc(td.name)}" title="${__("Options")}">
											${ic("dots", 14)}
										</button>
									</div>
								</div>
							`;
						}).join("")}
					</div>

					<div class="nn-todo-card-footer">
						<div class="nn-todo-add-trigger" id="nn-todo-add-btn">
							<span style="font-weight:700;font-size:14px;line-height:1;margin-right:2px;">+</span> ${__("Add To-Do")}
						</div>
						<div class="nn-todo-pagination">
							<div class="nn-todo-page-size">
								${__("Items per page:")} <b>100</b> ${ic("chevron-down", 11)}
							</div>
							<div class="nn-todo-page-info">
								${filtered.length > 0 ? `1 - ${filtered.length} of ${filtered.length}` : `0 of 0`}
							</div>
							<div class="nn-todo-page-nav">
								<button class="nn-p-btn" title="${__("First page")}">|&lt;</button>
								<button class="nn-p-btn" title="${__("Previous page")}">&lt;</button>
								<button class="nn-p-btn" title="${__("Next page")}">&gt;</button>
								<button class="nn-p-btn" title="${__("Last page")}">&gt;|</button>
							</div>
						</div>
					</div>
				</div>
			`;

			this.$root.find("#nn-todos-body-wrap").html(table_html);
		}

		bind_todos_events() {
			const self = this;

			// Top Create button & card add button
			this.$root.off("click.todocreate").on("click.todocreate", "#nn-create-todo-top, #nn-todo-add-btn", () => {
				self.open_todo_drawer();
			});

			// Tabs: Team vs Private
			this.$root.find("[data-ttab]").off("click").on("click", function() {
				const tab = $(this).attr("data-ttab");
				self.s.todo_tab = tab;
				self.$root.find("[data-ttab]").removeClass("on").filter(`[data-ttab="${tab}"]`).addClass("on");
				self.render_todos_table();
			});

			// Team Filter Dropdown
			this.$root.find("#nn-t-team").off("click").on("click", function (e) {
				e.stopPropagation();
				self.pick_menu(this, self.all_teams, self.s.todo_team, val => {
					self.s.todo_team = val;
					self.$root.find("#nn-t-team b").text(val);
					self.render_todos_table();
				});
			});

			// Owner Filter Dropdown
			this.$root.find("#nn-t-owner").off("click").on("click", function (e) {
				e.stopPropagation();
				const owners = ["All", ...self.get_available_owners(self.s.todo_team)];
				self.pick_menu(this, owners, self.s.todo_owner, val => {
					self.s.todo_owner = val;
					self.$root.find("#nn-t-owner b").text(val);
					self.render_todos_table();
				});
			});

			// Archive Switch
			this.$root.find("#nn-sw-t-archive").off("click").on("click", async function (e) {
				e.stopPropagation();
				self.s.todo_archive = !self.s.todo_archive;
				$(this).toggleClass("on", self.s.todo_archive);
				await self.fetch_todos_data();
				self.render_todos_table();
			});

			// Refresh Button
			this.$root.find("#nn-t-refresh").off("click").on("click", async () => {
				await self.fetch_todos_data();
				self.render_todos_table();
				frappe.show_alert({ message: __("To-Dos refreshed"), indicator: "green" });
			});

			// Search Input
			this.$root.find("#nn-todo-search").off("input").on("input", function() {
				self.s.todo_search = $(this).val();
				self.render_todos_table();
			});

			// Sort by Due Date
			this.$root.off("click.todosort").on("click.todosort", "#nn-todo-sort-due", function() {
				self.s.todo_sort_dir = self.s.todo_sort_dir === "asc" ? "desc" : "asc";
				self.render_todos_table();
			});

			// Circle Checkbox Toggle
			this.$root.off("click.todochk").on("click.todochk", ".nn-todo-circle-check", async function (e) {
				e.stopPropagation();
				const $chk = $(this);
				const id = $chk.attr("data-id");
				const td = (self.todos || []).find(x => x.name === id);
				if (!td) return;

				const next_status = td.status === "Complete" ? "Not Started" : "Complete";
				td.status = next_status;
				$chk.toggleClass("checked", next_status === "Complete");
				$chk.html(next_status === "Complete" ? ic("check", 11) : "");
				$chk.closest(".nn-todo-row").find(".nn-todo-col-title").toggleClass("done", next_status === "Complete");

				try {
					await self.call("frappe.client.set_value", {
						doctype: "To Do",
						name: id,
						fieldname: "status",
						value: next_status
					});
				} catch (err) {
					console.error("Error setting status:", err);
				}
			});

			// Click Title to Edit
			this.$root.off("click.todoedit").on("click.todoedit", ".nn-todo-col-title", function (e) {
				e.stopPropagation();
				const id = $(this).attr("data-id");
				self.open_todo_drawer(id);
			});

			// Row Menu (⋯)
			this.$root.off("click.todomenu").on("click.todomenu", ".nn-todo-row-menu-btn", function (e) {
				e.stopPropagation();
				const id = $(this).attr("data-id");
				const td = (self.todos || []).find(x => x.name === id);
				if (!td) return;

				const options = [
					["edit", __("Edit To-Do")],
					["toggle", td.status === "Complete" ? __("Mark Incomplete") : __("Mark Complete")],
					["delete", __("Delete")]
				];

				self.pick_menu(this, options, "", async action => {
					if (action === "edit") {
						self.open_todo_drawer(id);
					} else if (action === "toggle") {
						const next_status = td.status === "Complete" ? "Not Started" : "Complete";
						td.status = next_status;
						await self.call("frappe.client.set_value", { doctype: "To Do", name: id, fieldname: "status", value: next_status });
						self.render_todos_table();
					} else if (action === "delete") {
						frappe.confirm(__("Are you sure you want to delete this To-Do?"), async () => {
							await self.call("frappe.client.delete", { doctype: "To Do", name: id });
							await self.fetch_todos_data();
							self.render_todos_table();
							frappe.show_alert({ message: __("To-Do deleted"), indicator: "green" });
						});
					}
				});
			});
		}

		open_todo_drawer(todo_id = null) {
			const is_edit = !!todo_id;
			const td = is_edit ? (this.todos || []).find(x => x.name === todo_id) : null;

			const current_title = td ? td.todo_name : "";
			const current_owner = td ? td.owner_user : ((frappe.session && frappe.session.user) || "");
			const current_team = td ? (td.team || "") : (this.s.todo_team !== "All Teams" ? this.s.todo_team : (this.all_teams.find(t => t !== "All Teams") || ""));
			const current_status = td ? td.status : "Not Started";
			const current_priority = td ? (td.priority || "Medium") : "Medium";
			const current_due = td && td.due_date ? td.due_date : ((frappe.datetime && frappe.datetime.add_days) ? frappe.datetime.add_days(frappe.datetime.get_today(), 7) : "");
			const current_notes = td && td.notes ? td.notes : "";

			let owner_options = "";
			const users_list = this.users.length ? this.users : (frappe.session && frappe.session.user ? [{ name: frappe.session.user, full_name: frappe.session.user_fullname || frappe.session.user }] : []);
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
					<div class="nn-drawer-title">${is_edit ? __("Edit To-Do") : __("Create To-Do")}</div>
					<div class="nn-drawer-header-actions">
						<button class="nn-drawer-btn-icon" id="nn-drawer-close">${ic("close", 16)}</button>
					</div>
				</div>

				<div class="nn-drawer-body">
					<div class="nn-field-group">
						<div class="nn-field-label"><span>${this.get_field_label("To Do", "todo_name", "To-Do Title")}</span> <span style="color:#ef4444">*</span></div>
						<input type="text" class="nn-input-text" id="nn-td-title" value="${this.esc(current_title)}" placeholder="${__("e.g. Complete customer review meeting")}">
					</div>

					<div class="nn-field-group">
						<div class="nn-field-label"><span>${this.get_field_label("To Do", "team", "Team")}</span></div>
						<select class="nn-select" id="nn-td-team">${team_options}</select>
					</div>

					<div class="nn-field-group">
						<div class="nn-field-label"><span>${this.get_field_label("To Do", "owner_user", "Owner")}</span></div>
						<select class="nn-select" id="nn-td-owner">${owner_options}</select>
					</div>

					<div class="nn-field-group">
						<div class="nn-field-label"><span>${this.get_field_label("To Do", "due_date", "Due Date")}</span></div>
						<input type="date" class="nn-input-text" id="nn-td-due" value="${this.esc(current_due)}">
					</div>

					<div class="nn-field-group">
						<div class="nn-field-label"><span>${this.get_field_label("To Do", "status", "Status")}</span></div>
						<select class="nn-select" id="nn-td-status">
							<option value="Not Started" ${current_status === "Not Started" ? "selected" : ""}>Not Started</option>
							<option value="In Progress" ${current_status === "In Progress" ? "selected" : ""}>In Progress</option>
							<option value="Complete" ${current_status === "Complete" ? "selected" : ""}>Complete</option>
							<option value="Dropped" ${current_status === "Dropped" ? "selected" : ""}>Dropped</option>
						</select>
					</div>

					<div class="nn-field-group">
						<div class="nn-field-label"><span>${this.get_field_label("To Do", "priority", "Priority")}</span></div>
						<select class="nn-select" id="nn-td-priority">
							<option value="Low" ${current_priority === "Low" ? "selected" : ""}>Low</option>
							<option value="Medium" ${current_priority === "Medium" ? "selected" : ""}>Medium</option>
							<option value="High" ${current_priority === "High" ? "selected" : ""}>High</option>
						</select>
					</div>

					<div class="nn-field-group">
						<div class="nn-field-label"><span>${this.get_field_label("To Do", "notes", "Notes")}</span></div>
						<textarea class="nn-input-text" id="nn-td-notes" style="height:80px;padding:8px 10px;resize:vertical;" placeholder="${__("Add details or notes…")}">${this.esc(current_notes)}</textarea>
					</div>
				</div>

				<div class="nn-drawer-footer">
					<button class="nn-btn-save" id="nn-drawer-todo-save">${is_edit ? __("Save changes") : __("Save To-Do")}</button>
					${is_edit ? `<button class="nn-btn-cancel" style="color:#dc2626;border-color:#fca5a5" id="nn-drawer-todo-delete">${__("Delete")}</button>` : ""}
					<button class="nn-btn-cancel" id="nn-drawer-todo-cancel">${__("Cancel")}</button>
				</div>
			`;

			const $drawer = this.$root.find("#nn-drawer");
			$drawer.html(drawer_html);

			const self = this;
			$drawer.find("#nn-drawer-close, #nn-drawer-todo-cancel").on("click", () => self.close_drawer());

			if (is_edit) {
				$drawer.find("#nn-drawer-todo-delete").on("click", async function() {
					frappe.confirm(__("Are you sure you want to delete this To-Do?"), async () => {
						await self.call("frappe.client.delete", { doctype: "To Do", name: todo_id });
						self.close_drawer();
						await self.fetch_todos_data();
						self.render_todos_table();
						frappe.show_alert({ message: __("To-Do deleted"), indicator: "green" });
					});
				});
			}

			$drawer.find("#nn-drawer-todo-save").on("click", async function () {
				const title = $drawer.find("#nn-td-title").val().trim();
				if (!title) {
					frappe.msgprint(__("Please enter a To-Do title."));
					return;
				}
				const owner = $drawer.find("#nn-td-owner").val();
				const team = $drawer.find("#nn-td-team").val();
				const status = $drawer.find("#nn-td-status").val();
				const due = $drawer.find("#nn-td-due").val();
				const priority = $drawer.find("#nn-td-priority").val();
				const notes = $drawer.find("#nn-td-notes").val().trim();

				if (is_edit && td) {
					await self.call("frappe.client.set_value", {
						doctype: "To Do", name: td.name,
						fieldname: {
							todo_name: title,
							owner_user: owner,
							team: team,
							status: status,
							due_date: due,
							priority: priority,
							notes: notes
						}
					});
				} else {
					await self.call("frappe.client.insert", {
						doc: {
							doctype: "To Do",
							todo_name: title,
							owner_user: owner,
							team: team,
							status: status,
							due_date: due,
							priority: priority,
							notes: notes,
							archived: 0
						}
					});
				}

				self.close_drawer();
				await self.fetch_todos_data();
				self.render_todos_table();
				frappe.show_alert({ message: __("To-Do saved successfully!"), indicator: "green" });
			});

			this.$root.find("#nn-drawer-backdrop").addClass("show");
			$drawer.addClass("show");
			$drawer.find("#nn-td-title").focus();
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

			const m_fields = ["name", "metric_name as title", "description", "target_value as goal", "operator as goal_op", "unit", "unit_type", "rollup", "frequency", "owner_user", "team", "scorecard", "group as grp", "min_value", "max_value"];
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
				min_value: m.min_value != null ? Number(m.min_value) : null,
				max_value: m.max_value != null ? Number(m.max_value) : null,
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
					"name", "metric", "parent", "week_start_date as d", "actual_value as v"
				], {
					week_start_date: ["between", [start_d, end_d]]
				}, "week_start_date asc", 2000);

				if (e_res.ok && e_res.data) {
					e_res.data.forEach(e => {
						const met = metrics.find(x => x.id === e.metric || x.id === e.parent);
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
						<div class="nn-title">${this.get_doctype_label("Scorecard", "Scorecard")}</div>
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
							<span class="k">${this.get_field_label("Scorecard", "team", "Team")}:</span> <b>${this.esc(s.team)}</b> ${ic("chevron-down", 12)}
						</button>
						<button class="nn-pill-select" id="nn-view" data-menu>
							<span class="k">${this.get_field_label("Scorecard", "timeframe", "View by")}:</span> <b>${s.timeframe}</b> ${ic("chevron-down", 12)}
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
						<div class="nn-search-input-wrap">${ic("search", 13)}<input id="nn-search-input" placeholder="${__("Search")} ${this.get_doctype_label("EOS Metric", "Measurables")}…" value="${this.esc(s.search)}"></div>
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
			const self = this;
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
						cells += `
							<td class="nn-sc-cell" data-metric="${self.esc(m.id)}" data-key="${p.key}" data-goal="${m.goal}" data-op="${self.esc(m.goal_op || '>=')}">
								<span class="nn-cell-val empty">-</span>
							</td>`;
					} else {
						const pass = self.check_goal_pass(val, m.goal, m.goal_op, m.min_value, m.max_value);
						const cls = pass ? "pass" : "fail";
						cells += `
							<td class="nn-sc-cell" data-metric="${self.esc(m.id)}" data-key="${p.key}" data-goal="${m.goal}" data-op="${self.esc(m.goal_op || '>=')}">
								<span class="nn-cell-badge ${cls}">${val}</span>
							</td>`;
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
						<td style="font-weight:600;color:#374151;text-align:center">${m.goal_op || ">="} ${m.goal}</td>
						${cells}
					</tr>
				`;
			}).join("");

			this.$main.find("#nn-table-wrap").html(`
				<table class="nn-sc-tbl">
					<thead>
						<tr>
							<th class="left" style="min-width:240px">${this.get_field_label("EOS Metric", "metric_name", "Measurable")}</th>
							<th style="width:60px;text-align:center">${this.get_field_label("EOS Metric", "owner_user", "Owner")}</th>
							<th style="width:90px;text-align:center">${this.get_field_label("EOS Metric", "target_value", "Goal")}</th>
							${ths}
						</tr>
					</thead>
					<tbody>${rows}</tbody>
				</table>
			`);

			this.bind_grid_cell_events();
		}

		bind_grid_cell_events() {
			const self = this;
			const $m = this.$main;

			$m.find(".nn-metric-title").off("click").on("click", function () {
				self.open_measurable_drawer($(this).attr("data-id"));
			});

			$m.find(".nn-sc-cell").off("click").on("click", function (e) {
				if ($(this).find(".nn-sc-cell-input").length) return;

				const $td = $(this);
				const metric_id = $td.attr("data-metric");
				const key = $td.attr("data-key");
				const goal = Number($td.attr("data-goal")) || 0;
				const op = $td.attr("data-op") || ">=";
				const metric = self.data.metrics.find(x => x.id === metric_id);
				const cur_val = metric && metric.values && metric.values[key] != null ? metric.values[key] : "";

				const $inp = $(`<input type="number" step="any" class="nn-sc-cell-input" value="${cur_val}">`);
				$td.empty().append($inp);
				$inp.focus().select();

				let finished = false;
				const save_cell = async () => {
					if (finished) return;
					finished = true;
					const raw = $inp.val().trim();
					const new_val = raw === "" ? null : Number(raw);

					if (new_val === null) {
						if (metric) delete metric.values[key];
						$td.html('<span class="nn-cell-val empty">-</span>');
						await self.save_scorecard_entry(metric_id, key, null);
						return;
					}

					if (isNaN(new_val)) {
						frappe.show_alert({ message: __("Please enter a valid number"), indicator: "red" });
						self.render_grid();
						return;
					}

					if (metric) metric.values[key] = new_val;
					const pass = self.check_goal_pass(new_val, goal, op);
					const cls = pass ? "pass" : "fail";
					$td.html(`<span class="nn-cell-badge ${cls}">${new_val}</span>`);

					if (!pass) {
						frappe.show_alert({
							message: __(`Saved: ${new_val} (Off-track: less than goal ${op} ${goal})`),
							indicator: "red"
						});
					} else {
						frappe.show_alert({
							message: __(`Saved: ${new_val} (On-track)`),
							indicator: "green"
						});
					}

					await self.save_scorecard_entry(metric_id, key, new_val);
				};

				$inp.on("blur", save_cell);
				$inp.on("keydown", function (ev) {
					if (ev.key === "Enter") {
						ev.preventDefault();
						$inp.blur();
					} else if (ev.key === "Escape") {
						ev.preventDefault();
						finished = true;
						if (cur_val !== "") {
							const pass = self.check_goal_pass(cur_val, goal, op);
							$td.html(`<span class="nn-cell-badge ${pass ? "pass" : "fail"}">${cur_val}</span>`);
						} else {
							$td.html('<span class="nn-cell-val empty">-</span>');
						}
					}
				});
			});
		}

		async save_scorecard_entry(metric_id, date, value) {
			try {
				await this.call("eos_core.eos_core.doctype.scorecard.scorecard.update_scorecard_entry", {
					metric: metric_id,
					week_start_date: date,
					actual_value: value
				});
			} catch (e) {
				console.warn("save_scorecard_entry error:", e);
			}
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
						<div class="nn-field-label"><span>${this.get_field_label("EOS Metric", "metric_name", "Title")}</span></div>
						<input type="text" class="nn-input-text" id="nn-d-title" value="${this.esc(current_title)}" placeholder="${__("Enter measurable title…")}">
					</div>

					<div class="nn-field-group">
						<div class="nn-field-label"><span>${this.get_field_label("EOS Metric", "description", "Description (Optional)")}</span></div>
						<textarea class="nn-textarea" style="width:100%;height:70px;border:1px solid #d1d5db;border-radius:6px;padding:8px" id="nn-d-desc">${this.esc(current_desc)}</textarea>
					</div>

					<div class="nn-field-group">
						<div class="nn-field-label"><span>${this.get_field_label("EOS Metric", "team", "Team")}</span></div>
						<select class="nn-select" id="nn-d-team">${team_options}</select>
					</div>

					<div class="nn-field-group">
						<div class="nn-field-label"><span>${this.get_field_label("EOS Metric", "frequency", "Period Interval")}</span></div>
						<select class="nn-select" id="nn-d-interval">
							<option value="Weekly" ${current_freq === "Weekly" ? "selected" : ""}>Weekly</option>
							<option value="Monthly" ${current_freq === "Monthly" ? "selected" : ""}>Monthly</option>
						</select>
					</div>

					<div class="nn-field-group">
						<div class="nn-field-label"><span>${this.get_field_label("EOS Metric", "owner_user", "Owner")}</span></div>
						<select class="nn-select" id="nn-d-owner">${owner_options}</select>
					</div>

					<div class="nn-field-group">
						<div class="nn-field-label"><span>${this.get_field_label("EOS Metric", "target_value", "Value / Goal")}</span></div>
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