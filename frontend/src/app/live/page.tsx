"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Play, Square, CircleDot, CreditCard } from "lucide-react";
import Link from "next/link";
import { detectPlateBlob } from "@/lib/api";
import type { PlateDetectionResult } from "@/lib/types";

interface Detection {
  plate_number: string;
  confidence: number;
  is_registered: boolean;
  timestamp: string;
}

export default function LiveScanPage() {
  const [running, setRunning] = useState(false);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [scanning, setScanning] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recentPlatesRef = useRef<Map<string, number>>(new Map());

  const DETECT_INTERVAL_MS = 1500; // Send a frame every 1.5s
  const DEDUP_SECONDS = 15; // Don't re-detect same plate within 15s

  const stopCamera = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setRunning(false);
    setScanning(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (streamRef.current)
        streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const captureAndDetect = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;

    // Draw current video frame to canvas
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    // Convert to blob
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.8)
    );
    if (!blob) return;

    try {
      setScanning(true);
      const result: PlateDetectionResult = await detectPlateBlob(blob);

      // Dedup check
      const now = Date.now();
      const lastSeen = recentPlatesRef.current.get(result.plate_number) || 0;
      if (now - lastSeen < DEDUP_SECONDS * 1000) return;

      recentPlatesRef.current.set(result.plate_number, now);

      // Clean old entries
      const cutoff = now - DEDUP_SECONDS * 3 * 1000;
      for (const [plate, ts] of recentPlatesRef.current.entries()) {
        if (ts < cutoff) recentPlatesRef.current.delete(plate);
      }

      const detection: Detection = {
        plate_number: result.plate_number,
        confidence: result.confidence,
        is_registered: result.is_registered ?? false,
        timestamp: new Date().toISOString(),
      };

      setDetections((prev) => [detection, ...prev].slice(0, 30));
    } catch {
      // No plate detected in this frame — that's normal, skip silently
    } finally {
      setScanning(false);
    }
  }, []);

  const handleStart = async () => {
    setError(null);
    setStarting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setRunning(true);

      // Start periodic detection
      intervalRef.current = setInterval(captureAndDetect, DETECT_INTERVAL_MS);
    } catch (err) {
      const msg =
        err instanceof DOMException
          ? err.name === "NotAllowedError"
            ? "Camera permission denied. Please allow camera access in your browser settings."
            : err.name === "NotFoundError"
              ? "No camera found on this device."
              : `Camera error: ${err.message}`
          : "Could not access camera.";
      setError(msg);
    } finally {
      setStarting(false);
    }
  };

  const handleStop = () => {
    stopCamera();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Live Scan</h1>
          <p className="text-gray-500 text-sm mt-1">
            Browser camera feed with automatic plate detection
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <CircleDot
              size={14}
              className={
                running ? "text-green-500 animate-pulse" : "text-gray-400"
              }
            />
            <span className={running ? "text-green-600" : "text-gray-400"}>
              {running ? (scanning ? "Scanning..." : "Live") : "Stopped"}
            </span>
          </div>

          {!running ? (
            <button
              onClick={handleStart}
              disabled={starting}
              className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              <Play size={16} />
              {starting ? "Starting..." : "Start Camera"}
            </button>
          ) : (
            <button
              onClick={handleStop}
              className="flex items-center gap-2 bg-red-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-red-700 transition-colors"
            >
              <Square size={16} />
              Stop
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-6">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Video feed */}
        <div className="lg:col-span-2">
          <div className="bg-black rounded-xl overflow-hidden aspect-video flex items-center justify-center relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-contain ${running ? "" : "hidden"}`}
            />
            {/* Hidden canvas for frame capture */}
            <canvas ref={canvasRef} className="hidden" />

            {!running && (
              <div className="text-gray-500 text-center">
                <p className="text-lg font-medium">Camera is off</p>
                <p className="text-sm mt-1">
                  Click &quot;Start Camera&quot; to begin scanning
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Detected plates panel */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 max-h-[500px] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Detected Plates</h2>
            {running && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                Scanning
              </span>
            )}
          </div>

          {detections.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              {running
                ? "Waiting for plates..."
                : "Start the camera to detect plates"}
            </div>
          ) : (
            <ul className="space-y-3">
              {detections.map((d, i) => (
                <li
                  key={`${d.plate_number}-${d.timestamp}-${i}`}
                  className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-bold text-lg text-gray-900">
                      {d.plate_number}
                    </span>
                    {d.is_registered ? (
                      <Link
                        href={`/scan?plate=${d.plate_number}`}
                        className="flex items-center gap-1 text-xs bg-blue-600 text-white px-3 py-1 rounded-full hover:bg-blue-700 transition-colors"
                      >
                        <CreditCard size={12} />
                        Charge
                      </Link>
                    ) : (
                      <Link
                        href={`/register?plate=${d.plate_number}`}
                        className="text-xs bg-emerald-600 text-white px-3 py-1 rounded-full hover:bg-emerald-700 transition-colors"
                      >
                        Register
                      </Link>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>
                      {(d.confidence * 100).toFixed(1)}% confidence
                    </span>
                    <span>
                      {new Date(d.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  {d.is_registered && (
                    <span className="text-xs text-green-600 mt-1 block">
                      Registered vehicle
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
