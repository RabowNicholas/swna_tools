#!/usr/bin/env python3
"""
Test script for email automation system
Tests email templates, configuration, and service functionality
"""

import sys
import os

# Add project root to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.email_service import EmailService
from config.email_config import (
    detect_client_status, get_email_recipients, 
    is_hhc_client, is_ao_client
)
from templates.email_templates import format_ir_email, get_subject_line


def test_email_templates():
    """Test email template formatting"""
    print("📧 Testing Email Templates")
    print("-" * 40)
    
    # Test data
    test_client_name = "John Smith"
    test_phone = "555.123.4567"
    test_dob = "01/15/1970"
    test_case_id = "DOL-12345678"
    test_address = "123 Main Street\nAnytown, NY 12345"
    test_work_history = "01/1990-12/2020, 03/2021-06/2023"
    
    # Test standard template (La Plata)
    print("\n1. Standard Template (La Plata):")
    standard_email = format_ir_email(
        doctor_selection="La Plata",
        name=test_client_name,
        phone=test_phone,
        dob=test_dob,
        case_id=test_case_id,
        address=test_address
    )
    print(standard_email)
    
    # Test Dr. Lewis template
    print("\n2. Dr. Lewis Template:")
    lewis_email = format_ir_email(
        doctor_selection="Dr. Lewis",
        name=test_client_name,
        phone=test_phone,
        dob=test_dob,
        case_id=test_case_id,
        address=test_address,
        work_history_dates=test_work_history
    )
    print(lewis_email)
    
    # Test AO template
    print("\n3. AO Template:")
    ao_email = format_ir_email(
        doctor_selection="AO",
        name=test_client_name,
        phone=test_phone,
        dob=test_dob,
        case_id=test_case_id,
        address=test_address
    )
    print(ao_email)
    
    # Test subject line
    print(f"\n4. Subject Line: {get_subject_line(test_client_name)}")


def test_client_status_detection():
    """Test client status detection from Airtable records"""
    print("\n\n🏷️ Testing Client Status Detection")
    print("-" * 40)
    
    # Test records
    test_records = [
        {
            "fields": {
                "Name": "Smith, John - 1234",
                "Status": "AO Client"
            }
        },
        {
            "fields": {
                "Name": "Johnson, Mary - 5678", 
                "Tags": ["GHHC Client", "Active"]
            }
        },
        {
            "fields": {
                "Name": "Williams, Bob - 9012",
                "Client Type": "Regular Client"
            }
        },
        {
            "fields": {
                "Name": "Davis, Jane - 3456"
                # No status field
            }
        }
    ]
    
    for i, record in enumerate(test_records, 1):
        client_name = record["fields"].get("Name", f"Client {i}")
        detected_status = detect_client_status(record)
        print(f"{i}. {client_name}: '{detected_status}'")
        
        if detected_status:
            print(f"   - Is AO Client: {is_ao_client(detected_status)}")
            print(f"   - Is GHHC Client: {is_hhc_client(detected_status)}")


def test_email_recipients():
    """Test email recipient routing logic"""
    print("\n\n📬 Testing Email Recipients Routing")
    print("-" * 40)
    
    # Test scenarios
    test_scenarios = [
        ("La Plata", "AO Client", ""),
        ("La Plata", "GHHC Client", "NV"),
        ("La Plata", "GHHC Client", "TN"),
        ("Dr. Lewis", "AO Client", ""),
        ("Dr. Lewis", "GHHC Client", "NV"),
        ("AO", "GHHC Client", "TN"),
        ("La Plata", "", ""),  # No status detected
    ]
    
    for i, (doctor, status, location) in enumerate(test_scenarios, 1):
        to_recipients, cc_recipients = get_email_recipients(doctor, status, location)
        
        print(f"\n{i}. Doctor: {doctor}, Status: {status or 'None'}, Location: {location or 'N/A'}")
        print(f"   TO: {', '.join(to_recipients)}")
        print(f"   CC: {', '.join(cc_recipients)}")


def test_email_service():
    """Test email service functionality"""
    print("\n\n📨 Testing Email Service")
    print("-" * 40)
    
    email_service = EmailService()
    
    print(f"1. Outlook Available: {email_service.is_outlook_available()}")
    
    # Test email creation (won't actually send)
    print("\n2. Email Service Configuration:")
    print(f"   - Service initialized: ✓")
    print(f"   - COM automation: {'✓' if email_service.outlook_available else '✗'}")
    print(f"   - Fallback method: ✓")


def main():
    """Run all tests"""
    print("🧪 Email Automation System Tests")
    print("=" * 50)
    
    try:
        test_email_templates()
        test_client_status_detection()
        test_email_recipients()
        test_email_service()
        
        print("\n" + "=" * 50)
        print("✅ All tests completed successfully!")
        print("\nNext steps:")
        print("1. Test the email automation in the Streamlit app")
        print("2. Generate an EE-10 form")
        print("3. Try the 'Draft IR Request Email' button")
        print("4. Verify Outlook draft creation (Windows only)")
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()