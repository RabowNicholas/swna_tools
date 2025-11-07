#!/usr/bin/env python3
"""
Test script to generate sample PDF for Desert Pulmonary referral form
This will help identify the exact positioning needed for each field.
"""

import os
import sys
from datetime import datetime, date
from io import BytesIO

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from generators.desert_pulm_referral_generator import DesertPulmReferralGenerator
from generators.withdrawal_letter_generator import WithdrawalLetterGenerator
from generators.ee3_generator import EE3Generator


def test_desert_pulm_referral():
    """Test Desert Pulmonary referral form generation with sample data"""
    print("Testing Desert Pulmonary referral form...")

    # Sample client record (mock data)
    client_record = {
        "fields": {
            "Name": "Smith, John - 1234",
            "Case ID": "ABC123",
            "Address": "123 Main St, Anytown, NY 12345",
            "Phone": "555.123.4567",
        }
    }

    # Sample form data
    form_data = {
        "patient_name": "John Smith",
        "phone_number": "555.123.4567",
        "dob": date(1970, 5, 15),
        "case_id": "ABC123",
        "address_main": "123 Main Street",
        "address_city": "Anytown",
        "address_state": "NY",
        "address_zip": "12345",
        "dx_code": "Silicosis (J62.8)",
    }

    try:
        generator = DesertPulmReferralGenerator()
        filename, pdf_bytes = generator.generate(client_record, form_data)

        # Save the test PDF
        with open(f"test_output_{filename}", "wb") as f:
            f.write(pdf_bytes.read())

        print(f"✅ Desert Pulmonary referral test PDF saved as: test_output_{filename}")
        return True

    except Exception as e:
        print(f"❌ Desert Pulmonary referral test failed: {e}")
        return False


def test_withdrawal_letter():
    """Test Withdrawal Letter generation with sample data"""
    print("Testing Withdrawal Letter form...")

    # Sample client record (mock data)
    client_record = {
        "fields": {
            "Name": "Smith, John - 1234",
            "Case ID": "5003",
            "Address": "123 Main St, Anytown, NY 12345",
            "Phone": "555.123.4567",
        }
    }

    # Sample form data
    form_data = {
        "claimant_name": "John Smith",
        "case_id": "5003",
        "letter_date": date(2023, 8, 15),
        "claimed_condition": "Lung Cancer",
    }

    try:
        generator = WithdrawalLetterGenerator()
        filename, pdf_bytes = generator.generate(client_record, form_data)

        # Save the test PDF
        with open(f"test_output_{filename}", "wb") as f:
            f.write(pdf_bytes.read())

        print(f"✅ Withdrawal Letter test PDF saved as: test_output_{filename}")
        return True

    except Exception as e:
        print(f"❌ Withdrawal Letter test failed: {e}")
        return False


def test_ee3():
    """Test EE-3 form generation with comprehensive sample data"""
    print("Testing EE-3 form...")

    # Sample client record (mock data)
    client_record = {
        "fields": {
            "Name": "Williams, Robert - 1234",
            "Case ID": "DEF456",
            "Social Security Number": "123456789",
            "Street Address": "456 Oak Avenue",
            "City": "Santa Fe",
            "State": "New Mexico",
            "ZIP Code": "87501",
        }
    }

    # Sample form data with comprehensive EE-3 fields
    form_data = {
        # Employee Information
        "first_name": "Robert",
        "last_name": "Williams",
        "former_name": "Bob Williams",
        "ssn": "123-45-6789",
        # Employee Contact Information
        "employee_address": "456 Oak Avenue",
        "employee_city": "Santa Fe",
        "employee_state": "NM",
        "employee_zip": "87501",
        "phone_home": "(505) 555-1234",
        "phone_work": "(505) 555-5678",
        "phone_cell": "(505) 555-9999",
        # Contact Person Information (person completing form)
        "contact_first_name": "Maria",
        "contact_last_name": "Williams",
        "contact_address": "456 Oak Avenue",
        "contact_city": "Santa Fe",
        "contact_state": "NM",
        "contact_zip": "87501",
        # Employment History with 2 employers
        "employment_history": [
            {
                "start_date": date(1980, 3, 15),
                "end_date": date(1985, 8, 30),
                "facility_name": "Los Alamos National Laboratory",
                "specific_location": "Technical Area 21",
                "city": "Los Alamos",
                "state": "NM",
                "contractor": "University of California",
                "position_title": "Nuclear Technician",
                "work_duties": "Handling radioactive materials in controlled laboratory environment, performing routine equipment maintenance and calibration procedures",
                "union_member": False,
                # Additional EE-3 specific fields
                "facility_type": "Department of Energy Facility",
                "work_id_number": "LA-21-1234",
                "dosimetry_worn": True,
                "dosimetry_badge_number": "DOE-123456",
                "work_conditions_exposures": "Radiation exposure, chemical solvents, asbestos in older buildings",
                "health_programs": {
                    "former_worker_program": True,
                    "resep": False,
                    "medical_surveillance": True,
                    "medical_study": False,
                    "union_member": False,
                    "other": "Site health monitoring program",
                },
            },
            {
                "start_date": date(1985, 9, 1),
                "end_date": date(1992, 12, 31),
                "facility_name": "Pantex Plant",
                "specific_location": "Assembly Building 12-44",
                "city": "Amarillo",
                "state": "TX",
                "contractor": "Mason & Hanger Corporation",
                "position_title": "Weapons Assembly Technician",
                "work_duties": "Nuclear weapon assembly and disassembly operations",
                "union_member": True,
                # Additional EE-3 specific fields
                "facility_type": "Atomic Weapons Facility",
                "work_id_number": "PX-44-5678",
                "dosimetry_worn": True,
                "dosimetry_badge_number": "DOE-789012",
                "work_conditions_exposures": "High explosives, radioactive materials, beryllium dust",
                "health_programs": {
                    "former_worker_program": False,
                    "resep": True,
                    "medical_surveillance": False,
                    "medical_study": True,
                    "union_member": True,
                    "other": "",
                },
            },
        ],
    }

    try:
        generator = EE3Generator()
        filename, pdf_bytes = generator.generate(client_record, form_data)

        # Save the test PDF
        with open(f"test_output_{filename}", "wb") as f:
            f.write(pdf_bytes.read())

        print(f"✅ EE-3 test PDF saved as: test_output_{filename}")
        print(f"   📍 Verify placement of all printed variables:")
        print(f"      • Employee Information:")
        print(f"        - Name: {form_data['last_name']}, {form_data['first_name']}")
        print(f"        - Former name: {form_data['former_name'] or '[blank]'}")
        print(f"        - SSN: {form_data['ssn']}")
        print(
            f"        - Address: {form_data['employee_address']}, {form_data['employee_city']}, {form_data['employee_state']} {form_data['employee_zip']}"
        )
        print(
            f"        - Phones: Home: {form_data['phone_home']}, Work: {form_data['phone_work']}, Cell: {form_data['phone_cell']}"
        )
        print(f"      • Contact Person:")
        print(
            f"        - Name: {form_data['contact_last_name']}, {form_data['contact_first_name']}"
        )
        print(
            f"        - Address: {form_data['contact_address']}, {form_data['contact_city']}, {form_data['contact_state']} {form_data['contact_zip']}"
        )
        print(
            f"      • Employment History ({len(form_data['employment_history'])} entries):"
        )
        for i, job in enumerate(form_data["employment_history"]):
            print(f"        Employment #{i+1}:")
            print(
                f"          - Facility: {job['facility_name']} ({job['facility_type']})"
            )
            print(
                f"          - Location: {job['specific_location']}, {job['city']}, {job['state']}"
            )
            print(f"          - Dates: {job['start_date']} to {job['end_date']}")
            print(f"          - Contractor: {job['contractor']}")
            print(f"          - Position: {job['position_title']}")
            print(f"          - Work ID: {job['work_id_number']}")
            print(
                f"          - Dosimetry: {'Yes' if job['dosimetry_worn'] else 'No'} - Badge: {job.get('dosimetry_badge_number', 'N/A')}"
            )
            print(
                f"          - Work Duties: {job['work_duties'][:50]}{'...' if len(job['work_duties']) > 50 else ''}"
            )
            print(f"          - Exposures: {job['work_conditions_exposures']}")
            print(
                f"          - Health Programs: FWP={job['health_programs']['former_worker_program']}, RESEP={job['health_programs']['resep']}"
            )
        print(
            f"   ⚠️  Full EE-3 form implementation needed in generators/ee3_generator.py"
        )
        return True

    except Exception as e:
        print(f"❌ EE-3 test failed: {e}")
        return False


def print_coordinate_guide():
    """Print a helpful guide for understanding PDF coordinates"""
    print("\n" + "=" * 60)
    print("PDF COORDINATE SYSTEM GUIDE")
    print("=" * 60)
    print("PDF coordinates start from BOTTOM-LEFT corner:")
    print("• (0, 0) = Bottom-left corner")
    print("• (612, 792) = Top-right corner (standard letter size)")
    print("• X increases going RIGHT")
    print("• Y increases going UP")
    print("")
    print("Common Y coordinates for letter-size PDF:")
    print("• 750-792: Top margin area")
    print("• 700-750: Header section")
    print("• 600-700: Upper content area")
    print("• 400-600: Middle content area")
    print("• 200-400: Lower content area")
    print("• 50-200: Footer/signature area")
    print("• 0-50: Bottom margin")
    print("")
    print("To adjust coordinates:")
    print("• If text appears too low, INCREASE the Y value")
    print("• If text appears too high, DECREASE the Y value")
    print("• If text appears too far left, INCREASE the X value")
    print("• If text appears too far right, DECREASE the X value")
    print("=" * 60)


def main():
    """Run form generation tests"""
    print("🧪 Form Generation Tests")
    print("========================")
    print("This script generates test PDFs for form generators.")
    print("Use these PDFs to identify correct field positioning.\n")

    # Print coordinate guide
    print_coordinate_guide()

    print("\n🔬 Running Form Tests...")
    print("-" * 50)

    # Run tests
    desert_pulm_passed = test_desert_pulm_referral()
    print()
    withdrawal_passed = test_withdrawal_letter()
    print()
    ee3_passed = test_ee3()

    # Summary
    print("\n📊 Test Results:")
    print("-" * 20)
    desert_status = "✅ PASSED" if desert_pulm_passed else "❌ FAILED"
    withdrawal_status = "✅ PASSED" if withdrawal_passed else "❌ FAILED"
    ee3_status = "✅ PASSED" if ee3_passed else "❌ FAILED"
    print(f"Desert Pulmonary Referral: {desert_status}")
    print(f"Withdrawal Letter: {withdrawal_status}")
    print(f"EE-3 Form: {ee3_status}")

    all_passed = desert_pulm_passed and withdrawal_passed and ee3_passed

    print("\n" + "=" * 60)
    if all_passed:
        print("🎉 ALL TESTS PASSED!")
        print(
            "Check the generated 'test_output_*.pdf' files to verify field positioning."
        )
        print("\nTo adjust coordinates:")
        print("1. Open the test PDF file")
        print("2. Note which fields need repositioning")
        print("3. Edit the corresponding generator file:")
        print("   - generators/desert_pulm_referral_generator.py")
        print("   - generators/withdrawal_letter_generator.py")
        print("   - generators/ee3_generator.py")
        print("4. Adjust the overlay.drawString(x, y, text) coordinates")
        print("5. Re-run this test script to verify changes")
    else:
        print("❌ SOME TESTS FAILED")
        print("Check the error messages above and ensure:")
        print("- Template PDF files exist:")
        print("  - templates/desert_pulm_la_plata_ref.pdf")
        print("  - templates/withdraw_letter.pdf")
        print("  - templates/EE-3.pdf")
        print("- Required Python packages are installed")
        print("- File permissions allow writing test output files")

    print("=" * 60)


if __name__ == "__main__":
    main()
