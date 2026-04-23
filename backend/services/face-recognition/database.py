"""
Database connection and pgVector-backed face embeddings table.
Shares PostgreSQL with the main SpringBoot app but owns its own table.
"""

import os
from sqlalchemy import (
    create_engine, Column, String, Float, Boolean, Integer, DateTime, func, text
)
from sqlalchemy.orm import sessionmaker, declarative_base
from pgvector.sqlalchemy import Vector

# Default matches docker-compose.yml credentials (postgres/postgres)
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@postgres:5432/school_db"
)

engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_size=5)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class FaceEmbedding(Base):
    """
    Stores one 512-D InsightFace embedding per image per student.
    A student may have multiple embeddings (multiple registered photos).
    """
    __tablename__ = "face_embeddings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(String, nullable=False, index=True)       # UUID string from main app
    student_code = Column(String, nullable=True)                   # e.g. "HS001"
    student_name = Column(String, nullable=True)                   # For display in results
    embedding = Column(Vector(512), nullable=False)                # InsightFace 512-D vector
    image_path = Column(String, nullable=True)                     # Optional: reference to original image
    quality_score = Column(Float, nullable=True)                   # Face quality 0-1
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())


def init_db():
    """Create pgVector extension and tables if they don't exist."""
    # Enable pgvector extension (requires pgvector/pgvector:pg16 image)
    with engine.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        conn.commit()

    # Create face_embeddings table
    Base.metadata.create_all(bind=engine)


def get_db():
    """FastAPI dependency for DB sessions."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
