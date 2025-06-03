import tkinter as tk
from tkinter import messagebox, filedialog
from turtle import bgcolor
from tkcalendar import DateEntry
from datetime import datetime
from app.controller import handle_ee1_form


class EE1Form(tk.Frame):
    def add_focus_behavior(self, widget):
        widget.bind("<FocusIn>", lambda e: e.widget.configure(bg="#3c3c3e"))
        widget.bind("<FocusOut>", lambda e: e.widget.configure(bg="#2c2c2e"))

    def __init__(self, master, on_back):
        super().__init__(master)
        self.master = master
        self.on_back = on_back
        # Set up scrollable canvas and frame
        self.canvas = tk.Canvas(self, borderwidth=0)
        self.scroll_frame = tk.Frame(self.canvas)
        self.vsb = tk.Scrollbar(self, orient="vertical", command=self.canvas.yview)
        self.canvas.configure(yscrollcommand=self.vsb.set)

        self.vsb.pack(side="right", fill="y")
        self.canvas.pack(side="left", fill="both", expand=True)
        self.canvas.create_window((0, 0), window=self.scroll_frame, anchor="nw")

        self.scroll_frame.bind(
            "<Configure>",
            lambda e: self.canvas.configure(scrollregion=self.canvas.bbox("all")),
        )
        self.pack(fill="both", expand=True)
        self.build_form()

    def build_form(self):
        tk.Label(
            self.scroll_frame,
            text="EE-1 Form Prefill",
            font=("San Francisco", 20, "bold"),
            fg="#f2f2f7",
        ).pack(pady=(10, 0))
        tk.Button(
            self.scroll_frame,
            text="← Back",
            font=("San Francisco", 13),
            command=self.on_back,
            padx=10,
            pady=6,
        ).pack(pady=(0, 5))

        self.form_frame = tk.LabelFrame(
            self.scroll_frame,
            text="Applicant Information",
            padx=10,
            pady=10,
            font=("San Francisco", 14, "bold"),
            fg="#f2f2f7",
        )
        self.form_frame.pack(padx=10, pady=10, fill="both", expand=True)

        self.entries = {}
        entry_bg = "#2c2c2e"
        entry_fg = "#f2f2f7"
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
        # --- Section: Contact Information ---
        tk.Label(
            self.form_frame,
            text="Contact Information",
            font=("San Francisco", 14, "bold"),
        ).grid(row=row, column=0, columnspan=2, pady=(0, 8), sticky="w")
        row += 1
        # First Name
        tk.Label(
            self.form_frame,
            text="First Name",
            anchor="w",
            font=("San Francisco", 13),
        ).grid(row=row, column=0, columnspan=2, sticky="w", pady=(6, 0), padx=(5, 5))
        row += 1
        self.entries["first_name"] = tk.Entry(
            self.form_frame,
            width=35,
            bg=entry_bg,
            fg=entry_fg,
            insertbackground=entry_fg,
            font=("San Francisco", 13),
        )
        self.entries["first_name"].grid(
            row=row, column=0, columnspan=2, pady=(0, 6), padx=(5, 5), sticky="ew"
        )
        self.add_focus_behavior(self.entries["first_name"])
        row += 1
        # Middle Initial
        tk.Label(
            self.form_frame,
            text="Middle Initial",
            anchor="w",
            font=("San Francisco", 13),
        ).grid(row=row, column=0, columnspan=2, sticky="w", pady=(6, 0), padx=(5, 5))
        row += 1
        self.entries["middle_initial"] = tk.Entry(
            self.form_frame,
            width=35,
            bg=entry_bg,
            fg=entry_fg,
            insertbackground=entry_fg,
            font=("San Francisco", 13),
        )
        self.entries["middle_initial"].grid(
            row=row, column=0, columnspan=2, pady=(0, 6), padx=(5, 5), sticky="ew"
        )
        self.add_focus_behavior(self.entries["middle_initial"])
        row += 1
        # Last Name
        tk.Label(
            self.form_frame,
            text="Last Name",
            anchor="w",
            font=("San Francisco", 13),
        ).grid(row=row, column=0, columnspan=2, sticky="w", pady=(6, 0), padx=(5, 5))
        row += 1
        self.entries["last_name"] = tk.Entry(
            self.form_frame,
            width=35,
            bg=entry_bg,
            fg=entry_fg,
            insertbackground=entry_fg,
            font=("San Francisco", 13),
        )
        self.entries["last_name"].grid(
            row=row, column=0, columnspan=2, pady=(0, 6), padx=(5, 5), sticky="ew"
        )
        self.add_focus_behavior(self.entries["last_name"])
        row += 1
        # SSN
        tk.Label(
            self.form_frame,
            text="SSN",
            anchor="w",
            font=("San Francisco", 13),
        ).grid(row=row, column=0, columnspan=2, sticky="w", pady=(6, 0), padx=(5, 5))
        row += 1
        self.entries["ssn"] = tk.Entry(
            self.form_frame,
            width=35,
            bg=entry_bg,
            fg=entry_fg,
            insertbackground=entry_fg,
            font=("San Francisco", 13),
        )
        self.entries["ssn"].grid(
            row=row, column=0, columnspan=2, pady=(0, 6), padx=(5, 5), sticky="ew"
        )
        self.add_focus_behavior(self.entries["ssn"])
        row += 1
        # Date of Birth
        tk.Label(
            self.form_frame,
            text="Date of Birth (MM/DD/YYYY)",
            anchor="w",
            font=("San Francisco", 13),
        ).grid(row=row, column=0, columnspan=2, sticky="w", pady=(6, 0), padx=(5, 5))
        row += 1
        self.entries["dob"] = DateEntry(
            self.form_frame,
            width=35,
            date_pattern="mm/dd/yyyy",
            background=entry_bg,
            foreground=entry_fg,
            bordercolor="#444",
            font=("San Francisco", 13),
        )
        self.entries["dob"].grid(
            row=row, column=0, columnspan=2, pady=(0, 6), padx=(5, 5), sticky="ew"
        )
        self.add_focus_behavior(self.entries["dob"])
        row += 1
        # Sex
        tk.Label(
            self.form_frame,
            text="Sex",
            anchor="w",
            font=("San Francisco", 13),
        ).grid(row=row, column=0, columnspan=2, sticky="w", pady=(6, 0), padx=(5, 5))
        row += 1
        self.sex_var = tk.StringVar()
        self.sex_var.set(self.sex_options[0])
        self.entries["sex"] = self.sex_var
        tk.OptionMenu(self.form_frame, self.sex_var, *self.sex_options).grid(
            row=row, column=0, columnspan=2, sticky="ew", pady=(0, 6), padx=(5, 5)
        )
        row += 1
        # --- End Contact Information ---
        # --- Section: Address ---
        # Address
        tk.Label(
            self.form_frame,
            text="Address",
            anchor="w",
            font=("San Francisco", 13),
        ).grid(row=row, column=0, columnspan=2, sticky="w", pady=(6, 0), padx=(5, 5))
        row += 1
        self.entries["address"] = tk.Entry(
            self.form_frame,
            width=35,
            bg=entry_bg,
            fg=entry_fg,
            insertbackground=entry_fg,
            font=("San Francisco", 13),
        )
        self.entries["address"].grid(
            row=row, column=0, columnspan=2, pady=(0, 6), padx=(5, 5), sticky="ew"
        )
        self.add_focus_behavior(self.entries["address"])
        row += 1
        # City
        tk.Label(
            self.form_frame,
            text="City",
            anchor="w",
            font=("San Francisco", 13),
        ).grid(row=row, column=0, columnspan=2, sticky="w", pady=(6, 0), padx=(5, 5))
        row += 1
        self.entries["city"] = tk.Entry(
            self.form_frame,
            width=35,
            bg=entry_bg,
            fg=entry_fg,
            insertbackground=entry_fg,
            font=("San Francisco", 13),
        )
        self.entries["city"].grid(
            row=row, column=0, columnspan=2, pady=(0, 6), padx=(5, 5), sticky="ew"
        )
        self.add_focus_behavior(self.entries["city"])
        row += 1
        # State
        tk.Label(
            self.form_frame,
            text="State",
            anchor="w",
            font=("San Francisco", 13),
        ).grid(row=row, column=0, columnspan=2, sticky="w", pady=(6, 0), padx=(5, 5))
        row += 1
        self.state_var = tk.StringVar()
        self.state_var.set(self.us_states[0])
        self.entries["state"] = self.state_var
        tk.OptionMenu(self.form_frame, self.state_var, *self.us_states).grid(
            row=row, column=0, columnspan=2, sticky="ew", pady=(0, 6), padx=(5, 5)
        )
        row += 1
        # ZIP
        tk.Label(
            self.form_frame,
            text="ZIP",
            anchor="w",
            font=("San Francisco", 13),
        ).grid(row=row, column=0, columnspan=2, sticky="w", pady=(6, 0), padx=(5, 5))
        row += 1
        self.entries["zip"] = tk.Entry(
            self.form_frame,
            width=35,
            bg=entry_bg,
            fg=entry_fg,
            insertbackground=entry_fg,
            font=("San Francisco", 13),
        )
        self.entries["zip"].grid(
            row=row, column=0, columnspan=2, pady=(0, 6), padx=(5, 5), sticky="ew"
        )
        self.add_focus_behavior(self.entries["zip"])
        row += 1
        # Phone
        tk.Label(
            self.form_frame,
            text="Phone Number (XXX-XXX-XXXX)",
            anchor="w",
            font=("San Francisco", 13),
        ).grid(row=row, column=0, columnspan=2, sticky="w", pady=(6, 0), padx=(5, 5))
        row += 1
        self.entries["phone"] = tk.Entry(
            self.form_frame,
            width=35,
            bg=entry_bg,
            fg=entry_fg,
            insertbackground=entry_fg,
            font=("San Francisco", 13),
        )
        self.entries["phone"].grid(
            row=row, column=0, columnspan=2, pady=(0, 6), padx=(5, 5), sticky="ew"
        )
        self.add_focus_behavior(self.entries["phone"])
        row += 1
        # --- End Address ---
        # --- Section: Diagnosis Information ---
        tk.Label(
            self.form_frame,
            text="Diagnosis Information",
            font=("San Francisco", 14, "bold"),
        ).grid(row=row, column=0, columnspan=2, pady=(20, 8), sticky="w")
        row += 1
        tk.Label(
            self.form_frame,
            text="Diagnosis",
            width=25,
            anchor="w",
            font=("San Francisco", 13),
        ).grid(row=row, column=0, sticky="w", pady=(6, 6), padx=(5, 5))
        self.diagnosis_var = tk.StringVar()
        self.diagnosis_var.set(self.diagnosis_options[3])
        self.entries["diagnosis"] = self.diagnosis_var
        tk.OptionMenu(
            self.form_frame,
            self.diagnosis_var,
            *self.diagnosis_options,
            command=self.toggle_diagnosis_fields,
        ).grid(row=row, column=1, sticky="ew", pady=(6, 6), padx=(5, 5))
        row += 1
        self.cancer_desc_label = tk.Label(
            self.form_frame,
            text="Cancer/Other Description",
            width=25,
            anchor="w",
            font=("San Francisco", 13),
        )
        self.cancer_desc_entry = tk.Entry(
            self.form_frame,
            width=35,
            bg=entry_bg,
            fg=entry_fg,
            insertbackground=entry_fg,
            font=("San Francisco", 13),
        )
        self.entries["diagnosis_description_1"] = self.cancer_desc_entry
        self.add_focus_behavior(self.cancer_desc_entry)
        self.cancer_desc_row = row
        row += 1
        self.dod_label = tk.Label(
            self.form_frame,
            text="Date of Diagnosis (MM/DD/YYYY)",
            width=25,
            anchor="w",
            font=("San Francisco", 13),
        )
        self.dod_entry = DateEntry(
            self.form_frame,
            width=35,
            date_pattern="mm/dd/yyyy",
            background=entry_bg,
            foreground=entry_fg,
            bordercolor="#444",
            font=("San Francisco", 13),
        )
        self.entries["diagnosis_date_1"] = self.dod_entry
        self.add_focus_behavior(self.dod_entry)
        self.dod_row = row
        row += 1
        self.add_diag_button = tk.Button(
            self.form_frame,
            text="Add Another Diagnosis",
            command=self.add_another_diagnosis,
            font=("San Francisco", 13),
            padx=10,
            pady=6,
        )
        if self.diagnosis_var.get() in ["Cancer", "Other"]:
            self.cancer_desc_label.grid(
                row=self.cancer_desc_row, column=0, sticky="w", pady=(6, 6), padx=(5, 5)
            )
            self.cancer_desc_entry.grid(
                row=self.cancer_desc_row, column=1, pady=(6, 6), padx=(5, 5)
            )
            self.dod_label.grid(
                row=self.dod_row, column=0, sticky="w", pady=(6, 6), padx=(5, 5)
            )
            self.dod_entry.grid(row=self.dod_row, column=1, pady=(6, 6), padx=(5, 5))
            self.add_diag_button.grid(
                row=row, column=0, columnspan=2, pady=5, padx=(5, 5)
            )
        else:
            self.dod_label.grid(
                row=self.dod_row, column=0, sticky="w", pady=(6, 6), padx=(5, 5)
            )
            self.dod_entry.grid(row=self.dod_row, column=1, pady=(6, 6), padx=(5, 5))
        self.add_diag_row = row
        row += 1
        self.cancer_desc2_label = tk.Label(
            self.form_frame,
            text="Cancer/Other Description #2",
            width=25,
            anchor="w",
            font=("San Francisco", 13),
        )
        self.cancer_desc2_entry = tk.Entry(
            self.form_frame,
            width=35,
            bg=entry_bg,
            fg=entry_fg,
            insertbackground=entry_fg,
            font=("San Francisco", 13),
        )
        self.entries["diagnosis_description_2"] = self.cancer_desc2_entry
        self.add_focus_behavior(self.cancer_desc2_entry)
        self.cancer_desc2_row = row
        self.cancer_desc2_label.grid_remove()
        self.cancer_desc2_entry.grid_remove()
        row += 1
        self.dod2_label = tk.Label(
            self.form_frame,
            text="Date of Diagnosis #2 (MM/DD/YYYY)",
            width=25,
            anchor="w",
            font=("San Francisco", 13),
        )
        self.dod2_entry = DateEntry(
            self.form_frame,
            width=35,
            date_pattern="mm/dd/yyyy",
            background=entry_bg,
            foreground=entry_fg,
            bordercolor="#444",
            font=("San Francisco", 13),
        )
        self.entries["diagnosis_date_2"] = self.dod2_entry
        self.add_focus_behavior(self.dod2_entry)
        self.dod2_row = row
        self.dod2_label.grid_remove()
        self.dod2_entry.grid_remove()
        row += 1
        self.cancer_desc3_label = tk.Label(
            self.form_frame,
            text="Cancer/Other Description #3",
            width=25,
            anchor="w",
            font=("San Francisco", 13),
        )
        self.cancer_desc3_entry = tk.Entry(
            self.form_frame,
            width=35,
            bg=entry_bg,
            fg=entry_fg,
            insertbackground=entry_fg,
            font=("San Francisco", 13),
        )
        self.entries["diagnosis_description_3"] = self.cancer_desc3_entry
        self.add_focus_behavior(self.cancer_desc3_entry)
        self.cancer_desc3_row = row
        self.cancer_desc3_label.grid_remove()
        self.cancer_desc3_entry.grid_remove()
        row += 1
        self.dod3_label = tk.Label(
            self.form_frame,
            text="Date of Diagnosis #3 (MM/DD/YYYY)",
            width=25,
            anchor="w",
            font=("San Francisco", 13),
        )
        self.dod3_entry = DateEntry(
            self.form_frame,
            width=35,
            date_pattern="mm/dd/yyyy",
            background=entry_bg,
            foreground=entry_fg,
            bordercolor="#444",
            font=("San Francisco", 13),
        )
        self.entries["diagnosis_date_3"] = self.dod3_entry
        self.add_focus_behavior(self.dod3_entry)
        self.dod3_row = row
        self.dod3_label.grid_remove()
        self.dod3_entry.grid_remove()
        row += 1
        # --- Form Actions label ---
        tk.Label(
            self.form_frame,
            text="Form Actions",
            font=("San Francisco", 14, "bold"),
        ).grid(row=row, column=0, columnspan=2, pady=(20, 0), sticky="w")
        row += 1
        self.signature_path = None
        self.button_frame = tk.Frame(self.form_frame)
        self.button_frame.grid(
            row=row, column=0, columnspan=2, pady=(10, 15), padx=(5, 5)
        )
        tk.Button(
            self.button_frame,
            text="Select Signature Image",
            command=self.select_signature,
            font=("San Francisco", 13),
            padx=10,
            pady=6,
        ).pack(side="left", padx=10)
        tk.Button(
            self.button_frame,
            text="Generate EE-1 Form",
            command=self.submit,
            font=("San Francisco", 13),
            padx=10,
            pady=6,
        ).pack(side="left", padx=10)
        self.entries["first_name"].focus_set()

    def add_another_diagnosis(self):
        if not self.cancer_desc2_label.winfo_ismapped():
            self.cancer_desc2_label.grid(
                row=self.cancer_desc2_row,
                column=0,
                sticky="w",
                pady=(6, 6),
                padx=(5, 5),
            )
            self.cancer_desc2_entry.grid(
                row=self.cancer_desc2_row, column=1, pady=(6, 6), padx=(5, 5)
            )
            self.dod2_label.grid(
                row=self.dod2_row, column=0, sticky="w", pady=(6, 6), padx=(5, 5)
            )
            self.dod2_entry.grid(row=self.dod2_row, column=1, pady=(6, 6), padx=(5, 5))
        elif not self.cancer_desc3_label.winfo_ismapped():
            self.cancer_desc3_label.grid(
                row=self.cancer_desc3_row,
                column=0,
                sticky="w",
                pady=(6, 6),
                padx=(5, 5),
            )
            self.cancer_desc3_entry.grid(
                row=self.cancer_desc3_row, column=1, pady=(6, 6), padx=(5, 5)
            )
            self.dod3_label.grid(
                row=self.dod3_row, column=0, sticky="w", pady=(6, 6), padx=(5, 5)
            )
            self.dod3_entry.grid(row=self.dod3_row, column=1, pady=(6, 6), padx=(5, 5))
            self.add_diag_button.grid_remove()

    def toggle_diagnosis_fields(self, value=None):
        diag = self.diagnosis_var.get()
        if diag in ["Cancer", "Other"]:
            self.cancer_desc_label.grid(
                row=self.cancer_desc_row, column=0, sticky="w", pady=(6, 6), padx=(5, 5)
            )
            self.cancer_desc_entry.grid(
                row=self.cancer_desc_row, column=1, pady=(6, 6), padx=(5, 5)
            )
            self.dod_label.grid(
                row=self.dod_row, column=0, sticky="w", pady=(6, 6), padx=(5, 5)
            )
            self.dod_entry.grid(row=self.dod_row, column=1, pady=(6, 6), padx=(5, 5))
            self.add_diag_button.grid(
                row=self.add_diag_row, column=0, columnspan=2, pady=5, padx=(5, 5)
            )
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
            self.dod_label.grid(
                row=self.dod_row, column=0, sticky="w", pady=(6, 6), padx=(5, 5)
            )
            self.dod_entry.grid(row=self.dod_row, column=1, pady=(6, 6), padx=(5, 5))

    def select_signature(self):
        self.signature_path = filedialog.askopenfilename(
            title="Select Signature", filetypes=[("Image Files", "*.png *.jpg *.jpeg")]
        )
        if self.signature_path:
            messagebox.showinfo("Signature Selected", self.signature_path)

    def submit(self):
        import re

        data = {}
        for key, entry in self.entries.items():
            if isinstance(entry, tk.StringVar):
                data[key] = entry.get()
            else:
                data[key] = entry.get()
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
        if not re.match(
            r"^(0[1-9]|1[0-2])/(0[1-9]|[12][0-9]|3[01])/\d{4}$", data["dob"]
        ):
            messagebox.showerror(
                "Invalid DOB", "Date of Birth must be in MM/DD/YYYY format."
            )
            return
        if not re.match(r"^\d{5}$", data["zip"]):
            messagebox.showerror("Invalid ZIP", "ZIP code must be 5 digits.")
            return
        phone = data["phone"].strip()
        phone_digits = re.sub(r"\D", "", phone)
        if len(phone_digits) != 10:
            messagebox.showerror(
                "Invalid Phone",
                "Phone number must be 10 digits or in XXX-XXX-XXXX format.",
            )
            return
        data["phone_area"] = phone_digits[0:3]
        data["phone_prefix"] = phone_digits[3:6]
        data["phone_line"] = phone_digits[6:10]
        dob_parts = data["dob"].split("/")
        data["dob_month"] = dob_parts[0]
        data["dob_day"] = dob_parts[1]
        data["dob_year"] = dob_parts[2]
        if data["diagnosis"] == "Cancer":
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
            data["diagnosis_description_1"] = ""
            data["diagnosis_date_1"] = self.entries["diagnosis_date_1"].get()
            data["diagnosis_description_2"] = ""
            data["diagnosis_date_2"] = ""
            data["diagnosis_description_3"] = ""
            data["diagnosis_date_3"] = ""
        if not self.signature_path:
            messagebox.showerror(
                "Missing Signature", "Please select a signature image."
            )
            return
        from tkinter import filedialog
        from datetime import datetime

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
            return
        result = handle_ee1_form(data, self.signature_path, output_path)
        if result:
            messagebox.showinfo("Success", f"Form saved to:\n{result}")
        else:
            messagebox.showerror("Error", "Failed to generate PDF.")
