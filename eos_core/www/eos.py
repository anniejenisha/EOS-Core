import frappe
from eos_core.eos_api import get_eos_bootstrap

def get_context(context):
	context.no_cache = 1
	context.title = "EOS - Burhani ERP"
	boot_data = get_eos_bootstrap()
	context.eos_boot = frappe.as_json(boot_data)
	context.cache_buster = frappe.generate_hash()[:8]
	if frappe.session.user and frappe.session.user != "Guest":
		context.user_fullname = frappe.utils.get_fullname(frappe.session.user)
	else:
		context.user_fullname = boot_data.get("user", {}).get("name", "")
	return context
