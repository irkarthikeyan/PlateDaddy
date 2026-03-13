"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  CarFront,
  List,
  ScanLine,
  Receipt,
  Video,
  Store,
  LogOut,
  Building2,
} from "lucide-react";
import { useAuth, clearAuth } from "@/lib/auth";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/live", label: "Live Scan", icon: Video },
  { href: "/register", label: "Register Vehicle", icon: CarFront },
  { href: "/vehicles", label: "Vehicles", icon: List },
  { href: "/scan", label: "Scan Plate", icon: ScanLine },
  { href: "/transactions", label: "Transactions", icon: Receipt },
  { href: "/stores", label: "My Store", icon: Store },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const authStore = useAuth();

  const handleLogout = () => {
    clearAuth();
    router.replace("/login");
  };

  return (
    <nav className="w-64 min-h-screen bg-slate-900 text-white flex flex-col">
      {/* Brand */}
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-2xl font-bold text-emerald-400">PlateDaddy</h1>
        <p className="text-sm text-slate-400 mt-1">Drive-through Payments</p>
      </div>

      {/* Logged-in store badge */}
      {authStore && (
        <div className="px-4 py-3 bg-slate-800/60 border-b border-slate-700 flex items-center gap-2.5">
          <div className="bg-emerald-500/20 p-1.5 rounded-md shrink-0">
            <Building2 size={14} className="text-emerald-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-400">Signed in as</p>
            <p className="text-sm font-semibold text-white truncate">
              {authStore.name}
            </p>
          </div>
        </div>
      )}

      {/* Nav items */}
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

      {/* Footer — version + logout */}
      <div className="border-t border-slate-700">
        {authStore && (
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-6 py-3 text-sm text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        )}
        <div className="px-6 py-3 text-xs text-slate-600">v0.1.0 — Phase 2</div>
      </div>
    </nav>
  );
}
