"use client";

import type { Vehicle } from "@/lib/types";

interface VehicleTableProps {
  vehicles: Vehicle[];
  onDeactivate: (plateNumber: string) => void;
}

export default function VehicleTable({
  vehicles,
  onDeactivate,
}: VehicleTableProps) {
  if (vehicles.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No vehicles registered yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
              Plate Number
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
              Owner
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
              Email
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
              Registered
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
              Status
            </th>
            <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {vehicles.map((v) => (
            <tr
              key={v.id}
              className="border-b border-gray-100 hover:bg-gray-50"
            >
              <td className="py-3 px-4 font-mono font-bold text-gray-900">
                {v.plate_number}
              </td>
              <td className="py-3 px-4 text-gray-700">{v.owner_name}</td>
              <td className="py-3 px-4 text-gray-500">{v.owner_email}</td>
              <td className="py-3 px-4 text-gray-500">
                {new Date(v.created_at).toLocaleDateString()}
              </td>
              <td className="py-3 px-4">
                <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  Active
                </span>
              </td>
              <td className="py-3 px-4 text-right">
                <button
                  onClick={() => {
                    if (
                      window.confirm(
                        `Deactivate vehicle ${v.plate_number}?`
                      )
                    ) {
                      onDeactivate(v.plate_number);
                    }
                  }}
                  className="text-sm text-red-600 hover:text-red-800 font-medium"
                >
                  Deactivate
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
