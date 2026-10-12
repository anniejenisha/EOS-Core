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
		"target": '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
		"alert-circle": '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
		"archive": '<rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/>'
	};

	const ic = (n, s) => `<svg class="nn-svg" width="${s || 14}" height="${s || 14}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${IC[n] || ""}</svg>`;

	class EOSNinety {
		constructor(wrapper) {
			this.wrapper = wrapper;
			this.page = frappe.ui.make_app_page({ parent: wrapper, title: __("EOS"), single_column: true });
			$(wrapper).find(".page-head").hide();

			this.s = {
				view: "scorecard",
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

				todo_team: "All Teams",
				todo_owner: "All",
				todo_tab: "Team",
				todo_archive: false,
				todo_search: "",
				todo_sort_dir: "asc",

				issue_team: "All Teams",
				issue_owner: "All",
				issue_tab: "Short-Term",
				issue_archive: false,
				issue_search: "",
				issue_priority: "All"
			};
			this.data = { periods: [], metrics: [] };
			this.rocks = [];
			this.todos = [];
			this.issues = [];
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
			const dtypes = ["Rock", "To Do", "EOS Metric", "Team", "Player", "Issue"];
			if (frappe.model && frappe.model.with_doctype) {
				await Promise.all(dtypes.map(dt => frappe.model.with_doctype(dt).catch(() => {})));
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

		is_field_mandatory(doctype, fieldname, fallback = false) {
			try {
				if (frappe.meta && frappe.meta.get_docfield) {
					const df = frappe.meta.get_docfield(doctype, fieldname);
					if (df && df.reqd != null) return Boolean(df.reqd);
				}
				if (frappe.get_meta) {
					const meta = frappe.get_meta(doctype);
					if (meta && meta.fields) {
						const df = meta.fields.find(f => f.fieldname === fieldname);
						if (df && df.reqd != null) return Boolean(df.reqd);
					}
				}
			} catch (_) {}
			return fallback;
		}

		render_field_label(doctype, fieldname, fallback_label = "", fallback_reqd = false) {
			const label = this.get_field_label(doctype, fieldname, fallback_label);
			const is_reqd = this.is_field_mandatory(doctype, fieldname, fallback_reqd);
			return `<span>${label}</span>${is_reqd ? ` <span style="color:#ef4444" title="${__("Mandatory")}">*</span>` : ""}`;
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

		async fetch_all_teams(force = false) {
			if (!force && this.all_teams && this.all_teams.length > 1) return;
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

		async fetch_players(force = false) {
			if (!force && this.players && this.players.length > 0) return;
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
			.nn-table-scroll { overflow-x: auto; max-width: 100%; position: relative; }
			.nn-sc-tbl { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 12.5px; white-space: nowrap; }
			.nn-sc-tbl th { padding: 8px 12px; background: #fafafa; border-bottom: 1px solid #e5e7eb; border-right: 1px solid #f1f3f5; font-size: 11px; font-weight: 600; color: #6b7280; text-align: right; }
			.nn-sc-tbl th.left { text-align: left; }
			.nn-sc-tbl td { padding: 10px 12px; border-bottom: 1px solid #f1f3f5; border-right: 1px solid #f8fafc; text-align: right; vertical-align: middle; background: #fff; }
			.nn-sc-tbl td.left { text-align: left; }
			.nn-col-metric { position: sticky; left: 0; z-index: 4; min-width: 240px; max-width: 240px; background: #fff; }
			.nn-col-owner { position: sticky; left: 240px; z-index: 4; width: 64px; min-width: 64px; max-width: 64px; text-align: center; background: #fff; }
			.nn-col-goal { position: sticky; left: 304px; z-index: 4; width: 90px; min-width: 90px; max-width: 90px; text-align: center; background: #fff; border-right: 2px solid #e2e8f0 !important; box-shadow: 3px 0 6px -2px rgba(0,0,0,0.08); }
			.nn-sc-tbl thead th.nn-col-metric, .nn-sc-tbl thead th.nn-col-owner, .nn-sc-tbl thead th.nn-col-goal { background: #fafafa !important; z-index: 6; }
			.nn-sc-tbl tbody tr:hover td.nn-col-metric, .nn-sc-tbl tbody tr:hover td.nn-col-owner, .nn-sc-tbl tbody tr:hover td.nn-col-goal { background: #f9fafb !important; }
			.nn-btn-bar { display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 12px; border-radius: 6px; border: 1px solid #e5e7eb; background: #fff; font-size: 12px; font-weight: 500; color: #374151; cursor: pointer; }
			.nn-btn-bar:hover { background: #f9fafb; border-color: #cbd5e1; }

			/* Interactive Editable Cells & Goal Color Badges */
			.nn-sc-cell { min-width: 72px; text-align: center; cursor: pointer; user-select: none; transition: background 0.12s ease; position: relative; }
			.nn-sc-cell:hover { background: #f3f4f6; }
			.nn-sc-cell.pass { background-color: #dcfce7 !important; color: #15803d !important; }
			.nn-sc-cell.pass:hover { background-color: #bbf7d0 !important; }
			.nn-sc-cell.fail { background-color: #fee2e2 !important; color: #dc2626 !important; }
			.nn-sc-cell.fail:hover { background-color: #fecaca !important; }
			.nn-cell-val.empty { color: #9ca3af; font-size: 13px; font-weight: 500; }
			.nn-cell-badge { display: inline-flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; line-height: 1.2; color: inherit; }
			.nn-cell-badge.pass { background: transparent !important; color: #15803d !important; border: none !important; }
			.nn-cell-badge.fail { background: transparent !important; color: #dc2626 !important; border: none !important; }
			.nn-sc-cell-input { width: 68px; height: 28px; border: 2px solid #064e3b; border-radius: 6px; text-align: center; font-size: 12.5px; font-weight: 700; color: #111827; background: #ffffff; outline: none; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }

			.nn-cell-wrap { display: inline-flex; align-items: center; justify-content: center; gap: 4px; position: relative; }
			.nn-btn-make-issue { display: inline-flex; align-items: center; gap: 3px; padding: 2px 5px; font-size: 10px; font-weight: 600; color: #b91c1c; background: #ffffff; border: 1px solid #fca5a5; border-radius: 4px; cursor: pointer; line-height: 1.2; transition: all 0.15s ease; white-space: nowrap; }
			.nn-btn-make-issue:hover { background: #fee2e2; border-color: #ef4444; color: #991b1b; }
			.nn-cell-issue-link { display: inline-flex; align-items: center; gap: 2px; font-size: 10px; font-weight: 600; color: #4338ca; background: #e0e7ff; border: 1px solid #c7d2fe; border-radius: 4px; padding: 2px 5px; text-decoration: none; line-height: 1.2; white-space: nowrap; transition: all 0.15s ease; max-width: 90px; overflow: hidden; text-overflow: ellipsis; }
			.nn-cell-issue-link:hover { text-decoration: underline; background: #c7d2fe; }

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

			.nn-btn-green { height: 36px; padding: 0 16px; border-radius: 6px; background: #064e3b; color: #ffffff; font-size: 13px; font-weight: 600; border: none; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 6px; transition: background 0.15s; }
			.nn-btn-green:hover { background: #04392b; }
			.nn-issues-body { padding: 24px 32px 48px; display: flex; justify-content: center; width: 100%; background: #ffffff; }
			.nn-issues-empty-wrap { width: 100%; max-width: 640px; margin: 40px auto; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 14px; }
			.nn-issues-empty-icon { width: 48px; height: 48px; border-radius: 50%; background: #f3f4f6; color: #9ca3af; display: flex; align-items: center; justify-content: center; margin-bottom: 4px; }
			.nn-issues-empty-title { font-size: 16px; font-weight: 700; color: #111827; margin: 0; }
			.nn-issues-empty-desc { font-size: 13px; color: #6b7280; margin: 0; max-width: 440px; line-height: 1.5; }
			.nn-issues-learn-link { font-size: 12px; color: #064e3b; text-decoration: underline; cursor: pointer; font-weight: 500; }
			.nn-issue-priority-select { border: 1px solid #e5e7eb; border-radius: 4px; padding: 2px 6px; font-size: 11.5px; color: #374151; background: #fff; cursor: pointer; outline: none; }
			.nn-issue-priority-select:focus { border-color: #064e3b; }
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
						
						<div class="nn-nav-item on" data-view="scorecard">
							${ic("scorecard-icon", 16)} <span>${__("Scorecard")}</span>
						</div>
						<div class="nn-nav-item" data-view="rocks">
							${ic("rock-icon", 16)} <span>${__("Rocks")}</span>
						</div>
						<div class="nn-nav-item" data-view="todos">
							${ic("todo-icon", 16)} <span>${__("To-Dos")}</span>
						</div>
						<div class="nn-nav-item" data-view="issues">
							${ic("alert-circle", 16)} <span>${__("Issues")}</span>
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
			else if (view === "issues") this.load_issues();
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
				"name", "rock_name as title", "status", "owner_user", "team", "is_company_rock", "scope", "duration_start", "duration_end as due"
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
						<div class="nn-top-search">${ic("search", 13)}<input type="text" placeholder="${__("Search…")}"></div>
						<button class="nn-btn-icon">${ic("bell", 15)}<span class="nn-dot-red"></span></button>
						<button class="nn-btn-create" id="nn-create-rock-top">${ic("plus", 13)} ${__("Create")}</button>
					</div>
				</div>

				<div class="nn-tabs">
					<div class="nn-tab ${s.rock_tab === "List" ? "on" : ""}" data-rtab="List"><span style="font-size:14px">≡</span> ${__("List")}</div>
					<div class="nn-tab ${s.rock_tab === "Planning" ? "on" : ""}" data-rtab="Planning"><span style="font-size:14px">⊞</span> ${__("Planning Board")}</div>
					<div class="nn-tab ${s.rock_tab === "Archive" ? "on" : ""}" data-rtab="Archive">${ic("archive", 13)} ${__("Archive")}</div>
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
			let label = __("On-track");

			if (is_off) {
				cls = "off-track";
				label = __("Off-track");
			} else if (is_complete) {
				cls = "complete";
				label = __("Complete");
			} else if (is_dropped) {
				cls = "dropped";
				label = __("Dropped");
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
					["In Progress", __("On-track")],
					["Not Started", __("Off-track")],
					["Complete", __("Complete")]
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
			const current_start = r && r.duration_start ? r.duration_start : ((frappe.datetime && frappe.datetime.get_today) ? frappe.datetime.get_today() : "2026-10-01");
			const current_due = r && r.due ? r.due : ((frappe.datetime && frappe.datetime.add_months) ? frappe.datetime.add_months(frappe.datetime.get_today(), 3) : "2026-12-31");

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
						<div class="nn-field-label">${this.render_field_label("Rock", "rock_name", "Rock Title", true)}</div>
						<input type="text" class="nn-input-text" id="nn-r-title" value="${this.esc(current_title)}" placeholder="${__("e.g. EOS company portal go live")}">
					</div>

					<div class="nn-field-group">
						<div class="nn-field-label">${this.render_field_label("Rock", "owner_user", "Owner", true)}</div>
						<select class="nn-select" id="nn-r-owner">${owner_options}</select>
					</div>

					<div class="nn-field-group">
						<div class="nn-field-label">${this.render_field_label("Rock", "team", "Team", false)}</div>
						<select class="nn-select" id="nn-r-team">${team_options}</select>
					</div>

					<div class="nn-field-group">
						<div class="nn-field-label">${this.render_field_label("Rock", "scope", "Scope", false)}</div>
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
						<div class="nn-field-label">${this.render_field_label("Rock", "status", "Status", false)}</div>
						<select class="nn-select" id="nn-r-status">
							<option value="In Progress" ${current_status === "In Progress" || current_status === "On-track" ? "selected" : ""}>In Progress (On-track)</option>
							<option value="Not Started" ${current_status === "Not Started" || current_status === "Off-track" ? "selected" : ""}>Not Started (Off-track)</option>
							<option value="Complete" ${current_status === "Complete" ? "selected" : ""}>Complete</option>
						</select>
					</div>

					<div class="nn-field-group">
						<div class="nn-field-label">${this.render_field_label("Rock", "duration_start", "Start Date", true)}</div>
						<input type="date" class="nn-input-text" id="nn-r-start" value="${this.esc(current_start)}">
					</div>

					<div class="nn-field-group">
						<div class="nn-field-label">${this.render_field_label("Rock", "duration_end", "Due Date", true)}</div>
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
					frappe.msgprint(__("Rock Name is mandatory."));
					return;
				}
				const owner = $drawer.find("#nn-r-owner").val();
				if (!owner) {
					frappe.msgprint(__("Owner is mandatory."));
					return;
				}
				const start_date = $drawer.find("#nn-r-start").val();
				if (!start_date) {
					frappe.msgprint(__("Start Date is mandatory."));
					return;
				}
				const due_date = $drawer.find("#nn-r-due").val();
				if (!due_date) {
					frappe.msgprint(__("End Date is mandatory."));
					return;
				}
				const team = $drawer.find("#nn-r-team").val();
				const scope = $drawer.find("#nn-r-scope").val();
				const is_comp = $drawer.find("#nn-r-comp").is(":checked") ? 1 : 0;
				const status = $drawer.find("#nn-r-status").val();

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
							duration_start: start_date,
							duration_end: due_date
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
							duration_start: start_date,
							duration_end: due_date,
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
						<div class="nn-field-label">${this.render_field_label("To Do", "todo_name", "To-Do Title", true)}</div>
						<input type="text" class="nn-input-text" id="nn-td-title" value="${this.esc(current_title)}" placeholder="${__("e.g. Complete customer review meeting")}">
					</div>

					<div class="nn-field-group">
						<div class="nn-field-label">${this.render_field_label("To Do", "owner_user", "Owner", true)}</div>
						<select class="nn-select" id="nn-td-owner">${owner_options}</select>
					</div>

					<div class="nn-field-group">
						<div class="nn-field-label">${this.render_field_label("To Do", "team", "Team", false)}</div>
						<select class="nn-select" id="nn-td-team">${team_options}</select>
					</div>

					<div class="nn-field-group">
						<div class="nn-field-label">${this.render_field_label("To Do", "due_date", "Due Date", false)}</div>
						<input type="date" class="nn-input-text" id="nn-td-due" value="${this.esc(current_due)}">
					</div>

					<div class="nn-field-group">
						<div class="nn-field-label">${this.render_field_label("To Do", "status", "Status", false)}</div>
						<select class="nn-select" id="nn-td-status">
							<option value="Not Started" ${current_status === "Not Started" ? "selected" : ""}>Not Started</option>
							<option value="In Progress" ${current_status === "In Progress" ? "selected" : ""}>In Progress</option>
							<option value="Complete" ${current_status === "Complete" ? "selected" : ""}>Complete</option>
							<option value="Dropped" ${current_status === "Dropped" ? "selected" : ""}>Dropped</option>
						</select>
					</div>

					<div class="nn-field-group">
						<div class="nn-field-label">${this.render_field_label("To Do", "priority", "Priority", false)}</div>
						<select class="nn-select" id="nn-td-priority">
							<option value="Low" ${current_priority === "Low" ? "selected" : ""}>Low</option>
							<option value="Medium" ${current_priority === "Medium" ? "selected" : ""}>Medium</option>
							<option value="High" ${current_priority === "High" ? "selected" : ""}>High</option>
						</select>
					</div>

					<div class="nn-field-group">
						<div class="nn-field-label">${this.render_field_label("To Do", "notes", "Notes", false)}</div>
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
					frappe.msgprint(__("To-Do Title is mandatory."));
					return;
				}
				const owner = $drawer.find("#nn-td-owner").val();
				if (!owner) {
					frappe.msgprint(__("Owner is mandatory."));
					return;
				}
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

		async load_issues() {
			this.$main.html(`<div style="padding:48px;text-align:center;color:#6b7280;font-size:14px">${__("Loading Issues…")}</div>`);
			try {
				if (!this.all_teams || this.all_teams.length <= 1) await this.fetch_all_teams();
				if (!this.players || !this.players.length) await this.fetch_players();
				await this.fetch_issues_data();
			} catch (e) {
				console.error("Issues load error:", e);
			}
			this.render_issues();
		}

		async fetch_issues_data() {
			const filters = {};
			if (this.s.issue_archive) {
				filters.archived = 1;
			} else {
				filters.archived = 0;
			}
			const res = await this.list("Issue", [
				"name", "issue_name", "status", "priority", "owner_user", "team", "due_date", "description", "solution", "source", "originating_metric", "archived", "creation"
			], filters, "creation desc", 200);

			this.issues = res.ok ? (res.data || []) : [];

			if (!this.users || !this.users.length) {
				const u_res = await this.list("User", ["name", "full_name", "first_name", "last_name", "email"], { enabled: 1 }, "full_name asc", 200);
				this.users = u_res.ok ? u_res.data : [];
			}
		}

		render_issues() {
			const s = this.s;

			this.$main.html(`
				<div class="nn-top-header">
					<div>
						<div class="nn-title">${__("Issues")}</div>
						<div class="nn-sub">${__("Identify and organize your team's most pressing Issues to resolve them with ease.")}</div>
					</div>
					<div class="nn-top-right">
						<div class="nn-top-search">${ic("search", 13)}<input type="text" placeholder="${__("Search…")}"></div>
						<button class="nn-btn-icon">${ic("bell", 15)}<span class="nn-dot-red"></span></button>
						<button class="nn-btn-green" id="nn-create-issue-top">${ic("plus", 13)} ${__("Create")}</button>
					</div>
				</div>

				<div class="nn-tabs">
					<div class="nn-tab ${s.issue_tab === "Short-Term" ? "on" : ""}" data-itab="Short-Term">${__("Short-Term")}</div>
					<div class="nn-tab ${s.issue_tab === "Long-Term" ? "on" : ""}" data-itab="Long-Term">${__("Long-Term")}</div>
				</div>

				<div class="nn-filter-bar">
					<div class="nn-filter-left">
						<button class="nn-pill-select" id="nn-i-team" data-menu>
							<span class="k">${__("Team")}:</span> <b>${this.esc(s.issue_team)}</b> ${ic("chevron-down", 12)}
						</button>
						<button class="nn-pill-select" id="nn-i-owner" data-menu>
							<span class="k">${__("Owner")}:</span> <b>${this.esc(s.issue_owner)}</b> ${ic("chevron-down", 12)}
						</button>
						<div style="display:inline-flex;align-items:center;gap:8px;margin-left:6px;font-size:12.5px;color:#374151">
							<span class="nn-switch ${s.issue_archive ? "on" : ""}" id="nn-sw-i-archive"></span>
							<span>${__("Archive")}</span>
						</div>
					</div>
					<div class="nn-filter-right">
						<button class="nn-ibtn-bar" id="nn-i-refresh" title="${__("Refresh Issues")}">${ic("refresh", 14)}</button>
						<button class="nn-ibtn-bar" title="${__("More Options")}">${ic("dots", 14)}</button>
						<div class="nn-search-input-wrap">${ic("search", 13)}<input id="nn-issue-search" placeholder="${__("Search Issues…")}" value="${this.esc(s.issue_search)}"></div>
					</div>
				</div>

				<div class="nn-todos-body" id="nn-issues-body-wrap"></div>
			`);

			this.render_issues_table();
			this.bind_issues_events();
		}

		render_issues_table() {
			const s = this.s;
			const all_issues = this.issues || [];
			const q = (s.issue_search || "").toLowerCase().trim();

			let filtered = all_issues.filter(iss => {
				if (q && !(iss.issue_name || "").toLowerCase().includes(q) && !(iss.description || "").toLowerCase().includes(q)) return false;

				if (s.issue_team && s.issue_team !== "All Teams") {
					if (iss.team && iss.team !== s.issue_team) return false;
				}

				if (s.issue_owner && s.issue_owner !== "All") {
					const owner_name = this.get_user_display_name(iss.owner_user);
					if (owner_name !== s.issue_owner && iss.owner_user !== s.issue_owner) return false;
				}

				return true;
			});

			if (filtered.length === 0) {
				const empty_html = `
					<div class="nn-issues-empty-wrap">
						<div class="nn-issues-empty-icon">${ic("info", 24)}</div>
						<div class="nn-issues-empty-title">${__("Your team hasn't added any issues yet.")}</div>
						<div class="nn-issues-empty-desc">${__("Improve communication and transparency to matters that need attention with Issues.")}</div>
						<button class="nn-btn-green" id="nn-issue-empty-add" style="margin-top:6px">${__("Add Issue")}</button>
						<a href="javascript:void(0)" class="nn-issues-learn-link">${__("Learn more about Issues")}</a>
					</div>
				`;
				this.$root.find("#nn-issues-body-wrap").html(empty_html);
				return;
			}

			const table_html = `
				<div class="nn-todo-card">
					<div class="nn-todo-card-header">
						<div class="nn-todo-card-title">
							<span>${this.esc(s.issue_tab)}</span>
							<span class="nn-todo-count">${filtered.length}</span>
						</div>
						<button class="nn-todo-expand-btn" title="${__("Open in full view")}">${ic("arrow-up-right", 15)}</button>
					</div>

					<div class="nn-todo-table-head">
						<div class="nn-todo-col-check"></div>
						<div class="nn-todo-col-title">${__("Title")}</div>
						<div style="width:95px;flex-shrink:0;font-size:12px;font-weight:600;color:#6b7280">${__("Priority")}</div>
						<div style="width:85px;flex-shrink:0;font-size:12px;font-weight:600;color:#6b7280">${__("Created")}</div>
						<div class="nn-todo-col-owner">${__("Owner")}</div>
						<div class="nn-todo-col-actions"></div>
					</div>

					<div class="nn-todo-table-body">
						${filtered.map((iss, idx) => {
							const is_solved = iss.status === "Solved";
							const owner_name = this.get_user_display_name(iss.owner_user);
							const initials = this.get_initials(owner_name || iss.owner_user || "");
							const created_str = this.format_issue_created(iss.creation);
							const priority_val = iss.priority || "Medium";

							return `
								<div class="nn-todo-row" data-id="${this.esc(iss.name)}">
									<div class="nn-todo-col-check">
										<div class="nn-todo-circle-check ${is_solved ? "checked" : ""}" data-id="${this.esc(iss.name)}" title="${is_solved ? __("Reopen Issue") : __("Mark Solved")}">
											${is_solved ? ic("check", 11) : ""}
										</div>
									</div>
									<div class="nn-todo-col-title ${is_solved ? "done" : ""}" data-action="edit" data-id="${this.esc(iss.name)}" title="${__("Click to edit")}">
										${idx + 1}. ${this.esc(iss.issue_name)}
									</div>
									<div style="width:95px;flex-shrink:0;">
										<select class="nn-issue-priority-select" data-id="${this.esc(iss.name)}">
											<option value="Low" ${priority_val === "Low" ? "selected" : ""}>Low</option>
											<option value="Medium" ${priority_val === "Medium" ? "selected" : ""}>Medium</option>
											<option value="High" ${priority_val === "High" ? "selected" : ""}>High</option>
											<option value="Critical" ${priority_val === "Critical" ? "selected" : ""}>Critical</option>
										</select>
									</div>
									<div style="width:85px;flex-shrink:0;font-size:12.5px;color:#6b7280;">
										${created_str}
									</div>
									<div class="nn-todo-col-owner">
										<span class="nn-owner-circle" title="${this.esc(owner_name)}">${this.esc(initials)}</span>
									</div>
									<div class="nn-todo-col-actions">
										<button class="nn-todo-row-menu-btn" data-id="${this.esc(iss.name)}" title="${__("Options")}">
											${ic("dots", 14)}
										</button>
									</div>
								</div>
							`;
						}).join("")}
					</div>

					<div class="nn-todo-card-footer">
						<div class="nn-todo-add-trigger" id="nn-issue-add-btn">
							<span style="font-weight:700;font-size:14px;line-height:1;margin-right:2px;">+</span> ${__("Add Issue")}
						</div>
						<div class="nn-todo-pagination">
							<div class="nn-todo-page-size">${__("Items per page:")} <b>200</b></div>
							<div class="nn-todo-page-info">1 - ${filtered.length} of ${filtered.length}</div>
							<div class="nn-todo-page-nav">
								<button class="nn-p-btn" title="${__("First page")}">&lt;|</button>
								<button class="nn-p-btn" title="${__("Previous page")}">&lt;</button>
								<button class="nn-p-btn" title="${__("Next page")}">&gt;</button>
								<button class="nn-p-btn" title="${__("Last page")}">&gt;|</button>
							</div>
						</div>
					</div>
				</div>
			`;

			this.$root.find("#nn-issues-body-wrap").html(table_html);
		}

		format_issue_created(date_str) {
			if (!date_str) return "";
			try {
				const d = new Date(date_str);
				if (isNaN(d.getTime())) return date_str;
				const day = d.getDate();
				const m = MONTHS[d.getMonth()];
				return `${day} ${m}`;
			} catch (_) {
				return date_str;
			}
		}

		bind_issues_events() {
			const self = this;

			this.$root.off("click.issuecreate").on("click.issuecreate", "#nn-create-issue-top, #nn-issue-add-btn, #nn-issue-empty-add", () => {
				self.open_issue_drawer();
			});

			this.$root.find("[data-itab]").off("click").on("click", function() {
				const tab = $(this).attr("data-itab");
				self.s.issue_tab = tab;
				self.$root.find("[data-itab]").removeClass("on").filter(`[data-itab="${tab}"]`).addClass("on");
				self.render_issues_table();
			});

			this.$root.find("#nn-i-team").off("click").on("click", function (e) {
				e.stopPropagation();
				self.pick_menu(this, self.all_teams, self.s.issue_team, val => {
					self.s.issue_team = val;
					self.$root.find("#nn-i-team b").text(val);
					self.render_issues_table();
				});
			});

			this.$root.find("#nn-i-owner").off("click").on("click", function (e) {
				e.stopPropagation();
				const owners = ["All", ...self.get_available_owners(self.s.issue_team)];
				self.pick_menu(this, owners, self.s.issue_owner, val => {
					self.s.issue_owner = val;
					self.$root.find("#nn-i-owner b").text(val);
					self.render_issues_table();
				});
			});

			this.$root.find("#nn-sw-i-archive").off("click").on("click", async function (e) {
				e.stopPropagation();
				self.s.issue_archive = !self.s.issue_archive;
				$(this).toggleClass("on", self.s.issue_archive);
				await self.fetch_issues_data();
				self.render_issues_table();
			});

			this.$root.find("#nn-i-refresh").off("click").on("click", async () => {
				await self.fetch_issues_data();
				self.render_issues_table();
				frappe.show_alert({ message: __("Issues refreshed"), indicator: "green" });
			});

			this.$root.find("#nn-issue-search").off("input").on("input", function() {
				self.s.issue_search = $(this).val();
				self.render_issues_table();
			});

			this.$root.off("click.issuechk").on("click.issuechk", ".nn-todo-circle-check[data-id]", async function (e) {
				e.stopPropagation();
				const $chk = $(this);
				const id = $chk.attr("data-id");
				const iss = (self.issues || []).find(x => x.name === id);
				if (!iss) return;

				const next_status = iss.status === "Solved" ? "Identified" : "Solved";
				try {
					try {
						await self.call("eos_core.eos_core.doctype.issue.issue.update_issue_status", {
							issue_name: id,
							status: next_status,
							solution: next_status === "Solved" ? (iss.solution || "Resolved") : null
						});
					} catch (_) {
						const update_args = { status: next_status };
						if (next_status === "Solved" && !iss.solution) {
							update_args.solution = "Resolved";
						}
						await self.call("frappe.client.set_value", {
							doctype: "Issue",
							name: id,
							fieldname: update_args
						});
					}
					iss.status = next_status;
					if (next_status === "Solved" && !iss.solution) iss.solution = "Resolved";
					self.render_issues_table();
				} catch (err) {
					frappe.msgprint(err && err.message ? err.message : String(err));
				}
			});

			this.$root.off("change.issuepriority").on("change.issuepriority", ".nn-issue-priority-select", async function (e) {
				e.stopPropagation();
				const $sel = $(this);
				const id = $sel.attr("data-id");
				const new_p = $sel.val();
				try {
					try {
						await self.call("eos_core.eos_core.doctype.issue.issue.update_issue_priority", {
							issue_name: id,
							priority: new_p
						});
					} catch (_) {
						await self.call("frappe.client.set_value", {
							doctype: "Issue",
							name: id,
							fieldname: "priority",
							value: new_p
						});
					}
					const iss = (self.issues || []).find(x => x.name === id);
					if (iss) iss.priority = new_p;
					frappe.show_alert({ message: __("Priority updated"), indicator: "green" });
				} catch (err) {
					frappe.msgprint(err && err.message ? err.message : String(err));
				}
			});

			this.$root.off("click.issueedit").on("click.issueedit", ".nn-todo-col-title[data-action='edit']", function (e) {
				e.stopPropagation();
				const id = $(this).attr("data-id");
				self.open_issue_drawer(id);
			});

			this.$root.off("click.issuemenu").on("click.issuemenu", ".nn-todo-row-menu-btn", function (e) {
				e.stopPropagation();
				const id = $(this).attr("data-id");
				const iss = (self.issues || []).find(x => x.name === id);
				if (!iss) return;

				const opts = [
					__("Edit Issue"),
					iss.status === "Solved" ? __("Reopen Issue") : __("Mark as Solved"),
					iss.archived ? __("Restore Issue") : __("Archive Issue"),
					__("Delete Issue")
				];
				self.pick_menu(this, opts, null, async val => {
					if (val === __("Edit Issue")) {
						self.open_issue_drawer(id);
					} else if (val === __("Mark as Solved") || val === __("Reopen Issue")) {
						const next_status = iss.status === "Solved" ? "Identified" : "Solved";
						try {
							await self.call("eos_core.eos_core.doctype.issue.issue.update_issue_status", {
								issue_name: id,
								status: next_status,
								solution: next_status === "Solved" ? (iss.solution || "Resolved") : null
							});
						} catch (_) {
							const update_args = { status: next_status };
							if (next_status === "Solved" && !iss.solution) update_args.solution = "Resolved";
							await self.call("frappe.client.set_value", {
								doctype: "Issue",
								name: id,
								fieldname: update_args
							});
						}
						await self.fetch_issues_data();
						self.render_issues_table();
					} else if (val === __("Archive Issue") || val === __("Restore Issue")) {
						await self.call("frappe.client.set_value", {
							doctype: "Issue",
							name: id,
							fieldname: "archived",
							value: iss.archived ? 0 : 1
						});
						await self.fetch_issues_data();
						self.render_issues_table();
					} else if (val === __("Delete Issue")) {
						frappe.confirm(__("Are you sure you want to delete this Issue?"), async () => {
							await self.call("frappe.client.delete", { doctype: "Issue", name: id });
							await self.fetch_issues_data();
							self.render_issues_table();
							frappe.show_alert({ message: __("Issue deleted"), indicator: "green" });
						});
					}
				});
			});
		}

		open_issue_drawer(issue_id = null, initial_data = null) {
			const is_edit = !!issue_id;
			const iss = is_edit ? (this.issues || []).find(x => x.name === issue_id) : null;

			const current_title = iss ? iss.issue_name : (initial_data && initial_data.title ? initial_data.title : "");
			const current_owner = iss ? iss.owner_user : (initial_data && initial_data.owner ? initial_data.owner : ((frappe.session && frappe.session.user) || ""));
			const current_team = iss ? (iss.team || "") : (initial_data && initial_data.team ? initial_data.team : (this.s.issue_team !== "All Teams" ? this.s.issue_team : (this.all_teams.find(t => t !== "All Teams") || "")));
			const current_priority = iss ? (iss.priority || "Medium") : "Medium";
			const current_status = iss ? (iss.status || "Identified") : "Identified";
			const current_desc = iss ? (iss.description || "") : (initial_data && initial_data.description ? initial_data.description : "");
			const current_solution = iss ? (iss.solution || "") : "";

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
					<div class="nn-drawer-title">${is_edit ? __("Edit Issue") : __("Create Issue")}</div>
					<div class="nn-drawer-header-actions">
						<button class="nn-drawer-btn-icon" id="nn-drawer-close">${ic("close", 16)}</button>
					</div>
				</div>

				<div class="nn-drawer-body">
					<div class="nn-field-group">
						<div class="nn-field-label">${__("Title")} <span style="color:#ef4444">*</span></div>
						<input type="text" class="nn-input-text" id="nn-iss-title" value="${this.esc(current_title)}" placeholder="${__("This is a test issue")}">
					</div>

					<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
						<div class="nn-field-group">
							<div class="nn-field-label">${__("Team")}</div>
							<select class="nn-select" id="nn-iss-team">${team_options}</select>
						</div>
						<div class="nn-field-group">
							<div class="nn-field-label">${__("Owner")} <span style="color:#ef4444">*</span></div>
							<select class="nn-select" id="nn-iss-owner">${owner_options}</select>
						</div>
					</div>
					<div style="font-size:11px;color:#9ca3af;margin-top:-6px;">
						${__("Changing the team will affect which users the Issue can be assigned to.")}
					</div>

					<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
						<div class="nn-field-group">
							<div class="nn-field-label">${__("Interval")}</div>
							<select class="nn-select" id="nn-iss-interval">
								<option value="Short-Term" selected>${__("Short-Term")}</option>
								<option value="Long-Term">${__("Long-Term")}</option>
							</select>
						</div>
						<div class="nn-field-group">
							<div class="nn-field-label">${__("Priority")}</div>
							<select class="nn-select" id="nn-iss-priority">
								<option value="Low" ${current_priority === "Low" ? "selected" : ""}>Low</option>
								<option value="Medium" ${current_priority === "Medium" ? "selected" : ""}>Medium</option>
								<option value="High" ${current_priority === "High" ? "selected" : ""}>High</option>
								<option value="Critical" ${current_priority === "Critical" ? "selected" : ""}>Critical</option>
							</select>
						</div>
					</div>

					${is_edit ? `
						<div class="nn-field-group">
							<div class="nn-field-label">${__("Status")}</div>
							<select class="nn-select" id="nn-iss-status">
								<option value="Identified" ${current_status === "Identified" ? "selected" : ""}>Identified</option>
								<option value="Discussing" ${current_status === "Discussing" ? "selected" : ""}>Discussing</option>
								<option value="Solved" ${current_status === "Solved" ? "selected" : ""}>Solved</option>
								<option value="Dropped" ${current_status === "Dropped" ? "selected" : ""}>Dropped</option>
							</select>
						</div>
						<div class="nn-field-group" id="nn-iss-sol-wrap" style="${current_status === "Solved" ? "" : "display:none;"}">
							<div class="nn-field-label">${__("Solution")}</div>
							<textarea class="nn-input-text" id="nn-iss-solution" style="height:60px;padding:8px 10px;resize:vertical;" placeholder="${__("Describe how the issue was solved…")}">${this.esc(current_solution)}</textarea>
						</div>
					` : ""}

					<div class="nn-field-group">
						<div class="nn-field-label">${__("Description (optional)")}</div>
						<textarea class="nn-input-text" id="nn-iss-desc" style="height:100px;padding:8px 10px;resize:vertical;" placeholder="${__("Add a description (optional)…")}">${this.esc(current_desc)}</textarea>
					</div>
				</div>

				<div class="nn-drawer-footer">
					<button class="nn-btn-green" id="nn-drawer-issue-save">${is_edit ? __("Save changes") : __("Create Issue")}</button>
					${is_edit ? `<button class="nn-btn-cancel" style="color:#dc2626;border-color:#fca5a5" id="nn-drawer-issue-delete">${__("Delete")}</button>` : ""}
					<button class="nn-btn-cancel" id="nn-drawer-issue-cancel">${__("Cancel")}</button>
				</div>
			`;

			const $drawer = this.$root.find("#nn-drawer");
			$drawer.html(drawer_html);

			const self = this;
			$drawer.find("#nn-drawer-close, #nn-drawer-issue-cancel").on("click", () => self.close_drawer());

			$drawer.find("#nn-iss-status").on("change", function () {
				const is_s = $(this).val() === "Solved";
				$drawer.find("#nn-iss-sol-wrap").toggle(is_s);
			});

			if (is_edit) {
				$drawer.find("#nn-drawer-issue-delete").on("click", async function() {
					frappe.confirm(__("Are you sure you want to delete this Issue?"), async () => {
						await self.call("frappe.client.delete", { doctype: "Issue", name: issue_id });
						self.close_drawer();
						await self.fetch_issues_data();
						self.render_issues_table();
						frappe.show_alert({ message: __("Issue deleted"), indicator: "green" });
					});
				});
			}

			$drawer.find("#nn-drawer-issue-save").on("click", async function () {
				const title = $drawer.find("#nn-iss-title").val().trim();
				if (!title) {
					frappe.msgprint(__("Issue Title is mandatory."));
					return;
				}
				const owner = $drawer.find("#nn-iss-owner").val();
				if (!owner) {
					frappe.msgprint(__("Owner is mandatory."));
					return;
				}
				const team = $drawer.find("#nn-iss-team").val();
				const priority = $drawer.find("#nn-iss-priority").val();
				const desc = $drawer.find("#nn-iss-desc").val().trim();

				try {
					if (is_edit && iss) {
						const status = $drawer.find("#nn-iss-status").val() || iss.status;
						const solution = $drawer.find("#nn-iss-solution").val().trim();
						const fieldname_obj = {
							issue_name: title,
							owner_user: owner,
							team: team,
							priority: priority,
							description: desc,
							status: status
						};
						if (status === "Solved") {
							fieldname_obj.solution = solution || "Resolved";
						}
						await self.call("frappe.client.set_value", {
							doctype: "Issue",
							name: iss.name,
							fieldname: fieldname_obj
						});
					} else {
						const insert_doc = {
							doctype: "Issue",
							issue_name: title,
							owner_user: owner,
							team: team,
							priority: priority,
							description: desc,
							status: "Identified",
							source: initial_data && initial_data.metric_id ? "Scorecard" : "Manual",
							originating_metric: initial_data && initial_data.metric_id ? initial_data.metric_id : null,
							archived: 0
						};
						const res = await self.call("frappe.client.insert", { doc: insert_doc });
						const created_doc = res && res.message;
						if (created_doc && initial_data && initial_data.metric_id && initial_data.period_key) {
							const issue_name = created_doc.name || created_doc.issue_name;
							self.created_issues = self.created_issues || {};
							self.created_issues[`${initial_data.metric_id}_${initial_data.period_key}`] = issue_name;
							const $btn = self.$root.find(`.nn-btn-make-issue[data-metric="${initial_data.metric_id}"][data-date="${initial_data.period_key}"]`);
							if ($btn.length) {
								const $link = $(`<a href="/app/issue/${encodeURIComponent(issue_name)}" class="nn-cell-issue-link" target="_blank" title="${__("View Issue: ")}${self.esc(issue_name)}">${ic("arrow-up-right", 9)} ${__("Issue")}</a>`);
								$btn.replaceWith($link);
							}
						}
					}

					self.close_drawer();
					if (self.s.view === "issues") {
						await self.fetch_issues_data();
						self.render_issues_table();
					}
					frappe.show_alert({ message: __("Issue saved successfully!"), indicator: "green" });
				} catch (err) {
					frappe.msgprint(err && err.message ? err.message : String(err));
				}
			});

			this.$root.find("#nn-drawer-backdrop").addClass("show");
			$drawer.addClass("show");
			$drawer.find("#nn-iss-title").focus();
		}

		/* =========================================================================
		   SCORECARD VIEW IMPLEMENTATION
		   ========================================================================= */
		get_range_label() {
			const s = this.s;
			const tf = s.timeframe || "Week";
			if (tf === "Month") {
				const r = s.range || 6;
				return __(`Last ${r} Months`);
			}
			if (tf === "Quarter") {
				const r = s.range || 4;
				return __(`Last ${r} Quarters`);
			}
			if (tf === "Annual") {
				const r = s.range || 3;
				return __(`Last ${r} Years`);
			}
			const r = s.range || 13;
			return __(`Last ${r} Weeks`);
		}

		make_periods(tf, n) {
			const out = [];
			const now = new Date();
			const base = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);

			for (let i = 0; i < n; i++) {
				if (tf === "Month") {
					const cur_y = base.getFullYear();
					const cur_m = base.getMonth();
					const a = new Date(cur_y, cur_m - i, 1, 12, 0, 0);
					const b = new Date(a.getFullYear(), a.getMonth() + 1, 0, 12, 0, 0);
					const pad = num => String(num).padStart(2, "0");
					const key = `${a.getFullYear()}-${pad(a.getMonth() + 1)}-01`;
					const end = `${b.getFullYear()}-${pad(b.getMonth() + 1)}-${pad(b.getDate())}`;
					const label = `${MONTHS[a.getMonth()]} ${a.getFullYear()}`;
					out.push({ key, end, label, current: i === 0, year: a.getFullYear() });
				} else if (tf === "Quarter") {
					const cur_y = base.getFullYear();
					const cur_q = Math.floor(base.getMonth() / 3);
					const target_total_q = cur_q - i;
					const target_y = cur_y + Math.floor(target_total_q / 4);
					const target_q_idx = ((target_total_q % 4) + 4) % 4;
					const start_m = target_q_idx * 3;
					const a = new Date(target_y, start_m, 1, 12, 0, 0);
					const b = new Date(target_y, start_m + 3, 0, 12, 0, 0);
					const pad = num => String(num).padStart(2, "0");
					const key = `${a.getFullYear()}-${pad(a.getMonth() + 1)}-01`;
					const end = `${b.getFullYear()}-${pad(b.getMonth() + 1)}-${pad(b.getDate())}`;
					const label = `Q${target_q_idx + 1} ${target_y}`;
					out.push({ key, end, label, current: i === 0, year: target_y });
				} else if (tf === "Annual") {
					const target_y = base.getFullYear() - i;
					const key = `${target_y}-01-01`;
					const end = `${target_y}-12-31`;
					const label = `${target_y}`;
					out.push({ key, end, label, current: i === 0, year: target_y });
				} else {
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
			const tf = this.s.timeframe || "Week";
			const default_n = tf === "Month" ? 6 : tf === "Quarter" ? 4 : tf === "Annual" ? 3 : 13;
			const period_count = Number(this.s.range) || default_n;
			this.data = { periods: this.make_periods(tf, period_count), metrics: [] };
			try {
				if (!this.all_teams || this.all_teams.length <= 1) {
					await Promise.all([this.fetch_all_teams(), this.fetch_players()]);
				}
				await this.fetch_scorecard_data();
			} catch (e) {
				console.error("Scorecard error:", e);
			}
			this.render_scorecard();
		}

		async fetch_scorecard_data() {
			const s = this.s, C = CFG, P = this.data.periods;

			const promises = [
				this.list(C.scorecard.doctype, ["name", "team", "timeframe"], { archived: 0 }),
				(!this.users || !this.users.length) ? this.list("User", ["name", "full_name", "first_name", "last_name", "email"], { enabled: 1 }, "full_name asc", 200) : Promise.resolve({ ok: true, data: this.users })
			];

			const [sc_res, u_res] = await Promise.all(promises);
			const scs = sc_res.ok ? sc_res.data : [];
			const sc_match = scs.find(x => x.team === s.team && (x.timeframe === "Weekly" || x.timeframe === "Week")) || scs[0];
			this.current_scorecard_id = sc_match ? sc_match.name : `${s.team}-Weekly`;

			if (u_res.ok && u_res.data) this.users = u_res.data;

			const m_fields = ["name", "metric_name as title", "description", "target_value as goal", "operator as goal_op", "unit", "unit_type", "rollup", "frequency", "owner_user", "team", "scorecard", "group as grp", "min_value", "max_value"];
			
			const [grp_res, m_res] = await Promise.all([
				this.list(C.group.doctype, ["name", "group_name"], { scorecard: this.current_scorecard_id, archived: 0 }),
				this.list(C.measurable.doctype, m_fields, { team: s.team, archived: 0 }, "creation asc", 100)
			]);

			if (grp_res.ok && grp_res.data.length) this.current_group_id = grp_res.data[0].name;

			let raw_metrics = (m_res.ok ? m_res.data : []);
			if (!raw_metrics.length) {
				const fallback_m = await this.list(C.measurable.doctype, m_fields, { scorecard: this.current_scorecard_id, archived: 0 }, "creation asc", 100);
				if (fallback_m.ok && fallback_m.data) raw_metrics = fallback_m.data;
			}

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
				const metric_ids = metrics.map(m => m.id);

				const [e_res, iss_res] = await Promise.all([
					this.call("eos_core.eos_core.doctype.scorecard.scorecard.get_scorecard_entries", {
						metrics: metric_ids,
						team: s.team
					}),
					this.list("Issue", ["name", "issue_name", "originating_metric"], {
						originating_metric: ["in", metric_ids],
						archived: 0
					}, "creation desc", 200)
				]);

				const raw_entries = (e_res.ok && e_res.data) ? e_res.data : [];

				if (s.timeframe === "Week" || !s.timeframe) {
					raw_entries.forEach(e => {
						const met = metrics.find(x => x.id === e.metric || x.id === e.parent || x.title === e.metric);
						if (met) {
							const val = Number(e.v);
							met.values[String(e.d)] = isNaN(val) ? 0 : val;
						}
					});
				} else {
					metrics.forEach(met => {
						const m_entries = raw_entries.filter(x => x.metric === met.id || x.parent === met.id || x.metric === met.title);
						P.forEach(p => {
							const in_period = m_entries.filter(e => e.d >= p.key && e.d <= p.end);
							if (in_period.length) {
								let agg = 0;
								if (met.rollup === "Average") {
									const sum = in_period.reduce((acc, curr) => acc + (Number(curr.v) || 0), 0);
									agg = sum / in_period.length;
								} else {
									agg = in_period.reduce((acc, curr) => acc + (Number(curr.v) || 0), 0);
								}
								met.values[p.key] = Math.round(agg * 100) / 100;
							}
						});
					});
				}

				this.created_issues = this.created_issues || {};
				if (iss_res.ok && iss_res.data) {
					iss_res.data.forEach(iss => {
						const match = (iss.issue_name || "").match(/—\s*(\d{4}-\d{2}-\d{2})/);
						if (match && iss.originating_metric) {
							this.created_issues[`${iss.originating_metric}_${match[1]}`] = iss.name;
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
						<div class="nn-sub">${s.timeframe === "Month" ? __("Track monthly rolled-up measurables against target goals.") : s.timeframe === "Quarter" ? __("Track quarterly rolled-up measurables against target goals.") : s.timeframe === "Annual" ? __("Track annual rolled-up measurables against target goals.") : __("Track weekly and monthly measurables against target goals.")}</div>
					</div>
					<div class="nn-top-right">
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
							<span class="k">${__("Date Range")}:</span> <b>${this.get_range_label()}</b> ${ic("chevron-down", 12)}
						</button>
					</div>
					<div class="nn-filter-right">
						<button class="nn-ibtn-bar" id="nn-sc-undo" title="${__("Undo")}">${ic("undo", 14)}</button>
						<button class="nn-ibtn-bar" id="nn-sc-redo" title="${__("Redo")}">${ic("redo", 14)}</button>
						<button class="nn-btn-bar" id="nn-new-group">+ ${__("New group")}</button>
						<button class="nn-btn-bar" id="nn-mgr">${__("Go to Measurable Manager")}</button>
						<button class="nn-btn-bar" id="nn-optimize"><span style="color:#047857">${ic("sparkle", 13)}</span> ${__("Optimize Scorecard")}</button>
						<button class="nn-btn-bar" id="nn-gen-test-data" style="color:#047857" title="${__("Create test data with red and green boxes")}"><span style="color:#10b981">${ic("sparkle", 13)}</span> ${__("Generate Test Data")}</button>
						<div class="nn-search-input-wrap">${ic("search", 13)}<input id="nn-search-input" placeholder="${__("Search")} ${this.get_doctype_label("EOS Metric", "Measurables")}…" value="${this.esc(s.search)}"></div>
					</div>
				</div>

				<div class="nn-card-wrap" style="margin:16px 28px 40px">
					<div class="nn-card-header">
						<div style="display:flex;align-items:center;gap:8px">
							<span style="font-size:16px;font-weight:700">${s.timeframe === "Month" ? __("Monthly KPIs") : s.timeframe === "Quarter" ? __("Quarterly KPIs") : s.timeframe === "Annual" ? __("Annual KPIs") : __("Weekly KPIs")}</span>
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
				self.pick_menu(this, ["Week", "Month", "Quarter", "Annual"], s.timeframe, v => {
					s.timeframe = v;
					s.range = null;
					self.load_scorecard();
				});
			});

			// Date range dropdown
			$m.find("#nn-range").off("click").on("click", function (e) {
				e.stopPropagation();
				let ranges;
				if (s.timeframe === "Month") {
					ranges = [
						[3, "Last 3 Months"],
						[6, "Last 6 Months"],
						[12, "Last 12 Months"]
					];
				} else if (s.timeframe === "Quarter") {
					ranges = [
						[4, "Last 4 Quarters"],
						[8, "Last 8 Quarters"]
					];
				} else if (s.timeframe === "Annual") {
					ranges = [
						[3, "Last 3 Years"],
						[5, "Last 5 Years"]
					];
				} else {
					ranges = [
						[13, "Last 13 Weeks"],
						[26, "Last 26 Weeks"],
						[52, "Last 52 Weeks"]
					];
				}
				const cur_val = s.range || (ranges[0] && ranges[0][0]);
				self.pick_menu(this, ranges, cur_val, v => {
					s.range = Number(v);
					self.load_scorecard();
				});
			});

			// Timeframe tabs: Weekly, Monthly, Quarterly, Annual
			$m.find(".nn-tab[data-tf]").off("click").on("click", function () {
				const tf = $(this).attr("data-tf");
				$m.find(".nn-tab[data-tf]").removeClass("on");
				$(this).addClass("on");
				s.timeframe = tf;
				s.range = null;
				self.load_scorecard();
			});

			// Create Measurable button
			$m.find("#nn-create-top, #nn-new-meas").off("click").on("click", (e) => {
				e.preventDefault();
				self.open_measurable_drawer();
			});

			// New group button
			$m.find("#nn-new-group").off("click").on("click", function (e) {
				e.preventDefault();
				frappe.prompt([
					{
						label: __("Group Name"),
						fieldname: "group_name",
						fieldtype: "Data",
						reqd: 1,
						placeholder: __("e.g. Sales, Operations, Finance")
					}
				], async (values) => {
					try {
						await self.call("frappe.client.insert", {
							doc: {
								doctype: "Measurable Group",
								group_name: values.group_name,
								scorecard: self.current_scorecard_id,
								archived: 0
							}
						});
						frappe.show_alert({ message: __("Measurable Group created"), indicator: "green" });
						await self.fetch_scorecard_data();
						self.render_grid();
					} catch (err) {
						frappe.msgprint(__("Error creating group: ") + (err.message || err));
					}
				}, __("New Measurable Group"), __("Create Group"));
			});

			// Go to Measurable Manager button
			$m.find("#nn-mgr").off("click").on("click", function (e) {
				e.preventDefault();
				frappe.set_route("List", "EOS Metric");
			});

			// Optimize Scorecard button
			$m.find("#nn-optimize").off("click").on("click", function (e) {
				e.preventDefault();
				self.show_optimize_modal();
			});

			$m.find("#nn-gen-test-data").off("click").on("click", async function (e) {
				e.preventDefault();
				const metric_ids = (self.data.metrics || []).map(m => m.id);
				frappe.show_alert({ message: __("Generating test data..."), indicator: "blue" });
				try {
					await self.call("eos_core.eos_core.doctype.scorecard.scorecard.generate_test_scorecard_data", {
						team: self.s.team,
						metrics: metric_ids,
						force: 1
					});
					await self.load_scorecard();
					frappe.show_alert({ message: __("Test data created with red and green boxes!"), indicator: "green" });
				} catch (err) {
					console.error("Test data generation error:", err);
					frappe.show_alert({ message: __("Failed to generate test data"), indicator: "red" });
				}
			});

			// Undo and Redo buttons
			$m.find("#nn-sc-undo, #nn-sc-redo").off("click").on("click", function (e) {
				e.preventDefault();
				frappe.show_alert({ message: __("Scorecard cell edits are automatically synced live"), indicator: "blue" });
			});



			// Notification bell button
			$m.find(".nn-top-header .nn-btn-icon").off("click").on("click", function (e) {
				e.preventDefault();
				const off_track_count = (self.data.metrics || []).filter(m => {
					const p0 = self.data.periods && self.data.periods[0];
					if (!p0) return false;
					const val = m.values && m.values[p0.key];
					return val != null && !self.check_goal_pass(val, m.goal, m.goal_op, m.min_value, m.max_value);
				}).length;
				frappe.msgprint({
					title: __("Scorecard Alerts"),
					message: __(`Current period has <b>${off_track_count}</b> measurable(s) off track.`),
					indicator: off_track_count ? "orange" : "blue"
				});
			});

			// Search inputs (both top header search and filter bar search)
			$m.find("#nn-search-input").off("input").on("input", function () {
				self.s.search = $(this).val();
				$m.find(".nn-top-search input").val(self.s.search);
				self.render_grid();
			});

			$m.find(".nn-top-search input").off("input").on("input", function () {
				self.s.search = $(this).val();
				$m.find("#nn-search-input").val(self.s.search);
				self.render_grid();
			});
		}

		show_optimize_modal() {
			const metrics = this.data.metrics || [];
			const periods = this.data.periods || [];
			let total_entries = 0, on_track = 0, off_track = 0, missing = 0;

			metrics.forEach(m => {
				periods.forEach(p => {
					const val = m.values && m.values[p.key];
					if (val == null) {
						missing++;
					} else {
						total_entries++;
						const pass = this.check_goal_pass(val, m.goal, m.goal_op, m.min_value, m.max_value);
						if (pass) on_track++;
						else off_track++;
					}
				});
			});

			const pass_rate = total_entries ? Math.round((on_track / total_entries) * 100) : 0;

			const d = new frappe.ui.Dialog({
				title: __("Scorecard Health & Optimization"),
				fields: [
					{
						fieldtype: "HTML",
						fieldname: "stats_html",
						options: `
							<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px;text-align:center">
								<div style="background:#f8fafc;padding:12px;border-radius:8px;border:1px solid #e2e8f0">
									<div style="font-size:11px;color:#64748b;font-weight:600">MEASURABLES</div>
									<div style="font-size:22px;font-weight:700;color:#1e293b">${metrics.length}</div>
								</div>
								<div style="background:#dcfce7;padding:12px;border-radius:8px;border:1px solid #86efac">
									<div style="font-size:11px;color:#15803d;font-weight:600">ON TRACK</div>
									<div style="font-size:22px;font-weight:700;color:#15803d">${on_track}</div>
								</div>
								<div style="background:#fee2e2;padding:12px;border-radius:8px;border:1px solid #fca5a5">
									<div style="font-size:11px;color:#dc2626;font-weight:600">OFF TRACK</div>
									<div style="font-size:22px;font-weight:700;color:#dc2626">${off_track}</div>
								</div>
								<div style="background:#f1f5f9;padding:12px;border-radius:8px;border:1px solid #cbd5e1">
									<div style="font-size:11px;color:#475569;font-weight:600">PASS RATE</div>
									<div style="font-size:22px;font-weight:700;color:#0f172a">${pass_rate}%</div>
								</div>
							</div>
							<div style="font-size:13px;line-height:1.6;color:#334155;background:#ffffff;padding:12px;border:1px solid #e2e8f0;border-radius:6px">
								<b>${__("Optimization Insights:")}</b>
								<ul style="margin:8px 0 0 18px;padding:0">
									${missing > 0 ? `<li>${missing} ${__("period cells have missing entries. Keep entries updated weekly for accurate rollups.")}</li>` : `<li>${__("All historical period cells have recorded values.")}</li>`}
									${off_track > 0 ? `<li>${off_track} ${__("entries are currently off track. Consider creating an Issue for recurring bottlenecks.")}</li>` : `<li>${__("No off-track metrics found.")}</li>`}
									<li>${__("Maintain 5-15 measurable KPIs per team scorecard for high-focus EOS traction.")}</li>
								</ul>
							</div>
						`
					}
				],
				primary_action_label: __("Close"),
				primary_action() {
					d.hide();
				}
			});
			d.show();
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
						const existing_issue = self.created_issues && self.created_issues[`${m.id}_${p.key}`];
						let issue_action = "";
						if (!pass) {
							if (existing_issue) {
								issue_action = `<a href="/app/issue/${encodeURIComponent(existing_issue)}" class="nn-cell-issue-link" target="_blank" title="${__("View Issue: ")}${self.esc(existing_issue)}">${ic("arrow-up-right", 9)} ${__("Issue")}</a>`;
							} else {
								issue_action = `
									<button class="nn-btn-make-issue" title="${__("Make it an Issue")}" data-metric="${self.esc(m.id)}" data-date="${p.key}">
										${ic("alert-circle", 10)}
										<span class="nn-make-issue-text">${__("Issue")}</span>
									</button>`;
							}
						}
						cells += `
							<td class="nn-sc-cell ${cls}" data-metric="${self.esc(m.id)}" data-key="${p.key}" data-goal="${m.goal}" data-op="${self.esc(m.goal_op || '>=')}">
								<div class="nn-cell-wrap">
									<span class="nn-cell-badge ${cls}">${val}</span>
									${issue_action}
								</div>
							</td>`;
					}
				});

				return `
					<tr>
						<td class="left nn-col-metric" style="font-weight:600;color:#111827">
							<span class="nn-metric-title" data-id="${m.id}" style="cursor:pointer">${this.esc(m.title)}</span>
						</td>
						<td class="nn-col-owner" style="text-align:center">
							<span class="nn-av-circle" style="width:22px;height:22px;font-size:9.5px">${initials}</span>
						</td>
						<td class="nn-col-goal" style="font-weight:600;color:#374151;text-align:center">${m.goal_op || ">="} ${m.goal}</td>
						${cells}
					</tr>
				`;
			}).join("");

			this.$main.find("#nn-table-wrap").html(`
				<table class="nn-sc-tbl">
					<thead>
						<tr>
							<th class="left nn-col-metric" style="min-width:240px">${this.get_field_label("EOS Metric", "metric_name", "Measurable")}</th>
							<th class="nn-col-owner" style="width:64px;min-width:64px;text-align:center">${this.get_field_label("EOS Metric", "owner_user", "Owner")}</th>
							<th class="nn-col-goal" style="width:90px;min-width:90px;text-align:center">${this.get_field_label("EOS Metric", "target_value", "Goal")}</th>
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
				if (self.s.timeframe && self.s.timeframe !== "Week") {
					frappe.show_alert({
						message: __("Rolled-up view is read-only. Switch to Weekly KPIs to enter data."),
						indicator: "blue"
					});
					return;
				}
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
						$td.removeClass("pass fail").html('<span class="nn-cell-val empty">-</span>');
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
					const existing_issue = self.created_issues && self.created_issues[`${metric_id}_${key}`];
					let issue_html = "";
					if (!pass) {
						if (existing_issue) {
							issue_html = `<a href="/app/issue/${encodeURIComponent(existing_issue)}" class="nn-cell-issue-link" target="_blank" title="${__("View Issue: ")}${self.esc(existing_issue)}">${ic("arrow-up-right", 9)} ${__("Issue")}</a>`;
						} else {
							issue_html = `
								<button class="nn-btn-make-issue" title="${__("Make it an Issue")}" data-metric="${self.esc(metric_id)}" data-date="${key}">
									${ic("alert-circle", 10)}
									<span class="nn-make-issue-text">${__("Issue")}</span>
								</button>`;
						}
					}
					$td.removeClass("pass fail").addClass(cls).html(`
						<div class="nn-cell-wrap">
							<span class="nn-cell-badge ${cls}">${new_val}</span>
							${issue_html}
						</div>
					`);
					self.bind_grid_cell_events();

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
							const cls = pass ? "pass" : "fail";
							const existing_issue = self.created_issues && self.created_issues[`${metric_id}_${key}`];
							let issue_html = "";
							if (!pass) {
								if (existing_issue) {
									issue_html = `<a href="/app/issue/${encodeURIComponent(existing_issue)}" class="nn-cell-issue-link" target="_blank" title="${__("View Issue: ")}${self.esc(existing_issue)}">${ic("arrow-up-right", 9)} ${__("Issue")}</a>`;
								} else {
									issue_html = `
										<button class="nn-btn-make-issue" title="${__("Make it an Issue")}" data-metric="${self.esc(metric_id)}" data-date="${key}">
											${ic("alert-circle", 10)}
											<span class="nn-make-issue-text">${__("Issue")}</span>
										</button>`;
								}
							}
							$td.removeClass("pass fail").addClass(cls).html(`
								<div class="nn-cell-wrap">
									<span class="nn-cell-badge ${cls}">${cur_val}</span>
									${issue_html}
								</div>
							`);
							self.bind_grid_cell_events();
						} else {
							$td.removeClass("pass fail").html('<span class="nn-cell-val empty">-</span>');
						}
					}
				});
			});

			// Make it an Issue button click handler
			$m.find(".nn-btn-make-issue").off("click").on("click", async function (e) {
				e.stopPropagation();
				e.preventDefault();
				const $btn = $(this);
				const metric_id = $btn.attr("data-metric");
				const period_key = $btn.attr("data-date");

				$btn.prop("disabled", true).text(__("Creating..."));
				try {
					const res = await frappe.call({
						method: "eos_core.eos_core.doctype.issue.issue.create_issue_from_metric",
						args: {
							metric_name: metric_id,
							week_start_date: period_key
						}
					});
					const issue = res && res.message;
					if (issue) {
						const issue_name = issue.name || issue.issue_name;
						self.created_issues = self.created_issues || {};
						self.created_issues[`${metric_id}_${period_key}`] = issue_name;

						const $link = $(`<a href="/app/issue/${encodeURIComponent(issue_name)}" class="nn-cell-issue-link" target="_blank" title="${__("View Issue: ")}${self.esc(issue_name)}">${ic("arrow-up-right", 9)} ${__("Issue")}</a>`);
						$btn.replaceWith($link);

						frappe.show_alert({
							message: __(`Issue created: <a href="/app/issue/${encodeURIComponent(issue_name)}" style="font-weight:700;text-decoration:underline" target="_blank">${self.esc(issue_name)}</a>`),
							indicator: "green"
						}, 7);
					}
				} catch (err) {
					$btn.prop("disabled", false).html(`${ic("alert-circle", 10)} <span class="nn-make-issue-text">${__("Issue")}</span>`);
					const msg = err && err.message ? err.message : (err && err._server_messages ? JSON.parse(err._server_messages).join("\n") : String(err));
					frappe.msgprint({
						title: __("Make it an Issue Error"),
						message: msg,
						indicator: "red"
					});
				}
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
			const current_op = m ? (m.goal_op || ">=") : ">=";
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
						<div class="nn-field-label">${this.render_field_label("EOS Metric", "metric_name", "Title", true)}</div>
						<input type="text" class="nn-input-text" id="nn-d-title" value="${this.esc(current_title)}" placeholder="${__("Enter measurable title…")}">
					</div>

					<div class="nn-field-group">
						<div class="nn-field-label">${this.render_field_label("EOS Metric", "description", "Description (Optional)", false)}</div>
						<textarea class="nn-textarea" style="width:100%;height:70px;border:1px solid #d1d5db;border-radius:6px;padding:8px" id="nn-d-desc">${this.esc(current_desc)}</textarea>
					</div>

					<div class="nn-field-group">
						<div class="nn-field-label">${this.render_field_label("EOS Metric", "team", "Team", true)}</div>
						<select class="nn-select" id="nn-d-team">${team_options}</select>
					</div>

					<div class="nn-field-group">
						<div class="nn-field-label">${this.render_field_label("EOS Metric", "frequency", "Period Interval", true)}</div>
						<select class="nn-select" id="nn-d-interval">
							<option value="Weekly" ${current_freq === "Weekly" ? "selected" : ""}>Weekly</option>
							<option value="Monthly" ${current_freq === "Monthly" ? "selected" : ""}>Monthly</option>
							<option value="Quarterly" ${current_freq === "Quarterly" ? "selected" : ""}>Quarterly</option>
							<option value="Annual" ${current_freq === "Annual" ? "selected" : ""}>Annual</option>
						</select>
					</div>

					<div class="nn-field-group">
						<div class="nn-field-label">${this.render_field_label("EOS Metric", "operator", "Operator", true)}</div>
						<select class="nn-select" id="nn-d-operator">
							<option value=">=" ${current_op === ">=" ? "selected" : ""}>&gt;= (Greater than or equal to)</option>
							<option value="<=" ${current_op === "<=" ? "selected" : ""}>&lt;= (Less than or equal to)</option>
							<option value="==" ${current_op === "==" ? "selected" : ""}>== (Equal to)</option>
							<option value="Inside min/max" ${current_op === "Inside min/max" ? "selected" : ""}>Inside min/max</option>
							<option value="Outside min/max" ${current_op === "Outside min/max" ? "selected" : ""}>Outside min/max</option>
						</select>
					</div>

					<div class="nn-field-group">
						<div class="nn-field-label">${this.render_field_label("EOS Metric", "owner_user", "Owner", true)}</div>
						<select class="nn-select" id="nn-d-owner">${owner_options}</select>
					</div>

					<div class="nn-field-group">
						<div class="nn-field-label">${this.render_field_label("EOS Metric", "target_value", "Value / Goal", false)}</div>
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
				if (!title) {
					frappe.msgprint(__("Measurable Title is mandatory."));
					return;
				}
				const owner = $drawer.find("#nn-d-owner").val();
				if (!owner) {
					frappe.msgprint(__("Owner is mandatory."));
					return;
				}
				const team = $drawer.find("#nn-d-team").val() || self.s.team;
				if (!team) {
					frappe.msgprint(__("Team is mandatory."));
					return;
				}
				const freq = $drawer.find("#nn-d-interval").val() || "Weekly";
				const op = $drawer.find("#nn-d-operator").val() || ">=";
				const desc = $drawer.find("#nn-d-desc").val().trim();
				const val = Number($drawer.find("#nn-d-val").val()) || 0;

				if (is_edit && m) {
					await self.call("frappe.client.set_value", {
						doctype: "EOS Metric", name: m.id,
						fieldname: {
							metric_name: title,
							description: desc,
							owner_user: owner,
							target_value: val,
							operator: op,
							frequency: freq,
							team: team
						}
					});
				} else {
					await self.call("frappe.client.insert", {
						doc: {
							doctype: "EOS Metric",
							metric_name: title,
							description: desc,
							owner_user: owner,
							target_value: val,
							operator: op,
							frequency: freq,
							team: team,
							scorecard: self.current_scorecard_id,
							archived: 0
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
	frappe.provide("frappe.re_route");
	frappe.re_route["scorecard-grid"] = "scorecard_grid";

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