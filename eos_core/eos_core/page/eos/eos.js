frappe.pages['eos'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'EOS',
		single_column: true,
		hide_sidebar: true
	});
	page.hide_sidebar = true;
	if (wrapper && wrapper.page) wrapper.page.hide_sidebar = true;

	const hideDeskSidebar = () => {
		if (frappe.app && frappe.app.sidebar) {
			frappe.app.sidebar.toggle(true);
		}
		$('.desk-sidebar').hide();
		$('.layout-side-section').hide();
		$(wrapper).find('.layout-side-section').hide();
		$('.layout-main-section-wrapper').css({ 'width': '100%', 'max-width': '100%' });
		$(wrapper).closest('.page-container').find('.layout-side-section').hide();
		$(wrapper).closest('.page-container').find('.layout-main-section-wrapper').css({ 'width': '100%', 'max-width': '100%' });
	};

	hideDeskSidebar();

	$(wrapper).on('show', function() {
		hideDeskSidebar();
		setTimeout(hideDeskSidebar, 50);
	});

	if (!$('#eos-desk-hide-sidebar-style').length) {
		$('head').append(`
			<style id="eos-desk-hide-sidebar-style">
				body[data-route^="eos"] .desk-sidebar,
				body[data-route^="desk/eos"] .desk-sidebar,
				.page-container[data-page-route="eos"] .layout-side-section,
				.page-container[data-page-route="desk/eos"] .layout-side-section {
					display: none !important;
				}
				.page-container[data-page-route="eos"] .layout-main-section-wrapper,
				.page-container[data-page-route="desk/eos"] .layout-main-section-wrapper {
					width: 100% !important;
					max-width: 100% !important;
				}
			</style>
		`);
	}

	const currentUser = (frappe.session && frappe.session.user && frappe.session.user !== 'Guest') ? encodeURIComponent(frappe.session.user) : '';
	const iframeUrl = currentUser ? `/eos?user=${currentUser}` : '/eos';
	$(wrapper).find('.page-head').hide();
	$(wrapper).find('.layout-main-section').css({ 'padding': '0', 'margin': '0', 'width': '100%', 'max-width': '100%' }).html(`
		<div style="width:100%; height:calc(100vh - 44px); overflow:hidden; background:#F6F8F7;">
			<iframe src="${iframeUrl}" style="width:100%; height:100%; border:none; display:block;"></iframe>
		</div>
	`);
};
