"""add warranties and insurance_policies tables

Revision ID: 008
Revises: 007
Create Date: 2026-04-08

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "008"
down_revision: Union[str, None] = "007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "warranties",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("property_id", sa.UUID(), nullable=False),
        sa.Column("document_id", sa.UUID(), nullable=True),
        sa.Column("provider", sa.String(255), nullable=False),
        sa.Column("warranty_type", sa.String(100), nullable=False),
        sa.Column("coverage_summary", sa.Text(), nullable=True),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("claim_phone", sa.String(50), nullable=True),
        sa.Column("claim_email", sa.String(255), nullable=True),
        sa.Column("transferable", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("metadata", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["property_id"], ["properties.id"]),
        sa.ForeignKeyConstraint(["document_id"], ["documents.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_warranties_property_id", "warranties", ["property_id"])

    op.create_table(
        "insurance_policies",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("property_id", sa.UUID(), nullable=False),
        sa.Column("document_id", sa.UUID(), nullable=True),
        sa.Column("carrier", sa.String(255), nullable=False),
        sa.Column("policy_number", sa.String(100), nullable=True),
        sa.Column("premium_annual", sa.Float(), nullable=True),
        sa.Column("deductible", sa.Float(), nullable=True),
        sa.Column("dwelling_coverage", sa.Float(), nullable=True),
        sa.Column("liability_coverage", sa.Float(), nullable=True),
        sa.Column("personal_property_coverage", sa.Float(), nullable=True),
        sa.Column("effective_date", sa.Date(), nullable=True),
        sa.Column("expiration_date", sa.Date(), nullable=True),
        sa.Column("endorsements", sa.JSON(), nullable=True),
        sa.Column("metadata", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["property_id"], ["properties.id"]),
        sa.ForeignKeyConstraint(["document_id"], ["documents.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_insurance_policies_property_id", "insurance_policies", ["property_id"])


def downgrade() -> None:
    op.drop_table("insurance_policies")
    op.drop_table("warranties")
