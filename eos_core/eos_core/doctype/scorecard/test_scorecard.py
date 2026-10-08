import frappe
from frappe.tests import IntegrationTestCase


class TestScorecard(IntegrationTestCase):
	def setUp(self):
		frappe.db.delete("Scorecard Entry")
		frappe.db.delete("EOS Metric")
		frappe.db.delete("Measurable Group")
		frappe.db.delete("Scorecard")
		frappe.db.delete("Player")
		frappe.db.delete("Team")

	def test_unique_team_timeframe(self):
		frappe.get_doc({"doctype": "Team", "team_name": "SC Team"}).insert()
		first = frappe.get_doc({"doctype": "Scorecard", "team": "SC Team", "timeframe": "Weekly"}).insert()
		self.assertEqual(first.name, "SC Team-Weekly")
		with self.assertRaises(frappe.ValidationError):
			frappe.get_doc({"doctype": "Scorecard", "team": "SC Team", "timeframe": "Weekly"}).insert()

	def test_timeframe_cannot_be_changed_after_insert(self):
		frappe.get_doc({"doctype": "Team", "team_name": "SC Frozen"}).insert()
		scorecard = frappe.get_doc(
			{"doctype": "Scorecard", "team": "SC Frozen", "timeframe": "Weekly"}
		).insert()
		scorecard.timeframe = "Annual"
		with self.assertRaises(frappe.ValidationError) as caught:
			scorecard.save()
		self.assertIn("Timeframe", str(caught.exception))
		self.assertIn("cannot be changed", str(caught.exception))
		self.assertEqual(
			frappe.db.get_value("Scorecard", scorecard.name, "timeframe"), "Weekly"
		)

	def test_team_cannot_be_changed_after_insert(self):
		frappe.get_doc({"doctype": "Team", "team_name": "SC Frozen A"}).insert()
		frappe.get_doc({"doctype": "Team", "team_name": "SC Frozen B"}).insert()
		scorecard = frappe.get_doc(
			{"doctype": "Scorecard", "team": "SC Frozen A", "timeframe": "Weekly"}
		).insert()
		scorecard.team = "SC Frozen B"
		with self.assertRaises(frappe.ValidationError) as caught:
			scorecard.save()
		self.assertIn("Team", str(caught.exception))
		self.assertIn("cannot be changed", str(caught.exception))
		self.assertEqual(
			frappe.db.get_value("Scorecard", scorecard.name, "team"), "SC Frozen A"
		)

	def test_non_identity_fields_stay_editable(self):
		frappe.get_doc({"doctype": "Team", "team_name": "SC Editable"}).insert()
		scorecard = frappe.get_doc(
			{"doctype": "Scorecard", "team": "SC Editable", "timeframe": "Weekly"}
		).insert()
		scorecard.description = "Company weekly scorecard"
		scorecard.archived = 1
		scorecard.save()
		reloaded = frappe.get_doc("Scorecard", scorecard.name)
		self.assertEqual(reloaded.description, "Company weekly scorecard")
		self.assertEqual(reloaded.archived, 1)

	def test_ensure_scorecard_resolves_every_timeframe(self):
		frappe.get_doc({"doctype": "Team", "team_name": "SC Timeframes"}).insert()
		frappe.get_doc(
			{
				"doctype": "Player",
				"player_name": "SC Timeframes Leader",
				"user": "Administrator",
				"team": "SC Timeframes",
			}
		).insert()
		weekly = frappe.get_doc(
			{"doctype": "Scorecard", "team": "SC Timeframes", "timeframe": "Weekly"}
		).insert()
		blocked = frappe.get_doc("Scorecard", weekly.name)
		blocked.timeframe = "Annual"
		with self.assertRaises(frappe.ValidationError):
			blocked.save()
		for timeframe in ("Weekly", "Monthly", "Quarterly", "Annual"):
			metric = frappe.get_doc(
				{
					"doctype": "EOS Metric",
					"metric_name": f"SC TF {timeframe}",
					"owner_user": "Administrator",
					"team": "SC Timeframes",
					"target_value": 10,
					"operator": ">=",
					"frequency": timeframe,
				}
			).insert()
			self.assertEqual(metric.scorecard, f"SC Timeframes-{timeframe}")

	def test_name_collision_names_the_timeframe_that_holds_the_name(self):
		frappe.get_doc({"doctype": "Team", "team_name": "SC Legacy"}).insert()
		stale = frappe.get_doc(
			{"doctype": "Scorecard", "team": "SC Legacy", "timeframe": "Weekly"}
		).insert()
		frappe.db.set_value("Scorecard", stale.name, "timeframe", "Annual")
		with self.assertRaises(frappe.ValidationError) as caught:
			frappe.get_doc(
				{"doctype": "Scorecard", "team": "SC Legacy", "timeframe": "Weekly"}
			).insert()
		message = str(caught.exception)
		self.assertIn("SC Legacy-Weekly", message)
		self.assertIn("Annual", message)

	def test_legacy_stale_scorecard_does_not_report_a_missing_weekly_scorecard(self):
		frappe.get_doc({"doctype": "Team", "team_name": "SC Legacy Metric"}).insert()
		frappe.get_doc(
			{
				"doctype": "Player",
				"player_name": "SC Legacy Metric Leader",
				"user": "Administrator",
				"team": "SC Legacy Metric",
			}
		).insert()
		stale = frappe.get_doc(
			{"doctype": "Scorecard", "team": "SC Legacy Metric", "timeframe": "Weekly"}
		).insert()
		frappe.db.set_value("Scorecard", stale.name, "timeframe", "Annual")
		with self.assertRaises(frappe.ValidationError) as caught:
			frappe.get_doc(
				{
					"doctype": "EOS Metric",
					"metric_name": "SC Legacy Weekly Metric",
					"owner_user": "Administrator",
					"team": "SC Legacy Metric",
					"target_value": 10,
					"operator": ">=",
					"frequency": "Weekly",
				}
			).insert()
		message = str(caught.exception)
		self.assertIn("Annual", message)
		self.assertNotIn("Weekly timeframe", message)

	def test_group_limit_and_unique_name(self):
		frappe.get_doc({"doctype": "Team", "team_name": "SC Group Team"}).insert()
		scorecard = frappe.get_doc({"doctype": "Scorecard", "team": "SC Group Team", "timeframe": "Weekly"}).insert()
		for number in range(1, 21):
			frappe.get_doc(
				{
					"doctype": "Measurable Group",
					"group_name": f"SC Group {number}",
					"scorecard": scorecard.name,
				}
			).insert()
		with self.assertRaises(frappe.ValidationError):
			frappe.get_doc(
				{
					"doctype": "Measurable Group",
					"group_name": "SC Group 21",
					"scorecard": scorecard.name,
				}
			).insert()
		with self.assertRaises(frappe.ValidationError):
			frappe.get_doc(
				{
					"doctype": "Measurable Group",
					"group_name": "SC Group 1",
					"scorecard": scorecard.name,
				}
			).insert()

	def test_rollup_view_splits_month_by_calendar_day(self):
		scorecard = self._seed_weekly_scorecard()
		metric = self._seed_metric(scorecard, "SC Straddle")
		metric.append("entries", {"week_start_date": "2026-10-27", "actual_value": 70})
		metric.save()
		view = scorecard.get_rollup_view("Month", "2026-10-01", "2026-11-30")
		self.assertEqual([period["label"] for period in view["periods"]], ["October 2026", "November 2026"])
		values = view["metrics"][0]["values"]
		self.assertAlmostEqual(values[0]["value"], 50.0)
		self.assertAlmostEqual(values[1]["value"], 20.0)

	def test_rollup_view_totals_whole_and_partial_weeks(self):
		scorecard = self._seed_weekly_scorecard()
		metric = self._seed_metric(scorecard, "SC Total")
		metric.append("entries", {"week_start_date": "2026-10-19", "actual_value": 70})
		metric.append("entries", {"week_start_date": "2026-10-26", "actual_value": 70})
		metric.save()
		view = scorecard.get_rollup_view("Month", "2026-10-01", "2026-10-31")
		self.assertAlmostEqual(view["metrics"][0]["values"][0]["value"], 130.0)

	def test_rollup_view_honours_average_rollup(self):
		scorecard = self._seed_weekly_scorecard()
		metric = self._seed_metric(scorecard, "SC Average", rollup="Average")
		metric.append("entries", {"week_start_date": "2026-10-19", "actual_value": 70})
		metric.append("entries", {"week_start_date": "2026-10-26", "actual_value": 70})
		metric.save()
		view = scorecard.get_rollup_view("Month", "2026-10-01", "2026-10-31")
		self.assertAlmostEqual(view["metrics"][0]["values"][0]["value"], 65.0)

	def test_rollup_view_returns_none_for_period_without_data(self):
		scorecard = self._seed_weekly_scorecard()
		metric = self._seed_metric(scorecard, "SC Sparse")
		metric.append("entries", {"week_start_date": "2026-10-19", "actual_value": 70})
		metric.save()
		view = scorecard.get_rollup_view("Month", "2026-10-01", "2026-11-30")
		values = view["metrics"][0]["values"]
		self.assertAlmostEqual(values[0]["value"], 70.0)
		self.assertIsNone(values[1]["value"])

	def test_rollup_view_keeps_weekly_goal_and_omits_status(self):
		scorecard = self._seed_weekly_scorecard()
		metric = self._seed_metric(scorecard, "SC Goal")
		metric.append("entries", {"week_start_date": "2026-10-19", "actual_value": 70})
		metric.save()
		view = scorecard.get_rollup_view("Month", "2026-10-01", "2026-10-31")
		row = view["metrics"][0]
		self.assertEqual(row["goal"], 100.0)
		self.assertNotIn("status", row)
		self.assertNotIn("status_indicator", row)
		self.assertNotIn("trend", row)
		self.assertTrue(view["read_only"])

	def test_rollup_view_keeps_same_goal_across_month_quarter_year(self):
		scorecard = self._seed_weekly_scorecard()
		metric = self._seed_metric(scorecard, "SC Goal Consistency")
		metric.append("entries", {"week_start_date": "2026-10-19", "actual_value": 70})
		metric.save()
		m_view = scorecard.get_rollup_view("Month", "2026-10-01", "2026-12-31")
		q_view = scorecard.get_rollup_view("Quarter", "2026-10-01", "2026-12-31")
		y_view = scorecard.get_rollup_view("Year", "2026-10-01", "2026-12-31")
		self.assertEqual(m_view["metrics"][0]["goal"], 100.0)
		self.assertEqual(q_view["metrics"][0]["goal"], 100.0)
		self.assertEqual(y_view["metrics"][0]["goal"], 100.0)

	def test_rollup_view_labels_quarter_columns(self):
		scorecard = self._seed_weekly_scorecard()
		view = scorecard.get_rollup_view("Quarter", "2026-10-01", "2027-02-28")
		self.assertEqual(
			[period["label"] for period in view["periods"]],
			["Q4 2026", "Q1 2027"],
		)

	def test_rollup_view_accepts_scorecard_timeframe_alias(self):
		scorecard = self._seed_weekly_scorecard()
		view = scorecard.get_rollup_view("Monthly", "2026-10-01", "2026-10-31")
		self.assertEqual(view["view_by"], "Month")

	def test_rollup_view_rejects_week_view_by(self):
		scorecard = self._seed_weekly_scorecard()
		with self.assertRaises(frappe.ValidationError):
			scorecard.get_rollup_view("Week", "2026-10-01", "2026-10-31")

	def test_rollup_view_rejects_unknown_view_by(self):
		scorecard = self._seed_weekly_scorecard()
		with self.assertRaises(frappe.ValidationError):
			scorecard.get_rollup_view("Fortnight", "2026-10-01", "2026-10-31")

	def test_rollup_view_rejects_non_weekly_scorecard(self):
		self._seed_weekly_scorecard()
		quarterly = frappe.get_doc(
			{"doctype": "Scorecard", "team": "SC Rollup Team", "timeframe": "Quarterly"}
		).insert()
		with self.assertRaises(frappe.ValidationError):
			quarterly.get_rollup_view("Month", "2026-10-01", "2026-10-31")

	def test_rollup_view_rejects_inverted_range(self):
		scorecard = self._seed_weekly_scorecard()
		with self.assertRaises(frappe.ValidationError):
			scorecard.get_rollup_view("Month", "2026-11-30", "2026-10-01")

	def test_get_grid_view_returns_periods_metrics_and_summary(self):
		scorecard = self._seed_weekly_scorecard()
		group1 = frappe.get_doc(
			{"doctype": "Measurable Group", "group_name": "Sales", "scorecard": scorecard.name, "order": 1}
		).insert()
		metric = self._seed_metric(scorecard, "SC Grid Metric")
		metric.group = group1.name
		metric.append("entries", {"week_start_date": "2026-10-19", "actual_value": 120})
		metric.append("entries", {"week_start_date": "2026-10-26", "actual_value": 80})
		metric.save()

		grid = scorecard.get_grid_view(as_of="2026-10-26", range_weeks=4)
		self.assertEqual(grid["scorecard"], scorecard.name)
		self.assertEqual(len(grid["periods"]), 4)
		self.assertEqual(len(grid["metrics"]), 1)
		m = grid["metrics"][0]
		self.assertEqual(m["metric_name"], "SC Grid Metric")
		self.assertEqual(m["status_indicator"], "Yellow")
		self.assertEqual(m["consecutive_off_track"], 1)
		self.assertIn("summary", grid)
		self.assertEqual(grid["summary"]["total"], 1)
		self.assertEqual(grid["summary"]["off_track"], 1)

	def test_get_grid_view_filters_permissions_via_get_list(self):
		scorecard_a = self._seed_weekly_scorecard()
		self._seed_metric(scorecard_a, "SC Team A Metric")
		frappe.get_doc({"doctype": "Team", "team_name": "SC Team B"}).insert()
		scorecard_b = frappe.get_doc(
			{"doctype": "Scorecard", "team": "SC Team B", "timeframe": "Weekly"}
		).insert()

		grid = scorecard_a.get_grid_view(as_of="2026-10-26")
		self.assertEqual(grid["scorecard"], scorecard_a.name)
		self.assertEqual(len(grid["metrics"]), 1)

	def test_get_trends_view_returns_filtered_and_sorted_off_track_metrics(self):
		scorecard = self._seed_weekly_scorecard()
		m1 = self._seed_metric(scorecard, "Trend Metric 1")
		m1.append("entries", {"week_start_date": "2026-10-19", "actual_value": 70})
		m1.append("entries", {"week_start_date": "2026-10-26", "actual_value": 60})
		m1.save()

		m2 = self._seed_metric(scorecard, "Trend Metric 2")
		m2.append("entries", {"week_start_date": "2026-10-19", "actual_value": 120})
		m2.append("entries", {"week_start_date": "2026-10-26", "actual_value": 50})
		m2.save()

		trends = scorecard.get_trends_view(as_of="2026-10-26", threshold=1)
		self.assertEqual(trends["scorecard"], scorecard.name)
		self.assertEqual(len(trends["metrics"]), 2)
		self.assertEqual(trends["metrics"][0]["metric_name"], "Trend Metric 1")
		self.assertEqual(trends["metrics"][0]["consecutive_off_track"], 2)
		self.assertEqual(trends["metrics"][1]["metric_name"], "Trend Metric 2")
		self.assertEqual(trends["metrics"][1]["consecutive_off_track"], 1)

		high_trends = scorecard.get_trends_view(as_of="2026-10-26", threshold=2)
		self.assertEqual(len(high_trends["metrics"]), 1)
		self.assertEqual(high_trends["metrics"][0]["metric_name"], "Trend Metric 1")

	def test_get_trends_view_filters_permissions_via_get_list(self):
		scorecard_a = self._seed_weekly_scorecard()
		self._seed_metric(scorecard_a, "Trends Team A Metric")
		trends = scorecard_a.get_trends_view(as_of="2026-10-26", threshold=0)
		self.assertEqual(trends["scorecard"], scorecard_a.name)
		self.assertTrue(isinstance(trends["metrics"], list))

	def test_get_scorecard_trends_top_level_api(self):
		from eos_core.eos_core.doctype.scorecard.scorecard import get_scorecard_trends

		scorecard = self._seed_weekly_scorecard()
		self._seed_metric(scorecard, "Top Level API Metric")
		res = get_scorecard_trends(scorecard.name, threshold=0, as_of="2026-10-26")
		self.assertEqual(res["scorecard"], scorecard.name)
		self.assertTrue(any(m["metric_name"] == "Top Level API Metric" for m in res["metrics"]))

	def test_import_scorecard_data_upserts_and_validates(self):
		scorecard = self._seed_weekly_scorecard()
		m1 = self._seed_metric(scorecard, "Import Metric 1")

		rows = [
			{
				"metric_name": "Import Metric 1",
				"target_value": 150.0,
				"entries": [{"week_start_date": "2026-10-26", "actual_value": 160.0}],
			},
			{
				"metric_name": "Import Metric 2",
				"target_value": 80.0,
				"entries": [{"week_start_date": "2026-10-26", "actual_value": 75.0}],
			},
		]
		res = scorecard.import_scorecard_data(rows)
		self.assertEqual(res["imported"], 2)
		self.assertEqual(res["failed"], 0)

		m1.reload()
		self.assertEqual(m1.target_value, 150.0)
		self.assertTrue(frappe.db.exists("EOS Metric", {"scorecard": scorecard.name, "metric_name": "Import Metric 2"}))

	def test_bulk_archive_metrics(self):
		scorecard = self._seed_weekly_scorecard()
		m1 = self._seed_metric(scorecard, "Bulk Archive Metric 1")
		m2 = self._seed_metric(scorecard, "Bulk Archive Metric 2")

		res = scorecard.bulk_archive_metrics([m1.name, m2.name])
		self.assertEqual(res["archived_count"], 2)

		m1.reload()
		m2.reload()
		self.assertEqual(m1.archived, 1)
		self.assertEqual(m2.archived, 1)

		# Second call should report as already_archived no-op
		res_again = scorecard.bulk_archive_metrics([m1.name])
		self.assertEqual(res_again["results"][0]["status"], "already_archived")



	def test_export_scorecard_data_excludes_archived_metrics_by_default(self):
		scorecard = self._seed_weekly_scorecard()
		m1 = self._seed_metric(scorecard, "Export Active Metric")
		m2 = self._seed_metric(scorecard, "Export Archived Metric")
		m2.archived = 1
		m2.save()

		export_data = scorecard.export_scorecard_data(file_type="csv")
		metric_names = [m["metric_name"] for m in export_data["metrics"]]
		self.assertIn("Export Active Metric", metric_names)
		self.assertNotIn("Export Archived Metric", metric_names)

		export_all = scorecard.export_scorecard_data(file_type="csv", include_archived=True)
		all_names = [m["metric_name"] for m in export_all["metrics"]]
		self.assertIn("Export Active Metric", all_names)
		self.assertIn("Export Archived Metric", all_names)

	def test_export_scorecard_data_refuses_unauthorized_user(self):
		team_a = frappe.get_doc({"doctype": "Team", "team_name": "Export Team A"}).insert()
		team_b = frappe.get_doc({"doctype": "Team", "team_name": "Export Team B"}).insert()

		scorecard_a = frappe.get_doc(
			{"doctype": "Scorecard", "team": team_a.name, "timeframe": "Weekly"}
		).insert()

		user_email = "export_team_b_user@example.com"
		if not frappe.db.exists("User", user_email):
			user = frappe.get_doc(
				{
					"doctype": "User",
					"email": user_email,
					"first_name": "Team B User",
					"send_welcome_email": 0,
					"roles": [{"role": "Team Member"}],
				}
			).insert(ignore_permissions=True)

		perm = frappe.get_doc(
			{
				"doctype": "User Permission",
				"user": user_email,
				"allow": "Team",
				"for_value": team_b.name,
			}
		).insert(ignore_permissions=True)

		frappe.set_user(user_email)
		try:
			with self.assertRaises(frappe.PermissionError):
				scorecard_a.export_scorecard_data()
		finally:
			frappe.set_user("Administrator")
			frappe.delete_doc("User Permission", perm.name, ignore_permissions=True)

	def test_update_scorecard_entry_upserts_and_clears_value(self):
		from eos_core.eos_core.doctype.scorecard.scorecard import update_scorecard_entry

		scorecard = self._seed_weekly_scorecard()
		metric = self._seed_metric(scorecard, "Write Test Metric")

		# 1. Upsert new value
		res = update_scorecard_entry(metric.name, "2026-10-19", 95)
		self.assertTrue(res["saved"])

		reloaded = frappe.get_doc("EOS Metric", metric.name)
		self.assertEqual(len(reloaded.entries), 1)
		self.assertEqual(reloaded.entries[0].actual_value, 95.0)

		# 2. Update existing value
		update_scorecard_entry(metric.name, "2026-10-19", 110)
		reloaded = frappe.get_doc("EOS Metric", metric.name)
		self.assertEqual(len(reloaded.entries), 1)
		self.assertEqual(reloaded.entries[0].actual_value, 110.0)

		# 3. Clear value (pass None or empty string)
		update_scorecard_entry(metric.name, "2026-10-19", None)
		reloaded = frappe.get_doc("EOS Metric", metric.name)
		self.assertEqual(len(reloaded.entries), 0)

	def _seed_weekly_scorecard(self):
		frappe.get_doc({"doctype": "Team", "team_name": "SC Rollup Team"}).insert()
		frappe.get_doc(
			{
				"doctype": "Player",
				"player_name": "SC Rollup Leader",
				"user": "Administrator",
				"team": "SC Rollup Team",
			}
		).insert()
		return frappe.get_doc(
			{"doctype": "Scorecard", "team": "SC Rollup Team", "timeframe": "Weekly"}
		).insert()

	def _seed_metric(self, scorecard, metric_name, rollup="Total"):
		metric = frappe.get_doc(
			{
				"doctype": "EOS Metric",
				"metric_name": metric_name,
				"owner_user": "Administrator",
				"team": "SC Rollup Team",
				"target_value": 100,
				"operator": ">=",
				"frequency": "Weekly",
				"rollup": rollup,
			}
		).insert()
		self.assertEqual(metric.scorecard, scorecard.name)
		return metric

	def tearDown(self):
		frappe.db.delete("Scorecard Entry")
		frappe.db.delete("EOS Metric")
		frappe.db.delete("Measurable Group")
		frappe.db.delete("Scorecard")
		frappe.db.delete("Player")
		frappe.db.delete("Team")
