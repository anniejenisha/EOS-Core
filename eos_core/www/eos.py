import frappe
from eos_core.eos_api import get_eos_bootstrap

def get_context(context):
	context.no_cache = 1
	context.title = "EOS - Burhani ERP"

	# 1. If not logged in (Guest), automatically redirect to login with redirect-to=/desk/eos
	if not frappe.session.user or frappe.session.user == "Guest":
		frappe.local.flags.redirect_location = "/login?redirect-to=%2Fdesk%2Feos"
		raise frappe.Redirect

	# 2. If logged in and visiting the root domain directly (https://workspace.burhaniengineers.com/),
	# forward to /desk/eos to load the full Desk view
	req_path = getattr(frappe.local, "request", None) and getattr(frappe.local.request, "path", "") or ""
	if req_path.strip("/") in ("", "index"):
		frappe.local.flags.redirect_location = "/desk/eos"
		raise frappe.Redirect

	# 3. Authenticated session inside /desk/eos iframe or /eos portal: render the EOS page
	effective_user = frappe.session.user
	user_param = frappe.form_dict.get("user") or frappe.form_dict.get("user_email")
	if user_param and user_param != "Guest" and frappe.db.exists("User", user_param):
		effective_user = user_param

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
