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

        en11a_button = toga.Button(
            "Draft EN-11A",
            on_press=lambda w: self.app.switch_view(self.app.en11a_view.main_box),
            style=Pack(padding=10),
        )

        self.main_box = toga.Box(
            children=[title_label, description_label, en11a_button],
            style=Pack(direction=COLUMN),
        )

    def go_to_en11a(self, widget):
        self.app.switch_view(self.app.en11a_view.main_box)
