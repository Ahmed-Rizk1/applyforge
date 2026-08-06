import logging
from fastapi import APIRouter, HTTPException, Response
from app.models.generate import (
    GenerateRequest,
    MatchScoreResponse,
    TextContentResponse,
    InterviewQuestionsResponse,
    TailoredCvResponse,
    CompilePdfRequest,
    SalaryEstimateResponse,
    CoverLetterPdfRequest,
)
from app.services.match_score import generate_match_score
from app.services.text_generation import (
    generate_cover_letter,
    generate_outreach_email,
    generate_linkedin_dm,
    generate_interview_questions,
)
from app.services.latex_builder import build_tailored_cv
from app.services.latex_compiler import compile_tex_to_pdf
from app.services.salary_estimator import generate_salary_estimate
from app.services.cover_letter_pdf import build_cover_letter_pdf

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Generation"])


def _validate_payload(payload: GenerateRequest):
    if not payload.job_description or not payload.job_description.strip():
        raise HTTPException(
            status_code=422,
            detail="Job description is required and cannot be empty."
        )


@router.post("/generate/match-score", response_model=MatchScoreResponse)
def get_match_score(payload: GenerateRequest):
    """Analyze structured profile against a job description and return match score metrics."""
    _validate_payload(payload)
    try:
        return generate_match_score(payload.profile, payload.job_description)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Error calculating match score: {exc}")
        raise HTTPException(
            status_code=500,
            detail=f"Match score generation failed: {str(exc)}"
        ) from exc


@router.post("/generate/cover-letter", response_model=TextContentResponse)
def get_cover_letter(payload: GenerateRequest):
    """Generate a tailored cover letter based on candidate profile and job description."""
    _validate_payload(payload)
    try:
        return generate_cover_letter(payload.profile, payload.job_description)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Error generating cover letter: {exc}")
        raise HTTPException(
            status_code=500,
            detail=f"Cover letter generation failed: {str(exc)}"
        ) from exc


@router.post("/generate/outreach-email", response_model=TextContentResponse)
def get_outreach_email(payload: GenerateRequest):
    """Generate a high-converting cold outreach email."""
    _validate_payload(payload)
    try:
        return generate_outreach_email(payload.profile, payload.job_description)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Error generating outreach email: {exc}")
        raise HTTPException(
            status_code=500,
            detail=f"Outreach email generation failed: {str(exc)}"
        ) from exc


@router.post("/generate/linkedin-dm", response_model=TextContentResponse)
def get_linkedin_dm(payload: GenerateRequest):
    """Generate a personalized LinkedIn direct message with optional recruiter context."""
    _validate_payload(payload)
    try:
        return generate_linkedin_dm(payload.profile, payload.job_description, payload.extras)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Error generating LinkedIn DM: {exc}")
        raise HTTPException(
            status_code=500,
            detail=f"LinkedIn DM generation failed: {str(exc)}"
        ) from exc


@router.post("/generate/interview-questions", response_model=InterviewQuestionsResponse)
def get_interview_questions(payload: GenerateRequest):
    """Generate expected tailored interview questions and tips/reasoning."""
    _validate_payload(payload)
    try:
        return generate_interview_questions(payload.profile, payload.job_description)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Error generating interview questions: {exc}")
        raise HTTPException(
            status_code=500,
            detail=f"Interview questions generation failed: {str(exc)}"
        ) from exc


@router.post("/generate/tailored-cv", response_model=TailoredCvResponse)
def get_tailored_cv(payload: GenerateRequest):
    """Generate LaTeX source code and parallel HTML preview for a tailored CV."""
    _validate_payload(payload)
    try:
        tex_source, html_preview = build_tailored_cv(payload.profile, payload.job_description)
        return TailoredCvResponse(html_preview=html_preview, tex_source=tex_source)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Error generating tailored CV: {exc}")
        raise HTTPException(
            status_code=500,
            detail=f"Tailored CV generation failed: {str(exc)}"
        ) from exc


@router.post("/compile-pdf")
def compile_pdf(payload: CompilePdfRequest):
    """Compile LaTeX source string into a PDF file download."""
    try:
        pdf_bytes = compile_tex_to_pdf(payload.tex_source)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=tailored_resume.pdf"}
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Error compiling PDF: {exc}")
        raise HTTPException(
            status_code=500,
            detail=f"PDF Compilation Error: {str(exc)}"
        ) from exc


@router.post("/generate/salary-estimate", response_model=SalaryEstimateResponse)
def get_salary_estimate(payload: GenerateRequest):
    """Estimate annual market salary range using Tavily web search and Groq LLM synthesis."""
    _validate_payload(payload)
    try:
        return generate_salary_estimate(payload.profile, payload.job_description)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Error estimating salary: {exc}")
        raise HTTPException(
            status_code=500,
            detail=f"Salary estimate generation failed: {str(exc)}"
        ) from exc


@router.post("/generate/cover-letter-pdf")
def get_cover_letter_pdf(payload: CoverLetterPdfRequest):
    """Render cover letter text into single-page LaTeX letter and compile into PDF file download."""
    try:
        pdf_bytes = build_cover_letter_pdf(payload.content, payload.name or "Candidate", payload.contact or "")
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=cover_letter.pdf"}
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Error compiling Cover Letter PDF: {exc}")
        raise HTTPException(
            status_code=500,
            detail=f"Cover Letter PDF compilation failed: {str(exc)}"
        ) from exc
