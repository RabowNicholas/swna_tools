# app/widgets/record_selector.py
import tkinter as tk


class RecordSelector(tk.Toplevel):
    def __init__(self, master, records, on_select):
        super().__init__(master)
        self.title("Select Record")
        self.records = records
        self.filtered = records
        self.on_select = on_select

        self.search_var = tk.StringVar()
        self.search_var.trace_add("write", self.filter_records)

        tk.Entry(self, textvariable=self.search_var).pack(fill="x", padx=10, pady=5)
        self.listbox = tk.Listbox(self)
        self.listbox.pack(fill="both", expand=True, padx=10, pady=5)
        self.listbox.bind("<<ListboxSelect>>", self.select_record)

        self.populate_listbox()

    def populate_listbox(self):
        self.listbox.delete(0, tk.END)
        for record in self.filtered:
            name = record["fields"].get("Name", "")
            case_id = record["fields"].get("Case ID", "")
            self.listbox.insert(tk.END, f"{name} - {case_id}")

    def filter_records(self, *args):
        query = self.search_var.get().lower()
        self.filtered = [
            r
            for r in self.records
            if query in r["fields"].get("Name", "").lower()
            or query in r["fields"].get("Case ID", "").lower()
        ]
        self.populate_listbox()

    def select_record(self, event):
        index = self.listbox.curselection()
        if index:
            selected = self.filtered[index[0]]
            self.on_select(selected)
            self.destroy()
