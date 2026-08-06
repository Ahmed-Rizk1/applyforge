import os
import shutil
import subprocess
import tempfile
import logging
from fastapi import HTTPException

logger = logging.getLogger(__name__)


def escape_latex(text: str) -> str:
    """Escape special LaTeX characters in user input strings."""
    if not text:
        return ""
    
    # Order matters: replace backslash first
    replacements = [
        ('\\', r'\textbackslash{}'),
        ('&', r'\&'),
        ('%', r'\%'),
        ('$', r'\$'),
        ('#', r'\#'),
        ('_', r'\_'),
        ('{', r'\{'),
        ('}', r'\}'),
        ('~', r'\textasciitilde{}'),
        ('^', r'\textasciicircum{}'),
    ]
    
    result = str(text)
    for char, replacement in replacements:
        result = result.replace(char, replacement)
    return result


def find_tectonic_binary() -> str:
    """Locate tectonic binary in system PATH or backend/bin directory."""
    # 1. Check system PATH
    system_tectonic = shutil.which("tectonic")
    if system_tectonic:
        return system_tectonic

    # 2. Check local backend/bin folder
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    bin_tectonic_exe = os.path.join(base_dir, "bin", "tectonic.exe")
    if os.path.exists(bin_tectonic_exe):
        return bin_tectonic_exe

    bin_tectonic = os.path.join(base_dir, "bin", "tectonic")
    if os.path.exists(bin_tectonic):
        return bin_tectonic

    return ""


def compile_tex_to_pdf(tex_source: str) -> bytes:
    """Compile LaTeX source string into PDF bytes using tectonic compiler."""
    tectonic_cmd = find_tectonic_binary()
    if not tectonic_cmd:
        logger.warning("tectonic binary not found. Searching for pdflatex as fallback...")
        tectonic_cmd = shutil.which("pdflatex") or ""

    if not tectonic_cmd:
        raise HTTPException(
            status_code=500,
            detail="LaTeX compiler ('tectonic' or 'pdflatex') is not installed or binary is missing. PDF compilation requires tectonic."
        )

    with tempfile.TemporaryDirectory() as temp_dir:
        tex_path = os.path.join(temp_dir, "document.tex")
        pdf_path = os.path.join(temp_dir, "document.pdf")

        with open(tex_path, "w", encoding="utf-8") as f:
            f.write(tex_source)

        try:
            if "tectonic" in os.path.basename(tectonic_cmd).lower():
                cmd = [tectonic_cmd, "-p", "--outdir", temp_dir, tex_path]
            else:
                cmd = [tectonic_cmd, "-interaction=nonstopmode", "-output-directory", temp_dir, tex_path]

            result = subprocess.run(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                timeout=30,
                check=False
            )

            if result.returncode != 0:
                err_msg = result.stderr.decode("utf-8", errors="replace") or result.stdout.decode("utf-8", errors="replace")
                logger.error(f"LaTeX compilation failed: {err_msg}")
                raise HTTPException(
                    status_code=500,
                    detail=f"LaTeX Compilation Error: {err_msg[:400]}"
                )

            if not os.path.exists(pdf_path):
                raise HTTPException(
                    status_code=500,
                    detail="LaTeX compilation finished but output PDF file was not generated."
                )

            with open(pdf_path, "rb") as pdf_file:
                return pdf_file.read()

        except subprocess.TimeoutExpired as err:
            raise HTTPException(status_code=504, detail="LaTeX compilation timed out.") from err
        except Exception as exc:
            if isinstance(exc, HTTPException):
                raise
            logger.error(f"Error executing LaTeX compiler: {exc}")
            raise HTTPException(status_code=500, detail=f"Compiler execution error: {str(exc)}") from exc
