import type {
  Vehicle,
  VehicleRegisterPayload,
  Transaction,
  ScanResponse,
  PlateDetectionResult,
  SetupIntentResponse,
  StripeKeyResponse,
  ChargePlatePayload,
  Store,
  StoreCreatePayload,
  StoreUpdatePayload,
  Membership,
  StoreRegisterPayload,
  StoreLoginPayload,
  AuthResponse,
} from "./types";
import { getToken } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || "Request failed");
  }
  return res.json();
}

// Auth
export const registerStore = (data: StoreRegisterPayload) =>
  request<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const loginStore = (data: StoreLoginPayload) =>
  request<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const getMe = () => request<Store>("/auth/me");

// Config
export const getStripeKey = () =>
  request<StripeKeyResponse>("/config/stripe-key");

// Vehicles
export const listVehicles = () => request<Vehicle[]>("/plates/");

export const getVehicle = (plate: string) =>
  request<Vehicle>(`/plates/${plate}`);

export const registerVehicle = (data: VehicleRegisterPayload) =>
  request<Vehicle>("/plates/register", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const deactivateVehicle = (plate: string) =>
  request<{ message: string }>(`/plates/${plate}`, { method: "DELETE" });

export const createSetupIntent = () =>
  request<SetupIntentResponse>("/plates/create-setup-intent", {
    method: "POST",
  });

// Scan (uses FormData, not JSON)
export const scanPlate = async (
  file: File,
  amount?: number
): Promise<ScanResponse> => {
  const formData = new FormData();
  formData.append("image", file);
  const url = amount ? `/scan/?amount=${amount}` : "/scan/";
  const token = getToken();
  const res = await fetch(`${API_URL}${url}`, {
    method: "POST",
    body: formData,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Scan failed" }));
    throw new Error(error.detail);
  }
  return res.json();
};

export const detectPlate = async (
  file: File
): Promise<PlateDetectionResult> => {
  const formData = new FormData();
  formData.append("image", file);
  const token = getToken();
  const res = await fetch(`${API_URL}/scan/detect`, {
    method: "POST",
    body: formData,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const error = await res
      .json()
      .catch(() => ({ detail: "Detection failed" }));
    throw new Error(error.detail);
  }
  return res.json();
};

// Detect plate from a canvas blob (for live webcam scanning)
export const detectPlateBlob = async (
  blob: Blob
): Promise<PlateDetectionResult> => {
  const formData = new FormData();
  formData.append("image", blob, "frame.jpg");
  const token = getToken();
  const res = await fetch(`${API_URL}/scan/detect`, {
    method: "POST",
    body: formData,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const error = await res
      .json()
      .catch(() => ({ detail: "Detection failed" }));
    throw new Error(error.detail);
  }
  return res.json();
};

// Charge by plate number (no image needed)
export const chargePlate = (data: ChargePlatePayload) =>
  request<ScanResponse>("/scan/charge-plate", {
    method: "POST",
    body: JSON.stringify(data),
  });

// Stores
export const listStores = () => request<Store[]>("/stores/");

export const getStore = (id: number) => request<Store>(`/stores/${id}`);

export const createStore = (data: StoreCreatePayload) =>
  request<Store>("/stores/", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateStore = (id: number, data: StoreUpdatePayload) =>
  request<Store>(`/stores/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

export const listMemberships = (storeId: number) =>
  request<Membership[]>(`/stores/${storeId}/memberships`);

export const getMembership = (storeId: number, plate: string) =>
  request<Membership>(`/stores/${storeId}/memberships/${plate}`);

// Transactions
export const listTransactions = (params?: {
  plate_number?: string;
  status?: string;
  limit?: number;
}) => {
  const query = new URLSearchParams();
  if (params?.plate_number) query.set("plate_number", params.plate_number);
  if (params?.status) query.set("status", params.status);
  if (params?.limit) query.set("limit", String(params.limit));
  const qs = query.toString();
  return request<Transaction[]>(`/transactions/${qs ? `?${qs}` : ""}`);
};
