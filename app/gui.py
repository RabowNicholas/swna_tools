import tkinter as tk
from tkinter import ttk


class PrefillGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("SWNA Form Assistant")
        self.root.geometry("600x700")
        self.root.minsize(600, 600)

        # Configure custom ttk style for enhanced button appearance (Apple HIG)
        style = ttk.Style()
        style.configure(
            "TButton",
            font=("San Francisco", 15),
            padding=(12, 8),
            relief="flat",
            borderwidth=1,
        )
        style.map(
            "TButton",
            foreground=[("active", "#ffffff")],
            background=[("active", "#4a90e2")],
        )

        self.menu_frame = ttk.Frame(self.root)
        self.menu_frame.pack(pady=40, expand=True, anchor="center")

        ttk.Label(
            self.menu_frame,
            text="SWNA Form Assistant",
            font=("San Francisco", 24),
        ).pack(pady=(0, 4))

        # Subtitle under the main title
        ttk.Label(
            self.menu_frame,
            text="Generate DOE forms fast, clean, and accurate.",
            font=("San Francisco", 14),
            foreground="#AAAAAA",
        ).pack(pady=(0, 20))

        # Buttons with keyboard shortcut hints and initial focus
        ee1_btn = ttk.Button(
            self.menu_frame,
            text="Fill EE-1",
            command=self.show_ee1_form,
            width=30,
        )
        ee1_btn.pack(pady=(0, 12))
        ee1_btn.focus_set()
        ee1_btn.bind("<Enter>", lambda e: ee1_btn.configure(cursor="hand2"))
        ee1_btn.bind("<Leave>", lambda e: ee1_btn.configure(cursor=""))

        en11a_btn = ttk.Button(
            self.menu_frame,
            text="Create EN-11a",
            command=self.show_en11a_form,
            width=30,
        )
        en11a_btn.pack(pady=(0, 12))
        en11a_btn.bind("<Enter>", lambda e: en11a_btn.configure(cursor="hand2"))
        en11a_btn.bind("<Leave>", lambda e: en11a_btn.configure(cursor=""))

        # Status bar at bottom left
        self.status_var = tk.StringVar(value="Ready")
        ttk.Label(self.root, textvariable=self.status_var, anchor="e").pack(
            side="bottom", fill="x", padx=10, pady=2
        )

        # Version info at bottom right
        ttk.Label(self.root, text="v1.0.0", font=("San Francisco", 11)).pack(
            side="bottom", anchor="e", padx=10, pady=2
        )

    def show_ee1_form(self):
        self.clear_root()
        from app.forms.ee1_form import EE1Form

        def on_back():
            self.clear_root()
            self.build_main_menu()

        EE1Form(self.root, on_back)

    def show_en11a_form(self) -> None:
        self.clear_root()
        from app.forms.en11a_form import EN11aForm

        def on_back() -> None:
            self.clear_root()
            self.build_main_menu()

        EN11aForm(self.root, on_back)

    def clear_root(self):
        for widget in self.root.winfo_children():
            widget.destroy()

    def build_main_menu(self):
        # Destroy all widgets in the root window
        for widget in self.root.winfo_children():
            widget.destroy()
        self.__init__(self.root)  # Reinitialize the interface
