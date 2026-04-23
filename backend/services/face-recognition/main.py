"""
Face Recognition Microservice — FastAPI Application

Endpoints:
  POST /register          — Register a student's face (single image)
  POST /recognize-batch   — Recognize multiple faces from 1-3 classroom photos
  GET  /status/{student_id} — Check registration status for a student
  POST /class-status      — Check registration status for a list of students
  GET  /student-photos/{student_id} — Get all registered photos for a student
  DELETE /embedding/{embedding_id} — Delete a specific embedding
  DELETE /student/{student_id}/all — Delete all embeddings for a student
  DELETE /embeddings/{student_id}  — Delete all embeddings (alias)
  GET  /health            — Health check
"""

import io
import time
import logging
import numpy as np
import cv2
from typing import List, Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from pgvector.sqlalchemy import Vector

from database import init_db, get_db, FaceEmbedding
from face_engine import face_engine
from models import (
    RegisterResponse,
    BulkRegisterItem,
    BulkRegisterResponse,
    RecognizedFace,
    BatchRecognizeResponse,
    StudentRegistrationStatus,
    ClassRegistrationStatusResponse,
    StudentPhotoDto,
    StudentPhotosResponse,
    HealthResponse,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: load model + init DB."""
    logger.info("Initializing database...")
    init_db()
    logger.info("Database initialized.")

    logger.info("Loading face recognition model...")
    face_engine.load_model()
    logger.info("Startup complete.")
    yield
    logger.info("Shutting down.")


app = FastAPI(
    title="Face Recognition Service",
    description="InsightFace-based face recognition for school attendance",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ──────────────────────────────────────────────
#  Helpers
# ──────────────────────────────────────────────

def _read_image(file_bytes: bytes) -> np.ndarray:
    """Decode uploaded file bytes into an OpenCV BGR image."""
    nparr = np.frombuffer(file_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image file")
    return img


def _resize_image(img: np.ndarray, max_dim: int = 800) -> np.ndarray:
    """Resize image so the longer side <= max_dim. Noop if already small."""
    h, w = img.shape[:2]
    if max(h, w) <= max_dim:
        return img
    scale = max_dim / max(h, w)
    return cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)


def _find_best_match(
    embedding: np.ndarray, db: Session,
    class_student_ids: Optional[List[str]] = None
) -> Optional[RecognizedFace]:
    """
    Query pgVector for the nearest embedding using cosine distance.
    Returns RecognizedFace with graduated confidence, or None.
    """
    embedding_list = embedding.tolist()

    if class_student_ids:
        query = text("""
            SELECT
                student_id,
                student_code,
                student_name,
                1 - (embedding <=> CAST(:vec AS vector)) AS similarity
            FROM face_embeddings
            WHERE is_active = TRUE
            AND student_id = ANY(:student_ids)
            ORDER BY embedding <=> CAST(:vec AS vector) ASC
            LIMIT 1
        """)
    else:
        query = text("""
            SELECT
                student_id,
                student_code,
                student_name,
                1 - (embedding <=> CAST(:vec AS vector)) AS similarity
            FROM face_embeddings
            WHERE is_active = TRUE
            ORDER BY embedding <=> CAST(:vec AS vector) ASC
            LIMIT 1
        """)

    params = {"vec": str(embedding_list)}
    if class_student_ids:
        params["student_ids"] = class_student_ids

    row = db.execute(query, params).fetchone()

    if row is None:
        return None

    similarity = float(row.similarity)
    status = face_engine.classify_confidence(similarity)

    return RecognizedFace(
        student_id=row.student_id if status != "NO_MATCH" else None,
        student_code=row.student_code if status != "NO_MATCH" else None,
        student_name=row.student_name if status != "NO_MATCH" else None,
        confidence=round(similarity, 4),
        status=status,
    )


# ──────────────────────────────────────────────
#  Endpoints
# ──────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse)
def health_check(db: Session = Depends(get_db)):
    db_ok = False
    try:
        db.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        pass
    return HealthResponse(
        status="ok",
        model_loaded=face_engine.is_loaded,
        database_connected=db_ok,
    )


@app.post("/register", response_model=RegisterResponse)
async def register_face(
    student_id: str = Form(...),
    student_code: str = Form(default=""),
    student_name: str = Form(default=""),
    image_url: str = Form(default=""),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Register a student's face. Upload one image at a time.
    Multiple calls for the same student will add multiple embeddings
    (recommended: 3-5 images per student for better accuracy).
    """
    contents = await file.read()
    img = _resize_image(_read_image(contents))

    result = face_engine.extract_single(img)
    if result is None:
        raise HTTPException(
            status_code=400,
            detail="Không tìm thấy khuôn mặt trong ảnh. Vui lòng chụp lại."
        )

    embedding, quality = result

    record = FaceEmbedding(
        student_id=student_id,
        student_code=student_code or None,
        student_name=student_name or None,
        embedding=embedding.tolist(),
        image_path=image_url if image_url else None,
        quality_score=float(quality),
        is_active=True,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    count = db.query(FaceEmbedding).filter(
        FaceEmbedding.student_id == student_id,
        FaceEmbedding.is_active == True,
    ).count()

    return RegisterResponse(
        success=True,
        student_id=student_id,
        message=f"Đã đăng ký thành công ({count} ảnh).",
        embedding_count=count,
        embedding_id=record.id,
        image_url=record.image_path,
    )


@app.post("/register-bulk", response_model=BulkRegisterResponse)
async def register_bulk(
    student_id: str = Form(...),
    student_code: str = Form(default=""),
    student_name: str = Form(default=""),
    image_urls: str = Form(default=""),
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
):
    """
    Register multiple face images for one student in a single request.
    image_urls: comma-separated Cloudinary URLs, one per file (empty string if not available).
    Returns per-file results with a single DB commit.
    """
    url_list = [u.strip() for u in image_urls.split(",") if image_urls] if image_urls else []

    results: list[BulkRegisterItem] = []
    pending: list[tuple[FaceEmbedding, int]] = []  # (record, result_index)

    for i, upload_file in enumerate(files):
        image_url = url_list[i] if i < len(url_list) else None
        try:
            contents = await upload_file.read()
            img = _resize_image(_read_image(contents))
            extracted = face_engine.extract_single(img)
            if extracted is None:
                results.append(BulkRegisterItem(success=False, message="Không tìm thấy khuôn mặt"))
                continue
            embedding, quality = extracted
            record = FaceEmbedding(
                student_id=student_id,
                student_code=student_code or None,
                student_name=student_name or None,
                embedding=embedding.tolist(),
                image_path=image_url if image_url else None,
                quality_score=float(quality),
                is_active=True,
            )
            db.add(record)
            pending.append((record, len(results)))
            results.append(BulkRegisterItem(success=True, image_url=image_url))
        except HTTPException:
            results.append(BulkRegisterItem(success=False, message="Ảnh không hợp lệ"))
        except Exception as e:
            logger.warning(f"register-bulk image {i} failed: {e}")
            results.append(BulkRegisterItem(success=False, message="Lỗi xử lý ảnh"))

    if pending:
        db.commit()
        for record, idx in pending:
            db.refresh(record)
            results[idx].embedding_id = record.id

    count = db.query(FaceEmbedding).filter(
        FaceEmbedding.student_id == student_id,
        FaceEmbedding.is_active == True,
    ).count()

    success_count = sum(1 for r in results if r.success)
    return BulkRegisterResponse(
        success=True,
        student_id=student_id,
        message=f"Đã đăng ký {success_count}/{len(files)} ảnh thành công.",
        embedding_count=count,
        results=results,
    )


@app.post("/recognize-batch", response_model=BatchRecognizeResponse)
async def recognize_batch(
    files: List[UploadFile] = File(..., description="1-3 classroom photos"),
    student_ids: Optional[str] = Form(
        default=None,
        description="Comma-separated student IDs to limit search scope (optional)"
    ),
    db: Session = Depends(get_db),
):
    """
    Batch face recognition: Upload 1-3 photos of the classroom.
    Returns deduplicated list of recognized students with confidence scores.
    """
    if len(files) > 3:
        raise HTTPException(status_code=400, detail="Tối đa 3 ảnh")

    start_time = time.time()
    class_student_ids = None
    if student_ids:
        class_student_ids = [sid.strip() for sid in student_ids.split(",") if sid.strip()]

    all_detections: List[tuple] = []

    for idx, file in enumerate(files):
        contents = await file.read()
        img = _read_image(contents)
        detections = face_engine.detect_and_extract(img)
        for emb, bbox, score in detections:
            all_detections.append((emb, bbox, score, idx))

    if not all_detections:
        elapsed = int((time.time() - start_time) * 1000)
        return BatchRecognizeResponse(
            results=[],
            total_faces_detected=0,
            total_matched=0,
            total_needs_confirm=0,
            total_no_match=0,
            processing_time_ms=elapsed,
        )

    matched_students: dict[str, RecognizedFace] = {}
    unmatched_faces: List[RecognizedFace] = []

    for emb, bbox, det_score, img_idx in all_detections:
        match = _find_best_match(emb, db, class_student_ids)

        if match is None or match.status == "NO_MATCH":
            unmatched_faces.append(RecognizedFace(
                confidence=match.confidence if match else 0.0,
                status="NO_MATCH",
                bbox=bbox,
            ))
        else:
            match.bbox = bbox
            sid = match.student_id
            if sid not in matched_students or match.confidence > matched_students[sid].confidence:
                matched_students[sid] = match

    results = list(matched_students.values()) + unmatched_faces
    elapsed = int((time.time() - start_time) * 1000)

    total_matched = sum(1 for r in results if r.status == "MATCHED")
    total_confirm = sum(1 for r in results if r.status == "NEEDS_CONFIRM")
    total_no_match = sum(1 for r in results if r.status == "NO_MATCH")

    return BatchRecognizeResponse(
        results=results,
        total_faces_detected=len(all_detections),
        total_matched=total_matched,
        total_needs_confirm=total_confirm,
        total_no_match=total_no_match,
        processing_time_ms=elapsed,
    )


@app.get("/status/{student_id}", response_model=StudentRegistrationStatus)
def get_student_status(student_id: str, db: Session = Depends(get_db)):
    """Check if a student has registered face embeddings."""
    records = db.query(FaceEmbedding).filter(
        FaceEmbedding.student_id == student_id,
        FaceEmbedding.is_active == True,
    ).all()

    if not records:
        return StudentRegistrationStatus(
            student_id=student_id,
            is_registered=False,
            image_count=0,
        )

    latest = max(records, key=lambda r: r.created_at)
    return StudentRegistrationStatus(
        student_id=student_id,
        student_code=latest.student_code,
        student_name=latest.student_name,
        is_registered=True,
        image_count=len(records),
        last_updated=latest.created_at.isoformat() if latest.created_at else None,
    )


@app.get("/student-photos/{student_id}", response_model=StudentPhotosResponse)
def get_student_photos(student_id: str, db: Session = Depends(get_db)):
    """Get all registered face photos/embeddings for a student."""
    records = db.query(FaceEmbedding).filter(
        FaceEmbedding.student_id == student_id,
        FaceEmbedding.is_active == True,
    ).order_by(FaceEmbedding.created_at.desc()).all()

    photos = []
    for r in records:
        photos.append(StudentPhotoDto(
            id=r.id,
            image_url=r.image_path,
            quality_score=round(r.quality_score, 4) if r.quality_score else None,
            created_at=r.created_at.isoformat() if r.created_at else None,
        ))

    return StudentPhotosResponse(
        student_id=student_id,
        student_code=records[0].student_code if records else None,
        student_name=records[0].student_name if records else None,
        photos=photos,
        total_photos=len(photos),
    )


@app.delete("/embedding/{embedding_id}")
def delete_embedding(embedding_id: int, db: Session = Depends(get_db)):
    """Delete a specific face embedding by ID."""
    record = db.query(FaceEmbedding).filter(
        FaceEmbedding.id == embedding_id,
    ).first()

    if not record:
        raise HTTPException(status_code=404, detail="Embedding not found")

    image_url = record.image_path
    db.delete(record)
    db.commit()

    return {"success": True, "deleted_id": embedding_id, "image_url": image_url}


@app.delete("/student/{student_id}/all")
def delete_all_student_embeddings(student_id: str, db: Session = Depends(get_db)):
    """Delete all face embeddings for a student."""
    records = db.query(FaceEmbedding).filter(
        FaceEmbedding.student_id == student_id,
    ).all()

    image_urls = [r.image_path for r in records if r.image_path]
    count = len(records)

    for r in records:
        db.delete(r)
    db.commit()

    return {"success": True, "deleted_count": count, "image_urls": image_urls}


@app.post("/class-status", response_model=ClassRegistrationStatusResponse)
async def get_class_status(
    student_ids: str = Form(..., description="Comma-separated student IDs"),
    db: Session = Depends(get_db),
):
    """Check registration status for multiple students (for a class)."""
    ids = [sid.strip() for sid in student_ids.split(",") if sid.strip()]

    registered = db.query(
        FaceEmbedding.student_id,
        FaceEmbedding.student_code,
        FaceEmbedding.student_name,
        func.count(FaceEmbedding.id).label("count"),
        func.max(FaceEmbedding.created_at).label("last_updated"),
    ).filter(
        FaceEmbedding.student_id.in_(ids),
        FaceEmbedding.is_active == True,
    ).group_by(
        FaceEmbedding.student_id,
        FaceEmbedding.student_code,
        FaceEmbedding.student_name,
    ).all()

    registered_map = {r.student_id: r for r in registered}

    students = []
    for sid in ids:
        if sid in registered_map:
            r = registered_map[sid]
            students.append(StudentRegistrationStatus(
                student_id=sid,
                student_code=r.student_code,
                student_name=r.student_name,
                is_registered=True,
                image_count=r.count,
                last_updated=r.last_updated.isoformat() if r.last_updated else None,
            ))
        else:
            students.append(StudentRegistrationStatus(
                student_id=sid,
                is_registered=False,
                image_count=0,
            ))

    total_reg = sum(1 for s in students if s.is_registered)
    return ClassRegistrationStatusResponse(
        students=students,
        total_students=len(students),
        total_registered=total_reg,
        total_unregistered=len(students) - total_reg,
    )


@app.delete("/embeddings/{student_id}")
def delete_student_embeddings(student_id: str, db: Session = Depends(get_db)):
    """Delete all face embeddings for a student (alias endpoint)."""
    count = db.query(FaceEmbedding).filter(
        FaceEmbedding.student_id == student_id,
    ).delete()
    db.commit()

    return {
        "success": True,
        "student_id": student_id,
        "deleted_count": count,
        "message": f"Đã xoá {count} bản ghi khuôn mặt.",
    }
