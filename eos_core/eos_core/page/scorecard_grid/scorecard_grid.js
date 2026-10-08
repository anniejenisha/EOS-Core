frappe.pages['scorecard_grid'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Scorecard Grid',
		single_column: true
	});
	console.log('Scorecard Grid JS loaded');
	$(page.body).append('<div class="scorecard-grid-container"><p class="text-muted">Scorecard Grid Container Loaded</p></div>');
};
