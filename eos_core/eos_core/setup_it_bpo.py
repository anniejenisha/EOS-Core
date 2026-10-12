import frappe


def setup_it_bpo_team():
	team_names = ["IT & BPO", "BPO and IT"]
	
	users_to_ensure = [
		{"email": "dennis.ochieng@bpo.com", "first_name": "Dennis", "last_name": "Ochieng"},
		{"email": "maureen.ndunge@bpo.com", "first_name": "Maureen", "last_name": "Ndunge"},
		{"email": "stacy.katembu@bpo.com", "first_name": "Stacy", "last_name": "Katembu"},
		{"email": "mustansir.hussein@bpo.com", "first_name": "Mustansir", "last_name": "Hussein"},
		{"email": "anniejenisha.p@gmail.com", "first_name": "Annie", "last_name": "Jenisha"},
	]

	print("--- Ensuring Users ---")
	for u_data in users_to_ensure:
		email = u_data["email"]
		if not frappe.db.exists("User", email):
			try:
				user = frappe.get_doc({
					"doctype": "User",
					"email": email,
					"first_name": u_data["first_name"],
					"last_name": u_data["last_name"],
					"send_welcome_email": 0,
					"user_type": "System User",
					"roles": [{"role": "Team Member"}]
				})
				user.insert(ignore_permissions=True)
				print(f"Created user: {email}")
			except Exception as e:
				print(f"User error ({email}): {e}")
		else:
			# ensure role
			u = frappe.get_doc("User", email)
			roles = [r.role for r in u.roles]
			if "Team Member" not in roles:
				u.append("roles", {"role": "Team Member"})
				if email == "anniejenisha.p@gmail.com":
					if "Manager" not in roles:
						u.append("roles", {"role": "Manager"})
					if "Admin" not in roles:
						u.append("roles", {"role": "Admin"})
					if "Owner" not in roles:
						u.append("roles", {"role": "Owner"})
				u.save(ignore_permissions=True)
				print(f"Updated roles for: {email}")

	print("--- Ensuring Teams ---")
	for t_name in team_names:
		if not frappe.db.exists("Team", t_name):
			try:
				team = frappe.get_doc({
					"doctype": "Team",
					"team_name": t_name,
					"default_timeframe": "Weekly",
					"archived": 0
				})
				team.insert(ignore_permissions=True)
				print(f"Created Team: {t_name}")
			except Exception as e:
				print(f"Team error ({t_name}): {e}")
		else:
			frappe.db.set_value("Team", t_name, "archived", 0)

	print("--- Ensuring Players ---")
	leader_player_name = None
	for t_name in team_names:
		for u_data in users_to_ensure:
			email = u_data["email"]
			full_name = f"{u_data['first_name']} {u_data['last_name']}".strip()
			p_name = f"{full_name} ({t_name})"
			if not frappe.db.exists("Player", {"user": email, "team": t_name}):
				try:
					player = frappe.get_doc({
						"doctype": "Player",
						"player_name": p_name,
						"user": email,
						"team": t_name,
						"seat": "Leader" if email == "anniejenisha.p@gmail.com" else "Team Member",
						"archived": 0
					})
					player.insert(ignore_permissions=True)
					print(f"Created Player: {p_name}")
					if email == "anniejenisha.p@gmail.com" and t_name == "IT & BPO":
						leader_player_name = p_name
				except Exception as e:
					print(f"Player error ({p_name}): {e}")
			else:
				existing_p = frappe.db.get_value("Player", {"user": email, "team": t_name}, "player_name")
				if email == "anniejenisha.p@gmail.com" and t_name == "IT & BPO":
					leader_player_name = existing_p

		# set leader on Team
		if leader_player_name and frappe.db.exists("Player", leader_player_name):
			frappe.db.set_value("Team", t_name, "leader", leader_player_name)

	print("--- Ensuring Scorecards & Groups ---")
	for t_name in team_names:
		for tf in ["Weekly", "Monthly", "Quarterly", "Annual"]:
			sc_name = f"{t_name}-{tf}"
			if not frappe.db.exists("Scorecard", sc_name):
				try:
					sc = frappe.get_doc({
						"doctype": "Scorecard",
						"team": t_name,
						"timeframe": tf,
						"archived": 0
					})
					sc.insert(ignore_permissions=True)
					print(f"Created Scorecard: {sc_name}")
				except Exception as e:
					print(f"Scorecard error ({sc_name}): {e}")
			
			# Ensure group for Weekly
			if tf == "Weekly":
				grp_name = f"{t_name} Core KPIs"
				if not frappe.db.exists("Measurable Group", {"scorecard": sc_name}):
					try:
						grp = frappe.get_doc({
							"doctype": "Measurable Group",
							"group_name": grp_name,
							"scorecard": sc_name,
							"order": 1,
							"archived": 0
						})
						grp.insert(ignore_permissions=True)
						print(f"Created Group: {grp_name}")
					except Exception as e:
						print(f"Group error: {e}")

	frappe.db.commit()
	print("--- Setup Complete ---")
