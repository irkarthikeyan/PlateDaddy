export interface Vehicle {
  id: number;
  plate_number: string;
  owner_name: string;
  owner_email: string;
  is_active: boolean;
  created_at: string;
}

export interface VehicleRegisterPayload {
  plate_number: string;
  owner_name: string;
  owner_email: string;
  stripe_payment_method_id: string;
}

export interface Transaction {
  id: number;
  plate_number: string;
  amount: number;
  currency: string;
  status: string;
  confidence: number | null;
  stripe_payment_intent_id: string | null;
  store_id: number | null;
  created_at: string;
}

export interface ScanResponse {
  plate_number: string;
  confidence: number;
  owner_name: string;
  transaction_status: string;
  amount: number;
  message: string;
  // Membership fields — present only when store_id was provided
  credit_applied_cents: number | null;
  total_visits: number | null;
  credit_balance_cents: number | null;
  reward_earned: boolean | null;
}

export interface PlateDetectionResult {
  plate_number: string;
  confidence: number;
  bbox: number[][] | null;
  is_registered?: boolean;
}

export interface SetupIntentResponse {
  client_secret: string;
}

export interface StripeKeyResponse {
  publishable_key: string;
}

export interface PlateDetectedEvent {
  plate_number: string;
  confidence: number;
  timestamp: string;
  is_registered: boolean;
}

export interface ChargePlatePayload {
  plate_number: string;
  amount?: number;
  store_id?: number;
  apply_credit?: boolean;
}

export interface Store {
  id: number;
  name: string;
  email: string | null;
  visit_threshold: number;
  reward_amount_cents: number;
  is_active: boolean;
  created_at: string;
}

export interface StoreRegisterPayload {
  name: string;
  email: string;
  password: string;
  visit_threshold?: number;
  reward_amount_cents?: number;
}

export interface StoreLoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  store: Store;
}

export interface StoreCreatePayload {
  name: string;
  visit_threshold?: number;
  reward_amount_cents?: number;
}

export interface StoreUpdatePayload {
  name?: string;
  visit_threshold?: number;
  reward_amount_cents?: number;
  is_active?: boolean;
}

export interface Membership {
  id: number;
  plate_number: string;
  store_id: number;
  total_visits: number;
  credit_balance_cents: number;
  updated_at: string;
}
