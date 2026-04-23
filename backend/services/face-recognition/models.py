"""
Pydantic request/response schemas for the Face Recognition API.
"""

from pydantic import BaseModel, Field
from typing import List, Optional


# ========================= Registration =========================

class RegisterResponse(BaseModel):
    success: bool
    student_id: str
    message: str
    embedding_count: int = 0
    embedding_id: Optional[int] = None
    image_url: Optional[str] = None


class BulkRegisterItem(BaseModel):
    """Result for a single image within a bulk registration request."""
    success: bool
    message: Optional[str] = None
    embedding_id: Optional[int] = None
    image_url: Optional[str] = None


class BulkRegisterResponse(BaseModel):
    success: bool
    student_id: str
    message: str
    embedding_count: int = 0
    results: List[BulkRegisterItem]


# ========================= Recognition =========================

class RecognizedFace(BaseModel):
    """A single detected face and its match result."""
    student_id: Optional[str] = None
    student_code: Optional[str] = None
    student_name: Optional[str] = None
    confidence: float = Field(0.0, ge=0.0, le=1.0)
    status: str = Field(
        ...,
        description="MATCHED (>=0.55 auto), NEEDS_CONFIRM (0.45-0.55), NO_MATCH (<0.45)"
    )
    bbox: Optional[List[int]] = None  # [x1, y1, x2, y2] bounding box


class BatchRecognizeResponse(BaseModel):
    """Response for batch recognition (1-3 images of classroom)."""
    results: List[RecognizedFace]
    total_faces_detected: int
    total_matched: int
    total_needs_confirm: int
    total_no_match: int
    processing_time_ms: int


# ========================= Status =========================

class StudentRegistrationStatus(BaseModel):
    student_id: str
    student_code: Optional[str] = None
    student_name: Optional[str] = None
    is_registered: bool
    image_count: int = 0
    last_updated: Optional[str] = None


class ClassRegistrationStatusResponse(BaseModel):
    students: List[StudentRegistrationStatus]
    total_students: int
    total_registered: int
    total_unregistered: int


# ========================= Student Photos =========================

class StudentPhotoDto(BaseModel):
    """A single face photo/embedding record."""
    id: int
    image_url: Optional[str] = None
    quality_score: Optional[float] = None
    created_at: Optional[str] = None


class StudentPhotosResponse(BaseModel):
    """All photos for a student."""
    student_id: str
    student_code: Optional[str] = None
    student_name: Optional[str] = None
    photos: List[StudentPhotoDto]
    total_photos: int


# ========================= Health =========================

class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    database_connected: bool
