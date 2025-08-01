def access_case_portal(record, case_number, last_name, last_4_ssn):

    try:
        from playwright.sync_api import sync_playwright

        with sync_playwright() as p:
            browser = p.chromium.launch(headless=False)
            page = browser.new_page()
            page.goto("https://eclaimant.dol.gov/portal/?program_name=EN")

            mainframe = page.frame(name="mainframe")

            # Wait for the correct "Upload Document to Existing Case" button
            mainframe.wait_for_selector("input.button-submit", state="visible")

            # Find the "Upload Document to Existing Case" button based on its value text
            upload_buttons = mainframe.query_selector_all("input.button-submit")
            for button in upload_buttons:
                if button.get_attribute("value") == "Upload Document to Existing Case":
                    try:
                        button.click()
                    except:
                        print(
                            "⚠️ Direct click failed, attempting JS-based click fallback."
                        )
                        mainframe.eval_on_selector(
                            'input.button-submit[value="Upload Document to Existing Case"]',
                            "el => el.click()",
                        )
                    break

            # Step 2: Fill in the form fields
            mainframe.fill("input#case_number", case_number)
            mainframe.fill("input#last_name", last_name)
            mainframe.fill("input#last_4_ssn", last_4_ssn)

            # Step 3: Click the "NEXT" button (triggers JS function)
            mainframe.click("input#btnNext")

            # Optional: Wait for navigation to complete (adjust as needed)
            mainframe.wait_for_load_state("networkidle")

            page.pause()
            browser.close()
            print("🎉 Done.")

    except Exception as e:
        print(f"❌ Exception occurred: {e}")
