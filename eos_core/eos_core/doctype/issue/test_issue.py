import frappe
from frappe.tests import IntegrationTestCase

from eos_core.eos_core.doctype.issue.issue import create_issue_from_metric


class TestIssue(IntegrationTestCase):
	def setUp(self):
		frappe.db.delete("Issue")
		frappe.db.delete("Scorecard Entry")
		frappe.db.delete("EOS Metric")
		frappe.db.delete("Team")

	def test_status_transitions(self):
		issue = frappe.get_doc(
			{
				"doctype": "Issue",
				"issue_name": "Issue Alpha",
				"status": "Identified",
				"owner_user": "Administrator",
			}
		).insert()
		issue.status = "Discussing"
		issue.save()
		self.assertEqual(issue.status, "Discussing")
		issue.status = "Solved"
		issue.solution = "Fixed in rollout."
		issue.save()
		issue.status = "Identified"
		with self.assertRaises(frappe.ValidationError):
			issue.save()

	def test_solved_requires_solution(self):
		with self.assertRaises(frappe.ValidationError):
			frappe.get_doc(
				{
					"doctype": "Issue",
					"issue_name": "Issue Beta",
					"status": "Solved",
					"owner_user": "Administrator",
				}
			).insert()

	def test_create_issue_from_off_track_metric(self):
		metric = frappe.get_doc(
			{
				"doctype": "EOS Metric",
				"metric_name": "Issue Metric",
				"owner_user": "Administrator",
				"target_value": 100,
				"operator": ">=",
				"frequency": "Weekly",
			}
		).insert()
		metric.append("entries", {"week_start_date": "2026-08-31", "actual_value": 80})
		metric.append("entries", {"week_start_date": "2026-09-07", "actual_value": 120})
		metric.append("entries", {"week_start_date": "2026-09-14", "actual_value": 70})
		metric.save()

		issue = create_issue_from_metric("Issue Metric")
		self.assertEqual(issue.status, "Identified")
		self.assertEqual(issue.source, "Scorecard")
		self.assertEqual(issue.originating_metric, "Issue Metric")
		self.assertEqual(issue.issue_name, "Issue Metric — 2026-09-14")
		self.assertIn("Consecutive Off Track: 1", issue.description)

	def test_create_issue_streak_bounded_at_requested_week(self):
		metric = frappe.get_doc(
			{
				"doctype": "EOS Metric",
				"metric_name": "Issue Streak Metric",
				"owner_user": "Administrator",
				"target_value": 100,
				"operator": ">=",
				"frequency": "Weekly",
			}
		).insert()
		metric.append("entries", {"week_start_date": "2026-08-31", "actual_value": 80})
		metric.append("entries", {"week_start_date": "2026-09-07", "actual_value": 120})
		metric.append("entries", {"week_start_date": "2026-09-14", "actual_value": 70})
		metric.append("entries", {"week_start_date": "2026-09-21", "actual_value": 60})
		metric.save()

		older = create_issue_from_metric("Issue Streak Metric", week_start_date="2026-09-14")
		self.assertIn("Consecutive Off Track: 1", older.description)
		self.assertNotIn("Consecutive Off Track: 2", older.description)

		newest = create_issue_from_metric("Issue Streak Metric")
		self.assertIn("Consecutive Off Track: 2", newest.description)

	def test_create_issue_from_on_track_rejected(self):
		metric = frappe.get_doc(
			{
				"doctype": "EOS Metric",
				"metric_name": "Issue Metric On Track",
				"owner_user": "Administrator",
				"target_value": 100,
				"operator": ">=",
				"frequency": "Weekly",
			}
		).insert()
		metric.append("entries", {"week_start_date": "2026-09-14", "actual_value": 150})
		metric.save()
		with self.assertRaises(frappe.ValidationError):
			create_issue_from_metric("Issue Metric On Track")

	def test_create_issue_from_metric_is_whitelisted(self):
		self.assertIn(create_issue_from_metric, frappe.whitelisted)

	def test_create_issue_refused_without_issue_create_permission(self):
		metric = frappe.get_doc(
			{
				"doctype": "EOS Metric",
				"metric_name": "Observer Test Metric",
				"owner_user": "Administrator",
				"target_value": 100,
				"operator": ">=",
				"frequency": "Weekly",
			}
		).insert()
		metric.append("entries", {"week_start_date": "2026-09-14", "actual_value": 70})
		metric.save()

		user_email = "observer_issue_test@example.com"
		if not frappe.db.exists("User", user_email):
			user = frappe.get_doc(
				{
					"doctype": "User",
					"email": user_email,
					"first_name": "Observer Test",
					"send_welcome_email": 0,
					"roles": [{"role": "Observer"}],
				}
			).insert(ignore_permissions=True)

		frappe.set_user(user_email)
		try:
			with self.assertRaises(frappe.PermissionError):
				create_issue_from_metric("Observer Test Metric")
		finally:
			frappe.set_user("Administrator")

	def test_create_issue_refused_for_metric_outside_user_team(self):
		team_a = frappe.get_doc({"doctype": "Team", "team_name": "Issue Team A"}).insert()
		team_b = frappe.get_doc({"doctype": "Team", "team_name": "Issue Team B"}).insert()

		frappe.get_doc(
			{
				"doctype": "Player",
				"player_name": "Admin Player Team B",
				"user": "Administrator",
				"team": team_b.name,
			}
		).insert()

		metric_b = frappe.get_doc(
			{
				"doctype": "EOS Metric",
				"metric_name": "Team B Metric",
				"owner_user": "Administrator",
				"team": team_b.name,
				"target_value": 100,
				"operator": ">=",
				"frequency": "Weekly",
			}
		).insert()
		metric_b.append("entries", {"week_start_date": "2026-09-14", "actual_value": 50})
		metric_b.save()

		user_email = "team_a_user@example.com"
		if not frappe.db.exists("User", user_email):
			user = frappe.get_doc(
				{
					"doctype": "User",
					"email": user_email,
					"first_name": "Team A User",
					"send_welcome_email": 0,
					"roles": [{"role": "Team Member"}],
				}
			).insert(ignore_permissions=True)

		perm = frappe.get_doc(
			{
				"doctype": "User Permission",
				"user": user_email,
				"allow": "Team",
				"for_value": team_a.name,
			}
		).insert(ignore_permissions=True)

		frappe.set_user(user_email)
		try:
			with self.assertRaises(frappe.PermissionError):
				create_issue_from_metric("Team B Metric")
		finally:
			frappe.set_user("Administrator")
			frappe.delete_doc("User Permission", perm.name, ignore_permissions=True)

	def tearDown(self):
		frappe.db.delete("Issue")
		frappe.db.delete("Scorecard Entry")
		frappe.db.delete("EOS Metric")
		frappe.db.delete("Team")
		frappe.db.delete("User Permission")