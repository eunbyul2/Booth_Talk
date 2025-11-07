"""
Manual migration script to add Unsplash image fields to events table
Run this with: python add_unsplash_fields.py
"""

from sqlalchemy import text
from database import engine
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def migrate():
    """Add unsplash_image_url and has_custom_image columns to events table"""

    try:
        with engine.connect() as conn:
            # Check if columns already exist
            check_query = text("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = 'events'
                AND column_name IN ('unsplash_image_url', 'has_custom_image');
            """)

            result = conn.execute(check_query)
            existing_columns = {row[0] for row in result}

            # Add unsplash_image_url if it doesn't exist
            if 'unsplash_image_url' not in existing_columns:
                logger.info("Adding column: unsplash_image_url")
                conn.execute(text("""
                    ALTER TABLE events
                    ADD COLUMN unsplash_image_url VARCHAR;
                """))
                conn.commit()
                logger.info("✅ Added unsplash_image_url column")
            else:
                logger.info("Column unsplash_image_url already exists")

            # Add has_custom_image if it doesn't exist
            if 'has_custom_image' not in existing_columns:
                logger.info("Adding column: has_custom_image")
                conn.execute(text("""
                    ALTER TABLE events
                    ADD COLUMN has_custom_image BOOLEAN DEFAULT FALSE;
                """))
                conn.commit()
                logger.info("✅ Added has_custom_image column")
            else:
                logger.info("Column has_custom_image already exists")

            # Backfill existing events: set has_custom_image=TRUE where image_url exists
            logger.info("Backfilling has_custom_image for existing events...")
            update_query = text("""
                UPDATE events
                SET has_custom_image = TRUE
                WHERE image_url IS NOT NULL AND image_url != '';
            """)
            result = conn.execute(update_query)
            conn.commit()
            logger.info(f"✅ Updated {result.rowcount} events with has_custom_image=TRUE")

            logger.info("🎉 Migration completed successfully!")

    except Exception as e:
        logger.error(f"❌ Migration failed: {e}")
        raise


if __name__ == "__main__":
    migrate()
