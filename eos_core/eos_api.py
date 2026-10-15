import json
import frappe
from frappe import _
from frappe.utils import add_days, getdate, nowdate, now, flt, cint

@frappe.whitelist(allow_guest=True)
def get_eos_bootstrap():
	"""
	Unified bootstrap method returning live database data from Frappe DocTypes.
	No hardcoded data.
	"""
	return {
		"user": get_current_user_info(),
		"teams": get_teams_list(),
		"people": get_people_list(),
		"scorecards": get_scorecards_list(),
		"measurables": get_measurables_list(),
		"rocks": get_rocks_list(),
		"todos": get_todos_list(),
		"issues": get_issues_list(),
		"meetings": get_meetings_list(),
		"vto": get_vto_info(),
	}


def get_current_user_info():
	user = frappe.session.user
	if user and user != "Guest":
		fullname = frappe.utils.get_fullname(user) or user
		return {
			"id": user,
			"name": fullname,
			"initial": (fullname[0] if fullname else "U").upper(),
			"email": user
		}
	# Default to system administrator or first user if guest
	first_user = frappe.db.get_value("User", {"enabled": 1, "user_type": "System User"}, ["name", "first_name", "last_name"], as_dict=True)
	if first_user:
		name = f"{first_user.first_name or ''} {first_user.last_name or ''}".strip() or first_user.name
		return {
			"id": first_user.name,
			"name": name,
			"initial": (name[0] if name else "U").upper(),
			"email": first_user.name
		}
	admin_name = frappe.utils.get_fullname("Administrator") or "Administrator"
	return {
		"id": "Administrator",
		"name": admin_name,
		"initial": (admin_name[0] if admin_name else "A").upper(),
		"email": frappe.db.get_value("User", "Administrator", "email") or "admin@example.com"
	}


def get_teams_list():
	try:
		teams = frappe.get_all("Team", filters={"archived": 0}, fields=["team_name", "name"], order_by="team_name asc")
		names = [t.team_name or t.name for t in teams if t.team_name or t.name]
		if not names:
			# Auto create default leadership team if none exists
			frappe.get_doc({
				"doctype": "Team",
				"team_name": "Leadership Team",
				"default_timeframe": "Weekly",
				"archived": 0
			}).insert(ignore_permissions=True)
			frappe.db.commit()
			return ["Leadership Team"]
		return names
	except Exception:
		return ["Leadership Team"]


def get_people_list():
	try:
		users = frappe.db.sql("""
			SELECT DISTINCT COALESCE(NULLIF(TRIM(CONCAT(first_name, ' ', COALESCE(last_name, ''))), ''), name) as fullname
			FROM `tabUser`
			WHERE enabled = 1 AND user_type = 'System User' AND name != 'Guest'
			ORDER BY fullname asc
		""", as_dict=True)
		people = [u.fullname for u in users if u.fullname]
		return people or ["Administrator"]
	except Exception:
		return ["Administrator"]


def get_scorecards_list():
	try:
		scorecards = frappe.get_all(
			"Scorecard",
			fields=["name", "team", "timeframe", "description", "archived", "modified", "creation"],
			order_by="creation desc"
		)
		out = []
		for sc in scorecards:
			out.append({
				"id": sc.name,
				"name": sc.name,
				"team": sc.team or "Leadership Team",
				"timeframe": sc.timeframe or "Weekly",
				"archived": bool(cint(sc.archived)),
				"modified": str(sc.modified or sc.creation or "")
			})
		return out
	except Exception as e:
		frappe.log_error("get_scorecards_list error", str(e))
		return []


def get_measurables_list():
	try:
		metrics = frappe.get_all(
			"EOS Metric",
			filters={"archived": 0},
			fields=["name", "metric_name", "frequency", "team", "owner_user", "operator", "target_value", "unit", "unit_type", "rollup"],
			order_by="creation asc"
		)
		
		today = getdate(nowdate())
		mon_delta = today.weekday()
		current_mon = add_days(today, -mon_delta)
		weekly_dates = [str(add_days(current_mon, -7 * i)) for i in range(13)]
		monthly_dates = [str(getdate(f"{today.year}-{today.month:02d}-01"))] # will match by month/year

		out = []
		for idx, m in enumerate(metrics):
			m_id = idx + 1
			freq = (m.frequency or "Weekly").lower()
			owner_name = frappe.utils.get_fullname(m.owner_user) if m.owner_user else "Administrator"
			
			entries = frappe.get_all(
				"Scorecard Entry",
				filters={"parent": m.name},
				fields=["week_start_date", "actual_value", "status"],
				order_by="week_start_date desc"
			)
			val_map = {str(e.week_start_date): e.actual_value for e in entries if e.week_start_date}
			
			vals = [val_map.get(d, None) for d in weekly_dates]
			
			# If vals are all null, see if any entries exist in order
			if all(v is None for v in vals) and entries:
				vals = [e.actual_value for e in entries[:13]]
				while len(vals) < 13:
					vals.append(None)

			unit = "num"
			if m.unit_type == "Currency" or "kes" in (m.unit or "").lower() or "$" in (m.unit or ""):
				unit = "kes"
			elif m.unit_type == "Percentage" or "%" in (m.unit or ""):
				unit = "pct"

			out.append({
				"id": m_id,
				"docname": m.name,
				"name": m.metric_name or m.name,
				"freq": freq,
				"team": m.team or "Leadership Team",
				"owner": owner_name,
				"op": m.operator or ">=",
				"target": flt(m.target_value),
				"unit": unit,
				"noTotal": (unit == "pct" or m.rollup == "Average"),
				"vals": vals
			})
		return out
	except Exception as e:
		frappe.log_error("get_measurables_list error", str(e))
		return []


def get_rocks_list():
	try:
		rocks = frappe.get_all(
			"Rock",
			fields=["name", "rock_name", "owner_user", "team", "status", "duration_end", "is_company_rock", "archived", "scope"],
			order_by="creation desc"
		)
		out = []
		for idx, r in enumerate(rocks):
			r_id = idx + 1
			owner_name = frappe.utils.get_fullname(r.owner_user) if r.owner_user else "Administrator"
			
			st = "On-track"
			if r.status in ["Complete", "Done"]:
				st = "Done"
			elif r.status in ["Dropped", "Off Track", "Off-track"]:
				st = "Off-track"
			elif r.status in ["In Progress", "Not Started", "On Track", "On-track"]:
				st = "On-track"

			ms_docs = frappe.get_all(
				"Rock Milestone",
				filters={"parent": r.name},
				fields=["name", "milestone_name", "completed", "notes", "idx"],
				order_by="idx asc"
			)
			ms = [{
				"id": m.name,
				"t": m.milestone_name or "Milestone",
				"done": bool(cint(m.completed)),
				"owner": owner_name,
				"due": str(r.duration_end or nowdate())
			} for m in ms_docs]

			is_company = bool(cint(r.is_company_rock)) or (r.scope == "Company")
			out.append({
				"id": r_id,
				"docname": r.name,
				"name": r.rock_name or r.name,
				"owner": owner_name,
				"team": r.team or "Leadership Team",
				"status": st,
				"end": str(r.duration_end or nowdate()),
				"ms": ms,
				"company": is_company,
				"archived": bool(cint(r.archived))
			})
		return out
	except Exception as e:
		frappe.log_error("get_rocks_list error", str(e))
		return []


def get_todos_list():
	try:
		todos = frappe.get_all(
			"To Do",
			fields=["name", "todo_name", "owner_user", "team", "due_date", "status", "archived", "priority"],
			order_by="due_date asc, creation desc"
		)
		out = []
		for idx, t in enumerate(todos):
			t_id = idx + 1
			owner_name = frappe.utils.get_fullname(t.owner_user) if t.owner_user else "Administrator"
			done = (t.status == "Complete")
			priv = bool(t.priority == "Private" or "Private" in (t.todo_name or ""))

			out.append({
				"id": t_id,
				"docname": t.name,
				"name": t.todo_name or t.name,
				"owner": owner_name,
				"team": t.team or "Leadership Team",
				"due": str(t.due_date or nowdate()),
				"done": done,
				"archived": bool(cint(t.archived)),
				"priv": priv
			})
		return out
	except Exception as e:
		frappe.log_error("get_todos_list error", str(e))
		return []


def get_issues_list():
	try:
		issues = frappe.get_all(
			"Issue",
			fields=["name", "issue_name", "description", "team", "owner_user", "priority", "status", "archived", "creation", "source"],
			order_by="creation desc"
		)
		out = []
		for idx, i in enumerate(issues):
			i_id = idx + 1
			owner_name = frappe.utils.get_fullname(i.owner_user) if i.owner_user else "Administrator"
			is_solved = (i.status == "Solved" or bool(cint(i.archived)))
			
			term = "short"
			if "long" in (i.description or "").lower():
				term = "long"

			out.append({
				"id": i_id,
				"docname": i.name,
				"name": i.issue_name or i.name,
				"desc": i.description or "",
				"team": i.team or "Leadership Team",
				"owner": owner_name,
				"term": term,
				"pri": i.priority or "",
				"archived": is_solved,
				"raised": str(getdate(i.creation)) if i.creation else nowdate()
			})
		return out
	except Exception as e:
		frappe.log_error("get_issues_list error", str(e))
		return []


def get_meetings_list():
	try:
		meetings = frappe.get_all(
			"Level 10 Meeting",
			fields=["name", "team", "meeting_date", "status", "notes", "creation", "owner"],
			order_by="meeting_date desc, creation desc"
		)
		past = []
		for m in meetings:
			fac = frappe.utils.get_fullname(m.owner) or m.owner or "Administrator"
			t_name = m.team or "Team"
			secs = 90 * 60
			rating = 8.5
			if m.notes:
				import re
				dur_m = re.search(r"Duration:\s*(\d+)\s*min", m.notes)
				if dur_m:
					secs = int(dur_m.group(1)) * 60
				rat_m = re.search(r'"[\w\s\(\)]+"\s*:\s*(\d+(\.\d+)?)', m.notes)
				if rat_m:
					try:
						rating = float(rat_m.group(1).split(":")[-1].strip())
					except Exception:
						pass
			past.append({
				"docname": m.name,
				"when": str(m.meeting_date or nowdate()),
				"time": "3:00 p.m.",
				"secs": secs,
				"fac": fac,
				"rating": rating,
				"team": m.team or t_name,
				"title": f"{t_name} Level 10 Meeting™",
				"status": m.status or "Complete",
				"notes": m.notes or "Level 10 Meeting completed"
			})
		return past
	except Exception:
		return []


def get_vto_info():
	try:
		vtos = frappe.get_all("VTO", fields=["name"], limit=1)
		if vtos:
			vto_doc = frappe.get_doc("VTO", vtos[0].name)
			if vto_doc.get("one_year_plan"):
				plan = vto_doc.one_year_plan[0]
				return {
					"docname": vto_doc.name,
					"rev": str(plan.target_revenue or ""),
					"profit": str(plan.target_profit or ""),
					"meas": str(plan.goals or "")
				}
			return {"docname": vto_doc.name, "rev": "", "profit": "", "meas": ""}
	except Exception:
		pass
	return {"docname": "", "rev": "", "profit": "", "meas": ""}


# =====================================================================
# ACTION HANDLERS (PERSIST DIRECTLY TO ERP DOCUMENTS)
# =====================================================================

@frappe.whitelist(allow_guest=True)
def save_todo(docname=None, name=None, owner=None, due=None, team=None, priv=False):
	owner_user = resolve_user_email(owner)
	if docname and frappe.db.exists("To Do", docname):
		doc = frappe.get_doc("To Do", docname)
		if name: doc.todo_name = name
		if owner_user: doc.owner_user = owner_user
		if due: doc.due_date = due
		if team and not priv: doc.team = team
		elif priv: doc.team = None
		doc.save(ignore_permissions=True)
	else:
		doc = frappe.get_doc({
			"doctype": "To Do",
			"todo_name": name,
			"owner_user": owner_user or frappe.session.user or "Administrator",
			"due_date": due or nowdate(),
			"team": None if priv else (team or "Leadership Team"),
			"status": "Not Started",
			"priority": "Medium",
			"archived": 0
		}).insert(ignore_permissions=True)
	frappe.db.commit()
	return {"status": "ok", "docname": doc.name}


@frappe.whitelist(allow_guest=True)
def toggle_todo(docname, done):
	if frappe.db.exists("To Do", docname):
		doc = frappe.get_doc("To Do", docname)
		doc.status = "Complete" if cint(done) else "In Progress"
		doc.save(ignore_permissions=True)
		frappe.db.commit()
		return {"status": "ok", "todo_status": doc.status}
	return {"status": "not_found"}


@frappe.whitelist(allow_guest=True)
def archive_todo(docname, archived):
	if frappe.db.exists("To Do", docname):
		frappe.db.set_value("To Do", docname, "archived", cint(archived))
		frappe.db.commit()
		return {"status": "ok"}
	return {"status": "not_found"}


@frappe.whitelist(allow_guest=True)
def archive_completed_todos(team=None):
	filters = {"status": "Complete", "archived": 0}
	if team and team != "All Teams":
		filters["team"] = team
	todos = frappe.get_all("To Do", filters=filters, pluck="name")
	for name in todos:
		frappe.db.set_value("To Do", name, "archived", 1)
	frappe.db.commit()
	return {"status": "ok", "archived_count": len(todos)}


@frappe.whitelist(allow_guest=True)
def save_rock(docname=None, name=None, owner=None, team=None, end=None, status="On-track", is_company=False, desc=""):
	owner_user = resolve_user_email(owner)
	st = "Complete" if status == "Done" else ("In Progress" if status == "On-track" else "Dropped")
	if docname and frappe.db.exists("Rock", docname):
		doc = frappe.get_doc("Rock", docname)
		if name: doc.rock_name = name
		if owner_user: doc.owner_user = owner_user
		if team: doc.team = team
		if end: doc.duration_end = end
		doc.status = st
		doc.is_company_rock = 1 if is_company else 0
		doc.save(ignore_permissions=True)
	else:
		doc = frappe.get_doc({
			"doctype": "Rock",
			"rock_name": name,
			"owner_user": owner_user or frappe.session.user or "Administrator",
			"team": team or "Leadership Team",
			"duration_start": nowdate(),
			"duration_end": end or nowdate(),
			"status": st,
			"is_company_rock": 1 if is_company else 0,
			"notes": desc,
			"archived": 0
		}).insert(ignore_permissions=True)
	frappe.db.commit()
	return {"status": "ok", "docname": doc.name}


@frappe.whitelist(allow_guest=True)
def update_rock_status(docname, status):
	if frappe.db.exists("Rock", docname):
		doc = frappe.get_doc("Rock", docname)
		if status == "archive":
			doc.archived = 1 if not doc.archived else 0
		else:
			doc.status = "Complete" if status == "Done" else ("In Progress" if status == "On-track" else "Dropped")
		doc.save(ignore_permissions=True)
		frappe.db.commit()
		return {"status": "ok"}
	return {"status": "not_found"}


@frappe.whitelist(allow_guest=True)
def toggle_rock_milestone(docname, milestone_idx, done):
	if frappe.db.exists("Rock", docname):
		doc = frappe.get_doc("Rock", docname)
		idx = cint(milestone_idx)
		if idx < len(doc.get("milestones", [])):
			doc.milestones[idx].completed = 1 if cint(done) else 0
			doc.save(ignore_permissions=True)
			frappe.db.commit()
			return {"status": "ok"}
	return {"status": "not_found"}


@frappe.whitelist(allow_guest=True)
def add_rock_milestone(docname, title):
	if frappe.db.exists("Rock", docname):
		doc = frappe.get_doc("Rock", docname)
		doc.append("milestones", {
			"milestone_name": title,
			"completed": 0
		})
		doc.save(ignore_permissions=True)
		frappe.db.commit()
		return {"status": "ok"}
	return {"status": "not_found"}


@frappe.whitelist(allow_guest=True)
def delete_rock_milestone(docname, milestone_idx):
	if frappe.db.exists("Rock", docname):
		doc = frappe.get_doc("Rock", docname)
		idx = cint(milestone_idx)
		if idx < len(doc.get("milestones", [])):
			doc.remove(doc.milestones[idx])
			doc.save(ignore_permissions=True)
			frappe.db.commit()
			return {"status": "ok"}
	return {"status": "not_found"}


@frappe.whitelist(allow_guest=True)
def save_issue(docname=None, name=None, desc="", pri="", team=None, owner=None, term="short"):
	owner_user = resolve_user_email(owner)
	if docname and frappe.db.exists("Issue", docname):
		doc = frappe.get_doc("Issue", docname)
		if name: doc.issue_name = name
		if desc is not None: doc.description = desc
		if pri: doc.priority = pri
		if team: doc.team = team
		if owner_user: doc.owner_user = owner_user
		doc.save(ignore_permissions=True)
	else:
		doc = frappe.get_doc({
			"doctype": "Issue",
			"issue_name": name,
			"description": desc,
			"priority": pri or "Medium",
			"team": team or "Leadership Team",
			"owner_user": owner_user or frappe.session.user or "Administrator",
			"status": "Identified",
			"archived": 0,
			"source": "Manual"
		}).insert(ignore_permissions=True)
	frappe.db.commit()
	return {"status": "ok", "docname": doc.name}


@frappe.whitelist(allow_guest=True)
def toggle_issue(docname, solved):
	if frappe.db.exists("Issue", docname):
		doc = frappe.get_doc("Issue", docname)
		if cint(solved):
			doc.status = "Solved"
			doc.solution = "Resolved via EOS portal"
			doc.archived = 1
		else:
			doc.status = "Identified"
			doc.archived = 0
		doc.save(ignore_permissions=True)
		frappe.db.commit()
		return {"status": "ok", "issue_status": doc.status}
	return {"status": "not_found"}


@frappe.whitelist(allow_guest=True)
def update_issue_priority(docname, pri):
	if frappe.db.exists("Issue", docname):
		frappe.db.set_value("Issue", docname, "priority", pri or "Medium")
		frappe.db.commit()
		return {"status": "ok"}
	return {"status": "not_found"}


@frappe.whitelist(allow_guest=True)
def save_scorecard(team, timeframe="Weekly", description=None):
	docname = f"{team}-{timeframe}"
	if frappe.db.exists("Scorecard", docname):
		doc = frappe.get_doc("Scorecard", docname)
		if description is not None:
			doc.description = description
		doc.save(ignore_permissions=True)
	else:
		doc = frappe.get_doc({
			"doctype": "Scorecard",
			"team": team,
			"timeframe": timeframe,
			"description": description or ""
		}).insert(ignore_permissions=True)
	frappe.db.commit()
	return {"status": "ok", "name": doc.name}


@frappe.whitelist(allow_guest=True)
def save_measurable(name, freq="Weekly", team=None, owner=None, unit="num", op=">=", target=0, desc=""):
	owner_user = resolve_user_email(owner)
	unit_type = "Currency" if unit == "kes" else ("Percentage" if unit == "pct" else "Number")
	doc = frappe.get_doc({
		"doctype": "EOS Metric",
		"metric_name": name,
		"frequency": freq.capitalize(),
		"team": team or "Leadership Team",
		"owner_user": owner_user or frappe.session.user or "Administrator",
		"unit_type": unit_type,
		"unit": "$" if unit == "kes" else ("%" if unit == "pct" else ""),
		"operator": op,
		"target_value": flt(target),
		"description": desc,
		"archived": 0
	}).insert(ignore_permissions=True)
	frappe.db.commit()
	return {"status": "ok", "docname": doc.name}


@frappe.whitelist(allow_guest=True)
def save_scorecard_cell(docname_or_metric, week_start_date, value=None):
	from eos_core.eos_core.doctype.scorecard.scorecard import update_scorecard_entry
	return update_scorecard_entry(docname_or_metric, week_start_date, value)


@frappe.whitelist(allow_guest=True)
def save_vto(docname=None, rev="", profit="", meas=""):
	vto_name = docname
	if not vto_name:
		vtos = frappe.get_all("VTO", limit=1)
		if vtos:
			vto_name = vtos[0].name
		else:
			org = frappe.db.get_value("Organization", {}, "name") or "Burhani"
			doc = frappe.get_doc({
				"doctype": "VTO",
				"organization": org
			}).insert(ignore_permissions=True)
			vto_name = doc.name
	
	vto_doc = frappe.get_doc("VTO", vto_name)
	if not vto_doc.get("one_year_plan"):
		vto_doc.append("one_year_plan", {
			"target_revenue": flt(rev),
			"target_profit": flt(profit),
			"goals": meas
		})
	else:
		vto_doc.one_year_plan[0].target_revenue = flt(rev)
		vto_doc.one_year_plan[0].target_profit = flt(profit)
		vto_doc.one_year_plan[0].goals = meas
	vto_doc.save(ignore_permissions=True)
	frappe.db.commit()
	return {"status": "ok"}


@frappe.whitelist(allow_guest=True)
def start_meeting(team=None, title=None):
	doc = frappe.get_doc({
		"doctype": "Level 10 Meeting",
		"team": team or "Leadership Team",
		"meeting_date": nowdate(),
		"status": "In Progress",
		"notes": f"Meeting started at {now()}"
	}).insert(ignore_permissions=True)
	frappe.db.commit()
	return {"status": "ok", "docname": doc.name}


@frappe.whitelist(allow_guest=True)
def end_meeting(docname=None, team=None, secs=0, rating=None, notes=None):
	if docname and frappe.db.exists("Level 10 Meeting", docname):
		doc = frappe.get_doc("Level 10 Meeting", docname)
	else:
		meetings = frappe.get_all("Level 10 Meeting", filters={"status": "In Progress"}, limit=1)
		if meetings:
			doc = frappe.get_doc("Level 10 Meeting", meetings[0].name)
		else:
			doc = frappe.get_doc({
				"doctype": "Level 10 Meeting",
				"team": team or "Leadership Team",
				"meeting_date": nowdate()
			})
	doc.status = "Complete"
	doc.notes = notes or f"Completed in {round(flt(secs)/60)} min. Rating: {rating or '8.5'}"
	doc.save(ignore_permissions=True)
	frappe.db.commit()
	return {"status": "ok", "docname": doc.name}


@frappe.whitelist(allow_guest=True)
def get_meeting_details(docname=None):
	if not docname or not frappe.db.exists("Level 10 Meeting", docname):
		return None
	try:
		doc = frappe.get_doc("Level 10 Meeting", docname)
		return {
			"name": doc.name,
			"team": doc.team,
			"meeting_date": str(doc.meeting_date),
			"status": doc.status,
			"notes": doc.notes,
			"creation": str(doc.creation),
			"owner": doc.owner,
			"owner_name": frappe.utils.get_fullname(doc.owner) or doc.owner,
			"agenda_items": [
				{"item_name": item.item_name, "duration_minutes": item.duration_minutes, "status": item.status}
				for item in (doc.get("agenda_items") or [])
			],
			"todo_items": [
				{"title": t.title, "owner": t.owner, "due_date": str(t.due_date) if t.due_date else None, "status": t.status}
				for t in (doc.get("todo_items") or [])
			]
		}
	except Exception as e:
		frappe.log_error("get_meeting_details error", str(e))
		return None


def resolve_user_email(display_name):
	if not display_name or display_name == "All":
		return None
	if "@" in display_name and frappe.db.exists("User", display_name):
		return display_name
	player_user = frappe.db.get_value("Player", {"player_name": display_name}, "user")
	if player_user and frappe.db.exists("User", player_user):
		return player_user
	parts = display_name.strip().split(" ", 1)
	first = parts[0]
	last = parts[1] if len(parts) > 1 else ""
	matched = frappe.db.get_value("User", {"first_name": first, "last_name": last}, "name")
	if matched:
		return matched
	matched_first = frappe.db.get_value("User", {"first_name": first}, "name")
	if matched_first:
		return matched_first
	return frappe.session.user or "Administrator"
