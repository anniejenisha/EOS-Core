frappe.pages['scorecard_grid'].on_page_load = function(wrapper) {
	let page = wrapper.page;
	if (!page) {
		page = frappe.ui.make_app_page({
			parent: wrapper,
			title: __('Scorecard Grid'),
			single_column: true
		});
	}

	frappe.require('/assets/eos_core/js/scorecard_grid.js', function() {
		if (frappe.eos_core && frappe.eos_core.ScorecardGridPage) {
			$(page.body).empty();
			wrapper.scorecard_grid_page = new frappe.eos_core.ScorecardGridPage(wrapper);
		}
	});
};



