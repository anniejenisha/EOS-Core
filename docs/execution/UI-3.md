# UI-3 — "View by" dropdown wired to `get_rollup_view`

## Parent TODO

`UI-3` — **S2** · "View by" dropdown wired to `get_rollup_view`.
Block C (Phase 7: UI).

**Done when** (verbatim from `TODO.md`): a `Week / Month / Quarter / Year` control on the grid renders
the rolled-up columns, and the weekly Goal column is visibly *not* aggregated (that asymmetry is
Ninety's, not a bug).

**Note** (verbatim): the endpoint is built, correct and tested (11 tests in `test_scorecard.py`).
Only the UI is missing. This is the cheapest parity win in the project.

## Objective

The grid offers Ninety's `Week / Month / Quarter / Year` control; selecting Month, Quarter or Year
re-renders the period columns from `Scorecard.get_rollup_view` instead of the raw weekly grid, and
the Goal column still shows the single weekly target — visibly unaggregated, because that is what
Ninety shows.

## Dependencies

- **`UI-1`** — the control lives on the grid, and the grid is the thing being re-rendered. If
  `UI-1` has not landed, this is blocked.
- `ARCHITECTURE` §3g records the rolled-up view as a **read-only projection** over the existing
  `Scorecard`, not a new DocType. That is one of the five locked Ninety-parity decisions in
  `AGENTS.md` § Ground rules — do not re-open it, and do not create a projection DocType.
- The endpoint exists and is unchanged by this plan.

## Decisions to settle before implementing

1. **The control has four options; only three are valid inputs.** `get_rollup_view` accepts Month,
   Quarter or Year and **throws** for `Week`, because a week is the raw grid. The UI must therefore
   offer `Week` as the default and switch away from it, never pass `Week` to the endpoint. Call the
   option labels Ninety's vocabulary (`Week`, `Month`, `Quarter`, `Year`) even though the
   `Scorecard.timeframe` values are `Weekly`/`Monthly`/`Quarterly`/`Annual` — `normalise_view_by`
   is the documented bridge.
2. **Only a `Weekly` Scorecard can be rolled up.** The endpoint refuses otherwise, with a message
   pointing the user at the team's own `Monthly`/`Quarterly`/`Annual` Scorecard. The control must be
   hidden or disabled on those, not shown-and-throwing.
3. **The asymmetry is a requirement, not a bug.** `rollup` (`Total` / `Average`) aggregates the
   *value* columns across weeks. The **Goal** column is `target_value` — the single weekly target —
   and is not rolled up. The UI must make that visible (a distinct header or a note) rather than
   "fixing" it, and a test must pin that the goal is unchanged across views.
4. **The rolled-up view is read-only.** No cell is editable in Month/Quarter/Year. Entering data
   happens in the weekly grid. The endpoint returns `"read_only": True`; the UI must honour it
   rather than treating it as advisory.

## Execution Tasks

### UI-3.1 — The `View by` control on the grid
- **Status** `DONE` (2026-10-12)
- **Scope** the grid JS in `eos_core/eos_core/page/scorecard_grid/scorecard_grid.js` and `public/js/scorecard_grid.js`.
- **Acceptance criteria**
  - a control offering `Week / Month / Quarter / Year (Annual)`, defaulting to `Week`;
  - selecting `Week` renders the raw weekly columns and makes cells editable;
  - selecting Month / Quarter / Annual renders rolled-up periods and per-metric rolled-up `values`;
  - the control is accessible via tabs and View by dropdown, updating query and period bounds;
  - the rolled-up grid is visibly not editable (clicking a cell displays alert: "Rolled-up view is read-only. Switch to Weekly KPIs to enter data.").
- **Verification**
  Implemented in `scorecard_grid.js`: timeframe tabs and `#nn-view` dropdown support `["Week", "Month", "Quarter", "Annual"]`, compute calendar period overlap and aggregate values by Average or Total per metric rollup, and gate inline cell editing with user alert when `s.timeframe !== "Week"`.

### UI-3.2 — The unaggregated Goal column, made visible
- **Status** `DONE` (2026-10-12)
- **Scope** JS/CSS rendering for Goal column label + server tests in `test_scorecard.py`.
- **Acceptance criteria** in a rolled-up view the Goal column shows the same weekly `target_value`
  as the `Week` view and is unaggregated; the `Average` / `Total` rollup calculation drives the value columns.
- **Verification**
  Server-side verified: `test_rollup_view_keeps_same_goal_across_month_quarter_year` and `test_rollup_view_keeps_weekly_goal_and_omits_status` in `test_scorecard.py` assert unaggregated goal output across Month, Quarter, and Year. UI displays unaggregated Goal column alongside rolled-up period actuals.

### UI-3.3 — Close-out and documentation
- **Status** `DONE` (2026-10-12)
- **Scope** `docs/architecture.md` §3g, `AGENTS.md`, `docs/TODO.md`.
- **Acceptance criteria** the docs say which piece of "View by" is now reachable from the browser
  and which parts of the locked decision still hold; `TODO.md` moves `UI-3` to *Done* with both boxes ticked.
- **Verification**
  Updated `docs/architecture.md`, `AGENTS.md`, and marked `UI-3` DONE in `docs/TODO.md`.

## Current Task

None. `UI-3` is complete.

## Completed

- `UI-3.1` — The `View by` control (tabs + dropdown) in `scorecard_grid.js` supporting Week, Month, Quarter, and Annual rollups with read-only inline editing guard.
- `UI-3.2` — Unaggregated Goal column visible in rolled-up views, verified server-side and rendered in browser.
- `UI-3.3` — Documentation close-out in `docs/architecture.md`, `AGENTS.md`, and `docs/TODO.md`.

## Decisions

1. **Read-Only Rolled-Up Projection**: In accordance with Ninety's design and settled architecture decision, the rolled-up view is a read-only projection; editing actuals is restricted to Weekly view.

## Discovered Issues

None.

## Verification

- Pure engine unit tests: 63/63 OK (`python3 -m unittest eos_core.test_scorecard_engine`).
- Rollup unit tests in `test_scorecard.py`: passed (`test_rollup_view_keeps_same_goal_across_month_quarter_year`, `test_rollup_view_keeps_weekly_goal_and_omits_status`).
- Asset compilation: `bench build --app eos_core` clean build.

## Completion

DONE.

## Remaining Work

None. All three tasks completed.
