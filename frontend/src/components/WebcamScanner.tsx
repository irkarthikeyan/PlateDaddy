"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Camera, CameraOff, ScanLine, Check } from "lucide-react";
import { detectPlate } from "@/lib/api";
import type { PlateDetectionResult } from "@/lib/types";

interface WebcamScannerProps {
  onPlateDetected: (plateNumber: string) => void;
  onClose: () => void;
}

export default function WebcamScanner({
  onPlateDetected,
  onClose,
}: WebcamScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PlateDetectionResult | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const startCamera = useCallback(async () => {
    setError(null);
    setPermissionDenied(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment", // prefer rear camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch (err) {
      const errorMsg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      console.error("Camera error:", errorMsg);
      if (
        err instanceof DOMException &&
        (err.name === "NotAllowedError" || err.name === "PermissionDeniedError")
      ) {
        setPermissionDenied(true);
      } else if (
        err instanceof DOMException &&
        err.name === "NotFoundError"
      ) {
        setError("No camera found on this device.");
      } else if (
        err instanceof DOMException &&
        (err.name === "OverconstrainedError" || err.name === "NotReadableError")
      ) {
        // Retry without constraints — "environment" may not exist on desktop
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({
            video: true,
          });
          streamRef.current = fallbackStream;
          if (videoRef.current) {
            videoRef.current.srcObject = fallbackStream;
          }
          setCameraActive(true);
          return;
        } catch {
          setError(`Camera error: ${errorMsg}`);
        }
      } else {
        setError(`Camera error: ${errorMsg}`);
      }
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  // Start camera on mount
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  const captureAndDetect = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setLoading(true);
    setError(null);
    setResult(null);

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Draw the current video frame to canvas
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    // Convert canvas to blob
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.9)
    );

    if (!blob) {
      setError("Failed to capture frame");
      setLoading(false);
      return;
    }

    // Send to detection API
    const file = new File([blob], "webcam-capture.jpg", {
      type: "image/jpeg",
    });

    try {
      const detection = await detectPlate(file);
      setResult(detection);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not detect a plate"
      );
    } finally {
      setLoading(false);
    }
  };

  if (permissionDenied) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
        <CameraOff className="mx-auto mb-3 text-yellow-500" size={40} />
        <h3 className="font-semibold text-yellow-800">Camera Access Denied</h3>
        <p className="text-yellow-600 text-sm mt-2">
          Please allow camera access in your browser settings and try again.
        </p>
        <button
          onClick={onClose}
          className="mt-4 text-sm text-gray-600 hover:text-gray-800 font-medium"
        >
          Go back to manual entry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Video feed */}
      <div className="relative rounded-xl overflow-hidden bg-black">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full rounded-xl"
        />
        {/* Plate alignment guide */}
        {cameraActive && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="border-2 border-emerald-400 border-dashed rounded-lg w-3/4 h-16 opacity-70" />
          </div>
        )}
      </div>

      {/* Hidden canvas for capturing frames */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Controls */}
      <div className="flex gap-3">
        <button
          onClick={captureAndDetect}
          disabled={!cameraActive || loading}
          className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white py-3 rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ScanLine size={18} />
          {loading ? "Detecting..." : "Capture & Detect"}
        </button>
        <button
          onClick={() => {
            stopCamera();
            onClose();
          }}
          className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
        >
          <CameraOff size={18} />
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Detection result */}
      {result && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-emerald-800">Plate Detected!</h3>
            <span className="text-sm text-emerald-600">
              {(result.confidence * 100).toFixed(1)}% confidence
            </span>
          </div>
          <p className="text-3xl font-mono font-bold text-emerald-900 mb-4">
            {result.plate_number}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => {
                stopCamera();
                onPlateDetected(result.plate_number);
              }}
              className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white py-2.5 rounded-lg font-medium hover:bg-emerald-700 transition-colors"
            >
              <Check size={18} />
              Use this plate
            </button>
            <button
              onClick={() => setResult(null)}
              className="px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
