"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CarFront,
  List,
  ScanLine,
  Receipt,
  Video,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/live", label: "Live Scan", icon: Video },
  { href: "/register", label: "Register Vehicle", icon: CarFront },
  { href: "/vehicles", label: "Vehicles", icon: List },
  { href: "/scan", label: "Scan Plate", icon: ScanLine },
  { href: "/transactions", label: "Transactions", icon: Receipt },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="w-64 min-h-screen bg-slate-900 text-white flex flex-col">
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-2xl font-bold text-emerald-400">PlateDaddy</h1>
        <p className="text-sm text-slate-400 mt-1">Drive-through Payments</p>
      </div>
      <ul className="flex-1 py-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center gap-3 px-6 py-3 text-sm transition-colors ${
                  isActive
                    ? "bg-slate-800 text-emerald-400 border-l-4 border-emerald-400"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white border-l-4 border-transparent"
                }`}
              >
                <Icon size={20} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="p-4 border-t border-slate-700 text-xs text-slate-500">
        v0.1.0 — Phase 2
      </div>
    </nav>
  );
}
