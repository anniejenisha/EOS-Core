import frappe
from eos_core.seed_sample_data import seed_all


def execute():
	"""Post-migration patch to guarantee sample data is seeded in production"""
	print("Executing patch: seed_production_sample_data")
	seed_all()
