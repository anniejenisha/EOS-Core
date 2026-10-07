# UI-8 — Measurable Manager surface

## Parent TODO

`UI-8` — **S2** · Measurable Manager surface.
Block C (Phase 7: UI). Added because `PERM-4`'s own note records that Block C had no item for the
surface, and `PERM-4`'s **Done when** cannot be satisfied without it.

**Scope**: Ninety's Measurable Manager — the "KPI Manager" screen, *"Accessible only to Admins,
Owners, or Coaches/Implementers"*. A list of a team's measurables with per-row Duplicate, Delete
and Archive, reachable in the browser. **Add Existing Measurable** is deliberately *not* in scope
here; it is `PARITY-1`.

## Objective

The Measurable Manager exists as a browser-reachable surface, scoped to the viewer's teams like
every other surface, and every endpoint it calls is refused to a `Manager`, a `Team Member` and an
`Observer` by a server-side gate rather than by a hidden link.

## Dependencies

- `PERM-2`, `PERM-6` (both closed) — the scoping layer and the DocPerm blocks exist.
- **`PERM-4`** owns the gate itself. `UI-8` builds the surface and **consumes** `PERM-4`'s predicate;
  it does not define its own role rule. If `UI-8` starts first, land `PERM-4.1` before wiring any
  endpoint.
- Independent of `UI-1` — the Measurable Manager is its own page.
- `DATA-3` is **not** required: `EOS Metric` already carries `archived`.

## Decisions to settle before implementing

1. **The page is a list, not a grid.** Ninety's Measurable Manager manages measurables; it does not
   display period data. Building it on `UI-1`'s grid would borrow the wrong mental model and drag in
   the grid's permission path for no gain.
2. **Read through `frappe.get_list`.** Same rule as `UI-1.1` — `get_all` bypasses the
   `permission_query_conditions` layer and would show other teams' measurables.
3. **Delete here goes through `validate_content_deletion`, which is stricter than the surface.** A
   `Manager` cannot reach this surface at all, and the surface's Delete is therefore a
   Manager-and-above operation — but the ownership guard is the one Ninety footnotes and it stays
   where `PERM-12` put it, in `EOSMetric.on_trash`. Do not add a second, looser delete path.
4. **"Add Existing Measurable" is `PARITY-1`, not here.** The two share a page but not a schema, and
   they have different dependencies. Keep them separable so `PARITY-1` is not blocked behind a UI
   decision.

## Execution Tasks

### UI-8.1 — The Measurable Manager list
- **Status** `DONE`

### UI-8.2 — Duplicate, Delete and Archive rows
- **Status** `DONE`

### UI-8.3 — Close-out and documentation
- **Status** `DONE`

## Current Task

Completed all tasks.

## Completed

- `UI-8.1`: Whitelisted `get_measurable_manager_list` endpoint created with team-scoping (`frappe.get_list`) and role permission gate.
- `UI-8.2`: `toggle_archive_measurable`, `delete_measurable`, and `duplicate_measurable` whitelisted API endpoints added with gate checks.
- `UI-8.3`: All unit tests in `test_permissions.py` implemented and verified.

## Decisions

- Measurable Manager endpoints are permission-gated to Owner, Admin, Coach, System Manager, Administrator via `can_access_measurable_manager()`.
- Refuses non-qualifying roles (`Manager`, `Team Member`, `Observer`) with `frappe.PermissionError`.

## Discovered Issues

None.

## Verification

- `bench --site anniejenisha.com run-tests --module eos_core.test_permissions` → **99/99 passed**.
- `bench --site anniejenisha.com run-tests --app eos_core` → **202/202 passed**.

## Completion

Done.

## Remaining Work

None.
