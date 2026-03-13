"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Car,
  Mail,
  Lock,
  Store,
  Star,
  Gift,
  UserPlus,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { registerStore } from "@/lib/api";
import { setToken, setAuthStore } from "@/lib/auth";

export default function SignupPage() {
  const router = useRouter();
  const [storeName, setStoreName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [visitThreshold, setVisitThreshold] = useState("10");
  const [rewardAmount, setRewardAmount] = useState("5.00");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await registerStore({
        name: storeName.trim(),
        email,
        password,
        visit_threshold: parseInt(visitThreshold, 10) || 10,
        reward_amount_cents: Math.round(parseFloat(rewardAmount) * 100) || 500,
      });
      setToken(res.access_token);
      setAuthStore(res.store);
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-8 py-8 text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-emerald-500/20 p-2 rounded-lg">
              <Car size={24} className="text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold">PlateDaddy</h1>
          </div>
          <p className="text-slate-400 text-sm">Drive-through Payments</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-8 py-8 space-y-5">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Create Store Account</h2>
            <p className="text-gray-500 text-sm mt-1">
              Register your store to start tracking membership points
            </p>
          </div>

          <div className="space-y-4">
            {/* Store Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Store Name
              </label>
              <div className="relative">
                <Store
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  required
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="e.g. Main Street Drive-Through"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-gray-900"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-gray-900"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-gray-900"
                />
              </div>
            </div>

            {/* Membership points config — collapsible */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setShowAdvanced((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Star size={15} className="text-indigo-400" />
                  Membership Points Settings{" "}
                  <span className="text-gray-400 font-normal">(optional)</span>
                </span>
                {showAdvanced ? (
                  <ChevronUp size={15} />
                ) : (
                  <ChevronDown size={15} />
                )}
              </button>
              {showAdvanced && (
                <div className="px-4 pb-4 pt-2 bg-gray-50 space-y-3 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    Defaults: reward every 10 visits, $5.00 credit. Can be
                    changed later from Stores settings.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                        <Star size={11} className="text-indigo-400" />
                        Visits for reward
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={visitThreshold}
                        onChange={(e) => setVisitThreshold(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-center text-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                        <Gift size={11} className="text-emerald-500" />
                        Reward amount ($)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={rewardAmount}
                        onChange={(e) => setRewardAmount(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-center text-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !storeName.trim()}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <UserPlus size={18} />
            {loading ? "Creating store..." : "Create Store Account"}
          </button>

          <p className="text-center text-sm text-gray-500">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-emerald-600 font-medium hover:text-emerald-700"
            >
              Sign in →
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
