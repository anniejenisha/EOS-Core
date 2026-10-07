import frappe
from frappe.tests import IntegrationTestCase


class TestTeam(IntegrationTestCase):
	def setUp(self):
		frappe.db.delete("Player")
		frappe.db.delete("Team")
		frappe.db.delete("Organization")

	def test_cycle_prevented(self):
		with self.assertRaises(frappe.ValidationError):
			doc = frappe.get_doc(
				{"doctype": "Team", "team_name": "GM Cycle", "parent_team": "GM Cycle"}
			)
			doc.insert()

	def test_org_mismatch_prevented(self):
		org_a = frappe.get_doc({"doctype": "Organization", "organization_name": "GM Org A"}).insert()
		org_b = frappe.get_doc({"doctype": "Organization", "organization_name": "GM Org B"}).insert()
		parent = frappe.get_doc(
			{"doctype": "Team", "team_name": "GM Parent", "organization": org_a.name}
		).insert()
		with self.assertRaises(frappe.ValidationError):
			child = frappe.get_doc(
				{
					"doctype": "Team",
					"team_name": "GM Child",
					"organization": org_b.name,
					"parent_team": parent.name,
				}
			)
			child.insert()

	def test_valid_hierarchy(self):
		org = frappe.get_doc({"doctype": "Organization", "organization_name": "GM Org"}).insert()
		leadership = frappe.get_doc(
			{"doctype": "Team", "team_name": "GM Leadership", "organization": org.name}
		).insert()
		dept = frappe.get_doc(
			{
				"doctype": "Team",
				"team_name": "GM Dept",
				"organization": org.name,
				"parent_team": leadership.name,
			}
		).insert()
		self.assertEqual(dept.parent_team, leadership.name)

	def test_dangling_grandparent_raises_validation_error(self):
		org = frappe.get_doc({"doctype": "Organization", "organization_name": "GM Dangling Org"}).insert()
		grandparent = frappe.get_doc(
			{"doctype": "Team", "team_name": "GM Dangling Grandparent", "organization": org.name}
		).insert()
		parent = frappe.get_doc(
			{
				"doctype": "Team",
				"team_name": "GM Dangling Parent",
				"organization": org.name,
				"parent_team": grandparent.name,
			}
		).insert()
		child = frappe.get_doc(
			{
				"doctype": "Team",
				"team_name": "GM Dangling Child",
				"organization": org.name,
				"parent_team": parent.name,
			}
		).insert()

		frappe.delete_doc("Team", grandparent.name, force=True)

		with self.assertRaises(frappe.ValidationError) as context:
			child.team_name = "GM Dangling Child Renamed"
			child.save()
		self.assertIn(grandparent.name, str(context.exception))

	def test_get_scorecard_settings_defaults(self):
		from eos_core.eos_core.doctype.team.team import get_scorecard_settings

		team = frappe.get_doc({"doctype": "Team", "team_name": "Settings Team"}).insert()
		settings = get_scorecard_settings(team.name)
		self.assertEqual(settings["team"], team.name)
		self.assertTrue(settings["show_owner"])
		self.assertTrue(settings["show_goal"])
		self.assertTrue(settings["show_status_colors"])
		self.assertEqual(settings["default_timeframe"], "Weekly")

	def test_update_scorecard_settings_updates_team(self):
		from eos_core.eos_core.doctype.team.team import (
			get_scorecard_settings,
			update_scorecard_settings,
		)

		team = frappe.get_doc({"doctype": "Team", "team_name": "Update Settings Team"}).insert()
		updated = update_scorecard_settings(
			team.name,
			{"show_owner": False, "show_status_colors": False, "default_timeframe": "Monthly"},
		)
		self.assertFalse(updated["show_owner"])
		self.assertFalse(updated["show_status_colors"])
		self.assertEqual(updated["default_timeframe"], "Monthly")

		reloaded = get_scorecard_settings(team.name)
		self.assertFalse(reloaded["show_owner"])
		self.assertFalse(reloaded["show_status_colors"])
		self.assertEqual(reloaded["default_timeframe"], "Monthly")

	def test_update_scorecard_settings_refuses_unprivileged_role(self):
		from eos_core.eos_core.doctype.team.team import update_scorecard_settings

		team = frappe.get_doc({"doctype": "Team", "team_name": "Refused Settings Team"}).insert()
		user_email = "team_member_settings_test@example.com"
		if not frappe.db.exists("User", user_email):
			user = frappe.get_doc(
				{
					"doctype": "User",
					"email": user_email,
					"first_name": "Team Member",
					"roles": [{"role": "Team Member"}],
				}
			).insert(ignore_permissions=True)

		frappe.set_user(user_email)
		try:
			with self.assertRaises(frappe.PermissionError):
				update_scorecard_settings(team.name, {"show_owner": False})
		finally:
			frappe.set_user("Administrator")

	def tearDown(self):
		frappe.db.delete("Player")
		frappe.db.delete("Team")
		frappe.db.delete("Organization")