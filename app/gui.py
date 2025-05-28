import tkinter as tk
from tkinter import filedialog, messagebox
from tkcalendar import DateEntry
from app.controller import handle_ee1_form


class PrefillGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("Prefill Assistant")
        self.root.geometry("600x700")
        self.root.minsize(600, 600)

        self.menu_frame = tk.Frame(self.root)
        self.menu_frame.pack(pady=20)
        tk.Label(self.menu_frame, text="Select an action:").pack(pady=10)
        tk.Button(
            self.menu_frame, text="Pre-fill EE-1", command=self.build_ee1_form
        ).pack(pady=5)

    def build_ee1_form(self):
        self.menu_frame.destroy()
        tk.Label(
            self.root, text="EE-1 Form Prefill", font=("Helvetica", 16, "bold")
        ).pack(pady=(10, 0))
        # Add Back button
        self.back_button = tk.Button(
            self.root, text="← Back", command=self.build_main_menu
        )
        self.back_button.pack(pady=(0, 5))
        self.form_frame = tk.LabelFrame(
            self.root, text="Applicant Information", padx=10, pady=10
        )
        self.form_frame.pack(padx=10, pady=10, fill="both", expand=True)

        self.entries = {}

        # Entry and label color styles
        entry_bg = "#2c2c2e"
        entry_fg = "#f2f2f7"

        # US states list
        self.us_states = [
            "AL",
            "AK",
            "AZ",
            "AR",
            "CA",
            "CO",
            "CT",
            "DE",
            "FL",
            "GA",
            "HI",
            "ID",
            "IL",
            "IN",
            "IA",
            "KS",
            "KY",
            "LA",
            "ME",
            "MD",
            "MA",
            "MI",
            "MN",
            "MS",
            "MO",
            "MT",
            "NE",
            "NV",
            "NH",
            "NJ",
            "NM",
            "NY",
            "NC",
            "ND",
            "OH",
            "OK",
            "OR",
            "PA",
            "RI",
            "SC",
            "SD",
            "TN",
            "TX",
            "UT",
            "VT",
            "VA",
            "WA",
            "WV",
            "WI",
            "WY",
        ]
        self.diagnosis_options = [
            "Cancer",
            "Berylium Sensitivity",
            "Chronic Berylium Disease",
            "Chronic Silicosis",
            "Other",
        ]
        self.sex_options = ["Male", "Female"]

        row = 0
        # First Name
        tk.Label(self.form_frame, text="First Name", width=25, anchor="w").grid(
            row=row, column=0, sticky="w", pady=4
        )
        self.entries["first_name"] = tk.Entry(
            self.form_frame,
            width=40,
            bg=entry_bg,
            fg=entry_fg,
            insertbackground=entry_fg,
        )
        self.entries["first_name"].grid(row=row, column=1, pady=4)
        row += 1
        # Middle Initial
        tk.Label(self.form_frame, text="Middle Initial", width=25, anchor="w").grid(
            row=row, column=0, sticky="w", pady=4
        )
        self.entries["middle_initial"] = tk.Entry(
            self.form_frame,
            width=40,
            bg=entry_bg,
            fg=entry_fg,
            insertbackground=entry_fg,
        )
        self.entries["middle_initial"].grid(row=row, column=1, pady=4)
        row += 1
        # Last Name
        tk.Label(self.form_frame, text="Last Name", width=25, anchor="w").grid(
            row=row, column=0, sticky="w", pady=4
        )
        self.entries["last_name"] = tk.Entry(
            self.form_frame,
            width=40,
            bg=entry_bg,
            fg=entry_fg,
            insertbackground=entry_fg,
        )
        self.entries["last_name"].grid(row=row, column=1, pady=4)
        row += 1
        # SSN
        tk.Label(self.form_frame, text="SSN", width=25, anchor="w").grid(
            row=row, column=0, sticky="w", pady=4
        )
        self.entries["ssn"] = tk.Entry(
            self.form_frame,
            width=40,
            bg=entry_bg,
            fg=entry_fg,
            insertbackground=entry_fg,
        )
        self.entries["ssn"].grid(row=row, column=1, pady=4)
        row += 1
        # Date of Birth
        tk.Label(
            self.form_frame, text="Date of Birth (MM/DD/YYYY)", width=25, anchor="w"
        ).grid(row=row, column=0, sticky="w", pady=4)
        self.entries["dob"] = DateEntry(
            self.form_frame,
            width=40,
            date_pattern="mm/dd/yyyy",
            background=entry_bg,
            foreground=entry_fg,
            bordercolor="#444",
        )
        self.entries["dob"].grid(row=row, column=1, pady=4)
        row += 1
        # Sex as dropdown
        tk.Label(self.form_frame, text="Sex", width=25, anchor="w").grid(
            row=row, column=0, sticky="w", pady=4
        )
        self.sex_var = tk.StringVar()
        self.sex_var.set(self.sex_options[0])
        self.entries["sex"] = self.sex_var
        tk.OptionMenu(self.form_frame, self.sex_var, *self.sex_options).grid(
            row=row, column=1, sticky="ew", pady=4
        )
        row += 1
        # Address
        tk.Label(self.form_frame, text="Address", width=25, anchor="w").grid(
            row=row, column=0, sticky="w", pady=4
        )
        self.entries["address"] = tk.Entry(
            self.form_frame,
            width=40,
            bg=entry_bg,
            fg=entry_fg,
            insertbackground=entry_fg,
        )
        self.entries["address"].grid(row=row, column=1, pady=4)
        row += 1
        # City
        tk.Label(self.form_frame, text="City", width=25, anchor="w").grid(
            row=row, column=0, sticky="w", pady=4
        )
        self.entries["city"] = tk.Entry(
            self.form_frame,
            width=40,
            bg=entry_bg,
            fg=entry_fg,
            insertbackground=entry_fg,
        )
        self.entries["city"].grid(row=row, column=1, pady=4)
        row += 1
        # State as dropdown
        tk.Label(self.form_frame, text="State", width=25, anchor="w").grid(
            row=row, column=0, sticky="w", pady=4
        )
        self.state_var = tk.StringVar()
        self.state_var.set(self.us_states[0])
        self.entries["state"] = self.state_var
        tk.OptionMenu(self.form_frame, self.state_var, *self.us_states).grid(
            row=row, column=1, sticky="ew", pady=4
        )
        row += 1
        # ZIP
        tk.Label(self.form_frame, text="ZIP", width=25, anchor="w").grid(
            row=row, column=0, sticky="w", pady=4
        )
        self.entries["zip"] = tk.Entry(
            self.form_frame,
            width=40,
            bg=entry_bg,
            fg=entry_fg,
            insertbackground=entry_fg,
        )
        self.entries["zip"].grid(row=row, column=1, pady=4)
        row += 1
        # Phone Number
        tk.Label(
            self.form_frame, text="Phone Number (XXX-XXX-XXXX)", width=25, anchor="w"
        ).grid(row=row, column=0, sticky="w", pady=4)
        self.entries["phone"] = tk.Entry(
            self.form_frame,
            width=40,
            bg=entry_bg,
            fg=entry_fg,
            insertbackground=entry_fg,
        )
        self.entries["phone"].grid(row=row, column=1, pady=4)
        row += 1
        # Diagnosis as dropdown
        tk.Label(self.form_frame, text="Diagnosis", width=25, anchor="w").grid(
            row=row, column=0, sticky="w", pady=4
        )
        self.diagnosis_var = tk.StringVar()
        self.diagnosis_var.set(self.diagnosis_options[3])
        self.entries["diagnosis"] = self.diagnosis_var
        tk.OptionMenu(
            self.form_frame,
            self.diagnosis_var,
            *self.diagnosis_options,
            command=self.toggle_diagnosis_fields,
        ).grid(row=row, column=1, sticky="ew", pady=4)
        row += 1
        # Diagnosis Description (Cancer and Other)
        self.cancer_desc_label = tk.Label(
            self.form_frame, text="Cancer/Other Description", width=25, anchor="w"
        )
        self.cancer_desc_entry = tk.Entry(
            self.form_frame,
            width=40,
            bg=entry_bg,
            fg=entry_fg,
            insertbackground=entry_fg,
        )
        self.entries["diagnosis_description_1"] = self.cancer_desc_entry
        self.cancer_desc_row = row
        row += 1
        # Date of Diagnosis
        self.dod_label = tk.Label(
            self.form_frame, text="Date of Diagnosis (MM/DD/YYYY)", width=25, anchor="w"
        )
        self.dod_entry = DateEntry(
            self.form_frame,
            width=40,
            date_pattern="mm/dd/yyyy",
            background=entry_bg,
            foreground=entry_fg,
            bordercolor="#444",
        )
        self.entries["diagnosis_date_1"] = self.dod_entry
        self.dod_row = row
        row += 1

        # Add Another Diagnosis button (Cancer and Other)
        self.add_diag_button = tk.Button(
            self.form_frame,
            text="Add Another Diagnosis",
            command=self.add_another_diagnosis,
        )
        if self.diagnosis_var.get() in ["Cancer", "Other"]:
            self.cancer_desc_label.grid(
                row=self.cancer_desc_row, column=0, sticky="w", pady=4
            )
            self.cancer_desc_entry.grid(row=self.cancer_desc_row, column=1, pady=4)
            self.dod_label.grid(row=self.dod_row, column=0, sticky="w", pady=4)
            self.dod_entry.grid(row=self.dod_row, column=1, pady=4)
            self.add_diag_button.grid(row=row, column=0, columnspan=2, pady=5)
        else:
            self.dod_label.grid(row=self.dod_row, column=0, sticky="w", pady=4)
            self.dod_entry.grid(row=self.dod_row, column=1, pady=4)
        self.add_diag_row = row
        row += 1

        # Diagnosis #2
        self.cancer_desc2_label = tk.Label(
            self.form_frame, text="Cancer/Other Description #2", width=25, anchor="w"
        )
        self.cancer_desc2_entry = tk.Entry(
            self.form_frame,
            width=40,
            bg=entry_bg,
            fg=entry_fg,
            insertbackground=entry_fg,
        )
        self.entries["diagnosis_description_2"] = self.cancer_desc2_entry
        self.cancer_desc2_row = row
        # initially hidden
        self.cancer_desc2_label.grid_remove()
        self.cancer_desc2_entry.grid_remove()
        row += 1

        self.dod2_label = tk.Label(
            self.form_frame,
            text="Date of Diagnosis #2 (MM/DD/YYYY)",
            width=25,
            anchor="w",
        )
        self.dod2_entry = DateEntry(
            self.form_frame,
            width=40,
            date_pattern="mm/dd/yyyy",
            background=entry_bg,
            foreground=entry_fg,
            bordercolor="#444",
        )
        self.entries["diagnosis_date_2"] = self.dod2_entry
        self.dod2_row = row
        # initially hidden
        self.dod2_label.grid_remove()
        self.dod2_entry.grid_remove()
        row += 1

        # Diagnosis #3
        self.cancer_desc3_label = tk.Label(
            self.form_frame, text="Cancer/Other Description #3", width=25, anchor="w"
        )
        self.cancer_desc3_entry = tk.Entry(
            self.form_frame,
            width=40,
            bg=entry_bg,
            fg=entry_fg,
            insertbackground=entry_fg,
        )
        self.entries["diagnosis_description_3"] = self.cancer_desc3_entry
        self.cancer_desc3_row = row
        # initially hidden
        self.cancer_desc3_label.grid_remove()
        self.cancer_desc3_entry.grid_remove()
        row += 1

        self.dod3_label = tk.Label(
            self.form_frame,
            text="Date of Diagnosis #3 (MM/DD/YYYY)",
            width=25,
            anchor="w",
        )
        self.dod3_entry = DateEntry(
            self.form_frame,
            width=40,
            date_pattern="mm/dd/yyyy",
            background=entry_bg,
            foreground=entry_fg,
            bordercolor="#444",
        )
        self.entries["diagnosis_date_3"] = self.dod3_entry
        self.dod3_row = row
        # initially hidden
        self.dod3_label.grid_remove()
        self.dod3_entry.grid_remove()
        row += 1

        self.signature_path = None

        # Button frame for signature and submit
        self.button_frame = tk.Frame(self.form_frame)
        self.button_frame.grid(row=row, column=0, columnspan=2, pady=15)

        tk.Button(
            self.button_frame,
            text="Select Signature Image",
            command=self.select_signature,
        ).pack(side="left", padx=10)
        tk.Button(
            self.button_frame, text="Generate EE-1 Form", command=self.submit
        ).pack(side="left", padx=10)

        # Set initial focus to first name field
        self.entries["first_name"].focus_set()

    def add_another_diagnosis(self):
        # Show the next set of diagnosis fields for Cancer or Other
        if not self.cancer_desc2_label.winfo_ismapped():
            self.cancer_desc2_label.grid(
                row=self.cancer_desc2_row, column=0, sticky="w"
            )
            self.cancer_desc2_entry.grid(row=self.cancer_desc2_row, column=1)
            self.dod2_label.grid(row=self.dod2_row, column=0, sticky="w")
            self.dod2_entry.grid(row=self.dod2_row, column=1)
        elif not self.cancer_desc3_label.winfo_ismapped():
            self.cancer_desc3_label.grid(
                row=self.cancer_desc3_row, column=0, sticky="w"
            )
            self.cancer_desc3_entry.grid(row=self.cancer_desc3_row, column=1)
            self.dod3_label.grid(row=self.dod3_row, column=0, sticky="w")
            self.dod3_entry.grid(row=self.dod3_row, column=1)
            self.add_diag_button.grid_remove()

    def toggle_diagnosis_fields(self, value=None):
        diag = self.diagnosis_var.get()
        if diag in ["Cancer", "Other"]:
            self.cancer_desc_label.grid(row=self.cancer_desc_row, column=0, sticky="w")
            self.cancer_desc_entry.grid(row=self.cancer_desc_row, column=1)
            self.dod_label.grid(row=self.dod_row, column=0, sticky="w")
            self.dod_entry.grid(row=self.dod_row, column=1)
            self.add_diag_button.grid(row=self.add_diag_row, column=0, columnspan=2)
            # Hide all additional diagnosis fields initially
            self.cancer_desc2_label.grid_remove()
            self.cancer_desc2_entry.grid_remove()
            self.dod2_label.grid_remove()
            self.dod2_entry.grid_remove()
            self.cancer_desc3_label.grid_remove()
            self.cancer_desc3_entry.grid_remove()
            self.dod3_label.grid_remove()
            self.dod3_entry.grid_remove()
        else:
            self.cancer_desc_label.grid_remove()
            self.cancer_desc_entry.grid_remove()
            self.add_diag_button.grid_remove()
            self.cancer_desc2_label.grid_remove()
            self.cancer_desc2_entry.grid_remove()
            self.dod2_label.grid_remove()
            self.dod2_entry.grid_remove()
            self.cancer_desc3_label.grid_remove()
            self.cancer_desc3_entry.grid_remove()
            self.dod3_label.grid_remove()
            self.dod3_entry.grid_remove()
            self.dod_label.grid(row=self.dod_row, column=0, sticky="w")
            self.dod_entry.grid(row=self.dod_row, column=1)

    def select_signature(self):
        self.signature_path = filedialog.askopenfilename(
            title="Select Signature", filetypes=[("Image Files", "*.png *.jpg *.jpeg")]
        )
        if self.signature_path:
            messagebox.showinfo("Signature Selected", self.signature_path)

    def submit(self):
        import re

        # Get all entry values (handle StringVar for dropdowns)
        data = {}
        for key, entry in self.entries.items():
            if isinstance(entry, tk.StringVar):
                data[key] = entry.get()
            else:
                data[key] = entry.get()

        # Validation
        required_fields = [
            "first_name",
            "last_name",
            "ssn",
            "dob",
            "sex",
            "address",
            "city",
            "state",
            "zip",
            "phone",
            "diagnosis",
        ]
        for field in required_fields:
            if not data.get(field, "").strip():
                messagebox.showerror(
                    "Missing Field", f"{field.replace('_',' ').title()} is required."
                )
                return
        # DOB format MM/DD/YYYY
        if not re.match(
            r"^(0[1-9]|1[0-2])/(0[1-9]|[12][0-9]|3[01])/\d{4}$", data["dob"]
        ):
            messagebox.showerror(
                "Invalid DOB", "Date of Birth must be in MM/DD/YYYY format."
            )
            return
        # ZIP is 5 digits
        if not re.match(r"^\d{5}$", data["zip"]):
            messagebox.showerror("Invalid ZIP", "ZIP code must be 5 digits.")
            return
        # Phone: 10 digits or XXX-XXX-XXXX
        phone = data["phone"].strip()
        phone_digits = re.sub(r"\D", "", phone)
        if len(phone_digits) != 10:
            messagebox.showerror(
                "Invalid Phone",
                "Phone number must be 10 digits or in XXX-XXX-XXXX format.",
            )
            return
        # Parse phone into area, prefix, line
        data["phone_area"] = phone_digits[0:3]
        data["phone_prefix"] = phone_digits[3:6]
        data["phone_line"] = phone_digits[6:10]
        # Parse DOB into month, day, year
        dob_parts = data["dob"].split("/")
        data["dob_month"] = dob_parts[0]
        data["dob_day"] = dob_parts[1]
        data["dob_year"] = dob_parts[2]
        # Diagnosis
        if data["diagnosis"] == "Cancer":
            # At least first cancer diagnosis required
            if not self.entries["diagnosis_description_1"].get().strip():
                messagebox.showerror(
                    "Missing Field",
                    "Cancer Description is required when diagnosis is Cancer.",
                )
                return
            data["diagnosis_description_1"] = (
                self.entries["diagnosis_description_1"].get().strip()
            )
            data["diagnosis_date_1"] = self.entries["diagnosis_date_1"].get()
            data["diagnosis_description_2"] = (
                self.entries["diagnosis_description_2"].get().strip()
            )
            data["diagnosis_date_2"] = self.entries["diagnosis_date_2"].get()
            data["diagnosis_description_3"] = (
                self.entries["diagnosis_description_3"].get().strip()
            )
            data["diagnosis_date_3"] = self.entries["diagnosis_date_3"].get()
        elif data["diagnosis"] == "Other":
            # For Other, allow up to 3 diagnosis descriptions and dates, just like Cancer
            data["diagnosis_description_1"] = (
                self.entries["diagnosis_description_1"].get().strip()
            )
            data["diagnosis_date_1"] = self.entries["diagnosis_date_1"].get().strip()

            if (
                self.entries["diagnosis_description_2"].winfo_ismapped()
                or self.entries["diagnosis_date_2"].winfo_ismapped()
            ):
                data["diagnosis_description_2"] = (
                    self.entries["diagnosis_description_2"].get().strip()
                )
                data["diagnosis_date_2"] = (
                    self.entries["diagnosis_date_2"].get().strip()
                )
            else:
                data["diagnosis_description_2"] = ""
                data["diagnosis_date_2"] = ""

            if (
                self.entries["diagnosis_description_3"].winfo_ismapped()
                or self.entries["diagnosis_date_3"].winfo_ismapped()
            ):
                data["diagnosis_description_3"] = (
                    self.entries["diagnosis_description_3"].get().strip()
                )
                data["diagnosis_date_3"] = (
                    self.entries["diagnosis_date_3"].get().strip()
                )
            else:
                data["diagnosis_description_3"] = ""
                data["diagnosis_date_3"] = ""
        else:
            # Non-cancer/other diagnoses have no description but still require a date
            data["diagnosis_description_1"] = ""
            data["diagnosis_date_1"] = self.entries["diagnosis_date_1"].get()
            data["diagnosis_description_2"] = ""
            data["diagnosis_date_2"] = ""
            data["diagnosis_description_3"] = ""
            data["diagnosis_date_3"] = ""
        # Signature
        if not self.signature_path:
            messagebox.showerror(
                "Missing Signature", "Please select a signature image."
            )
            return
        # Prompt for save location
        from tkinter import filedialog
        from datetime import datetime

        # Create a default filename
        today = datetime.today().strftime("%m.%d.%Y")
        default_filename = (
            f"EE-1 - {data['first_name'][0]}. {data['last_name']} - {today}.pdf"
        )

        output_path = filedialog.asksaveasfilename(
            defaultextension=".pdf",
            initialfile=default_filename,
            filetypes=[("PDF files", "*.pdf")],
            title="Save Completed EE-1 Form As",
        )
        if not output_path:
            return  # User cancelled save dialog
        result = handle_ee1_form(data, self.signature_path, output_path)
        if result:
            messagebox.showinfo("Success", f"Form saved to:\n{result}")
        else:
            messagebox.showerror("Error", "Failed to generate PDF.")

    def build_main_menu(self):
        # Destroy all widgets in the root window
        for widget in self.root.winfo_children():
            widget.destroy()
        self.__init__(self.root)  # Reinitialize the interface
