import toga
from forms.en11a_view import EN11AView


class SWNAToolsApp(toga.App):
    def __init__(self):
        super().__init__("SWNA Tools", "org.swna.tools")

    def startup(self):
        self.main_window = toga.MainWindow(title=self.formal_name)
        self.en11a_view = EN11AView(app=self)
        self.main_window.content = self.en11a_view.main_box
        self.main_window.show()


def main():
    return SWNAToolsApp()


if __name__ == "__main__":
    main().main_loop()
