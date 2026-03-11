"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Play, Square, CircleDot, CreditCard } from "lucide-react";
import Link from "next/link";
import type { PlateDetectedEvent } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const WS_URL = API_URL.replace("http", "ws");

export default function LiveScanPage() {
  const [running, setRunning] = useState(false);
  const [detections, setDetections] = useState<PlateDetectedEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [feedLoaded, setFeedLoaded] = useState(false);
  const [starting, setStarting] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // Check camera status on load
  useEffect(() => {
    fetch(`${API_URL}/video/status`)
      .then((r) => r.json())
      .then((data) => setRunning(data.running))
      .catch(() => {});
  }, []);

  // Connect WebSocket when camera is running
  const connectWs = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    const ws = new WebSocket(`${WS_URL}/video/ws`);
    wsRef.current = ws;

    ws.onopen = () => setWsConnected(true);
    ws.onclose = () => {
      setWsConnected(false);
      // Auto-reconnect after 2s if still running
      setTimeout(() => {
        if (running) connectWs();
      }, 2000);
    };
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "heartbeat") return;

      const detection = data as PlateDetectedEvent;
      setDetections((prev) => [detection, ...prev].slice(0, 30));
    };
  }, [running]);

  useEffect(() => {
    if (running) {
      connectWs();
    }
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [running, connectWs]);

  const handleStart = async () => {
    setError(null);
    setStarting(true);
    setFeedLoaded(false);
    console.log("[LiveScan] Starting camera...");
    try {
      const res = await fetch(`${API_URL}/video/start`, { method: "POST" });
      console.log("[LiveScan] /video/start response status:", res.status);
      const data = await res.json();
      console.log("[LiveScan] /video/start response data:", data);
      if (data.status === "started" || data.status === "already_running") {
        setRunning(true);
      } else {
        setError(data.detail || `Failed to start camera (status: ${data.status})`);
      }
    } catch (err) {
      console.error("[LiveScan] Failed to connect to backend:", err);
      setError("Could not connect to backend. Is the server running on port 8000?");
    } finally {
      setStarting(false);
    }
  };

  const handleStop = async () => {
    try {
      await fetch(`${API_URL}/video/stop`, { method: "POST" });
      setRunning(false);
      if (wsRef.current) wsRef.current.close();
    } catch {
      setError("Could not stop camera");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Live Scan</h1>
          <p className="text-gray-500 text-sm mt-1">
            Continuous camera feed with automatic plate detection
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Status indicator */}
          <div className="flex items-center gap-2 text-sm">
            <CircleDot
              size={14}
              className={running ? "text-green-500 animate-pulse" : "text-gray-400"}
            />
            <span className={running ? "text-green-600" : "text-gray-400"}>
              {running ? "Live" : "Stopped"}
            </span>
          </div>

          {/* Start/Stop button */}
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
        {/* Video feed — takes 2/3 of the space */}
        <div className="lg:col-span-2">
          <div className="bg-black rounded-xl overflow-hidden aspect-video flex items-center justify-center relative">
            {running ? (
              <>
                {!feedLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                    Loading feed...
                  </div>
                )}
                <img
                  src={`${API_URL}/video/feed?t=${Date.now()}`}
                  alt="Live camera feed"
                  className="w-full h-full object-contain"
                  onLoad={() => setFeedLoaded(true)}
                  onError={() => {
                    console.error("[LiveScan] MJPEG feed failed to load");
                    setError("Video feed failed to load. Check backend logs.");
                    setFeedLoaded(false);
                  }}
                />
              </>
            ) : (
              <div className="text-gray-500 text-center">
                <p className="text-lg font-medium">Camera is off</p>
                <p className="text-sm mt-1">
                  Click &quot;Start Camera&quot; to begin scanning
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Detected plates panel — 1/3 of the space */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 max-h-[500px] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Detected Plates</h2>
            {wsConnected && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                Connected
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
