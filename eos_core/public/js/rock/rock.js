frappe.ui.form.on("Rock", {
	refresh(frm) {
		if (!frm.is_new()) {
			frm.add_custom_button(__("Mark Complete"), function () {
				frappe.call({
					method: "mark_complete",
					doc: frm.doc,
					callback: function (r) {
						if (!r.exc) {
							frm.reload_doc();
						}
					}
				});
			}, __("Actions"));

			frm.add_custom_button(__("Rock Summary"), function () {
				frappe.call({
					method: "get_rock_summary",
					doc: frm.doc,
					callback: function (r) {
						if (r.message) {
							const summary = r.message;
							const msg = `
								<p><strong>Progress:</strong> ${summary.progress}%</p>
								<p><strong>Milestones:</strong> ${summary.milestones.complete} / ${summary.milestones.total} complete</p>
								<p><strong>Linked To-Dos:</strong> ${summary.linked_todos} (${summary.todos.open || 0} open, ${summary.todos.overdue || 0} overdue)</p>
							`;
							frappe.msgprint({
								title: __("Rock Summary — ") + frm.doc.rock_name,
								message: msg,
								indicator: "blue"
							});
						}
					}
				});
			}, __("Actions"));
		}
	}
});
