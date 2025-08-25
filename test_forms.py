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

    # Summary
    print("\n📊 Test Results:")
    print("-" * 20)
    desert_status = "✅ PASSED" if desert_pulm_passed else "❌ FAILED"
    withdrawal_status = "✅ PASSED" if withdrawal_passed else "❌ FAILED"
    print(f"Desert Pulmonary Referral: {desert_status}")
    print(f"Withdrawal Letter: {withdrawal_status}")

    all_passed = desert_pulm_passed and withdrawal_passed

    print("\n" + "=" * 60)
    if all_passed:
        print("🎉 ALL TESTS PASSED!")
        print("Check the generated 'test_output_*.pdf' files to verify field positioning.")
        print("\nTo adjust coordinates:")
        print("1. Open the test PDF file")
        print("2. Note which fields need repositioning")
        print("3. Edit the corresponding generator file:")
        print("   - generators/desert_pulm_referral_generator.py")
        print("   - generators/withdrawal_letter_generator.py")
        print("4. Adjust the overlay.drawString(x, y, text) coordinates")
        print("5. Re-run this test script to verify changes")
    else:
        print("❌ SOME TESTS FAILED")
        print("Check the error messages above and ensure:")
        print("- Template PDF files exist:")
        print("  - templates/desert_pulm_la_plata_ref.pdf")
        print("  - templates/withdraw_letter.pdf")
        print("- Required Python packages are installed")
        print("- File permissions allow writing test output files")

    print("=" * 60)


if __name__ == "__main__":
    main()
