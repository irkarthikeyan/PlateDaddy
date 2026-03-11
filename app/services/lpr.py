import re
from typing import Optional

import cv2
import numpy as np
from paddleocr import PaddleOCR

from app.schemas import PlateDetectionResult

# Initialize PaddleOCR engine (lazy-loaded on first use)
_ocr: Optional[PaddleOCR] = None


def _get_ocr() -> PaddleOCR:
    global _ocr
    if _ocr is None:
        _ocr = PaddleOCR(
            use_angle_cls=True,
            lang="en",
            use_gpu=False,
            show_log=False,
        )
    return _ocr


def _normalize_plate(text: str) -> str:
    """Remove non-alphanumeric characters and uppercase."""
    return re.sub(r"[^A-Z0-9]", "", text.upper())


def detect_plate_from_frame(image: np.ndarray) -> Optional[PlateDetectionResult]:
    """Detect and read a license plate from a numpy image array (BGR)."""
    if image is None:
        return None

    ocr = _get_ocr()
    results = ocr.ocr(image, cls=True)

    if not results or not results[0]:
        return None

    best_candidate = None
    best_confidence = 0.0

    for line in results[0]:
        bbox = line[0]
        text = line[1][0]
        confidence = line[1][1]

        normalized = _normalize_plate(text)

        if (
            4 <= len(normalized) <= 10
            and re.search(r"[A-Z]", normalized)
            and re.search(r"[0-9]", normalized)
            and confidence > best_confidence
        ):
            best_candidate = PlateDetectionResult(
                plate_number=normalized,
                confidence=round(confidence, 4),
                bbox=[[int(coord) for coord in point] for point in bbox],
            )
            best_confidence = confidence

    return best_candidate


def detect_plate(image_bytes: bytes) -> Optional[PlateDetectionResult]:
    """
    Detect and read a license plate from image bytes using PaddleOCR.

    Returns PlateDetectionResult with the plate number, confidence, and bounding box,
    or None if no valid plate is found.
    """
    # Decode image
    nparr = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if image is None:
        return None

    ocr = _get_ocr()
    results = ocr.ocr(image, cls=True)

    if not results or not results[0]:
        return None

    # Filter and find the best plate candidate
    best_candidate = None
    best_confidence = 0.0

    for line in results[0]:
        bbox = line[0]  # [[x1,y1], [x2,y2], [x3,y3], [x4,y4]]
        text = line[1][0]
        confidence = line[1][1]

        normalized = _normalize_plate(text)

        # Basic plate validation: 4-10 alphanumeric chars, at least one letter and one digit
        if (
            4 <= len(normalized) <= 10
            and re.search(r"[A-Z]", normalized)
            and re.search(r"[0-9]", normalized)
            and confidence > best_confidence
        ):
            best_candidate = PlateDetectionResult(
                plate_number=normalized,
                confidence=round(confidence, 4),
                bbox=[[int(coord) for coord in point] for point in bbox],
            )
            best_confidence = confidence

    return best_candidate
