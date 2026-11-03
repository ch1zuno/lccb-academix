# Trim white borders from figure PNGs
from PIL import Image, ImageChops
import os

os.chdir(r"C:\Users\PC\Downloads\lccb-academix-main\lccb-academix-main\docs\figures")

for name in ["fig1.png", "fig2.png", "fig3.png"]:
    img = Image.open(name).convert("RGB")
    bg = Image.new("RGB", img.size, (255, 255, 255))
    diff = ImageChops.difference(img, bg).convert("L")
    # ignore near-white noise
    mask = diff.point(lambda p: 255 if p > 12 else 0)
    bbox = mask.getbbox()
    if bbox:
        pad = 14
        bbox = (max(0, bbox[0] - pad), max(0, bbox[1] - pad),
                min(img.width, bbox[2] + pad), min(img.height, bbox[3] + pad))
        img = img.crop(bbox)
    img.save(name)
    print(name, img.size)
