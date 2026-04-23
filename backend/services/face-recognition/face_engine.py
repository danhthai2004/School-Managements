"""
InsightFace wrapper for face detection, alignment, and embedding extraction.

Uses the ArcFace model (buffalo_l) which outputs 512-D normalized embeddings.
Cosine similarity between same-person images: typically 0.4 ~ 0.8.
"""

import logging
import numpy as np
from typing import List, Tuple, Optional
from insightface.app import FaceAnalysis

logger = logging.getLogger(__name__)

# Graduated confidence thresholds
THRESHOLD_AUTO = 0.55       # Auto-match: high confidence
THRESHOLD_CONFIRM = 0.45    # Needs teacher confirmation: medium confidence
# Below 0.45 = NO_MATCH


class FaceEngine:
    """Singleton wrapper around InsightFace FaceAnalysis."""

    def __init__(self):
        self._app: Optional[FaceAnalysis] = None
        self._loaded = False

    def load_model(self):
        """Load InsightFace model. Call once at startup."""
        if self._loaded:
            return
        logger.info("Loading InsightFace model (buffalo_l)...")
        self._app = FaceAnalysis(
            name="buffalo_l",
            providers=["CPUExecutionProvider"]
        )
        self._app.prepare(ctx_id=0, det_size=(640, 640))
        self._loaded = True
        logger.info("InsightFace model loaded successfully.")

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    def detect_and_extract(
        self, image: np.ndarray
    ) -> List[Tuple[np.ndarray, List[int], float]]:
        """
        Detect all faces in an image and extract embeddings.

        Args:
            image: BGR numpy array (OpenCV format)

        Returns:
            List of (embedding_512d, bbox_xyxy, det_score) tuples
        """
        if not self._loaded:
            raise RuntimeError("Model not loaded. Call load_model() first.")

        faces = self._app.get(image)
        results = []
        for face in faces:
            embedding = face.embedding  # 512-D float32 ndarray
            norm = np.linalg.norm(embedding)
            if norm > 0:
                embedding = embedding / norm

            bbox = face.bbox.astype(int).tolist()  # [x1, y1, x2, y2]
            det_score = float(face.det_score)
            results.append((embedding, bbox, det_score))

        return results

    def extract_single(self, image: np.ndarray) -> Optional[Tuple[np.ndarray, float]]:
        """
        Extract embedding from an image expected to contain exactly one face.

        Returns:
            (embedding_512d, quality_score) or None if no face found
        """
        results = self.detect_and_extract(image)
        if not results:
            return None

        if len(results) > 1:
            results.sort(
                key=lambda r: (r[1][2] - r[1][0]) * (r[1][3] - r[1][1]),
                reverse=True
            )

        embedding, bbox, det_score = results[0]
        return embedding, det_score

    @staticmethod
    def cosine_similarity(emb1: np.ndarray, emb2: np.ndarray) -> float:
        """Compute cosine similarity between two embedding vectors."""
        return float(np.dot(emb1, emb2) / (
            np.linalg.norm(emb1) * np.linalg.norm(emb2) + 1e-8
        ))

    @staticmethod
    def classify_confidence(similarity: float) -> str:
        """
        Classify a cosine similarity score into action categories.

        Returns: "MATCHED", "NEEDS_CONFIRM", or "NO_MATCH"
        """
        if similarity >= THRESHOLD_AUTO:
            return "MATCHED"
        elif similarity >= THRESHOLD_CONFIRM:
            return "NEEDS_CONFIRM"
        else:
            return "NO_MATCH"


# Global singleton
face_engine = FaceEngine()
