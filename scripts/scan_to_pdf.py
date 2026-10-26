"""
Turn photos of documents into a PDF that looks like it came off a scanner.

Each image is straightened per its phone rotation, flattened (shadows and
uneven lighting removed), turned black and white, and placed on a white
letter-size page. All images go into one PDF, in the order given.

    python scripts/scan_to_pdf.py page1.jpg page2.jpg -o "Medical Records.pdf"
    python scripts/scan_to_pdf.py ~/Desktop/photos/          # every image in the folder

Options:
    -o, --output PATH   PDF to write (default: Scan.pdf next to the first image)
    --separate          One PDF per image instead of one combined PDF
    --gray              Grayscale scan instead of pure black and white
    --threshold N       0-255, black/white cut-off (default 185). Lower it if
                        the page comes out too dark or speckled, raise it if
                        light writing disappears.
    --dpi N             Page resolution (default 200)
    --no-page           Keep each image's own size instead of a letter page
"""

import argparse
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter, ImageOps

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".heic", ".tif", ".tiff", ".bmp", ".webp"}
LETTER_IN = (8.5, 11)
MARGIN_IN = 0.25


def collect_images(paths):
    images = []
    for p in map(Path, paths):
        if p.is_dir():
            images += sorted(f for f in p.iterdir() if f.suffix.lower() in IMAGE_EXTS)
        elif p.exists():
            images.append(p)
        else:
            sys.exit(f"Not found: {p}")
    if not images:
        sys.exit("No images found.")
    return images


def open_image(path):
    if path.suffix.lower() == ".heic":
        try:
            from pillow_heif import register_heif_opener
            register_heif_opener()
        except ImportError:
            sys.exit("HEIC photos need: pip install pillow-heif")
    img = Image.open(path)
    return ImageOps.exif_transpose(img).convert("L")


def scan_look(img, gray, threshold):
    # Divide by a heavy blur of the page to flatten shadows and lighting
    radius = max(img.size) / 40
    background = np.asarray(img.filter(ImageFilter.GaussianBlur(radius)), dtype=np.float32)
    pixels = np.asarray(img, dtype=np.float32)
    flat = np.clip(pixels / np.maximum(background, 1) * 255, 0, 255)

    if gray:
        # Push near-white paper to pure white and deepen the ink
        flat = np.clip((flat - 90) * 255 / (235 - 90), 0, 255)
        return Image.fromarray(flat.astype(np.uint8)).filter(ImageFilter.SHARPEN)

    bw = np.where(flat < threshold, 0, 255).astype(np.uint8)
    # Median filter knocks out isolated specks
    return Image.fromarray(bw).filter(ImageFilter.MedianFilter(3)).convert("1")


def on_letter_page(img, dpi):
    page_w, page_h = (int(x * dpi) for x in LETTER_IN)
    margin = int(MARGIN_IN * dpi)
    if img.width > img.height:
        page_w, page_h = page_h, page_w
    fitted = ImageOps.contain(img.convert("L"), (page_w - 2 * margin, page_h - 2 * margin))
    page = Image.new("L", (page_w, page_h), 255)
    page.paste(fitted, ((page_w - fitted.width) // 2, (page_h - fitted.height) // 2))
    return page if img.mode == "L" else page.point(lambda v: 255 if v > 127 else 0).convert("1")


def save_pdf(pages, out, dpi):
    pages[0].save(out, "PDF", resolution=dpi, save_all=True, append_images=pages[1:])
    print(f"Wrote {out} ({len(pages)} page{'s' if len(pages) != 1 else ''})")


def main():
    parser = argparse.ArgumentParser(description="Turn document photos into a scanned-look PDF.")
    parser.add_argument("inputs", nargs="+", help="Image files and/or folders of images")
    parser.add_argument("-o", "--output")
    parser.add_argument("--separate", action="store_true")
    parser.add_argument("--gray", action="store_true")
    parser.add_argument("--threshold", type=int, default=185)
    parser.add_argument("--dpi", type=int, default=200)
    parser.add_argument("--no-page", action="store_true")
    args = parser.parse_args()

    images = collect_images(args.inputs)
    pages = []
    for path in images:
        page = scan_look(open_image(path), args.gray, args.threshold)
        if not args.no_page:
            page = on_letter_page(page, args.dpi)
        if args.separate:
            save_pdf([page], path.with_suffix(".pdf"), args.dpi)
        else:
            pages.append(page)

    if pages:
        out = Path(args.output) if args.output else images[0].parent / "Scan.pdf"
        save_pdf(pages, out, args.dpi)


if __name__ == "__main__":
    main()
