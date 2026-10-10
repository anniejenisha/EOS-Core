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
		period_end = getdate(range_end) if range_end else getdate(nowdate())
		period_start = (
			getdate(range_start)
			if range_start
			else getdate(add_days(period_end, -ROLLUP_RANGE_WEEKS * 7))
		)
		period_start = getdate(period_start)
		period_end = getdate(period_end)
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
				"owner_user",
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
			m_copy["owner"] = metric.get("owner_user") or metric.get("owner")
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

	@frappe.whitelist()
	def get_trends_view(self, as_of=None, threshold=None):
		as_of_date = getdate(as_of) if as_of else getdate(nowdate())
		min_threshold = int(threshold) if threshold is not None else 3

		raw_metrics = frappe.get_list(
			"EOS Metric",
			filters={"scorecard": self.name, "archived": 0},
			fields=[
				"name",
				"metric_name",
				"owner_user",
				"team",
				"target_value",
				"operator",
				"min_value",
				"max_value",
				"frequency",
				"unit",
				"unit_type",
				"group",
				"description",
			],
		)

		trending_metrics = []
		all_statuses = []

		for metric in raw_metrics:
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
			last_status = entries[-1]["status"] if entries else None

			if last_status:
				all_statuses.append(last_status)

			if consecutive_off >= min_threshold:
				m_copy = dict(metric)
				m_copy["owner"] = metric.get("owner_user")
				m_copy["consecutive_off_track"] = consecutive_off
				m_copy["last_status"] = last_status
				m_copy["status_indicator"] = status_indicator
				trending_metrics.append(m_copy)

		trending_metrics.sort(key=lambda m: m["consecutive_off_track"], reverse=True)
		summary = scorecard_summary(all_statuses)

		return {
			"scorecard": self.name,
			"team": self.team,
			"timeframe": self.timeframe,
			"as_of": as_of_date.isoformat(),
			"threshold": min_threshold,
			"metrics": trending_metrics,
			"summary": summary,
		}

	@frappe.whitelist()
	def export_scorecard_data(self, file_type="csv", include_archived=False):
		if not frappe.has_permission("Scorecard", "read", doc=self.name):
			frappe.throw(
				f"No permission to export scorecard {frappe.bold(self.name)}.",
				frappe.PermissionError,
			)

		filters = {"scorecard": self.name}
		if not include_archived:
			filters["archived"] = 0

		metrics = frappe.get_list(
			"EOS Metric",
			filters=filters,
			fields=[
				"name",
				"metric_name",
				"owner_user",
				"team",
				"target_value",
				"operator",
				"frequency",
				"unit",
				"unit_type",
				"rollup",
				"archived",
			],
			order_by="metric_name asc",
		)

		metric_rows = []
		for metric in metrics:
			entries = frappe.get_all(
				"Scorecard Entry",
				filters={"metric": metric["name"]},
				fields=["week_start_date", "actual_value", "status"],
				order_by="week_start_date asc",
			)
			metric_rows.append(
				{
					"metric_name": metric["metric_name"],
					"owner": metric.get("owner_user"),
					"team": metric["team"],
					"target_value": metric["target_value"],
					"operator": metric["operator"],
					"frequency": metric["frequency"],
					"unit": metric.get("unit"),
					"unit_type": metric.get("unit_type"),
					"rollup": metric.get("rollup"),
					"archived": metric["archived"],
					"entries": entries,
				}
			)

		return {
			"scorecard": self.name,
			"team": self.team,
			"timeframe": self.timeframe,
			"file_type": file_type,
			"metrics": metric_rows,
		}

	def _rollup_metrics(self):
		return frappe.get_all(
			"EOS Metric",
			filters={"scorecard": self.name, "archived": 0},
			fields=[
				"name",
				"metric_name",
				"owner_user",
				"team",
				"target_value",
				"operator",
				"unit",
				"unit_type",
				"rollup",
				"group",
			],
			order_by="metric_name asc",
		)

	def _rollup_metric(self, metric, periods):
		entries = frappe.get_all(
			"Scorecard Entry",
			filters={"metric": metric.name},
			fields=["week_start_date", "actual_value"],
			order_by="week_start_date asc",
		)
		m_name = metric.get("metric_name") or metric.name
		return {
			"id": metric.name,
			"name": metric.name,
			"title": m_name,
			"metric_name": m_name,
			"owner": metric.get("owner_user"),
			"team": metric.get("team") or "",
			"goal": metric.get("target_value"),
			"goal_op": metric.get("operator") or ">=",
			"unit": metric.get("unit") or "",
			"rollup": metric.get("rollup") or "Total",
			"group": metric.get("group"),
			"values": [
				{
					"period_start": period["period_start"],
					"period_end": period["period_end"],
					"label": period.get("label"),
					"key": period.get("period_start"),
					"value": aggregate_entries_for_period(
						entries, period["period_start"], period["period_end"], metric.get("rollup") or "Total"
					),
				}
				for period in periods
			],
		}

	@frappe.whitelist()
	def import_scorecard_data(self, rows=None):
		if not frappe.has_permission("Scorecard", "read", doc=self.name):
			frappe.throw(
				f"No permission to import into scorecard {frappe.bold(self.name)}.",
				frappe.PermissionError,
			)

		if isinstance(rows, str):
			import json
			rows = json.loads(rows)

		if not rows or not isinstance(rows, list):
			return {"results": [], "imported": 0, "failed": 0}

		results = []
		imported_count = 0
		failed_count = 0

		for idx, row in enumerate(rows):
			try:
				metric_name = row.get("metric_name")
				if not metric_name:
					results.append({"index": idx, "success": False, "error": "Missing metric_name"})
					failed_count += 1
					continue

				existing = frappe.get_all(
					"EOS Metric",
					filters={"scorecard": self.name, "metric_name": metric_name},
					limit=1,
				)

				if existing:
					doc = frappe.get_doc("EOS Metric", existing[0].name)
					frappe.has_permission("EOS Metric", "write", doc=doc, throw=True)
				else:
					frappe.has_permission("EOS Metric", "create", throw=True)
					doc = frappe.new_doc("EOS Metric")
					doc.scorecard = self.name
					doc.team = self.team
					doc.metric_name = metric_name

				if "target_value" in row:
					doc.target_value = float(row["target_value"])
				if "owner_user" in row:
					doc.owner_user = row["owner_user"]
				if "unit" in row:
					doc.unit = row["unit"]
				if "operator" in row:
					doc.operator = row["operator"]

				if doc.is_new():
					doc.save()

				if "entries" in row and isinstance(row["entries"], list):
					for entry_data in row["entries"]:
						w_date = str(getdate(entry_data.get("week_start_date")))
						val = float(entry_data["actual_value"]) if entry_data.get("actual_value") is not None else None

						matched_entry = None
						for e in doc.get("entries", []):
							if str(e.week_start_date) == w_date:
								matched_entry = e
								break

						if val is None:
							if matched_entry:
								doc.remove(matched_entry)
						else:
							if matched_entry:
								matched_entry.actual_value = val
								matched_entry.is_manual = 1
							else:
								doc.append(
									"entries",
									{
										"metric": doc.name,
										"week_start_date": w_date,
										"actual_value": val,
										"is_manual": 1,
									},
								)

				doc.save()
				results.append({"index": idx, "metric": doc.name, "metric_name": metric_name, "success": True})
				imported_count += 1
			except Exception as err:
				results.append({"index": idx, "metric_name": row.get("metric_name"), "success": False, "error": str(err)})
				failed_count += 1

		return {
			"scorecard": self.name,
			"results": results,
			"imported": imported_count,
			"failed": failed_count,
		}

	@frappe.whitelist()
	def bulk_archive_metrics(self, metric_names=None):
		if isinstance(metric_names, str):
			import json
			metric_names = json.loads(metric_names)

		if not metric_names or not isinstance(metric_names, list):
			return {"results": [], "archived": 0}

		results = []
		count = 0
		for name in metric_names:
			if not frappe.db.exists("EOS Metric", name):
				results.append({"name": name, "success": False, "error": "Not found"})
				continue

			doc = frappe.get_doc("EOS Metric", name)
			if not frappe.has_permission("EOS Metric", "write", doc=doc):
				results.append({"name": name, "success": False, "error": "Permission denied"})
				continue

			if doc.archived:
				results.append({"name": name, "success": True, "status": "already_archived"})
				continue

			doc.archived = 1
			doc.save()
			results.append({"name": name, "success": True, "status": "archived"})
			count += 1

		return {"scorecard": self.name, "results": results, "archived_count": count}

	@frappe.whitelist()
	def bulk_share_metrics(self, metric_names=None, user=None, read=1, write=0, share=0):
		if not frappe.has_permission("Scorecard", "write", doc=self.name):
			frappe.throw("No permission to share metrics on this scorecard.", frappe.PermissionError)

		if isinstance(metric_names, str):
			import json
			metric_names = json.loads(metric_names)

		if not metric_names or not user:
			return {"results": [], "shared": 0}

		results = []
		count = 0
		for name in metric_names:
			if not frappe.db.exists("EOS Metric", name):
				results.append({"name": name, "success": False, "error": "Not found"})
				continue

			try:
				frappe.share.add("EOS Metric", name, user, read=read, write=write, share=share)
				results.append({"name": name, "user": user, "success": True})
				count += 1
			except Exception as err:
				results.append({"name": name, "user": user, "success": False, "error": str(err)})

		return {"scorecard": self.name, "results": results, "shared_count": count}


@frappe.whitelist()
def update_scorecard_entry(metric, week_start_date, actual_value=None):
	doc = frappe.get_doc("EOS Metric", metric)

	frappe.has_permission("EOS Metric", "write", doc=doc, throw=True)

	target_date = str(getdate(week_start_date))
	existing_entry = None
	for entry in doc.get("entries", []):
		if str(entry.week_start_date) == target_date:
			existing_entry = entry
			break

	if actual_value is None or str(actual_value).strip() == "":
		if existing_entry:
			doc.remove(existing_entry)
	else:
		val = float(actual_value)
		if existing_entry:
			existing_entry.actual_value = val
			existing_entry.is_manual = 1
		else:
			doc.append(
				"entries",
				{
					"metric": doc.metric_name,
					"week_start_date": target_date,
					"actual_value": val,
					"is_manual": 1,
				},
			)

	doc.save()
	return {
		"metric": doc.name,
		"week_start_date": target_date,
		"saved": True,
		"entries_count": len(doc.get("entries", [])),
	}


@frappe.whitelist()
def get_scorecard_trends(scorecard, threshold=None, as_of=None):
	doc = frappe.get_doc("Scorecard", scorecard)
	return doc.get_trends_view(as_of=as_of, threshold=threshold)


@frappe.whitelist()
def get_grid_view(scorecard=None, team=None, timeframe=None, as_of=None, range_weeks=None, periods=None):
	num_weeks = int(range_weeks or periods or ROLLUP_RANGE_WEEKS)
	if not scorecard:
		filters = {}
		if team and team != "All Teams":
			filters["team"] = team
		if timeframe:
			filters["timeframe"] = timeframe
		scorecards = frappe.get_list("Scorecard", filters=filters, limit=1)
		if not scorecards and team and team != "All Teams":
			scorecards = frappe.get_list("Scorecard", filters={"team": team}, limit=1)
		if not scorecards:
			scorecards = frappe.get_list("Scorecard", limit=1)
		if not scorecards:
			return {"metrics": [], "periods": [], "summary": {}}
		scorecard = scorecards[0].name

	doc = frappe.get_doc("Scorecard", scorecard)
	return doc.get_grid_view(as_of=as_of, range_weeks=num_weeks)


@frappe.whitelist()
def get_rollup_view(scorecard=None, team=None, timeframe=None, view_by=None, range_start=None, range_end=None, range_weeks=None, periods=None):
	target_view = normalise_view_by(view_by or timeframe or "Month")
	if target_view not in READ_ONLY_VIEW_BY:
		target_view = "Month"

	if not scorecard:
		filters = {"timeframe": "Weekly"}
		if team and team != "All Teams":
			filters["team"] = team
		scorecards = frappe.get_list("Scorecard", filters=filters, limit=1)
		if not scorecards and team and team != "All Teams":
			scorecards = frappe.get_list("Scorecard", filters={"team": team}, limit=1)
		if not scorecards:
			scorecards = frappe.get_list("Scorecard", limit=1)
		if not scorecards:
			return {"metrics": [], "periods": [], "view_by": target_view}
		scorecard = scorecards[0].name

	doc = frappe.get_doc("Scorecard", scorecard)
	return doc.get_rollup_view(view_by=target_view, range_start=range_start, range_end=range_end)


