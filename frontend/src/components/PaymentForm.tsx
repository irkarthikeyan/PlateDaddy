"use client";

import { useState, useEffect } from "react";
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { createSetupIntent, registerVehicle } from "@/lib/api";

interface PaymentFormProps {
  initialPlateNumber?: string;
}

export default function PaymentForm({ initialPlateNumber = "" }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();

  const [plateNumber, setPlateNumber] = useState(initialPlateNumber);
  useEffect(() => {
    if (initialPlateNumber) setPlateNumber(initialPlateNumber);
  }, [initialPlateNumber]);
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!stripe || !elements) {
      setError("Stripe not loaded yet. Please wait.");
      return;
    }

    if (!plateNumber || !ownerName || !ownerEmail) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);

    try {
      // 1. Create a SetupIntent on the backend
      const { client_secret } = await createSetupIntent();

      // 2. Confirm card setup with Stripe
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error("Card element not found");
      }

      const { error: stripeError, setupIntent } =
        await stripe.confirmCardSetup(client_secret, {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: ownerName,
              email: ownerEmail,
            },
          },
        });

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      if (!setupIntent || !setupIntent.payment_method) {
        throw new Error("Failed to get payment method from Stripe");
      }

      // 3. Register the vehicle with the payment method ID
      const pmId =
        typeof setupIntent.payment_method === "string"
          ? setupIntent.payment_method
          : setupIntent.payment_method.id;

      await registerVehicle({
        plate_number: plateNumber,
        owner_name: ownerName,
        owner_email: ownerEmail,
        stripe_payment_method_id: pmId,
      });

      setSuccess(true);
      setPlateNumber("");
      setOwnerName("");
      setOwnerEmail("");
      cardElement.clear();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
        <div className="text-4xl mb-3">&#10003;</div>
        <h3 className="text-lg font-semibold text-green-800">
          Vehicle Registered!
        </h3>
        <p className="text-green-600 mt-1">
          Your vehicle and payment method have been saved.
        </p>
        <button
          onClick={() => setSuccess(false)}
          className="mt-4 text-sm text-emerald-600 hover:text-emerald-800 font-medium"
        >
          Register another vehicle
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Plate Number
        </label>
        <input
          type="text"
          value={plateNumber}
          onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
          placeholder="e.g. ABC1234"
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-gray-900"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Owner Name
        </label>
        <input
          type="text"
          value={ownerName}
          onChange={(e) => setOwnerName(e.target.value)}
          placeholder="John Doe"
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-gray-900"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email
        </label>
        <input
          type="email"
          value={ownerEmail}
          onChange={(e) => setOwnerEmail(e.target.value)}
          placeholder="john@example.com"
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-gray-900"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Card Details
        </label>
        <div className="border border-gray-300 rounded-lg px-4 py-3 bg-white">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: "16px",
                  color: "#1f2937",
                  "::placeholder": { color: "#9ca3af" },
                },
                invalid: { color: "#ef4444" },
              },
            }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Test card: 4242 4242 4242 4242, any future date, any CVC
        </p>
      </div>

      <button
        type="submit"
        disabled={loading || !stripe}
        className="w-full bg-emerald-600 text-white py-3 rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Registering..." : "Register Vehicle"}
      </button>
    </form>
  );
}
