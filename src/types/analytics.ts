// Minimal Analytics Types - Simple and Expandable
// Start with basic types, add more as needed

// Basic event parameters - keep it simple
export interface SimpleEventParams {
  user_type: 'guest' | 'authenticated';
  page?: string;
  action?: string;
  category?: string;
  label?: string;
  value?: number;
  [key: string]: any; // Allow any additional properties for flexibility
}

// Basic analytics configuration
export interface SimpleAnalyticsConfig {
  isEnabled: boolean;
  userType: 'guest' | 'authenticated';
}

// Essential event names - start with the most important ones
export const ANALYTICS_EVENTS = {
  // Page tracking
  PAGE_VIEW: 'page_view',

  // Basic user actions
  APP_START: 'app_start',
  BUTTON_CLICK: 'button_click',

  // Navigation
  NAVIGATE: 'navigate',

  // Study basics
  STUDY_START: 'study_start',
  STUDY_COMPLETE: 'study_complete',

  // Authentication
  SIGN_IN: 'sign_in',
  SIGN_OUT: 'sign_out',

  // Cookie consent (for home page)
  COOKIE_CONSENT_ACCEPTED: 'cookie_consent_accepted',
  COOKIE_CONSENT_DECLINED: 'cookie_consent_declined',
  COOKIE_CONSENT_SHOWN: 'cookie_consent_shown',

  // App states (flashcard app navigation)
  APP_STATE_CHANGE: 'app_state_change',
  CARD_SET_SELECTED: 'card_set_selected',
  REVIEW_SESSION_START: 'review_session_start',
  REVIEW_SESSION_COMPLETE: 'review_session_complete',
} as const;

// Event categories for organization
export const EVENT_CATEGORIES = {
  PAGE: 'page',
  USER: 'user',
  STUDY: 'study',
  AUTH: 'auth',
  NAVIGATION: 'navigation',
} as const;

// Simple analytics service interface
export interface IMinimalAnalyticsService {
  trackPageView(page: string, title?: string): void;
  trackEvent(eventName: string, properties?: Record<string, any>): void;
  setAuthenticatedUser(user: any): void;
  setGuestUser(): void;
  isEnabled(): boolean;
  getUserType(): 'guest' | 'authenticated';
}
