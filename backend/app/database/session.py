"""
Database session factory.
SQLAlchemy engine and session are configured here.
No tables are created in Module 1 — only connection setup.
"""
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.core.config import get_settings

settings = get_settings()

engine = create_engine(
    settings.database_url or "postgresql+psycopg://oilspill_user:changeme@localhost:5432/oilspill_db",
    pool_pre_ping=True,          # Validate connections before use
    pool_size=5,
    max_overflow=10,
    echo=settings.debug,         # Log SQL in debug mode
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy ORM models."""
    pass


def get_db():
    """
    FastAPI dependency that yields a database session.
    Automatically closes the session when the request completes.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_db_connection() -> bool:
    """
    Test database connectivity.
    Returns True if connection succeeds, False otherwise.
    """
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False
