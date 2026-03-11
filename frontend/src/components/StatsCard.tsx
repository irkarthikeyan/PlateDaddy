import type { ReactNode } from "react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  description?: string;
}

export default function StatsCard({
  title,
  value,
  icon,
  description,
}: StatsCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-3xl font-bold mt-1 text-gray-900">{value}</p>
          {description && (
            <p className="text-xs text-gray-400 mt-1">{description}</p>
          )}
        </div>
        <div className="text-emerald-500 bg-emerald-50 p-3 rounded-lg">
          {icon}
        </div>
      </div>
    </div>
  );
}
