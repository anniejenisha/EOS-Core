import frappe

def run():
    print("Seeding Rocks data...")

    # 1. User Taher Jivanji
    if not frappe.db.exists("User", "taher@burhani.com"):
        u = frappe.get_doc({
            "doctype": "User",
            "email": "taher@burhani.com",
            "first_name": "Taher",
            "last_name": "Jivanji",
            "send_welcome_email": 0
        })
        u.insert(ignore_permissions=True)
    else:
        frappe.db.set_value("User", "taher@burhani.com", {"first_name": "Taher", "last_name": "Jivanji"})

    # 2. Team Leadership Team
    if not frappe.db.exists("Team", "Leadership Team"):
        t = frappe.get_doc({
            "doctype": "Team",
            "team_name": "Leadership Team"
        })
        t.insert(ignore_permissions=True)

    # 3. Rocks definitions
    rocks_data = [
        {
            "rock_name": "EOS company portal go live",
            "status": "In Progress",
            "owner_user": "taher@burhani.com",
            "team": "Leadership Team",
            "is_company_rock": 1,
            "scope": "Company",
            "duration_start": "2026-10-01",
            "duration_end": "2026-12-31",
            "milestones": [
                {"milestone_name": "Initial setup & scope definition", "completed": 1},
                {"milestone_name": "Portal architecture", "completed": 0},
                {"milestone_name": "User onboarding workflow", "completed": 0},
                {"milestone_name": "Testing & QA", "completed": 0},
                {"milestone_name": "Security audit", "completed": 0},
                {"milestone_name": "Documentation", "completed": 0},
                {"milestone_name": "Final review", "completed": 0},
                {"milestone_name": "Go live", "completed": 0}
            ]
        },
        {
            "rock_name": "EDMS implementation and go live",
            "status": "In Progress",
            "owner_user": "taher@burhani.com",
            "team": "Leadership Team",
            "is_company_rock": 1,
            "scope": "Company",
            "duration_start": "2026-10-01",
            "duration_end": "2026-12-31",
            "milestones": [
                {"milestone_name": "Identification of the right tool with open integration protocols", "completed": 0, "notes": "Due: 10 Oct"},
                {"milestone_name": "Deployment", "completed": 0, "notes": "Due: 15 Oct"}
            ]
        },
        {
            "rock_name": "To systemise incentive plans",
            "status": "In Progress",
            "owner_user": "taher@burhani.com",
            "team": "Leadership Team",
            "is_company_rock": 0,
            "scope": "Individual",
            "duration_start": "2026-10-01",
            "duration_end": "2026-12-31",
            "milestones": [
                {"milestone_name": "Review existing incentives", "completed": 1},
                {"milestone_name": "Draft new structure", "completed": 0},
                {"milestone_name": "Management sign-off", "completed": 0},
                {"milestone_name": "Implementation in payroll", "completed": 0},
                {"milestone_name": "Team announcement", "completed": 0},
                {"milestone_name": "Review period 1", "completed": 0},
                {"milestone_name": "Review period 2", "completed": 0},
                {"milestone_name": "Q4 evaluation", "completed": 0},
                {"milestone_name": "Final report", "completed": 0}
            ]
        },
        {
            "rock_name": "ERP Next Live",
            "status": "In Progress",
            "owner_user": "taher@burhani.com",
            "team": "Leadership Team",
            "is_company_rock": 0,
            "scope": "Individual",
            "duration_start": "2026-10-01",
            "duration_end": "2026-12-31",
            "milestones": [
                {"milestone_name": "Module configuration", "completed": 0},
                {"milestone_name": "Data migration", "completed": 0},
                {"milestone_name": "User training", "completed": 0},
                {"milestone_name": "Parallel run", "completed": 0},
                {"milestone_name": "Cutover & Go Live", "completed": 0}
            ]
        }
    ]

    for r_data in rocks_data:
        r_name = r_data["rock_name"]
        existing = frappe.db.get_value("Rock", {"rock_name": r_name}, "name")
        if existing:
            frappe.delete_doc("Rock", existing, force=True)
            
        doc = frappe.get_doc({
            "doctype": "Rock",
            "rock_name": r_name,
            "status": r_data["status"],
            "owner_user": r_data["owner_user"],
            "team": r_data["team"],
            "is_company_rock": r_data["is_company_rock"],
            "scope": r_data["scope"],
            "duration_start": r_data["duration_start"],
            "duration_end": r_data["duration_end"],
            "archived": 0,
            "milestones": r_data["milestones"]
        })
        doc.insert(ignore_permissions=True)
        print(f"Created rock: {r_name}")

    frappe.db.commit()
    print("Successfully seeded all Rocks!")
