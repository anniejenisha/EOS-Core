import frappe
from frappe.model.document import Document


class Team(Document):
	def validate(self):
		self.validate_parent_team()

	def validate_parent_team(self):
		if not self.parent_team:
			return
		identity = self.name or self.team_name
		organization = self.organization
		current = self.parent_team
		seen = set()
		while current:
			if current == identity:
				frappe.throw("Team cannot be its own parent")
			if current in seen:
				break
			seen.add(current)
			parent = frappe.db.get_value("Team", current, ["organization", "parent_team"], as_dict=True)
			if not parent:
				frappe.throw(
					f"Parent team {frappe.bold(current)} no longer exists. "
					"Reassign the parent team before saving."
				)
			if organization and parent.organization and parent.organization != organization:
				frappe.throw("Parent team belongs to a different organization")
			current = parent.parent_team


DEFAULT_SCORECARD_SETTINGS = {
	"show_owner": True,
	"show_goal": True,
	"show_rollup": True,
	"show_current_period": True,
	"show_status_colors": True,
	"default_timeframe": "Weekly",
}


@frappe.whitelist()
def get_scorecard_settings(team_name=None):
	if not team_name or not frappe.db.exists("Team", team_name):
		return dict(DEFAULT_SCORECARD_SETTINGS, team=team_name, is_override=False)

	if not frappe.has_permission("Team", "read", doc=team_name):
		frappe.throw(
			f"No permission to read team {frappe.bold(team_name)}.",
			frappe.PermissionError,
		)

	team = frappe.db.get_value(
		"Team",
		team_name,
		[
			"show_owner",
			"show_goal",
			"show_rollup",
			"show_current_period",
			"show_status_colors",
			"default_timeframe",
		],
		as_dict=True,
	)

	return {
		"team": team_name,
		"show_owner": bool(team.show_owner) if team.show_owner is not None else True,
		"show_goal": bool(team.show_goal) if team.show_goal is not None else True,
		"show_rollup": bool(team.show_rollup) if team.show_rollup is not None else True,
		"show_current_period": bool(team.show_current_period) if team.show_current_period is not None else True,
		"show_status_colors": bool(team.show_status_colors) if team.show_status_colors is not None else True,
		"default_timeframe": team.default_timeframe or "Weekly",
		"is_override": True,
	}


@frappe.whitelist()
def update_scorecard_settings(team_name, settings=None, **kwargs):
	if not frappe.db.exists("Team", team_name):
		frappe.throw(f"Team {frappe.bold(team_name)} not found.")

	if not frappe.has_permission("Team", "write", doc=team_name):
		frappe.throw(
			"No permission to update team scorecard settings.",
			frappe.PermissionError,
		)

	data = settings or kwargs
	if isinstance(data, str):
		import json

		data = json.loads(data)

	team_doc = frappe.get_doc("Team", team_name)
	for key in (
		"show_owner",
		"show_goal",
		"show_rollup",
		"show_current_period",
		"show_status_colors",
	):
		if key in data:
			setattr(team_doc, key, 1 if data[key] else 0)

	if "default_timeframe" in data:
		team_doc.default_timeframe = data["default_timeframe"]

	team_doc.save()
	return get_scorecard_settings(team_name)