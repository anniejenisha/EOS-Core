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
		this.current_team = null;
		this.trends_data = null;
		this.scorecards_list = [];
		this.team_settings = {
			show_owner: true,
			show_goal: true,
			show_rollup: true,
			show_current_period: true,
			show_status_colors: true,
			default_timeframe: 'Weekly',
			is_override: false
		};
		this.user_can_edit_settings = false;
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
					<button type="button" id="scorecard-settings-btn" class="btn btn-default btn-sm" title="${__('Scorecard Settings')}">
						<i class="fa fa-cog"></i> ${__('Settings')}
					</button>
					<button type="button" id="scorecard-export-btn" class="btn btn-default btn-sm" title="${__('Export Data')}">
						<i class="fa fa-download"></i> ${__('Export')}
					</button>
					<button type="button" id="scorecard-import-btn" class="btn btn-default btn-sm" title="${__('Import Data')}">
						<i class="fa fa-upload"></i> ${__('Import')}
					</button>
					<div class="btn-group">
						<button type="button" class="btn btn-default btn-sm dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
							${__('Bulk Actions')} <span class="caret"></span>
						</button>
						<ul class="dropdown-menu dropdown-menu-right">
							<li><a href="#" id="bulk-archive-btn"><i class="fa fa-archive"></i> ${__('Bulk Archive Metrics')}</a></li>
							<li><a href="#" id="bulk-share-btn"><i class="fa fa-share-alt"></i> ${__('Bulk Share Metrics')}</a></li>
						</ul>
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
			let selected_sc = me.scorecards_list.find(sc => sc.name === me.current_scorecard);
			me.current_team = selected_sc ? selected_sc.team : null;
			me.load_team_settings(function() {
				me.load_current_view();
			});
		});

		this.wrapper.find('#scorecard-settings-btn').on('click', function() {
			me.open_settings_modal();
		});

		this.wrapper.find('#scorecard-export-btn').on('click', function() {
			me.export_data();
		});

		this.wrapper.find('#scorecard-import-btn').on('click', function() {
			me.open_import_dialog();
		});

		this.wrapper.find('#bulk-archive-btn').on('click', function(e) {
			e.preventDefault();
			me.trigger_bulk_archive();
		});

		this.wrapper.find('#bulk-share-btn').on('click', function(e) {
			e.preventDefault();
			me.trigger_bulk_share();
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
				fields: ['name', 'team', 'timeframe'],
				order_by: 'name asc'
			},
			callback: function(r) {
				let $select = me.wrapper.find('#scorecard-select');
				$select.empty();
				$select.append(`<option value="">${__('Select Scorecard...')}</option>`);
				me.scorecards_list = r.message || [];

				if (me.scorecards_list.length > 0) {
					me.scorecards_list.forEach(sc => {
						let label = sc.name;
						if (sc.team && !sc.name.includes(sc.team)) label += ` (${sc.team})`;
						$select.append(`<option value="${sc.name}">${label}</option>`);
					});
					me.current_scorecard = me.scorecards_list[0].name;
					me.current_team = me.scorecards_list[0].team;
					$select.val(me.current_scorecard);
					me.load_team_settings(function() {
						me.load_current_view();
					});
				}
			}
		});
	}

	load_team_settings(callback) {
		let me = this;
		if (!this.current_team) {
			if (callback) callback();
			return;
		}

		frappe.call({
			method: 'eos_core.eos_core.doctype.team.team.get_scorecard_settings',
			args: {
				team_name: me.current_team
			},
			callback: function(r) {
				if (r.message) {
					me.team_settings = r.message;
				}
				frappe.model.with_doctype('Team', function() {
					me.user_can_edit_settings = frappe.model.can_write('Team');
					if (callback) callback();
				});
			},
			error: function() {
				if (callback) callback();
			}
		});
	}

	export_data() {
		let me = this;
		if (!this.current_scorecard) {
			frappe.msgprint(__('Please select a scorecard to export.'));
			return;
		}

		frappe.call({
			method: 'run_doc_method',
			args: {
				dt: 'Scorecard',
				dn: me.current_scorecard,
				method: 'export_scorecard_data',
				args: { file_type: 'csv' }
			},
			callback: function(r) {
				if (r.message && r.message.metrics) {
					let metrics = r.message.metrics;
					let csvContent = "data:text/csv;charset=utf-8,Metric,Owner,Team,Target,Operator,Frequency,Unit\n";
					metrics.forEach(m => {
						csvContent += `"${m.metric_name}","${m.owner || ''}","${m.team || ''}","${m.target_value || ''}","${m.operator || ''}","${m.frequency || ''}","${m.unit || ''}"\n`;
					});
					let encodedUri = encodeURI(csvContent);
					let link = document.createElement("a");
					link.setAttribute("href", encodedUri);
					link.setAttribute("download", `${me.current_scorecard}_export.csv`);
					document.body.appendChild(link);
					link.click();
					document.body.removeChild(link);
					frappe.show_alert({ message: __('Export complete'), indicator: 'green' });
				}
			}
		});
	}

	open_import_dialog() {
		let me = this;
		if (!this.current_scorecard) {
			frappe.msgprint(__('Please select a scorecard first.'));
			return;
		}

		let d = new frappe.ui.Dialog({
			title: __('Import Scorecard Measurables'),
			fields: [
				{
					fieldname: 'help',
					fieldtype: 'HTML',
					options: `<p class="text-muted small">${__('Paste JSON data containing measurables to import into this scorecard.')}</p>`
				},
				{
					label: __('Import Data (JSON)'),
					fieldname: 'json_data',
					fieldtype: 'Code',
					options: 'JSON',
					default: JSON.stringify([
						{
							"metric_name": "Sample Measurable",
							"target_value": 100,
							"operator": ">=",
							"unit": "USD",
							"entries": [
								{"week_start_date": frappe.datetime.get_today(), "actual_value": 105}
							]
						}
					], null, 2)
				}
			],
			primary_action_label: __('Import Now'),
			primary_action(values) {
				try {
					let rows = JSON.parse(values.json_data);
					frappe.call({
						method: 'run_doc_method',
						args: {
							dt: 'Scorecard',
							dn: me.current_scorecard,
							method: 'import_scorecard_data',
							args: { rows: rows }
						},
						callback: function(r) {
							if (r.message) {
								let res = r.message;
								frappe.msgprint(__('Imported {0} metrics successfully ({1} failed).', [res.imported, res.failed]));
								d.hide();
								me.load_current_view();
							}
						}
					});
				} catch (err) {
					frappe.msgprint(__('Invalid JSON payload: {0}', [err.message]));
				}
			}
		});
		d.show();
	}

	trigger_bulk_archive() {
		let me = this;
		if (!this.current_scorecard) return;

		frappe.confirm(__('Are you sure you want to archive all unarchived measurables on this scorecard?'), function() {
			frappe.call({
				method: 'frappe.client.get_list',
				args: {
					doctype: 'EOS Metric',
					filters: { scorecard: me.current_scorecard, archived: 0 },
					fields: ['name']
				},
				callback: function(r) {
					let names = (r.message || []).map(m => m.name);
					if (names.length === 0) {
						frappe.msgprint(__('No unarchived metrics found to archive.'));
						return;
					}
					frappe.call({
						method: 'run_doc_method',
						args: {
							dt: 'Scorecard',
							dn: me.current_scorecard,
							method: 'bulk_archive_metrics',
							args: { metric_names: names }
						},
						callback: function(res) {
							if (res.message) {
								frappe.show_alert({ message: __('Archived {0} metrics', [res.message.archived_count]), indicator: 'orange' });
								me.load_current_view();
							}
						}
					});
				}
			});
		});
	}

	trigger_bulk_share() {
		let me = this;
		if (!this.current_scorecard) return;

		let d = new frappe.ui.Dialog({
			title: __('Bulk Share Metrics'),
			fields: [
				{
					label: __('User to share with'),
					fieldname: 'user',
					fieldtype: 'Link',
					options: 'User',
					reqd: 1
				}
			],
			primary_action_label: __('Share Now'),
			primary_action(values) {
				frappe.call({
					method: 'frappe.client.get_list',
					args: {
						doctype: 'EOS Metric',
						filters: { scorecard: me.current_scorecard, archived: 0 },
						fields: ['name']
					},
					callback: function(r) {
						let names = (r.message || []).map(m => m.name);
						frappe.call({
							method: 'run_doc_method',
							args: {
								dt: 'Scorecard',
								dn: me.current_scorecard,
								method: 'bulk_share_metrics',
								args: { metric_names: names, user: values.user, read: 1, write: 0, share: 0 }
							},
							callback: function(res) {
								if (res.message) {
									frappe.show_alert({ message: __('Shared {0} metrics with {1}', [res.message.shared_count, values.user]), indicator: 'blue' });
									d.hide();
								}
							}
						});
					}
				});
			}
		});
		d.show();
	}

	open_settings_modal() {
		let me = this;
		let s = me.team_settings;

		let is_read_only = !me.user_can_edit_settings;
		let override_badge = s.is_override
			? `<span class="badge badge-info">${__('Team Override')}</span>`
			: `<span class="badge badge-secondary">${__('Company Default')}</span>`;

		let dialog = new frappe.ui.Dialog({
			title: __('Scorecard Column & View Settings') + ' ' + override_badge,
			fields: [
				{
					fieldname: 'info_section',
					fieldtype: 'HTML',
					options: is_read_only
						? `<p class="text-muted small">${__('Settings are read-only for Team Members and Observers.')}</p>`
						: `<p class="text-muted small">${__('Configure default column visibility and period settings for this team scorecard.')}</p>`
				},
				{
					label: __('Show Owner Column'),
					fieldname: 'show_owner',
					fieldtype: 'Check',
					default: s.show_owner ? 1 : 0,
					read_only: is_read_only ? 1 : 0
				},
				{
					label: __('Show Goal Column'),
					fieldname: 'show_goal',
					fieldtype: 'Check',
					default: s.show_goal ? 1 : 0,
					read_only: is_read_only ? 1 : 0
				},
				{
					label: __('Show Rollup / Total / Average Column'),
					fieldname: 'show_rollup',
					fieldtype: 'Check',
					default: s.show_rollup ? 1 : 0,
					read_only: is_read_only ? 1 : 0
				},
				{
					label: __('Show Current (In-Progress) Period'),
					fieldname: 'show_current_period',
					fieldtype: 'Check',
					default: s.show_current_period ? 1 : 0,
					read_only: is_read_only ? 1 : 0
				},
				{
					label: __('Show Status Colors'),
					fieldname: 'show_status_colors',
					fieldtype: 'Check',
					default: s.show_status_colors ? 1 : 0,
					read_only: is_read_only ? 1 : 0
				},
				{
					label: __('Default Timeframe'),
					fieldname: 'default_timeframe',
					fieldtype: 'Select',
					options: ['Weekly', 'Monthly', 'Quarterly', 'Annual'],
					default: s.default_timeframe || 'Weekly',
					read_only: is_read_only ? 1 : 0
				}
			],
			primary_action_label: is_read_only ? null : __('Save Settings'),
			primary_action(values) {
				frappe.call({
					method: 'eos_core.eos_core.doctype.team.team.update_scorecard_settings',
					args: {
						team_name: me.current_team,
						settings: values
					},
					callback: function(r) {
						if (r.message) {
							me.team_settings = r.message;
							frappe.show_alert({ message: __('Scorecard settings updated'), indicator: 'green' });
							dialog.hide();
							me.load_current_view();
						}
					}
				});
			}
		});

		dialog.show();
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
		let s = this.team_settings;

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
						${s.show_owner !== false ? `<th>Owner</th>` : ''}
						<th>Group</th>
						<th>Trailing Off-Track</th>
						<th>Last Status</th>
						${s.show_goal !== false ? `<th>Goal</th>` : ''}
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

			let status_html = s.show_status_colors !== false
				? `<span class="${status_class}">${frappe.utils.escape_html(last_status)}</span>`
				: `<span class="text-muted font-weight-bold">[${frappe.utils.escape_html(last_status)}]</span>`;

			let indicator_html = s.show_status_colors !== false
				? indicator
				: (last_status === 'Off Track' ? '▲' : (last_status === 'On Track' ? '●' : '○'));

			let $tr = $(`
				<tr>
					<td style="text-align: center; font-size: 16px;">${indicator_html}</td>
					<td class="font-weight-bold">${frappe.utils.escape_html(m.metric_name || m.name)}</td>
					${s.show_owner !== false ? `<td>${frappe.utils.escape_html(owner)}</td>` : ''}
					<td>${frappe.utils.escape_html(group)}</td>
					<td><span class="badge-off-track">${consecutive} ${__('weeks')}</span></td>
					<td>${status_html}</td>
					${s.show_goal !== false ? `<td>${frappe.utils.escape_html(target)}</td>` : ''}
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
