from setuptools import setup

APP = ["app/main.py"]
OPTIONS = {
    "argv_emulation": False,
    "includes": [
        "pkg_resources",
        "jaraco.text",
        "jaraco.classes",
        "toga_cocoa",
    ],
    "plist": {"PyRuntimeLocations": ["/usr/local/bin/python3"]},
}
setup(
    name="SWNA Tools",
    app=APP,
    options={"py2app": OPTIONS},
    setup_requires=["py2app"],
    zip_safe=False,
)
