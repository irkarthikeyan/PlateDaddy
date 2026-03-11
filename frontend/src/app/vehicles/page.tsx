"use client";

import { useEffect, useState } from "react";
import { listVehicles, deactivateVehicle } from "@/lib/api";
import type { Vehicle } from "@/lib/types";
import VehicleTable from "@/components/VehicleTable";

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchVehicles = () => {
    listVehicles().then((v) => {
      setVehicles(v);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const handleDeactivate = async (plateNumber: string) => {
    try {
      await deactivateVehicle(plateNumber);
      fetchVehicles();
    } catch {
      alert("Failed to deactivate vehicle");
    }
  };

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Vehicles</h1>
        <div className="flex items-center justify-center h-48 text-gray-400">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Registered Vehicles
      </h1>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <VehicleTable vehicles={vehicles} onDeactivate={handleDeactivate} />
      </div>
    </div>
  );
}
