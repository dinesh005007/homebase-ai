"""add audit_events and ai_runs tables

Revision ID: 009
Revises: 008
Create Date: 2026-04-08

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "009"
down_revision: Union[str, None] = "008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "audit_events",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("timestamp", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("action", sa.String(100), nullable=False),
        sa.Column("user_id", sa.String(255), nullable=True),
        sa.Column("entity_type", sa.String(50), nullable=True),
        sa.Column("entity_id", sa.String(255), nullable=True),
        sa.Column("property_id", sa.String(255), nullable=True),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("details", sa.JSON(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_audit_events_timestamp", "audit_events", ["timestamp"])
    op.create_index("ix_audit_events_action", "audit_events", ["action"])
    op.create_index("ix_audit_events_property_id", "audit_events", ["property_id"])

    op.create_table(
        "ai_runs",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("timestamp", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("property_id", sa.String(255), nullable=True),
        sa.Column("question", sa.Text(), nullable=True),
        sa.Column("intent", sa.String(50), nullable=True),
        sa.Column("model_used", sa.String(100), nullable=False),
        sa.Column("is_cloud_fallback", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("chunks_retrieved", sa.Integer(), nullable=True),
        sa.Column("best_similarity", sa.Float(), nullable=True),
        sa.Column("confidence", sa.String(20), nullable=True),
        sa.Column("safety_level", sa.String(20), nullable=True),
        sa.Column("latency_ms", sa.Integer(), nullable=True),
        sa.Column("tool_calls", sa.JSON(), nullable=True),
        sa.Column("details", sa.JSON(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("ai_runs")
    op.drop_table("audit_events")
