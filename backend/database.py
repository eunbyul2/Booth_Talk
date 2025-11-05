"""
Database configuration and session management
"""
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base  # type: ignore[attr-defined]
from sqlalchemy.orm import sessionmaker
from typing import Generator
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database URL (PostgreSQL required)
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL is not set. Update backend/.env with your PostgreSQL connection string."
    )

# Create SQLAlchemy engine
engine_kwargs = {
    "pool_pre_ping": True,
    "echo": os.getenv("DEBUG", "False").lower() == "true",
}

engine_kwargs["pool_size"] = int(os.getenv("DB_POOL_SIZE", "10"))
engine_kwargs["max_overflow"] = int(os.getenv("DB_MAX_OVERFLOW", "20"))

engine = create_engine(DATABASE_URL, **engine_kwargs)

# Create SessionLocal class
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Create Base class for models
Base = declarative_base()

# Dependency to get DB session
def get_db() -> Generator:
    """
    Dependency function to get database session
    
    Usage in FastAPI:
        @app.get("/items/")
        def read_items(db: Session = Depends(get_db)):
            ...
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Test database connection
def test_connection():
    """Test database connection"""
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT version();"))
            version = result.fetchone()
            print("PostgreSQL connection successful!")
            print(f"PostgreSQL version: {version[0]}")
            return True
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False

if __name__ == "__main__":
    test_connection()
