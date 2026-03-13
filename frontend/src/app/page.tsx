"use client";

import { useEffect, useState } from "react";
import { CarFront, DollarSign, Receipt, Users } from "lucide-react";
import { listVehicles, listTransactions, listMemberships } from "@/lib/api";
import type { Vehicle, Transaction, Membership } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import StatsCard from "@/components/StatsCard";
import TransactionTable from "@/components/TransactionTable";

export default function Dashboard() {
  const authStore = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [members, setMembers] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetches: Promise<unknown>[] = [
      listVehicles(),
      listTransactions({ limit: 10 }),
    ];
    if (authStore) {
      fetches.push(listMemberships(authStore.id));
    }

    Promise.all(fetches).then(([v, t, m]) => {
      setVehicles(v as Vehicle[]);
      setTransactions(t as Transaction[]);
      if (m) setMembers(m as Membership[]);
      setLoading(false);
    });
  }, [authStore]);

  // Filter revenue and transactions to this store if logged in
  const storeTransactions = authStore
    ? transactions.filter((t) => t.store_id === authStore.id)
    : transactions;

  const totalRevenue = storeTransactions
    .filter((t) => t.status === "success")
    .reduce((sum, t) => sum + t.amount, 0);

  const creditOutstanding = members.reduce(
    (sum, m) => sum + m.credit_balance_cents,
    0
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        Loading...
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        {authStore && (
          <p className="text-gray-500 text-sm mt-1">{authStore.name}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Registered Vehicles"
          value={vehicles.length}
          icon={<CarFront size={24} />}
        />
        <StatsCard
          title="Store Revenue"
          value={`$${(totalRevenue / 100).toFixed(2)}`}
          icon={<DollarSign size={24} />}
          description="From successful charges"
        />
        <StatsCard
          title="Store Transactions"
          value={storeTransactions.length}
          icon={<Receipt size={24} />}
        />
        <StatsCard
          title="Members"
          value={members.length}
          icon={<Users size={24} />}
          description={`$${(creditOutstanding / 100).toFixed(2)} credit outstanding`}
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Recent Transactions
          {authStore && (
            <span className="ml-2 text-sm font-normal text-gray-400">
              · {authStore.name}
            </span>
          )}
        </h2>
        <TransactionTable transactions={storeTransactions} compact />
      </div>
    </div>
  );
}
