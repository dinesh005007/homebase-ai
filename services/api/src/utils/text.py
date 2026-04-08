"""Text chunking utilities for document ingestion."""


def _approx_token_count(text: str) -> int:
    return len(text) // 4


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
                overlap_chars = overlap * 4
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
    chunk_size: int = 800,
    overlap: int = 200,
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
