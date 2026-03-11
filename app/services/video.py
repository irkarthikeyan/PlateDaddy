import asyncio
import logging
import threading
import time
from datetime import datetime, timezone
from typing import Dict, List, Optional

import cv2
import numpy as np

from app.config import settings
from app.schemas import PlateDetectedEvent
from app.services.lpr import detect_plate_from_frame

logger = logging.getLogger(__name__)


class VideoService:
    """Manages USB camera capture and continuous plate detection."""

    def __init__(self) -> None:
        self._cap: Optional[cv2.VideoCapture] = None
        self._running = False
        self._lock = threading.Lock()
        self._latest_frame: Optional[np.ndarray] = None
        self._detection_thread: Optional[threading.Thread] = None

        # Deduplication: {plate_number: last_seen_timestamp}
        self._recent_plates: Dict[str, float] = {}

        # Async queue for pushing detected plates to WebSocket consumers
        self._event_queues: List[asyncio.Queue] = []

        # Store recent detections for the frontend to query
        self._recent_detections: List[PlateDetectedEvent] = []

    @property
    def is_running(self) -> bool:
        return self._running

    def start(self, camera_index: Optional[int] = None) -> bool:
        """Start the camera and detection loop."""
        if self._running:
            logger.info("Camera already running")
            return True

        idx = camera_index if camera_index is not None else settings.VIDEO_CAMERA_INDEX
        logger.info("Opening camera index %d ...", idx)

        # Try AVFoundation backend first on macOS, fall back to default
        self._cap = cv2.VideoCapture(idx, cv2.CAP_AVFOUNDATION)
        if not self._cap.isOpened():
            logger.warning("AVFoundation failed, trying default backend...")
            self._cap = cv2.VideoCapture(idx)

        if not self._cap.isOpened():
            logger.error("Could not open camera index %d", idx)
            self._cap = None
            return False

        # Read a test frame to confirm camera is working
        ret, test_frame = self._cap.read()
        if not ret or test_frame is None:
            logger.error("Camera opened but could not read a frame")
            self._cap.release()
            self._cap = None
            return False

        logger.info(
            "Camera opened successfully. Frame size: %dx%d",
            test_frame.shape[1],
            test_frame.shape[0],
        )

        # Store the test frame so MJPEG feed has something immediately
        with self._lock:
            self._latest_frame = test_frame.copy()

        self._running = True
        self._detection_thread = threading.Thread(
            target=self._detection_loop, daemon=True
        )
        self._detection_thread.start()
        logger.info("Detection loop started")
        return True

    def stop(self) -> None:
        """Stop the camera and detection loop."""
        self._running = False
        if self._detection_thread:
            self._detection_thread.join(timeout=3)
            self._detection_thread = None
        if self._cap:
            self._cap.release()
            self._cap = None
        self._latest_frame = None

    def get_frame_jpeg(self) -> Optional[bytes]:
        """Get the latest frame as JPEG bytes."""
        with self._lock:
            if self._latest_frame is None:
                return None
            ret, jpeg = cv2.imencode(".jpg", self._latest_frame)
            if not ret:
                return None
            return jpeg.tobytes()

    def subscribe(self) -> asyncio.Queue:
        """Create a new queue for receiving plate detection events."""
        q: asyncio.Queue = asyncio.Queue(maxsize=50)
        self._event_queues.append(q)
        return q

    def unsubscribe(self, q: asyncio.Queue) -> None:
        """Remove a subscriber queue."""
        if q in self._event_queues:
            self._event_queues.remove(q)

    def get_recent_detections(self) -> List[PlateDetectedEvent]:
        """Get the list of recently detected plates."""
        return list(self._recent_detections)

    def _detection_loop(self) -> None:
        """Background thread: capture frames and run OCR periodically."""
        last_detection_time = 0.0

        while self._running and self._cap and self._cap.isOpened():
            ret, frame = self._cap.read()
            if not ret:
                time.sleep(0.01)
                continue

            # Update the latest frame (for MJPEG streaming)
            with self._lock:
                self._latest_frame = frame.copy()

            # Run OCR at the configured interval
            now = time.time()
            if now - last_detection_time >= settings.VIDEO_DETECTION_INTERVAL:
                last_detection_time = now
                self._run_detection(frame)

            # Small sleep to prevent burning CPU
            time.sleep(0.03)  # ~30fps capture rate

    def _run_detection(self, frame: np.ndarray) -> None:
        """Run plate detection on a frame and emit events if new plate found."""
        result = detect_plate_from_frame(frame)
        if result is None:
            return

        now = time.time()
        plate = result.plate_number

        # Dedup check
        last_seen = self._recent_plates.get(plate, 0.0)
        if now - last_seen < settings.VIDEO_DEDUP_SECONDS:
            return

        self._recent_plates[plate] = now

        # Clean old entries from dedup dict
        cutoff = now - settings.VIDEO_DEDUP_SECONDS * 3
        self._recent_plates = {
            p: t for p, t in self._recent_plates.items() if t > cutoff
        }

        # Check if plate is registered (import here to avoid circular imports)
        from app.database import SessionLocal
        from app.models import Vehicle

        db = SessionLocal()
        try:
            vehicle = (
                db.query(Vehicle)
                .filter(Vehicle.plate_number == plate, Vehicle.is_active)
                .first()
            )
            is_registered = vehicle is not None
        finally:
            db.close()

        event = PlateDetectedEvent(
            plate_number=plate,
            confidence=result.confidence,
            timestamp=datetime.now(timezone.utc).isoformat(),
            is_registered=is_registered,
        )

        # Store in recent detections (keep last 20)
        self._recent_detections.insert(0, event)
        self._recent_detections = self._recent_detections[:20]

        # Push to all subscriber queues
        for q in self._event_queues:
            try:
                q.put_nowait(event)
            except asyncio.QueueFull:
                pass  # skip if consumer is slow


# Singleton instance
video_service = VideoService()
