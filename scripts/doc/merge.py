#!/usr/bin/env python3
"""Merge Template-07 cover (page 0) + ReportLab body into the final PDF."""
from pypdf import PdfReader, PdfWriter

A4_W, A4_H = 595.28, 841.89

COVER = "/home/z/my-project/scripts/doc/cover.pdf"
BODY = "/home/z/my-project/scripts/doc/body.pdf"
OUT = "/home/z/my-project/download/SmartDrive-AI-Project-Documentation.pdf"


def normalize(page):
    box = page.mediabox
    w, h = float(box.width), float(box.height)
    if abs(w - A4_W) > 0.1 or abs(h - A4_H) > 0.1:
        page.scale_to(A4_W, A4_H)
    return page


writer = PdfWriter()
writer.add_page(normalize(PdfReader(COVER).pages[0]))
for page in PdfReader(BODY).pages:
    writer.add_page(normalize(page))
writer.add_metadata({
    "/Title": "SmartDrive AI - Project Documentation",
    "/Author": "Z.ai",
    "/Creator": "Z.ai",
    "/Subject": "Detailed documentation of the SmartDrive AI driver safety simulator",
})
with open(OUT, "wb") as f:
    writer.write(f)
print("final:", OUT, "pages:", len(writer.pages))
