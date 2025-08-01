#!/usr/bin/env python3
"""
Test script to generate sample PDFs for EE-1, EE-1a, and EE-3 forms
This will help identify the exact positioning needed for each field.
"""

import os
import sys
from datetime import datetime, date
from io import BytesIO
from PIL import Image, ImageDraw

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from generators.ee1_generator import EE1Generator
from generators.ee1a_generator import EE1AGenerator
from generators.ee3_generator import EE3Generator


def load_signature_file():
    """Load the existing sig1.png signature file for testing"""
    signature_path = "sig1.png"
    if os.path.exists(signature_path):
        with open(signature_path, "rb") as f:
            signature_buffer = BytesIO(f.read())
        return signature_buffer
    else:
        # Fallback: create a simple signature if sig1.png doesn't exist
        img = Image.new("RGB", (200, 60), color="white")
        draw = ImageDraw.Draw(img)
        draw.text((10, 20), "John Doe", fill="black")
        draw.line([(10, 45), (180, 45)], fill="black", width=2)
        signature_buffer = BytesIO()
        img.save(signature_buffer, format="PNG")
        signature_buffer.seek(0)
        return signature_buffer


def test_ee1_form():
    """Test EE-1 form generation with sample data"""
    print("Testing EE-1 form...")

    # Sample client record (mock data)
    client_record = {
        "fields": {
            "Name": "Smith, John - 1234",
            "Case ID": "ABC123",
            "Address": "123 Main St, Anytown, NY 12345",
            "Phone": "555.123.4567",
        }
    }

    # Sample form data with new diagnosis categories structure
    form_data = {
        "first_name": "John",
        "last_name": "Smith",
        "ssn": "123-45-6789",
        "dob": date(1970, 5, 15),
        "sex": "Female",
        "address_main": "123 Main Street",
        "address_city": "Anytown",
        "address_state": "NY",
        "address_zip": "12345",
        "phone": "555.123.4567",
        "diagnosis_categories": {
            "cancer": {
                "selected": True,
                "diagnoses": [
                    {"text": "Lung Cancer", "date": date(2020, 3, 10)},
                    {"text": "Mesothelioma", "date": date(2021, 5, 15)},
                    {
                        "text": "cancer",
                        "date": date(2020, 1, 2),
                    },
                ],
            },
            "beryllium_sensitivity": {
                "selected": True,
                "date": date(2023, 4, 3),
            },
            "chronic_beryllium_disease": {
                "selected": True,
                "date": date(2021, 7, 22),
            },
            "chronic_silicosis": {
                "selected": True,
                "date": date(2019, 11, 15),
            },
            "other": {
                "selected": True,
                "diagnoses": [
                    {"text": "Respiratory Complications", "date": date(2022, 1, 8)},
                    {"text": "Pulmonary Fibrosis", "date": date(2022, 8, 20)},
                    {"text": "Pulmonary thing", "date": date(2023, 8, 20)},
                ],
            },
        },
        "signature_file": load_signature_file(),
    }

    try:
        generator = EE1Generator()
        filename, pdf_bytes = generator.generate(client_record, form_data)

        # Save the test PDF
        with open(f"test_output_{filename}", "wb") as f:
            f.write(pdf_bytes.read())

        print(f"✅ EE-1 test PDF saved as: test_output_{filename}")
        return True

    except Exception as e:
        print(f"❌ EE-1 test failed: {e}")
        return False


def test_ee1a_form():
    """Test EE-1a form generation with sample data"""
    print("Testing EE-1a form...")

    # Sample client record (mock data)
    client_record = {
        "fields": {
            "Name": "Johnson, Mary - 5678",
            "Case ID": "XYZ789",
            "Address": "456 Oak Ave, Springfield, CA 90210",
            "Phone": "555.987.6543",
        }
    }

    # Sample form data with multiple diagnoses
    form_data = {
        "first_name": "Mary",
        "last_name": "Johnson",
        "case_id": "XYZ789",
        "address_main": "456 Oak Avenue",
        "address_city": "Springfield",
        "address_state": "CA",
        "address_zip": "90210",
        "phone": "555.987.6543",
        "diagnoses": [
            {"diagnosis": "Beryllium Sensitivity", "date": date(2019, 8, 22)},
            {"diagnosis": "Chronic Beryllium Disease", "date": date(2021, 11, 5)},
            {"diagnosis": "Respiratory Issues", "date": date(2022, 2, 14)},
            {"diagnosis": "Respiratory Issues", "date": date(2022, 2, 14)},
            {"diagnosis": "Respiratory Issues", "date": date(2022, 2, 14)},
        ],
        "signature_file": load_signature_file(),
    }

    try:
        generator = EE1AGenerator()
        filename, pdf_bytes = generator.generate(client_record, form_data)

        # Save the test PDF
        with open(f"test_output_{filename}", "wb") as f:
            f.write(pdf_bytes.read())

        print(f"✅ EE-1a test PDF saved as: test_output_{filename}")
        return True

    except Exception as e:
        print(f"❌ EE-1a test failed: {e}")
        return False


def test_ee3_form():
    """Test EE-3 form generation with sample data"""
    print("Testing EE-3 form...")

    # Sample client record (mock data)
    client_record = {
        "fields": {
            "Name": "Williams, Robert - 9012",
            "Case ID": "DEF456",
        }
    }

    # Sample form data with employment history
    form_data = {
        "first_name": "Robert",
        "last_name": "Williams",
        "former_name": "Williams, Bob",
        "ssn": "987-65-4321",
        "employment_history": [
            {
                "start_date": date(1985, 6, 1),
                "end_date": date(1992, 12, 31),
                "facility_name": "ABC Manufacturing Plant",
                "specific_location": "Building A, Floor 2",
                "city": "Industrial City",
                "state": "OH",
                "contractor": "Safety First Corp",
                "position_title": "Machine Operator",
                "work_duties": "Operated heavy machinery, maintained equipment, followed safety protocols",
                "union_member": True,
            },
            {
                "start_date": date(1993, 2, 15),
                "end_date": date(2005, 8, 30),
                "facility_name": "XYZ Chemical Works",
                "specific_location": "Laboratory Section",
                "city": "Chemical Valley",
                "state": "WV",
                "contractor": "ChemSafe Solutions",
                "position_title": "Lab Technician",
                "work_duties": "Analyzed chemical samples, maintained lab equipment, documented test results",
                "union_member": False,
            },
            {
                "start_date": date(2006, 1, 10),
                "end_date": date(2018, 5, 15),
                "facility_name": "Nuclear Processing Facility",
                "specific_location": "Containment Unit 3",
                "city": "Atomtown",
                "state": "NM",
                "contractor": "Nuclear Safety Inc",
                "position_title": "Radiation Safety Officer",
                "work_duties": "Monitored radiation levels, ensured compliance with safety regulations, trained personnel on safety procedures",
                "union_member": True,
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
    """Run all form tests"""
    print("🧪 SWNA Forms Test Suite")
    print("========================")
    print("This script generates test PDFs for all three forms with sample data.")
    print("Use these PDFs to identify correct field positioning.\n")

    # Print coordinate guide
    print_coordinate_guide()

    # Ensure output directory exists
    if not os.path.exists("test_outputs"):
        os.makedirs("test_outputs")
        print("📁 Created test_outputs directory")

    # Run tests
    results = []

    print("\n🔬 Running Form Tests...")
    print("-" * 40)

    results.append(("EE-1", test_ee1_form()))
    results.append(("EE-1a", test_ee1a_form()))
    results.append(("EE-3", test_ee3_form()))

    # Summary
    print("\n📊 Test Results Summary:")
    print("-" * 40)

    all_passed = True
    for form_name, passed in results:
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"{form_name:8} {status}")
        if not passed:
            all_passed = False

    print("\n" + "=" * 60)
    if all_passed:
        print("🎉 ALL TESTS PASSED!")
        print(
            "Check the generated 'test_output_*.pdf' files to verify field positioning."
        )
        print("\nTo adjust coordinates:")
        print("1. Open the test PDF files")
        print("2. Note which fields need repositioning")
        print("3. Edit the respective generator files:")
        print("   - generators/ee1_generator.py")
        print("   - generators/ee1a_generator.py")
        print("   - generators/ee3_generator.py")
        print("4. Adjust the overlay.drawString(x, y, text) coordinates")
        print("5. Re-run this test script to verify changes")
    else:
        print("❌ SOME TESTS FAILED")
        print("Check the error messages above and ensure:")
        print("- Template PDF files exist in templates/")
        print("- Required Python packages are installed")
        print("- File permissions allow writing test output files")

    print("=" * 60)


if __name__ == "__main__":
    main()
