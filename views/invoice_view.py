import asyncio
import toga
from toga.style import Pack
from toga.style.pack import COLUMN, ROW
from generators.invoice_generator import generate_invoice_file
from services.airtable import fetch_clients, fetch_invoice_by_id
from datetime import date, timedelta
import re


class InvoiceView:
    def __init__(self, app):
        self.app = app
        self.invoice_items = []

        # UI elements
        self.client_selector = toga.Selection(
            items=["Loading..."], style=Pack(padding=5, flex=1)
        )
        self.client_name_input = toga.TextInput(style=Pack(padding=5, flex=1))
        self.app.loop.create_task(self.load_clients())
        self.client_selector.on_change = self.populate_client_fields
        self.invoice_number_input = toga.TextInput(
            style=Pack(padding=5, flex=1), placeholder="1"
        )
        future_date = date.today() + timedelta(days=30)
        self.invoice_date_input = toga.TextInput(
            style=Pack(padding=5, flex=1),
            placeholder="MM/DD/YYYY",
            value=future_date.strftime("%m/%d/%Y"),
        )
        self.case_id_input = toga.TextInput(style=Pack(padding=5, flex=1))
        self.address_input = toga.TextInput(style=Pack(padding=5, flex=1))
        self.fd_letter_date_input = toga.TextInput(
            style=Pack(padding=5, flex=1),
            placeholder="MM/DD/YYYY",
        )

        self.ar_fee = toga.TextInput(value="2")
        self.part_selector = toga.Selection(
            items=["Part B", "Part E"], style=Pack(padding=5, flex=1)
        )
        self.percentage_owed = toga.Box(
            children=[toga.Label("AR Fee (%)"), self.ar_fee]
        )
        self.percentage_owed.style.display = "none"  # Hidden by default
        self.part_e_amount_input = toga.TextInput(
            style=Pack(padding=5, flex=1), placeholder="Amount Awarded (e.g. 2000)"
        )
        self.part_e_amount_input_box = toga.Box(
            children=[
                toga.Label("Awarded Amount", style=Pack(padding=(10, 0))),
                self.part_e_amount_input,
            ],
            style=Pack(direction=COLUMN),
        )
        self.part_e_amount_input_box.style.update(visibility="hidden")

        self.part_selector.on_change = self.on_part_change

        # Invoice items container
        self.items_box = toga.Box(style=Pack(direction=COLUMN, padding=5))
        self.add_invoice_item()

        # Buttons

        self.generate_button = toga.Button(
            "Generate Invoice", on_press=self.generate_invoice, style=Pack(padding=10)
        )
        self.add_item_button = toga.Button(
            "Add Item", on_press=self.add_invoice_item, style=Pack(padding=5)
        )
        self.status_label = toga.Label("", style=Pack(padding=(10, 0)))

        # Layout
        self.main_box = toga.Box(
            children=[
                toga.Label("Client Record", style=Pack(padding=(5, 0))),
                self.client_selector,
                toga.Label("Client Name", style=Pack(padding=(10, 0))),
                self.client_name_input,
                toga.Label("Case ID", style=Pack(padding=(10, 0))),
                self.case_id_input,
                toga.Label("Invoice Date", style=Pack(padding=(10, 0))),
                self.invoice_date_input,
                toga.Label("Invoice Number", style=Pack(padding=(10, 0))),
                self.invoice_number_input,
                toga.Label("Address", style=Pack(padding=(10, 0))),
                self.address_input,
                toga.Label("Date on FD Letter", style=Pack(padding=(10, 0))),
                self.fd_letter_date_input,
                toga.Label("Award Type", style=Pack(padding=(10, 0))),
                self.part_selector,
                self.part_e_amount_input_box,
                self.percentage_owed,
                toga.Label("Invoice Items", style=Pack(padding=(10, 10))),
                self.items_box,
                self.add_item_button,
                self.generate_button,
                self.status_label,
            ],
            style=Pack(direction=COLUMN),
        )

    async def load_clients(self):
        await asyncio.sleep(0)
        try:
            self.client_records = await asyncio.to_thread(fetch_clients)
            formatted_names = [
                rec["fields"].get("Name", f"Unnamed {i}")
                for i, rec in enumerate(self.client_records)
            ]

            self.client_selector.items = ["Select a client..."] + formatted_names
            self.client_selector._impl.set_enabled(True)
        except Exception as e:
            self.client_selector.items = ["Failed to load"]
            self.status_label.text = f"Error loading clients: {e}"
            self.status_label.style.color = "red"

    def add_invoice_item(self, widget=None):
        item_selector = toga.Selection(
            items=[
                "Physician File Review - Dr. Toupin",
                "Physician File Review - Dr. Herold",
                "B-read Imaging - Dr. Klepper",
                "B-read Imaging - Dr. Smith",
                "B-read 2nd Opinion - Dr. Smith",
                "Physician Response Memo - Dr. Toupin",
                "Physician Response Memo - Dr. Herold",
                "Discount",
            ],
            style=Pack(padding=5, flex=2),
        )
        date_input = toga.TextInput(
            style=Pack(padding=5, flex=1), placeholder="MM/DD/YYYY"
        )
        remove_button = toga.Button("Remove", style=Pack(padding=5))
        item_row = toga.Box(
            children=[item_selector, date_input, remove_button],
            style=Pack(direction=ROW),
        )
        remove_button.on_press = lambda w: self.remove_invoice_item(item_row)

        self.invoice_items.append((item_selector, date_input))
        self.items_box.add(item_row)

    def remove_invoice_item(self, item_row):
        # Remove the item_row from the UI
        self.items_box.remove(item_row)
        # Remove the corresponding (selector, date_input) from self.invoice_items
        # by matching the widgets in the item_row's children
        children = list(item_row.children)
        self.invoice_items = [
            (selector, date_input)
            for selector, date_input in self.invoice_items
            if not (selector in children and date_input in children)
        ]

    def on_part_change(self, widget):
        is_part_e = self.part_selector.value == "Part E"
        self.part_e_amount_input_box.style.update(
            visibility="visible" if is_part_e else "hidden"
        )
        self.percentage_owed.style.update(
            visibility="hidden" if is_part_e else "visible"
        )

    async def generate_invoice(self, widget):
        try:
            fields = {
                "invoice_date": self.invoice_date_input.value,
                "case_id": self.case_id_input.value,
                "invoice_number": self.invoice_number_input.value,
                "client_name": self.client_name_input.value,
                "address": self.address_input.value,
                "fd_letter_date": self.fd_letter_date_input.value,
                "part_type": self.part_selector.value,
                "ar_fee": self.ar_fee.value,
                "awarded_amount": self.part_e_amount_input.value,
                "invoice_items": [
                    {"name": selector.value, "date": date_input.value}
                    for selector, date_input in self.invoice_items
                ],
            }

            filename, excel_bytes = generate_invoice_file(fields)
            save_path = await self.app.main_window.save_file_dialog(
                "Save Invoice", suggested_filename=filename
            )

            if save_path:
                with open(save_path, "wb") as f:
                    f.write(excel_bytes.read())
                self.status_label.text = f"Saved to {save_path}"
                self.status_label.style.color = "green"
            else:
                self.status_label.text = "Save cancelled."
                self.status_label.style.color = "white"
        except Exception as e:
            self.status_label.text = f"Error: {str(e)}"
            self.status_label.style.color = "red"

    def populate_client_fields(self, widget):
        self.invoice_items.clear()
        self.main_box.remove(self.items_box)
        self.items_box = toga.Box(style=Pack(direction=COLUMN, padding=5))
        self.main_box.insert(
            self.main_box.children.index(self.add_item_button), self.items_box
        )
        selected_name = self.client_selector.value
        if selected_name == "Select a client...":
            return

        record = next(
            (
                rec
                for rec in self.client_records
                if rec["fields"].get("Name") == selected_name
            ),
            None,
        )
        if record:
            fields = record["fields"]
            raw_name = fields.get("Name", "")
            last, rest = raw_name.split(",", 1)
            first = rest.split("-")[0].strip()
            self.client_name_input.value = f"{first} {last.strip()}"
            self.case_id_input.value = fields.get("Case ID", "")
            self.address_input.value = fields.get("Address", "")
            invoice_records = fields.get("Invoicing", [])
            if isinstance(invoice_records, list):
                for invoice_id in invoice_records:
                    invoice = fetch_invoice_by_id(invoice_id)
                    fields = invoice.get("fields", {})
                    item_selector = toga.Selection(
                        items=[
                            "Physician File Review - Dr. Toupin",
                            "Physician File Review - Dr. Herold",
                            "B-read Imaging - Dr. Klepper",
                            "B-read Imaging - Dr. Smith",
                            "B-read 2nd Opinion - Dr. Smith",
                            "Physician Response Memo - Dr. Toupin",
                            "Physician Response Memo - Dr. Herold",
                            "Discount",
                        ],
                        style=Pack(padding=5, flex=2),
                    )
                    raw_value = fields.get("Name", "").lower()

                    if "pending" in raw_value or "payment complete" in raw_value:
                        return

                    if "toupin" in raw_value and "memo" in raw_value:
                        mapped_value = "Physician Response Memo - Dr. Toupin"
                    elif "toupin" in raw_value:
                        mapped_value = "Physician File Review - Dr. Toupin"
                    elif "herold" in raw_value and "memo" in raw_value:
                        mapped_value = "Physician Response Memo - Dr. Herold"
                    elif "herold" in raw_value:
                        mapped_value = "Physician File Review - Dr. Herold"
                    elif "klepper" in raw_value and "2nd" in raw_value:
                        mapped_value = "B-read 2nd Opinion - Dr. Smith"
                    elif "klepper" in raw_value or "b-read" in raw_value:
                        mapped_value = "B-read Imaging - Dr. Klepper"
                    elif "smith" in raw_value and "2nd" in raw_value:
                        mapped_value = "B-read 2nd Opinion - Dr. Smith"
                    elif "smith" in raw_value or "b-read" in raw_value:
                        mapped_value = "B-read Imaging - Dr. Smith"
                    elif (
                        "discount" in raw_value
                        or "-$" in raw_value
                        or "$-" in raw_value
                    ):
                        mapped_value = "Discount"
                    else:
                        mapped_value = ""

                    item_selector.value = mapped_value

                    date_match = re.search(
                        r"(\d{1,2})[./](\d{1,2})[./](\d{2,4})", raw_value
                    )
                    if date_match:
                        month, day, year = date_match.groups()
                        if len(year) == 2:
                            year = "20" + year
                        parsed_date = f"{int(month):02d}/{int(day):02d}/{year}"
                    else:
                        parsed_date = ""

                    date_input = toga.TextInput(
                        style=Pack(padding=5, flex=1),
                        placeholder="MM/DD/YYYY",
                        value=parsed_date,
                    )

                    remove_button = toga.Button("Remove", style=Pack(padding=5))
                    item_row = toga.Box(
                        children=[item_selector, date_input, remove_button],
                        style=Pack(direction=ROW),
                    )
                    remove_button.on_press = (
                        lambda w, r=item_row: self.remove_invoice_item(r)
                    )

                    self.invoice_items.append((item_selector, date_input))
                    self.items_box.add(item_row)
