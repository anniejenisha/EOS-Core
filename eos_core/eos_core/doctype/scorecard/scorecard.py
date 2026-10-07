import frappe
from frappe.model.document import Document
from frappe.utils import add_days, getdate, nowdate

from eos_core.scorecard_engine import (
	READ_ONLY_VIEW_BY,
	ROLLUP_RANGE_WEEKS,
	aggregate_entries_for_period,
	completed_period_statuses,
	compute_status,
	compute_status_indicator,
	count_consecutive_off_track,
	normalise_view_by,
	rollup_periods,
	scorecard_summary,
	sort_metrics_by_group,
)


class Scorecard(Document):
	def validate(self):
		self.validate_immutable_identity()
		self.validate_unique()

	def validate_immutable_identity(self):
		if self.is_new():
			return
		for fieldname in ("team", "timeframe"):
			if not self.has_value_changed(fieldname):
				continue
			label = self.meta.get_field(fieldname).label
			frappe.throw(
				f"{frappe.bold(label)} is part of a Scorecard's name and cannot be changed after it "
				"is created. Open this Scorecard, or create a Scorecard for the other value."
			)

	def validate_unique(self):
		if not self.is_new():
			return
		existing = frappe.db.get_value(
			"Scorecard", self.name, ["team", "timeframe"], as_dict=True
		)
		if not existing:
			return
		frappe.throw(
			f"Scorecard {frappe.bold(self.name)} already exists with timeframe "
			f"{frappe.bold(existing.timeframe)}. Open that Scorecard instead of creating a new one."
		)

	@frappe.whitelist()
	def get_rollup_view(self, view_by=None, range_start=None, range_end=None):
		view = normalise_view_by(view_by or self.timeframe)
		if view not in READ_ONLY_VIEW_BY:
			frappe.throw(
				"View by must be Month, Quarter or Year to read a rolled-up view of weekly data."
			)
		if self.timeframe != "Weekly":
			frappe.throw(
				f"Only the Weekly Scorecard can be rolled up. Open the team's "
				f"{frappe.bold(self.timeframe)} Scorecard to read its own data."
			)
		period_end = getdate(range_end) if range_end else nowdate()
		period_start = (
			getdate(range_start)
			if range_start
			else add_days(period_end, -ROLLUP_RANGE_WEEKS * 7)
		)
		if period_start > period_end:
			frappe.throw("The start of the date range must not be after its end.")
		periods = rollup_periods(view, period_start, period_end)
		return {
			"scorecard": self.name,
			"team": self.team,
			"view_by": view,
			"read_only": True,
			"range_start": period_start.isoformat(),
			"range_end": period_end.isoformat(),
			"periods": periods,
			"metrics": [
				self._rollup_metric(metric, periods) for metric in self._rollup_metrics()
			],
		}

	@frappe.whitelist()
	def get_grid_view(self, as_of=None, range_weeks=None):
		as_of_date = getdate(as_of) if as_of else getdate(nowdate())
		num_weeks = int(range_weeks) if range_weeks else ROLLUP_RANGE_WEEKS
		view = normalise_view_by(self.timeframe or "Weekly")
		period_start = add_days(as_of_date, -((num_weeks - 1) * 7))
		periods = rollup_periods(view, period_start, as_of_date)

		raw_metrics = frappe.get_list(
			"EOS Metric",
			filters={"scorecard": self.name, "archived": 0},
			fields=[
				"name",
				"metric_name",
				"owner",
				"team",
				"target_value",
				"operator",
				"min_value",
				"max_value",
				"frequency",
				"unit",
				"unit_type",
				"rollup",
				"is_smart",
				"formula",
				"scorecard",
				"group",
				"archived",
				"description",
			],
		)

		groups = frappe.get_all(
			"Measurable Group",
			filters={"scorecard": self.name},
			fields=["name", "order"],
		)
		group_orders = {g["name"]: g["order"] for g in groups}
		sorted_metrics = sort_metrics_by_group(raw_metrics, group_orders)

		metric_results = []
		latest_statuses = []

		for metric in sorted_metrics:
			entries = frappe.get_all(
				"Scorecard Entry",
				filters={"metric": metric["name"]},
				fields=["week_start_date", "actual_value", "status"],
				order_by="week_start_date asc",
			)
			completed = completed_period_statuses(entries, today=as_of_date)
			status_indicator = compute_status_indicator(completed)
			statuses_seq = [e["status"] for e in entries if e.get("status")]
			consecutive_off = count_consecutive_off_track(statuses_seq)

			period_values = []
			for period in periods:
				p_val = aggregate_entries_for_period(
					entries,
					period["period_start"],
					period["period_end"],
					metric.get("rollup") or "Total",
				)
				p_status = compute_status(
					metric.get("target_value"),
					p_val,
					metric.get("operator"),
					metric.get("min_value"),
					metric.get("max_value"),
				)
				period_values.append(
					{
						"period_start": period["period_start"],
						"period_end": period["period_end"],
						"label": period["label"],
						"value": p_val,
						"status": p_status,
					}
				)

			latest_status = period_values[-1]["status"] if period_values else None
			if latest_status:
				latest_statuses.append(latest_status)

			m_copy = dict(metric)
			m_copy["values"] = period_values
			m_copy["latest_status"] = latest_status
			m_copy["status_indicator"] = status_indicator
			m_copy["consecutive_off_track"] = consecutive_off
			metric_results.append(m_copy)

		summary = scorecard_summary(latest_statuses)

		return {
			"scorecard": self.name,
			"team": self.team,
			"timeframe": self.timeframe,
			"as_of": as_of_date.isoformat(),
			"periods": periods,
			"metrics": metric_results,
			"summary": summary,
		}

	def _rollup_metrics(self):
		return frappe.get_all(
			"EOS Metric",
			filters={"scorecard": self.name, "archived": 0},
			fields=["name", "owner_user", "group", "target_value", "rollup"],
			order_by="name asc",
		)

	def _rollup_metric(self, metric, periods):
		entries = frappe.get_all(
			"Scorecard Entry",
			filters={"metric": metric.name},
			fields=["week_start_date", "actual_value"],
			order_by="week_start_date asc",
		)
		return {
			"name": metric.name,
			"owner": metric.owner_user,
			"group": metric.group,
			"goal": metric.target_value,
			"rollup": metric.rollup,
			"values": [
				{
					"period_start": period["period_start"],
					"period_end": period["period_end"],
					"value": aggregate_entries_for_period(
						entries, period["period_start"], period["period_end"], metric.rollup
					),
				}
				for period in periods
			],
		}
