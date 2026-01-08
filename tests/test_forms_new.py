import os
from generators.ee1_generator import EE1Generator
from generators.ee1a_generator import EE1AGenerator
from generators.ee3_generator import EE3Generator
from generators.desert_pulm_referral_generator import DesertPulmReferralGenerator
from generators.withdrawal_letter_generator import WithdrawalLetterGenerator
from generators.address_change_generator import AddressChangeGenerator
from datetime import datetime, date


def test_ee1():
    generator = EE1Generator()
    
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


def test_ee1a():
    generator = EE1AGenerator()
    
    # Test data
    client_record = {
        "fields": {
            "Name": "Johnson, Mary - 5678",
            "DOB": "1970-07-22",
            "SSN": "987-65-4321",
            "Address": "456 Oak Ave, Other City, ST 67890",
            "Phone": "(555) 987-6543",
        }
    }
    
    form_data = {
        "form_date": datetime(2025, 8, 1),
        "claimant_name": "Mary Johnson",
        "ssn": "987-65-4321",
        "dob": date(1970, 7, 22),
        "address": "456 Oak Ave, Other City, ST 67890", 
        "phone": "(555) 987-6543",
        "email": "mary.johnson@email.com",
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
    
    print(f"EE-1a test PDF saved as: {filename}")


def test_ee3():
    generator = EE3Generator()
    
    # Test data
    client_record = {
        "fields": {
            "Name": "Williams, Robert - 9012",
            "DOB": "1955-11-08",
            "SSN": "456-78-9012",
            "Address": "789 Pine St, Another Town, ST 34567",
            "Phone": "(555) 456-7890",
        }
    }
    
    form_data = {
        "form_date": datetime(2025, 8, 1),
        "claimant_name": "Robert Williams",
        "ssn": "456-78-9012",
        "dob": date(1955, 11, 8),
        "address": "789 Pine St, Another Town, ST 34567",
        "phone": "(555) 456-7890",
        "email": "robert.williams@email.com",
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
    
    print(f"EE-3 test PDF saved as: {filename}")


def test_desert_pulm_referral():
    generator = DesertPulmReferralGenerator()
    
    # Test data
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
        "claimant_name": "John Smith",
        "appointment_date": date(2025, 8, 22),
        "appointment_time": "10:00 AM"
    }
    
    filename, pdf_bytes = generator.generate(client_record, form_data)
    
    # Save to test output
    with open(filename, "wb") as f:
        f.write(pdf_bytes.read())
    
    print(f"Desert Pulmonary Referral test PDF saved as: {filename}")


def test_withdrawal_letter():
    generator = WithdrawalLetterGenerator()
    
    # Test data
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
        "claimant_name": "John Smith",
        "case_id": "12345678",
        "letter_date": date(2025, 8, 25),
        "claimed_condition": "Lung cancer"
    }
    
    filename, pdf_bytes = generator.generate(client_record, form_data)
    
    # Save to test output
    with open(filename, "wb") as f:
        f.write(pdf_bytes.read())
    
    print(f"Withdrawal Letter test PDF saved as: {filename}")


def test_address_change():
    generator = AddressChangeGenerator()
    
    # Test data
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
        "claimant_name": "John Smith",
        "case_id": "12345678",
        "street_address": "456 New Street Apt 2B",
        "city": "New City",
        "state": "NY",
        "zip_code": "10001"
    }
    
    filename, pdf_bytes = generator.generate(client_record, form_data)
    
    # Save to test output
    with open(filename, "wb") as f:
        f.write(pdf_bytes.read())
    
    print(f"Address Change Letter test PDF saved as: {filename}")


def interactive_test_address_change():
    """Interactive test for fine-tuning address change coordinates"""
    print("\n" + "="*60)
    print("INTERACTIVE ADDRESS CHANGE COORDINATE TESTING")
    print("="*60)
    
    generator = AddressChangeGenerator()
    
    # Test data
    client_record = {
        "fields": {
            "Name": "Smith, John - 1234",
            "Case ID": "DOL-12345678"
        }
    }
    
    while True:
        print("\nCurrent coordinate settings:")
        print("- Claimant name: (83, 730)")
        print("- Case ID: (78, 717)")
        print("- Street address: (112, 353)")
        print("- City, State, ZIP: (112, 340)")
        print("- First name replacement: (620, 453)")
        
        print("\nOptions:")
        print("1. Test with current coordinates")
        print("2. Adjust claimant name coordinates")
        print("3. Adjust case ID coordinates")
        print("4. Adjust street address coordinates")
        print("5. Adjust city/state/zip coordinates")
        print("6. Adjust name replacement coordinates")
        print("7. Exit")
        
        choice = input("\nEnter choice (1-7): ").strip()
        
        if choice == '7':
            break
        elif choice == '1':
            form_data = {
                "claimant_name": "John Smith",
                "case_id": "DOL-12345678",
                "street_address": "456 New Street Apt 2B",
                "city": "New City",
                "state": "NY",
                "zip_code": "10001"
            }
            
            filename, pdf_bytes = generator.generate(client_record, form_data)
            
            with open(f"test_address_change_coordinates.pdf", "wb") as f:
                f.write(pdf_bytes.read())
            
            print("Test PDF saved as: test_address_change_coordinates.pdf")
            input("Press Enter to continue after reviewing the PDF...")
            
        elif choice in ['2', '3', '4', '5', '6']:
            try:
                x = int(input("Enter X coordinate: "))
                y = int(input("Enter Y coordinate: "))
                
                # Temporarily modify the generator for testing
                if choice == '2':
                    print(f"Testing claimant name at ({x}, {y})")
                elif choice == '3':
                    print(f"Testing case ID at ({x}, {y})")
                elif choice == '4':
                    print(f"Testing street address at ({x}, {y})")
                elif choice == '5':
                    print(f"Testing city/state/zip at ({x}, {y})")
                elif choice == '6':
                    print(f"Testing name replacement at ({x}, {y})")
                
                # You would need to modify the generator's draw_pdf method temporarily
                print("Note: To apply these coordinates, update the draw_pdf method in AddressChangeGenerator")
                
            except ValueError:
                print("Invalid coordinates. Please enter numbers only.")
        else:
            print("Invalid choice. Please try again.")


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
    print("1. Run all standard tests")
    print("2. Test individual form")
    print("3. Interactive address change coordinate testing")
    print("4. Show coordinate guide")
    
    choice = input("\nEnter choice (1-4): ").strip()
    
    if choice == '1':
        print("\nRunning all standard tests...")
        print("-" * 30)
        test_ee1()
        test_ee1a() 
        test_ee3()
        test_desert_pulm_referral()
        test_withdrawal_letter()
        test_address_change()
        print("-" * 30)
        print("All tests completed!")
        
    elif choice == '2':
        print("\nAvailable forms to test:")
        print("1. EE-1")
        print("2. EE-1a")
        print("3. EE-3")
        print("4. Desert Pulmonary Referral")
        print("5. Withdrawal Letter")
        print("6. Address Change Letter")
        
        form_choice = input("\nSelect form (1-6): ").strip()
        
        if form_choice == '1':
            test_ee1()
        elif form_choice == '2':
            test_ee1a()
        elif form_choice == '3':
            test_ee3()
        elif form_choice == '4':
            test_desert_pulm_referral()
        elif form_choice == '5':
            test_withdrawal_letter()
        elif form_choice == '6':
            test_address_change()
        else:
            print("Invalid choice")
            
    elif choice == '3':
        interactive_test_address_change()
    
    elif choice == '4':
        print_coordinate_guide()
    
    else:
        print("Invalid choice")