"use client";

import { useEffect, useState } from "react";
import { CarFront, DollarSign, Receipt } from "lucide-react";
import { listVehicles, listTransactions } from "@/lib/api";
import type { Vehicle, Transaction } from "@/lib/types";
import StatsCard from "@/components/StatsCard";
import TransactionTable from "@/components/TransactionTable";

export default function Dashboard() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([listVehicles(), listTransactions({ limit: 5 })]).then(
      ([v, t]) => {
        setVehicles(v);
        setTransactions(t);
        setLoading(false);
      }
    );
  }, []);

  const totalRevenue = transactions
    .filter((t) => t.status === "success")
    .reduce((sum, t) => sum + t.amount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        Loading...
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatsCard
          title="Registered Vehicles"
          value={vehicles.length}
          icon={<CarFront size={24} />}
        />
        <StatsCard
          title="Revenue"
          value={`$${(totalRevenue / 100).toFixed(2)}`}
          icon={<DollarSign size={24} />}
          description="From successful charges"
        />
        <StatsCard
          title="Total Transactions"
          value={transactions.length}
          icon={<Receipt size={24} />}
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Recent Transactions
        </h2>
        <TransactionTable transactions={transactions} compact />
      </div>
    </div>
  );
}
