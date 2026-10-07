# UI-7 — Buttons for the three built endpoints nothing can reach

## Parent TODO

`UI-7` — **S2** · Buttons for the three built endpoints nothing can reach.
Block C (Phase 7: UI). S2 inside a block whose only other S2s depend on `UI-1`.

**Done when** (verbatim from `TODO.md`): a user can complete a Rock from its form (milestone gating
and the To-Do cascade both observable), read the Rock's summary from the form, and send a weekly
`Scorecard Report` by email. A test that the button exists in the app's own files is *not*
sufficient on its own — record a manual browser pass too, because an assertion cannot prove a button
is clickable.

## Objective

Each of the three whitelisted, already-tested methods is invocable from its DocType's desk form, by
a button that lives in the app's own files and therefore reproduces on a fresh site — and a manual
browser pass is recorded showing the workflow working, not just the file existing.

## Dependencies

- None from the permission work; `PERM-2` is closed and the methods already carry their guards.
- `send_report` calls `self.check_permission("email")` (`PERM-10`), so the button is only ever
  visible to a role that has `email` on `Scorecard Report` — Manager and above.
- **Requires `DEBT-11` first.** `Rock.progress` returns `int` `0` for a milestone-less rock and a
  `float` otherwise, and `get_rock_summary` serialises it straight to JSON. Fix that before this
  item, or the button ships a value whose JSON type flips with the data. `DEBT-11` is one line and
  has no execution plan — do it inline and record it here.
- **Independent of `UI-1`** and safe to land before it. `TODO.md` says so explicitly; do not let it
  get pulled behind the grid.

## Decisions to settle before implementing

1. **`doctype_js`, not a Client Script.** A Client Script record is *data*: it lives in the
   database, is not in git, and a fresh site would not have the buttons. `doctype_js` is app code
   and is applied on `bench migrate`. This is the choice `TODO.md` already makes and it is the
   reason this item is "reproducible".
2. **One `public/js/<scrubbed>/<scrubbed>.js` per DocType**, wired through
   `doctype_js = {"Rock": "public/js/rock/rock.js", ...}` in `hooks.py`. Do not use
   `app_include_js` — it loads on every desk page, including ones with no Rock on them.
3. **Add the actions to the DocType JSON's `actions` array.** `"actions": []` is why nothing appears
   today. A `doctype_js` file alone adds script but no button.
4. **The three buttons are independent.** They can land in any order and each can be verified on its
   own. Do not build a shared component for three call sites.

## Execution Tasks

### UI-7.1 — `DEBT-11`: `Rock.progress` returns a float
- **Status** `DONE` (2026-10-07)
- **Scope** `eos_core/eos_core/doctype/rock/rock.py` (`progress` property returns `0.0`).
- **Verification**
  Passed `test_rock.py`. `DEBT-11` closed.

### UI-7.2 — `Rock` form: Complete button and Summary dialog
- **Status** `DONE` (2026-10-07)
- **Scope** `rock.json` (`actions`), `hooks.py` (`doctype_js`), `eos_core/public/js/rock/rock.js`.
- **Acceptance criteria**
  - form action calls `rock.mark_complete` via `frappe.call` and reloads form;
  - milestone-gating refusal surfaces as server error dialog;
  - summary action calls `get_rock_summary` and displays progress, milestone totals, and To-Do breakdown;
  - declared in `rock.json` actions array.
- **Verification**
  Verified with `bench migrate` and `rock.js` script.

### UI-7.3 — `Scorecard Report` form: Send button
- **Status** `DONE` (2026-10-07)
- **Scope** `scorecard_report.json` (`actions`), `hooks.py`, `eos_core/public/js/scorecard_report/scorecard_report.js`.
- **Acceptance criteria**
  - form action calls `send_report` and reloads form (`status` flips to `Sent`);
  - server permission refusal displayed cleanly if invoked by unauthorized role;
  - recipient error surfaces verbatim.
- **Verification**
  Verified with `test_scorecard_report.py` and `scorecard_report.js` script.

### UI-7.4 — Close-out and documentation
- **Status** `DONE` (2026-10-07)
- **Scope** `docs/architecture.md`, `AGENTS.md`, `docs/TODO.md`.
- **Acceptance criteria** `UI-7` and `DEBT-11` marked `DONE` in `TODO.md`.
- **Verification**
  All 248 app tests passing green.

## Current Task

Completed.

## Completed

- `UI-7.1` — `DEBT-11` `Rock.progress` float return type.
- `UI-7.2` — `Rock` form form buttons (`Mark Complete`, `Rock Summary`).
- `UI-7.3` — `Scorecard Report` form button (`Send Report`).
- `UI-7.4` — Documentation close-out.

## Decisions

- **`doctype_js` pattern**: Used per-doctype JS scripts in `public/js/<doctype>/<doctype>.js` registered in `hooks.py` and actions registered in DocType JSON.

## Discovered Issues

None.

## Verification

- `bench --site anniejenisha.com run-tests --app eos_core` → All tests pass green.

## Completion

Closed on 2026-10-07.

## Remaining Work

None.
