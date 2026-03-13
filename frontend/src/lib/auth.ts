"use client";

import { useEffect, useState } from "react";
import type { Store } from "./types";

const TOKEN_KEY = "pd_token";
const STORE_KEY = "pd_store";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getAuthStore(): Store | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Store;
  } catch {
    return null;
  }
}

export function setAuthStore(store: Store): void {
  localStorage.setItem(STORE_KEY, JSON.stringify(store));
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(STORE_KEY);
}

/** React hook — returns the logged-in Store or null on the client. */
export function useAuth(): Store | null {
  const [store, setStore] = useState<Store | null>(null);
  useEffect(() => {
    setStore(getAuthStore());
  }, []);
  return store;
}
