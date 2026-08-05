from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from app.services.pdf_extractor import extract_text_from_pdf

router = APIRouter()

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB


@router.post("/upload-cv")
async def upload_cv(file: UploadFile = File(...)) -> JSONResponse:
    """Accept a PDF CV upload, extract and return its raw text.

    Validates:
    - Content type must be application/pdf (or .pdf extension as fallback)
    - File size must not exceed 5 MB
    """
    # --- content-type check ---
    is_pdf_content_type = file.content_type in (
        "application/pdf",
        "application/x-pdf",
    )
    is_pdf_extension = (file.filename or "").lower().endswith(".pdf")

    if not (is_pdf_content_type or is_pdf_extension):
        raise HTTPException(
            status_code=422,
            detail="Only PDF files are accepted. Please upload a .pdf file.",
        )

    # --- read and size-check ---
    file_bytes = await file.read()

    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum allowed size is 5 MB.",
        )

    # --- extract text (raises its own HTTPExceptions on failure) ---
    raw_text = extract_text_from_pdf(file_bytes)

    return JSONResponse(
        content={
            "raw_text": raw_text,
            "filename": file.filename,
            "page_count_estimate": raw_text.count("\n\n") + 1,
        }
    )
