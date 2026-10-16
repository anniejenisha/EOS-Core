import json
import re
import frappe
from frappe import _
from frappe.utils import add_days, getdate, nowdate, now, flt, cint

@frappe.whitelist(allow_guest=True)
def get_eos_bootstrap(user_email=None):
	"""
	Unified bootstrap method returning live database data from Frappe DocTypes.
	No hardcoded data.
	"""
	if not user_email:
		user_email = frappe.form_dict.get("user") or frappe.form_dict.get("user_email")
	user_info = get_current_user_info(user_email=user_email)
	user_id = user_info.get("id")
	is_admin = bool(user_info.get("is_admin", False))
	allocated_teams = get_user_allocated_teams(user_id) if not is_admin else None
	leader_teams = get_user_leader_teams(user_id)
	user_info["leader_teams"] = leader_teams

	return {
		"user": user_info,
		"teams": get_teams_list(is_admin=is_admin, user_id=user_id, allocated_teams=allocated_teams),
		"leader_teams": leader_teams,
		"team_members": get_team_members_map(),
		"people": get_people_list(),
		"scorecards": get_scorecards_list(is_admin=is_admin, allocated_teams=allocated_teams),
		"measurables": get_measurables_list(is_admin=is_admin, allocated_teams=allocated_teams),
		"rocks": get_rocks_list(is_admin=is_admin, allocated_teams=allocated_teams),
		"todos": get_todos_list(is_admin=is_admin, allocated_teams=allocated_teams),
		"issues": get_issues_list(is_admin=is_admin, allocated_teams=allocated_teams),
		"meetings": get_meetings_list(is_admin=is_admin, allocated_teams=allocated_teams),
		"vto": get_vto_info(),
	}


def get_current_user_info(user_email=None):
	user = user_email or frappe.form_dict.get("user") or frappe.form_dict.get("user_email") or frappe.session.user
	if user and user != "Guest":
		matched_user = None
		if frappe.db.exists("User", user):
			matched_user = user
		else:
			matched_user = frappe.db.get_value("User", {"email": user}, "name")
			if not matched_user:
				# Try prefix match against User records (e.g. "annie.jenisha" vs "anniejenisha.p@gmail.com")
				user_prefix = user.split("@")[0].lower()
				clean_prefix = re.sub(r'[^a-z0-9]', '', user_prefix)
				if clean_prefix and len(clean_prefix) >= 3:
					all_users = frappe.db.sql("""
						SELECT name, email, full_name FROM `tabUser`
						WHERE enabled = 1 AND name != 'Guest'
					""", as_dict=True)
					for u in all_users:
						u_prefix = (u.email or u.name).split("@")[0].lower()
						u_clean = re.sub(r'[^a-z0-9]', '', u_prefix)
						if u_clean and (u_clean == clean_prefix or u_clean in clean_prefix or clean_prefix in u_clean):
							matched_user = u.name
							break

		if matched_user and frappe.db.exists("User", matched_user):
			is_admin = (matched_user == "Administrator")
			fullname = frappe.utils.get_fullname(matched_user) or matched_user
			return {
				"id": matched_user,
				"name": fullname,
				"initial": (fullname[0] if fullname else "U").upper(),
				"email": user,
				"is_admin": is_admin
			}
		elif "@" in user:
			parts = user.split("@")[0].replace(".", " ").replace("_", " ").split()
			fullname = " ".join([p.capitalize() for p in parts]) or user
			return {
				"id": user,
				"name": fullname,
				"initial": (fullname[0] if fullname else "U").upper(),
				"email": user,
				"is_admin": False
			}
	return {
		"id": "Guest",
		"name": "Guest",
		"initial": "G",
		"email": "",
		"is_admin": False
	}


def get_user_leader_teams(user_id):
	if not user_id or user_id == "Guest":
		return []
	try:
		if user_id == "Administrator":
			teams = frappe.get_all("Team", filters={"archived": 0}, fields=["team_name", "name"])
			return [t.team_name or t.name for t in teams if t.team_name or t.name]

		fullname = frappe.utils.get_fullname(user_id) or user_id
		prefix = user_id.split("@")[0].lower() if "@" in user_id else user_id.lower()
		clean_prefix = re.sub(r'[^a-z0-9]', '', prefix)

		teams = frappe.get_all("Team", filters={"archived": 0}, fields=["name", "team_name", "leader", "owner"])
		lead_teams = set()
		for t in teams:
			t_name = t.team_name or t.name
			leader = str(t.leader or "").strip()
			if not leader:
				continue
			if user_id.lower() == leader.lower() or fullname.lower() == leader.lower():
				lead_teams.add(t_name)
				continue
			clean_leader = re.sub(r'\s*\([^)]*\)\s*', ' ', leader).strip().lower()
			if fullname.lower() == clean_leader or (clean_prefix and clean_prefix in re.sub(r'[^a-z0-9]', '', clean_leader)):
				lead_teams.add(t_name)
				continue
			player_user = frappe.db.get_value("Player", {"player_name": leader}, "user")
			if player_user and (player_user.lower() == user_id.lower() or (clean_prefix and clean_prefix in player_user.lower())):
				lead_teams.add(t_name)
				continue

		return sorted(list(lead_teams))
	except Exception as e:
		frappe.log_error("get_user_leader_teams error", str(e))
		return []


def get_user_allocated_teams(user_id):
	if not user_id or user_id == "Guest":
		return []
	try:
		all_alloc = set()
		player_teams = frappe.db.sql("""
			SELECT DISTINCT team FROM `tabPlayer`
			WHERE (user = %s OR player_name = %s) AND archived = 0 AND team IS NOT NULL AND team != ''
		""", (user_id, user_id), as_dict=True)
		for r in player_teams:
			if r.get("team"):
				all_alloc.add(r["team"])

		fullname = frappe.utils.get_fullname(user_id)
		if fullname and fullname != user_id:
			name_teams = frappe.db.sql("""
				SELECT DISTINCT team FROM `tabPlayer`
				WHERE (user = %s OR player_name = %s) AND archived = 0 AND team IS NOT NULL AND team != ''
			""", (fullname, fullname), as_dict=True)
			for r in name_teams:
				if r.get("team"):
					all_alloc.add(r["team"])

		# Fuzzy match on clean prefix against player_name or user in tabPlayer
		prefix = user_id.split("@")[0].lower() if "@" in user_id else user_id.lower()
		clean_prefix = re.sub(r'[^a-z0-9]', '', prefix)
		if clean_prefix and len(clean_prefix) >= 3:
			all_players = frappe.db.sql("""
				SELECT team, user, player_name FROM `tabPlayer`
				WHERE archived = 0 AND team IS NOT NULL AND team != ''
			""", as_dict=True)
			for p in all_players:
				p_name_clean = re.sub(r'[^a-z0-9]', '', (p.player_name or '').lower())
				p_user_clean = re.sub(r'[^a-z0-9]', '', (p.user or '').split('@')[0].lower())
				if (clean_prefix in p_name_clean) or (clean_prefix in p_user_clean) or (p_user_clean and p_user_clean in clean_prefix):
					if p.get("team"):
						all_alloc.add(p["team"])

		# Teams where user is Leader or Owner
		leader_teams = frappe.db.sql("""
			SELECT DISTINCT COALESCE(NULLIF(team_name, ''), name) as team FROM `tabTeam`
			WHERE (leader = %s OR owner = %s) AND archived = 0
		""", (user_id, user_id), as_dict=True)
		for r in leader_teams:
			if r.get("team"):
				all_alloc.add(r["team"])

		return sorted(list(all_alloc))
	except Exception as e:
		frappe.log_error("get_user_allocated_teams error", str(e))
		return []


def get_teams_list(is_admin=True, user_id=None, allocated_teams=None):
	try:
		if not is_admin and allocated_teams is not None:
			if allocated_teams:
				return allocated_teams
			return []

		teams = frappe.get_all("Team", filters={"archived": 0}, fields=["team_name", "name"], order_by="team_name asc")
		names = [t.team_name or t.name for t in teams if t.team_name or t.name]
		if not names:
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


def get_team_members_map():
	try:
		players = frappe.db.sql("""
			SELECT p.team, p.user,
				COALESCE(NULLIF(TRIM(CONCAT(u.first_name, ' ', COALESCE(u.last_name, ''))), ''), u.name, p.player_name) as fullname
			FROM `tabPlayer` p
			LEFT JOIN `tabUser` u ON u.name = p.user
			WHERE p.archived = 0
			ORDER BY fullname asc
		""", as_dict=True)
		team_map = {}
		for p in players:
			if not p.team:
				continue
			if p.team not in team_map:
				team_map[p.team] = []
			name = p.fullname
			if name and name not in team_map[p.team]:
				team_map[p.team].append(name)

		# Also ensure Team leaders are included in their team's member list
		leaders = frappe.db.sql("""
			SELECT COALESCE(NULLIF(t.team_name, ''), t.name) as team,
				COALESCE(NULLIF(TRIM(CONCAT(u.first_name, ' ', COALESCE(u.last_name, ''))), ''), u.name) as fullname
			FROM `tabTeam` t
			JOIN `tabUser` u ON u.name = t.leader
			WHERE t.archived = 0 AND t.leader IS NOT NULL AND t.leader != ''
		""", as_dict=True)
		for l in leaders:
			tm = l.get("team")
			fn = l.get("fullname")
			if tm and fn:
				if tm not in team_map:
					team_map[tm] = []
				if fn not in team_map[tm]:
					team_map[tm].append(fn)

		return team_map
	except Exception as e:
		frappe.log_error("get_team_members_map error", str(e))
		return {}


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


def get_scorecards_list(is_admin=True, allocated_teams=None):
	try:
		filters = {}
		if not is_admin and allocated_teams is not None:
			filters["team"] = ["in", allocated_teams] if allocated_teams else ["in", ["__NONE__"]]
		scorecards = frappe.get_all(
			"Scorecard",
			filters=filters,
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


def get_measurables_list(is_admin=True, allocated_teams=None):
	try:
		filters = {"archived": 0}
		if not is_admin and allocated_teams is not None:
			filters["team"] = ["in", allocated_teams] if allocated_teams else ["in", ["__NONE__"]]

		metrics = frappe.get_all(
			"EOS Metric",
			filters=filters,
			fields=["name", "metric_name", "frequency", "team", "owner_user", "operator", "target_value", "unit", "unit_type", "rollup"],
			order_by="creation asc"
		)
		
		today = getdate(nowdate())
		mon_delta = today.weekday()
		current_mon = add_days(today, -mon_delta)
		weekly_dates = [str(add_days(current_mon, -7 * i)) for i in range(52)]
		
		# Monthly dates: 1st of each month
		monthly_dates = []
		cur_y = today.year
		cur_m = today.month
		for _ in range(24):
			monthly_dates.append(f"{cur_y:04d}-{cur_m:02d}-01")
			cur_m -= 1
			if cur_m < 1:
				cur_m = 12
				cur_y -= 1
		
		# Quarterly dates: 1st of each quarter
		quarterly_dates = []
		cur_y = today.year
		cur_q = (today.month - 1) // 3
		for _ in range(12):
			quarterly_dates.append(f"{cur_y:04d}-{(cur_q * 3 + 1):02d}-01")
			cur_q -= 1
			if cur_q < 0:
				cur_q = 3
				cur_y -= 1
				
		# Annual dates: Jan 1 of each year
		annual_dates = [f"{(today.year - i):04d}-01-01" for i in range(10)]

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
			
			w_vals = [val_map.get(d, None) for d in weekly_dates[:13]]
			m_vals = [val_map.get(d, None) for d in monthly_dates[:12]]
			q_vals = [val_map.get(d, None) for d in quarterly_dates[:8]]
			a_vals = [val_map.get(d, None) for d in annual_dates[:5]]

			if freq == "monthly":
				vals = m_vals
			elif freq == "quarterly":
				vals = q_vals
			elif freq == "annual":
				vals = a_vals
			else:
				vals = w_vals

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
				"owner_user": m.owner_user or "",
				"op": m.operator or ">=",
				"target": flt(m.target_value),
				"unit": unit,
				"noTotal": (unit == "pct" or m.rollup == "Average"),
				"vals": vals,
				"monthly_vals": m_vals,
				"quarterly_vals": q_vals,
				"annual_vals": a_vals
			})
		return out
	except Exception as e:
		frappe.log_error("get_measurables_list error", str(e))
		return []


def get_rocks_list(is_admin=True, allocated_teams=None):
	try:
		filters = {}
		if not is_admin and allocated_teams is not None:
			filters["team"] = ["in", allocated_teams] if allocated_teams else ["in", ["__NONE__"]]
		rocks = frappe.get_all(
			"Rock",
			filters=filters,
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
				"owner_user": r.owner_user or "",
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


def get_todos_list(is_admin=True, allocated_teams=None):
	try:
		filters = {}
		if not is_admin and allocated_teams is not None:
			filters["team"] = ["in", allocated_teams] if allocated_teams else ["in", ["__NONE__"]]
		todos = frappe.get_all(
			"To Do",
			filters=filters,
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
				"owner_user": t.owner_user or "",
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


def get_issues_list(is_admin=True, allocated_teams=None):
	try:
		filters = {}
		if not is_admin and allocated_teams is not None:
			filters["team"] = ["in", allocated_teams] if allocated_teams else ["in", ["__NONE__"]]
		issues = frappe.get_all(
			"Issue",
			filters=filters,
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
				"owner_user": i.owner_user or "",
				"term": term,
				"pri": i.priority or "",
				"archived": is_solved,
				"raised": str(getdate(i.creation)) if i.creation else nowdate()
			})
		return out
	except Exception as e:
		frappe.log_error("get_issues_list error", str(e))
		return []


def get_meetings_list(is_admin=True, allocated_teams=None):
	try:
		filters = {}
		if not is_admin and allocated_teams is not None:
			filters["team"] = ["in", allocated_teams] if allocated_teams else ["in", ["__NONE__"]]
		meetings = frappe.get_all(
			"Level 10 Meeting",
			filters=filters,
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


def ensure_player_in_team(user, team):
	if not user or not team:
		return
	if frappe.db.exists("Player", {"user": user, "team": team}):
		return
	fullname = frappe.utils.get_fullname(user) or user
	player_name = f"{fullname} ({team})"
	if frappe.db.exists("Player", player_name):
		player_name = f"{fullname} ({team}) - {frappe.generate_hash()[:4]}"
	try:
		frappe.get_doc({
			"doctype": "Player",
			"player_name": player_name,
			"user": user,
			"team": team
		}).insert(ignore_permissions=True)
	except Exception:
		pass


@frappe.whitelist(allow_guest=True)
def save_measurable(name, freq="Weekly", team=None, owner=None, unit="num", op=">=", target=0, desc="", docname=None):
	owner_user = resolve_user_email(owner) or frappe.session.user or "Administrator"
	target_team = team or "Leadership Team"
	if target_team and not frappe.db.exists("Team", target_team):
		try:
			frappe.get_doc({
				"doctype": "Team",
				"team_name": target_team
			}).insert(ignore_permissions=True)
		except Exception:
			pass
	ensure_player_in_team(owner_user, target_team)

	unit_type = "Currency" if unit == "kes" else ("Percentage" if unit == "pct" else "Number")
	
	existing_name = docname
	if not existing_name and frappe.db.exists("EOS Metric", name):
		existing_name = name
	elif not existing_name and frappe.db.exists("EOS Metric", {"metric_name": name}):
		existing_name = frappe.db.get_value("EOS Metric", {"metric_name": name}, "name")

	op_str = str(op or ">=").strip()
	if op_str in ("=", "=="):
		op_str = "=="
	elif op_str in (">", ">="):
		op_str = ">="
	elif op_str in ("<", "<="):
		op_str = "<="
	elif op_str not in (">=", "<=", "==", "Inside min/max", "Outside min/max"):
		op_str = ">="

	if existing_name and frappe.db.exists("EOS Metric", existing_name):
		doc = frappe.get_doc("EOS Metric", existing_name)
		doc.metric_name = name
		doc.frequency = freq.capitalize()
		doc.team = target_team
		doc.owner_user = owner_user
		doc.unit_type = unit_type
		doc.unit = "$" if unit == "kes" else ("%" if unit == "pct" else "")
		doc.operator = op_str
		doc.target_value = flt(target)
		doc.description = desc
		doc.archived = 0
		doc.save(ignore_permissions=True)
	else:
		doc = frappe.get_doc({
			"doctype": "EOS Metric",
			"metric_name": name,
			"frequency": freq.capitalize(),
			"team": target_team,
			"owner_user": owner_user,
			"unit_type": unit_type,
			"unit": "$" if unit == "kes" else ("%" if unit == "pct" else ""),
			"operator": op_str,
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
	clean_name = re.sub(r'\s*\([^)]*\)\s*', ' ', display_name).strip()
	clean_player_user = frappe.db.get_value("Player", {"player_name": clean_name}, "user")
	if clean_player_user and frappe.db.exists("User", clean_player_user):
		return clean_player_user
	parts = clean_name.split(" ", 1)
	first = parts[0]
	last = parts[1] if len(parts) > 1 else ""
	matched = frappe.db.get_value("User", {"first_name": first, "last_name": last}, "name")
	if matched:
		return matched
	matched_first = frappe.db.get_value("User", {"first_name": first}, "name")
	if matched_first:
		return matched_first
	return frappe.session.user or "Administrator"
