"use client";

import { useEffect, useState } from "react";
import { updateStore, listMemberships, getStore } from "@/lib/api";
import type { Store, Membership } from "@/lib/types";
import { useAuth, setAuthStore } from "@/lib/auth";
import {
  Store as StoreIcon,
  Pencil,
  Users,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Star,
  Gift,
} from "lucide-react";

// ─── Inline edit panel ────────────────────────────────────────────────────────

function StoreConfigEditor({
  store,
  onUpdated,
}: {
  store: Store;
  onUpdated: (s: Store) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [threshold, setThreshold] = useState(String(store.visit_threshold));
  const [reward, setReward] = useState(
    (store.reward_amount_cents / 100).toFixed(2)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateStore(store.id, {
        visit_threshold: parseInt(threshold, 10) || store.visit_threshold,
        reward_amount_cents:
          Math.round(parseFloat(reward) * 100) || store.reward_amount_cents,
      });
      // Persist updated store in auth storage so other pages see fresh config
      setAuthStore(updated);
      onUpdated(updated);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Star size={16} className="text-indigo-500" />
          Membership Points Config
        </h3>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Pencil size={14} />
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                <Star size={13} className="text-indigo-400" />
                Visits for reward
              </label>
              <input
                type="number"
                min="1"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 text-center"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                <Gift size={13} className="text-emerald-500" />
                Reward amount ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={reward}
                onChange={(e) => setReward(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 text-center"
              />
            </div>
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              <Check size={14} />
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <X size={14} />
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-indigo-50 rounded-lg p-4 text-center">
            <p className="text-xs text-indigo-500 mb-1">Visits for reward</p>
            <p className="text-3xl font-bold text-indigo-800">
              {store.visit_threshold}
            </p>
          </div>
          <div className="bg-emerald-50 rounded-lg p-4 text-center">
            <p className="text-xs text-emerald-600 mb-1">Reward amount</p>
            <p className="text-3xl font-bold text-emerald-700">
              ${(store.reward_amount_cents / 100).toFixed(2)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Members table ────────────────────────────────────────────────────────────

function MembersPanel({ storeId }: { storeId: number }) {
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    if (!open && members.length === 0) {
      setLoading(true);
      try {
        const data = await listMemberships(storeId);
        setMembers(data);
      } finally {
        setLoading(false);
      }
    }
    setOpen((v) => !v);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between px-6 py-4 text-sm font-semibold text-gray-900 hover:bg-gray-50 transition-colors"
      >
        <span className="flex items-center gap-2">
          <Users size={16} className="text-blue-500" />
          Membership Accounts
        </span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {open && (
        <div className="border-t border-gray-100 px-6 py-5">
          {loading ? (
            <p className="text-sm text-gray-400">Loading...</p>
          ) : members.length === 0 ? (
            <p className="text-sm text-gray-400">
              No membership accounts yet. Accounts are created automatically the
              first time a plate is scanned with your store selected.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                    <th className="pb-2 pr-4 font-medium">Plate</th>
                    <th className="pb-2 pr-4 font-medium">Total Visits</th>
                    <th className="pb-2 pr-4 font-medium">Credit Balance</th>
                    <th className="pb-2 font-medium">Last Visit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {members.map((m) => (
                    <tr key={m.id}>
                      <td className="py-3 pr-4 font-mono font-bold text-gray-900">
                        {m.plate_number}
                      </td>
                      <td className="py-3 pr-4 text-gray-700">
                        {m.total_visits}
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`font-semibold ${
                            m.credit_balance_cents > 0
                              ? "text-emerald-700"
                              : "text-gray-400"
                          }`}
                        >
                          ${(m.credit_balance_cents / 100).toFixed(2)}
                        </span>
                      </td>
                      <td className="py-3 text-gray-400 text-xs">
                        {new Date(m.updated_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StoresPage() {
  const authStore = useAuth();
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authStore) return;
    getStore(authStore.id)
      .then(setStore)
      .catch(() => setStore(authStore)) // fallback to cached
      .finally(() => setLoading(false));
  }, [authStore]);

  if (loading || !authStore) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        Loading store...
      </div>
    );
  }

  if (!store) return null;

  return (
    <div className="max-w-2xl space-y-6">
      {/* Store header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Store</h1>
        <p className="text-gray-500 text-sm mt-1">
          Manage your store&apos;s membership points configuration and view member accounts.
        </p>
      </div>

      {/* Store identity card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-4">
          <div className="bg-emerald-100 p-3 rounded-xl">
            <StoreIcon size={24} className="text-emerald-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{store.name}</h2>
            {store.email && (
              <p className="text-sm text-gray-500 mt-0.5">{store.email}</p>
            )}
          </div>
        </div>
      </div>

      {/* Membership config */}
      <StoreConfigEditor store={store} onUpdated={setStore} />

      {/* Members table */}
      <MembersPanel storeId={store.id} />
    </div>
  );
}
