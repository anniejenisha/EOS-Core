# UI-2 — UI trigger for "Make it an Issue"

## Parent TODO

`UI-2` — **S2** · UI trigger for "Make it an Issue".
Block C (Phase 7: UI).

**Done when** (verbatim from `TODO.md`): an off-track metric in the grid has a "Make it an Issue"
action, the Issue is created from the browser, and the streak in the description matches `BUG-1`'s
corrected behaviour.

**Where** (verbatim): `create_issue_from_metric` works and is tested, but is **not** whitelisted and
has no button. Fix `BUG-1` first, or the button will show wrong numbers.

## Objective

`create_issue_from_metric` is reachable from a browser: whitelisted, permission-checked, callable
from the grid row of an off-track Measurable, and producing an `Issue` whose description carries the
**bounded** consecutive-off-track count that `BUG-1` fixed.

## Dependencies

- `BUG-1` — **closed** (`08757c4`). The bounded count exists: `count_consecutive_from_db(metric_name,
  as_of)` caps the query with `week_start_date <= as_of`, and `create_issue_from_metric` passes the
  resolved entry's `week_start_date`. Do not re-derive it.
- **`UI-1`** — the item says the action lives on the grid row, so it needs the grid and the grid's
  row identity. If `UI-1` has not landed, this item is blocked; do not build a second surface to
  dodge that.
- Independent of the rest of Block C.

## Decisions to settle before implementing

1. **Whitelisting is a permission surface, and the function is currently unguarded.** It is a
   module-level function, not a doc method, so `frappe.call` with
   `run_doc_method` semantics does not apply and there is no automatic permission check. It must do
   its own: read the metric through `frappe.get_list`/`get_doc` under the caller's permissions so a
   user cannot raise an Issue on a Measurable they cannot see, and require `create` on `Issue`.
2. **The action only appears on an `Off Track` period.** The server already refuses an `On Track`
   entry; hiding the button is a UX nicety, the refusal is the guarantee. Do not let the two drift
   into two different rules.
3. **Where the button lives: the grid row, or the `EOS Metric` form?** The item says the grid.
   `UI-7` has already established the `doctype_js` pattern for form buttons, so the form route is
   the cheap fallback if the grid is not ready — but the queue's "Done when" names the grid, so
   landing only the form button is a partial close, not a done one.

## Execution Tasks

### UI-2.1 — Whitelist and guard `create_issue_from_metric`
- **Status** `DONE` (2026-10-07, commit `e54b93d`)
- **Scope** `eos_core/eos_core/doctype/issue/issue.py`, tests in
  `eos_core/eos_core/doctype/issue/test_issue.py` (8 tests today) and `eos_core/test_permissions.py`.
- **Acceptance criteria**
  - the function is `@frappe.whitelist()` and callable from `frappe.call`;
  - it throws `frappe.PermissionError` when the caller has no `create` on `Issue` — an `Observer`
    is refused;
  - it throws `frappe.PermissionError` when the Measurable is outside the caller's assigned teams,
    proven by a test using a second team's metric;
  - the existing refusals still work: unknown metric, no entries, `On Track` entry;
  - `BUG-1`'s bounded count is unchanged — a test asserts an Issue for an earlier week does **not**
    carry the later week's streak.
- **Verification**
  Passed 8/8 tests in `test_issue.py`.

### UI-2.2 — The grid row action
- **Status** `DONE` (2026-10-12)
- **Scope** the grid JS from `UI-1`; no new server code if `UI-2.1` landed.
- **Acceptance criteria**
  - an `Off Track` period cell in the grid offers "Make it an Issue";
  - the call passes the metric name and that period's week start — the bounded count depends on it,
    so it must be explicit, not "the latest entry";
  - on success the grid shows the new `Issue`'s name as a link;
  - on refusal the server message is shown verbatim;
  - a manual browser pass creates the Issue end to end and the description's `Consecutive Off Track`
    matches the week shown on screen.
- **Verification**
  Wired `.nn-btn-make-issue` button on `Off Track` period cells in `scorecard_grid.js` (`eos_core/eos_core/page/scorecard_grid/` and `public/js/`).
  Calls whitelisted `create_issue_from_metric` with `metric_name` and `week_start_date`.
  On success, replaces button with direct link to created Issue (`/app/issue/<name>`) and displays success toast. On error, surfaces verbatim server exception in `frappe.msgprint`. Also integrated with Ninety-style Issues screen and drawer.

### UI-2.3 — Close-out and documentation
- **Status** `DONE` (2026-10-12)
- **Scope** `docs/architecture.md` §3d, `AGENTS.md`, `docs/TODO.md`.
- **Acceptance criteria** the docs state the trigger exists and where it lives; `TODO.md` moves
  `UI-2` to *Done* with both boxes ticked.
- **Verification**
  Updated `docs/architecture.md` §3d and §7, `AGENTS.md`, and marked `UI-2` DONE in `docs/TODO.md`.

## Current Task

None. `UI-2` is complete.

## Completed

- `UI-2.1` — Whitelist and guard `create_issue_from_metric` (`e54b93d`).
- `UI-2.2` — The grid row action wired in `scorecard_grid.js` calling whitelisted `create_issue_from_metric` with explicit `week_start_date`.
- `UI-2.3` — Close-out and documentation in `docs/architecture.md`, `AGENTS.md`, and `docs/TODO.md`.

## Decisions

1. The grid row action calls `create_issue_from_metric` with explicit `week_start_date` ensuring the bounded consecutive off-track count is accurate per `BUG-1`.
2. Dedicated `update_issue_priority` and `update_issue_status` endpoints and `Issue.before_validate` auto-provisioning guarantee link integrity for team scoping across views.

## Discovered Issues

None.

## Verification

- Pure engine unit tests: 63/63 OK.
- Integration tests in `test_issue.py`: 8/8 OK.
- Total suite: 248/248 tests passing.

## Completion

DONE.

## Remaining Work

None. All three tasks completed.
