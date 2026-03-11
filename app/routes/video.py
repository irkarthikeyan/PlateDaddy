import asyncio
import json
import logging
from typing import Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse

from app.services.video import video_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/video", tags=["video"])


@router.post("/start")
def start_video(camera_index: Optional[int] = None):
    """Start the camera and plate detection loop."""
    if video_service.is_running:
        logger.info("POST /video/start — already running")
        return {"status": "already_running"}
    logger.info("POST /video/start — attempting to open camera (index=%s)", camera_index)
    ok = video_service.start(camera_index)
    if not ok:
        logger.error("POST /video/start — failed to open camera")
        return {"status": "error", "detail": "Could not open camera. Check USB connection and macOS camera permissions (System Settings > Privacy > Camera)."}
    logger.info("POST /video/start — camera started successfully")
    return {"status": "started"}


@router.post("/stop")
def stop_video():
    """Stop the camera and detection loop."""
    video_service.stop()
    return {"status": "stopped"}


@router.get("/status")
def video_status():
    """Check if the camera is running."""
    return {"running": video_service.is_running}


@router.get("/detections")
def recent_detections():
    """Get the list of recently detected plates."""
    return video_service.get_recent_detections()


@router.get("/feed")
def video_feed():
    """MJPEG video stream from the camera."""

    def generate():
        while video_service.is_running:
            frame = video_service.get_frame_jpeg()
            if frame is not None:
                yield (
                    b"--frame\r\n"
                    b"Content-Type: image/jpeg\r\n\r\n" + frame + b"\r\n"
                )
            else:
                # No frame yet, wait a bit
                import time
                time.sleep(0.05)

    return StreamingResponse(
        generate(),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )


@router.websocket("/ws")
async def video_websocket(websocket: WebSocket):
    """WebSocket that pushes plate detection events in real-time."""
    await websocket.accept()

    queue = video_service.subscribe()
    try:
        while True:
            try:
                event = await asyncio.wait_for(queue.get(), timeout=1.0)
                await websocket.send_text(json.dumps(event.model_dump()))
            except asyncio.TimeoutError:
                # Send a heartbeat ping to keep connection alive
                try:
                    await websocket.send_text(json.dumps({"type": "heartbeat"}))
                except Exception:
                    break
    except WebSocketDisconnect:
        pass
    finally:
        video_service.unsubscribe(queue)
