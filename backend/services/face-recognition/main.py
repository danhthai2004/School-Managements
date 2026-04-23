"""
Face Recognition FastAPI Microservice (pgVector edition)
──────────────────────────────────────────────────────────
Provides endpoints consumed by the Spring Boot backend:
  POST /register             — đăng ký khuôn mặt (1 ảnh)
  POST /register-bulk        — đăng ký hàng loạt (nhiều ảnh 1 học sinh)
  POST /recognize-batch      — nhận diện hàng loạt từ ảnh lớp học
  POST /class-status         — trạng thái đăng ký theo danh sách student_id
  GET  /student-photos/{id}  — lấy danh sách ảnh đã đăng ký
  DELETE /embedding/{id}     — xóa 1 embedding
  DELETE /student/{id}/all   — xóa tất cả embedding của 1 học sinh
  DELETE /embeddings/{id}    — alias của endpoint trên
  GET  /health               — health check
"""

import logging, time
from contextlib import asynccontextmanager

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import text

from database import init_db, get_db, FaceEmbedding, engine
from face_engine import extract_embedding, detect_and_embed_all
from models import (
    RegisterResponse, BulkRegisterResponse, BulkRegisterItem,
    BatchRecognizeResponse, RecognizedFace,
    ClassRegistrationStatusResponse, StudentRegistrationStatus,
    StudentPhotosResponse, StudentPhotoDto,
    HealthResponse,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger("face-service")

# ── Thresholds ────────────────────────────────────────────────────────────
MATCH_THRESHOLD   = 0.55   # cosine similarity >= 0.55 → MATCHED
CONFIRM_THRESHOLD = 0.40   # cosine similarity >= 0.40 → NEEDS_CONFIRM


# ── App lifecycle ─────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    from face_engine import get_face_app
    get_face_app()   # Pre-load model at startup
    logger.info("Face Recognition Service sẵn sàng.")
    yield


app = FastAPI(
    title="ISS Face Recognition Service",
    version="1.0.0",
    lifespan=lifespan,
)


# ═══════════════════════════════════════════════════════════════════════════
# 1. POST /register — đăng ký khuôn mặt (1 ảnh)
# ═══════════════════════════════════════════════════════════════════════════
@app.post("/register", response_model=RegisterResponse)
async def register_face(
    student_id: str   = Form(...),
    student_code: str = Form(""),
    student_name: str = Form(""),
    file: UploadFile  = File(...),
    image_url: str    = Form(""),
    db: Session       = Depends(get_db),
):
    image_data = await file.read()
    result = extract_embedding(image_data)

    if not result["success"]:
        return JSONResponse(
            status_code=400,
            content={"success": False, "student_id": student_id, "message": result["message"]},
        )

    record = FaceEmbedding(
        student_id=student_id,
        student_code=student_code or "",
        student_name=student_name or "",
        embedding=result["embedding"],
        image_url=image_url or None,
        quality_score=result.get("quality_score"),
    )
    db.add(record)
    db.flush()
    embedding_id = record.id

    count = db.query(FaceEmbedding).filter(
        FaceEmbedding.student_id == student_id,
        FaceEmbedding.is_active == True,
    ).count()
    db.commit()

    return RegisterResponse(
        success=True,
        student_id=student_id,
        message="Đăng ký khuôn mặt thành công",
        embedding_count=count,
        embedding_id=embedding_id,
        image_url=image_url or None,
    )


# ═══════════════════════════════════════════════════════════════════════════
# 1b. POST /register-bulk — đăng ký nhiều ảnh cùng 1 học sinh
# ═══════════════════════════════════════════════════════════════════════════
@app.post("/register-bulk", response_model=BulkRegisterResponse)
async def register_bulk(
    student_id: str          = Form(...),
    student_code: str        = Form(""),
    student_name: str        = Form(""),
    files: list[UploadFile]  = File(...),
    db: Session              = Depends(get_db),
):
    items: list[BulkRegisterItem] = []

    for file in files:
        image_data = await file.read()
        result = extract_embedding(image_data)

        if not result["success"]:
            items.append(BulkRegisterItem(
                success=False,
                message=result["message"],
            ))
            continue

        record = FaceEmbedding(
            student_id=student_id,
            student_code=student_code or "",
            student_name=student_name or "",
            embedding=result["embedding"],
            quality_score=result.get("quality_score"),
        )
        db.add(record)
        db.flush()
        items.append(BulkRegisterItem(
            success=True,
            message="OK",
            embedding_id=record.id,
        ))

    count = db.query(FaceEmbedding).filter(
        FaceEmbedding.student_id == student_id,
        FaceEmbedding.is_active == True,
    ).count()
    db.commit()

    success_count = sum(1 for i in items if i.success)
    return BulkRegisterResponse(
        success=success_count > 0,
        student_id=student_id,
        message=f"Đăng ký thành công {success_count}/{len(items)} ảnh",
        embedding_count=count,
        results=items,
    )


# ═══════════════════════════════════════════════════════════════════════════
# 2. POST /recognize-batch — nhận diện hàng loạt
# ═══════════════════════════════════════════════════════════════════════════
@app.post("/recognize-batch", response_model=BatchRecognizeResponse)
async def recognize_batch(
    files: list[UploadFile] = File(...),
    student_ids: str        = Form(""),
    db: Session             = Depends(get_db),
):
    t0 = time.time()

    # Build scope filter for candidate embeddings
    scope_filter = ""
    params: dict = {}
    if student_ids:
        id_list = [s.strip() for s in student_ids.split(",") if s.strip()]
        if id_list:
            placeholders = ", ".join(f":sid_{i}" for i in range(len(id_list)))
            scope_filter = f"AND student_id IN ({placeholders})"
            for i, sid in enumerate(id_list):
                params[f"sid_{i}"] = sid

    results: list[RecognizedFace] = []
    total_detected = 0
    matched = 0
    needs_confirm = 0
    no_match = 0
    seen_students: set[str] = set()

    for upload in files:
        image_data = await upload.read()
        faces = detect_and_embed_all(image_data)
        total_detected += len(faces)

        for face_info in faces:
            emb = face_info["embedding"]
            bbox = face_info["bbox"]

            # pgVector cosine distance: embedding <=> query → 1 - cosine_similarity
            sql = text(f"""
                SELECT id, student_id, student_code, student_name,
                       1 - (embedding <=> :query_emb) AS similarity
                FROM face_embeddings
                WHERE is_active = true {scope_filter}
                ORDER BY embedding <=> :query_emb
                LIMIT 1
            """)
            query_params = {"query_emb": str(emb), **params}
            row = db.execute(sql, query_params).fetchone()

            if row and row.similarity >= MATCH_THRESHOLD:
                sid = row.student_id
                if sid in seen_students:
                    continue
                seen_students.add(sid)
                matched += 1
                results.append(RecognizedFace(
                    student_id=row.student_id,
                    student_code=row.student_code,
                    student_name=row.student_name,
                    confidence=round(float(row.similarity), 4),
                    status="MATCHED",
                    bbox=bbox,
                ))
            elif row and row.similarity >= CONFIRM_THRESHOLD:
                sid = row.student_id
                if sid in seen_students:
                    continue
                seen_students.add(sid)
                needs_confirm += 1
                results.append(RecognizedFace(
                    student_id=row.student_id,
                    student_code=row.student_code,
                    student_name=row.student_name,
                    confidence=round(float(row.similarity), 4),
                    status="NEEDS_CONFIRM",
                    bbox=bbox,
                ))
            else:
                no_match += 1
                results.append(RecognizedFace(
                    student_id=None,
                    student_code=None,
                    student_name=None,
                    confidence=round(float(row.similarity), 4) if row else 0.0,
                    status="NO_MATCH",
                    bbox=bbox,
                ))

    elapsed = int((time.time() - t0) * 1000)

    return BatchRecognizeResponse(
        results=results,
        total_faces_detected=total_detected,
        total_matched=matched,
        total_needs_confirm=needs_confirm,
        total_no_match=no_match,
        processing_time_ms=elapsed,
    )


# ═══════════════════════════════════════════════════════════════════════════
# 3. POST /class-status — trạng thái đăng ký khuôn mặt theo lớp
# ═══════════════════════════════════════════════════════════════════════════
@app.post("/class-status")
async def class_status(
    student_ids: str = Form(...),
    db: Session      = Depends(get_db),
):
    id_list = [s.strip() for s in student_ids.split(",") if s.strip()]
    if not id_list:
        return {"students": [], "total_registered": 0}

    records = db.query(FaceEmbedding).filter(
        FaceEmbedding.student_id.in_(id_list),
        FaceEmbedding.is_active == True,
    ).all()

    # Aggregate by student
    student_map: dict = {}
    for r in records:
        sid = r.student_id
        if sid not in student_map:
            student_map[sid] = {
                "student_id": sid,
                "student_code": r.student_code,
                "student_name": r.student_name,
                "is_registered": True,
                "image_count": 0,
                "last_updated": None,
            }
        student_map[sid]["image_count"] += 1
        ts = r.updated_at or r.created_at
        if ts:
            ts_str = ts.isoformat()
            cur = student_map[sid]["last_updated"]
            if cur is None or ts_str > cur:
                student_map[sid]["last_updated"] = ts_str

    students = []
    for sid in id_list:
        if sid in student_map:
            students.append(student_map[sid])
        else:
            students.append({
                "student_id": sid,
                "student_code": None,
                "student_name": None,
                "is_registered": False,
                "image_count": 0,
                "last_updated": None,
            })

    total_registered = sum(1 for s in students if s["is_registered"])
    return {"students": students, "total_registered": total_registered}


# ═══════════════════════════════════════════════════════════════════════════
# 4. GET /student-photos/{student_id} — lấy ảnh của học sinh
# ═══════════════════════════════════════════════════════════════════════════
@app.get("/student-photos/{student_id}")
async def get_student_photos(student_id: str, db: Session = Depends(get_db)):
    records = db.query(FaceEmbedding).filter(
        FaceEmbedding.student_id == student_id,
        FaceEmbedding.is_active == True,
    ).order_by(FaceEmbedding.created_at.desc()).all()

    photos = []
    for r in records:
        photos.append({
            "id": r.id,
            "image_url": r.image_url,
            "quality_score": r.quality_score,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        })

    return {"photos": photos}


# ═══════════════════════════════════════════════════════════════════════════
# 5. DELETE /embedding/{embedding_id} — xóa một embedding
# ═══════════════════════════════════════════════════════════════════════════
@app.delete("/embedding/{embedding_id}")
async def delete_embedding(embedding_id: int, db: Session = Depends(get_db)):
    record = db.query(FaceEmbedding).filter(FaceEmbedding.id == embedding_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Không tìm thấy embedding")
    image_url = record.image_url
    db.delete(record)
    db.commit()
    return {"success": True, "image_url": image_url}


# ═══════════════════════════════════════════════════════════════════════════
# 6. DELETE /student/{student_id}/all — xóa tất cả embedding của học sinh
# ═══════════════════════════════════════════════════════════════════════════
@app.delete("/student/{student_id}/all")
async def delete_all_student_embeddings(student_id: str, db: Session = Depends(get_db)):
    records = db.query(FaceEmbedding).filter(
        FaceEmbedding.student_id == student_id
    ).all()
    image_urls = [r.image_url for r in records if r.image_url]
    for r in records:
        db.delete(r)
    db.commit()
    return {"success": True, "deleted_count": len(records), "image_urls": image_urls}


# ═══════════════════════════════════════════════════════════════════════════
# 7. DELETE /embeddings/{student_id} — alias (dùng bởi FaceAttendanceService)
# ═══════════════════════════════════════════════════════════════════════════
@app.delete("/embeddings/{student_id}")
async def delete_embeddings_alias(student_id: str, db: Session = Depends(get_db)):
    return await delete_all_student_embeddings(student_id, db)


# ═══════════════════════════════════════════════════════════════════════════
# Health check — kiểm tra model + database
# ═══════════════════════════════════════════════════════════════════════════
@app.get("/health", response_model=HealthResponse)
async def health():
    # Check model
    model_loaded = False
    try:
        from face_engine import _face_app
        model_loaded = _face_app is not None
    except Exception:
        pass

    # Check database
    db_connected = False
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            db_connected = True
    except Exception:
        pass

    status = "ok" if (model_loaded and db_connected) else "degraded"
    return HealthResponse(
        status=status,
        model_loaded=model_loaded,
        database_connected=db_connected,
    )
