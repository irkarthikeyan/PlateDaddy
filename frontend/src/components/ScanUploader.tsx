"use client";

import { useState, useRef } from "react";
import { Upload } from "lucide-react";
import { scanPlate, detectPlate } from "@/lib/api";
import type { ScanResponse, PlateDetectionResult } from "@/lib/types";
import StatusBadge from "./StatusBadge";

export default function ScanUploader() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResponse | null>(null);
  const [detectResult, setDetectResult] =
    useState<PlateDetectionResult | null>(null);

  const handleFile = (selectedFile: File) => {
    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
    setScanResult(null);
    setDetectResult(null);
    setError(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith("image/")) {
      handleFile(droppedFile);
    }
  };

  const handleDetect = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setScanResult(null);
    try {
      const result = await detectPlate(file);
      setDetectResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Detection failed");
    } finally {
      setLoading(false);
    }
  };

  const handleScan = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setDetectResult(null);
    try {
      const amountCents = amount ? Math.round(parseFloat(amount) * 100) : undefined;
      const result = await scanPlate(file, amountCents);
      setScanResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Drop zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-emerald-400 transition-colors"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          className="hidden"
        />
        {preview ? (
          <img
            src={preview}
            alt="Plate preview"
            className="max-h-48 mx-auto rounded-lg"
          />
        ) : (
          <div className="text-gray-400">
            <Upload className="mx-auto mb-3" size={40} />
            <p className="font-medium">Drop a plate image here</p>
            <p className="text-sm mt-1">or click to browse</p>
          </div>
        )}
      </div>

      {/* Amount input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Amount (USD) — leave blank for default
        </label>
        <input
          type="number"
          step="0.01"
          min="0.50"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="5.00"
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-gray-900"
        />
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleDetect}
          disabled={!file || loading}
          className="flex-1 bg-slate-600 text-white py-3 rounded-lg font-medium hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Processing..." : "Detect Only"}
        </button>
        <button
          onClick={handleScan}
          disabled={!file || loading}
          className="flex-1 bg-emerald-600 text-white py-3 rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Processing..." : "Scan & Charge"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Detection result */}
      {detectResult && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-semibold text-blue-800 mb-3">Detection Result</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-blue-600">Plate Number:</span>
              <span className="ml-2 font-mono font-bold text-blue-900">
                {detectResult.plate_number}
              </span>
            </div>
            <div>
              <span className="text-blue-600">Confidence:</span>
              <span className="ml-2 font-bold text-blue-900">
                {(detectResult.confidence * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Scan + payment result */}
      {scanResult && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <h3 className="font-semibold text-green-800 mb-3">Payment Result</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-green-600">Plate:</span>
              <span className="ml-2 font-mono font-bold text-green-900">
                {scanResult.plate_number}
              </span>
            </div>
            <div>
              <span className="text-green-600">Owner:</span>
              <span className="ml-2 text-green-900">{scanResult.owner_name}</span>
            </div>
            <div>
              <span className="text-green-600">Amount:</span>
              <span className="ml-2 font-bold text-green-900">
                ${(scanResult.amount / 100).toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-green-600">Status:</span>
              <span className="ml-2">
                <StatusBadge status={scanResult.transaction_status} />
              </span>
            </div>
            <div>
              <span className="text-green-600">Confidence:</span>
              <span className="ml-2 text-green-900">
                {(scanResult.confidence * 100).toFixed(1)}%
              </span>
            </div>
          </div>
          <p className="mt-3 text-green-700 text-sm">{scanResult.message}</p>
        </div>
      )}
    </div>
  );
}
