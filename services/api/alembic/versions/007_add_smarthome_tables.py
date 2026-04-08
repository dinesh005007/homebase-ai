"""add smart home sensor_readings and alerts tables

Revision ID: 007
Revises: 006
Create Date: 2026-04-08

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "007"
down_revision: Union[str, None] = "006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "sensor_readings",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("property_id", sa.UUID(), nullable=False),
        sa.Column("entity_id", sa.String(255), nullable=False),
        sa.Column("entity_type", sa.String(50), nullable=False),
        sa.Column("value", sa.Float(), nullable=True),
        sa.Column("unit", sa.String(20), nullable=True),
        sa.Column("state", sa.String(100), nullable=True),
        sa.Column("room", sa.String(100), nullable=True),
        sa.Column("recorded_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("metadata", sa.JSON(), nullable=True),
        sa.ForeignKeyConstraint(["property_id"], ["properties.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_sensor_readings_property_id", "sensor_readings", ["property_id"])
    op.create_index("ix_sensor_readings_entity_id", "sensor_readings", ["entity_id"])
    op.create_index("ix_sensor_readings_recorded_at", "sensor_readings", ["recorded_at"])

    op.create_table(
        "alerts",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("property_id", sa.UUID(), nullable=False),
        sa.Column("alert_type", sa.String(50), nullable=False),
        sa.Column("severity", sa.String(20), nullable=False),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("entity_id", sa.String(255), nullable=True),
        sa.Column("room", sa.String(100), nullable=True),
        sa.Column("acknowledged", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("acknowledged_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("resolved", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("metadata", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["property_id"], ["properties.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_alerts_property_id", "alerts", ["property_id"])


def downgrade() -> None:
    op.drop_table("alerts")
    op.drop_table("sensor_readings")
