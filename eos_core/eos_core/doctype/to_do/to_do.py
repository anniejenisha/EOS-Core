import frappe
from frappe.model.document import Document

VALID_TODO_TRANSITIONS = {
	"Not Started": ["In Progress", "Complete", "Dropped"],
	"In Progress": ["Complete", "Dropped", "Not Started"],
	"Complete": ["In Progress", "Not Started"],
	"Dropped": ["In Progress", "Not Started"],
}


class ToDo(Document):
	def autoname(self):
		base = f"TD-{self.todo_name}"
		name = base
		count = 1
		while frappe.db.exists("To Do", name):
			name = f"{base}-{count}"
			count += 1
		self.name = name

	def validate(self):
		if not self.is_new():
			previous = frappe.db.get_value("To Do", self.name, "status")
			if (
				previous
				and previous != self.status
				and self.status not in VALID_TODO_TRANSITIONS.get(previous, [])
			):
				frappe.throw(
					f"Cannot transition from {frappe.bold(previous)} to {frappe.bold(self.status)}."
				)

	@frappe.whitelist()
	def archive(self):
		self.check_permission("write")
		self.archived = 1
		self.save()

	@frappe.whitelist()
	def restore(self):
		self.check_permission("write")
		self.archived = 0
		self.save()


def cascade_todo_transitions(todo_names, status):
	for name in todo_names:
		todo = frappe.get_doc("To Do", name)
		todo.status = status
		todo.save(ignore_permissions=True)
	return todo_names