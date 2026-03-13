"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getVehicle, chargePlate, listStores } from "@/lib/api";
import type { Vehicle, ScanResponse, Store } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import StatusBadge from "@/components/StatusBadge";
import {
  ArrowLeft,
  CreditCard,
  User,
  Mail,
  Car,
  Search,
  Star,
  Gift,
  Coins,
} from "lucide-react";
import Link from "next/link";

function MembershipResult({ result }: { result: ScanResponse }) {
  if (result.total_visits === null) return null;

  return (
    <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5 mt-4">
      <h4 className="font-semibold text-indigo-800 mb-3 flex items-center gap-2">
        <Star size={16} />
        Membership Points
      </h4>
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-lg p-3 text-center border border-indigo-100">
          <p className="text-xs text-indigo-500 mb-1">Total Visits</p>
          <p className="text-2xl font-bold text-indigo-800">
            {result.total_visits}
          </p>
        </div>
        <div className="bg-white rounded-lg p-3 text-center border border-indigo-100">
          <p className="text-xs text-indigo-500 mb-1">Credit Balance</p>
          <p className="text-2xl font-bold text-indigo-800">
            ${((result.credit_balance_cents ?? 0) / 100).toFixed(2)}
          </p>
        </div>
        <div className="bg-white rounded-lg p-3 text-center border border-indigo-100">
          <p className="text-xs text-indigo-500 mb-1">Credit Applied</p>
          <p className="text-2xl font-bold text-emerald-700">
            ${((result.credit_applied_cents ?? 0) / 100).toFixed(2)}
          </p>
        </div>
      </div>

      {result.reward_earned && (
        <div className="mt-3 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5">
          <Gift size={16} className="text-amber-600 shrink-0" />
          <p className="text-amber-800 text-sm font-medium">
            🎉 Milestone reached! ${((result.credit_balance_cents ?? 0) / 100).toFixed(2)} credit has been added to this account.
          </p>
        </div>
      )}
    </div>
  );
}

function ChargeForm({ plate }: { plate: string }) {
  const authStore = useAuth();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [selectedStoreId, setSelectedStoreId] = useState<number | "">("");
  const [applyCredit, setApplyCredit] = useState(false);
  const [charging, setCharging] = useState(false);
  const [result, setResult] = useState<ScanResponse | null>(null);

  useEffect(() => {
    Promise.all([getVehicle(plate), listStores()])
      .then(([v, s]) => {
        setVehicle(v);
        setStores(s);
        // Auto-select the logged-in store
        if (authStore) setSelectedStoreId(authStore.id);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [plate]);

  const handleCharge = async () => {
    setCharging(true);
    setError(null);
    setResult(null);
    try {
      const amountCents = amount
        ? Math.round(parseFloat(amount) * 100)
        : undefined;
      const res = await chargePlate({
        plate_number: plate,
        amount: amountCents,
        store_id: selectedStoreId !== "" ? selectedStoreId : undefined,
        apply_credit: applyCredit,
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Charge failed");
    } finally {
      setCharging(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-400">
        Loading vehicle details...
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <p className="text-red-700 font-medium">Vehicle not found</p>
        <p className="text-red-600 text-sm mt-1">
          No registered vehicle found for plate: {plate}
        </p>
        <Link
          href={`/register?plate=${plate}`}
          className="inline-block mt-4 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-emerald-700 transition-colors"
        >
          Register this plate
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Customer details card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Customer Details
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-4">
            <Car className="text-emerald-600" size={20} />
            <div>
              <p className="text-xs text-gray-500">Plate Number</p>
              <p className="font-mono font-bold text-gray-900 text-lg">
                {vehicle.plate_number}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-4">
            <User className="text-blue-600" size={20} />
            <div>
              <p className="text-xs text-gray-500">Owner</p>
              <p className="font-medium text-gray-900">{vehicle.owner_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-4">
            <Mail className="text-purple-600" size={20} />
            <div>
              <p className="text-xs text-gray-500">Email</p>
              <p className="text-gray-900 text-sm">{vehicle.owner_email}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charge form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Process Payment
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount (USD) — leave blank for default ($5.00)
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

          {/* Store selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Store{" "}
              <span className="text-gray-400 font-normal">
                (for membership points)
              </span>
            </label>
            <select
              value={selectedStoreId}
              onChange={(e) => {
                setSelectedStoreId(
                  e.target.value !== "" ? Number(e.target.value) : ""
                );
                if (e.target.value === "") setApplyCredit(false);
              }}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-gray-900 bg-white"
            >
              <option value="">— No store (skip points) —</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · reward every {s.visit_threshold} visits · $
                  {(s.reward_amount_cents / 100).toFixed(2)} credit
                </option>
              ))}
            </select>
          </div>

          {/* Apply credit toggle — only shown when a store is selected */}
          {selectedStoreId !== "" && (
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <div className="relative">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={applyCredit}
                  onChange={(e) => setApplyCredit(e.target.checked)}
                />
                <div
                  className={`w-10 h-6 rounded-full transition-colors ${
                    applyCredit ? "bg-emerald-500" : "bg-gray-300"
                  }`}
                />
                <div
                  className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    applyCredit ? "translate-x-4" : ""
                  }`}
                />
              </div>
              <span className="text-sm text-gray-700 flex items-center gap-1.5">
                <Coins size={15} className="text-indigo-500" />
                Apply available credit to this charge
              </span>
            </label>
          )}

          <button
            onClick={handleCharge}
            disabled={charging}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-3 rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <CreditCard size={18} />
            {charging ? "Processing..." : "Charge Customer"}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <h3 className="font-semibold text-green-800 mb-3">Payment Result</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-green-600">Plate:</span>
              <span className="ml-2 font-mono font-bold text-green-900">
                {result.plate_number}
              </span>
            </div>
            <div>
              <span className="text-green-600">Owner:</span>
              <span className="ml-2 text-green-900">{result.owner_name}</span>
            </div>
            <div>
              <span className="text-green-600">Amount Charged:</span>
              <span className="ml-2 font-bold text-green-900">
                ${(result.amount / 100).toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-green-600">Status:</span>
              <span className="ml-2">
                <StatusBadge status={result.transaction_status} />
              </span>
            </div>
          </div>
          <p className="mt-3 text-green-700 text-sm">{result.message}</p>
          <MembershipResult result={result} />
        </div>
      )}
    </div>
  );
}

function PlateSearch() {
  const router = useRouter();
  const [plateInput, setPlateInput] = useState("");
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    const plate = plateInput.trim().toUpperCase();
    if (!plate) return;

    setSearching(true);
    setError(null);
    try {
      await getVehicle(plate);
      router.push(`/scan?plate=${plate}`);
    } catch {
      setError(plate);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <input
          type="text"
          value={plateInput}
          onChange={(e) => setPlateInput(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="e.g. BTR1850"
          className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none font-mono text-lg text-gray-900 tracking-wider"
        />
        <button
          onClick={handleSearch}
          disabled={!plateInput.trim() || searching}
          className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Search size={16} />
          {searching ? "Looking up..." : "Look Up"}
        </button>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-amber-800 font-medium text-sm">
            No registered vehicle found for plate: {error}
          </p>
          <Link
            href={`/register?plate=${error}`}
            className="inline-block mt-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
          >
            Register this plate &rarr;
          </Link>
        </div>
      )}
    </div>
  );
}

function ScanContent() {
  const searchParams = useSearchParams();
  const plate = searchParams.get("plate");

  if (plate) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/live"
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Charge Vehicle</h1>
            <p className="text-gray-500 text-sm mt-1">
              Review details and process payment for{" "}
              <span className="font-mono font-medium">{plate}</span>
            </p>
          </div>
        </div>
        <div className="max-w-2xl">
          <ChargeForm plate={plate} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Charge Vehicle</h1>
      <p className="text-gray-500 mb-6">
        Enter a plate number to look up the vehicle and process payment.
      </p>
      <div className="max-w-2xl bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <PlateSearch />
      </div>
    </div>
  );
}

export default function ScanPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12 text-gray-400">
          Loading...
        </div>
      }
    >
      <ScanContent />
    </Suspense>
  );
}
