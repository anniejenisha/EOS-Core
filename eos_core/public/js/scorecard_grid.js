frappe.pages["scorecard_grid"].on_page_load = function (wrapper) {
	new EOSUIPage(wrapper);
};

class EOSUIPage {

	constructor(wrapper) {
		this.wrapper = wrapper;
		this.page = frappe.ui.make_app_page({
			parent: wrapper,
			title: "EOS",
			single_column: true
		});

		this.state = {
			active_tab: "scorecard",
			timeframe: "Week",
			selected_team: "All Teams",
			selected_group: "All Groups",
			selected_status: "All Statuses",
			show_owner: true,
			show_goal: true,
			show_value: true,
			show_current_period: true,
			status_colors: true,
			selected_rows: [],
			selected_metric: null
		};

		/*
		 * Keep all server methods here.
		 *
		 * UI-1 / UI-3 / UI-4 method names were not explicitly specified
		 * in the TODO text you provided, so update these paths to the
		 * actual methods in your EOS Core application.
		 */
		this.API = {

			// UI-1
			scorecard_read: null,
			scorecard_write: null,

			// UI-2
			create_issue_from_metric: null,

			// UI-3
			get_rollup_view:
				"eos_core.eos_core.doctype.scorecard.scorecard.get_rollup_view",

			// UI-4
			trends_view: null,

			// UI-5
			get_scorecard_settings: null,
			update_scorecard_settings: null,

			// UI-6
			export_scorecard_data:
				"eos_core.eos_core.doctype.scorecard.scorecard.export_scorecard_data",

			// UI-7
			mark_rock_complete: null,
			get_rock_summary: null,
			send_report: null,

			// UI-8
			get_measurable_manager_list:
				"eos_core.api.get_measurable_manager_list",

			toggle_archive_measurable:
				"eos_core.api.toggle_archive_measurable",

			delete_measurable:
				"eos_core.api.delete_measurable",

			duplicate_measurable:
				"eos_core.api.duplicate_measurable"
		};

		this.demo_data = this.get_demo_data();

		this.make_css();
		this.make_html();
		this.bind_events();

		this.load_scorecard();
	}

	/* ============================================================
	 * DEMO DATA
	 * ============================================================ */

	get_demo_data() {

		return {

			periods: [
				"W1",
				"W2",
				"W3",
				"W4",
				"Current"
			],

			metrics: [

				{
					name: "Revenue Growth",
					owner: "John Smith",
					group: "Finance",
					goal: 100,
					values: [92, 95, 98, 102, 102],
					status: "On Track"
				},

				{
					name: "Customer Satisfaction",
					owner: "Sarah Lee",
					group: "Customer Success",
					goal: 90,
					values: [88, 90, 91, 93, 93],
					status: "On Track"
				},

				{
					name: "Product Adoption",
					owner: "Mike Chen",
					group: "Product",
					goal: 80,
					values: [70, 72, 76, 78, 78],
					status: "At Risk"
				},

				{
					name: "Operational Efficiency",
					owner: "Lisa Patel",
					group: "Operations",
					goal: 70,
					values: [60, 55, 55, 52, 52],
					status: "Off Track"
				},

				{
					name: "Team Engagement",
					owner: "David Kim",
					group: "People",
					goal: 85,
					values: [85, 88, 90, 92, 92],
					status: "On Track"
				}
			],

			trends: [

				{
					measurable: "Operational Efficiency",
					owner: "Lisa Patel",
					group: "Operations",
					count: 5,
					status: "Off Track"
				},

				{
					measurable: "Product Adoption",
					owner: "Mike Chen",
					group: "Product",
					count: 4,
					status: "At Risk"
				},

				{
					measurable: "Customer Satisfaction",
					owner: "Sarah Lee",
					group: "Customer Success",
					count: 3,
					status: "At Risk"
				},

				{
					measurable: "Revenue Growth",
					owner: "John Smith",
					group: "Finance",
					count: 3,
					status: "On Track"
				},

				{
					measurable: "Team Engagement",
					owner: "David Kim",
					group: "People",
					count: 2,
					status: "On Track"
				}
			],

			measurables: [

				{
					name: "Revenue Growth",
					owner: "John Smith",
					group: "Finance",
					archived: false
				},

				{
					name: "Customer Satisfaction",
					owner: "Sarah Lee",
					group: "Customer Success",
					archived: false
				},

				{
					name: "Product Adoption",
					owner: "Mike Chen",
					group: "Product",
					archived: true
				},

				{
					name: "Operational Efficiency",
					owner: "Lisa Patel",
					group: "Operations",
					archived: false
				},

				{
					name: "Team Engagement",
					owner: "David Kim",
					group: "People",
					archived: false
				}
			]
		};
	}


	/* ============================================================
	 * CSS
	 * ============================================================ */

	make_css() {

		if (document.getElementById("eos-ui-css")) {
			return;
		}

		const css = `
            <style id="eos-ui-css">

                .eos-ui {
                    background: #f7f8fa;
                    min-height: calc(100vh - 70px);
                    font-family: Inter, -apple-system, BlinkMacSystemFont,
                        "Segoe UI", sans-serif;
                }

                .eos-topbar {
                    height: 58px;
                    background: #12395b;
                    color: white;
                    display: flex;
                    align-items: center;
                    padding: 0 22px;
                    gap: 24px;
                }

                .eos-logo {
                    font-size: 20px;
                    font-weight: 700;
                    min-width: 90px;
                }

                .eos-search {
                    flex: 1;
                    max-width: 430px;
                    background: rgba(255,255,255,.14);
                    border: 1px solid rgba(255,255,255,.18);
                    border-radius: 7px;
                    padding: 9px 14px;
                    color: white;
                    outline: none;
                }

                .eos-search::placeholder {
                    color: rgba(255,255,255,.7);
                }

                .eos-user {
                    margin-left: auto;
                    font-size: 13px;
                }

                .eos-layout {
                    display: flex;
                    min-height: calc(100vh - 128px);
                }

                .eos-sidebar {
                    width: 210px;
                    background: white;
                    border-right: 1px solid #e6e9ed;
                    padding: 18px 10px;
                }

                .eos-nav-item {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 10px 13px;
                    margin-bottom: 4px;
                    border-radius: 7px;
                    cursor: pointer;
                    font-size: 13px;
                    color: #44515f;
                }

                .eos-nav-item:hover {
                    background: #f1f5f9;
                }

                .eos-nav-item.active {
                    background: #e8f1fb;
                    color: #1677ff;
                    font-weight: 600;
                }

                .eos-main {
                    flex: 1;
                    padding: 22px;
                    overflow-x: auto;
                }

                .eos-page-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 18px;
                }

                .eos-title {
                    font-size: 24px;
                    font-weight: 700;
                    color: #1f2937;
                }

                .eos-subtitle {
                    font-size: 12px;
                    color: #8a95a1;
                    margin-top: 3px;
                }

                .eos-btn {
                    border: 1px solid #d8dee5;
                    background: white;
                    color: #374151;
                    border-radius: 6px;
                    padding: 8px 14px;
                    cursor: pointer;
                    font-size: 12px;
                }

                .eos-btn:hover {
                    background: #f6f8fa;
                }

                .eos-btn-primary {
                    background: #1677ff;
                    color: white;
                    border-color: #1677ff;
                }

                .eos-btn-danger {
                    color: #dc3545;
                }

                .eos-btn-warning {
                    color: #b7791f;
                }

                .eos-btn + .eos-btn {
                    margin-left: 6px;
                }

                .eos-card {
                    background: white;
                    border: 1px solid #e5e9ee;
                    border-radius: 9px;
                    box-shadow: 0 1px 2px rgba(0,0,0,.03);
                    overflow: hidden;
                }

                .eos-card-header {
                    padding: 14px 16px;
                    border-bottom: 1px solid #e9edf1;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .eos-card-title {
                    font-weight: 600;
                    color: #273444;
                    font-size: 14px;
                }

                .eos-toolbar {
                    display: flex;
                    gap: 8px;
                    align-items: center;
                    flex-wrap: wrap;
                    margin-bottom: 14px;
                }

                .eos-select,
                .eos-input {
                    border: 1px solid #d8dee5;
                    background: white;
                    border-radius: 6px;
                    padding: 8px 10px;
                    font-size: 12px;
                    outline: none;
                    min-width: 120px;
                }

                .eos-tabs {
                    display: flex;
                    gap: 20px;
                    border-bottom: 1px solid #e5e9ee;
                    margin-bottom: 16px;
                }

                .eos-tab {
                    padding: 11px 4px;
                    font-size: 13px;
                    cursor: pointer;
                    color: #6b7280;
                    border-bottom: 2px solid transparent;
                }

                .eos-tab.active {
                    color: #1677ff;
                    border-bottom-color: #1677ff;
                    font-weight: 600;
                }

                .eos-table {
                    width: 100%;
                    border-collapse: collapse;
                }

                .eos-table th {
                    background: #fafbfc;
                    color: #687482;
                    font-size: 11px;
                    font-weight: 600;
                    text-align: left;
                    padding: 11px 12px;
                    border-bottom: 1px solid #e8ebef;
                    white-space: nowrap;
                }

                .eos-table td {
                    padding: 11px 12px;
                    border-bottom: 1px solid #edf0f2;
                    font-size: 12px;
                    color: #374151;
                }

                .eos-table tr:hover td {
                    background: #fafcff;
                }

                .eos-kpi-name {
                    font-weight: 600;
                    color: #1f2937;
                }

                .eos-value-input {
                    width: 70px;
                    padding: 5px 7px;
                    border: 1px solid #d8dee5;
                    border-radius: 5px;
                    text-align: right;
                }

                .eos-status {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 11px;
                }

                .eos-status-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    display: inline-block;
                }

                .status-green {
                    background: #20a464;
                }

                .status-yellow {
                    background: #e8a317;
                }

                .status-red {
                    background: #dc3545;
                }

                .status-gray {
                    background: #9ca3af;
                }

                .eos-summary {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 12px;
                    margin-bottom: 18px;
                }

                .eos-summary-box {
                    background: white;
                    border: 1px solid #e5e9ee;
                    border-radius: 8px;
                    padding: 15px;
                }

                .eos-summary-label {
                    font-size: 11px;
                    color: #7b8794;
                }

                .eos-summary-value {
                    font-size: 23px;
                    font-weight: 700;
                    margin-top: 5px;
                }

                .eos-settings-panel {
                    position: fixed;
                    right: 20px;
                    top: 120px;
                    width: 320px;
                    background: white;
                    border: 1px solid #dce2e8;
                    border-radius: 9px;
                    box-shadow: 0 10px 35px rgba(0,0,0,.12);
                    z-index: 1000;
                    padding: 18px;
                }

                .eos-setting-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 10px 0;
                    border-bottom: 1px solid #eef1f4;
                    font-size: 12px;
                }

                .eos-switch {
                    width: 36px;
                    height: 20px;
                    background: #cbd5e1;
                    border-radius: 20px;
                    position: relative;
                    cursor: pointer;
                }

                .eos-switch.on {
                    background: #1677ff;
                }

                .eos-switch:after {
                    content: "";
                    position: absolute;
                    top: 3px;
                    left: 3px;
                    width: 14px;
                    height: 14px;
                    border-radius: 50%;
                    background: white;
                    transition: .15s;
                }

                .eos-switch.on:after {
                    left: 19px;
                }

                .eos-action-menu {
                    display: flex;
                    gap: 4px;
                    flex-wrap: wrap;
                }

                .eos-mini-btn {
                    border: 1px solid #dce2e8;
                    background: white;
                    border-radius: 5px;
                    padding: 5px 8px;
                    font-size: 10px;
                    cursor: pointer;
                }

                .eos-mini-btn:hover {
                    background: #f5f8fb;
                }

                .eos-form-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 14px;
                    padding: 18px;
                }

                .eos-field {
                    display: flex;
                    flex-direction: column;
                    gap: 5px;
                }

                .eos-field.full {
                    grid-column: 1 / -1;
                }

                .eos-field label {
                    font-size: 11px;
                    font-weight: 600;
                    color: #657180;
                }

                .eos-field input,
                .eos-field select,
                .eos-field textarea {
                    border: 1px solid #d8dee5;
                    border-radius: 6px;
                    padding: 9px;
                    font-size: 12px;
                }

                .eos-dialog-actions {
                    padding: 14px 18px;
                    border-top: 1px solid #e8ebef;
                    display: flex;
                    justify-content: flex-end;
                }

                .eos-bulk-layout {
                    display: grid;
                    grid-template-columns: 1fr 280px;
                    gap: 16px;
                }

                .eos-bulk-action {
                    border: 1px solid #e4e8ed;
                    border-radius: 7px;
                    padding: 13px;
                    margin-bottom: 8px;
                    cursor: pointer;
                }

                .eos-bulk-action:hover {
                    background: #f8fafc;
                }

                .eos-bulk-action strong {
                    display: block;
                    font-size: 12px;
                }

                .eos-bulk-action span {
                    display: block;
                    margin-top: 4px;
                    color: #8993a0;
                    font-size: 10px;
                }

                .eos-paste-area {
                    width: 100%;
                    min-height: 160px;
                    border: 1px dashed #b9c4cf;
                    border-radius: 8px;
                    padding: 12px;
                    font-family: monospace;
                    resize: vertical;
                }

                .eos-rock-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr 1fr;
                    gap: 14px;
                }

                .eos-progress {
                    height: 7px;
                    background: #e8edf2;
                    border-radius: 10px;
                    overflow: hidden;
                    margin-top: 7px;
                }

                .eos-progress-bar {
                    height: 100%;
                    background: #1677ff;
                    border-radius: 10px;
                }

                .eos-empty {
                    text-align: center;
                    padding: 45px;
                    color: #8a95a1;
                    font-size: 13px;
                }

                @media(max-width: 1000px) {

                    .eos-sidebar {
                        width: 160px;
                    }

                    .eos-summary {
                        grid-template-columns: repeat(2, 1fr);
                    }

                    .eos-rock-grid,
                    .eos-bulk-layout {
                        grid-template-columns: 1fr;
                    }
                }

            </style>
        `;

		$("head").append(css);
	}


	/* ============================================================
	 * MAIN HTML
	 * ============================================================ */

	make_html() {

		$(this.wrapper).find(".layout-main-section").html(`

            <div class="eos-ui">

                <div class="eos-topbar">

                    <div class="eos-logo">
                        ◉ EOS
                    </div>

                    <input
                        class="eos-search"
                        placeholder="Search..."
                        id="eos-global-search"
                    >

                    <div class="eos-user">
                        Administrator ▾
                    </div>

                </div>

                <div class="eos-layout">

                    <aside class="eos-sidebar">

                        <div
                            class="eos-nav-item active"
                            data-tab="scorecard"
                        >
                            ▣ Scorecard
                        </div>

                        <div
                            class="eos-nav-item"
                            data-tab="trends"
                        >
                            ↗ Trends
                        </div>

                        <div
                            class="eos-nav-item"
                            data-tab="manager"
                        >
                            ◫ Measurable Manager
                        </div>

                        <div
                            class="eos-nav-item"
                            data-tab="bulk"
                        >
                            ⇅ Bulk UX
                        </div>

                        <div
                            class="eos-nav-item"
                            data-tab="rock"
                        >
                            ◉ Rocks
                        </div>

                        <div
                            class="eos-nav-item"
                            data-tab="report"
                        >
                            ▤ Scorecard Reports
                        </div>

                        <div
                            class="eos-nav-item"
                            data-tab="settings"
                        >
                            ⚙ Settings
                        </div>

                    </aside>

                    <main class="eos-main">

                        <div id="eos-content"></div>

                    </main>

                </div>

            </div>
        `);
	}


	/* ============================================================
	 * EVENTS
	 * ============================================================ */

	bind_events() {

		const self = this;

		$(this.wrapper).on(
			"click",
			".eos-nav-item",
			function () {

				const tab = $(this).attr("data-tab");

				self.state.active_tab = tab;

				$(".eos-nav-item").removeClass("active");
				$(this).addClass("active");

				self.render_tab(tab);
			}
		);

		$(this.wrapper).on(
			"change",
			"#eos-timeframe",
			function () {

				self.state.timeframe = $(this).val();

				self.load_scorecard();
			}
		);

		$(this.wrapper).on(
			"click",
			"#eos-column-settings",
			function () {

				self.show_column_settings();
			}
		);

		$(this.wrapper).on(
			"click",
			"#eos-status-settings",
			function () {

				self.show_status_settings();
			}
		);

		$(this.wrapper).on(
			"click",
			".eos-metric-value",
			function () {

				self.edit_metric_value(
					$(this).data("metric"),
					$(this).data("period")
				);
			}
		);

		$(this.wrapper).on(
			"click",
			".eos-make-issue",
			function () {

				self.make_issue(
					$(this).data("metric"),
					$(this).data("week")
				);
			}
		);

		$(this.wrapper).on(
			"click",
			"#eos-export",
			function () {

				self.export_scorecard();
			}
		);

		$(this.wrapper).on(
			"click",
			"#eos-bulk-paste",
			function () {

				self.bulk_paste();
			}
		);

		$(this.wrapper).on(
			"click",
			".eos-manager-action",
			function () {

				self.manager_action(
					$(this).data("action"),
					$(this).data("name")
				);
			}
		);

		$(this.wrapper).on(
			"click",
			"#eos-rock-complete",
			function () {

				self.mark_rock_complete();
			}
		);

		$(this.wrapper).on(
			"click",
			"#eos-rock-summary",
			function () {

				self.get_rock_summary();
			}
		);

		$(this.wrapper).on(
			"click",
			"#eos-send-report",
			function () {

				self.send_report();
			}
		);
	}


	/* ============================================================
	 * TAB RENDERER
	 * ============================================================ */

	render_tab(tab) {

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


	/* ============================================================
	 * UI-1 SCORECARD
	 * ============================================================ */

	async load_scorecard() {

		this.state.active_tab = "scorecard";

		const data = await this.call_api(
			this.API.scorecard_read,
			{
				team: this.state.selected_team,
				group: this.state.selected_group,
				status: this.state.selected_status
			},
			this.demo_data
		);

		this.render_scorecard(data);
	}


	render_scorecard(data) {

		const metrics = data.metrics || [];

		let periods = data.periods || [];

		if (this.state.timeframe !== "Week") {
			periods = this.get_rollup_periods();
		}

		let html = `

            <div class="eos-page-header">

                <div>
                    <div class="eos-title">
                        Scorecard
                    </div>

                    <div class="eos-subtitle">
                        Team measurable performance
                    </div>
                </div>

                <div>

                    <button
                        class="eos-btn"
                        id="eos-column-settings"
                    >
                        ⚙ Column Settings
                    </button>

                    <button
                        class="eos-btn"
                        id="eos-status-settings"
                    >
                        ● Status Display
                    </button>

                </div>

            </div>

            <div class="eos-tabs">

                <div
                    class="eos-tab active"
                    data-tab="scorecard"
                >
                    Scorecard
                </div>

                <div
                    class="eos-tab"
                    data-tab="trends"
                >
                    Trends
                </div>

            </div>

            <div class="eos-toolbar">

                <select
                    class="eos-select"
                    id="eos-team-filter"
                >
                    <option>All Teams</option>
                </select>

                <select
                    class="eos-select"
                    id="eos-group-filter"
                >
                    <option>All Groups</option>
                </select>

                <select
                    class="eos-select"
                    id="eos-status-filter"
                >
                    <option>All Statuses</option>
                    <option>On Track</option>
                    <option>At Risk</option>
                    <option>Off Track</option>
                </select>

                <select
                    class="eos-select"
                    id="eos-timeframe"
                >
                    <option ${this.state.timeframe === "Week" ? "selected" : ""}>
                        Week
                    </option>

                    <option ${this.state.timeframe === "Month" ? "selected" : ""}>
                        Month
                    </option>

                    <option ${this.state.timeframe === "Quarter" ? "selected" : ""}>
                        Quarter
                    </option>

                    <option ${this.state.timeframe === "Year" ? "selected" : ""}>
                        Year
                    </option>
                </select>

            </div>

            <div class="eos-summary">

                <div class="eos-summary-box">
                    <div class="eos-summary-label">
                        Measurables
                    </div>
                    <div class="eos-summary-value">
                        ${metrics.length}
                    </div>
                </div>

                <div class="eos-summary-box">
                    <div class="eos-summary-label">
                        On Track
                    </div>
                    <div class="eos-summary-value">
                        ${metrics.filter(x => x.status === "On Track").length}
                    </div>
                </div>

                <div class="eos-summary-box">
                    <div class="eos-summary-label">
                        At Risk
                    </div>
                    <div class="eos-summary-value">
                        ${metrics.filter(x => x.status === "At Risk").length}
                    </div>
                </div>

                <div class="eos-summary-box">
                    <div class="eos-summary-label">
                        Off Track
                    </div>
                    <div class="eos-summary-value">
                        ${metrics.filter(x => x.status === "Off Track").length}
                    </div>
                </div>

            </div>

            <div class="eos-card">

                <div class="eos-card-header">

                    <div class="eos-card-title">
                        ${this.state.timeframe} Scorecard
                    </div>

                    <button
                        class="eos-btn eos-btn-primary"
                        onclick="frappe.new_doc('EOS Metric')"
                    >
                        + Add
                    </button>

                </div>

                <div style="overflow:auto">

                    <table class="eos-table">

                        <thead>

                            <tr>

                                <th>Measurable</th>

                                ${this.state.show_owner
				? "<th>Owner</th>"
				: ""
			}

                                <th>Group</th>

                                ${this.state.show_goal
				? "<th>Goal</th>"
				: ""
			}

                                ${this.state.show_value
				? periods.map(
					p => `<th>${p}</th>`
				).join("")
				: ""
			}

                                <th>Status</th>

                                <th>Action</th>

                            </tr>

                        </thead>

                        <tbody>

                            ${metrics.map(
				metric => this.render_metric_row(
					metric,
					periods
				)
			).join("")}

                        </tbody>

                    </table>

                </div>

            </div>
        `;

		$("#eos-content").html(html);
	}


	render_metric_row(metric, periods) {

		const status_class = this.get_status_class(
			metric.status
		);

		let values = metric.values || [];

		return `

            <tr>

                <td>
                    <span class="eos-kpi-name">
                        ${frappe.utils.escape_html(metric.name)}
                    </span>
                </td>

                ${this.state.show_owner
				? `<td>${frappe.utils.escape_html(metric.owner)}</td>`
				: ""
			}

                <td>
                    ${frappe.utils.escape_html(metric.group)}
                </td>

                ${this.state.show_goal
				? `<td>${metric.goal}</td>`
				: ""
			}

                ${this.state.show_value
				? periods.map(
					(period, index) => {

						const value =
							values[index] !== undefined
								? values[index]
								: "";

						return `
                                <td>

                                    ${this.state.timeframe === "Week"
								? `
                                                <input
                                                    class="eos-value-input eos-metric-value"
                                                    value="${value}"
                                                    data-metric="${frappe.utils.escape_html(metric.name)}"
                                                    data-period="${period}"
                                                >
                                            `
								: `<span>${value}</span>`
							}

                                </td>
                            `;
					}
				).join("")
				: ""
			}

                <td>

                    <span class="eos-status">

                        <span
                            class="eos-status-dot ${status_class}"
                        ></span>

                        ${metric.status}

                    </span>

                </td>

                <td>

                    ${metric.status === "Off Track"
				? `
                                <button
                                    class="eos-mini-btn eos-make-issue"
                                    data-metric="${frappe.utils.escape_html(metric.name)}"
                                    data-week="${periods[periods.length - 1]}"
                                >
                                    Make it an Issue
                                </button>
                            `
				: ""
			}

                </td>

            </tr>
        `;
	}


	/* ============================================================
	 * UI-2 MAKE IT AN ISSUE
	 * ============================================================ */

	async make_issue(metric, week) {

		frappe.confirm(
			`Create an Issue from <b>${metric}</b> for ${week}?`,
			async () => {

				const result = await this.call_api(
					this.API.create_issue_from_metric,
					{
						metric: metric,
						week_start_date: week
					}
				);

				if (result) {

					frappe.show_alert({
						message: "Issue created successfully",
						indicator: "green"
					});

					this.load_scorecard();
				}
			}
		);
	}


	/* ============================================================
	 * UI-3 ROLLUP
	 * ============================================================ */

	get_rollup_periods() {

		if (this.state.timeframe === "Month") {
			return ["Oct"];
		}

		if (this.state.timeframe === "Quarter") {
			return ["Q4 2026"];
		}

		if (this.state.timeframe === "Year") {
			return ["2026"];
		}

		return ["W1", "W2", "W3", "W4"];
	}


	/* ============================================================
	 * UI-4 TRENDS
	 * ============================================================ */

	async load_trends() {

		const data = await this.call_api(
			this.API.trends_view,
			{
				threshold: 3
			},
			this.demo_data
		);

		const rows = data.trends || [];

		$("#eos-content").html(`

            <div class="eos-page-header">

                <div>
                    <div class="eos-title">
                        Trends
                    </div>

                    <div class="eos-subtitle">
                        Measurables trending off track
                    </div>
                </div>

            </div>

            <div class="eos-toolbar">

                <select
                    class="eos-select"
                    id="eos-trend-threshold"
                >
                    <option>3</option>
                    <option>4</option>
                    <option>5</option>
                </select>

                <select class="eos-select">
                    <option>All Groups</option>
                </select>

                <select class="eos-select">
                    <option>All Statuses</option>
                    <option>Off Track</option>
                    <option>At Risk</option>
                </select>

                <button class="eos-btn eos-btn-primary">
                    Apply
                </button>

            </div>

            <div class="eos-card">

                <table class="eos-table">

                    <thead>

                        <tr>
                            <th>Measurable</th>
                            <th>Owner</th>
                            <th>Group</th>
                            <th>Trailing Off Track</th>
                            <th>Last Status</th>
                            <th>Indicator</th>
                        </tr>

                    </thead>

                    <tbody>

                        ${rows.length
				? rows.map(row => `
                                    <tr>

                                        <td class="eos-kpi-name">
                                            ${row.measurable}
                                        </td>

                                        <td>
                                            ${row.owner}
                                        </td>

                                        <td>
                                            ${row.group}
                                        </td>

                                        <td>
                                            <strong>
                                                ${row.count}
                                            </strong>
                                        </td>

                                        <td>
                                            ${row.status}
                                        </td>

                                        <td>
                                            <span
                                                class="eos-status-dot
                                                ${this.get_status_class(row.status)}"
                                            ></span>
                                        </td>

                                    </tr>
                                `).join("")
				: `
                                    <tr>
                                        <td colspan="6">
                                            <div class="eos-empty">
                                                Nothing is trending.
                                            </div>
                                        </td>
                                    </tr>
                                `
			}

                    </tbody>

                </table>

            </div>
        `);
	}


	/* ============================================================
	 * UI-5 COLUMN SETTINGS
	 * ============================================================ */

	show_column_settings() {

		$("#eos-column-settings-panel").remove();

		const html = `

            <div
                class="eos-settings-panel"
                id="eos-column-settings-panel"
            >

                <div style="font-weight:700;margin-bottom:12px">
                    Column Settings
                </div>

                ${this.setting_switch(
			"Owner",
			"show_owner"
		)}

                ${this.setting_switch(
			"Goal",
			"show_goal"
		)}

                ${this.setting_switch(
			"Average / Total",
			"show_value"
		)}

                ${this.setting_switch(
			"Show Current Period",
			"show_current_period"
		)}

                <div class="eos-setting-row">

                    <span>
                        Default Timeframe
                    </span>

                    <select
                        class="eos-select"
                        id="eos-default-timeframe"
                    >

                        <option>Week</option>
                        <option>Month</option>
                        <option>Quarter</option>
                        <option>Year</option>

                    </select>

                </div>

                <div style="margin-top:14px">

                    <span style="font-size:10px;color:#7b8794">
                        Company Default / Team Override
                    </span>

                    <button
                        class="eos-btn"
                        style="width:100%;margin-top:7px"
                    >
                        Reset to Default
                    </button>

                </div>

            </div>
        `;

		$("body").append(html);

		$(".eos-switch").on("click", function () {

			const key = $(this).data("key");

			$(this).toggleClass("on");

			this.state[key] = $(this).hasClass("on");
		}.bind(this));

		$(document).on(
			"click.eossettings",
			function (event) {

				if (
					!$(event.target).closest(
						"#eos-column-settings-panel, #eos-column-settings"
					).length
				) {
					$("#eos-column-settings-panel").remove();

					$(document).off(
						"click.eossettings"
					);
				}
			}
		);
	}


	setting_switch(label, key) {

		return `

            <div class="eos-setting-row">

                <span>
                    ${label}
                </span>

                <div
                    class="eos-switch ${this.state[key] ? "on" : ""}"
                    data-key="${key}"
                ></div>

            </div>
        `;
	}


	show_status_settings() {

		frappe.msgprint({

			title: "Status Display",

			message: `

                <div>

                    <p>
                        Choose how Scorecard status is displayed.
                    </p>

                    <label>
                        <input
                            type="radio"
                            name="eos-status-mode"
                            checked
                        >
                        Colours
                    </label>

                    <br>

                    <label>
                        <input
                            type="radio"
                            name="eos-status-mode"
                        >
                        Text / Shape
                    </label>

                </div>

            `

		});
	}


	/* ============================================================
	 * UI-6 BULK UX
	 * ============================================================ */

	render_bulk() {

		$("#eos-content").html(`

            <div class="eos-page-header">

                <div>
                    <div class="eos-title">
                        Bulk UX
                    </div>

                    <div class="eos-subtitle">
                        Import, export and bulk operations
                    </div>
                </div>

            </div>

            <div class="eos-tabs">

                <div class="eos-tab active">
                    Export
                </div>

                <div class="eos-tab">
                    Import
                </div>

                <div class="eos-tab">
                    Bulk Paste
                </div>

                <div class="eos-tab">
                    Actions
                </div>

            </div>

            <div class="eos-bulk-layout">

                <div class="eos-card">

                    <div class="eos-card-header">

                        <div class="eos-card-title">
                            Export Scorecard Data
                        </div>

                    </div>

                    <div style="padding:18px">

                        <p style="font-size:12px;color:#7b8794">
                            Download your team's measurables and period data.
                        </p>

                        <div class="eos-field">

                            <label>
                                File Type
                            </label>

                            <select
                                class="eos-select"
                                id="eos-export-type"
                            >
                                <option value="xlsx">
                                    XLSX
                                </option>

                                <option value="csv">
                                    CSV
                                </option>
                            </select>

                        </div>

                        <br>

                        <button
                            class="eos-btn eos-btn-primary"
                            id="eos-export"
                        >
                            Export
                        </button>

                    </div>

                </div>

                <div>

                    <div
                        class="eos-bulk-action"
                        id="eos-import"
                    >
                        <strong>
                            ⇧ Import
                        </strong>

                        <span>
                            Upload a file to add or update records
                        </span>
                    </div>

                    <div
                        class="eos-bulk-action"
                        id="eos-bulk-paste"
                    >
                        <strong>
                            ▦ Bulk Paste
                        </strong>

                        <span>
                            Paste spreadsheet values
                        </span>
                    </div>

                    <div
                        class="eos-bulk-action"
                        id="eos-bulk-archive"
                    >
                        <strong>
                            Archive
                        </strong>

                        <span>
                            Archive selected measurables
                        </span>
                    </div>

                    <div
                        class="eos-bulk-action"
                        id="eos-bulk-duplicate"
                    >
                        <strong>
                            Duplicate
                        </strong>

                        <span>
                            Create copies of selected measurables
                        </span>
                    </div>

                    <div
                        class="eos-bulk-action"
                        id="eos-bulk-share"
                    >
                        <strong>
                            Share
                        </strong>

                        <span>
                            Share selected measurables
                        </span>
                    </div>

                </div>

            </div>
        `);

		$("#eos-import").on("click", () => {
			frappe.set_route("List", "Data Import");
		});

		$("#eos-bulk-archive").on("click", () => {
			frappe.msgprint("Select measurables and use the Archive action.");
		});

		$("#eos-bulk-duplicate").on("click", () => {
			frappe.msgprint("Select measurables and use the Duplicate action.");
		});

		$("#eos-bulk-share").on("click", () => {
			frappe.msgprint("Share requires the appropriate permission.");
		});
	}


	async bulk_paste() {

		const dialog = new frappe.ui.Dialog({

			title: "Bulk Paste",

			fields: [

				{
					fieldname: "paste_data",
					fieldtype: "Long Text",
					label: "Paste spreadsheet data",
					reqd: 1
				}

			],

			primary_action_label: "Process Paste",

			primary_action: async (values) => {

				const rows =
					this.parse_tab_data(
						values.paste_data
					);

				for (const row of rows) {

					for (const cell of row) {

						if (!cell) {
							continue;
						}

						/*
						 * Every cell should use the
						 * same UI-1.2 write method.
						 */
						await this.call_api(
							this.API.scorecard_write,
							{
								value: cell
							}
						);
					}
				}

				dialog.hide();

				frappe.show_alert({
					message: "Bulk paste processed",
					indicator: "green"
				});
			}

		});

		dialog.show();
	}


	parse_tab_data(value) {

		return value
			.split("\n")
			.map(row => row.split("\t"));
	}


	async export_scorecard() {

		const file_type =
			$("#eos-export-type").val();

		const result = await this.call_api(
			this.API.export_scorecard_data,
			{
				file_type: file_type
			}
		);

		if (result) {

			frappe.show_alert({
				message: "Export request completed",
				indicator: "green"
			});

			/*
			 * If your backend returns a file URL,
			 * open it here.
			 */
			if (result.file_url) {
				window.open(
					result.file_url,
					"_blank"
				);
			}
		}
	}


	/* ============================================================
	 * UI-7 ROCK
	 * ============================================================ */

	render_rock() {

		$("#eos-content").html(`

            <div class="eos-page-header">

                <div>
                    <div class="eos-title">
                        Rock Form
                    </div>

                    <div class="eos-subtitle">
                        Increase Customer Base
                    </div>
                </div>

            </div>

            <div class="eos-rock-grid">

                <div class="eos-card">

                    <div class="eos-card-header">
                        <div class="eos-card-title">
                            Rock
                        </div>
                    </div>

                    <div style="padding:18px">

                        <div class="eos-field">
                            <label>Name</label>
                            <input
                                value="Increase Customer Base"
                            >
                        </div>

                        <br>

                        <div class="eos-field">
                            <label>Owner</label>
                            <input
                                value="Sarah Lee"
                            >
                        </div>

                        <br>

                        <div class="eos-field">
                            <label>Status</label>
                            <input
                                value="In Progress"
                                readonly
                            >
                        </div>

                        <br>

                        <div>
                            <label style="font-size:11px">
                                Milestones
                            </label>

                            <div class="eos-progress">
                                <div
                                    class="eos-progress-bar"
                                    style="width:50%"
                                ></div>
                            </div>

                            <div
                                style="
                                    font-size:10px;
                                    color:#7b8794;
                                    margin-top:5px
                                "
                            >
                                2 / 4 (50%)
                            </div>
                        </div>

                        <br>

                        <button
                            class="eos-btn eos-btn-primary"
                            id="eos-rock-complete"
                        >
                            Complete
                        </button>

                        <button
                            class="eos-btn"
                            id="eos-rock-summary"
                        >
                            Rock Summary
                        </button>

                    </div>

                </div>

                <div class="eos-card">

                    <div class="eos-card-header">
                        <div class="eos-card-title">
                            Milestones
                        </div>
                    </div>

                    <div style="padding:18px">

                        <p>
                            <span class="eos-status-dot status-green"></span>
                            Completed
                        </p>

                        <p>
                            <span class="eos-status-dot status-yellow"></span>
                            In Progress
                        </p>

                        <p>
                            <span class="eos-status-dot status-gray"></span>
                            Not Started
                        </p>

                    </div>

                </div>

                <div class="eos-card">

                    <div class="eos-card-header">
                        <div class="eos-card-title">
                            To-Dos
                        </div>
                    </div>

                    <div style="padding:18px">

                        <p>
                            Open
                            <strong>3</strong>
                        </p>

                        <p>
                            In Progress
                            <strong>1</strong>
                        </p>

                        <p>
                            Done
                            <strong>2</strong>
                        </p>

                    </div>

                </div>

            </div>
        `);
	}


	async mark_rock_complete() {

		frappe.confirm(
			"Are you sure you want to complete this Rock?",
			async () => {

				const result = await this.call_api(
					this.API.mark_rock_complete,
					{}
				);

				if (result) {

					frappe.show_alert({
						message: "Rock completed",
						indicator: "green"
					});
				}
			}
		);
	}


	async get_rock_summary() {

		const result = await this.call_api(
			this.API.get_rock_summary,
			{},
			{
				progress: 50,
				milestone_completed: 2,
				milestone_total: 4,
				todos: {
					open: 3,
					in_progress: 1,
					done: 2
				}
			}
		);

		frappe.msgprint({

			title: "Rock Summary",

			message: `

                <div>

                    <strong>Progress</strong>

                    <div class="eos-progress">
                        <div
                            class="eos-progress-bar"
                            style="width:${result.progress}%"
                        ></div>
                    </div>

                    <p style="margin-top:15px">
                        Milestones:
                        ${result.milestone_completed}
                        /
                        ${result.milestone_total}
                    </p>

                    <p>
                        Open To-Dos:
                        ${result.todos.open}
                    </p>

                    <p>
                        In Progress:
                        ${result.todos.in_progress}
                    </p>

                    <p>
                        Done:
                        ${result.todos.done}
                    </p>

                </div>

            `

		});
	}


	/* ============================================================
	 * UI-7 SCORECARD REPORT
	 * ============================================================ */

	render_report() {

		$("#eos-content").html(`

            <div class="eos-page-header">

                <div>

                    <div class="eos-title">
                        Scorecard Report
                    </div>

                    <div class="eos-subtitle">
                        Weekly Scorecard Report
                    </div>

                </div>

                <button
                    class="eos-btn eos-btn-primary"
                    id="eos-send-report"
                >
                    Send Report
                </button>

            </div>

            <div class="eos-card">

                <div class="eos-form-grid">

                    <div class="eos-field">

                        <label>
                            Name
                        </label>

                        <input
                            value="Weekly Scorecard Report"
                        >

                    </div>

                    <div class="eos-field">

                        <label>
                            Period
                        </label>

                        <input
                            value="Q4 2026"
                        >

                    </div>

                    <div class="eos-field">

                        <label>
                            Recipients
                        </label>

                        <input
                            value="team@company.com"
                        >

                    </div>

                    <div class="eos-field">

                        <label>
                            Status
                        </label>

                        <input
                            value="Draft"
                            readonly
                        >

                    </div>

                </div>

            </div>
        `);
	}


	async send_report() {

		frappe.confirm(
			"Send this weekly Scorecard Report?",
			async () => {

				const result = await this.call_api(
					this.API.send_report,
					{}
				);

				if (result) {

					frappe.show_alert({
						message: "Scorecard Report sent",
						indicator: "green"
					});
				}
			}
		);
	}


	/* ============================================================
	 * UI-8 MEASURABLE MANAGER
	 * ============================================================ */

	async load_manager() {

		const result = await this.call_api(
			this.API.get_measurable_manager_list,
			{},
			{
				measurables:
					this.demo_data.measurables
			}
		);

		const rows =
			result.measurables ||
			result.data ||
			[];

		$("#eos-content").html(`

            <div class="eos-page-header">

                <div>

                    <div class="eos-title">
                        Measurable Manager
                    </div>

                    <div class="eos-subtitle">
                        Manage team measurables
                    </div>

                </div>

                <button
                    class="eos-btn eos-btn-primary"
                    onclick="frappe.new_doc('EOS Metric')"
                >
                    + Add Existing Measurable
                </button>

            </div>

            <div class="eos-card">

                <table class="eos-table">

                    <thead>

                        <tr>

                            <th>
                                Measurable
                            </th>

                            <th>
                                Owner
                            </th>

                            <th>
                                Group
                            </th>

                            <th>
                                Archived
                            </th>

                            <th>
                                Actions
                            </th>

                        </tr>

                    </thead>

                    <tbody>

                        ${rows.map(row => `

                                <tr>

                                    <td class="eos-kpi-name">
                                        ${row.name}
                                    </td>

                                    <td>
                                        ${row.owner}
                                    </td>

                                    <td>
                                        ${row.group}
                                    </td>

                                    <td>
                                        ${row.archived ? "Yes" : "No"}
                                    </td>

                                    <td>

                                        <div class="eos-action-menu">

                                            <button
                                                class="eos-mini-btn eos-manager-action"
                                                data-action="duplicate"
                                                data-name="${row.name}"
                                            >
                                                Duplicate
                                            </button>

                                            <button
                                                class="eos-mini-btn eos-manager-action"
                                                data-action="archive"
                                                data-name="${row.name}"
                                            >
                                                Archive
                                            </button>

                                            <button
                                                class="eos-mini-btn eos-manager-action"
                                                data-action="delete"
                                                data-name="${row.name}"
                                            >
                                                Delete
                                            </button>

                                        </div>

                                    </td>

                                </tr>

                            `).join("")
			}

                    </tbody>

                </table>

            </div>
        `);
	}


	async manager_action(action, name) {

		let method = null;

		let message = "";

		if (action === "archive") {

			method =
				this.API.toggle_archive_measurable;

			message =
				`Archive ${name}?`;
		}

		if (action === "delete") {

			method =
				this.API.delete_measurable;

			message =
				`Delete ${name}?`;
		}

		if (action === "duplicate") {

			method =
				this.API.duplicate_measurable;

			message =
				`Duplicate ${name}?`;
		}

		frappe.confirm(
			message,
			async () => {

				const result =
					await this.call_api(
						method,
						{
							name: name
						}
					);

				if (result) {

					frappe.show_alert({
						message:
							`${action} completed`,
						indicator: "green"
					});

					this.load_manager();
				}
			}
		);
	}


	/* ============================================================
	 * SETTINGS
	 * ============================================================ */

	render_settings() {

		$("#eos-content").html(`

            <div class="eos-page-header">

                <div>

                    <div class="eos-title">
                        Scorecard Settings
                    </div>

                    <div class="eos-subtitle">
                        Company defaults and team overrides
                    </div>

                </div>

            </div>

            <div class="eos-card">

                <div class="eos-form-grid">

                    <div class="eos-field">

                        <label>
                            Default Timeframe
                        </label>

                        <select>
                            <option>Week</option>
                            <option>Month</option>
                            <option>Quarter</option>
                            <option>Year</option>
                        </select>

                    </div>

                    <div class="eos-field">

                        <label>
                            Team
                        </label>

                        <select>
                            <option>All Teams</option>
                        </select>

                    </div>

                    <div class="eos-field">

                        <label>
                            Status Display
                        </label>

                        <select>
                            <option>Colours</option>
                            <option>Text / Shape</option>
                        </select>

                    </div>

                    <div class="eos-field">

                        <label>
                            Current Period
                        </label>

                        <select>
                            <option>Show</option>
                            <option>Hide</option>
                        </select>

                    </div>

                </div>

                <div class="eos-dialog-actions">

                    <button class="eos-btn">
                        Reset to Default
                    </button>

                    <button
                        class="eos-btn eos-btn-primary"
                    >
                        Save Settings
                    </button>

                </div>

            </div>
        `);
	}


	/* ============================================================
	 * SCORECARD VALUE EDIT
	 * ============================================================ */

	async edit_metric_value(metric, period) {

		const input =
			$(
				`.eos-metric-value[data-metric="${metric}"][data-period="${period}"]`
			);

		const value = input.val();

		await this.call_api(
			this.API.scorecard_write,
			{
				metric: metric,
				period: period,
				value: value
			}
		);

		frappe.show_alert({
			message: `${metric} updated`,
			indicator: "green"
		});
	}


	/* ============================================================
	 * COMMON API HANDLER
	 * ============================================================ */

	async call_api(method, args = {}, fallback = null) {

		/*
		 * If the actual method is not configured,
		 * use demo data.
		 *
		 * This lets the page UI be developed before
		 * all backend methods are connected.
		 */

		if (!method) {

			return fallback;
		}

		try {

			const response =
				await frappe.call({

					method: method,

					args: args,

					freeze: false

				});

			return response.message;

		} catch (error) {

			console.error(
				"EOS API Error:",
				method,
				error
			);

			frappe.msgprint({

				title: "EOS Error",

				message:
					error.message ||
					"Unable to complete the operation.",

				indicator: "red"

			});

			return null;
		}
	}


	/* ============================================================
	 * STATUS HELPER
	 * ============================================================ */

	get_status_class(status) {

		switch (status) {

			case "On Track":
				return "status-green";

			case "At Risk":
				return "status-yellow";

			case "Off Track":
				return "status-red";

			default:
				return "status-gray";
		}
	}
}