frappe.provide('frappe.eos_core');

frappe.eos_core.ScorecardGridPage = class {
	constructor(wrapper) {
		this.wrapper = $(wrapper);
		this.page = frappe.ui.make_app_page({
			parent: wrapper,
			title: __('Scorecard Grid'),
			single_column: true
		});
		this.current_view = 'grid'; // 'grid' | 'trends'
		this.current_scorecard = null;
		this.trends_data = null;
		this.make();
	}

	make() {
		this.render_header();
		this.render_containers();
		this.bind_events();
		this.load_scorecards();
	}

	render_header() {
		let me = this;
		let $header = $(`
			<div class="scorecard-header-bar">
				<div class="scorecard-controls">
					<div class="form-group mb-0" style="min-width: 250px;">
						<select id="scorecard-select" class="form-control input-sm">
							<option value="">${__('Select Scorecard...')}</option>
						</select>
					</div>
					<div class="btn-group view-switcher" role="group">
						<button type="button" class="btn btn-default btn-sm active" data-view="grid">${__('Scorecard Grid')}</button>
						<button type="button" class="btn btn-default btn-sm" data-view="trends">${__('Trends View')}</button>
					</div>
				</div>
			</div>
		`);
		$(this.page.body).append($header);
	}

	render_containers() {
		let $body = $(`
			<div class="scorecard-grid-container">
				<div id="grid-view-container" class="view-panel">
					<div class="empty-state-card">
						<h4>${__('Scorecard Grid')}</h4>
						<p class="text-muted">${__('Select a scorecard above to view period grid data.')}</p>
					</div>
				</div>
				<div id="trends-view-container" class="view-panel" style="display: none;">
					<div class="trends-filter-bar">
						<div class="trends-filter-item">
							<label for="trends-threshold-input" class="mb-0 font-weight-bold">${__('Trailing Off-Track Threshold:')}</label>
							<input type="number" id="trends-threshold-input" class="form-control input-sm" value="3" min="1" max="52" style="width: 80px;">
						</div>
						<div class="trends-filter-item">
							<label for="trends-group-select" class="mb-0 font-weight-bold">${__('Group:')}</label>
							<select id="trends-group-select" class="form-control input-sm" style="min-width: 140px;">
								<option value="">${__('All Groups')}</option>
							</select>
						</div>
						<div class="trends-filter-item">
							<label for="trends-status-select" class="mb-0 font-weight-bold">${__('Last Status:')}</label>
							<select id="trends-status-select" class="form-control input-sm" style="min-width: 140px;">
								<option value="">${__('All Statuses')}</option>
								<option value="Off Track">${__('Off Track')}</option>
								<option value="On Track">${__('On Track')}</option>
							</select>
						</div>
						<div class="trends-filter-item">
							<button id="trends-refresh-btn" class="btn btn-primary btn-sm">${__('Apply Filters')}</button>
						</div>
					</div>

					<div class="trends-summary-card" id="trends-summary-panel">
						<div class="trends-stat-box">
							<div class="trends-stat-title">${__('Total Evaluated')}</div>
							<div class="trends-stat-value" id="stat-total">0</div>
						</div>
						<div class="trends-stat-box">
							<div class="trends-stat-title">${__('Trending Off Track')}</div>
							<div class="trends-stat-value text-danger" id="stat-trending">0</div>
						</div>
						<div class="trends-stat-box">
							<div class="trends-stat-title">${__('On Track')}</div>
							<div class="trends-stat-value text-success" id="stat-ontrack">0</div>
						</div>
					</div>

					<div id="trends-content-area">
						<div class="empty-state-card">
							<h4>${__('Trends View')}</h4>
							<p class="text-muted">${__('Select a scorecard to evaluate off-track trends.')}</p>
						</div>
					</div>
				</div>
			</div>
		`);
		$(this.page.body).append($body);
	}

	bind_events() {
		let me = this;
		this.wrapper.find('.view-switcher button').on('click', function() {
			let view = $(this).attr('data-view');
			me.switch_view(view);
		});

		this.wrapper.find('#scorecard-select').on('change', function() {
			me.current_scorecard = $(this).val();
			me.load_current_view();
		});

		this.wrapper.find('#trends-refresh-btn').on('click', function() {
			if (me.current_scorecard) {
				me.fetch_trends();
			}
		});

		this.wrapper.find('#trends-group-select, #trends-status-select').on('change', function() {
			if (me.trends_data) {
				me.render_trends_table();
			}
		});
	}

	switch_view(view) {
		this.current_view = view;
		this.wrapper.find('.view-switcher button').removeClass('active');
		this.wrapper.find(`.view-switcher button[data-view="${view}"]`).addClass('active');

		if (view === 'grid') {
			this.wrapper.find('#grid-view-container').show();
			this.wrapper.find('#trends-view-container').hide();
		} else {
			this.wrapper.find('#grid-view-container').hide();
			this.wrapper.find('#trends-view-container').show();
			if (this.current_scorecard) {
				this.fetch_trends();
			}
		}
	}

	load_scorecards() {
		let me = this;
		frappe.call({
			method: 'frappe.client.get_list',
			args: {
				doctype: 'Scorecard',
				fields: ['name', 'title', 'team', 'timeframe'],
				order_by: 'title asc'
			},
			callback: function(r) {
				let $select = me.wrapper.find('#scorecard-select');
				$select.empty();
				$select.append(`<option value="">${__('Select Scorecard...')}</option>`);

				if (r.message && r.message.length > 0) {
					r.message.forEach(sc => {
						let label = sc.title || sc.name;
						if (sc.team) label += ` (${sc.team})`;
						$select.append(`<option value="${sc.name}">${label}</option>`);
					});
					me.current_scorecard = r.message[0].name;
					$select.val(me.current_scorecard);
					me.load_current_view();
				}
			}
		});
	}

	load_current_view() {
		if (this.current_view === 'trends') {
			this.fetch_trends();
		}
	}

	fetch_trends() {
		let me = this;
		if (!this.current_scorecard) return;

		let threshold = parseInt(this.wrapper.find('#trends-threshold-input').val()) || 3;

		frappe.call({
			method: 'eos_core.eos_core.doctype.scorecard.scorecard.get_scorecard_trends',
			args: {
				scorecard: me.current_scorecard,
				threshold: threshold
			},
			callback: function(r) {
				if (r.message) {
					me.trends_data = r.message;
					me.populate_group_filter();
					me.render_trends_table();
				}
			},
			error: function() {
				me.render_trends_empty_state(__('Unable to load trends data or access denied for this scorecard.'));
			}
		});
	}

	populate_group_filter() {
		let $group_select = this.wrapper.find('#trends-group-select');
		let current_val = $group_select.val();
		$group_select.empty();
		$group_select.append(`<option value="">${__('All Groups')}</option>`);

		if (this.trends_data && this.trends_data.metrics) {
			let groups = new Set();
			this.trends_data.metrics.forEach(m => {
				if (m.group) groups.add(m.group);
			});
			groups.forEach(grp => {
				$group_select.append(`<option value="${grp}">${grp}</option>`);
			});
		}
		if (current_val) $group_select.val(current_val);
	}

	render_trends_table() {
		if (!this.trends_data) return;

		let metrics = this.trends_data.metrics || [];
		let summary = this.trends_data.summary || {};
		let threshold = this.trends_data.threshold || 3;

		// Summary stats
		this.wrapper.find('#stat-total').text(summary.total || metrics.length || 0);
		this.wrapper.find('#stat-trending').text(metrics.length || 0);
		this.wrapper.find('#stat-ontrack').text(summary.on_track || 0);

		// Apply client-side group & status filters
		let group_val = this.wrapper.find('#trends-group-select').val();
		let status_val = this.wrapper.find('#trends-status-select').val();

		let filtered = metrics.filter(m => {
			if (group_val && m.group !== group_val) return false;
			if (status_val && m.last_status !== status_val) return false;
			return true;
		});

		let $content = this.wrapper.find('#trends-content-area');
		$content.empty();

		if (filtered.length === 0) {
			let message = (summary.total === 0)
				? __('No measurables visible for your account on this scorecard.')
				: __('No measurables are currently trending off-track for threshold {0}.', [threshold]);

			this.render_trends_empty_state(message);
			return;
		}

		let $tableWrapper = $('<div class="trends-table-wrapper"></div>');
		let $table = $(`
			<table class="trends-table">
				<thead>
					<tr>
						<th style="width: 50px;">Status</th>
						<th>Measurable</th>
						<th>Owner</th>
						<th>Group</th>
						<th>Trailing Off-Track</th>
						<th>Last Status</th>
						<th>Goal</th>
					</tr>
				</thead>
				<tbody></tbody>
			</table>
		`);

		let $tbody = $table.find('tbody');

		filtered.forEach(m => {
			let indicator = m.status_indicator || '⚪';
			let owner = m.owner || __('Unassigned');
			let group = m.group || __('Ungrouped');
			let consecutive = m.consecutive_off_track || 0;
			let last_status = m.last_status || __('No Data');
			let target = m.target_value != null ? `${m.target_value} ${m.unit || ''}` : '-';

			let status_class = 'badge-no-status';
			if (last_status === 'Off Track') status_class = 'badge-off-track';
			else if (last_status === 'On Track') status_class = 'badge-on-track';

			let $tr = $(`
				<tr>
					<td style="text-align: center; font-size: 16px;">${indicator}</td>
					<td class="font-weight-bold">${frappe.utils.escape_html(m.metric_name || m.name)}</td>
					<td>${frappe.utils.escape_html(owner)}</td>
					<td>${frappe.utils.escape_html(group)}</td>
					<td><span class="badge-off-track">${consecutive} ${__('weeks')}</span></td>
					<td><span class="${status_class}">${frappe.utils.escape_html(last_status)}</span></td>
					<td>${frappe.utils.escape_html(target)}</td>
				</tr>
			`);
			$tbody.append($tr);
		});

		$tableWrapper.append($table);
		$content.append($tableWrapper);
	}

	render_trends_empty_state(message) {
		let $content = this.wrapper.find('#trends-content-area');
		$content.empty();
		$content.append(`
			<div class="empty-state-card">
				<h4>${__('Trends View')}</h4>
				<p class="text-muted">${frappe.utils.escape_html(message)}</p>
			</div>
		`);
	}
};
