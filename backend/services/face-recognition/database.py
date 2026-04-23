"""
Database connection and pgVector-backed face embeddings table.
Shares PostgreSQL with the main Spring Boot app but owns its own table.
"""

import logging
import os
from sqlalchemy import (
    create_engine, Column, String, Float, Boolean, Integer, DateTime, func, text
)
from sqlalchemy.orm import sessionmaker, declarative_base
from pgvector.sqlalchemy import Vector

logger = logging.getLogger(__name__)

# Default: local docker-compose postgres. Override via DATABASE_URL env var.
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@postgres:5432/school_db"
)

engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_size=3, max_overflow=5)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class FaceEmbedding(Base):
    """
    Stores one 512-D InsightFace embedding per image per student.
    A student may have multiple embeddings (multiple registered photos).
    """
    __tablename__ = "face_embeddings"

    id            = Column(Integer, primary_key=True, autoincrement=True)
    student_id    = Column(String, nullable=False, index=True)
    student_code  = Column(String, nullable=True)
    student_name  = Column(String, nullable=True)
    embedding     = Column(Vector(512), nullable=False)   # pgVector 512-D
    image_url     = Column(String, nullable=True)          # Cloudinary URL
    quality_score = Column(Float, nullable=True)
    is_active     = Column(Boolean, default=True)
    created_at    = Column(DateTime, server_default=func.now())
    updated_at    = Column(DateTime, onupdate=func.now())


def init_db():
    """Enable pgvector extension (if not already) and create tables."""
    try:
        with engine.connect() as conn:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            conn.commit()
    except Exception as e:
        logger.warning("pgvector extension setup: %s", e)

    Base.metadata.create_all(bind=engine)
    logger.info("Database tables ensured (pgVector enabled).")


def get_db():
    """FastAPI dependency for DB sessions."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
