from pdfrw import PdfReader

pdf = PdfReader("app/templates/EE-1 DRAFT.pdf")
for page in pdf.pages:
    annotations = page.Annots
    if annotations:
        for annot in annotations:
            if annot.Subtype == "/Widget" and annot.T:
                print(annot.T)
