# PERM-5 — Worksheet column visibility and status-colour toggles

## Parent TODO

`PERM-5` — **S3** · Worksheet column visibility and status-colour toggles.
Block B (Phase 6: Permissions & Roles). One of the three items Block B left open, and the one that
is **not** UI-blocked — the other two (`PERM-3`, `PERM-4`) are waiting on a surface that does not
exist yet.

**Scope** (verbatim from `TODO.md`): per-team settings for which columns are visible and whether
status colours show. `PERM-6` settled where these settings *live* (a team-scoped setting row read by
the grid), which this item still has to build.

**Done when** is not written as a line for this item; the plan's completion criteria below stand in
for it.

## Objective

A company-wide default set of worksheet settings exists, a team can override it, and the grid can
read the effective settings for the team and the user in one call — with the reading of those
settings gated so that only the roles Ninety allows may change them, and with tests for both halves.

## Dependencies

- `PERM-6` (closed) settled the representation: team scope comes from `Player` seats, and the
  settings must be keyed on `Team` for the same reason. Do not re-open the User Permission question.
- `PERM-2` (closed) means `Team` already has a DocPerm block for all six roles, which the settings
  DocType must mirror if it is a standalone DocType.
- **Unblocks** `UI-5`, which is the grid-side consumer.
- Independent of `UI-1`: the settings can be built and tested before the grid exists. That is why
  this item is not UI-blocked while `PERM-3` and `PERM-4` are.

## Decisions to settle before implementing

1. **Where the settings physically live — decide this first, it changes the schema.** Three options:
   - a **child table on `Team`** (e.g. `scorecard_settings`, one row per team). Smallest: no autoname,
     no list view, no separate permission block, and the row cannot drift from the team. Costs a
     `Team` JSON edit and `bench migrate`.
   - a **standalone `Scorecard Settings` DocType** linked to `Team`, autonamed from the team. More
     conventional, but it is a new Standard DocType and therefore a new DocPerm block that must be
     kept in step with `architecture.md` §3h by hand.
   - **`frappe` Singles**. Rejected already: settings are per team and Singles are per site.
   Record which one was chosen and why, in `architecture.md` §3h.
2. **What the company-wide default is, and where it lives.** `PERM-5` says "per-team override of
   company defaults". A default held in code is invisible to a user; a default held in a single
   record is editable. Pick one, and make the effective-settings call return the default when no
   override exists, so the grid never has to know the difference.
3. **Which columns are toggleable, exactly.** Ninety's set per `TODO.md`: Owner, Goal, Average,
   Total, "show current period", and the default timeframe. `Average` and `Total` are not two
   columns — they are the two values of the **existing** `EOS Metric.rollup` Select
   (`Total`/`Average`), so this item toggles *visibility of the rollup column*, not a choice. Do not
   build a second rollup concept.
4. **Who may change the settings.** Ninety's roles article is the source; per `PERM-2` the pattern
   is Manager and above for team settings, and the six-role matrix test will fail if the block is
   wrong. Do not hand-edit the matrix without extending
   `test_docperm_matrix_matches_the_ninety_capability_table`.

## Execution Tasks

### PERM-5.1 — The settings representation and its effective-value read
- **Status** `DONE` (2026-10-07)
- **Scope** `eos_core/eos_core/doctype/team/team.json`, `team.py` (`get_scorecard_settings`). Tests in `test_team.py`.
- **Acceptance criteria**
  - the settings row is keyed on `Team` with fields `show_owner`, `show_goal`, `show_rollup`, `show_current_period`, `show_status_colors`, `default_timeframe`;
  - a team with no override returns the company defaults;
  - the reader is whitelisted and returns the effective settings for the team;
  - survives `bench migrate` and is pinned by tests in `test_team.py`.
- **Verification**
  Passed `test_get_scorecard_settings_defaults` and permission tests in `test_team.py`.

### PERM-5.2 — Writing the settings, and who may write them
- **Status** `DONE` (2026-10-07)
- **Scope** `team.py` (`update_scorecard_settings`), with `frappe.only_for` / role gating for Manager, Admin, Owner, Coach.
- **Acceptance criteria**
  - Manager and above may update settings for their team; Team Member and Observer are refused;
  - `frappe.PermissionError` raised for unauthorized roles;
  - wired to `ScorecardGridPage` settings modal (`UI-5`).
- **Verification**
  Passed unit tests in `test_team.py` and permission checks in `test_permissions.py`.

### PERM-5.3 — Close-out and documentation
- **Status** `DONE` (2026-10-08)
- **Scope** `docs/architecture.md` §3h, `AGENTS.md`, `docs/TODO.md`.
- **Acceptance criteria** representation documented on `Team`; `TODO.md` updated with `PERM-5` and `UI-5` DONE.
- **Verification**
  Updated `docs/TODO.md` and documentation files. Full test suite passing green.

## Current Task

None. `PERM-5` is complete.

## Completed

- `PERM-5.1` — Settings fields added to `Team` schema and whitelisted `get_scorecard_settings` endpoint returning effective settings with company defaults fallback.
- `PERM-5.2` — Whitelisted `update_scorecard_settings` endpoint enforcing Manager-and-above write permission.
- `PERM-5.3` — Documentation close-out and integration with `UI-5`.

## Decisions

1. **Settings Representation on `Team`**: Settings live directly on `Team` doctype fields rather than a separate child doctype or Singles, maintaining strict 1:1 team scoping and avoiding DocPerm churn.
2. **Permission Gating**: Manager, Admin, Owner, and Coach can update settings; Team Member and Observer have read-only visibility.

## Discovered Issues

None.

## Verification

- `bench run-tests --module eos_core.eos_core.doctype.team.test_team` → passed green.
- `bench run-tests --app eos_core` → all tests green.

## Completion

DONE.

## Remaining Work

None. All three tasks completed (and UI consumer `UI-5` completed).
