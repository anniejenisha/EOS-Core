import frappe
from frappe.utils import add_days, getdate, nowdate


def seed_all():
	"""
	Idempotent seeder that ensures all sample documents for EOS Core
	(Teams, Players, Scorecards, Measurables, Entries, and Rocks)
	are created/updated in both local and production environments.
	Executed automatically via after_migrate hook and patch.
	"""
	try:
		fix_scorecard_entry_parents()
		ensure_users()
		ensure_teams()
		ensure_players()
		ensure_scorecards()
		ensure_metrics_and_entries()
		ensure_rocks()
		ensure_todos()
		frappe.db.commit()
		print("EOS Core sample documents successfully ensured.")
	except Exception as e:
		frappe.log_error(title="EOS Core Seed Sample Data Error", message=str(e))
		print("EOS Core seed warning:", e)


def fix_scorecard_entry_parents():
	"""Fix any Scorecard Entry rows with NULL parenttype to prevent AttributeError"""
	try:
		frappe.db.sql("""
			UPDATE `tabScorecard Entry`
			SET parenttype = 'EOS Metric',
				parentfield = 'entries',
				parent = metric
			WHERE parenttype IS NULL OR parenttype = '' OR parent IS NULL OR parent = ''
		""")
	except Exception:
		pass


def ensure_users():
	"""Ensure standard users exist with names and roles"""
	if not frappe.db.exists("User", "taher@burhani.com"):
		u = frappe.get_doc({
			"doctype": "User",
			"email": "taher@burhani.com",
			"first_name": "Taher",
			"last_name": "Jivanji",
			"send_welcome_email": 0,
			"roles": [{"role": "System Manager"}]
		})
		u.insert(ignore_permissions=True)
	else:
		frappe.db.set_value("User", "taher@burhani.com", {
			"first_name": "Taher",
			"last_name": "Jivanji"
		})


def ensure_teams():
	"""Ensure standard teams exist in Team doctype"""
	teams = [
		{"team_name": "Leadership Team", "default_timeframe": "Weekly"},
		{"team_name": "BEL BPO", "default_timeframe": "Weekly"},
		{"team_name": "BPO and IT", "default_timeframe": "Weekly"},
		{"team_name": "Test", "default_timeframe": "Weekly"},
	]
	for t in teams:
		if not frappe.db.exists("Team", t["team_name"]):
			doc = frappe.get_doc({
				"doctype": "Team",
				"team_name": t["team_name"],
				"default_timeframe": t["default_timeframe"],
				"archived": 0
			})
			doc.insert(ignore_permissions=True)
		else:
			frappe.db.set_value("Team", t["team_name"], "archived", 0)


def ensure_players():
	"""Ensure Player records link users to teams"""
	players = [
		{"player_name": "Taher Jivanji", "user": "taher@burhani.com", "team": "Leadership Team"},
		{"player_name": "Administrator", "user": "Administrator", "team": "BEL BPO"},
		{"player_name": "Administrator", "user": "Administrator", "team": "BPO and IT"},
		{"player_name": "John Doe", "user": "jd@example.com", "team": "BEL BPO"},
		{"player_name": "Jenisha", "user": "anniejenisha.p@gmail.com", "team": "Test"},
	]
	for p in players:
		if not frappe.db.exists("Player", {"user": p["user"], "team": p["team"]}):
			try:
				doc = frappe.get_doc({
					"doctype": "Player",
					"player_name": p["player_name"],
					"user": p["user"],
					"team": p["team"],
					"archived": 0
				})
				doc.insert(ignore_permissions=True)
			except Exception:
				pass


def ensure_scorecards():
	"""Ensure Scorecards exist for each team"""
	cards = [
		{"name": "Leadership Team-Weekly", "team": "Leadership Team", "timeframe": "Weekly"},
		{"name": "BEL BPO-Weekly", "team": "BEL BPO", "timeframe": "Weekly"},
		{"name": "BPO and IT-Weekly", "team": "BPO and IT", "timeframe": "Weekly"},
		{"name": "Test-Weekly", "team": "Test", "timeframe": "Weekly"},
	]
	for sc in cards:
		if not frappe.db.exists("Scorecard", sc["name"]):
			try:
				doc = frappe.get_doc({
					"doctype": "Scorecard",
					"team": sc["team"],
					"timeframe": sc["timeframe"],
					"archived": 0
				})
				doc.insert(ignore_permissions=True)
			except Exception:
				pass


def ensure_metrics_and_entries():
	"""Ensure standard metrics and their weekly actual entries exist"""
	metrics = [
		{
			"metric_name": "Ticket resolved",
			"team": "BPO and IT",
			"owner_user": "Administrator",
			"scorecard": "BPO and IT-Weekly",
			"target_value": 5,
			"operator": ">=",
			"unit": "",
			"frequency": "Weekly",
			"entries": [6, 4, 7, 5, 8, 3, 6, 9, 5, 4, 7, 6, 5]
		},
		{
			"metric_name": "Closed Baseline Sales Orders",
			"team": "Leadership Team",
			"owner_user": "taher@burhani.com",
			"scorecard": "Leadership Team-Weekly",
			"target_value": 2000000,
			"operator": ">=",
			"unit": "$",
			"frequency": "Weekly",
			"entries": [2100000, 1850000, 2250000, 2050000, 1900000, 2400000, 2150000, 1980000, 2300000, 2020000, 1750000, 2100000, 2080000]
		},
		{
			"metric_name": "Number of Proposals Sent",
			"team": "Leadership Team",
			"owner_user": "taher@burhani.com",
			"scorecard": "Leadership Team-Weekly",
			"target_value": 10,
			"operator": ">=",
			"unit": "",
			"frequency": "Weekly",
			"entries": [12, 8, 15, 11, 9, 14, 10, 7, 13, 11, 8, 12, 10]
		},
		{
			"metric_name": "Cash in bank",
			"team": "Leadership Team",
			"owner_user": "taher@burhani.com",
			"scorecard": "Leadership Team-Weekly",
			"target_value": 1500000,
			"operator": ">=",
			"unit": "$",
			"frequency": "Weekly",
			"entries": [1650000, 1420000, 1700000, 1580000, 1490000, 1800000, 1620000, 1510000, 1450000, 1680000, 1550000, 1600000, 1520000]
		},
		{
			"metric_name": "Weekly attendance and punctuality rate",
			"team": "BEL BPO",
			"owner_user": "Administrator",
			"scorecard": "BEL BPO-Weekly",
			"target_value": 95,
			"operator": ">=",
			"unit": "%",
			"frequency": "Weekly",
			"entries": [96, 92, 98, 95, 94, 97, 96, 91, 99, 95, 93, 96, 95]
		}
	]

	base_date = getdate(nowdate())
	# Align to Monday
	monday = add_days(base_date, -(base_date.weekday()))

	for m in metrics:
		name = m["metric_name"]
		if not frappe.db.exists("EOS Metric", name):
			try:
				doc = frappe.get_doc({
					"doctype": "EOS Metric",
					"metric_name": name,
					"team": m["team"],
					"owner_user": m["owner_user"],
					"scorecard": m["scorecard"],
					"target_value": m["target_value"],
					"operator": m["operator"],
					"unit": m["unit"],
					"frequency": m["frequency"],
					"archived": 0
				})
				doc.insert(ignore_permissions=True)
			except Exception:
				continue
		else:
			doc = frappe.get_doc("EOS Metric", name)

		# Add weekly entries
		for idx, val in enumerate(m["entries"]):
			w_date = str(add_days(monday, -7 * idx))
			existing = None
			for e in doc.get("entries", []):
				if str(e.week_start_date) == w_date:
					existing = e
					break
			if existing:
				existing.actual_value = val
				existing.is_manual = 1
				existing.parenttype = "EOS Metric"
				existing.parentfield = "entries"
				existing.parent = doc.name
			else:
				doc.append("entries", {
					"metric": doc.name,
					"week_start_date": w_date,
					"actual_value": val,
					"is_manual": 1,
					"parenttype": "EOS Metric",
					"parentfield": "entries",
					"parent": doc.name
				})
		try:
			doc.save(ignore_permissions=True)
		except Exception:
			pass


def ensure_rocks():
	"""Ensure standard Company Rocks and Individual Rocks with Milestones"""
	rocks = [
		{
			"name": "R-EOS company portal go live",
			"title": "EOS company portal go live",
			"team": "Leadership Team",
			"owner": "taher@burhani.com",
			"is_company": 1,
			"scope": "Company",
			"status": "In Progress",
			"due": "2026-12-31",
			"milestones": [
				{"name": "Requirements gathering and blueprinting", "done": 1, "notes": "Due: 30 Sep"},
				{"name": "Database architecture and entity mapping", "done": 0, "notes": "Due: 15 Oct"},
				{"name": "Frontend grid implementation", "done": 0, "notes": "Due: 31 Oct"},
				{"name": "Workflow and role permission testing", "done": 0, "notes": "Due: 15 Nov"},
				{"name": "User acceptance testing with Leadership Team", "done": 0, "notes": "Due: 30 Nov"},
				{"name": "Training and documentation release", "done": 0, "notes": "Due: 10 Dec"},
				{"name": "Staging environment dry run", "done": 0, "notes": "Due: 20 Dec"},
				{"name": "Final go live cutover", "done": 0, "notes": "Due: 31 Dec"}
			]
		},
		{
			"name": "R-EDMS implementation and go live",
			"title": "EDMS implementation and go live",
			"team": "Leadership Team",
			"owner": "taher@burhani.com",
			"is_company": 1,
			"scope": "Company",
			"status": "In Progress",
			"due": "2026-12-31",
			"milestones": [
				{"name": "Identification of the right tool with open integration protocols", "done": 0, "notes": "Due: 10 Oct"},
				{"name": "Deployment", "done": 0, "notes": "Due: 15 Oct"}
			]
		},
		{
			"name": "R-Test",
			"title": "Test",
			"team": "Leadership Team",
			"owner": "taher@burhani.com",
			"is_company": 1,
			"scope": "Company",
			"status": "Not Started",
			"due": "2026-12-31",
			"milestones": [
				{"name": "Initial assessment", "done": 0, "notes": "Due: 15 Oct"},
				{"name": "Review with team", "done": 0, "notes": "Due: 30 Oct"}
			]
		},
		{
			"name": "R-EOS Company Map",
			"title": "EOS Company Map",
			"team": "BEL BPO",
			"owner": "Administrator",
			"is_company": 1,
			"scope": "Company",
			"status": "In Progress",
			"due": "2026-12-31",
			"milestones": []
		},
		{
			"name": "R-EOS Company",
			"title": "EOS Company",
			"team": "BEL BPO",
			"owner": "Administrator",
			"is_company": 1,
			"scope": "Company",
			"status": "In Progress",
			"due": "2026-12-31",
			"milestones": []
		},
		{
			"name": "R-To systemise incentive plans",
			"title": "To systemise incentive plans",
			"team": "Leadership Team",
			"owner": "taher@burhani.com",
			"is_company": 0,
			"scope": "Individual",
			"status": "In Progress",
			"due": "2026-12-31",
			"milestones": [
				{"name": "Review historic payout metrics", "done": 0, "notes": "Due: 15 Oct"},
				{"name": "Define performance score threshold formulas", "done": 0, "notes": "Due: 31 Oct"}
			]
		},
		{
			"name": "R-ERP Next Live",
			"title": "ERP Next Live",
			"team": "Leadership Team",
			"owner": "taher@burhani.com",
			"is_company": 0,
			"scope": "Individual",
			"status": "In Progress",
			"due": "2026-12-31",
			"milestones": [
				{"name": "Module configuration and testing", "done": 0, "notes": "Due: 15 Oct"},
				{"name": "Master data migration", "done": 0, "notes": "Due: 30 Oct"}
			]
		}
	]

	for r in rocks:
		name = r["name"]
		if not frappe.db.exists("Rock", name):
			doc = frappe.get_doc({
				"doctype": "Rock",
				"name": name,
				"rock_name": r["title"],
				"team": r["team"],
				"owner_user": r["owner"],
				"is_company_rock": r["is_company"],
				"scope": r["scope"],
				"status": r["status"],
				"duration_end": r["due"],
				"archived": 0
			})
			doc.insert(ignore_permissions=True)
		else:
			doc = frappe.get_doc("Rock", name)
			doc.team = r["team"]
			doc.owner_user = r["owner"]
			doc.is_company_rock = r["is_company"]
			doc.scope = r["scope"]
			doc.status = r["status"]
			doc.duration_end = r["due"]
			doc.archived = 0

		# Update milestones
		if r.get("milestones"):
			doc.set("milestones", [])
			for m in r["milestones"]:
				doc.append("milestones", {
					"milestone_name": m["name"],
					"completed": m["done"],
					"notes": m.get("notes", "")
				})
		try:
			doc.save(ignore_permissions=True)
		except Exception:
			pass


def ensure_todos():
	"""Ensure standard To-Dos exist from sample data (Ninety To-Dos)"""
	todos = [
		{
			"todo_name": "Onboarding and Training for Open Projects - BEL TZ",
			"team": "Leadership Team",
			"owner_user": "taher@burhani.com",
			"due_date": "2026-10-06",
			"status": "Not Started",
			"priority": "Medium"
		},
		{
			"todo_name": "CIB and billing target dashboard visualisation deployed",
			"team": "Leadership Team",
			"owner_user": "taher@burhani.com",
			"due_date": "2026-10-08",
			"status": "Not Started",
			"priority": "Medium"
		},
		{
			"todo_name": "Build Scorecard AI skill: Pressure-test every measure before it's accepted",
			"team": "Leadership Team",
			"owner_user": "taher@burhani.com",
			"due_date": "2026-10-09",
			"status": "Not Started",
			"priority": "Medium"
		},
		{
			"todo_name": "System for L2 rollout - Core ninety functions replicated",
			"team": "Leadership Team",
			"owner_user": "taher@burhani.com",
			"due_date": "2026-10-09",
			"status": "Not Started",
			"priority": "Medium"
		},
		{
			"todo_name": "Structuring the data for Operations and Finance for EOS Scorecard",
			"team": "Leadership Team",
			"owner_user": "taher@burhani.com",
			"due_date": "2026-10-12",
			"status": "Not Started",
			"priority": "Medium"
		},
		{
			"todo_name": "Update Monthly Score Card on Ninety",
			"team": "Leadership Team",
			"owner_user": "taher@burhani.com",
			"due_date": "2026-10-13",
			"status": "Not Started",
			"priority": "Medium"
		},
		{
			"todo_name": "Update Quarterly Score Card - End of September 2026",
			"team": "Leadership Team",
			"owner_user": "taher@burhani.com",
			"due_date": "2026-10-13",
			"status": "Not Started",
			"priority": "Medium"
		}
	]

	for td in todos:
		doc_name = frappe.db.get_value("To Do", {"todo_name": td["todo_name"]}, "name")
		if not doc_name:
			try:
				doc = frappe.get_doc({
					"doctype": "To Do",
					"todo_name": td["todo_name"],
					"team": td["team"],
					"owner_user": td["owner_user"],
					"due_date": td["due_date"],
					"status": td["status"],
					"priority": td["priority"],
					"archived": 0
				})
				doc.insert(ignore_permissions=True)
			except Exception as e:
				print("Error creating To-Do:", td["todo_name"], e)
		else:
			frappe.db.set_value("To Do", doc_name, {
				"team": td["team"],
				"owner_user": td["owner_user"],
				"due_date": td["due_date"],
				"priority": td["priority"],
				"archived": 0
			})

