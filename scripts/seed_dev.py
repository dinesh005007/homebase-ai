"""Seed the database with a development property record."""

import asyncio
from datetime import date

from sqlalchemy import select

from services.api.src.database import async_session
from services.api.src.models.property import Property


async def seed() -> None:
    async with async_session() as session:
        # Check if already seeded
        result = await session.execute(
            select(Property).where(Property.zip_code == "75009")
        )
        if result.scalar_one_or_none():
            print("Seed data already exists, skipping.")
            return

        prop = Property(
            name="Cottontail Way Home",
            address_line1="809 Cottontail Way",
            city="Celina",
            state="TX",
            zip_code="75009",
            builder="Taylor Morrison",
            builder_model="Bordeaux",
            purchase_date=date(2026, 3, 25),
            metadata_={
                "climate_zone": "3A",
                "soil_type": "clay",
                "hoa": "Celina Hills HOA",
            },
        )
        session.add(prop)
        await session.commit()
        print(f"Seeded property: {prop.name} (id={prop.id})")


if __name__ == "__main__":
    asyncio.run(seed())
