"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Navbar from "./Navbar";
import { getToken } from "@/lib/auth";

const AUTH_PATHS = ["/login", "/signup"];

export default function ConditionalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isAuthPage = AUTH_PATHS.includes(pathname);

  useEffect(() => {
    if (!isAuthPage && !getToken()) {
      router.replace("/login");
    }
  }, [pathname, isAuthPage, router]);

  // Standalone full-screen layout for login / register
  if (isAuthPage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        {children}
      </div>
    );
  }

  // Standard app layout with sidebar Navbar
  return (
    <div className="flex min-h-screen">
      <Navbar />
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
}
