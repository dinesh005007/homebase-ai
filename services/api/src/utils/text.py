"""Text chunking utilities for document ingestion."""


def _approx_token_count(text: str) -> int:
    return int(len(text.split()) * 1.3)


def _split_text(text: str, separators: list[str], chunk_size: int, overlap: int) -> list[str]:
    """Recursively split text using a hierarchy of separators."""
    if not text:
        return []

    sep = separators[0] if separators else " "
    remaining_seps = separators[1:] if len(separators) > 1 else []

    parts = text.split(sep)
    chunks: list[str] = []
    current = ""

    for part in parts:
        candidate = f"{current}{sep}{part}" if current else part
        if _approx_token_count(candidate) > chunk_size and current:
            chunks.append(current.strip())
            # Start new chunk with overlap from the end of previous
            if overlap > 0:
                overlap_chars = overlap * 5
                current = current[-overlap_chars:].strip() + sep + part if len(current) > overlap_chars else part
            else:
                current = part
        else:
            current = candidate

    if current.strip():
        chunks.append(current.strip())

    # If any chunk is still too large and we have more separators, split further
    if remaining_seps:
        refined: list[str] = []
        for chunk in chunks:
            if _approx_token_count(chunk) > chunk_size:
                refined.extend(_split_text(chunk, remaining_seps, chunk_size, overlap))
            else:
                refined.append(chunk)
        return refined

    return chunks


def chunk_text(
    text: str,
    chunk_size: int = 400,
    overlap: int = 100,
) -> list[dict]:
    """Split text into overlapping chunks using recursive character splitting.

    Returns list of {content, chunk_index, token_count}.
    """
    separators = ["\n\n", "\n", ". ", " "]
    raw_chunks = _split_text(text, separators, chunk_size, overlap)

    return [
        {
            "content": chunk,
            "chunk_index": i,
            "token_count": _approx_token_count(chunk),
        }
        for i, chunk in enumerate(raw_chunks)
        if chunk.strip()
    ]


# Section patterns for document-type-aware chunking
_SECTION_PATTERNS: dict[str, list[str]] = {
    "insurance_policy": [
        "declarations", "coverage", "exclusions", "endorsements",
        "conditions", "definitions", "limits", "deductible",
    ],
    "warranty": [
        "coverage", "exclusions", "limitations", "claim",
        "maintenance", "contact", "duration", "transferability",
    ],
    "hoa_ccr": [
        "architectural", "restrictions", "fees", "assessment",
        "enforcement", "meetings", "voting", "amendments",
        "maintenance", "common area", "parking", "landscaping",
        "rental", "lease", "occupancy", "tenant", "commercial",
        "pet", "animal", "nuisance", "insurance", "indemnif",
    ],
    "manual": [
        "installation", "operation", "troubleshooting", "maintenance",
        "parts", "specifications", "warranty", "safety", "model",
    ],
}


def _detect_section(text: str, doc_type: str) -> str | None:
    """Detect which section a chunk belongs to based on document type."""
    patterns = _SECTION_PATTERNS.get(doc_type, [])
    text_lower = text[:200].lower()
    for pattern in patterns:
        if pattern in text_lower:
            return pattern
    return None


def smart_chunk_text(
    text: str,
    doc_type: str,
    chunk_size: int = 400,
    overlap: int = 100,
) -> list[dict]:
    """Document-type-aware chunking with section detection.

    Returns list of {content, chunk_index, token_count, section_header}.
    """
    raw_chunks = _split_text(text, ["\n\n", "\n", ". ", " "], chunk_size, overlap)

    results: list[dict] = []
    for i, chunk in enumerate(raw_chunks):
        if not chunk.strip():
            continue
        section = _detect_section(chunk, doc_type)
        results.append({
            "content": chunk,
            "chunk_index": i,
            "token_count": _approx_token_count(chunk),
            "section_header": section,
        })
    return results
