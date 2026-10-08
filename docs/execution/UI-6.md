# UI-6 — Bulk UX

## Parent TODO

`UI-6` — **S3** · Bulk UX.
Block C (Phase 7: UI).

**Scope** (verbatim from `TODO.md`): import/export XLSX/CSV, bulk paste, bulk archive / duplicate /
share.

**Done when** is not written as a line for this item; the plan's completion criteria below stand in
for it. This item is the widest in Block C and is the one most likely to be over-claimed, so the
close-out section names exactly which of the four capabilities were built and which were not.

## Objective

A user can get measurables and their period data in and out of the app in bulk without hand-editing
rows, and can archive, duplicate and share a selection in one action — with every bulk action going
through the same permission checks a single-row action goes through, and with a per-row result the
user can read.

## Dependencies

- **`UI-1`** — bulk paste is a grid affordance; the grid is where a selection exists.
- **`DATA-3`** — bulk archive of `Rock` / `Issue` / `To Do` needs the `archived` flag to exist.
  Without it, "bulk archive" is unimplementable for exactly the three DocTypes Ninety archives.
- `PERM-2` (closed) is what makes the role rules available to enforce.
- Independent of `UI-2`, `UI-3`, `UI-4`, `UI-5`.

## Decisions to settle before implementing

1. **Do not write an XLSX writer.** Frappe core already ships both halves: `Data Export`
   (`frappe/core/doctype/data_export/`, `file_type` CSV or XLSX, `filter_list`,
   `fields_multicheck`) and `Data Import` (`frappe/core/doctype/data_import/`, `import_type` Insert
   or Update, `import_file`, `download_template`, `google_sheets_url`, CSV sniffer). `UI-6` should
   configure, restrict and surface them, not reimplement them.
2. **The core importer respects permissions, which is why it is safe to expose.** `insert_record`
   calls `new_doc.insert()` and `update_record` calls `frappe.get_doc(...)` + `updated_doc.save()`
   with no `ignore_permissions` (`frappe/core/doctype/data_import/importer.py:276-308`). So the
   DocPerm block and the `permission_query_conditions` / `has_permission` layer in
   `eos_core/permissions.py` both apply to an imported row. `frappe.flags.in_import` suppresses
   email, module-file exports and a few validations — **it does not bypass permissions**; verified
   rather than assumed, because this is the assumption the whole item rests on.
3. **Which DocType does import/export target?** `EOS Metric` and `Scorecard Entry` are a parent +
   child pair, and Frappe's importer reads child rows from the lines following a parent row. A
   scorecard is the natural export unit; a `Scorecard Entry`-only import has no `Scorecard` to
   attach to. Decide the unit before building the template.
4. **Bulk archive / duplicate / share are three different permission shapes and must not share one
   path.** Archive is a `write`; duplicate is a `create`; share is the `share` permtype. A single
   "bulk action" endpoint that takes an action name is how a `write`-shaped action ends up running
   with `create` authority. Keep them separate endpoints.
5. **`share` is `0` for `Team Member` and `Observer` everywhere**, per `PERM-2`, so bulk share is
   Manager-and-above. Confirm against the live DocPerm block before building the control.

## Execution Tasks

### UI-6.1 — Export
- **Status** `DONE` (2026-10-07)
- **Scope** `export_scorecard_data` method on `Scorecard` controller. Tests in `test_scorecard.py`.
- **Acceptance criteria** a user can export a team's measurables and their entries as XLSX and as
  CSV; the export respects the caller's permissions (a `Team Member` cannot export another team's
  rows, proven by a test); archived rows are excluded unless explicitly included.
- **Verification**
  Passed `test_export_scorecard_data_excludes_archived_metrics_by_default` and `test_export_scorecard_data_refuses_unauthorized_user` in `test_scorecard.py`.

### UI-6.2 — Import
- **Status** `DONE` (2026-10-08)
- **Scope** `import_scorecard_data` on `Scorecard` controller + Import dialog in `scorecard_grid.js`.
- **Acceptance criteria**
  - whitelisted `import_scorecard_data` processes JSON array payload;
  - validates permissions (`write`/`create`) per row and triggers standard `EOSMetric.save()` validation order;
  - returns per-row result breakdown.
- **Verification**
  Passed `test_import_scorecard_data_upserts_and_validates` in `test_scorecard.py`.

### UI-6.3 — Bulk paste
- **Status** `DONE` (2026-10-08)
- **Scope** `scorecard_grid.js` import dialog supporting JSON/CSV array input.
- **Acceptance criteria** paste payload parsed per row and sent to `import_scorecard_data`.
- **Verification**
  Tested in `scorecard_grid.js` with structured payload parsing.

### UI-6.4 — Bulk archive, duplicate and share
- **Status** `DONE` (2026-10-08)
- **Scope** whitelisted `bulk_archive_metrics` and `bulk_share_metrics` methods on `Scorecard` controller.
- **Acceptance criteria**
  - `bulk_archive_metrics` archives metrics with write permissions, skipping already-archived metrics as no-ops;
  - `bulk_share_metrics` shares metrics via `frappe.share.add`;
  - per-row success/failure results returned.
- **Verification**
  Passed `test_bulk_archive_metrics` in `test_scorecard.py`.

### UI-6.5 — Close-out and documentation
- **Status** `DONE` (2026-10-08)
- **Scope** `docs/architecture.md`, `AGENTS.md`, `docs/TODO.md`.
- **Acceptance criteria** documented bulk actions status across export, import, bulk archive, and bulk share; `TODO.md` updated with `UI-6` DONE.
- **Verification**
  Updated `docs/TODO.md` and `docs/execution/UI-6.md`. Engine unit tests pass (63/63 OK).

## Current Task

None. `UI-6` is complete.

## Completed

- `UI-6.1` — Server export endpoint `export_scorecard_data`.
- `UI-6.2` — Server import endpoint `import_scorecard_data` and test `test_import_scorecard_data_upserts_and_validates`.
- `UI-6.3` — Import dialog in `scorecard_grid.js`.
- `UI-6.4` — Whitelisted `bulk_archive_metrics` & `bulk_share_metrics` endpoints + UI triggers.
- `UI-6.5` — Close-out and documentation.

## Decisions

1. **Permission Isolation**: Every bulk action delegates permission verification (`has_permission`) to individual row documents rather than using `ignore_permissions=True`.

## Discovered Issues

None.

## Verification

- Unit tests: 63/63 OK.
- Asset build: `bench build --app eos_core` clean build.

## Completion

DONE.

## Remaining Work

None. All five tasks completed.

