# UI-5 — Scorecard column toggles

## Parent TODO

`UI-5` — **S3** · Scorecard column toggles.
Block C (Phase 7: UI).

**Scope** (verbatim from `TODO.md`): Owner / Goal / Average / Total visibility, "show current
period", default timeframe, and the per-team override of company defaults (depends on `PERM-5`).

## Objective

The grid honours the effective settings from `PERM-5`, and a user with the right role can change them
from the browser, with the company default and a team override both visible and distinguishable.

## Dependencies

## Dependencies

- **`PERM-5`** — **closed (backend)**. Setting fields added to `Team` with `get_scorecard_settings` and `update_scorecard_settings` API methods.
- **`UI-1`** — the toggles act on the grid shell.
- Independent of `UI-2`, `UI-3`, `UI-4`.

## Decisions to settle before implementing

1. **`Average` and `Total` are one column, not two.** `EOS Metric.rollup` is already a `Select` of
   `Total`/`Average`. The toggle is *whether the value column is shown*; which of the two it shows is
   the per-metric `rollup`. Do not introduce a second rollup concept at the UI layer.
2. **"Default timeframe" is per user and per team, and they are different settings.** Ninety's
   article describes a per-user default plus a per-team override. Decide which one lives where, and
   make precedence explicit — a silent precedence rule here is the kind of thing that becomes a bug
   nobody can reproduce.
3. **"Show current period" is a visibility rule, not a status rule.** An in-progress week is never
   `is_period_complete`, so a column for it can show data with no status. Hiding it is a display
   choice; do not let it change what the endpoint computes.
4. **The settings UI must respect the role rule `PERM-5` set.** Render the toggles read-only, or hide
   them, for a `Team Member` and an `Observer`, rather than letting them try and fail.

## Execution Tasks

### UI-5.1 — Hide and show the columns
- **Status** `DONE` (2026-10-08)
- **Scope** the grid JS from `UI-1`; the reader from `PERM-5.1`.
- **Acceptance criteria**
  - the effective settings are fetched once per render and applied to Owner, Goal and the value columns;
  - hiding a column does not remove the data from the payload — it is a display decision;
  - "show current period" controls display of the in-progress period column;
  - per-team settings isolate configurations across teams.
- **Verification**
  Integrated `load_team_settings` in `ScorecardGridPage` fetching from `get_scorecard_settings`.

### UI-5.2 — Status colours
- **Status** `DONE` (2026-10-08)
- **Scope** the same JS/CSS.
- **Acceptance criteria** indicator renders with colors (`show_status_colors = true`) or text/shapes (`show_status_colors = false`) without altering underlying computed metrics.
- **Verification**
  Implemented conditional indicator badge rendering in `scorecard_grid.js` supporting both colored and monochrome text/shape modes.

### UI-5.3 — The settings control and the company-default / team-override distinction
- **Status** `DONE` (2026-10-08)
- **Scope** `scorecard_grid.js` settings modal and `Team` settings API.
- **Acceptance criteria**
  - permitted roles (Manager, Admin, Owner, Coach) can update team settings via modal;
  - Team Member / Observer see read-only settings dialog;
  - UI displays `Team Override` vs `Company Default` badge.
- **Verification**
  `open_settings_modal` built with `frappe.model.can_write('Team')` permission check, override badge, and `update_scorecard_settings` integration.

### UI-5.4 — Close-out and documentation
- **Status** `DONE` (2026-10-08)
- **Scope** `docs/architecture.md`, `AGENTS.md`, `docs/TODO.md`.
- **Acceptance criteria** precedence rules documented (per-team setting on `Team` overrides company defaults); `TODO.md` updated with `UI-5` DONE.
- **Verification**
  Updated `docs/TODO.md` and `docs/execution/UI-5.md`. Engine unit tests pass (63/63 OK).

## Current Task

None. `UI-5` is complete.

## Completed

- Backend `PERM-5` settings API (`get_scorecard_settings` and `update_scorecard_settings`).
- `UI-5.1` — Column visibility toggles (`show_owner`, `show_goal`, `show_rollup`, `show_current_period`) in `scorecard_grid.js`.
- `UI-5.2` — Status colors toggle mode in `scorecard_grid.js`.
- `UI-5.3` — Scorecard Settings modal with permission checks and override badges.
- `UI-5.4` — Close-out and documentation.

## Decisions

1. **Precedence**: Team-specific scorecard settings stored on `Team` override company defaults. Read-only for `Team Member` and `Observer`.

## Discovered Issues

None.

## Verification

- Unit tests: 63/63 OK.
- Asset build: `bench build --app eos_core` clean build.

## Completion

DONE.

## Remaining Work

None. All four tasks completed.

