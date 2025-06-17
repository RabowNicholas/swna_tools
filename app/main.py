import toga
from views.home_view import HomeView
from views.en11a_view import EN11AView
from toga.style.pack import COLUMN, ROW, Pack
from views.invoice_view import InvoiceView


class SWNAToolsApp(toga.App):
    def __init__(self):
        super().__init__("SWNA Tools", "org.swna.tools")

    def switch_view(self, component):
        for child in list(self.content_box.children):
            self.content_box.remove(child)
        padded_container = toga.Box(children=[component], style=Pack(padding=16))
        self.content_box.add(padded_container)

    def startup(self):
        self.main_window = toga.MainWindow(title=self.formal_name)

        self.home_view = HomeView(app=self)
        self.en11a_view = EN11AView(app=self)
        self.invoice_view = InvoiceView(app=self)

        self.nav_bar = toga.Box(
            children=[
                toga.Button(
                    "Home",
                    on_press=lambda w: self.switch_view(self.home_view.main_box),
                    style=Pack(padding=5),
                ),
            ],
            style=Pack(direction=ROW, padding=16),
        )

        self.content_box = toga.Box(style=Pack(direction=COLUMN, flex=1))
        self.main_container = toga.Box(
            children=[self.nav_bar, self.content_box],
            style=Pack(direction=COLUMN),
        )

        self.main_window.content = self.main_container
        self.switch_view(self.home_view.main_box)
        self.main_window.show()


def main():
    return SWNAToolsApp()


if __name__ == "__main__":
    main().main_loop()
