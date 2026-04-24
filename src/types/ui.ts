import type { LucideIcon } from 'lucide-react';

// Component prop types
export interface NavItem {
  icon: LucideIcon;
  label: string;
  path: string;
  badge?: number;
}

export interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  hint?: string;
  cta?: string;
}

// Loading states
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

// Form data types
export interface LoginFormData {
  email: string;
  password: string;
}

export interface SignUpFormData extends LoginFormData {
  username: string;
  gender?: 'male' | 'female' | 'other';
}

export interface EmotionFormData {
  emotion: string;
  emotions?: string[];
  mood_score?: number;
  anxiety_level?: number;
  notes?: string;
  triggers?: string[];
  had_panic_attack?: boolean;
}

export interface PostFormData {
  content: string;
  emotion_tags?: string[];
  is_anonymous?: boolean;
  media_url?: string;
  media_type?: string;
}

// UI state types
export interface ToastData {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

export interface ModalState {
  isOpen: boolean;
  title?: string;
  content?: React.ReactNode;
}

// Emotion types
export type EmotionType =
  | 'joy'
  | 'sadness'
  | 'anxiety'
  | 'calm'
  | 'anger'
  | 'fear'
  | 'hope'
  | 'gratitude'
  | 'overwhelm'
  | 'neutral';

export interface EmotionInsight {
  emotion: EmotionType;
  count: number;
  trend: 'up' | 'down' | 'stable';
  avgMood: number;
}

// Theme types
export type ThemeMode = 'light' | 'dark';

// Subscription tier
export type SubscriptionTier = 'free' | 'plus' | 'premium';

export interface SubscriptionLimits {
  jivaCallsPerWeek: number;
}
