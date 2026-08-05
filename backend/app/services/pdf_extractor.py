import io

import pdfplumber
from fastapi import HTTPException


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract all text from a PDF given its raw bytes.

    Raises HTTPException(422) if the file is not a valid PDF.
    Raises HTTPException(500) if extraction fails unexpectedly.
    Returns the extracted text (may be empty for image-only PDFs).
    """
    try:
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            pages_text = [page.extract_text() or "" for page in pdf.pages]
    except Exception as exc:
        # pdfplumber raises various errors for corrupt/non-PDF files
        raise HTTPException(
            status_code=422,
            detail=f"Could not read PDF: {exc}",
        ) from exc

    text = "\n\n".join(pages_text).strip()

    if not text:
        raise HTTPException(
            status_code=422,
            detail=(
                "No text could be extracted from this PDF. "
                "It may be a scanned image-only document. "
                "Please use a text-based PDF."
            ),
        )

    return text
