"""OCR for scanned PDFs using Tesseract + pdf2image."""

import os
import re
import time

import structlog

logger = structlog.get_logger()

MAX_PAGES = int(os.environ.get("OCR_MAX_PAGES", "200"))
OCR_TIMEOUT_SECONDS = int(os.environ.get("OCR_TIMEOUT_SECONDS", "120"))


class OCRTimeoutError(Exception):
    """Raised when OCR exceeds the configured timeout."""


def ocr_pdf(file_path: str) -> str:
    """Convert scanned PDF pages to text using Tesseract OCR.

    Requires: tesseract-ocr, poppler-utils (system packages)
              pytesseract, pdf2image (pip packages)

    Respects MAX_PAGES and OCR_TIMEOUT_SECONDS limits.
    Returns full text with page markers.
    """
    try:
        from pdf2image import convert_from_path
        import pytesseract
    except ImportError as e:
        logger.error("ocr_import_error", error=str(e))
        return ""

    logger.info("ocr_start", file=file_path, max_pages=MAX_PAGES, timeout=OCR_TIMEOUT_SECONDS)
    start = time.monotonic()

    try:
        # Convert PDF pages to images (200 DPI balances speed vs quality)
        images = convert_from_path(file_path, dpi=200, fmt="jpeg")
        total_pages = len(images)
        logger.info("ocr_pages_converted", pages=total_pages)

        if total_pages > MAX_PAGES:
            logger.warning(
                "ocr_truncated",
                total_pages=total_pages,
                max_pages=MAX_PAGES,
                message=f"PDF has {total_pages} pages, only OCR-ing first {MAX_PAGES}",
            )
            images = images[:MAX_PAGES]

        text_parts: list[str] = []
        for i, image in enumerate(images):
            # Check timeout before each page
            elapsed = time.monotonic() - start
            if elapsed > OCR_TIMEOUT_SECONDS:
                logger.warning(
                    "ocr_timeout",
                    pages_completed=i,
                    total_pages=len(images),
                    elapsed_seconds=round(elapsed, 1),
                    timeout=OCR_TIMEOUT_SECONDS,
                )
                break

            page_num = i + 1
            page_text = pytesseract.image_to_string(image, lang="eng")
            if page_text.strip():
                text_parts.append(f"[Page {page_num}]\n{page_text.strip()}")

            # Log progress every 10 pages
            if page_num % 10 == 0:
                logger.info("ocr_progress", page=page_num, total=len(images), elapsed=round(time.monotonic() - start, 1))

        full_text = "\n\n".join(text_parts)

        # Clean OCR artifacts before downstream processing
        full_text = _clean_ocr_text(full_text)

        logger.info("ocr_complete", pages_processed=len(text_parts), total_pages=total_pages, chars=len(full_text), elapsed=round(time.monotonic() - start, 1))
        return full_text

    except Exception as e:
        logger.error("ocr_failed", error=str(e), elapsed=round(time.monotonic() - start, 1))
        return ""


def _clean_ocr_text(text: str) -> str:
    """Clean common OCR artifacts to improve embedding and search quality."""
    # Strip [Page N] markers — useful for logging but noise for embeddings
    text = re.sub(r"\[Page \d+\]\n?", "", text)
    # Fix common ligature failures
    text = text.replace("ﬁ", "fi").replace("ﬂ", "fl").replace("ﬀ", "ff")
    # Normalize quotes and dashes
    text = text.replace("\u2018", "'").replace("\u2019", "'")
    text = text.replace("\u201c", '"').replace("\u201d", '"')
    text = text.replace("\u2013", "-").replace("\u2014", "-")
    # Collapse excessive whitespace (but keep paragraph breaks)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    # Remove isolated single characters that are OCR garbage (not "I" or "a")
    text = re.sub(r"\b[^IaA\w]\b", "", text)
    return text.strip()


def is_scanned_pdf(text: str, page_count: int) -> bool:
    """Detect if a PDF is likely scanned (low text per page)."""
    if page_count == 0:
        return False
    chars_per_page = len(text) / page_count
    return chars_per_page < 100
