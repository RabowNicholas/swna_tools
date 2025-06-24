import toga
from toga.style import Pack
from toga.style.pack import COLUMN


class HomeView:
    def __init__(self, app):
        self.app = app

        title_label = toga.Label(
            "SWNA Tools",
            style=Pack(font_size=24, font_weight="bold", padding=(10, 5)),
        )

        description_label = toga.Label(
            "This application helps automate and streamline form generation tasks for SWNA operations.",
            style=Pack(padding=(0, 20)),
        )

        en16_button = toga.Button(
            "Create EN-16",
            on_press=lambda w: self.app.switch_view(self.app.en16_view.main_box),
            style=Pack(padding=10),
        )
        en11a_button = toga.Button(
            "Draft EN-11A",
            on_press=lambda w: self.app.switch_view(self.app.en11a_view.main_box),
            style=Pack(padding=10),
        )
        invoice_button = toga.Button(
            "Create Invoice",
            on_press=lambda w: self.app.switch_view(self.app.invoice_view.main_box),
            style=Pack(padding=10),
        )

        self.main_box = toga.Box(
            children=[
                title_label,
                description_label,
                en16_button,
                en11a_button,
                invoice_button,
            ],
            style=Pack(direction=COLUMN),
        )
