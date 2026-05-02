"""
Face Recognition Engine — wraps InsightFace for detection + embedding.
"""
import numpy as np
import insightface
from insightface.app import FaceAnalysis
import cv2, logging, time
from PIL import Image
from io import BytesIO
from typing import Optional

logger = logging.getLogger(__name__)

# ─── Singleton model loader ──────────────────────────────────────────────
_face_app: Optional[FaceAnalysis] = None


def get_face_app() -> FaceAnalysis:
    """Lazy-load InsightFace model (buffalo_sc). Optimized for low RAM (512MB)."""
    global _face_app
    if _face_app is None:
        logger.info("Loading InsightFace model (buffalo_sc - LIGHT version)...")
        t0 = time.time()
        # 'buffalo_sc' uses MobileFaceNet, much smaller than ResNet50-based buffalo_l
        _face_app = FaceAnalysis(
            name="buffalo_sc",
            providers=["CPUExecutionProvider"],
        )
        # Reduced det_size (320x320) further reduces RAM usage during analysis
        _face_app.prepare(ctx_id=0, det_size=(320, 320))
        logger.info("InsightFace light model loaded in %.1fs", time.time() - t0)
    return _face_app


# ─── Utilities ───────────────────────────────────────────────────────────

def image_bytes_to_cv2(data: bytes) -> np.ndarray:
    """Convert raw image bytes → OpenCV BGR numpy array."""
    img = Image.open(BytesIO(data)).convert("RGB")
    return cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)


def compute_quality_score(face) -> float:
    """
    Estimate face quality (0-1) from detection score and face size.
    """
    det_score = float(face.det_score) if hasattr(face, "det_score") else 0.5
    bbox = face.bbox.astype(int)
    w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
    size_score = min(1.0, (w * h) / (150 * 150))
    return round(det_score * 0.6 + size_score * 0.4, 3)


def extract_embedding(image_data: bytes) -> dict:
    """
    Detect the largest face and return its 512-d embedding.
    Provides detailed error statuses for different failure modes.
    """
    try:
        img = image_bytes_to_cv2(image_data)
        if img is None or img.size == 0:
             return {"success": False, "message": "File ảnh bị hỏng hoặc không đúng định dạng", "error_code": "INVALID_IMAGE"}
             
        faces = get_face_app().get(img)

        if not faces:
            return {"success": False, "message": "Không phát hiện khuôn mặt trong ảnh. Vui lòng chụp rõ mặt và đủ ánh sáng.", "error_code": "NO_FACE_DETECTED"}

        if len(faces) > 1:
            return {"success": False, "message": f"Phát hiện {len(faces)} khuôn mặt trong ảnh. Vui lòng chỉ tải ảnh có đúng 1 khuôn mặt của học sinh.", "error_code": "MULTIPLE_FACES_DETECTED"}

        # Pick largest face (though there should only be 1 now)
        face = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
        quality = compute_quality_score(face)
        
        # Quality threshold: Avoid registering blurry or tiny faces
        if quality < 0.25:
             return {"success": False, "message": "Chất lượng ảnh quá thấp hoặc mặt quá mờ. Vui lòng thử lại.", "error_code": "LOW_QUALITY", "quality_score": quality}

        bbox = face.bbox.astype(int).tolist()

        return {
            "success": True,
            "embedding": face.embedding.tolist(),
            "quality_score": quality,
            "bbox": bbox,
            "message": "OK",
        }
    except Exception as e:
        logger.error(f"Lỗi xử lý ảnh: {str(e)}")
        return {"success": False, "message": f"Lỗi hệ thống khi xử lý ảnh: {str(e)}", "error_code": "SYSTEM_ERROR"}


def detect_and_embed_all(image_data: bytes) -> list[dict]:
    """
    Detect ALL faces in an image and return embeddings for each.
    Used for batch recognition from classroom photos.
    """
    img = image_bytes_to_cv2(image_data)
    faces = get_face_app().get(img)
    results = []
    for face in faces:
        bbox = face.bbox.astype(int).tolist()
        results.append({
            "embedding": face.embedding.tolist(),
            "bbox": bbox,
            "det_score": float(face.det_score) if hasattr(face, "det_score") else 0.0,
        })
    return results
