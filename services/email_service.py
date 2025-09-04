import os
import webbrowser
import urllib.parse
from typing import List, Optional
import streamlit as st


class EmailService:
    """Service for creating email drafts with attachments"""
    
    def __init__(self):
        self.outlook_available = self._check_outlook_availability()
    
    def _check_outlook_availability(self) -> bool:
        """Check if Outlook COM automation is available"""
        try:
            if os.name == 'nt':  # Windows
                import win32com.client
                return True
            return False
        except ImportError:
            return False
    
    def create_email_draft(
        self,
        to_recipients: List[str],
        cc_recipients: Optional[List[str]] = None,
        subject: str = "",
        body: str = "",
        attachments: Optional[List[str]] = None
    ) -> bool:
        """
        Create an email draft with specified recipients and content
        
        Args:
            to_recipients: List of TO recipient email addresses
            cc_recipients: List of CC recipient email addresses
            subject: Email subject line
            body: Email body content (HTML supported for Outlook)
            attachments: List of file paths to attach (not used - manual attachment)
        
        Returns:
            bool: True if email draft created successfully, False otherwise
        """
        if self.outlook_available:
            return self._create_outlook_draft(
                to_recipients, cc_recipients, subject, body, attachments
            )
        else:
            return self._create_mailto_draft(
                to_recipients, cc_recipients, subject, body
            )
    
    def _create_outlook_draft(
        self,
        to_recipients: List[str],
        cc_recipients: Optional[List[str]] = None,
        subject: str = "",
        body: str = "",
        attachments: Optional[List[str]] = None
    ) -> bool:
        """Create draft using Outlook COM automation"""
        try:
            import win32com.client
            
            # Validate recipients
            if not to_recipients or not to_recipients[0].strip():
                st.error("❌ No valid TO recipients provided")
                return False
            
            # Connect to Outlook
            outlook = win32com.client.Dispatch('outlook.application')
            
            # Create new mail item
            mail = outlook.CreateItem(0)  # 0 = olMailItem
            
            # Set recipients with validation
            to_string = "; ".join([addr.strip() for addr in to_recipients if addr.strip()])
            mail.To = to_string
            
            if cc_recipients:
                cc_string = "; ".join([addr.strip() for addr in cc_recipients if addr.strip()])
                mail.CC = cc_string
            
            # Set subject and body
            mail.Subject = subject
            mail.HTMLBody = body.replace('\n', '<br>')
            
            # Add attachments if provided (though user will add manually)
            if attachments:
                for attachment_path in attachments:
                    if os.path.exists(attachment_path):
                        mail.Attachments.Add(attachment_path)
            
            # Save as draft (don't send)
            mail.Save()
            
            # Display the draft for user review
            mail.Display()
            
            return True
            
        except Exception as e:
            st.error(f"Failed to create Outlook draft: {e}")
            return False
    
    def _create_mailto_draft(
        self,
        to_recipients: List[str],
        cc_recipients: Optional[List[str]] = None,
        subject: str = "",
        body: str = ""
    ) -> bool:
        """Create draft using mailto: link (fallback method)"""
        try:
            # Validate recipients
            if not to_recipients or not to_recipients[0].strip():
                st.error("❌ No valid TO recipients provided for mailto")
                return False
            
            # Build mailto URL
            valid_to_recipients = [addr.strip() for addr in to_recipients if addr.strip()]
            mailto_url = f"mailto:{';'.join(valid_to_recipients)}"
            
            # Add query parameters
            params = {}
            if cc_recipients:
                params['cc'] = ';'.join(cc_recipients)
            if subject:
                params['subject'] = subject
            if body:
                params['body'] = body
            
            if params:
                query_string = urllib.parse.urlencode(params, quote_via=urllib.parse.quote)
                mailto_url += f"?{query_string}"
            
            # Open in default email client
            webbrowser.open(mailto_url)
            return True
            
        except Exception as e:
            st.error(f"Failed to create email using mailto: {e}")
            return False
    
    def format_email_body_html(self, template: str, **kwargs) -> str:
        """
        Format email template with HTML formatting
        
        Args:
            template: Email template string with placeholders
            **kwargs: Values to substitute in template
        
        Returns:
            str: Formatted HTML email body
        """
        # Replace newlines with HTML line breaks
        formatted_body = template.format(**kwargs)
        
        # Convert to HTML format for Outlook
        html_body = formatted_body.replace('\n', '<br>\n')
        
        return html_body
    
    def is_outlook_available(self) -> bool:
        """Check if Outlook integration is available"""
        return self.outlook_available