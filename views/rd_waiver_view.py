import asyncio
import toga
from toga.style import Pack
from toga.style.pack import COLUMN
from services.airtable import fetch_clients
from generators.rd_waiver_generator import RDAcceptWaiverGenerator
from datetime import datetime


class RDAcceptWaiverView:
    def __init__(self, app):
        self.app = app
        self.client_records = []

        # UI fields
        self.record_selector = toga.Selection(
            items=["Loading..."], style=Pack(padding=5)
        )
        self.claimant_input = toga.TextInput(style=Pack(padding=5))
        self.employee_input = toga.TextInput(style=Pack(padding=5))
        self.case_id_input = toga.TextInput(style=Pack(padding=5))
        self.rd_decision_input = toga.TextInput(
            style=Pack(padding=5),
            placeholder="MM/DD/YYYY",
        )  # or DateInput if you prefer
        self.generate_button = toga.Button(
            "Generate RD Accept Waiver",
            on_press=lambda w: self.app.loop.create_task(self.generate_pdf(w)),
            style=Pack(padding=10),
        )
        self.status_label = toga.Label("", style=Pack(padding_top=10))

        self.main_box = toga.Box(
            children=[
                toga.Label("Client Record", style=Pack(padding=(5, 0))),
                self.record_selector,
                toga.Label("Claimant Name"),
                self.claimant_input,
                toga.Label("Employee Name"),
                self.employee_input,
                toga.Label("Case ID"),
                self.case_id_input,
                toga.Label("RD Decision Date"),
                self.rd_decision_input,
                toga.Label("Current Date"),
                self.generate_button,
                self.status_label,
            ],
            style=Pack(direction=COLUMN, padding=10),
        )

        self.record_selector.on_change = self.prefill_fields
        self.app.loop.create_task(self.load_clients())

    async def load_clients(self):
        await asyncio.sleep(0)
        try:
            self.client_records = await asyncio.to_thread(fetch_clients)
            formatted_names = [
                record["fields"].get("Name", f"Unnamed {i}")
                for i, record in enumerate(self.client_records)
            ]
            self.record_selector.items = ["Select a client..."] + formatted_names
            self.record_selector._impl.set_enabled(True)
        except Exception as e:
            self.record_selector.items = ["Failed to load"]
            self.status_label.text = f"Error loading clients: {e}"
            self.status_label.style.color = "red"

    def prefill_fields(self, widget):
        selected_name = self.record_selector.value
        if selected_name == "Select a client...":
            return

        selected_record = next(
            (
                rec
                for rec in self.client_records
                if rec["fields"].get("Name") == selected_name
            ),
            None,
        )
        if not selected_record:
            return

        fields = selected_record["fields"]
        raw_name = fields.get("Name", "")
        try:
            last, rest = raw_name.split(",", 1)
            first = rest.split("-")[0].strip()
            full_name = f"{first} {last.strip()}"
        except ValueError:
            full_name = raw_name

        self.claimant_input.value = full_name
        self.employee_input.value = full_name
        self.case_id_input.value = fields.get("Case ID", "")

    async def generate_pdf(self, widget):
        try:
            generator = RDAcceptWaiverGenerator()
            filename, pdf_bytes = generator.generate(
                claimant=self.claimant_input.value,
                employee=self.employee_input.value,
                case_id=self.case_id_input.value,
                rd_decision_date=self.rd_decision_input.value,
                current_date=datetime.now().strftime("%m/%d/%Y"),
            )
            save_path = await self.app.main_window.save_file_dialog(
                "Save RD Accept Waiver PDF", suggested_filename=filename
            )
            if save_path:
                with open(save_path, "wb") as f:
                    f.write(pdf_bytes.read())
                self.status_label.text = f"Saved to {save_path}"
                self.status_label.style.color = "green"
            else:
                self.status_label.text = "Save cancelled."
                self.status_label.style.color = "white"
        except Exception as e:
            self.status_label.text = f"Error: {str(e)}"
            self.status_label.style.color = "red"
