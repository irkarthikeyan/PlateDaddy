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
  created_at: string;
}

export interface ScanResponse {
  plate_number: string;
  confidence: number;
  owner_name: string;
  transaction_status: string;
  amount: number;
  message: string;
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
}
