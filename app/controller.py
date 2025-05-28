from app.forms.ee1 import fill_ee1_pdf
import datetime

def handle_ee1_form(data, signature_path):
    today = datetime.datetime.today().strftime('%m/%d/%y')
    data.update({
        'today_date': today,
        'cancer_checkbox': 'Yes',
        'no': 'NO'
    })
    return fill_ee1_pdf(data, signature_path)