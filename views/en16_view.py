import asyncio
from toga.style import Pack
from toga.style.pack import COLUMN
import toga
from services.airtable import fetch_clients
from generators.en16_generator import EN16Generator


class EN16View:
    def __init__(self, app):
        self.app = app
        self.client_records = []

        self.record_selector = toga.Selection(
            items=["Loading..."], style=Pack(padding=5)
        )
        self.app.loop.create_task(self.load_clients())

        self.generate_button = toga.Button(
            "Generate EN-16",
            on_press=lambda w: self.app.loop.create_task(self.generate_en16(w)),
            style=Pack(padding=10),
        )
        self.status_label = toga.Label("", style=Pack(padding_top=10))

        self.main_box = toga.Box(
            children=[
                toga.Label("Client Record", style=Pack(padding=(5, 0))),
                self.record_selector,
                self.generate_button,
                self.status_label,
            ],
            style=Pack(direction=COLUMN, padding=10),
        )

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

    async def generate_en16(self, widget):
        selected_client = self.record_selector.value
        if selected_client == "Select a client..." or not selected_client:
            self.status_label.text = "Please select a valid client."
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

        generator = EN16Generator()
        try:
            filename, pdf_bytes = generator.generate(selected_record)
            save_path = await self.app.main_window.save_file_dialog(
                "Save EN-16 PDF", suggested_filename=filename
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
