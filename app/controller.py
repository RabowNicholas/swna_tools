from app.forms.ee1_pdf import fill_ee1_pdf
from app.forms.en11a_pdf import fill_en11a_pdf
import datetime


def handle_ee1_form(data, signature_path, output_path):
    today = datetime.datetime.today().strftime("%m/%d/%y")
    data.update({"today_date": today, "cancer_checkbox": "Yes", "no": "NO"})
    return fill_ee1_pdf(data, signature_path, output_path)


def handle_en11a_form(data, output_path):
    return fill_en11a_pdf(data, output_path)
