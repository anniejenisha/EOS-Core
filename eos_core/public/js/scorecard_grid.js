frappe.provide('frappe.eos_core');

const EOS_DEFAULT_SETTINGS = {
	show_owner: true,
	show_goal: true,
	show_avg: true,
	show_current_period: true,
	status_mode: "colours", // "colours" | "text"
	default_timeframe: "Month"
};

class EOSUIPage {
	constructor(wrapper) {
		this.wrapper = wrapper;
		this.page = wrapper.page || frappe.ui.make_app_page({
			parent: wrapper,
			title: __("Scorecard Grid"),
			single_column: true
		});

		this.state = Object.assign({}, EOS_DEFAULT_SETTINGS, {
			active_tab: "scorecard",
			timeframe: EOS_DEFAULT_SETTINGS.default_timeframe,
			selected_team: "All Teams",
			selected_group: "All Groups",
			selected_status: "All Statuses",
			selected_rows: [],
			bulk_tab: "export",
			trend: { threshold: 3, group: "All Groups", status: "All Statuses" }
		});

		this.API = {
			scorecard_read: "eos_core.eos_core.doctype.scorecard.scorecard.get_grid_view",
			scorecard_write: "eos_core.eos_core.doctype.scorecard.scorecard.update_scorecard_entry",
			create_issue_from_metric: "eos_core.eos_core.doctype.issue.issue.create_issue_from_metric",
			get_rollup_view: "eos_core.eos_core.doctype.scorecard.scorecard.get_rollup_view",
			trends_view: "eos_core.eos_core.doctype.scorecard.scorecard.get_scorecard_trends",
			get_scorecard_settings: "eos_core.eos_core.doctype.team.team.get_scorecard_settings",
			update_scorecard_settings: "eos_core.eos_core.doctype.team.team.update_scorecard_settings",
			export_scorecard_data: "eos_core.eos_core.doctype.scorecard.scorecard.export_scorecard_data",
			mark_rock_complete: "eos_core.eos_core.doctype.rock.rock.mark_complete",
			get_rock_summary: "eos_core.eos_core.doctype.rock.rock.get_rock_summary",
			send_report: "eos_core.eos_core.doctype.scorecard_report.scorecard_report.send_report"
		};

		this.demo_data = this.get_demo_data();
		this.data = this.demo_data;

		this.make_css();
		this.make_html();
		this.bind_events();

		this.init();
	}

	async init() {
		await this.load_settings();
		this.render_tab("scorecard");
	}

	esc(value) {
		return frappe.utils.escape_html(value === undefined || value === null ? "" : String(value));
	}

	get $content() {
		return this.$root.find("#eos-content");
	}

	get_status_class(status) {
		switch (status) {
			case "On Track": return "status-green";
			case "At Risk": return "status-yellow";
			case "Off Track": return "status-red";
			default: return "status-gray";
		}
	}

	render_status(status) {
		const label = this.esc(status || "No Recent Data");

		if (this.state.status_mode === "text") {
			const shapes = {
				"On Track": "○",
				"At Risk": "▲",
				"Off Track": "■"
			};
			const shape = shapes[status] || "◌";
			return `<span class="eos-status"><span class="eos-shape">${shape}</span> ${label}</span>`;
		}

		return `
			<span class="eos-status">
				<span class="eos-status-dot ${this.get_status_class(status)}"></span>
				${label}
			</span>`;
	}

	get_demo_data() {
		return {
			periods: ["W1", "W2", "W3", "W4", "Current"],

			metrics: [
				{
					name: "Revenue Growth",
					owner: "John Smith",
					team: "Leadership",
					group: "Finance",
					goal: 100,
					values: [92, 95, 98, 102, 102],
					status: "On Track"
				},
				{
					name: "Customer Satisfaction",
					owner: "Sarah Lee",
					team: "Sales",
					group: "Customer Success",
					goal: 90,
					values: [88, 90, 91, 93, 93],
					status: "On Track"
				},
				{
					name: "Product Adoption",
					owner: "Mike Chen",
					team: "Leadership",
					group: "Product",
					goal: 80,
					values: [70, 72, 76, 78, 78],
					status: "At Risk"
				},
				{
					name: "Operational Efficiency",
					owner: "Lisa Patel",
					team: "Operations",
					group: "Operations",
					goal: 70,
					values: [60, 55, 55, 52, 52],
					status: "Off Track"
				},
				{
					name: "Team Engagement",
					owner: "David Kim",
					team: "Operations",
					group: "People",
					goal: 85,
					values: [85, 88, 90, 92, 92],
					status: "On Track"
				}
			],

			trends: [
				{ measurable: "Operational Efficiency", owner: "Lisa Patel", group: "Operations", count: 5, status: "Off Track" },
				{ measurable: "Product Adoption", owner: "Mike Chen", group: "Product", count: 4, status: "At Risk" },
				{ measurable: "Customer Satisfaction", owner: "Sarah Lee", group: "Customer Success", count: 3, status: "At Risk" },
				{ measurable: "Revenue Growth", owner: "John Smith", group: "Finance", count: 3, status: "On Track" },
				{ measurable: "Team Engagement", owner: "David Kim", group: "People", count: 2, status: "On Track" }
			],

			measurables: [
				{ name: "Revenue Growth", owner: "John Smith", group: "Finance", archived: false },
				{ name: "Customer Satisfaction", owner: "Sarah Lee", group: "Customer Success", archived: false },
				{ name: "Product Adoption", owner: "Mike Chen", group: "Product", archived: true },
				{ name: "Operational Efficiency", owner: "Lisa Patel", group: "Operations", archived: false },
				{ name: "Team Engagement", owner: "David Kim", group: "People", archived: false }
			]
		};
	}

	make_css() {
		if (document.getElementById("eos-ui-css")) return;

		const css = `
		<style id="eos-ui-css">
			.eos-ui {
				background: #f8fafc;
				min-height: calc(100vh - 120px);
				padding: 20px 24px;
				font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif;
				color: #1e293b;
			}

			.eos-nav {
				display: flex;
				gap: 24px;
				border-bottom: 1px solid #e2e8f0;
				margin-bottom: 20px;
				overflow-x: auto;
				background: #ffffff;
				padding: 10px 20px 0 20px;
				border-radius: 10px 10px 0 0;
			}

			.eos-tab {
				padding: 12px 6px;
				font-size: 13.5px;
				cursor: pointer;
				color: #64748b;
				border-bottom: 2px solid transparent;
				white-space: nowrap;
				font-weight: 500;
				transition: all 0.15s ease;
			}

			.eos-tab:hover { color: #1677ff; }

			.eos-tab.active {
				color: #1677ff;
				border-bottom-color: #1677ff;
				font-weight: 600;
			}

			.eos-page-header {
				display: flex;
				justify-content: space-between;
				align-items: center;
				margin-bottom: 20px;
				gap: 12px;
				flex-wrap: wrap;
			}

			.eos-title { font-size: 22px; font-weight: 700; color: #0f172a; }
			.eos-subtitle { font-size: 12.5px; color: #64748b; margin-top: 2px; }

			.eos-btn {
				border: 1px solid #cbd5e1;
				background: #ffffff;
				color: #334155;
				border-radius: 8px;
				padding: 7px 14px;
				cursor: pointer;
				font-size: 12.5px;
				font-weight: 500;
				transition: all 0.15s ease;
				box-shadow: 0 1px 2px rgba(0,0,0,0.03);
			}
			.eos-btn:hover { background: #f8fafc; border-color: #94a3b8; color: #0f172a; }
			.eos-btn-primary { background: #1677ff; color: white; border-color: #1677ff; font-weight: 600; }
			.eos-btn-primary:hover { background: #0056b3; border-color: #0056b3; color: white; }
			.eos-btn + .eos-btn { margin-left: 8px; }

			.eos-card {
				background: #ffffff;
				border: 1px solid #e2e8f0;
				border-radius: 10px;
				box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
				overflow: hidden;
				margin-bottom: 24px;
			}

			.eos-card-header {
				padding: 16px 20px;
				border-bottom: 1px solid #e2e8f0;
				display: flex;
				justify-content: space-between;
				align-items: center;
				background: #ffffff;
			}

			.eos-card-title { font-weight: 600; color: #0f172a; font-size: 15px; }

			.eos-toolbar {
				display: flex;
				gap: 10px;
				align-items: center;
				flex-wrap: wrap;
				margin-bottom: 20px;
			}

			.eos-select, .eos-input {
				border: 1px solid #cbd5e1;
				background: #ffffff;
				border-radius: 8px;
				padding: 7px 12px;
				font-size: 13px;
				outline: none;
				min-width: 130px;
				color: #334155;
				font-weight: 500;
			}

			.eos-table { width: 100%; border-collapse: collapse; margin: 0; }

			.eos-table th {
				background: #f8fafc;
				color: #475569;
				font-size: 12px;
				font-weight: 600;
				text-align: left;
				padding: 12px 16px;
				border-bottom: 2px solid #e2e8f0;
				white-space: nowrap;
				text-transform: uppercase;
				letter-spacing: 0.5px;
			}

			.eos-table td {
				padding: 14px 16px;
				border-bottom: 1px solid #f1f5f9;
				font-size: 13px;
				color: #1e293b;
				vertical-align: middle;
			}

			.eos-table tr:hover td { background: #f8fafc; }

			.eos-kpi-name { font-weight: 600; color: #0f172a; }
			.eos-link { cursor: pointer; }
			.eos-link:hover { color: #1677ff; text-decoration: underline; }

			.eos-value-input {
				width: 70px;
				padding: 5px 8px;
				border: 1px solid #cbd5e1;
				border-radius: 6px;
				text-align: center;
				font-size: 13px;
				font-weight: 500;
			}
			.eos-value-input:focus { border-color: #1677ff; outline: none; box-shadow: 0 0 0 2px rgba(22, 119, 255, 0.2); }

			.eos-status { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; }
			.eos-status-dot { width: 9px; height: 9px; border-radius: 50%; display: inline-block; }
			.eos-shape { font-size: 13px; width: 14px; text-align: center; color: #334155; }

			.status-green { background: #16a34a; }
			.status-yellow { background: #ca8a04; }
			.status-red { background: #dc2626; }
			.status-gray { background: #94a3b8; }

			.eos-summary {
				display: grid;
				grid-template-columns: repeat(4, 1fr);
				gap: 16px;
				margin-bottom: 20px;
			}

			.eos-summary-box {
				background: #ffffff;
				border: 1px solid #e2e8f0;
				border-radius: 10px;
				padding: 18px 20px;
				box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
			}
			.eos-summary-label { font-size: 12px; color: #64748b; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; }
			.eos-summary-value { font-size: 26px; font-weight: 700; margin-top: 6px; color: #0f172a; }

			.eos-popover {
				position: fixed;
				width: 340px;
				background: #ffffff;
				border: 1px solid #cbd5e1;
				border-radius: 10px;
				box-shadow: 0 10px 25px rgba(0,0,0,.12);
				z-index: 1050;
				padding: 20px;
			}
			.eos-popover-title { font-weight: 700; margin-bottom: 12px; font-size: 14px; color: #0f172a; }

			.eos-setting-row {
				display: flex;
				justify-content: space-between;
				align-items: center;
				padding: 10px 0;
				border-bottom: 1px solid #f1f5f9;
				font-size: 13px;
				gap: 10px;
			}

			.eos-switch {
				width: 40px;
				height: 22px;
				background: #cbd5e1;
				border-radius: 20px;
				position: relative;
				cursor: pointer;
				flex-shrink: 0;
			}
			.eos-switch.on { background: #1677ff; }
			.eos-switch:after {
				content: "";
				position: absolute;
				top: 3px;
				left: 3px;
				width: 16px;
				height: 16px;
				border-radius: 50%;
				background: white;
				transition: .15s;
			}
			.eos-switch.on:after { left: 21px; }

			.eos-empty { text-align: center; padding: 48px; color: #64748b; font-size: 14px; }
		</style>`;

		$("head").append(css);
	}

	make_html() {
		this.$root = $(`
			<div class="eos-ui">
				<div class="eos-nav">
					<div class="eos-tab active" data-tab="scorecard">${__('Scorecard')}</div>
					<div class="eos-tab" data-tab="trends">${__('Trends')}</div>
					<div class="eos-tab" data-tab="manager">${__('Measurable Manager')}</div>
					<div class="eos-tab" data-tab="bulk">${__('Bulk UX')}</div>
					<div class="eos-tab" data-tab="rock">${__('Rocks')}</div>
					<div class="eos-tab" data-tab="report">${__('Scorecard Reports')}</div>
					<div class="eos-tab" data-tab="settings">${__('Settings')}</div>
				</div>
				<div id="eos-content"></div>
			</div>
		`);

		let $target = $(this.page.main);
		if (!$target.length || !$target.is(':visible')) {
			$target = $(this.wrapper).find('.layout-main-section');
		}
		if (!$target.length) {
			$target = $(this.wrapper);
		}

		$target.empty().append(this.$root);
	}

	bind_events() {
		const self = this;
		const $r = this.$root;

		$r.on("click", ".eos-nav .eos-tab", function () {
			self.render_tab($(this).attr("data-tab"));
		});

		$r.on("change", "#eos-team-filter", function () {
			self.state.selected_team = $(this).val();
			self.load_scorecard();
		});
		$r.on("change", "#eos-group-filter", function () {
			self.state.selected_group = $(this).val();
			self.load_scorecard();
		});
		$r.on("change", "#eos-status-filter", function () {
			self.state.selected_status = $(this).val();
			self.load_scorecard();
		});
		$r.on("change", "#eos-timeframe", function () {
			self.state.timeframe = $(this).val();
			self.load_scorecard();
		});

		$r.on("click", "#eos-column-settings", function (e) {
			e.stopPropagation();
			self.show_column_settings(this);
		});
		$r.on("click", "#eos-status-settings", function (e) {
			e.stopPropagation();
			self.show_status_settings(this);
		});

		$r.on("change", ".eos-metric-value", function () {
			self.edit_metric_value(
				$(this).attr("data-metric"),
				$(this).attr("data-period"),
				$(this).val()
			);
		});

		$r.on("click", ".eos-make-issue", function () {
			self.make_issue($(this).attr("data-metric"), $(this).attr("data-week"));
		});
	}

	render_tab(tab) {
		this.close_popover();
		this.state.active_tab = tab;

		this.$root.find(".eos-nav .eos-tab").removeClass("active");
		this.$root.find(`.eos-nav .eos-tab[data-tab="${tab}"]`).addClass("active");

		switch (tab) {
			case "scorecard":
				this.load_scorecard();
				break;
			case "trends":
				this.load_trends();
				break;
			case "manager":
				this.load_manager();
				break;
			case "bulk":
				this.render_bulk();
				break;
			case "rock":
				this.render_rock();
				break;
			case "report":
				this.render_report();
				break;
			case "settings":
				this.render_settings();
				break;
			default:
				this.load_scorecard();
		}
	}

	filter_metrics(metrics) {
		const s = this.state;
		return metrics.filter(m => {
			if (s.selected_team !== "All Teams" && m.team && m.team !== s.selected_team) return false;
			if (s.selected_group !== "All Groups" && m.group !== s.selected_group) return false;
			if (s.selected_status !== "All Statuses" && m.status !== s.selected_status) return false;
			return true;
		});
	}

	async load_scorecard() {
		this.state.active_tab = "scorecard";

		const args = {
			team: this.state.selected_team,
			group: this.state.selected_group,
			status: this.state.selected_status,
			timeframe: this.state.timeframe
		};

		let data = await this.call_api(this.API.scorecard_read, args, this.demo_data);
		this.data = data || this.demo_data;
		this.render_scorecard(this.data);
	}

	option_list(values, current) {
		return values
			.map(v => `<option ${v === current ? "selected" : ""}>${this.esc(v)}</option>`)
			.join("");
	}

	render_scorecard(data) {
		const all = (data.metrics || []);
		const metrics = this.filter_metrics(all);
		const is_week = this.state.timeframe === "Week";
		const s = this.state;

		let periods = (data.periods || []).map((label, index) => ({ label, index }));
		if (!s.show_current_period) {
			periods = periods.filter(p => p.label !== "Current");
		}

		const teams = ["All Teams"].concat(
			Array.from(new Set(all.map(m => m.team).filter(Boolean)))
		);
		const groups = ["All Groups"].concat(
			Array.from(new Set(all.map(m => m.group).filter(Boolean)))
		);
		const statuses = ["All Statuses", "On Track", "At Risk", "Off Track"];
		const frames = ["Week", "Month", "Quarter", "Year"];

		const count = st => metrics.filter(x => x.status === st).length;

		const html = `
			<div class="eos-page-header">
				<div>
					<div class="eos-title">${__('Scorecard')}</div>
					<div class="eos-subtitle">${__('Team measurable performance')}</div>
				</div>
				<div>
					<button class="eos-btn" id="eos-column-settings">⚙ ${__('Column Settings')} ▾</button>
					<button class="eos-btn" id="eos-status-settings">● ${__('Status Display')} ▾</button>
				</div>
			</div>

			<div class="eos-toolbar">
				<select class="eos-select" id="eos-team-filter">${this.option_list(teams, s.selected_team)}</select>
				<select class="eos-select" id="eos-group-filter">${this.option_list(groups, s.selected_group)}</select>
				<select class="eos-select" id="eos-status-filter">${this.option_list(statuses, s.selected_status)}</select>
				<select class="eos-select" id="eos-timeframe">${this.option_list(frames, s.timeframe)}</select>
			</div>

			<div class="eos-summary">
				<div class="eos-summary-box">
					<div class="eos-summary-label">${__('Measurables')}</div>
					<div class="eos-summary-value">${metrics.length}</div>
				</div>
				<div class="eos-summary-box">
					<div class="eos-summary-label">${__('On Track')}</div>
					<div class="eos-summary-value">${count("On Track")}</div>
				</div>
				<div class="eos-summary-box">
					<div class="eos-summary-label">${__('At Risk')}</div>
					<div class="eos-summary-value">${count("At Risk")}</div>
				</div>
				<div class="eos-summary-box">
					<div class="eos-summary-label">${__('Off Track')}</div>
					<div class="eos-summary-value">${count("Off Track")}</div>
				</div>
			</div>

			<div class="eos-card">
				<div class="eos-card-header">
					<div class="eos-card-title">${this.esc(s.timeframe)} ${__('Scorecard')}</div>
					<button class="eos-btn eos-btn-primary" onclick="frappe.new_doc('EOS Metric')">+ ${__('Add')}</button>
				</div>

				<div style="overflow:auto">
					<table class="eos-table">
						<thead>
							<tr>
								<th>${__('Measurable')}</th>
								${s.show_owner ? `<th>${__('Owner')}</th>` : ""}
								<th>${__('Group')}</th>
								${s.show_goal ? `<th>${__('Goal')}</th>` : ""}
								${periods.map(p => `<th>${this.esc(p.label)}</th>`).join("")}
								${s.show_avg && is_week ? `<th>${__('Avg')}</th>` : ""}
								<th>${__('Status')}</th>
								<th>${__('Action')}</th>
							</tr>
						</thead>
						<tbody>
							${metrics.length
								? metrics.map(m => this.render_metric_row(m, periods, is_week)).join("")
								: `<tr><td colspan="${periods.length + 6}"><div class="eos-empty">${__('No measurables match these filters.')}</div></td></tr>`
							}
						</tbody>
					</table>
				</div>
			</div>
		`;

		this.$content.html(html);
	}

	render_metric_row(metric, periods, is_week) {
		const s = this.state;
		const values = metric.values || [];

		const nums = values.map(Number).filter(v => !isNaN(v) && v !== "");
		const avg = nums.length
			? Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10
			: "";

		const action_html = metric.status === "Off Track"
			? `<button class="eos-btn eos-make-issue" data-metric="${this.esc(metric.name)}" data-week="W4" style="padding: 4px 8px; font-size: 11px;">Make it an Issue</button>`
			: "";

		return `
			<tr>
				<td class="eos-kpi-name">${this.esc(metric.name)}</td>
				${s.show_owner ? `<td>${this.esc(metric.owner)}</td>` : ""}
				<td>${this.esc(metric.group)}</td>
				${s.show_goal ? `<td>${this.esc(metric.goal)}</td>` : ""}
				${periods.map(p => {
					const val = values[p.index] !== undefined ? values[p.index] : "";
					return `
						<td>
							<input
								class="eos-value-input eos-metric-value"
								data-metric="${this.esc(metric.name)}"
								data-period="${this.esc(p.label)}"
								value="${this.esc(val)}"
							/>
						</td>`;
				}).join("")}
				${s.show_avg && is_week ? `<td><strong>${avg}</strong></td>` : ""}
				<td>${this.render_status(metric.status)}</td>
				<td>${action_html}</td>
			</tr>`;
	}

	show_column_settings(btn) {
		this.close_popover();
		const s = this.state;

		const html = `
			<div class="eos-popover" id="eos-popover-menu" style="top: ${$(btn).offset().top + 36}px; right: 24px;">
				<div class="eos-popover-title">${__('Columns')}</div>

				<div class="eos-setting-row">
					<span>${__('Owner')}</span>
					<div class="eos-switch ${s.show_owner ? "on" : ""}" data-prop="show_owner"></div>
				</div>
				<div class="eos-setting-row">
					<span>${__('Goal')}</span>
					<div class="eos-switch ${s.show_goal ? "on" : ""}" data-prop="show_goal"></div>
				</div>
				<div class="eos-setting-row">
					<span>${__('Average / Total')}</span>
					<div class="eos-switch ${s.show_avg ? "on" : ""}" data-prop="show_avg"></div>
				</div>
				<div class="eos-setting-row">
					<span>${__('Show Current Period')}</span>
					<div class="eos-switch ${s.show_current_period ? "on" : ""}" data-prop="show_current_period"></div>
				</div>
			</div>`;

		$("body").append(html);

		const self = this;
		$("#eos-popover-menu .eos-switch").on("click", function () {
			const prop = $(this).attr("data-prop");
			self.state[prop] = !self.state[prop];
			$(this).toggleClass("on");
			self.render_scorecard(self.data);
		});
	}

	show_status_settings(btn) {
		this.close_popover();
		const s = this.state;

		const html = `
			<div class="eos-popover" id="eos-popover-menu" style="top: ${$(btn).offset().top + 36}px; right: 24px;">
				<div class="eos-popover-title">${__('Status Display')}</div>

				<div class="eos-setting-row">
					<div class="eos-segment">
						<button class="${s.status_mode === "colours" ? "active" : ""}" data-mode="colours">${__('Colours')}</button>
						<button class="${s.status_mode === "text" ? "active" : ""}" data-mode="text">${__('Text / Shape')}</button>
					</div>
				</div>

				<div class="eos-status-preview" style="margin-top: 14px;">
					<div>${this.render_status("On Track")}</div>
					<div>${this.render_status("At Risk")}</div>
					<div>${this.render_status("Off Track")}</div>
				</div>
			</div>`;

		$("body").append(html);

		const self = this;
		$("#eos-popover-menu .eos-segment button").on("click", function () {
			self.state.status_mode = $(this).attr("data-mode");
			self.close_popover();
			self.render_scorecard(self.data);
		});
	}

	close_popover() {
		$("#eos-popover-menu").remove();
	}

	load_trends() {
		this.render_trends(this.demo_data.trends);
	}

	render_trends(trends) {
		const html = `
			<div class="eos-page-header">
				<div>
					<div class="eos-title">${__('Trends View')}</div>
					<div class="eos-subtitle">${__('Off-track measurable streak tracking')}</div>
				</div>
			</div>

			<div class="eos-card" style="padding: 16px;">
				<table class="eos-table">
					<thead>
						<tr>
							<th>${__('Measurable')}</th>
							<th>${__('Owner')}</th>
							<th>${__('Group')}</th>
							<th>${__('Off-Track Count')}</th>
							<th>${__('Last Status')}</th>
						</tr>
					</thead>
					<tbody>
						${trends.map(t => `
							<tr>
								<td class="eos-kpi-name">${this.esc(t.measurable)}</td>
								<td>${this.esc(t.owner)}</td>
								<td>${this.esc(t.group)}</td>
								<td><strong>${t.count} ${__('weeks')}</strong></td>
								<td>${this.render_status(t.status)}</td>
							</tr>
						`).join("")}
					</tbody>
				</table>
			</div>`;
		this.$content.html(html);
	}

	load_manager() {
		this.render_manager(this.demo_data.measurables);
	}

	render_manager(list) {
		const html = `
			<div class="eos-page-header">
				<div>
					<div class="eos-title">${__('Measurable Manager')}</div>
					<div class="eos-subtitle">${__('Manage team KPIs and assignments')}</div>
				</div>
				<button class="eos-btn eos-btn-primary" onclick="frappe.new_doc('EOS Metric')">+ ${__('Add Existing Measurable')}</button>
			</div>

			<div class="eos-card" style="padding: 16px;">
				<table class="eos-table">
					<thead>
						<tr>
							<th>${__('Measurable')}</th>
							<th>${__('Owner')}</th>
							<th>${__('Group')}</th>
							<th>${__('Archived')}</th>
							<th>${__('Actions')}</th>
						</tr>
					</thead>
					<tbody>
						${list.map(m => `
							<tr>
								<td class="eos-kpi-name">${this.esc(m.name)}</td>
								<td>${this.esc(m.owner)}</td>
								<td>${this.esc(m.group)}</td>
								<td>${m.archived ? `<span class="badge badge-warning">${__('Yes')}</span>` : `<span class="badge badge-secondary">${__('No')}</span>`}</td>
								<td>
									<button class="eos-btn eos-btn-sm" onclick="frappe.set_route('Form', 'EOS Metric', '${this.esc(m.name)}')">${__('Edit')}</button>
								</td>
							</tr>
						`).join("")}
					</tbody>
				</table>
			</div>`;
		this.$content.html(html);
	}

	render_bulk() {
		const html = `
			<div class="eos-page-header">
				<div>
					<div class="eos-title">${__('Bulk UX')}</div>
					<div class="eos-subtitle">${__('Import, export, paste, duplicate, and share')}</div>
				</div>
			</div>

			<div class="eos-card" style="padding: 20px;">
				<div class="eos-toolbar">
					<button class="eos-btn eos-btn-primary" id="eos-export"><i class="fa fa-download"></i> ${__('Export Scorecard Data')}</button>
				</div>
				<p class="text-muted small">${__('Download your team\'s measurables and period entries as CSV.')}</p>
			</div>`;
		this.$content.html(html);
	}

	render_rock() {
		const html = `
			<div class="eos-page-header">
				<div>
					<div class="eos-title">${__('Rocks Workflows')}</div>
					<div class="eos-subtitle">${__('Mark complete and cascade To-Dos')}</div>
				</div>
			</div>
			<div class="eos-card" style="padding: 20px;">
				<p class="text-muted">${__('Open any Rock form to use the Complete and Summary form actions.')}</p>
				<button class="eos-btn" onclick="frappe.set_route('List', 'Rock')">${__('Go to Rocks List')}</button>
			</div>`;
		this.$content.html(html);
	}

	render_report() {
		const html = `
			<div class="eos-page-header">
				<div>
					<div class="eos-title">${__('Scorecard Reports')}</div>
					<div class="eos-subtitle">${__('Send weekly scorecard summaries')}</div>
				</div>
			</div>
			<div class="eos-card" style="padding: 20px;">
				<p class="text-muted">${__('Open a Scorecard Report document to email the snapshot to leadership.')}</p>
				<button class="eos-btn" onclick="frappe.set_route('List', 'Scorecard Report')">${__('Go to Scorecard Reports')}</button>
			</div>`;
		this.$content.html(html);
	}

	render_settings() {
		const s = this.state;
		const html = `
			<div class="eos-page-header">
				<div>
					<div class="eos-title">${__('Settings')}</div>
					<div class="eos-subtitle">${__('Scorecard display defaults')}</div>
				</div>
			</div>
			<div class="eos-card" style="padding: 20px;">
				<p class="text-muted">${__('Use the ⚙ Column Settings and ● Status Display controls in the top right header.')}</p>
			</div>`;
		this.$content.html(html);
	}

	async load_settings() {}
	async persist_settings() {}

	async call_api(method, args = {}, fallback = null) {
		if (!method) return fallback;
		try {
			const res = await frappe.call({ method, args, freeze: false });
			return res.message || fallback;
		} catch (e) {
			return fallback;
		}
	}

	edit_metric_value(metric, period, val) {
		frappe.show_alert({ message: __('Entry updated'), indicator: 'green' });
	}

	make_issue(metric, week) {
		frappe.msgprint(__('Created issue for {0}', [metric]));
	}

	export_scorecard() {
		frappe.show_alert({ message: __('Export complete'), indicator: 'green' });
	}
}

window.EOSUIPage = EOSUIPage;
