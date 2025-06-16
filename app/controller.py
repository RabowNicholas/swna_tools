from app.forms.ee1_pdf import fill_ee1_pdf
from app.forms.en11a_pdf import fill_en11a_pdf
from app.forms.invoice_pdf import fill_invoice_excel  # Assumed future function
import datetime


class FormController:
    def handle_ee1_form(self, data, signature_path, output_path):
        if not data.get("client_name"):
            raise ValueError("Client name is required.")
        if not data.get("case_id"):
            raise ValueError("Case ID is required.")
        today = datetime.datetime.today().strftime("%m/%d/%y")
        data.update({"today_date": today, "cancer_checkbox": "Yes", "no": "NO"})
        return fill_ee1_pdf(data, signature_path, output_path)

    def handle_en11a_form(self, data, output_path):
        if not data.get("employee_name"):
            raise ValueError("Employee name is required.")
        if not data.get("case_id"):
            raise ValueError("Case ID is required.")
        return fill_en11a_pdf(data, output_path)

    def handle_invoice_form(self, data, output_path):
        if not data.get("client_name"):
            raise ValueError("Client name is required.")
        if not data.get("case_id"):
            raise ValueError("Case ID is required.")
        return fill_invoice_excel(data, output_path)
