"use client";

import { useEffect, useState } from "react";
import { listTransactions } from "@/lib/api";
import type { Transaction } from "@/lib/types";
import TransactionTable from "@/components/TransactionTable";

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [plateFilter, setPlateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const fetchTransactions = () => {
    setLoading(true);
    listTransactions({
      plate_number: plateFilter || undefined,
      status: statusFilter || undefined,
      limit: 100,
    }).then((t) => {
      setTransactions(t);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Transactions</h1>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Plate Number
            </label>
            <input
              type="text"
              value={plateFilter}
              onChange={(e) => setPlateFilter(e.target.value.toUpperCase())}
              placeholder="Filter by plate..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-gray-900"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-gray-900"
            >
              <option value="">All</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          <button
            onClick={fetchTransactions}
            className="bg-emerald-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
          >
            Filter
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-gray-400">
            Loading...
          </div>
        ) : (
          <TransactionTable transactions={transactions} />
        )}
      </div>
    </div>
  );
}
