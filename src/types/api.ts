import type { PostgrestError } from '@supabase/supabase-js';

// Generic API response wrapper
export interface APIResponse<T> {
  data: T | null;
  error: APIError | null;
  success: boolean;
}

// Error types
export interface APIError {
  message: string;
  code?: string;
  details?: string;
}

// Type guard for Postgrest errors
export function isPostgrestError(error: unknown): error is PostgrestError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    'details' in error
  );
}

// Edge function response types
export interface JivaChatResponse {
  reply: string;
  emotion?: string;
  suggestedAction?: string;
}



export interface AnalyticsData {
  totalUsers: number;
  activeUsers: number;
  postsCount: number;
  emotionEntries: number;
  trends: {
    date: string;
    value: number;
  }[];
}

// Payment types
export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  confirmationUrl: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  features: string[];
}
