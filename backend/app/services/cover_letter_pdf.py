import os
import time
import logging
from app.services.latex_compiler import escape_latex, compile_tex_to_pdf

logger = logging.getLogger(__name__)


def _load_cover_letter_template() -> str:
    """Load cover_letter_template.tex from latex/ directory."""
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    template_path = os.path.join(base_dir, "latex", "cover_letter_template.tex")
    if not os.path.exists(template_path):
        root_dir = os.path.dirname(base_dir)
        template_path = os.path.join(root_dir, "latex", "cover_letter_template.tex")

    with open(template_path, "r", encoding="utf-8") as f:
        return f.read()


def build_cover_letter_pdf(content: str, name: str = "Candidate", contact: str = "") -> bytes:
    """Populate cover letter template and compile into PDF bytes."""
    template_str = _load_cover_letter_template()

    name_escaped = escape_latex(name or "Candidate")
    contact_escaped = escape_latex(contact or "")
    date_str = time.strftime("%B %d, %Y")

    # Format paragraph linebreaks into LaTeX paragraphs
    paragraphs = content.strip().split("\n\n")
    escaped_paragraphs = [escape_latex(p).replace("\n", "\\\\ ") for p in paragraphs if p.strip()]
    content_latex = "\n\n\\vspace{10pt}\n\n".join(escaped_paragraphs)

    tex_source = template_str.replace("__NAME__", name_escaped)
    tex_source = tex_source.replace("__CONTACT_LINE__", contact_escaped)
    tex_source = tex_source.replace("__DATE__", date_str)
    tex_source = tex_source.replace("__CONTENT__", content_latex)

    return compile_tex_to_pdf(tex_source)
