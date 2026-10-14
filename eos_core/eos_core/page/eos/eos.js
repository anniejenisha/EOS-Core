frappe.pages['eos'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'EOS',
		single_column: true
	});
	$(wrapper).find('.page-head').hide();
	$(wrapper).find('.layout-main-section').css({ 'padding': '0', 'margin': '0' }).html(`
		<div style="width:100%; height:calc(100vh - 44px); overflow:hidden; background:#F6F8F7;">
			<iframe src="/eos" style="width:100%; height:100%; border:none; display:block;"></iframe>
		</div>
	`);
};
