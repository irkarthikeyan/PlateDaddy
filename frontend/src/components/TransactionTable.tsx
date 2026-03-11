"use client";

import type { Transaction } from "@/lib/types";
import StatusBadge from "./StatusBadge";

interface TransactionTableProps {
  transactions: Transaction[];
  compact?: boolean;
}

export default function TransactionTable({
  transactions,
  compact = false,
}: TransactionTableProps) {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No transactions found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            {!compact && (
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                ID
              </th>
            )}
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
              Plate
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
              Amount
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
              Status
            </th>
            {!compact && (
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                Confidence
              </th>
            )}
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
              Date
            </th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => (
            <tr
              key={t.id}
              className="border-b border-gray-100 hover:bg-gray-50"
            >
              {!compact && (
                <td className="py-3 px-4 text-gray-400 text-sm">#{t.id}</td>
              )}
              <td className="py-3 px-4 font-mono font-bold text-gray-900">
                {t.plate_number}
              </td>
              <td className="py-3 px-4 text-gray-700">
                ${(t.amount / 100).toFixed(2)}
              </td>
              <td className="py-3 px-4">
                <StatusBadge status={t.status} />
              </td>
              {!compact && (
                <td className="py-3 px-4 text-gray-500">
                  {t.confidence
                    ? `${(t.confidence * 100).toFixed(1)}%`
                    : "N/A"}
                </td>
              )}
              <td className="py-3 px-4 text-gray-500 text-sm">
                {new Date(t.created_at).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
