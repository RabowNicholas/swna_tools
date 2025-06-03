import tkinter as tk


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
            self.menu_frame, text="Pre-fill EE-1", command=self.show_ee1_form
        ).pack(pady=5)
        tk.Button(
            self.menu_frame, text="Draft EN-11a", command=self.show_en11a_form
        ).pack(pady=5)

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
