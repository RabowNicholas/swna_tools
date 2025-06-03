import tkinter as tk
from tkinter import messagebox, filedialog
from datetime import datetime
from app.airtable import fetch_clients
from app.controller import handle_en11a_form
from app.ui.record_selector import RecordSelector


class EN11aForm(tk.Frame):
    def __init__(self, master, on_back):
        super().__init__(master)
        self.master = master
        self.on_back = on_back
        self.pack(fill="both", expand=True)
        self.build_form()

    def build_form(self):
        tk.Label(self, text="EN-11a Form Prefill", font=("Helvetica", 16, "bold")).pack(
            pady=(10, 0)
        )
        tk.Button(self, text="← Back", command=self.on_back).pack(pady=(0, 5))

        self.form_frame = tk.LabelFrame(self, text="Form Details", padx=10, pady=10)
        self.form_frame.pack(padx=10, pady=10, fill="both", expand=True)

        entry_bg = "#2c2c2e"
        entry_fg = "#f2f2f7"

        self.entries = {}

        tk.Button(
            self.form_frame,
            text="Load from Airtable",
            command=self.open_record_selector,
        ).grid(row=0, column=0, columnspan=2, sticky="ew", pady=(0, 10))

        # Case ID
        tk.Label(self.form_frame, text="Case ID", width=25, anchor="w").grid(
            row=1, column=0, sticky="w", pady=4
        )
        self.entries["case_id"] = tk.Entry(
            self.form_frame,
            width=40,
            bg=entry_bg,
            fg=entry_fg,
            insertbackground=entry_fg,
        )
        self.entries["case_id"].grid(row=1, column=1, pady=4)

        # Employee Name
        tk.Label(self.form_frame, text="Employee Name", width=25, anchor="w").grid(
            row=2, column=0, sticky="w", pady=4
        )
        self.entries["employee_name"] = tk.Entry(
            self.form_frame,
            width=40,
            bg=entry_bg,
            fg=entry_fg,
            insertbackground=entry_fg,
        )
        self.entries["employee_name"].grid(row=2, column=1, pady=4)

        # Doctor selection
        tk.Label(self.form_frame, text="Doctor", width=25, anchor="w").grid(
            row=3, column=0, sticky="w", pady=4
        )
        self.doctor_var = tk.StringVar()
        self.doctor_var.set("Dr. Lewis")
        self.entries["doctor"] = self.doctor_var
        tk.OptionMenu(
            self.form_frame, self.doctor_var, "Dr. Lewis", "La Plata Medical"
        ).grid(row=3, column=1, sticky="ew", pady=4)

        # Submit button
        tk.Button(
            self.form_frame, text="Generate EN-11a Form", command=self.submit
        ).grid(row=4, column=0, columnspan=2, pady=15)
        self.form_frame.update_idletasks()

    def open_record_selector(self):
        records = fetch_clients()
        RecordSelector(self, records, self.prefill_from_record)

    def prefill_from_record(self, record):
        self.entries["case_id"].delete(0, tk.END)
        self.entries["case_id"].insert(0, record["fields"].get("Case ID", ""))

        self.entries["employee_name"].delete(0, tk.END)
        raw_name = record["fields"].get("Name", "")
        if "," in raw_name:
            last, rest = raw_name.split(",", 1)
            first = rest.split("-")[0].strip()
            formatted_name = f"{first} {last.strip()}"
        else:
            formatted_name = raw_name
        self.entries["employee_name"].insert(0, formatted_name)

    def submit(self):
        data = {
            key: (entry.get() if not isinstance(entry, tk.StringVar) else entry.get())
            for key, entry in self.entries.items()
        }

        if not data["case_id"].strip():
            messagebox.showerror("Missing Field", "Case ID is required.")
            return
        if not data["employee_name"].strip():
            messagebox.showerror("Missing Field", "Employee Name is required.")
            return

        today = datetime.today().strftime("%m.%d.%Y")
        name_parts = data["employee_name"].strip().split()
        first_initial = name_parts[0][0] if name_parts else ""
        last_name = name_parts[-1] if len(name_parts) > 1 else ""
        default_filename = f"EN-11a - {first_initial}. {last_name} - {today}.pdf"

        output_path = filedialog.asksaveasfilename(
            defaultextension=".pdf",
            initialfile=default_filename,
            filetypes=[("PDF files", "*.pdf")],
            title="Save Completed EN-11a Form As",
        )

        if not output_path:
            return

        result = handle_en11a_form(data, output_path)
        if result:
            messagebox.showinfo("Success", f"Form saved to:\n{result}")
        else:
            messagebox.showerror("Error", "Failed to generate PDF.")
