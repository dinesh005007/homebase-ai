"""Conversation history compactor for RAG context.

Compacts prior conversation exchanges into a concise context string
that fits within the small model's context window without wasting tokens.

Strategy:
- Keep last exchange (user Q + assistant A) in full (up to 500 chars each)
- Older exchanges: extract user question + first sentence of answer only
- Total budget: ~600 tokens (~800 chars) for history section
"""

import structlog

logger = structlog.get_logger()

# Max chars for the entire compacted history section
MAX_HISTORY_CHARS = 800
# Max chars for the most recent exchange (kept fuller)
MAX_RECENT_CHARS = 500


def _first_sentence(text: str) -> str:
    """Extract the first sentence from text."""
    # Strip markdown bold markers and leading whitespace
    clean = text.lstrip("*").strip()
    # Find sentence boundary
    for end in (".\n", ". ", ".\r"):
        idx = clean.find(end)
        if idx != -1 and idx < 200:
            return clean[: idx + 1]
    # If no period found within 200 chars, truncate
    return clean[:150] + "..." if len(clean) > 150 else clean


def compact_history(messages: list[dict]) -> str:
    """Compact conversation history into a context-efficient string.

    Args:
        messages: List of {"role": "user"|"assistant", "content": str}
                  ordered chronologically (oldest first).

    Returns:
        Compact string summarizing the conversation so far,
        or empty string if no meaningful history.
    """
    if not messages or len(messages) < 2:
        return ""

    # Pair messages into exchanges (user Q + assistant A)
    exchanges: list[tuple[str, str]] = []
    i = 0
    while i < len(messages) - 1:
        if messages[i]["role"] == "user" and messages[i + 1]["role"] == "assistant":
            exchanges.append((messages[i]["content"], messages[i + 1]["content"]))
            i += 2
        else:
            i += 1

    if not exchanges:
        return ""

    parts: list[str] = []
    total_len = 0

    # Process older exchanges (all except last): compressed
    for q, a in exchanges[:-1]:
        q_short = q[:100].strip()
        a_short = _first_sentence(a)
        line = f"Q: {q_short}\nA: {a_short}"

        if total_len + len(line) > MAX_HISTORY_CHARS - MAX_RECENT_CHARS:
            break  # budget exhausted for older exchanges
        parts.append(line)
        total_len += len(line)

    # Most recent exchange: kept fuller for better context
    last_q, last_a = exchanges[-1]
    last_q_text = last_q[:MAX_RECENT_CHARS].strip()
    last_a_text = last_a[:MAX_RECENT_CHARS].strip()
    recent = f"Q: {last_q_text}\nA: {last_a_text}"
    parts.append(recent)

    result = "\n\n".join(parts)
    logger.debug(
        "history_compacted",
        exchanges=len(exchanges),
        original_chars=sum(len(m["content"]) for m in messages),
        compacted_chars=len(result),
    )
    return result
