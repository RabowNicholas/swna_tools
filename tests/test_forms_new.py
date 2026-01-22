import os
import sys

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from generators.ee1_generator import EE1Generator
from generators.ee3_generator import EE3Generator
from generators.ir_notice_generator import IRNoticeGenerator
from datetime import datetime, date


def test_ee1():
    generator = EE1Generator(template_path="web/public/templates/EE-1.pdf")

    # Test data - using a realistic client record structure
    client_record = {
        "fields": {
            "Name": "Smith, John - 1234",
            "DOB": "1965-03-15",
            "SSN": "123-45-6789",
            "Address": "123 Main St, Anytown, ST 12345",
            "Phone": "(555) 123-4567",
        }
    }

    form_data = {
        "form_date": datetime(2025, 8, 1),
        "first_name": "John",
        "middle_initial": "Q",
        "last_name": "Smith",
        "claimant_name": "John Smith",
        "ssn": "123-45-6789",
        "dob": date(1965, 3, 15),
        "sex": "Male",
        "address_main": "123 Main St",
        "address_city": "Anytown",
        "address_state": "ST",
        "address_zip": "12345",
        "address": "123 Main St, Anytown, ST 12345",
        "phone": "(555) 123-4567",
        "email": "john.smith@email.com",
        "diagnosis_categories": {},
        "covered_employment": "Yes",
        "medical_benefits": "Yes",
        "compensation": "Yes",
        "relationship": "Self",
        "claimant_signature": True,
        "signature_date": date(2025, 8, 1)
    }

    filename, pdf_bytes = generator.generate(client_record, form_data)

    # Save to test output
    with open(filename, "wb") as f:
        f.write(pdf_bytes.read())

    print(f"EE-1 test PDF saved as: {filename}")


def test_ee3():
    generator = EE3Generator(template_path="web/public/templates/EE-3.pdf")

    # Test data
    client_record = {
        "fields": {
            "Name": "Williams, Robert - 9012",
            "DOB": "1955-11-08",
            "SSN": "456-78-9012",
        }
    }

    form_data = {
        "first_name": "Robert",
        "last_name": "Williams",
        "former_name": "",
        "ssn": "456-78-9012",
        "employment_history": [
            {
                "start_date": "1975-06-15",
                "end_date": "1985-03-20",
                "facility_name": "Rocky Flats Plant",
                "specific_location": "Building 771",
                "city": "Golden",
                "state": "CO",
                "contractor": "Dow Chemical Company",
                "position_title": "Chemical Operator",
                "union_member": True,
                "dosimetry_worn": True,
                "work_duties": "Operated chemical processing equipment for plutonium production. Handled radioactive materials and performed routine maintenance on processing systems.",
            },
            {
                "start_date": "1985-04-01",
                "end_date": "1995-12-31",
                "facility_name": "Hanford Site",
                "specific_location": "Area 200",
                "city": "Richland",
                "state": "WA",
                "contractor": "Westinghouse Hanford",
                "position_title": "Senior Process Engineer",
                "union_member": False,
                "dosimetry_worn": True,
                "work_duties": "Supervised waste processing operations and managed safety protocols for radioactive waste handling.",
            },
        ],
    }

    filename, pdf_bytes = generator.generate(client_record, form_data)

    # Save to test output
    with open(filename, "wb") as f:
        f.write(pdf_bytes.read())

    print(f"EE-3 test PDF saved as: {filename}")


def test_ir_notice():
    generator = IRNoticeGenerator(template_path="web/public/templates/ir_notice_la_plata.pdf")

    # Test data
    client_name = "John Smith"
    file_number = "12345"
    appointment_date = "2026-03-15"
    provider_name = "La Plata Medical"

    filename, pdf_bytes = generator.generate(
        client_name=client_name,
        file_number=file_number,
        appointment_date=appointment_date,
        provider_name=provider_name,
    )

    # Save to test output
    with open(filename, "wb") as f:
        f.write(pdf_bytes.read())

    print(f"IR Notice test PDF saved as: {filename}")

    # Test with Dr. Lewis
    generator2 = IRNoticeGenerator(template_path="web/public/templates/ir_notice_la_plata.pdf")

    filename2, pdf_bytes2 = generator2.generate(
        client_name="Jane Doe",
        file_number="67890",
        appointment_date="2026-04-20",
        provider_name="Dr. Lewis",
    )

    with open(filename2, "wb") as f:
        f.write(pdf_bytes2.read())

    print(f"IR Notice (Dr. Lewis) test PDF saved as: {filename2}")


def print_coordinate_guide():
    """Print helpful guide for PDF coordinate system"""
    print("\n" + "="*60)
    print("PDF COORDINATE SYSTEM GUIDE")
    print("="*60)
    print("PDF coordinates start from BOTTOM-LEFT corner:")
    print("• (0, 0) = Bottom-left corner")
    print("• (612, 792) = Top-right corner (standard letter size)")
    print("• X increases going RIGHT →")
    print("• Y increases going UP ↑")
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
    print("• Text too low → INCREASE Y value")
    print("• Text too high → DECREASE Y value")
    print("• Text too far left → INCREASE X value")
    print("• Text too far right → DECREASE X value")
    print("="*60)


if __name__ == "__main__":
    print("Form Generator Testing Suite")
    print("=" * 50)

    print("\nSelect test mode:")
    print("1. Test EE-1 form")
    print("2. Test EE-3 form")
    print("3. Test IR Notice form")
    print("4. Test all forms")
    print("5. Show coordinate guide")

    choice = input("\nEnter choice (1-5): ").strip()

    if choice == '1':
        print("\nRunning EE-1 test...")
        print("-" * 30)
        test_ee1()
        print("-" * 30)
        print("Test completed!")

    elif choice == '2':
        print("\nRunning EE-3 test...")
        print("-" * 30)
        test_ee3()
        print("-" * 30)
        print("Test completed!")

    elif choice == '3':
        print("\nRunning IR Notice test...")
        print("-" * 30)
        test_ir_notice()
        print("-" * 30)
        print("Test completed!")

    elif choice == '4':
        print("\nRunning all tests...")
        print("-" * 30)
        test_ee1()
        test_ee3()
        test_ir_notice()
        print("-" * 30)
        print("All tests completed!")

    elif choice == '5':
        print_coordinate_guide()

    else:
        print("Invalid choice")
