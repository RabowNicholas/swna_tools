from dol_portal.access_case_portal import access_case_portal
from datetime import datetime


def upload_en16_to_portal(record, case_id, claimant):
    from playwright.sync_api import sync_playwright

    ssn_last4 = record["fields"]["Name"].split("-")[-1].strip()

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=False)
            page = browser.new_page()
            page.goto("https://eclaimant.dol.gov/portal/?program_name=EN")

            mainframe = page.frame(name="mainframe")
            access_case_portal(
                mainframe, case_id, last_name=claimant.split()[-1], last_4_ssn=ssn_last4
            )

            mainframe = page.frame(name="mainframe")

            page.pause()

            browser.close()
            print("🎉 Done.")
    except Exception as e:
        print(f"❌ Exception occurred: {e}")
