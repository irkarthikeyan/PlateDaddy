"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Elements } from "@stripe/react-stripe-js";
import { Camera, Upload } from "lucide-react";
import { getStripe } from "@/lib/stripe";
import { getStripeKey, detectPlate } from "@/lib/api";
import PaymentForm from "@/components/PaymentForm";
import WebcamScanner from "@/components/WebcamScanner";
import type { Stripe } from "@stripe/stripe-js";

function RegisterContent() {
  const searchParams = useSearchParams();
  const plateFromUrl = searchParams.get("plate") || "";

  const [stripePromise, setStripePromise] =
    useState<Promise<Stripe | null> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [detectedPlate, setDetectedPlate] = useState(plateFromUrl);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getStripeKey()
      .then(({ publishable_key }) => {
        if (!publishable_key || publishable_key.includes("your_stripe")) {
          setError(
            "Stripe public key not configured. Add STRIPE_PUBLIC_KEY to your backend .env file."
          );
          return;
        }
        setStripePromise(getStripe(publishable_key));
      })
      .catch(() => {
        setError("Failed to load Stripe configuration from backend.");
      });
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadLoading(true);
    setUploadError(null);

    try {
      const result = await detectPlate(file);
      setDetectedPlate(result.plate_number);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Could not detect plate"
      );
    } finally {
      setUploadLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (error) {
    return (
      <div className="max-w-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        {error}
      </div>
    );
  }

  if (!stripePromise) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400">
        Loading Stripe...
      </div>
    );
  }

  return (
    <div className="max-w-lg space-y-4">
      {/* Scan options */}
      {!showCamera && !detectedPlate && (
        <div className="flex gap-3">
          <button
            onClick={() => setShowCamera(true)}
            className="flex-1 flex items-center justify-center gap-2 bg-slate-100 text-slate-700 py-3 rounded-xl font-medium hover:bg-slate-200 transition-colors border border-slate-200"
          >
            <Camera size={20} />
            Scan with camera
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadLoading}
            className="flex-1 flex items-center justify-center gap-2 bg-slate-100 text-slate-700 py-3 rounded-xl font-medium hover:bg-slate-200 transition-colors border border-slate-200 disabled:opacity-50"
          >
            <Upload size={20} />
            {uploadLoading ? "Detecting..." : "Upload plate photo"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      )}

      {/* Upload error */}
      {uploadError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {uploadError}
        </div>
      )}

      {/* Webcam scanner */}
      {showCamera && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <WebcamScanner
            onPlateDetected={(plate) => {
              setDetectedPlate(plate);
              setShowCamera(false);
            }}
            onClose={() => setShowCamera(false)}
          />
        </div>
      )}

      {/* Detected plate banner */}
      {detectedPlate && !showCamera && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center justify-between">
          <div>
            <span className="text-sm text-emerald-600">Scanned plate: </span>
            <span className="font-mono font-bold text-emerald-900">
              {detectedPlate}
            </span>
          </div>
          <button
            onClick={() => {
              setDetectedPlate("");
              setUploadError(null);
            }}
            className="text-sm text-emerald-600 hover:text-emerald-800 font-medium"
          >
            Rescan
          </button>
        </div>
      )}

      {/* Registration form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <Elements stripe={stripePromise}>
          <PaymentForm initialPlateNumber={detectedPlate} />
        </Elements>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        Register Vehicle
      </h1>
      <p className="text-gray-500 mb-6">
        Link your license plate to a payment method for automatic charging.
      </p>
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-48 text-gray-400">
            Loading...
          </div>
        }
      >
        <RegisterContent />
      </Suspense>
    </div>
  );
}
