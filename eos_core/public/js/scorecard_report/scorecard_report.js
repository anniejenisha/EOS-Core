frappe.ui.form.on("Scorecard Report", {
	refresh(frm) {
		if (!frm.is_new()) {
			frm.add_custom_button(__("Send Report"), function () {
				frappe.call({
					method: "send_report",
					doc: frm.doc,
					callback: function (r) {
						if (!r.exc) {
							frm.reload_doc();
						}
					},
					error: function (r) {
						if (r && r.message) {
							frappe.msgprint({
								title: __("Permission Refused"),
								message: r.message,
								indicator: "red"
							});
						}
					}
				});
			}, __("Actions"));
		}
	}
});
