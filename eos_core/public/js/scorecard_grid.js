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
		"filter": '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
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
		"archive": '<rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/>',
		"calendar": '<rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
		"play": '<polygon points="6 3 20 12 6 21 6 3"/>',
		"printer": '<polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/>',
		"tool": '<path d="m14.7 6.3-2.1-2.1a1 1 0 0 0-1.4 0L2 13.4a1 1 0 0 0 0 1.4l2.1 2.1a1 1 0 0 0 1.4 0l9.2-9.2a1 1 0 0 0 0-1.4Z"/><path d="M16.5 4.5 19.5 7.5"/>',
		"message-square": '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
		"star": '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
		"check-circle": '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
		"file-text": '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>'
	};

	const ic = (n, s) => `<svg class="nn-svg" width="${s || 14}" height="${s || 14}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${IC[n] || ""}</svg>`;

	const OWNER_PALETTES = [
		{ bg: '#dbeafe', fg: '#1e40af' },
		{ bg: '#fce7f3', fg: '#9d174d' },
		{ bg: '#e0e7ff', fg: '#3730a3' },
		{ bg: '#fef3c7', fg: '#92400e' },
		{ bg: '#dcfce7', fg: '#166534' },
		{ bg: '#ede9fe', fg: '#5b21b6' },
		{ bg: '#cffafe', fg: '#155e75' },
		{ bg: '#ffedd5', fg: '#9a3412' }
	];
	function getOwnerColor(str) {
		let h = 0;
		for (let i = 0; i < (str || '').length; i++) h = (h * 31 + str.charCodeAt(i)) & 0xffffffff;
		return OWNER_PALETTES[Math.abs(h) % OWNER_PALETTES.length];
	}

	class EOSNinety {
		constructor(wrapper) {
			this.wrapper = wrapper;
			this.page = frappe.ui.make_app_page({ parent: wrapper, title: __("EOS"), single_column: true, hide_sidebar: true });
			this.page.hide_sidebar = true;
			if (wrapper && wrapper.page) wrapper.page.hide_sidebar = true;
			if (frappe.app && frappe.app.sidebar) frappe.app.sidebar.toggle(true);
			$(wrapper).find(".page-head").hide();

			this.s = {
				view: "scorecard",
				timeframe: "All",
				range: 13,
				team: "All Teams",
				owner_filter: null,
				owner_customized: false,
				owner_popover_open: false,
				owner_search: "",
				sc_dir_team: "All Teams",
				sc_dir_tf: "All",
				sc_dir_id: "",
				sc_dir_sort: "Created On",
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
				issue_priority: "All",

				meeting_tab: "Upcoming",
				meeting_team: "All Teams",
				meeting_in_progress: false,
				meeting_agenda_type: "l10",
				meeting_step: 0,
				meeting_seconds: 0,
				meeting_step_seconds: 0,
				meeting_step_times: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
				meeting_sharing_idx: 0,
				meeting_notes: "",
				meeting_ratings: {},
				meeting_attendance: {},
				meeting_tools_open: false
			};
			this.data = { periods: [], metrics: [] };
			this.rocks = [];
			this.todos = [];
			this.issues = [];
			this.meetings = [];
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
				await Promise.all(dtypes.map(dt => frappe.model.with_doctype(dt).catch(() => { })));
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
			} catch (_) { }
			return fallback ? __(fallback) : fieldname;
		}

		get_doctype_label(doctype, fallback = "") {
			try {
				if (frappe.get_meta) {
					const meta = frappe.get_meta(doctype);
					if (meta && meta.name) return __(meta.name);
				}
			} catch (_) { }
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
			} catch (_) { }
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
						fields: ["name", "team_name", "leader", "archived"],
						limit: 200,
						order_by: "team_name asc"
					});
					this.teams_raw = res || [];
					if (res && res.length) {
						team_names = res.map(t => t.team_name || t.name).filter(Boolean);
					}
				}
				if (!team_names.length) {
					const res = await this.list("Team", ["name", "team_name", "leader"], {}, "team_name asc", 200);
					if (res.ok && res.data && res.data.length) {
						this.teams_raw = res.data || [];
						team_names = res.data.map(t => t.team_name || t.name).filter(Boolean);
					}
				}
				const cur_user = (frappe.session && frappe.session.user) || "";
				const is_admin = cur_user.toLowerCase() === "administrator" || cur_user.toLowerCase() === "info@true-group.org" || (frappe.user_roles || []).some(r => /system manager|administrator/i.test(r));

				let user_teams = null;
				if (window.__EOS_BOOT__ && Array.isArray(window.__EOS_BOOT__.teams) && window.__EOS_BOOT__.teams.length) {
					user_teams = window.__EOS_BOOT__.teams;
				}

				if (!is_admin && user_teams && user_teams.length) {
					this.all_teams = [...user_teams];
					if (!this.s.team || !this.all_teams.includes(this.s.team)) {
						this.s.team = this.all_teams[0];
					}
				} else {
					const unique_teams = Array.from(new Set(team_names));
					this.all_teams = ["All Teams", ...unique_teams];
					if (!this.s.team) {
						this.s.team = is_admin ? "All Teams" : (unique_teams[0] || "All Teams");
					}
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

		is_team_leader(team = null) {
			const cur_user = (frappe.session && frappe.session.user) || "";
			if (!cur_user || cur_user === "Guest") return false;
			if (cur_user.toLowerCase() === "administrator" || cur_user.toLowerCase() === "info@true-group.org") return true;

			const roles = frappe.user_roles || (frappe.user && frappe.user.get_roles && frappe.user.get_roles()) || [];
			if (roles.some(r => /system manager|administrator/i.test(r))) return true;

			if (!team || team === "All Teams") {
				return false;
			}

			if (window.__EOS_BOOT__ && Array.isArray(window.__EOS_BOOT__.leader_teams)) {
				if (window.__EOS_BOOT__.leader_teams.includes(team)) return true;
			}

			const cur_fullname = (frappe.session && frappe.session.user_fullname) || "";
			const my_player_names = (this.players || [])
				.filter(p => (p.user && p.user.toLowerCase() === cur_user.toLowerCase()) || (cur_fullname && p.player_name && p.player_name.toLowerCase() === cur_fullname.toLowerCase()))
				.map(p => (p.player_name || p.name || "").toLowerCase());
			const my_player_ids = cur_user ? [cur_user.toLowerCase(), ...my_player_names] : my_player_names;
			if (cur_fullname) my_player_ids.push(cur_fullname.toLowerCase());

			const teams = this.teams_raw || [];
			const t_obj = teams.find(t => (t.team_name === team || t.name === team));
			if (!t_obj || !t_obj.leader) return false;
			const lead = String(t_obj.leader).trim().toLowerCase();
			if (my_player_ids.includes(lead)) return true;
			const clean_lead = lead.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
			if (my_player_ids.includes(clean_lead)) return true;
			if (cur_user.includes("@")) {
				const prefix = cur_user.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, '');
				const lead_alpha = clean_lead.replace(/[^a-z0-9]/g, '');
				if (prefix && lead_alpha && (prefix === lead_alpha || prefix.startsWith(lead_alpha) || lead_alpha.startsWith(prefix))) return true;
			}
			return false;
		}

		is_my_metric(m) {
			if (!m) return false;
			const cur_user = (frappe.session && frappe.session.user) || "";
			const cur_fullname = (frappe.session && frappe.session.user_fullname) || "";
			const owner = String(m.owner || m.owner_user || "").trim().toLowerCase();
			if (!owner) return false;
			if (cur_user && owner === cur_user.toLowerCase()) return true;
			if (cur_fullname && owner === cur_fullname.toLowerCase()) return true;

			const my_player_names = (this.players || [])
				.filter(p => (p.user && p.user.toLowerCase() === cur_user.toLowerCase()) || (cur_fullname && p.player_name && p.player_name.toLowerCase() === cur_fullname.toLowerCase()))
				.map(p => (p.player_name || p.name || "").toLowerCase());
			if (my_player_names.includes(owner)) return true;

			const clean_owner = owner.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
			if (cur_fullname && clean_owner === cur_fullname.toLowerCase().replace(/\s*\([^)]*\)\s*/g, ' ').trim()) return true;
			if (my_player_names.includes(clean_owner)) return true;

			if (cur_user.includes("@")) {
				const prefix = cur_user.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, '');
				const owner_alpha = clean_owner.replace(/[^a-z0-9]/g, '');
				if (prefix && owner_alpha && (prefix === owner_alpha || prefix.startsWith(owner_alpha) || owner_alpha.startsWith(prefix))) return true;
			}
			return false;
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

		get_owner_filter_summary() {
			const all_owners = Array.from(new Set((this.data.metrics || []).map(m => m.owner).filter(Boolean)));
			const my_owners = all_owners.filter(o => this.is_my_metric({ owner: o, owner_user: o }));
			let effective = this.s.owner_customized ? this.s.owner_filter : my_owners;
			if (!effective || (all_owners.length > 0 && effective.length === all_owners.length)) {
				return all_owners.length ? `${__("All")} (${all_owners.length})` : __("All");
			}
			if (Array.isArray(effective)) {
				if (effective.length === 1) {
					return this.is_my_metric({ owner: effective[0], owner_user: effective[0] }) ? __("My Scorecard") : (this.get_user_display_name(effective[0]) || effective[0]);
				}
				if (effective.length === 0) return __("None");
				return `${effective.length} ${__("Selected")}`;
			}
			return all_owners.length ? `${__("All")} (${all_owners.length})` : __("All");
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
			.nn-side-logo { width: 24px; height: 24px; border-radius: 4px; background: transparent; display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden; }
			.nn-side-logo img { width: 100%; height: 100%; object-fit: contain; }
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
			.nn-card-wrap { border: 1px solid #e5e7eb; border-radius: 8px; background: #ffffff; min-height: 0 !important; height: auto !important; }
			.nn-card-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; border-bottom: 1px solid #f1f3f5; }
			.nn-table-scroll { overflow-x: auto; overflow-y: auto; max-width: 100%; position: relative; min-height: 0 !important; height: auto !important; max-height: calc(100vh - 250px); }
			.nn-sc-tbl { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 12.5px; height: 1px !important; }
			.nn-sc-tbl thead th { padding: 6px 12px; background: #fafafa !important; border-bottom: 1px solid #e5e7eb; border-right: 1px solid #f1f3f5; font-size: 11px; font-weight: 600; color: #6b7280; text-align: right; white-space: nowrap; height: 36px !important; box-sizing: border-box; }
			.nn-sc-tbl th.left { text-align: left; }
			.nn-sc-tbl tbody tr { height: 38px !important; max-height: 38px !important; }
			.nn-sc-tbl td { padding: 4px 12px !important; border-bottom: 1px solid #f1f3f5; border-right: 1px solid #f8fafc; text-align: right; vertical-align: middle; background: #fff; white-space: nowrap; height: 38px !important; max-height: 38px !important; box-sizing: border-box; }
			.nn-sc-tbl td.left { text-align: left; }
			.nn-sc-tbl th.nn-col-metric, .nn-sc-tbl td.nn-col-metric, .nn-col-metric { position: sticky; left: 0; z-index: 4; width: 240px; min-width: 240px; max-width: 240px; background: #fff; white-space: normal !important; word-break: break-word !important; overflow-wrap: break-word !important; line-height: 1.35; box-sizing: border-box; }
			.nn-col-metric .nn-metric-title { white-space: normal !important; word-break: break-word !important; overflow-wrap: break-word !important; display: block; max-width: 100%; }
			.nn-col-owner { position: sticky; left: 240px; z-index: 4; width: 76px; min-width: 76px; max-width: 76px; text-align: center; background: #fff; }
			.nn-col-goal { position: sticky; left: 316px; z-index: 4; width: 90px; min-width: 90px; max-width: 90px; text-align: center; background: #fff; border-right: 2px solid #e2e8f0 !important; box-shadow: 3px 0 6px -2px rgba(0,0,0,0.08); }
			.nn-sc-tbl thead th.nn-col-metric, .nn-sc-tbl thead th.nn-col-owner, .nn-sc-tbl thead th.nn-col-goal { background: #fafafa !important; z-index: 6; }
			.nn-sc-tbl tbody tr:hover td.nn-col-metric, .nn-sc-tbl tbody tr:hover td.nn-col-owner, .nn-sc-tbl tbody tr:hover td.nn-col-goal { background: #f9fafb !important; }
			.nn-owner-filter-btn { background: transparent; border: none; padding: 3px 5px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; border-radius: 5px; transition: all 0.15s ease; line-height: 1; color: #9ca3af; }
			.nn-owner-filter-btn:hover { background: #ecfdf5; color: #047857 !important; }
			.nn-owner-filter-btn.active { color: #047857 !important; background: #d1fae5; }

			.sc-owner-filter-pill { display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 12px; font-size: 12.5px; border-radius: 6px; background: #f9fafb; border: 1px solid #e5e7eb; cursor: pointer; color: #374151; font-weight: 500; transition: all 0.15s ease; }
			.sc-owner-filter-pill:hover { background: #f3f4f6; border-color: #d1d5db; }
			.sc-owner-filter-pill.is-filtered { border-color: #86efac; background: #f0fdf4; }

			.nn-owner-filter-popover { position: fixed; width: 300px; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.14), 0 8px 10px -6px rgba(0, 0, 0, 0.08); z-index: 100000; padding: 12px; text-align: left; font-family: inherit; font-weight: normal; cursor: default; display: flex; flex-direction: column; animation: nnPopIn 0.15s cubic-bezier(0.16, 1, 0.3, 1); box-sizing: border-box; }
			@keyframes nnPopIn { from { opacity: 0; transform: translateY(-4px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }

			.nn-owner-popover-header { padding-bottom: 8px; border-bottom: 1px solid #f3f4f6; margin-bottom: 8px; }
			.nn-owner-popover-title-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
			.nn-owner-popover-title { font-size: 12.5px; font-weight: 700; color: #111827; display: flex; align-items: center; gap: 6px; }
			.nn-owner-popover-badge { font-size: 11px; font-weight: 600; padding: 2px 7px; border-radius: 10px; background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
			.nn-owner-quick-row { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }
			.nn-quick-btn { flex: 1; height: 26px; padding: 0 6px; font-size: 11px; font-weight: 600; border-radius: 6px; border: 1px solid #e5e7eb; background: #f9fafb; color: #4b5563; cursor: pointer; transition: all 0.15s ease; display: inline-flex; align-items: center; justify-content: center; }
			.nn-quick-btn:hover { background: #f3f4f6; color: #111827; border-color: #d1d5db; }
			.nn-quick-btn.active { background: #047857; color: #ffffff; border-color: #047857; }

			.nn-owner-search-wrap { position: relative; display: flex; align-items: center; height: 30px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 0 8px; gap: 6px; color: #9ca3af; transition: all 0.15s ease; }
			.nn-owner-search-wrap:focus-within { background: #ffffff; border-color: #047857; box-shadow: 0 0 0 2px rgba(4, 120, 87, 0.15); color: #047857; }
			.nn-owner-search-wrap input { border: none; background: transparent; outline: none; font-size: 12px; color: #111827; width: 100%; box-shadow: none; margin: 0; padding: 0; }
			.nn-owner-search-clear { background: none; border: none; cursor: pointer; padding: 0 4px; color: #9ca3af; font-size: 15px; display: flex; align-items: center; line-height: 1; }
			.nn-owner-search-clear:hover { color: #374151; }

			.nn-owner-filter-list { max-height: 210px; overflow-y: auto; display: flex; flex-direction: column; gap: 3px; padding-right: 2px; }
			.nn-owner-filter-list::-webkit-scrollbar { width: 4px; }
			.nn-owner-filter-list::-webkit-scrollbar-track { background: transparent; }
			.nn-owner-filter-list::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 4px; }

			.nn-owner-row { display: flex; align-items: center; gap: 8px; padding: 6px 8px; font-size: 12px; color: #374151; cursor: pointer; border-radius: 6px; user-select: none; transition: all 0.12s ease; margin: 0; }
			.nn-owner-row:hover { background: #f3f4f6; color: #111827; }
			.nn-owner-row.selected { background: #f0fdf4; }
			.nn-owner-row input[type="checkbox"] { cursor: pointer; accent-color: #047857; margin: 0; width: 15px; height: 15px; flex-shrink: 0; }
			.nn-owner-row-av { width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; flex-shrink: 0; }
			.nn-owner-row-name { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 500; color: #1f2937; }
			.nn-owner-row.selected .nn-owner-row-name { font-weight: 600; color: #064e3b; }
			.nn-me-tag { font-size: 9.5px; font-weight: 700; padding: 1px 5px; border-radius: 4px; background: #dcfce7; color: #15803d; letter-spacing: 0.2px; margin-left: auto; }

			.nn-owner-popover-footer { display: flex; align-items: center; justify-content: space-between; padding-top: 8px; margin-top: 6px; border-top: 1px solid #f3f4f6; }
			.nn-btn-bar { display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 12px; border-radius: 6px; border: 1px solid #e5e7eb; background: #fff; font-size: 12px; font-weight: 500; color: #374151; cursor: pointer; }
			.nn-btn-bar:hover { background: #f9fafb; border-color: #cbd5e1; }

			/* Interactive Editable Cells & Goal Color Badges */
			.nn-sc-cell { min-width: 72px; text-align: center; cursor: pointer; user-select: none; transition: background 0.12s ease; position: relative; }
			.nn-sc-cell:hover { background: #f3f4f6; }
			.nn-sc-cell.pass { background-color: #dcfce7 !important; color: #15803d !important; }
			.nn-sc-cell.pass:hover { background-color: #bbf7d0 !important; }
			.nn-sc-cell.fail { background-color: #fee2e2 !important; color: #dc2626 !important; }
			.nn-sc-cell.fail:hover { background-color: #fecaca !important; }
			.nn-sc-cell.editing, .nn-sc-cell.editing:hover { background-color: #ffffff !important; outline: none !important; cursor: default; }
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
			.nn-todo-circle-check.checked svg { stroke: #ffffff !important; fill: none !important; stroke-width: 2.5 !important; width: 11px !important; height: 11px !important; display: block !important; }

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

			/* ================= L10 Meetings & Meeting Room CSS ================= */
			.nn-meeting-hero { background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 1px solid #e2e8f0; border-radius: 12px; padding: 44px 24px; text-align: center; margin-bottom: 24px; position: relative; overflow: hidden; }
			.nn-meeting-hero-tag { display: inline-block; padding: 3px 12px; background: #e2e8f0; border-radius: 12px; font-size: 11px; font-weight: 700; color: #475569; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
			.nn-meeting-hero-title { font-size: 22px; font-weight: 700; color: #111827; margin: 0 0 20px; }
			.nn-meeting-hero-btns { display: flex; align-items: center; justify-content: center; gap: 12px; }
			
			.nn-upcoming-box { border: 1.5px dashed #d1d5db; border-radius: 10px; padding: 48px 24px; text-align: center; background: #fafbfc; display: flex; flex-direction: column; align-items: center; gap: 10px; }
			.nn-empty-icon-circle { width: 52px; height: 52px; border-radius: 50%; background: #f3f4f6; color: #9ca3af; display: flex; align-items: center; justify-content: center; margin-bottom: 4px; }
			.nn-empty-box-title { font-size: 15px; font-weight: 700; color: #1f2937; margin: 0; }
			.nn-empty-box-sub { font-size: 13px; color: #6b7280; margin: 0; max-width: 420px; }

			.nn-modal-backdrop { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.45); backdrop-filter: blur(2px); z-index: 99998; }
			.nn-modal-card { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 100%; max-width: 480px; background: #ffffff; border-radius: 12px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2), 0 10px 10px -5px rgba(0,0,0,0.1); z-index: 99999; overflow: hidden; }
			.nn-modal-header { display: flex; align-items: flex-start; justify-content: space-between; padding: 20px 24px 14px; border-bottom: 1px solid #f1f3f5; }
			.nn-modal-title { font-size: 18px; font-weight: 700; color: #111827; margin: 0 0 4px; }
			.nn-modal-sub { font-size: 13px; color: #6b7280; margin: 0; }
			.nn-modal-close-btn { background: transparent; border: none; color: #9ca3af; cursor: pointer; padding: 4px; border-radius: 4px; }
			.nn-modal-close-btn:hover { color: #111827; background: #f3f4f6; }
			.nn-modal-body { padding: 20px 24px; max-height: 65vh; overflow-y: auto; }
			.nn-agenda-select-list { display: flex; flex-direction: column; gap: 8px; }
			.nn-agenda-select-item { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border: 1px solid #e5e7eb; border-radius: 8px; background: #ffffff; transition: all 0.15s; }
			.nn-agenda-select-item:hover { border-color: #cbd5e1; background: #f8fafc; }
			.nn-agenda-select-left { display: flex; align-items: center; gap: 12px; }
			.nn-agenda-select-icon { width: 32px; height: 32px; border-radius: 6px; background: #ecfdf5; color: #059669; display: flex; align-items: center; justify-content: center; }
			.nn-agenda-select-title { font-size: 14px; font-weight: 600; color: #1f2937; }

			/* L10 Meeting Workspace */
			.nn-l10-wrap { display: flex; width: 100%; height: 100%; min-height: calc(100vh - 60px); background: #f8fafc; }
			.nn-l10-side { width: 280px; flex-shrink: 0; background: #ffffff; border-right: 1px solid #e5e7eb; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 2px 0 6px rgba(0,0,0,0.02); }
			.nn-l10-side-top { padding: 18px 16px; border-bottom: 1px solid #f1f3f5; }
			.nn-l10-timer-display { display: flex; align-items: center; justify-content: space-between; font-size: 12px; font-weight: 600; color: #6b7280; margin-bottom: 4px; }
			.nn-l10-timer-bold { font-size: 20px; font-weight: 700; color: #111827; font-variant-numeric: tabular-nums; }
			.nn-l10-step-timer-badge { font-size: 12px; font-weight: 600; padding: 2px 8px; border-radius: 12px; background: #ecfdf5; color: #064e3b; }

			.nn-l10-agenda-list { display: flex; flex-direction: column; gap: 2px; padding: 12px 10px; flex: 1; overflow-y: auto; }
			.nn-l10-agenda-item { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; border-radius: 6px; cursor: pointer; font-size: 12.5px; font-weight: 600; color: #4b5563; transition: all 0.12s; border-left: 3px solid transparent; }
			.nn-l10-agenda-item:hover { background: #f3f4f6; color: #111827; }
			.nn-l10-agenda-item.on { background: #ecfdf5; color: #064e3b; border-left-color: #059669; }
			.nn-l10-agenda-left { display: flex; align-items: center; gap: 8px; }
			.nn-l10-agenda-times { font-size: 11px; color: #6b7280; font-variant-numeric: tabular-nums; font-weight: 500; }
			.nn-l10-agenda-item.on .nn-l10-agenda-times { color: #064e3b; font-weight: 600; }

			.nn-l10-side-foot { padding: 14px 16px; border-top: 1px solid #f1f3f5; display: flex; flex-direction: column; gap: 10px; background: #ffffff; }
			.nn-l10-foot-actions { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
			.nn-l10-foot-btn { display: inline-flex; align-items: center; gap: 6px; padding: 6px 10px; border-radius: 6px; border: 1px solid #e5e7eb; background: #fff; font-size: 12px; font-weight: 500; color: #374151; cursor: pointer; flex: 1; justify-content: center; }
			.nn-l10-foot-btn:hover { background: #f9fafb; border-color: #cbd5e1; }

			.nn-l10-main { flex: 1; overflow-y: auto; padding: 24px 36px 60px; }
			.nn-l10-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
			.nn-l10-title { font-size: 18px; font-weight: 700; color: #111827; margin: 0; }
			.nn-l10-sub { font-size: 12.5px; color: #6b7280; margin-top: 2px; }

			.nn-l10-card { background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.03); }
			.nn-l10-card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
			.nn-l10-card-title { font-size: 14px; font-weight: 700; color: #111827; margin: 0; }

			.nn-attendee-grid { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 16px; }
			.nn-attendee-chip { display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 20px; border: 1px solid #e5e7eb; background: #ffffff; font-size: 12.5px; font-weight: 600; color: #374151; cursor: pointer; user-select: none; transition: all 0.12s; }
			.nn-attendee-chip.present { border-color: #059669; background: #ecfdf5; color: #064e3b; }
			.nn-attendee-chip.absent { opacity: 0.55; }

			.nn-sharing-box { text-align: center; padding: 28px 20px; border: 1px dashed #d1d5db; border-radius: 8px; background: #fafbfc; margin-bottom: 16px; }
			.nn-sharing-av { width: 56px; height: 56px; border-radius: 50%; background: #064e3b; color: #ffffff; font-size: 18px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 10px; }
			.nn-sharing-name { font-size: 16px; font-weight: 700; color: #111827; margin-bottom: 4px; }
			.nn-sharing-badge { display: inline-block; padding: 2px 10px; border-radius: 12px; background: #ecfdf5; color: #064e3b; font-size: 11.5px; font-weight: 600; margin-bottom: 14px; }

			.nn-rating-list { display: flex; flex-direction: column; gap: 10px; }
			.nn-rating-item { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border: 1px solid #f1f3f5; border-radius: 6px; background: #ffffff; }
			.nn-rating-input { width: 60px; height: 32px; border: 1px solid #d1d5db; border-radius: 6px; text-align: center; font-size: 14px; font-weight: 700; color: #111827; }
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
							<span class="nn-side-logo"><img src="/assets/eos_core/img/bel-logo-256.png" onerror="this.outerHTML='B'"></span>
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
						<div class="nn-nav-item" data-view="meetings">
							${ic("calendar", 16)} <span>${__("L10 Meeting")}</span>
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
			else if (view === "meetings") this.load_meetings();
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
					${is_sel ? `<span style="color:#059669;display:inline-flex;align-items:center">${ic("check", 13)}</span>` : ''}
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
					const norm = (r.status === "In Progress" || r.status === "On-track") ? "On-track" : (r.status === "Off-track" || r.status === "Dropped") ? "Off-track" : (r.status === "Complete" || r.status === "Done") ? "Done" : r.status;
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
			const is_off = st === "Off-track" || st === "Dropped";
			const is_complete = st === "Complete" || st === "Done";
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
					["Dropped", __("Off-track")],
					["Complete", __("Complete")]
				];

				const current_val = (rock.status === "Dropped" || rock.status === "Off-track") ? "Dropped" : (rock.status === "Complete" || rock.status === "Done" ? "Complete" : "In Progress");

				self.pick_menu(this, options, current_val, async new_val => {
					const prev_val = rock.status;
					const status_to_send = new_val === "Complete" ? "Done" : (new_val === "Dropped" ? "Off-track" : "On-track");
					const res = await self.call("eos_core.eos_api.update_rock_status", {
						docname: rname,
						status: status_to_send
					});
					if (!res || !res.ok || (res.data && res.data.status !== "ok")) {
						rock.status = prev_val;
						self.render_rocks_tables();
						const err_msg = res.error || (res.data && res.data.message) || __("Failed to update rock status");
						frappe.msgprint(err_msg);
						return;
					}
					rock.status = new_val;
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
							<option value="Dropped" ${current_status === "Dropped" || current_status === "Off-track" ? "selected" : ""}>Dropped (Off-track)</option>
							<option value="Complete" ${current_status === "Complete" || current_status === "Done" ? "selected" : ""}>Complete</option>
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

				let res;
				if (is_edit && r) {
					res = await self.call("frappe.client.set_value", {
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
					res = await self.call("frappe.client.insert", {
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

				if (!res || !res.ok) {
					frappe.msgprint(res.error || __("Failed to save Rock"));
					return;
				}

				self.close_drawer();
				await self.fetch_rocks_data();
				if (self.s.view === "rocks") {
					self.render_rocks();
				} else if (self.s.view === "meetings" && self.s.meeting_in_progress) {
					self.render_l10_meeting_workspace();
				}
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
			this.$root.find("[data-ttab]").off("click").on("click", function () {
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
					self.s.todo_owner = "All";
					self.$root.find("#nn-t-team b").text(val);
					self.$root.find("#nn-t-owner b").text("All");
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
			this.$root.find("#nn-todo-search").off("input").on("input", function () {
				self.s.todo_search = $(this).val();
				self.render_todos_table();
			});

			// Sort by Due Date
			this.$root.off("click.todosort").on("click.todosort", "#nn-todo-sort-due", function () {
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
				$drawer.find("#nn-drawer-todo-delete").on("click", async function () {
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
				if (self.s.view === "todos") {
					self.render_todos_table();
				} else if (self.s.view === "meetings" && self.s.meeting_in_progress) {
					self.render_l10_meeting_workspace();
				}
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
				const priority_val = iss.priority || "";

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
											<option value="" ${!priority_val ? "selected" : ""}>${__("None")}</option>
											${['1', '2', '3', '4', '5'].map(p => `<option value="${p}" ${String(priority_val) === p ? "selected" : ""}>${p}</option>`).join("")}
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

			this.$root.find("[data-itab]").off("click").on("click", function () {
				const tab = $(this).attr("data-itab");
				self.s.issue_tab = tab;
				self.$root.find("[data-itab]").removeClass("on").filter(`[data-itab="${tab}"]`).addClass("on");
				self.render_issues_table();
			});

			this.$root.find("#nn-i-team").off("click").on("click", function (e) {
				e.stopPropagation();
				self.pick_menu(this, self.all_teams, self.s.issue_team, val => {
					self.s.issue_team = val;
					self.s.issue_owner = "All";
					self.$root.find("#nn-i-team b").text(val);
					self.$root.find("#nn-i-owner b").text("All");
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

			this.$root.find("#nn-issue-search").off("input").on("input", function () {
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
			const current_priority = iss ? (iss.priority || "") : "";
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
								<option value="" ${!current_priority ? "selected" : ""}>${__("None")}</option>
								${['1', '2', '3', '4', '5'].map(p => `<option value="${p}" ${String(current_priority) === p ? "selected" : ""}>${p}</option>`).join("")}
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
				$drawer.find("#nn-drawer-issue-delete").on("click", async function () {
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
					} else if (self.s.view === "meetings" && self.s.meeting_in_progress) {
						await self.fetch_issues_data();
						self.render_l10_meeting_workspace();
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
		   L10 MEETINGS & LEVEL 10 MEETING ROOM IMPLEMENTATION (MATCHING PDF)
		   ========================================================================= */

		async load_meetings() {
			this.$main.html(`<div style="padding:48px;text-align:center;color:#6b7280;font-size:14px">${__("Loading Meetings…")}</div>`);
			try {
				await this.fetch_all_teams();
				await this.fetch_players();
				if (!this.data || !this.data.periods || !this.data.periods.length) {
					this.data = { periods: this.make_periods("Week", 13), metrics: [] };
				}
				await this.fetch_meetings_data();
			} catch (e) {
				console.error("Meetings load error:", e);
			}
			if (this.s.meeting_in_progress) {
				this.render_l10_meeting_workspace();
			} else {
				this.render_meetings();
			}
		}

		async fetch_meetings_data() {
			const promises = [
				this.list("Level 10 Meeting", ["name", "team", "meeting_date", "status", "notes", "creation"], {}, "meeting_date desc, creation desc", 50),
				(!this.todos || !this.todos.length) ? this.fetch_todos_data() : Promise.resolve(),
				(!this.issues || !this.issues.length) ? this.fetch_issues_data() : Promise.resolve(),
				(!this.rocks || !this.rocks.length) ? this.fetch_rocks_data() : Promise.resolve(),
				this.fetch_scorecard_data()
			];
			const [m_res] = await Promise.all(promises);
			this.meetings = m_res && m_res.ok ? (m_res.data || []) : [];

			if (!this.users || !this.users.length) {
				const u_res = await this.list("User", ["name", "full_name", "first_name", "last_name", "email"], { enabled: 1 }, "full_name asc", 200);
				this.users = u_res.ok ? u_res.data : [];
			}
		}

		render_meetings() {
			const s = this.s;
			const team = s.meeting_team || s.team || (this.all_teams.length > 1 ? this.all_teams[1] : "TG BPO");
			const tab = s.meeting_tab || "Upcoming";

			this.$main.html(`
				<div class="nn-top-header">
					<div>
						<div class="nn-title">${__("Meetings")}</div>
						<div class="nn-sub">${__("Improve alignment and transparency across your organization.")}</div>
					</div>
					<div class="nn-actions">
						<button class="nn-btn-bar" id="nn-print-agenda-btn">
							${ic("printer", 14)} <span>${__("Print Meeting Agenda")}</span>
						</button>
						<button class="nn-btn-green" id="nn-btn-create-meeting">
							${ic("plus", 14)} <span>${tab === "Agendas" ? __("Create Agenda") : __("Create")}</span>
						</button>
					</div>
				</div>

				<div class="nn-toolbar">
					<div class="nn-tabs">
						<div class="nn-tab ${tab === "Upcoming" ? "on" : ""}" data-mtab="Upcoming">${__("Upcoming")}</div>
						<div class="nn-tab ${tab === "Past Meetings" ? "on" : ""}" data-mtab="Past Meetings">${__("Past Meetings")}</div>
						<div class="nn-tab ${tab === "Agendas" ? "on" : ""}" data-mtab="Agendas">${__("Agendas")}</div>
					</div>
					<div class="nn-filters">
						<div class="nn-pill-select" id="nn-mtg-team-btn" title="${__("Select Team")}">
							${ic("users", 13)}
							<span>${this.esc(team)}</span>
							${ic("chevron-down", 12)}
						</div>
					</div>
				</div>

				<div class="nn-meetings-body" id="nn-meetings-body-wrap">
					${this.get_meetings_tab_html(tab, team)}
				</div>
			`);

			this.bind_meetings_events();
		}

		get_meetings_tab_html(tab, team) {
			if (tab === "Past Meetings") {
				const past = this.meetings || [];
				if (!past.length) {
					return `
						<div class="nn-upcoming-box" style="margin: 0 32px 32px;">
							<div class="nn-empty-icon-circle">${ic("calendar", 26)}</div>
							<div class="nn-empty-box-title">${__("No past meetings recorded yet.")}</div>
							<div class="nn-empty-box-sub">${__("Completed meetings will be archived here for review.")}</div>
						</div>
					`;
				}
				return `
					<div class="nn-rock-card" style="margin: 0 32px 32px;">
						<div class="nn-rock-header">
							<div class="nn-rock-title-group">
								<span class="nn-rock-title">${__("Past Meetings")}</span>
								<span class="nn-badge-cnt">${past.length}</span>
							</div>
						</div>
						<table class="nn-rock-tbl">
							<thead>
								<tr>
									<th>${__("Date")}</th>
									<th>${__("Team")}</th>
									<th>${__("Status")}</th>
									<th>${__("Notes / Summary")}</th>
									<th style="text-align:right">${__("Action")}</th>
								</tr>
							</thead>
							<tbody>
								${past.map(m => `
									<tr class="nn-rock-row nn-past-meet-row" data-meet-id="${this.esc(m.name)}" style="cursor:pointer">
										<td><b>${frappe.datetime.str_to_user(m.meeting_date)}</b></td>
										<td>${this.esc(m.team || team)}</td>
										<td><span class="nn-status-badge complete">${this.esc(m.status || "Complete")}</span></td>
										<td style="color:#6b7280">${this.esc(m.notes || __("Level 10 Meeting completed"))}</td>
										<td style="text-align:right">
											<button class="nn-btn-bar nn-view-past-meet" data-meet-id="${this.esc(m.name)}" style="padding:3px 8px;font-size:11px;display:inline-flex;cursor:pointer">${__("View")}</button>
										</td>
									</tr>
								`).join("")}
							</tbody>
						</table>
					</div>
				`;
			}

			if (tab === "Agendas") {
				const agendas = [
					{ id: "l10", title: "Level 10 Meeting™", dur: "90 min", desc: "Weekly leadership & team pulse: Segue, Scorecard, Rocks, Headlines, To-Dos, IDS (60m), Conclude." },
					{ id: "quarterly", title: "Quarterly Session", dur: "Full Day", desc: "Review past quarter results, refresh V/TO®, set 90-day Rocks, tackle major strategic issues." },
					{ id: "annual", title: "Annual Session", dur: "2 Days", desc: "2-day deep dive into Vision, Core Values, 1-Year Plan, and upcoming quarterly priorities." },
					{ id: "1on1", title: "Weekly 1-on-1", dur: "30 min", desc: "Manager & employee alignment check-in, reviewing weekly to-dos, measurables, and feedback." }
				];
				return `
					<div style="padding:0 32px 32px;display:grid;grid-template-columns:repeat(auto-fill, minmax(300px, 1fr));gap:18px;">
						${agendas.map(a => `
							<div class="nn-l10-card" style="display:flex;flex-direction:column;justify-content:space-between;border:1px solid #e5e7eb;box-shadow:0 1px 3px rgba(0,0,0,0.04);margin-bottom:0">
								<div>
									<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
										<h4 style="margin:0;font-size:15px;font-weight:700;color:#111827">${this.esc(a.title)}</h4>
										<span style="font-size:11.5px;font-weight:600;padding:2px 8px;border-radius:12px;background:#ecfdf5;color:#064e3b">${a.dur}</span>
									</div>
									<p style="font-size:13px;color:#4b5563;line-height:1.5;margin-bottom:18px">${this.esc(a.desc)}</p>
								</div>
								<div>
									<button class="nn-btn-green nn-start-agenda-btn" data-agenda="${a.id}" style="width:100%">${__("Start This Meeting")}</button>
								</div>
							</div>
						`).join("")}
					</div>
				`;
			}

			// Default: "Upcoming" Tab (Matching PDF Page 1)
			return `
				<div style="padding: 0 32px 32px;">
					<!-- Hero: No Meetings in progress -->
					<div class="nn-meeting-hero">
						<div class="nn-meeting-hero-tag">${this.esc(team)}</div>
						<h3 class="nn-meeting-hero-title">${__("No Meetings in progress")}</h3>
						<div class="nn-meeting-hero-btns">
							<button class="nn-btn-green" id="nn-hero-start-btn">
								${ic("play", 13)} <span>${__("Start a Meeting")}</span>
							</button>
							<button class="nn-btn-bar" id="nn-hero-schedule-btn">
								${ic("calendar", 13)} <span>${__("Schedule a Meeting")}</span>
							</button>
						</div>
					</div>

					<!-- Upcoming Meetings Section -->
					<div style="margin-top:28px">
						<div style="font-size:15px;font-weight:700;color:#111827;margin-bottom:14px;display:flex;align-items:center;gap:6px">
							<span>${__("Upcoming Meetings")}</span>
							<span style="font-size:12px;color:#9ca3af;font-weight:400">(0)</span>
						</div>
						<div class="nn-upcoming-box">
							<div class="nn-empty-icon-circle">${ic("message-square", 28)}</div>
							<div class="nn-empty-box-title">${__("Your team hasn't created any scheduled Meetings yet.")}</div>
							<div class="nn-empty-box-sub">${__("Scheduled Meetings are a quick way to keep your team aligned.")}</div>
							<a href="javascript:void(0)" class="nn-issues-learn-link" id="nn-learn-meetings-link">${__("Learn more about Scheduled Meetings")}</a>
						</div>
					</div>
				</div>
			`;
		}

		bind_meetings_events() {
			const self = this;
			const $wrap = this.$root.find("#nn-main");

			$wrap.find(".nn-tab").on("click", function () {
				const tab = $(this).attr("data-mtab");
				self.s.meeting_tab = tab;
				self.render_meetings();
			});

			$wrap.find("#nn-mtg-team-btn").on("click", function (e) {
				e.stopPropagation();
				const teams = (self.all_teams && self.all_teams.length) ? self.all_teams : ["All Teams", "TG BPO"];
				self.pick_menu(this, teams, self.s.meeting_team || self.s.team, async val => {
					self.s.meeting_team = val;
					self.s.team = val;
					await self.fetch_scorecard_data();
					await self.fetch_meetings_data();
					self.render_meetings();
				});
			});

			$wrap.find("#nn-hero-start-btn, #nn-btn-create-meeting").on("click", () => self.open_start_meeting_modal());
			$wrap.find(".nn-start-agenda-btn").on("click", function () {
				const ag = $(this).attr("data-agenda");
				self.start_l10_meeting(ag);
			});

			$wrap.find("#nn-hero-schedule-btn, #nn-learn-meetings-link").on("click", () => {
				frappe.msgprint({
					title: __("Schedule a Meeting"),
					message: __("Scheduled recurring meetings allow your team to run weekly Level 10 sessions seamlessly."),
					indicator: "blue"
				});
			});

			$wrap.find("#nn-print-agenda-btn").on("click", () => {
				window.print();
			});

			$wrap.find(".nn-view-past-meet, .nn-past-meet-row").on("click", function (e) {
				e.stopPropagation();
				const meetId = $(this).attr("data-meet-id");
				self.open_past_meeting_drawer(meetId);
			});
		}

		open_past_meeting_drawer(meet_id, details = null) {
			const self = this;
			const m = (this.meetings || []).find(x => x.name === meet_id) || {};
			const d = details || {};
			const team = m.team || d.team || this.s.meeting_team || this.s.team || "Leadership Team";
			const when = m.meeting_date || d.meeting_date || "Recent";
			const status = m.status || d.status || "Complete";
			const notes = d.notes || m.notes || __("Level 10 Meeting completed and archived in ERP.");
			const docname = m.name || d.name || meet_id || "";
			const owner_name = d.owner_name || m.owner || "Administrator";
			const durMin = 90;
			const rating = 8.5;

			// Parse attendees / ratings if present in notes
			let attendeesList = [];
			let ratingsMap = {};
			if (notes.includes("Attendees:")) {
				const atMatch = notes.match(/Attendees:\s*([^\.]+)/);
				if (atMatch) attendeesList = atMatch[1].split(",").map(s => s.trim()).filter(Boolean);
			}
			if (notes.includes("Ratings:")) {
				const ratMatch = notes.match(/Ratings:\s*(\{[^\}]+\})/);
				if (ratMatch) {
					try { ratingsMap = JSON.parse(ratMatch[1]); } catch(e) {}
				}
			}

			const $drawer = this.$root.find("#nn-drawer");
			$drawer.html(`
				<div class="nn-drawer-header">
					<div style="min-width:0;flex:1;padding-right:12px">
						<div style="display:flex;align-items:center;gap:8px">
							<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#10b981;flex-shrink:0"></span>
							<div class="nn-drawer-title" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${this.esc(team)} Level 10 Meeting™</div>
						</div>
						<div style="font-size:12px;color:#6b7280;margin-top:3px">${this.esc(docname || team)} &bull; ${frappe.datetime.str_to_user ? frappe.datetime.str_to_user(when) : this.esc(when)}</div>
					</div>
					<button class="nn-drawer-btn-icon" id="nn-drawer-past-meet-close">${ic("close", 16)}</button>
				</div>

				<div class="nn-drawer-body" style="background:#fafbfc;overflow-y:auto;display:flex;flex-direction:column;gap:16px">
					<!-- Top Metrics -->
					<div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:12px">
						<div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:12px 14px">
							<div style="font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px">${__("Status")}</div>
							<div style="margin-top:6px">
								<span class="nn-status-badge complete" style="display:inline-flex;align-items:center;gap:4px;background:#d1fae5;color:#065f46;font-weight:600;padding:3px 8px;border-radius:12px;font-size:11.5px">
									${ic("check", 12)} ${this.esc(status)}
								</span>
							</div>
						</div>
						<div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:12px 14px">
							<div style="font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px">${__("Duration")}</div>
							<div style="margin-top:6px;font-size:15px;font-weight:700;color:#111827">${durMin} min</div>
						</div>
						<div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:12px 14px">
							<div style="font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px">${__("Avg Rating")}</div>
							<div style="margin-top:6px;font-size:15px;font-weight:700;color:#047857;display:flex;align-items:center;gap:4px">${ic("star", 13)} ${rating} <span style="font-size:11px;font-weight:400;color:#9ca3af">/ 10</span></div>
						</div>
					</div>

					<!-- Meeting Overview -->
					<div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:16px">
						<h4 style="margin:0 0 12px 0;font-size:12.5px;font-weight:700;color:#111827;text-transform:uppercase;letter-spacing:0.5px">${__("Meeting Overview")}</h4>
						<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:12.5px">
							<div>
								<div style="color:#6b7280;font-size:11.5px">${__("Date")}</div>
								<div style="font-weight:600;color:#111827;margin-top:2px">${frappe.datetime.str_to_user ? frappe.datetime.str_to_user(when) : this.esc(when)}</div>
							</div>
							<div>
								<div style="color:#6b7280;font-size:11.5px">${__("Team")}</div>
								<div style="font-weight:600;color:#111827;margin-top:2px">${this.esc(team)}</div>
							</div>
							<div>
								<div style="color:#6b7280;font-size:11.5px">${__("Facilitator")}</div>
								<div style="font-weight:600;color:#111827;margin-top:2px">${this.esc(owner_name)}</div>
							</div>
							<div>
								<div style="color:#6b7280;font-size:11.5px">${__("Record")}</div>
								<div style="font-weight:600;color:#111827;margin-top:2px;font-family:monospace;font-size:11.5px">${this.esc(docname || "Session Archive")}</div>
							</div>
						</div>
					</div>

					<!-- Summary & Notes -->
					<div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:16px">
						<h4 style="margin:0 0 10px 0;font-size:12.5px;font-weight:700;color:#111827;text-transform:uppercase;letter-spacing:0.5px">${__("Summary & Notes")}</h4>
						<div style="font-size:13px;line-height:1.6;color:#374151;background:#f9fafb;padding:12px 14px;border-radius:6px;border:1px solid #f1f3f5">
							${this.esc(notes)}
						</div>
					</div>

					<!-- Agenda Flow Covered -->
					<div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:16px">
						<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
							<h4 style="margin:0;font-size:12.5px;font-weight:700;color:#111827;text-transform:uppercase;letter-spacing:0.5px">${__("L10 Agenda & Flow Covered")}</h4>
							<span style="font-size:11.5px;color:#10b981;font-weight:600;display:inline-flex;align-items:center;gap:4px">${ic("check", 12)} 7 Steps Complete</span>
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
										<span style="width:18px;height:18px;border-radius:50%;background:#d1fae5;color:#065f46;display:inline-flex;align-items:center;justify-content:center">${ic("check", 11)}</span>
										<span style="font-weight:600;color:#111827">${s.num}. ${s.name}</span>
									</div>
									<span style="font-size:11.5px;color:#6b7280">${s.dur}</span>
								</div>
							`).join("")}
						</div>
					</div>

					<!-- Meeting To-Dos if available -->
					${(d.todo_items && d.todo_items.length) ? `
						<div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:16px">
							<h4 style="margin:0 0 10px 0;font-size:12.5px;font-weight:700;color:#111827;text-transform:uppercase;letter-spacing:0.5px">${__("Meeting To-Dos & Action Items")}</h4>
							<div style="display:flex;flex-direction:column;gap:6px">
								${d.todo_items.map(t => `
									<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:#f8fafc;border-radius:6px;font-size:12.5px">
										<div style="display:flex;align-items:center;gap:8px">
											<span style="font-weight:600;color:#111827">${self.esc(t.title)}</span>
											${t.owner ? `<span style="font-size:11.5px;color:#6b7280">(${self.esc(t.owner)})</span>` : ''}
										</div>
										<span class="nn-status-badge ${t.status === 'Closed' ? 'complete' : 'in-progress'}" style="font-size:11px">${self.esc(t.status || 'Open')}</span>
									</div>
								`).join('')}
							</div>
						</div>
					` : ''}

					<!-- Attendees & Ratings -->
					${(attendeesList.length || Object.keys(ratingsMap).length) ? `
						<div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:16px">
							<h4 style="margin:0 0 12px 0;font-size:12.5px;font-weight:700;color:#111827;text-transform:uppercase;letter-spacing:0.5px">${__("Attendees & Ratings")}</h4>
							<div style="display:flex;flex-wrap:wrap;gap:8px">
								${(attendeesList.length ? attendeesList : Object.keys(ratingsMap)).map(att => {
									const rat = ratingsMap[att];
									return `
										<div style="display:inline-flex;align-items:center;gap:8px;padding:5px 12px;background:#f3f4f6;border-radius:20px;font-size:12px">
											<span style="font-weight:600;color:#111827">${self.esc(att)}</span>
											${rat != null ? `<span style="background:#047857;color:#fff;padding:1px 6px;border-radius:10px;font-size:11px;font-weight:700;display:inline-flex;align-items:center;gap:3px">${ic("star", 11)} ${rat}</span>` : ""}
										</div>
									`;
								}).join("")}
							</div>
						</div>
					` : ""}
				</div>

				<div class="nn-drawer-footer" style="display:flex;align-items:center;justify-content:space-between">
					<div>
						${docname ? `
							<a href="/app/level-10-meeting/${encodeURIComponent(docname)}" target="_blank" style="font-size:12px;color:#047857;text-decoration:none;display:inline-flex;align-items:center;gap:4px;font-weight:600">
								${__("Open in ERP Desk")}
							</a>
						` : ""}
					</div>
					<button class="nn-btn-cancel" id="nn-drawer-past-meet-close-btn">${__("Close")}</button>
				</div>
			`);

			$drawer.find("#nn-drawer-past-meet-close, #nn-drawer-past-meet-close-btn").on("click", () => self.close_drawer());

			this.$root.find("#nn-drawer-backdrop").addClass("show");
			$drawer.addClass("show");

			if (docname && !details) {
				frappe.call({
					method: "eos_core.eos_api.get_meeting_details",
					args: { docname: docname },
					callback: function (r) {
						if (r && r.message && (r.message.agenda_items?.length || r.message.todo_items?.length || r.message.notes)) {
							self.open_past_meeting_drawer(meet_id, r.message);
						}
					}
				});
			}
		}

		open_start_meeting_modal() {
			const self = this;
			const agendas = [
				{ id: "l10", title: "Level 10 Meeting™" },
				{ id: "quarterly", title: "Quarterly Session" },
				{ id: "annual", title: "Annual Session" },
				{ id: "1on1", title: "Weekly 1-on-1" }
			];

			const $backdrop = $(`<div class="nn-modal-backdrop"></div>`);
			const $modal = $(`
				<div class="nn-modal-card">
					<div class="nn-modal-header">
						<div>
							<h3 class="nn-modal-title">${__("Start Meeting")}</h3>
							<p class="nn-modal-sub">${__("Select an agenda for your meeting")}</p>
						</div>
						<button class="nn-modal-close-btn" id="nn-modal-close">${ic("close", 16)}</button>
					</div>
					<div class="nn-modal-body">
						<div style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;margin-bottom:12px">${__("All Agendas")}</div>
						<div class="nn-agenda-select-list">
							${agendas.map(a => `
								<div class="nn-agenda-select-item">
									<div class="nn-agenda-select-left">
										<div class="nn-agenda-select-icon">${ic("file-text", 16)}</div>
										<span class="nn-agenda-select-title">${this.esc(a.title)}</span>
									</div>
									<button class="nn-btn-green nn-start-agenda-modal-btn" data-agenda="${a.id}" style="height:30px;padding:0 14px;font-size:12px">${__("Start")}</button>
								</div>
							`).join("")}
						</div>
					</div>
					<div class="nn-modal-footer" style="padding:14px 24px;border-top:1px solid #f1f3f5;display:flex;justify-content:flex-start">
						<a href="javascript:void(0)" class="nn-issues-learn-link" id="nn-manage-agendas-link">${__("Manage agendas...")}</a>
					</div>
				</div>
			`);

			$("body").append($backdrop).append($modal);

			const close = () => { $backdrop.remove(); $modal.remove(); };
			$modal.find("#nn-modal-close").on("click", close);
			$backdrop.on("click", close);

			$modal.find(".nn-start-agenda-modal-btn").on("click", function () {
				const ag_id = $(this).attr("data-agenda");
				close();
				self.start_l10_meeting(ag_id);
			});

			$modal.find("#nn-manage-agendas-link").on("click", () => {
				close();
				self.s.meeting_tab = "Agendas";
				self.render_meetings();
			});
		}

		start_l10_meeting(agenda_id = "l10") {
			const team = this.s.meeting_team || this.s.team || (this.all_teams.length > 1 ? this.all_teams[1] : "TG BPO");
			this.s.meeting_in_progress = true;
			this.s.meeting_agenda_type = agenda_id;
			this.s.meeting_step = 0;
			this.s.meeting_seconds = 0;
			this.s.meeting_step_seconds = 0;
			this.s.meeting_step_times = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
			this.s.meeting_sharing_idx = 0;
			this.s.meeting_good_news = {};
			this.s.meeting_ratings = {};
			this.s.meeting_notes = "";

			const team_players = (this.players || []).filter(p => !p.team || p.team === team || team === "All Teams");
			let attendee_list = team_players.map(p => p.player_name || p.user || p.name);
			if (!attendee_list.length) {
				attendee_list = (this.users || []).slice(0, 4).map(u => u.full_name || u.first_name || u.name);
			}
			if (!attendee_list.length) {
				attendee_list = [frappe.session.user_fullname || frappe.session.user || "User"];
			}

			this.s.meeting_attendees = attendee_list;
			this.s.meeting_attendance = {};
			attendee_list.forEach((att, idx) => {
				this.s.meeting_attendance[att] = (idx < 2);
				this.s.meeting_ratings[att] = 8;
			});

			if (!this.s.headlines || !this.s.headlines.length) {
				this.s.headlines = [
					{ id: 1, type: "Customer", title: "Key client onboarding went live seamlessly with 100% SLA met", author: attendee_list[0] || "User", date: "Today" }
				];
			}
			if (!this.s.cascading_messages) {
				this.s.cascading_messages = [];
			}

			if (this.meeting_timer_interval) clearInterval(this.meeting_timer_interval);
			this.meeting_timer_interval = setInterval(() => {
				this.s.meeting_seconds++;
				const step = this.s.meeting_step || 0;
				this.s.meeting_step_times = this.s.meeting_step_times || {};
				this.s.meeting_step_times[step] = (this.s.meeting_step_times[step] || 0) + 1;
				this.s.meeting_step_seconds = this.s.meeting_step_times[step];
				this.update_meeting_timer_display();
			}, 1000);

			this.render_l10_meeting_workspace();
		}

		fmt_timer(sec) {
			const m = Math.floor(sec / 60);
			const s = sec % 60;
			return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
		}

		update_meeting_timer_display() {
			const cur_step = this.s.meeting_step || 0;
			const cur_step_sec = (this.s.meeting_step_times && this.s.meeting_step_times[cur_step]) || 0;
			const $tot = this.$root.find("#nn-l10-total-timer");
			if ($tot.length) $tot.text(this.fmt_timer(this.s.meeting_seconds));
			const $step = this.$root.find("#nn-l10-step-timer");
			if ($step.length) $step.text(this.fmt_timer(cur_step_sec));
			const $curr_row = this.$root.find(`.nn-l10-agenda-item[data-step="${cur_step}"] .nn-l10-agenda-elapsed`);
			if ($curr_row.length) $curr_row.text(this.fmt_timer(cur_step_sec));
		}

		get_l10_agenda_steps() {
			return [
				{ idx: 0, num: "1.", name: "SEGUE", target_sec: 300, target_str: "05:00" },
				{ idx: 1, num: "2.", name: "SCORECARD", target_sec: 300, target_str: "05:00" },
				{ idx: 2, num: "3.", name: "ROCK REVIEW", target_sec: 300, target_str: "05:00" },
				{ idx: 3, num: "4.", name: "CUSTOMER / EMPLOYEE HEADLINES", target_sec: 300, target_str: "05:00" },
				{ idx: 4, num: "5.", name: "TO-DO LIST", target_sec: 300, target_str: "05:00" },
				{ idx: 5, num: "6.", name: "IDS™", target_sec: 3600, target_str: "60:00" },
				{ idx: 6, num: "7.", name: "CONCLUDE", target_sec: 300, target_str: "05:00" }
			];
		}

		render_l10_meeting_workspace() {
			const s = this.s;
			const team = s.meeting_team || s.team || "TG BPO";
			const steps = this.get_l10_agenda_steps();
			const cur_step = steps[s.meeting_step] || steps[0];

			this.$main.html(`
				<div class="nn-l10-wrap">
					<!-- Left Agenda Sidebar (Ninety.io meeting runner) -->
					<div class="nn-l10-side">
						<div class="nn-l10-side-top">
							<div class="nn-l10-timer-display">
								<span>${__("Total:")} <span id="nn-l10-total-timer">${this.fmt_timer(s.meeting_seconds)}</span></span>
								<span class="nn-l10-step-timer-badge" id="nn-l10-step-timer">${this.fmt_timer(s.meeting_step_seconds)}</span>
							</div>
						</div>

						<div class="nn-l10-agenda-list">
							${steps.map(st => {
								const elapsed_sec = (s.meeting_step_times && s.meeting_step_times[st.idx]) || 0;
								return `
								<div class="nn-l10-agenda-item ${st.idx === s.meeting_step ? "on" : ""}" data-step="${st.idx}">
									<div class="nn-l10-agenda-left">
										<span style="font-weight:700">${st.num}</span>
										<span>${st.name}</span>
									</div>
									<div class="nn-l10-agenda-times">
										<span class="nn-l10-agenda-elapsed">${this.fmt_timer(elapsed_sec)}</span> / ${st.target_str}
									</div>
								</div>
								`;
							}).join("")}
						</div>

						<div class="nn-l10-side-foot">
							<div class="nn-l10-foot-actions">
								<button class="nn-l10-foot-btn" id="nn-l10-tools-toggle" title="${__("Open Tools")}">
									${ic("tool", 14)} <span>${__("Tools")}</span>
								</button>
								<button class="nn-l10-foot-btn" id="nn-l10-notes-toggle" title="${__("Toggle Notes")}">
									${ic("file-text", 14)} <span>${__("Notes")}</span>
								</button>
							</div>
							<div class="nn-l10-foot-actions">
								<button class="nn-l10-foot-btn" id="nn-l10-prev-step-btn" ${s.meeting_step === 0 ? "disabled style='opacity:0.5'" : ""}>
									${__("Previous")}
								</button>
								<button class="nn-btn-green" id="nn-l10-next-step-btn" style="flex:1;height:32px;font-size:12px">
									${s.meeting_step === steps.length - 1 ? __("Finish") : __("Next")}
								</button>
							</div>
							<button class="nn-btn-bar" id="nn-l10-quit-btn" style="width:100%;font-size:11.5px;color:#dc2626;border-color:#fecaca">
								${__("Exit Meeting")}
							</button>
						</div>
					</div>

					<!-- Main Step Content -->
					<div class="nn-l10-main" id="nn-l10-main-step-container">
						${this.render_l10_step_content(s.meeting_step, team)}
					</div>
				</div>
			`);

			this.bind_l10_meeting_events();
		}

		bind_l10_meeting_events() {
			const self = this;
			const $wrap = this.$root.find("#nn-main");

			$wrap.find(".nn-l10-agenda-item").on("click", function () {
				const step = parseInt($(this).attr("data-step"), 10);
				self.switch_l10_step(step);
			});

			$wrap.find("#nn-l10-prev-step-btn").on("click", () => {
				if (self.s.meeting_step > 0) self.switch_l10_step(self.s.meeting_step - 1);
			});

			$wrap.find("#nn-l10-next-step-btn").on("click", () => {
				const steps = self.get_l10_agenda_steps();
				if (self.s.meeting_step < steps.length - 1) {
					self.switch_l10_step(self.s.meeting_step + 1);
				} else {
					self.finish_l10_meeting();
				}
			});

			$wrap.find("#nn-l10-tools-toggle").on("click", function (e) {
				e.stopPropagation();
				self.open_l10_tools_menu(this);
			});

			$wrap.find("#nn-l10-notes-toggle").on("click", () => {
				frappe.prompt([
					{ fieldname: "notes", fieldtype: "Small Text", label: __("Meeting Notes"), default: self.s.meeting_notes || "" }
				], values => {
					self.s.meeting_notes = values.notes;
					frappe.show_alert({ message: __("Notes saved for this meeting"), indicator: "green" });
				}, __("Meeting Notes"));
			});

			$wrap.find("#nn-l10-quit-btn").on("click", () => {
				frappe.confirm(__("Are you sure you want to exit this meeting session?"), () => {
					if (self.meeting_timer_interval) clearInterval(self.meeting_timer_interval);
					self.s.meeting_in_progress = false;
					self.render_meetings();
				});
			});

			this.bind_l10_step_specific_events();
		}

		switch_l10_step(step_idx) {
			const $gn = this.$root.find("#nn-good-news-input");
			if ($gn.length) {
				const att = (this.s.meeting_attendees || [])[this.s.meeting_sharing_idx || 0];
				if (att) {
					this.s.meeting_good_news = this.s.meeting_good_news || {};
					this.s.meeting_good_news[att] = $gn.val();
				}
			}

			this.s.meeting_step = step_idx;
			this.s.meeting_step_times = this.s.meeting_step_times || {};
			this.s.meeting_step_seconds = this.s.meeting_step_times[step_idx] || 0;
			this.render_l10_meeting_workspace();
		}

		open_l10_tools_menu(anchor) {
			const existing = $(".nn-l10-tools-menu");
			if (existing.length) {
				existing.remove();
				return;
			}
			// CONSTRAINT (from PDF Page 6): "For the tools section only add scorecard, to-dos, issues and rocks (first 4 items)"
			const tools = [
				{ id: "scorecard", title: "Scorecard", icon: "scorecard-icon" },
				{ id: "todos", title: "To-Dos", icon: "todo-icon" },
				{ id: "issues", title: "Issues", icon: "alert-circle" },
				{ id: "rocks", title: "Rocks", icon: "rock-icon" }
			];

			const $m = $(`
				<div class="nn-menu nn-l10-tools-menu" style="min-width:180px;padding:6px 0;box-shadow:0 10px 25px rgba(0,0,0,0.15);border:1px solid #e5e7eb;border-radius:8px;background:#fff;z-index:999999">
					<div style="padding:6px 14px 4px;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase">${__("Meeting Tools")}</div>
					${tools.map(t => `
						<div class="nn-menu-item nn-l10-tool-action" data-tool="${t.id}" style="display:flex;align-items:center;gap:10px;padding:9px 14px;cursor:pointer;font-size:13px;color:#374151">
							${ic(t.icon, 16)} <span>${this.esc(t.title)}</span>
						</div>
					`).join("")}
				</div>
			`);

			const self = this;
			$m.find(".nn-l10-tool-action").on("click", function () {
				const tool = $(this).attr("data-tool");
				$m.remove();
				self.open_l10_tool_drawer(tool);
			});

			this.place_menu($m, anchor);
		}

		open_l10_tool_drawer(tool) {
			const self = this;
			const $drawer = this.$root.find("#nn-drawer");
			let title = "Tool";
			let body_html = "";

			if (tool === "scorecard") {
				title = "Scorecard Quick View";
				const metrics = this.data.metrics || [];
				body_html = `
					<div style="padding:16px">
						<p style="font-size:12.5px;color:#6b7280;margin-bottom:14px">${__("View team metrics and identify off-track items.")}</p>
						<div style="display:flex;flex-direction:column;gap:8px">
							${metrics.map(m => `
								<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border:1px solid #e5e7eb;border-radius:6px;background:#fff">
									<div>
										<div style="font-size:13px;font-weight:600;color:#111827">${this.esc(m.title)}</div>
										<div style="font-size:11.5px;color:#6b7280">Goal: ${m.goal_op} ${m.goal} ${this.esc(m.unit || "")}</div>
									</div>
									<button class="nn-btn-bar nn-drop-to-ids-btn" data-type="Scorecard" data-title="KPI: ${this.esc(m.title)}">${ic("alert-circle", 12)} ${__("Drop to IDS")}</button>
								</div>
							`).join("")}
						</div>
					</div>
				`;
			} else if (tool === "rocks") {
				title = "Rocks Quick View";
				const rocks = this.rocks || [];
				body_html = `
					<div style="padding:16px">
						<p style="font-size:12.5px;color:#6b7280;margin-bottom:14px">${__("Quick status check on 90-day priorities.")}</p>
						<div style="display:flex;flex-direction:column;gap:8px">
							${rocks.map(r => `
								<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border:1px solid #e5e7eb;border-radius:6px;background:#fff">
									<div>
										<div style="font-size:13px;font-weight:600;color:#111827">${this.esc(r.title)}</div>
										<div style="font-size:11.5px;color:#6b7280">${this.esc(r.owner_user || "")} &bull; ${this.esc(r.status || "On Track")}</div>
									</div>
									<button class="nn-btn-bar nn-drop-to-ids-btn" data-type="Rock" data-title="Rock: ${this.esc(r.title)}">${ic("alert-circle", 12)} ${__("Drop to IDS")}</button>
								</div>
							`).join("")}
						</div>
					</div>
				`;
			} else if (tool === "todos") {
				title = "To-Dos Quick View";
				const todos = this.todos || [];
				body_html = `
					<div style="padding:16px">
						<button class="nn-btn-green" id="nn-drawer-add-todo" style="width:100%;margin-bottom:14px">${__("+ Add To-Do")}</button>
						<div style="display:flex;flex-direction:column;gap:8px">
							${todos.map(t => `
								<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border:1px solid #e5e7eb;border-radius:6px;background:#fff">
									<div style="font-size:13px;font-weight:500;color:#111827">${this.esc(t.todo_name)}</div>
									<span style="font-size:11px;color:#6b7280">${this.esc(t.owner_user || "")}</span>
								</div>
							`).join("")}
						</div>
					</div>
				`;
			} else if (tool === "issues") {
				title = "Issues Quick View";
				const issues = this.issues || [];
				body_html = `
					<div style="padding:16px">
						<button class="nn-btn-green" id="nn-drawer-add-issue" style="width:100%;margin-bottom:14px">${__("+ Add Issue")}</button>
						<div style="display:flex;flex-direction:column;gap:8px">
							${issues.map(iss => `
								<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border:1px solid #e5e7eb;border-radius:6px;background:#fff">
									<div style="font-size:13px;font-weight:600;color:#111827">${this.esc(iss.issue_name)}</div>
									<span class="nn-status-badge off-track">${this.esc(iss.priority || "None")}</span>
								</div>
							`).join("")}
						</div>
					</div>
				`;
			}

			$drawer.html(`
				<div class="nn-drawer-header">
					<span class="nn-drawer-title">${this.esc(title)}</span>
					<button class="nn-drawer-close-btn" id="nn-l10-drawer-close">${ic("close", 18)}</button>
				</div>
				<div class="nn-drawer-body" style="padding:0">
					${body_html}
				</div>
			`);

			$drawer.find("#nn-l10-drawer-close").on("click", () => self.close_drawer());
			$drawer.find("#nn-drawer-add-todo").on("click", () => {
				self.close_drawer();
				self.open_todo_drawer();
			});
			$drawer.find("#nn-drawer-add-issue").on("click", () => {
				self.close_drawer();
				self.open_issue_drawer();
			});
			$drawer.find(".nn-drop-to-ids-btn").on("click", function () {
				const title = $(this).attr("data-title");
				const type = $(this).attr("data-type");
				self.close_drawer();
				self.drop_to_ids(title, type);
			});

			this.$root.find("#nn-drawer-backdrop").addClass("show");
			$drawer.addClass("show");
		}

		render_l10_step_content(step_idx, team) {
			if (step_idx === 0) return this.render_l10_segue_step(team);
			if (step_idx === 1) return this.render_l10_scorecard_step(team);
			if (step_idx === 2) return this.render_l10_rock_review_step(team);
			if (step_idx === 3) return this.render_l10_headlines_step(team);
			if (step_idx === 4) return this.render_l10_todos_step(team);
			if (step_idx === 5) return this.render_l10_ids_step(team);
			if (step_idx === 6) return this.render_l10_conclude_step(team);
			return "";
		}

		/* Step 0: SEGUE (PDF Page 2 top) */
		render_l10_segue_step(team) {
			const s = this.s;
			const attendees = s.meeting_attendees || [];
			const present_cnt = attendees.filter(a => s.meeting_attendance[a]).length;
			const total_cnt = attendees.length;
			const sharer_idx = s.meeting_sharing_idx || 0;
			const cur_sharer = attendees[sharer_idx] || attendees[0] || "User";
			const cur_av = this.get_initials(cur_sharer);
			const sharer_notes = (s.meeting_good_news && s.meeting_good_news[cur_sharer]) || "";

			return `
				<div class="nn-l10-header">
					<div>
						<h3 class="nn-l10-title">SEGUE | Level 10 Meeting™ - ${this.esc(team)}</h3>
						<div class="nn-l10-sub">${__("Transition from working IN the business to ON the business.")}</div>
					</div>
				</div>

				<!-- Attendance Card -->
				<div class="nn-l10-card">
					<div class="nn-l10-card-head">
						<div style="display:flex;align-items:center;gap:12px">
							<h4 class="nn-l10-card-title">${__("Attendance")}</h4>
							<span style="font-size:12px;font-weight:600;color:#6b7280">${present_cnt} ${__("of")} ${total_cnt} ${__("present")}</span>
						</div>
						<button class="nn-btn-bar" id="nn-mark-all-present-btn">${__("Mark all present")}</button>
					</div>
					<div class="nn-attendee-grid">
						${attendees.map(att => {
				const is_pres = !!s.meeting_attendance[att];
				const av = this.get_initials(att);
				return `
								<div class="nn-attendee-chip ${is_pres ? "present" : "absent"}" data-attendee="${this.esc(att)}">
									<span class="nn-owner-circle" style="background:${is_pres ? "#059669" : "#9ca3af"}">${av}</span>
									<span>${this.esc(att)}</span>
									<span style="display:inline-flex;align-items:center">${is_pres ? ic("check", 11) : ic("close", 11)}</span>
								</div>
							`;
			}).join("")}
					</div>
				</div>

				<!-- Sharing Card: Good News -->
				<div class="nn-l10-card">
					<div class="nn-l10-card-head">
						<div>
							<h4 class="nn-l10-card-title">${__("Sharing")}</h4>
							<div style="font-size:12.5px;color:#6b7280;margin-top:2px">${__("Share your personal and professional best")}</div>
						</div>
					</div>
					<div class="nn-sharing-box">
						<div class="nn-sharing-av">${cur_av}</div>
						<div class="nn-sharing-name">${this.esc(cur_sharer)}</div>
						<div class="nn-sharing-badge">${__("Currently sharing…")}</div>
						<textarea id="nn-good-news-input" class="form-control" style="max-width:540px;margin:0 auto 16px;border-radius:6px;font-size:13px;resize:vertical" rows="3" placeholder="${__("Record personal and professional best here…")}">${this.esc(sharer_notes)}</textarea>
						<div style="display:flex;align-items:center;justify-content:center;gap:10px">
							<button class="nn-btn-bar" id="nn-prev-sharer-btn" ${sharer_idx === 0 ? "disabled style='opacity:0.5'" : ""}>${__("Previous attendee")}</button>
							<button class="nn-btn-green" id="nn-next-sharer-btn">${sharer_idx === attendees.length - 1 ? __("Done") : __("Next")}</button>
						</div>
					</div>
				</div>
			`;
		}

		/* Step 1: SCORECARD (PDF Page 2 bottom) */
		render_l10_scorecard_step(team) {
			let metrics = this.data.metrics || [];
			if (team && team !== "All Teams") {
				metrics = metrics.filter(m => !m.team || m.team === team);
			}
			const periods = (this.data.periods || []).slice(-6); // last 6 periods

			return `
				<div class="nn-l10-header">
					<div>
						<h3 class="nn-l10-title">Scorecard - ${this.esc(team)}</h3>
						<div class="nn-l10-sub">${__("Review weekly numbers. Drop any off-track measurables directly to IDS.")}</div>
					</div>
					<div class="nn-actions">
						<span class="nn-btn-bar">${__("Weekly KPIs")} <b>${metrics.length}</b></span>
					</div>
				</div>

				<div class="nn-card-wrap">
					<div class="nn-table-scroll">
						<table class="nn-sc-tbl">
							<thead>
								<tr>
									<th class="left nn-col-metric">${__("Weekly KPIs")}</th>
									<th class="nn-col-owner">${__("Owner")}</th>
									<th class="nn-col-goal">${__("Goal")}</th>
									${periods.map(p => `<th>${this.esc(p.label)}</th>`).join("")}
									<th style="text-align:center">${__("Action")}</th>
								</tr>
							</thead>
							<tbody>
								${metrics.length ? metrics.map(m => {
				const owner_name = this.get_user_display_name(m.owner);
				const av = this.get_initials(owner_name);
				const is_off = periods.some(p => {
					const v = m.values && m.values[p.key];
					return v != null && v < m.goal;
				});
				return `
										<tr>
											<td class="left nn-col-metric" style="white-space:normal;word-break:break-word;overflow-wrap:break-word;line-height:1.35"><b style="white-space:normal;word-break:break-word;display:block">${this.esc(m.title)}</b></td>
											<td class="nn-col-owner"><span class="nn-owner-circle">${av}</span></td>
											<td class="nn-col-goal">${m.goal_op} ${m.goal} ${this.esc(m.unit || "")}</td>
											${periods.map(p => {
					const v = (m.values && m.values[p.key] != null) ? m.values[p.key] : "-";
					const pass = v !== "-" && v >= m.goal;
					const cls = v === "-" ? "" : (pass ? "pass" : "fail");
					return `<td class="nn-sc-cell ${cls}" style="${cls === "fail" ? "background:#fee2e2;color:#dc2626;font-weight:700" : ""}">${v}</td>`;
				}).join("")}
											<td style="text-align:center">
												<button class="nn-btn-bar nn-drop-to-ids-btn" data-type="Scorecard" data-title="KPI off-track: ${this.esc(m.title)}" style="padding:2px 8px;font-size:11px">
													${ic("alert-circle", 12)} ${__("Drop to IDS")}
												</button>
											</td>
										</tr>
									`;
			}).join("") : `<tr><td colspan="8" style="padding:32px;text-align:center;color:#9ca3af">${__("No scorecard measurables found for this team.")}</td></tr>`}
							</tbody>
						</table>
					</div>
				</div>
			`;
		}

		/* Step 2: ROCK REVIEW (PDF Page 3 top) */
		render_l10_rock_review_step(team) {
			const rocks = (this.rocks || []).filter(r => team === "All Teams" || !r.team || r.team === team);

			return `
				<div class="nn-l10-header">
					<div>
						<h3 class="nn-l10-title">ROCK REVIEW | Level 10 Meeting™ - ${this.esc(team)}</h3>
						<div class="nn-l10-sub">${__("Quick status check on 90-day priorities.")}</div>
					</div>
				</div>

				<!-- V/TO Card -->
				<div class="nn-vto-card">
					<div class="nn-vto-left">
						<div class="nn-vto-icon">${ic("target", 16)}</div>
						<span class="nn-vto-title">V/TO® | Revenue, Profit, Measurables</span>
					</div>
					${ic("chevron-down", 14)}
				</div>

				<!-- Rocks Table Card -->
				<div class="nn-rock-card">
					<div class="nn-rock-header">
						<div class="nn-rock-title-group">
							<span class="nn-rock-title">${__("Team Rocks")}</span>
							<span class="nn-badge-cnt">${rocks.length}</span>
						</div>
						<button class="nn-btn-green" id="nn-l10-add-rock-btn" style="height:30px;padding:0 12px;font-size:12px">${__("+ Add Rock")}</button>
					</div>

					<table class="nn-rock-tbl">
						<thead>
							<tr>
								<th>${__("Rock Title")}</th>
								<th>${__("Owner")}</th>
								<th>${__("Status")}</th>
								<th style="text-align:right">${__("Progress")}</th>
								<th style="text-align:center">${__("Action")}</th>
							</tr>
						</thead>
						<tbody>
							${rocks.length ? rocks.map(r => {
				const owner_name = this.get_user_display_name(r.owner_user);
				const av = this.get_initials(owner_name);
				const st = r.status || "On Track";
				const is_off = st === "Off-track" || st === "Dropped";
				const is_complete = st === "Complete" || st === "Done";
				return `
									<tr class="nn-rock-row">
										<td><b>${this.esc(r.title)}</b></td>
										<td><span class="nn-owner-circle">${av}</span></td>
										<td>${this.get_rock_status_badge(st, r.title)}</td>
										<td style="text-align:right">
											<div class="nn-progress-wrap">
												<div class="nn-prog-bar"><div class="nn-prog-fill" style="width:${is_complete ? "100%" : is_off ? "35%" : "75%"};background:${is_complete ? "#16a34a" : is_off ? "#ef4444" : "#059669"}"></div></div>
												<span class="nn-prog-txt">${is_complete ? "100%" : is_off ? "35%" : "75%"}</span>
											</div>
										</td>
										<td style="text-align:center">
											<button class="nn-btn-bar nn-drop-to-ids-btn" data-type="Rock" data-title="Rock off-track: ${this.esc(r.title)}" style="padding:2px 8px;font-size:11px">
												${ic("alert-circle", 12)} ${__("Drop to IDS")}
											</button>
										</td>
									</tr>
								`;
			}).join("") : `<tr><td colspan="5" style="padding:32px;text-align:center;color:#9ca3af">${__("No Rocks found.")}</td></tr>`}
						</tbody>
					</table>
				</div>
			`;
		}

		/* Step 3: HEADLINES (PDF Page 3 bottom) */
		render_l10_headlines_step(team) {
			const headlines = this.s.headlines || [];
			const cascading = this.s.cascading_messages || [];

			return `
				<div class="nn-l10-header">
					<div>
						<h3 class="nn-l10-title">Headlines - ${this.esc(team)}</h3>
						<div class="nn-l10-sub">${__("Share client and employee announcements with your team.")}</div>
					</div>
				</div>

				<!-- Customer / Employee Headlines Card -->
				<div class="nn-l10-card">
					<div class="nn-l10-card-head">
						<div>
							<h4 class="nn-l10-card-title">${__("Headlines")} (${headlines.length})</h4>
							<div style="font-size:12px;color:#6b7280;margin-top:2px">${__("Customer/Employee Headlines")}</div>
						</div>
						<button class="nn-btn-green" id="nn-create-headline-btn" style="height:30px;padding:0 12px;font-size:12px">${__("+ Create Headline")}</button>
					</div>

					${headlines.length ? `
						<div style="display:flex;flex-direction:column;gap:8px">
							${headlines.map(h => `
								<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border:1px solid #e5e7eb;border-radius:6px;background:#fff">
									<div style="display:flex;align-items:center;gap:10px">
										<span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:10px;background:#f3f4f6;color:#374151">${this.esc(h.type)}</span>
										<span style="font-size:13.5px;font-weight:600;color:#111827">${this.esc(h.title)}</span>
									</div>
									<div style="display:flex;align-items:center;gap:12px">
										<span style="font-size:12px;color:#6b7280">${this.esc(h.author)}</span>
										<button class="nn-btn-bar nn-drop-to-ids-btn" data-type="Headline" data-title="Headline Issue: ${this.esc(h.title)}" style="padding:2px 8px;font-size:11px">
											${ic("alert-circle", 12)} ${__("Drop to IDS")}
										</button>
									</div>
								</div>
							`).join("")}
						</div>
					` : `
						<div class="nn-upcoming-box" style="padding:28px">
							<div class="nn-empty-icon-circle">${ic("bell", 24)}</div>
							<div class="nn-empty-box-title">${__("Your team hasn't added any Headlines yet.")}</div>
							<div class="nn-empty-box-sub">${__("Headlines are a quick way to share important updates.")}</div>
						</div>
					`}
				</div>

				<!-- Cascading Messages Card -->
				<div class="nn-l10-card">
					<div class="nn-l10-card-head">
						<div>
							<h4 class="nn-l10-card-title">${__("Cascading Messages")} (${cascading.length})</h4>
							<div style="font-size:12px;color:#6b7280;margin-top:2px">${__("Information to communicate across departments")}</div>
						</div>
						<button class="nn-btn-bar" id="nn-create-cascading-btn" style="height:30px;padding:0 12px;font-size:12px">${__("+ Create Cascading Message")}</button>
					</div>

					${cascading.length ? `
						<div style="display:flex;flex-direction:column;gap:8px">
							${cascading.map(c => `
								<div style="padding:10px 14px;border:1px solid #e5e7eb;border-radius:6px;background:#fff;font-size:13px;font-weight:500;color:#111827">
									${this.esc(c.message)}
								</div>
							`).join("")}
						</div>
					` : `
						<div class="nn-upcoming-box" style="padding:28px">
							<div class="nn-empty-icon-circle">${ic("message-square", 24)}</div>
							<div class="nn-empty-box-title">${__("Your company hasn't added any Cascading Messages yet.")}</div>
							<div class="nn-empty-box-sub">${__("Cascading messages keep organization units synced.")}</div>
						</div>
					`}
				</div>
			`;
		}

		/* Step 4: TO-DOS (PDF Page 4 top) */
		render_l10_todos_step(team) {
			const todos = (this.todos || []).filter(t => team === "All Teams" || !t.team || t.team === team);

			return `
				<div class="nn-l10-header">
					<div>
						<h3 class="nn-l10-title">To-Dos - ${this.esc(team)}</h3>
						<div class="nn-l10-sub">${__("Quickly review, complete, and add 7-day action items.")}</div>
					</div>
					<button class="nn-btn-green" id="nn-l10-add-todo-inline-btn" style="height:32px;padding:0 14px;font-size:12px">${__("+ Add To-Do")}</button>
				</div>

				<div class="nn-todo-card">
					<div class="nn-todo-card-header">
						<div class="nn-todo-card-title">
							<span>${__("Team To-Dos")}</span>
							<span class="nn-todo-count">${todos.length}</span>
						</div>
					</div>

					<div class="nn-todo-table-head">
						<div class="nn-todo-col-check"></div>
						<div class="nn-todo-col-title">${__("Title")}</div>
						<div class="nn-todo-col-due">${__("Due")}</div>
						<div class="nn-todo-col-owner">${__("Assignee")}</div>
						<div style="text-align:right">${__("Action")}</div>
					</div>

					<div class="nn-todo-table-body">
						${todos.length ? todos.map(t => {
				const is_done = t.status === "Complete";
				const owner_name = this.get_user_display_name(t.owner_user);
				const av = this.get_initials(owner_name);
				const due_str = t.due_date ? this.format_todo_date(t.due_date) : "7 Days";
				return `
								<div class="nn-todo-row ${is_done ? "complete" : ""}">
									<div class="nn-todo-col-check">
										<div class="nn-todo-checkbox ${is_done ? "checked" : ""}" data-todo-id="${this.esc(t.name)}">
											${is_done ? ic("check", 12) : ""}
										</div>
									</div>
									<div class="nn-todo-col-title">
										<span class="nn-todo-title-text" style="${is_done ? "text-decoration:line-through;color:#9ca3af" : ""}">${this.esc(t.todo_name)}</span>
									</div>
									<div class="nn-todo-col-due">
										<div class="nn-due-badge">
											<span class="nn-due-icon clock">${ic("clock", 10)}</span>
											<span class="nn-due-text dark">${this.esc(due_str)}</span>
										</div>
									</div>
									<div class="nn-todo-col-owner">
										<span class="nn-owner-circle" title="${this.esc(owner_name)}">${av}</span>
									</div>
									<div style="text-align:right">
										<button class="nn-btn-bar nn-drop-to-ids-btn" data-type="To-Do" data-title="Blocked To-Do: ${this.esc(t.todo_name)}" style="padding:2px 8px;font-size:11px">
											${ic("alert-circle", 12)} ${__("Drop to IDS")}
										</button>
									</div>
								</div>
							`;
			}).join("") : `<div class="nn-todo-empty">${__("No To-Dos for this team.")}</div>`}
					</div>
				</div>
			`;
		}

		/* Step 5: IDS™ (Identify, Discuss, Solve) (PDF Page 4 bottom) */
		render_l10_ids_step(team) {
			const issues = (this.issues || []).filter(iss => iss.status !== "Solved" && (team === "All Teams" || !iss.team || iss.team === team));

			return `
				<div class="nn-l10-header">
					<div>
						<h3 class="nn-l10-title">IDS™ | Level 10 Meeting™ - ${this.esc(team)}</h3>
						<div class="nn-l10-sub">${__("Identify, Discuss, Solve. Dedicate 60 minutes to resolving the most critical obstacles.")}</div>
					</div>
					<button class="nn-btn-green" id="nn-l10-add-issue-btn" style="height:32px;padding:0 14px;font-size:12px">${__("+ Add Issue")}</button>
				</div>

				<div class="nn-todo-card">
					<div class="nn-todo-card-header">
						<div class="nn-todo-card-title">
							<span>${__("Ranked Issues List")}</span>
							<span class="nn-todo-count">${issues.length}</span>
						</div>
					</div>

					<div class="nn-todo-table-head">
						<div style="width:40px;text-align:center;font-size:12px;font-weight:600;color:#6b7280">${__("#")}</div>
						<div class="nn-todo-col-title">${__("Issue")}</div>
						<div style="width:90px;font-size:12px;font-weight:600;color:#6b7280">${__("Priority")}</div>
						<div class="nn-todo-col-owner">${__("Owner")}</div>
						<div style="text-align:right">${__("Action")}</div>
					</div>

					<div class="nn-todo-table-body">
						${issues.length ? issues.map((iss, idx) => {
				const owner_name = this.get_user_display_name(iss.owner_user);
				const av = this.get_initials(owner_name);
				return `
								<div class="nn-todo-row">
									<div style="width:40px;text-align:center;font-size:12px;font-weight:700;color:#064e3b">
										${idx + 1}
									</div>
									<div class="nn-todo-col-title">
										<span class="nn-todo-title-text" style="font-weight:600;color:#111827">${this.esc(iss.issue_name)}</span>
										${iss.description ? `<div style="font-size:11.5px;color:#6b7280;margin-top:2px">${this.esc(iss.description)}</div>` : ""}
									</div>
									<div style="width:90px">
										<span class="nn-status-badge off-track">${this.esc(iss.priority || "None")}</span>
									</div>
									<div class="nn-todo-col-owner">
										<span class="nn-owner-circle">${av}</span>
									</div>
									<div style="text-align:right">
										<button class="nn-btn-green nn-solve-issue-btn" data-issue="${this.esc(iss.name)}" style="height:28px;padding:0 10px;font-size:11.5px">
											${ic("check", 12)} ${__("Solve Issue")}
										</button>
									</div>
								</div>
							`;
			}).join("") : `
							<div class="nn-issues-empty-wrap" style="padding:36px">
								<div class="nn-issues-empty-icon">${ic("info", 24)}</div>
								<div class="nn-issues-empty-title">${__("Your team hasn't added any issues yet.")}</div>
								<div class="nn-issues-empty-desc">${__("Identify matters that need resolution before moving forward.")}</div>
							</div>
						`}
					</div>
				</div>
			`;
		}

		/* Step 6: CONCLUDE (PDF Pages 5 & 6) */
		render_l10_conclude_step(team) {
			const s = this.s;
			const attendees = s.meeting_attendees || [];
			const todos = (this.todos || []).slice(0, 8);
			const cascading = s.cascading_messages || [];

			let rating_sum = 0;
			let rating_cnt = 0;
			attendees.forEach(att => {
				const r = s.meeting_ratings[att] || 8;
				rating_sum += Number(r);
				rating_cnt++;
			});
			const avg_rating = rating_cnt ? (rating_sum / rating_cnt).toFixed(1) : "8.5";

			return `
				<div class="nn-l10-header">
					<div>
						<h3 class="nn-l10-title">CONCLUDE | Level 10 Meeting™ - ${this.esc(team)}</h3>
						<div class="nn-l10-sub">${__("Recap To-Dos, cascading messages, and rate the meeting from 1-10.")}</div>
					</div>
				</div>

				<!-- Recap To-Dos -->
				<div class="nn-l10-card">
					<div class="nn-l10-card-head">
						<h4 class="nn-l10-card-title">${__("Recap To-Dos")} (${todos.length})</h4>
					</div>
					<div style="display:flex;flex-direction:column;gap:6px">
						${todos.map(t => `
							<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-bottom:1px solid #f1f3f5">
								<span style="font-size:13px;color:#111827">${this.esc(t.todo_name)}</span>
								<span style="font-size:11.5px;color:#6b7280">${this.esc(t.owner_user || "")} &bull; ${t.due_date ? this.format_todo_date(t.due_date) : "7 Days"}</span>
							</div>
						`).join("")}
					</div>
				</div>

				<!-- Cascading Messages -->
				<div class="nn-l10-card">
					<div class="nn-l10-card-head">
						<h4 class="nn-l10-card-title">${__("Cascading Messages")}</h4>
					</div>
					${cascading.length ? `
						<div style="display:flex;flex-direction:column;gap:6px">
							${cascading.map(c => `<div style="font-size:13px;color:#374151">• ${this.esc(c.message)}</div>`).join("")}
						</div>
					` : `<div style="font-size:12.5px;color:#9ca3af">${__("No Cascading Messages were cascaded during this Meeting.")}</div>`}
				</div>

				<!-- Ratings (1-10) -->
				<div class="nn-l10-card">
					<div class="nn-l10-card-head">
						<h4 class="nn-l10-card-title">${__("Ratings (1–10)")}</h4>
						<span style="font-size:13px;font-weight:700;color:#064e3b">${__("Average Rating:")} <span id="nn-conclude-avg-rating">${avg_rating}</span> / 10</span>
					</div>
					<div class="nn-rating-list">
						${attendees.map(att => {
				const cur_r = s.meeting_ratings[att] || 8;
				return `
								<div class="nn-rating-item">
									<span style="font-size:13px;font-weight:600;color:#374151">${this.esc(att)}</span>
									<input type="number" min="1" max="10" step="1" class="nn-rating-input" data-attendee="${this.esc(att)}" value="${cur_r}">
								</div>
							`;
			}).join("")}
					</div>
				</div>

				<!-- Wrap-up Checkboxes & Finish -->
				<div class="nn-l10-card">
					<div style="display:flex;flex-direction:column;gap:12px;margin-bottom:20px">
						<label style="display:flex;align-items:center;gap:8px;font-size:13px;color:#374151;cursor:pointer">
							<input type="checkbox" id="nn-chk-archive" checked>
							<span>${__("Archive All Completed Headlines, To-Dos and Issues for the ")}${this.esc(team)}</span>
						</label>
						<label style="display:flex;align-items:center;gap:8px;font-size:13px;color:#374151;cursor:pointer">
							<input type="checkbox" id="nn-chk-email" checked>
							<span>${__("Send Meeting Recap Email")}</span>
						</label>
						<label style="display:flex;align-items:center;gap:8px;font-size:13px;color:#374151;cursor:pointer">
							<input type="checkbox" id="nn-chk-desc">
							<span>${__("Show Issue description on recap emails")}</span>
						</label>
					</div>
					<div style="display:flex;justify-content:flex-end">
						<button class="nn-btn-green" id="nn-finish-meeting-final-btn" style="height:40px;padding:0 24px;font-size:13.5px">
							${ic("check-circle", 16)} <span>${__("Finish Meeting")}</span>
						</button>
					</div>
				</div>
			`;
		}

		bind_l10_step_specific_events() {
			const self = this;
			const $main = this.$root.find("#nn-l10-main-step-container");

			// Segue events
			$main.find(".nn-attendee-chip").on("click", function () {
				const att = $(this).attr("data-attendee");
				self.s.meeting_attendance[att] = !self.s.meeting_attendance[att];
				self.render_l10_meeting_workspace();
			});

			$main.find("#nn-mark-all-present-btn").on("click", () => {
				(self.s.meeting_attendees || []).forEach(att => {
					self.s.meeting_attendance[att] = true;
				});
				self.render_l10_meeting_workspace();
			});

			$main.find("#nn-good-news-input").on("input", function () {
				const att = (self.s.meeting_attendees || [])[self.s.meeting_sharing_idx || 0];
				if (att) {
					self.s.meeting_good_news = self.s.meeting_good_news || {};
					self.s.meeting_good_news[att] = $(this).val();
				}
			});

			$main.find("#nn-prev-sharer-btn").on("click", () => {
				if (self.s.meeting_sharing_idx > 0) {
					self.s.meeting_sharing_idx--;
					self.render_l10_meeting_workspace();
				}
			});

			$main.find("#nn-next-sharer-btn").on("click", () => {
				const atts = self.s.meeting_attendees || [];
				if (self.s.meeting_sharing_idx < atts.length - 1) {
					self.s.meeting_sharing_idx++;
					self.render_l10_meeting_workspace();
				} else {
					self.switch_l10_step(1); // Jump to Scorecard
				}
			});

			// Drop to IDS buttons across steps
			$main.find(".nn-drop-to-ids-btn").on("click", function () {
				const title = $(this).attr("data-title");
				const type = $(this).attr("data-type");
				self.drop_to_ids(title, type);
			});

			// Rock review events
			$main.find("#nn-l10-add-rock-btn").on("click", () => self.open_rock_drawer());

			// Headlines events
			$main.find("#nn-create-headline-btn").on("click", () => {
				frappe.prompt([
					{ fieldname: "type", fieldtype: "Select", options: "Customer\nEmployee", label: __("Type"), default: "Customer" },
					{ fieldname: "title", fieldtype: "Data", label: __("Headline"), reqd: 1 }
				], values => {
					self.s.headlines = self.s.headlines || [];
					self.s.headlines.unshift({
						id: Date.now(),
						type: values.type,
						title: values.title,
						author: frappe.session.user_fullname || "User",
						date: "Today"
					});
					self.render_l10_meeting_workspace();
					frappe.show_alert({ message: __("Headline added"), indicator: "green" });
				}, __("Create Headline"));
			});

			$main.find("#nn-create-cascading-btn").on("click", () => {
				frappe.prompt([
					{ fieldname: "message", fieldtype: "Small Text", label: __("Cascading Message"), reqd: 1 }
				], values => {
					self.s.cascading_messages = self.s.cascading_messages || [];
					self.s.cascading_messages.push({ message: values.message });
					self.render_l10_meeting_workspace();
					frappe.show_alert({ message: __("Cascading message created"), indicator: "green" });
				}, __("Create Cascading Message"));
			});

			// To-Dos events
			$main.find("#nn-l10-add-todo-inline-btn").on("click", () => self.open_todo_drawer());

			$main.find(".nn-todo-checkbox").on("click", async function (e) {
				e.stopPropagation();
				const todo_id = $(this).attr("data-todo-id");
				const td = (self.todos || []).find(t => t.name === todo_id);
				if (!td) return;
				const new_status = td.status === "Complete" ? "Open" : "Complete";
				td.status = new_status;
				await self.call("frappe.client.set_value", {
					doctype: "To Do", name: todo_id, fieldname: "status", value: new_status
				});
				self.render_l10_meeting_workspace();
			});

			// IDS events
			$main.find("#nn-l10-add-issue-btn").on("click", () => self.open_issue_drawer());

			$main.find(".nn-solve-issue-btn").on("click", function () {
				const iss_id = $(this).attr("data-issue");
				frappe.prompt([
					{ fieldname: "solution", fieldtype: "Small Text", label: __("Resolution / Action To-Do"), reqd: 1 }
				], async values => {
					await self.call("frappe.client.set_value", {
						doctype: "Issue", name: iss_id,
						fieldname: { status: "Solved", solution: values.solution }
					});
					await self.fetch_issues_data();
					self.render_l10_meeting_workspace();
					frappe.show_alert({ message: __("Issue solved!"), indicator: "green" });
				}, __("Solve Issue"));
			});

			// Ratings events
			$main.find(".nn-rating-input").on("input change", function () {
				const att = $(this).attr("data-attendee");
				const val = parseFloat($(this).val()) || 10;
				self.s.meeting_ratings[att] = val;

				let sum = 0, cnt = 0;
				(self.s.meeting_attendees || []).forEach(a => {
					sum += Number(self.s.meeting_ratings[a] || 8);
					cnt++;
				});
				const avg = cnt ? (sum / cnt).toFixed(1) : "8.5";
				self.$root.find("#nn-conclude-avg-rating").text(avg);
			});

			// Rock status change
			$main.find(".nn-status-badge[data-rock]").on("click", function (e) {
				e.stopPropagation();
				const rname = $(this).attr("data-rock");
				const r = (self.rocks || []).find(x => x.title === rname || x.name === rname);
				if (!r) return;
				const statuses = ["On-track", "Off-track", "Complete", "Dropped"];
				self.pick_menu(this, statuses, r.status || "On-track", async new_st => {
					r.status = new_st;
					await self.call("frappe.client.set_value", {
						doctype: "Rock", name: r.name, fieldname: "status", value: new_st
					});
					self.render_l10_meeting_workspace();
					frappe.show_alert({ message: __(`Rock status updated: ${new_st}`), indicator: "green" });
				});
			});

			$main.find("#nn-finish-meeting-final-btn").on("click", async () => {
				if (self.$root.find("#nn-chk-archive").is(":checked")) {
					try {
						const team = self.s.meeting_team || self.s.team || "TG BPO";
						const completed_tds = (self.todos || []).filter(t => t.status === "Complete" && (team === "All Teams" || !t.team || t.team === team));
						for (const td of completed_tds) {
							await self.call("frappe.client.set_value", { doctype: "To Do", name: td.name, fieldname: "archived", value: 1 });
						}
						const solved_iss = (self.issues || []).filter(i => i.status === "Solved" && (team === "All Teams" || !i.team || i.team === team));
						for (const iss of solved_iss) {
							await self.call("frappe.client.set_value", { doctype: "Issue", name: iss.name, fieldname: "archived", value: 1 });
						}
					} catch (ae) {
						console.warn("Archiving items:", ae);
					}
				}
				self.finish_l10_meeting();
			});
		}

		async drop_to_ids(title, type) {
			const team = this.s.meeting_team || this.s.team || "TG BPO";
			const doc = {
				doctype: "Issue",
				issue_name: title || "New Meeting Issue",
				team: team !== "All Teams" ? team : "",
				owner_user: frappe.session.user || "Administrator",
				status: "Identified",
				priority: "High",
				source: type || "Meeting",
				archived: 0
			};
			await this.call("frappe.client.insert", { doc });
			await this.fetch_issues_data();
			frappe.show_alert({ message: __(`Dropped to IDS: ${title}`), indicator: "orange" });
			if (this.s.meeting_step === 5) {
				this.render_l10_meeting_workspace();
			}
		}

		async finish_l10_meeting() {
			if (this.meeting_timer_interval) clearInterval(this.meeting_timer_interval);
			const team = this.s.meeting_team || this.s.team || (this.all_teams.length > 1 ? this.all_teams[1] : "TG BPO");
			const dur_min = Math.max(1, Math.round(this.s.meeting_seconds / 60));
			const team_name = team !== "All Teams" ? team : (this.all_teams.find(t => t !== "All Teams") || "TG BPO");
			const today_str = frappe.datetime.nowdate();
			const doc_name = `${team_name}-${today_str}`;
			const step_names = ["Segue", "Scorecard", "Rock Review", "Headlines", "To-Dos", "IDS", "Conclude"];
			const step_summary = step_names.map((nm, idx) => `${nm}: ${this.fmt_timer((this.s.meeting_step_times && this.s.meeting_step_times[idx]) || 0)}`).join(", ");
			const notes_str = `Duration: ${dur_min} min. Sections: [${step_summary}]. Ratings: ${JSON.stringify(this.s.meeting_ratings || {})}. Attendees: ${(this.s.meeting_attendees || []).join(", ")}.`;

			try {
				const chk = await this.call("frappe.client.get_value", {
					doctype: "Level 10 Meeting",
					filters: { name: doc_name },
					fieldname: "name"
				});
				if (chk.ok && chk.data && chk.data.name) {
					await this.call("frappe.client.set_value", {
						doctype: "Level 10 Meeting",
						name: doc_name,
						fieldname: { status: "Complete", notes: notes_str }
					});
				} else {
					await this.call("frappe.client.insert", {
						doc: {
							doctype: "Level 10 Meeting",
							team: team_name,
							meeting_date: today_str,
							status: "Complete",
							notes: notes_str
						}
					});
				}
			} catch (e) {
				console.warn("Saving Level 10 Meeting backend doc:", e);
			}

			this.s.meeting_in_progress = false;
			frappe.show_alert({ message: __("Level 10 Meeting completed and archived successfully!"), indicator: "green" });
			await this.fetch_meetings_data();
			this.render_meetings();
		}

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
			const tf = this.s.timeframe || "All";
			const default_n = tf === "Month" ? 6 : tf === "Quarter" ? 4 : tf === "Annual" ? 3 : 13;
			const period_count = Number(this.s.range) || default_n;
			this.data = { periods: this.make_periods(tf === "All" ? "Week" : tf, period_count), metrics: [] };
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
			let scs = sc_res.ok ? sc_res.data : [];
			if (!scs || !scs.length) {
				scs = [
					{ name: 'Leadership Team-Weekly', team: 'Leadership Team', timeframe: 'Weekly', modified: '2026-10-14' },
					{ name: 'Leadership Team-Monthly', team: 'Leadership Team', timeframe: 'Monthly', modified: '2026-10-14' },
					{ name: 'BEL BPO-Weekly', team: 'BEL BPO', timeframe: 'Weekly', modified: '2026-10-14' },
					{ name: 'BEL BPO-Monthly', team: 'BEL BPO', timeframe: 'Monthly', modified: '2026-10-14' },
					{ name: 'BPO and IT-Weekly', team: 'BPO and IT', timeframe: 'Weekly', modified: '2026-10-14' },
					{ name: 'BPO and IT-Monthly', team: 'BPO and IT', timeframe: 'Monthly', modified: '2026-10-14' },
					{ name: 'BPO and IT-Quarterly', team: 'BPO and IT', timeframe: 'Quarterly', modified: '2026-10-14' },
					{ name: 'BPO and IT-Annual', team: 'BPO and IT', timeframe: 'Annual', modified: '2026-10-14' },
					{ name: 'IT & BPO-Weekly', team: 'IT & BPO', timeframe: 'Weekly', modified: '2026-10-14' },
					{ name: 'IT & BPO-Monthly', team: 'IT & BPO', timeframe: 'Monthly', modified: '2026-10-14' },
					{ name: 'IT & BPO-Quarterly', team: 'IT & BPO', timeframe: 'Quarterly', modified: '2026-10-14' },
					{ name: 'IT & BPO-Annual', team: 'IT & BPO', timeframe: 'Annual', modified: '2026-10-14' },
					{ name: 'Test-Weekly', team: 'Test', timeframe: 'Weekly', modified: '2026-10-14' },
					{ name: 'Test-Monthly', team: 'Test', timeframe: 'Monthly', modified: '2026-10-14' },
					{ name: 'SC Rollup Team-Weekly', team: 'SC Rollup Team', timeframe: 'Weekly', modified: '2026-10-14' }
				];
			}
			this.scorecards = scs;
			const is_all_teams = !s.team || s.team === "All Teams";
			const sc_match = !is_all_teams
				? (scs.find(x => x.team === s.team && (x.timeframe === "Weekly" || x.timeframe === "Week")) || scs.find(x => x.team === s.team))
				: scs[0];
			this.current_scorecard_id = sc_match ? sc_match.name : (!is_all_teams ? `${s.team}-Weekly` : "");

			if (u_res.ok && u_res.data) this.users = u_res.data;

			const m_fields = ["name", "metric_name as title", "description", "target_value as goal", "operator as goal_op", "unit", "unit_type", "rollup", "frequency", "owner_user", "team", "scorecard", "group as grp", "min_value", "max_value"];

			const m_filters = { archived: 0 };
			if (!is_all_teams) {
				m_filters.team = s.team;
			}

			const grp_filters = { archived: 0 };
			if (!is_all_teams && this.current_scorecard_id) {
				grp_filters.scorecard = this.current_scorecard_id;
			}

			const [grp_res, m_res] = await Promise.all([
				this.list(C.group.doctype, ["name", "group_name"], grp_filters),
				this.list(C.measurable.doctype, m_fields, m_filters, "creation asc", 200)
			]);

			if (grp_res.ok && grp_res.data && grp_res.data.length) this.current_group_id = grp_res.data[0].name;

			let raw_metrics = (m_res.ok && m_res.data && m_res.data.length) ? m_res.data : [];
			if (!raw_metrics.length && !is_all_teams && this.current_scorecard_id) {
				const fallback_m = await this.list(C.measurable.doctype, m_fields, { scorecard: this.current_scorecard_id, archived: 0 }, "creation asc", 100);
				if (fallback_m.ok && fallback_m.data) raw_metrics = fallback_m.data;
			}

			const metrics = raw_metrics.map(m => ({
				id: m.name,
				title: m.title || m.name,
				desc: m.description || "",
				owner: m.owner_user || "Administrator",
				team: m.team || "",
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
						team: is_all_teams ? "" : s.team
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
						<div class="nn-search-input-wrap">${ic("search", 13)}<input id="nn-search-input" placeholder="${__("Search")} ${this.get_doctype_label("EOS Metric", "Measurables")}…" value="${this.esc(s.search)}"></div>
					</div>
				</div>

				<div class="nn-card-wrap" style="margin:16px 28px 40px">
					<div class="nn-card-header">
						<div style="display:flex;align-items:center;gap:8px">
							<span style="font-size:16px;font-weight:700">${s.timeframe === "Month" ? __("Monthly KPIs") : s.timeframe === "Quarter" ? __("Quarterly KPIs") : s.timeframe === "Annual" ? __("Annual KPIs") : __("Weekly KPIs")}</span>
							<span class="nn-badge-cnt">${this.data.metrics.length}</span>
						</div>
					</div>

					<div class="nn-table-scroll" id="nn-table-wrap"></div>
				</div>
				<div id="nn-owner-popover-container"></div>
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
				const teams_list = self.all_teams;
				self.pick_menu(this, teams_list, s.team, v => {
					s.team = v;
					s.rock_team = v;
					s.owner_filter = null;
					s.owner_customized = false;
					s.owner_popover_open = false;
					self.load_scorecard();
				});
			});

			// View by dropdown
			$m.find("#nn-view").off("click").on("click", function (e) {
				e.stopPropagation();
				self.pick_menu(this, ["Week", "Month", "Quarter", "Annual"], s.timeframe, v => {
					s.timeframe = v;
					s.range = null;
					s.owner_filter = null;
					s.owner_customized = false;
					s.owner_popover_open = false;
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
				s.owner_filter = null;
				s.owner_customized = false;
				s.owner_popover_open = false;
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

			// Owner filter toggle (from header icon)
			$m.off("click.nn_owner_btn", "#nn-sc-owner-filter").on("click.nn_owner_btn", "#nn-sc-owner-filter", function (e) {
				e.stopPropagation();
				const rect = this.getBoundingClientRect();
				const popover_width = 310;
				const trigger_center = rect.left + (rect.width / 2);
				self.s.owner_popover_pos = {
					top: Math.round(rect.bottom + 6),
					left: Math.round(Math.max(12, Math.min(trigger_center - (popover_width / 2), window.innerWidth - popover_width - 16)))
				};
				self.s.owner_popover_open = !self.s.owner_popover_open;
				self.s.owner_search = "";
				self.render_grid();
				if (self.s.owner_popover_open) {
					setTimeout(() => {
						$m.find("#nn-owner-search").focus();
					}, 50);
				}
			});

			$m.off("input.nn_owner_srch", "#nn-owner-search").on("input.nn_owner_srch", "#nn-owner-search", function () {
				self.s.owner_search = $(this).val();
				const q = self.s.owner_search.toLowerCase().trim();
				$m.find(".nn-owner-row").each(function () {
					const txt = $(this).find(".nn-owner-row-name").text().toLowerCase();
					$(this).css("display", (!q || txt.includes(q)) ? "flex" : "none");
				});
				$m.find("#nn-owner-search-clear").toggle(Boolean(q));
			});

			$m.off("click.nn_owner_clr_srch", "#nn-owner-search-clear").on("click.nn_owner_clr_srch", "#nn-owner-search-clear", function (e) {
				e.stopPropagation();
				self.s.owner_search = "";
				$m.find("#nn-owner-search").val("").focus();
				$m.find(".nn-owner-row").css("display", "flex");
				$(this).hide();
			});

			$m.off("click.nn_owner_only_me", "#nn-owner-only-me").on("click.nn_owner_only_me", "#nn-owner-only-me", function (e) {
				e.stopPropagation();
				const all_owners = Array.from(new Set((self.data.metrics || []).map(m => m.owner).filter(Boolean)));
				const my_owners = all_owners.filter(o => self.is_my_metric({ owner: o, owner_user: o }));
				self.s.owner_customized = true;
				self.s.owner_filter = my_owners.length ? my_owners : [];
				self.render_grid();
			});

			$m.off("click.nn_owner_all", "#nn-owner-select-all").on("click.nn_owner_all", "#nn-owner-select-all", function (e) {
				e.stopPropagation();
				self.s.owner_customized = true;
				self.s.owner_filter = null;
				self.render_grid();
			});

			$m.off("click.nn_owner_clr", "#nn-owner-clear").on("click.nn_owner_clr", "#nn-owner-clear", function (e) {
				e.stopPropagation();
				self.s.owner_customized = true;
				self.s.owner_filter = [];
				self.render_grid();
			});

			$m.off("click.nn_owner_done", "#nn-owner-done").on("click.nn_owner_done", "#nn-owner-done", function (e) {
				e.stopPropagation();
				self.s.owner_popover_open = false;
				self.s.owner_search = "";
				self.render_grid();
			});

			$m.off("change.nn_owner_item", ".nn-owner-filter-item").on("change.nn_owner_item", ".nn-owner-filter-item", function () {
				const all_owners = Array.from(new Set((self.data.metrics || []).map(m => m.owner).filter(Boolean)));
				const my_owners = all_owners.filter(o => self.is_my_metric({ owner: o, owner_user: o }));
				let cur_selected = self.s.owner_customized
					? (self.s.owner_filter === null ? [...all_owners] : (Array.isArray(self.s.owner_filter) ? [...self.s.owner_filter] : []))
					: [...my_owners];

				const val = $(this).val();
				if ($(this).prop("checked")) {
					if (!cur_selected.includes(val)) cur_selected.push(val);
				} else {
					cur_selected = cur_selected.filter(x => x !== val);
				}

				self.s.owner_customized = true;
				if (cur_selected.length >= all_owners.length && all_owners.every(o => cur_selected.includes(o))) {
					self.s.owner_filter = null;
				} else {
					self.s.owner_filter = cur_selected;
				}
				self.render_grid();
			});

			$(document).off("click.nn_owner_filter").on("click.nn_owner_filter", function (e) {
				if (self.s.owner_popover_open && !$(e.target).closest(".nn-owner-filter-popover, #nn-sc-owner-filter").length) {
					self.s.owner_popover_open = false;
					self.s.owner_search = "";
					self.render_grid();
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

		render_owner_popover(all_owners, selected_owners) {
			const self = this;
			const is_all = !selected_owners || (all_owners.length > 0 && selected_owners.length === all_owners.length);
			const q = (this.s.owner_search || "").toLowerCase().trim();
			const visible_owners = all_owners.filter(o => {
				const name = (self.get_user_display_name(o) || o).toLowerCase();
				return !q || name.includes(q) || o.toLowerCase().includes(q);
			});

			const my_owners = all_owners.filter(o => self.is_my_metric({ owner: o, owner_user: o }));
			const is_only_me = Array.isArray(selected_owners) &&
				my_owners.length > 0 &&
				selected_owners.length === my_owners.length &&
				selected_owners.every(o => my_owners.includes(o));

			const selected_count = is_all ? all_owners.length : (Array.isArray(selected_owners) ? selected_owners.length : 0);
			const pos = this.s.owner_popover_pos || { top: 180, left: 240 };

			return `
				<div class="nn-owner-filter-popover" id="nn-owner-popover" style="top:${pos.top}px;left:${pos.left}px;width:310px;max-width:calc(100vw - 24px);position:fixed;z-index:100000;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;box-shadow:0 20px 25px -5px rgba(0,0,0,0.14),0 8px 10px -6px rgba(0,0,0,0.08);padding:12px;box-sizing:border-box;display:flex;flex-direction:column;font-family:inherit;text-align:left;">
					<div class="nn-owner-popover-header" style="padding-bottom:8px;border-bottom:1px solid #f3f4f6;margin-bottom:8px;">
						<div class="nn-owner-popover-title-row" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
							<div class="nn-owner-popover-title" style="font-size:12.5px;font-weight:700;color:#111827;display:flex;align-items:center;gap:6px;">
								${ic("users", 14)}
								<span>${__("Filter by Owner")}</span>
							</div>
							<span class="nn-owner-popover-badge" style="font-size:11px;font-weight:600;padding:2px 7px;border-radius:10px;background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;">
								${is_all ? `${__("All")} (${all_owners.length})` : `${selected_count} / ${all_owners.length} ${__("selected")}`}
							</span>
						</div>
						<div class="nn-owner-quick-row" style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">
							<button type="button" class="nn-quick-btn ${is_only_me ? 'active' : ''}" id="nn-owner-only-me" style="flex:1;height:26px;padding:0 6px;font-size:11px;font-weight:600;border-radius:6px;border:1px solid ${is_only_me ? '#047857' : '#e5e7eb'};background:${is_only_me ? '#047857' : '#f9fafb'};color:${is_only_me ? '#ffffff' : '#4b5563'};cursor:pointer;display:inline-flex;align-items:center;justify-content:center;transition:all 0.15s ease;">${__("Only Me")}</button>
							<button type="button" class="nn-quick-btn ${is_all ? 'active' : ''}" id="nn-owner-select-all" style="flex:1;height:26px;padding:0 6px;font-size:11px;font-weight:600;border-radius:6px;border:1px solid ${is_all ? '#047857' : '#e5e7eb'};background:${is_all ? '#047857' : '#f9fafb'};color:${is_all ? '#ffffff' : '#4b5563'};cursor:pointer;display:inline-flex;align-items:center;justify-content:center;transition:all 0.15s ease;">${__("Select All")}</button>
							<button type="button" class="nn-quick-btn" id="nn-owner-clear" style="flex:1;height:26px;padding:0 6px;font-size:11px;font-weight:600;border-radius:6px;border:1px solid #e5e7eb;background:#f9fafb;color:#4b5563;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;transition:all 0.15s ease;">${__("Clear")}</button>
						</div>
						<div class="nn-owner-search-wrap" style="position:relative;display:flex;align-items:center;height:30px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:0 8px;gap:6px;color:#9ca3af;">
							${ic("search", 13)}
							<input type="text" id="nn-owner-search" placeholder="${__("Search team members")}…" value="${this.esc(this.s.owner_search || "")}" style="border:none;background:transparent;outline:none;font-size:12px;color:#111827;width:100%;box-shadow:none;margin:0;padding:0;">
							${this.s.owner_search ? `<button type="button" class="nn-owner-search-clear" id="nn-owner-search-clear" style="background:none;border:none;cursor:pointer;padding:0 4px;color:#9ca3af;font-size:15px;line-height:1;display:flex;align-items:center;">×</button>` : ""}
						</div>
					</div>
					<div class="nn-owner-filter-list" style="max-height:210px;overflow-y:auto;display:flex;flex-direction:column;gap:3px;padding-right:2px;">
						${visible_owners.map(o => {
							const name = self.get_user_display_name(o) || o;
							const checked = is_all || (Array.isArray(selected_owners) && selected_owners.includes(o));
							const is_me = self.is_my_metric({ owner: o, owner_user: o });
							const initials = (name || "U").split(/\s+/).slice(0, 2).map(w => w[0] || "").join("").toUpperCase() || "U";
							const col = getOwnerColor(name || o);
							return `
								<label class="nn-owner-row ${checked ? 'selected' : ''}" style="display:flex;align-items:center;gap:8px;padding:6px 8px;font-size:12px;color:#374151;cursor:pointer;border-radius:6px;user-select:none;transition:all 0.12s ease;margin:0;background:${checked ? '#f0fdf4' : 'transparent'};">
									<input type="checkbox" class="nn-owner-filter-item" value="${self.esc(o)}" ${checked ? 'checked' : ''} style="cursor:pointer;accent-color:#047857;margin:0;width:15px;height:15px;flex-shrink:0;">
									<div class="nn-owner-row-av" style="width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0;background:${col.bg};color:${col.fg};">${self.esc(initials)}</div>
									<span class="nn-owner-row-name" title="${self.esc(name)}" style="flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:${checked ? '600' : '500'};color:${checked ? '#064e3b' : '#1f2937'};">${self.esc(name)}</span>
									${is_me ? `<span class="nn-me-tag" style="font-size:9.5px;font-weight:700;padding:1px 5px;border-radius:4px;background:#dcfce7;color:#15803d;letter-spacing:0.2px;margin-left:auto;">${__("You")}</span>` : ""}
								</label>
							`;
						}).join("")}
						${visible_owners.length === 0 ? `<div style="padding:14px;font-size:12px;color:#9ca3af;text-align:center;">${__("No team members found")}</div>` : ""}
					</div>
					<div class="nn-owner-popover-footer" style="display:flex;align-items:center;justify-content:space-between;padding-top:8px;margin-top:6px;border-top:1px solid #f3f4f6;">
						<span style="font-size:11px;color:#6b7280;">
							${selected_count === 0 ? __("No owners selected") : selected_count === all_owners.length ? __("Showing all scorecards") : `${selected_count} ${__("user(s) selected")}`}
						</span>
						<button type="button" class="nn-btn-green" id="nn-owner-done" style="height:26px;padding:0 14px;font-size:11.5px;font-weight:600;border-radius:5px;background:#047857;color:#ffffff;border:none;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;">${__("Done")}</button>
					</div>
				</div>
			`;
		}

		render_grid() {
			const self = this;
			const P = this.data.periods;
			const q = (this.s.search || "").toLowerCase().trim();
			let metrics = this.data.metrics.filter(m => !q || m.title.toLowerCase().includes(q));

			const all_owners = Array.from(new Set((this.data.metrics || []).map(m => m.owner).filter(Boolean))).sort();
			const my_owners = all_owners.filter(o => self.is_my_metric({ owner: o, owner_user: o }));

			let effective_selected_owners = null;
			if (this.s.owner_customized) {
				if (Array.isArray(this.s.owner_filter)) {
					this.s.owner_filter = this.s.owner_filter.filter(o => all_owners.includes(o));
					if (all_owners.length > 0 && this.s.owner_filter.length === all_owners.length) {
						this.s.owner_filter = null;
					}
				}
				effective_selected_owners = this.s.owner_filter;
				if (Array.isArray(effective_selected_owners)) {
					metrics = metrics.filter(m => (effective_selected_owners.length ? effective_selected_owners.includes(m.owner) : false));
				}
			} else {
				// Default for ALL users: show their scorecard only
				effective_selected_owners = my_owners;
				metrics = metrics.filter(m => self.is_my_metric(m) || (my_owners.length && my_owners.includes(m.owner)));
			}
			const is_owner_filtered = Array.isArray(effective_selected_owners) && effective_selected_owners.length < all_owners.length;

			const ths = P.map(p => `<th>${p.label}</th>`).join("");
			const rows = metrics.length ? metrics.map(m => {
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
							<td class="nn-sc-cell ${cls}" data-metric="${self.esc(m.id)}" data-key="${p.key}" data-goal="${m.goal}" data-op="${self.esc(m.goal_op || '>=')}">
								<div class="nn-cell-wrap">
									<span class="nn-cell-badge ${cls}">${val}</span>
								</div>
							</td>`;
					}
				});

				return `
					<tr>
						<td class="left nn-col-metric" style="width:240px;min-width:240px;max-width:240px;font-weight:600;color:#111827;white-space:normal;word-break:break-word;overflow-wrap:break-word;line-height:1.35">
							<span class="nn-metric-title" data-id="${m.id}" style="cursor:pointer;white-space:normal;word-break:break-word;overflow-wrap:break-word;display:block">${this.esc(m.title)}</span>
						</td>
						<td class="nn-col-owner" style="width:76px;min-width:76px;max-width:76px;text-align:center">
							<span class="nn-av-circle" style="width:22px;height:22px;font-size:9.5px">${initials}</span>
						</td>
						<td class="nn-col-goal" style="width:110px;min-width:110px;max-width:110px;font-weight:600;color:#374151;text-align:center">${m.goal_op || ">="} ${m.goal}</td>
						${cells}
					</tr>
				`;
			}).join("") : `
				<tr>
					<td colspan="${P.length + 3}" style="padding:48px;text-align:center;color:#9ca3af">${__("No measurables found.")}</td>
				</tr>
			`;

			this.$main.find("#nn-table-wrap").html(`
				<table class="nn-sc-tbl">
					<thead>
						<tr>
							<th class="left nn-col-metric" style="width:240px;min-width:240px;max-width:240px">${this.get_field_label("EOS Metric", "metric_name", "Measurable")}</th>
							<th class="nn-col-owner" style="width:76px;min-width:76px;max-width:76px;text-align:center;">
								<div style="display:inline-flex;align-items:center;justify-content:center;gap:4px">
									<span>${this.get_field_label("EOS Metric", "owner_user", "Owner")}</span>
									<button class="nn-btn-icon nn-owner-filter-btn ${is_owner_filtered ? 'active' : ''}" id="nn-sc-owner-filter" title="${__("Filter by Owner")}" style="color:${is_owner_filtered ? '#047857' : '#9ca3af'};background:${is_owner_filtered ? '#d1fae5' : 'transparent'};border:none;padding:2px 3px;cursor:pointer;display:inline-flex;align-items:center;border-radius:4px;transition:all 0.15s ease;">
										${ic("filter", 12)}
									</button>
								</div>
							</th>
							<th class="nn-col-goal" style="width:110px;min-width:110px;max-width:110px;text-align:center">${this.get_field_label("EOS Metric", "target_value", "Goal")}</th>
							${ths}
						</tr>
					</thead>
					<tbody>${rows}</tbody>
				</table>
			`);

			this.$main.find("#nn-owner-popover-container").html(
				this.s.owner_popover_open ? this.render_owner_popover(all_owners, effective_selected_owners) : ""
			);

			this.$main.find(".nn-badge-cnt").text(metrics.length);

			this.bind_grid_cell_events();
		}

		bind_grid_cell_events() {
			const self = this;
			const $m = this.$main;

			$m.find(".nn-metric-title").off("click").on("click", function () {
				self.open_measurable_drawer($(this).attr("data-id"));
			});

			const commit_active_cell = async ($active_td, should_focus_next = null) => {
				const $inp = $active_td.find(".nn-sc-cell-input");
				if (!$inp.length) return;
				const metric_id = $active_td.attr("data-metric");
				const key = $active_td.attr("data-key");
				const goal = Number($active_td.attr("data-goal")) || 0;
				const op = $active_td.attr("data-op") || ">=";
				const metric = self.data.metrics.find(x => x.id === metric_id);

				if ($active_td.data("cell-timer")) {
					clearTimeout($active_td.data("cell-timer"));
					$active_td.removeData("cell-timer");
				}

				const raw = $inp.val().trim();
				const new_val = raw === "" ? null : Number(raw);

				if (new_val === null) {
					if (metric && metric.values) delete metric.values[key];
					$active_td.removeClass("pass fail editing").html('<span class="nn-cell-val empty">-</span>');
					await self.save_scorecard_entry(metric_id, key, null);
				} else if (isNaN(new_val)) {
					frappe.show_alert({ message: __("Please enter a valid number"), indicator: "red" });
					self.render_grid();
					return;
				} else {
					if (metric) {
						if (!metric.values) metric.values = {};
						metric.values[key] = new_val;
					}
					const pass = self.check_goal_pass(new_val, goal, op);
					const cls = pass ? "pass" : "fail";
					$active_td.removeClass("pass fail editing").addClass(cls).html(`
						<div class="nn-cell-wrap">
							<span class="nn-cell-badge ${cls}">${new_val}</span>
						</div>
					`);
					await self.save_scorecard_entry(metric_id, key, new_val);
				}

				if (should_focus_next && should_focus_next.length) {
					should_focus_next.trigger("click");
				}
			};

			$m.off("click.sccell").on("click.sccell", ".nn-sc-cell", function (e) {
				if (self.s.timeframe && self.s.timeframe !== "Week") {
					frappe.show_alert({
						message: __("Rolled-up view is read-only. Switch to Weekly KPIs to enter data."),
						indicator: "blue"
					});
					return;
				}
				const $td = $(this);
				if ($td.find(".nn-sc-cell-input").length) return;

				const $other_active = $m.find(".nn-sc-cell:has(.nn-sc-cell-input)");
				if ($other_active.length && !$other_active.is($td)) {
					commit_active_cell($other_active);
				}

				const metric_id = $td.attr("data-metric");
				const key = $td.attr("data-key");
				const goal = Number($td.attr("data-goal")) || 0;
				const op = $td.attr("data-op") || ">=";
				const metric = self.data.metrics.find(x => x.id === metric_id);
				const cur_val = metric && metric.values && metric.values[key] != null ? metric.values[key] : "";

				const $inp = $(`<input type="number" step="any" class="nn-sc-cell-input" value="${cur_val}">`);
				$td.addClass("editing").empty().append($inp);
				$inp.focus().select();

				$inp.on("input", function () {
					const raw = $(this).val().trim();
					const val_num = raw === "" ? null : Number(raw);
					if (metric && !isNaN(val_num)) {
						if (!metric.values) metric.values = {};
						if (val_num === null) delete metric.values[key];
						else metric.values[key] = val_num;
					}
					if ($td.data("cell-timer")) clearTimeout($td.data("cell-timer"));
					const timer = setTimeout(async () => {
						await self.save_scorecard_entry(metric_id, key, val_num);
					}, 400);
					$td.data("cell-timer", timer);
				});

				$inp.on("blur", function () {
					commit_active_cell($td);
				});

				$inp.on("keydown", function (ev) {
					if (ev.key === "Enter") {
						ev.preventDefault();
						const $next_tr = $td.closest("tr").next("tr");
						const col_idx = $td.index();
						const $next_td = $next_tr.length ? $next_tr.children().eq(col_idx) : null;
						commit_active_cell($td, $next_td);
					} else if (ev.key === "Tab") {
						ev.preventDefault();
						const $next_td = ev.shiftKey ? $td.prev(".nn-sc-cell") : $td.next(".nn-sc-cell");
						commit_active_cell($td, $next_td);
					} else if (ev.key === "Escape") {
						ev.preventDefault();
						if ($td.data("cell-timer")) {
							clearTimeout($td.data("cell-timer"));
							$td.removeData("cell-timer");
						}
						if (cur_val !== "") {
							const pass = self.check_goal_pass(cur_val, goal, op);
							const cls = pass ? "pass" : "fail";
							$td.removeClass("pass fail editing").addClass(cls).html(`
								<div class="nn-cell-wrap">
									<span class="nn-cell-badge ${cls}">${cur_val}</span>
								</div>
							`);
						} else {
							$td.removeClass("pass fail editing").html('<span class="nn-cell-val empty">-</span>');
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
				const team = $drawer.find("#nn-d-team").val() || (self.s.team !== "All Teams" ? self.s.team : (self.all_teams.find(t => t !== "All Teams") || ""));
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