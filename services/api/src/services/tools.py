"""Tool definitions for LLM tool calling.

Defines tools that qwen2.5:7b can invoke during RAG generation.
Tools are described in a format the model understands and are
executed server-side when the model requests them.
"""

from uuid import UUID

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from services.api.src.models.document import Document
from services.api.src.models.document_entity_link import DocumentEntityLink
from services.api.src.models.property import Property

logger = structlog.get_logger()

# Tool definitions passed to the LLM in the system prompt
TOOL_DEFINITIONS = """Available tools (invoke by writing TOOL_CALL: tool_name(args)):
1. search_documents(query, doc_type) - Search indexed documents by keyword and type
2. get_warranty_status(item) - Check warranty coverage and expiry for a specific item
3. get_insurance_coverage(category) - Look up insurance coverage details
4. check_hoa_rules(topic) - Check HOA rules about a specific topic
5. get_asset_info(asset_name) - Get details about a home asset/appliance
6. get_maintenance_schedule(system) - Get maintenance schedule for a home system
7. create_maintenance_task(title, due_date, priority) - Create a new maintenance task
8. estimate_cost(task_description) - Estimate cost range for a home task
9. log_service_event(vendor, description, cost) - Log a service/repair event
10. get_property_info() - Get property details (address, builder, purchase date)"""


async def execute_tool(
    tool_name: str,
    args: dict,
    property_id: UUID,
    db: AsyncSession,
) -> str:
    """Execute a tool call and return the result as a string."""
    try:
        if tool_name == "get_property_info":
            return await _get_property_info(property_id, db)
        elif tool_name == "search_documents":
            return await _search_documents(property_id, args.get("doc_type"), db)
        elif tool_name == "get_warranty_status":
            return await _get_warranty_status(property_id, args.get("item", ""), db)
        elif tool_name == "get_asset_info":
            return await _get_asset_info(property_id, args.get("asset_name", ""), db)
        elif tool_name == "check_hoa_rules":
            return f"HOA rule lookup for '{args.get('topic', '')}' — check your HOA documents for specific rules."
        elif tool_name == "get_insurance_coverage":
            return f"Insurance coverage lookup for '{args.get('category', '')}' — refer to your insurance policy documents."
        elif tool_name == "get_maintenance_schedule":
            return f"Maintenance schedule for '{args.get('system', '')}' — check your maintenance tasks page."
        elif tool_name == "estimate_cost":
            return f"Cost estimation for '{args.get('task_description', '')}' — get quotes from local contractors for accurate pricing."
        else:
            return f"Unknown tool: {tool_name}"
    except Exception as e:
        logger.error("tool_execution_error", tool=tool_name, error=str(e))
        return f"Tool error: {str(e)}"


async def _get_property_info(property_id: UUID, db: AsyncSession) -> str:
    prop = await db.get(Property, property_id)
    if not prop:
        return "Property not found."
    parts = [
        f"Address: {prop.address_line1}, {prop.city}, {prop.state} {prop.zip_code}",
        f"Name: {prop.name}",
    ]
    if prop.builder:
        parts.append(f"Builder: {prop.builder}")
    if prop.purchase_date:
        parts.append(f"Purchase date: {prop.purchase_date.isoformat()}")
    return "\n".join(parts)


async def _search_documents(
    property_id: UUID, doc_type: str | None, db: AsyncSession
) -> str:
    stmt = select(Document.title, Document.doc_type).where(
        Document.property_id == property_id
    )
    if doc_type:
        stmt = stmt.where(Document.doc_type == doc_type)
    result = await db.execute(stmt.limit(10))
    docs = result.fetchall()
    if not docs:
        return "No documents found."
    return "\n".join(f"- {d.title} ({d.doc_type})" for d in docs)


async def _get_warranty_status(
    property_id: UUID, item: str, db: AsyncSession
) -> str:
    result = await db.execute(
        select(Document).where(
            Document.property_id == property_id,
            Document.doc_type == "warranty",
        )
    )
    docs = result.scalars().all()
    if not docs:
        return "No warranty documents found."

    parts = []
    for doc in docs:
        meta = doc.metadata_ or {}
        extracted = meta.get("extracted_fields", {})
        if extracted:
            parts.append(f"Warranty: {doc.title}")
            if "warranty_end_date" in extracted:
                parts.append(f"  Expires: {extracted['warranty_end_date']}")
            if "coverage_items" in extracted:
                for ci in extracted["coverage_items"][:5]:
                    parts.append(f"  - {ci.get('item', 'unknown')}: until {ci.get('covered_until', 'N/A')}")
    return "\n".join(parts) if parts else f"Warranty documents found but no extracted data for '{item}'."


async def _get_asset_info(
    property_id: UUID, asset_name: str, db: AsyncSession
) -> str:
    from services.api.src.models.document import Document
    result = await db.execute(
        select(DocumentEntityLink)
        .join(Document, DocumentEntityLink.document_id == Document.id)
        .where(
            Document.property_id == property_id,
            DocumentEntityLink.entity_type == "asset",
            DocumentEntityLink.entity_name.ilike(
                f"%{asset_name.replace('%', r'\\%').replace('_', r'\\_')}%"
            ),
        ).limit(5)
    )
    links = result.scalars().all()
    if not links:
        return f"No asset information found for '{asset_name}'."
    return "\n".join(
        f"- {link.entity_name} (linked to document {link.document_id}, type: {link.link_type})"
        for link in links
    )
