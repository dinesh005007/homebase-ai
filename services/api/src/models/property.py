from datetime import date

from sqlalchemy import Date, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from services.api.src.models.base import Base, TimestampMixin


class Property(TimestampMixin, Base):
    __tablename__ = "properties"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    address_line1: Mapped[str] = mapped_column(String(255), nullable=False)
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    state: Mapped[str] = mapped_column(String(2), nullable=False)
    zip_code: Mapped[str] = mapped_column(String(10), nullable=False)
    builder: Mapped[str | None] = mapped_column(String(255))
    builder_model: Mapped[str | None] = mapped_column(String(255))
    purchase_date: Mapped[date | None] = mapped_column(Date)
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSONB, default=dict)

    documents: Mapped[list["Document"]] = relationship(back_populates="property")  # noqa: F821
