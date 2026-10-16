import frappe
from eos_core.eos_api import get_eos_bootstrap

def get_context(context):
	context.no_cache = 1
	context.title = "EOS - Burhani ERP"
	user_param = frappe.form_dict.get("user") or frappe.form_dict.get("user_email")
	effective_user = None
	if user_param and user_param != "Guest" and frappe.db.exists("User", user_param):
		effective_user = user_param
	elif frappe.session.user and frappe.session.user != "Guest":
		effective_user = frappe.session.user

	boot_data = get_eos_bootstrap(user_email=effective_user)
	context.eos_boot = frappe.as_json(boot_data)
	context.cache_buster = frappe.generate_hash()[:8]
	if effective_user:
		context.user_fullname = frappe.utils.get_fullname(effective_user) or effective_user
		context.user_email = effective_user
	else:
		context.user_fullname = boot_data.get("user", {}).get("name", "")
		context.user_email = boot_data.get("user", {}).get("email", "")
	return context
