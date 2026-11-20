import os
import uuid
from typing import Optional

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".pptx", ".txt", ".jpg", ".jpeg", ".png", ".webp"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


def allowed_file(filename: str) -> bool:
    """Check if the file has an allowed extension."""
    ext = os.path.splitext(filename.lower())[1]
    return ext in ALLOWED_EXTENSIONS


def validate_file_size(file_size: int) -> bool:
    """Check if file size is within limits."""
    return file_size <= MAX_FILE_SIZE


def generate_unique_filename(original_filename: str) -> str:
    """Generate a unique filename to prevent collisions."""
    ext = os.path.splitext(original_filename)[1]
    return f"{uuid.uuid4().hex}{ext}"


def extract_text_from_pdf(file_path: str) -> str:
    """Extract text from a PDF file using PyMuPDF."""
    try:
        import fitz  # PyMuPDF

        doc = fitz.open(file_path)
        text_parts = []
        for page_num in range(len(doc)):
            page = doc[page_num]
            text_parts.append(page.get_text())
        doc.close()
        return "\n".join(text_parts)
    except ImportError:
        # Fallback to pdfplumber
        try:
            import pdfplumber

            text_parts = []
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text_parts.append(page_text)
            return "\n".join(text_parts)
        except ImportError:
            raise Exception("No PDF library available. Install PyMuPDF or pdfplumber.")


def extract_text_from_docx(file_path: str) -> str:
    """Extract text from a DOCX file using python-docx."""
    try:
        from docx import Document

        doc = Document(file_path)
        text_parts = []
        for paragraph in doc.paragraphs:
            text_parts.append(paragraph.text)
        return "\n".join(text_parts)
    except ImportError:
        raise Exception("python-docx is not installed. Install it with: pip install python-docx")


def extract_text_from_txt(file_path: str) -> str:
    """Extract text from a TXT file."""
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()
    except Exception as e:
        raise Exception(f"Error reading TXT file: {str(e)}")



def extract_text_from_pptx(file_path: str) -> str:
    """Extract readable text and table contents from a PowerPoint presentation."""
    try:
        from pptx import Presentation

        presentation = Presentation(file_path)
        text_parts = []

        def collect_shape_text(shape, parts):
            if getattr(shape, "has_text_frame", False):
                text = shape.text.strip()
                if text:
                    parts.append(text)

            if getattr(shape, "has_table", False):
                for row in shape.table.rows:
                    cells = [
                        cell.text.strip()
                        for cell in row.cells
                        if cell.text.strip()
                    ]
                    if cells:
                        parts.append(" | ".join(cells))

            # Read grouped shapes without executing or extracting embedded content.
            if hasattr(shape, "shapes"):
                for child_shape in shape.shapes:
                    collect_shape_text(child_shape, parts)

        for slide_number, slide in enumerate(presentation.slides, start=1):
            slide_parts = []

            for shape in slide.shapes:
                collect_shape_text(shape, slide_parts)

            if slide_parts:
                text_parts.append(
                    f"[Slide {slide_number}]\\n" + "\\n".join(slide_parts)
                )

        return "\\n\\n".join(text_parts)

    except ImportError:
        raise Exception(
            "python-pptx is not installed. Install it with: pip install python-pptx"
        )
    except Exception as e:
        raise Exception(f"Error reading PowerPoint presentation: {str(e)}")


def extract_text(file_path: str) -> str:
    """Extract text from a document based on its extension."""
    ext = os.path.splitext(file_path.lower())[1]

    if ext == ".pdf":
        return extract_text_from_pdf(file_path)
    elif ext == ".docx":
        return extract_text_from_docx(file_path)
    elif ext == ".pptx":
        return extract_text_from_pptx(file_path)
    elif ext == ".txt":
        return extract_text_from_txt(file_path)
    elif ext in {".jpg", ".jpeg", ".png", ".webp"}:
        from services.ai_service import extract_text_from_image

        return extract_text_from_image(file_path)
    else:
        raise ValueError(f"Unsupported file extension: {ext}")

