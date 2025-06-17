import asyncio
import toga
from toga.style import Pack
from toga.style.pack import COLUMN
from forms.en11a_generator import EN11AGenerator
from services.airtable import fetch_clients


class EN11AView:
    def __init__(self, app):
        self.app = app

        # UI elements
        self.record_selector = toga.Selection(
            items=["Loading..."], style=Pack(padding=5)
        )
        self.app.loop.create_task(self.load_clients())
        self.doctor_selector = toga.Selection(
            items=["Dr. Kalcich", "Dr. Lewis"], style=Pack(padding=5)
        )
        self.generate_button = toga.Button(
            "Generate PDF",
            on_press=lambda w: self.app.loop.create_task(self.generate_pdf(w)),
            style=Pack(padding=10),
        )
        self.status_label = toga.Label("", style=Pack(padding=(10, 0)))

        # Layout container
        self.main_box = toga.Box(
            children=[
                toga.Label("Client Record", style=Pack(padding=(5, 0))),
                self.record_selector,
                toga.Label("Select Doctor", style=Pack(padding=(10, 0))),
                self.doctor_selector,
                self.generate_button,
                self.status_label,
            ],
            style=Pack(direction=COLUMN, padding=20),
        )

    async def load_clients(self):
        await asyncio.sleep(0)

        try:
            self.client_records = await asyncio.to_thread(fetch_clients)  # full records
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

    async def generate_pdf(self, widget):
        selected_client = self.record_selector.value
        selected_doctor = self.doctor_selector.value

        if selected_client == "Select a client..." or not selected_doctor:
            self.status_label.text = "Please select a valid client and doctor."
            self.status_label.style.color = "red"
            return

        selected_record = next(
            (
                rec
                for rec in self.client_records
                if rec["fields"].get("Name") == selected_client
            ),
            None,
        )
        if not selected_record:
            self.status_label.text = "Client record not found."
            self.status_label.style.color = "red"
            return

        generator = EN11AGenerator()
        try:
            filename, pdf_bytes = generator.generate(selected_record, selected_doctor)
            save_path = await self.app.main_window.save_file_dialog(
                "Save EN-11A PDF", suggested_filename=filename
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
