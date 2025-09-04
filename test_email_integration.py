#!/usr/bin/env python3
"""
Test email integration with debug output
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.email_service import EmailService
from config.email_config import get_email_recipients, detect_client_status
from templates.email_templates import format_ir_email, get_subject_line

def test_email_integration():
    """Test the complete email integration"""
    print("🧪 Testing Email Integration")
    print("=" * 50)
    
    # Test data
    test_scenarios = [
        {
            "doctor": "La Plata",
            "client_status": "",
            "hhc_location": "",
            "client_record": {"fields": {"Name": "Smith, John - 1234"}}
        },
        {
            "doctor": "Dr. Lewis", 
            "client_status": "AO Client",
            "hhc_location": "",
            "client_record": {"fields": {"Name": "Johnson, Mary - 5678", "Status": "AO Client"}}
        },
        {
            "doctor": "AO",
            "client_status": "GHHC Client",
            "hhc_location": "NV",
            "client_record": {"fields": {"Name": "Williams, Bob - 9012", "Tags": ["GHHC Client"]}}
        }
    ]
    
    email_service = EmailService()
    
    for i, scenario in enumerate(test_scenarios, 1):
        print(f"\n--- Test Scenario {i} ---")
        print(f"Doctor: {scenario['doctor']}")
        print(f"Client Status: {scenario['client_status'] or 'None'}")
        print(f"HHC Location: {scenario['hhc_location'] or 'N/A'}")
        
        # Test recipient routing
        to_recipients, cc_recipients = get_email_recipients(
            scenario['doctor'], 
            scenario['client_status'], 
            scenario['hhc_location']
        )
        
        print(f"TO Recipients: {to_recipients}")
        print(f"CC Recipients: {cc_recipients}")
        
        # Test client status detection
        detected_status = detect_client_status(scenario['client_record'])
        print(f"Detected Status: '{detected_status}'")
        
        # Test email template
        client_name = "Test Client"
        email_body = format_ir_email(
            doctor_selection=scenario['doctor'],
            name=client_name,
            phone="555.123.4567",
            dob="01/01/1970",
            case_id="TEST-123",
            address="123 Test St\nTest City, TS 12345",
            work_history_dates="01/1990-12/2020"
        )
        
        subject = get_subject_line(client_name)
        print(f"Subject: {subject}")
        
        # Validate recipients
        if not to_recipients:
            print("❌ ERROR: No TO recipients!")
        elif not to_recipients[0]:
            print("❌ ERROR: Empty TO recipient!")
        else:
            print("✅ Recipients look good")
        
        print("Email Body Preview:")
        print("-" * 20)
        print(email_body[:200] + "..." if len(email_body) > 200 else email_body)
        print("-" * 20)


if __name__ == "__main__":
    test_email_integration()