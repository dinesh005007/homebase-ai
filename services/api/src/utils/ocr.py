"""OCR for scanned PDFs using Tesseract + pdf2image."""

import structlog
from pathlib import Path

logger = structlog.get_logger()


def ocr_pdf(file_path: str) -> str:
    """Convert scanned PDF pages to text using Tesseract OCR.

    Requires: tesseract-ocr, poppler-utils (system packages)
              pytesseract, pdf2image (pip packages)

    Returns full text with page markers.
    """
    try:
        from pdf2image import convert_from_path
        import pytesseract
    except ImportError as e:
        logger.error("ocr_import_error", error=str(e))
        return ""

    logger.info("ocr_start", file=file_path)

    try:
        # Convert PDF pages to images (200 DPI balances speed vs quality)
        images = convert_from_path(file_path, dpi=200, fmt="jpeg")
        logger.info("ocr_pages_converted", pages=len(images))

        text_parts: list[str] = []
        for i, image in enumerate(images):
            page_num = i + 1
            page_text = pytesseract.image_to_string(image, lang="eng")
            if page_text.strip():
                text_parts.append(f"[Page {page_num}]\n{page_text.strip()}")

            # Log progress every 10 pages
            if page_num % 10 == 0:
                logger.info("ocr_progress", page=page_num, total=len(images))

        full_text = "\n\n".join(text_parts)
        logger.info("ocr_complete", pages=len(images), chars=len(full_text))
        return full_text

    except Exception as e:
        logger.error("ocr_failed", error=str(e))
        return ""


def is_scanned_pdf(text: str, page_count: int) -> bool:
    """Detect if a PDF is likely scanned (low text per page)."""
    if page_count == 0:
        return False
    chars_per_page = len(text) / page_count
    return chars_per_page < 100
