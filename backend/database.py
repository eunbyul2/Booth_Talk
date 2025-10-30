"""
Database configuration and session management
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from typing import Generator
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database URL with local fallback for development
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    default_sqlite = os.path.join(os.path.dirname(__file__), "lovely.db")
    DATABASE_URL = f"sqlite:///{default_sqlite}"

# Create SQLAlchemy engine
engine_kwargs = {
    "pool_pre_ping": True,
    "echo": os.getenv("DEBUG", "False").lower() == "true",
}

if DATABASE_URL.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    engine_kwargs["pool_size"] = 10
    engine_kwargs["max_overflow"] = 20

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
            if engine.dialect.name == "sqlite":
                result = conn.execute("SELECT sqlite_version();")
                version = result.fetchone()
                print("✅ SQLite connection successful!")
                print(f"SQLite version: {version[0]}")
            else:
                result = conn.execute("SELECT version();")
                version = result.fetchone()
                print("✅ Database connection successful!")
                print(f"PostgreSQL version: {version[0]}")
            return True
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False


if __name__ == "__main__":
    test_connection()
