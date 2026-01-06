// Minimal Google Analytics Service - Start Simple, Expand Later
// This is a simplified version focused on core functionality only

import { logEvent, setUserId } from 'firebase/analytics';
import { getAnalyticsInstance, isAnalyticsAvailable } from '../utils/firebase';
import type { User } from 'firebase/auth';

// Simple analytics configuration
interface SimpleAnalyticsConfig {
  isEnabled: boolean;
  userType: 'guest' | 'authenticated';
}

// Basic event parameters
interface SimpleEventParams {
  user_type: 'guest' | 'authenticated';
  page?: string;
  action?: string;
  [key: string]: any; // Allow additional custom properties
}

// Minimal Analytics Service - focusing on essential features only
class MinimalAnalyticsService {
  private config: SimpleAnalyticsConfig = {
    isEnabled: false,
    userType: 'guest',
  };

  constructor() {
    this.initializeService();
  }

  // Simple initialization
  private initializeService(): void {
    // Enable analytics if available (automatically handles dev/prod and browser support)
    this.config.isEnabled = isAnalyticsAvailable();

    if (this.config.isEnabled) {
      console.log('✅ Analytics initialized');
    } else {
      console.log('📊 Analytics disabled (dev mode or unsupported)');
    }
  }

  // Set user type when authentication changes
  setAuthenticatedUser(user: User): void {
    this.config.userType = 'authenticated';

    if (this.config.isEnabled) {
      const analytics = getAnalyticsInstance();
      if (analytics) {
        // Set simple user ID (you can make this more private later)
        setUserId(analytics, `user_${user.uid.slice(0, 8)}`);
      }
      console.log('👤 User set to authenticated');
    }
  }

  // Set guest user
  setGuestUser(): void {
    this.config.userType = 'guest';

    if (this.config.isEnabled) {
      const analytics = getAnalyticsInstance();
      if (analytics) {
        setUserId(analytics, null);
      }
      console.log('🏠 User set to guest');
    }
  }

  // Track page views - the most important event
  trackPageView(page: string, title?: string): void {
    if (!this.config.isEnabled) {
      console.log(`📄 [DEV] Page: ${page} (${title || 'no title'})`);
      return;
    }

    try {
      const analytics = getAnalyticsInstance();
      if (analytics) {
        logEvent(analytics, 'page_view', {
          user_type: this.config.userType,
          page_title: title || document.title || 'Unknown',
          page_location: window.location.href,
          page_path: page,
        });
        console.log(`📄 Page tracked: ${page}`);
      }
    } catch (error) {
      console.error('Failed to track page:', error);
    }
  }

  // Track simple events - flexible for any action
  trackEvent(eventName: string, properties: Record<string, any> = {}): void {
    if (!this.config.isEnabled) {
      console.log(`🎯 [DEV] Event: ${eventName}`, properties);
      return;
    }

    try {
      const analytics = getAnalyticsInstance();
      if (analytics) {
        const eventData: SimpleEventParams = {
          user_type: this.config.userType,
          ...properties,
        };

        logEvent(analytics, eventName, eventData);
        console.log(`🎯 Event tracked: ${eventName}`, properties);
      }
    } catch (error) {
      console.error(`Failed to track event ${eventName}:`, error);
    }
  }

  // Simple status check
  isEnabled(): boolean {
    return this.config.isEnabled;
  }

  // Get current user type
  getUserType(): 'guest' | 'authenticated' {
    return this.config.userType;
  }

  // Helper methods for common tracking scenarios

  // Track button clicks with standardized parameters
  trackButtonClick(
    buttonId: string,
    page?: string,
    additionalProps?: Record<string, any>
  ): void {
    this.trackEvent('button_click', {
      button_id: buttonId,
      page: page || window.location.pathname,
      ...additionalProps,
    });
  }

  // Track navigation between app states
  trackAppNavigation(
    fromState: string,
    toState: string,
    additionalProps?: Record<string, any>
  ): void {
    this.trackEvent('app_state_change', {
      from_state: fromState,
      to_state: toState,
      ...additionalProps,
    });
  }

  // Track cookie consent decisions
  trackCookieConsent(action: 'accepted' | 'declined' | 'shown'): void {
    this.trackEvent(`cookie_consent_${action}`, {
      timestamp: new Date().toISOString(),
      page: window.location.pathname,
    });
  }
}

// Export singleton instance
const analyticsService = new MinimalAnalyticsService();

// Expose analytics service globally in development for testing
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  (window as any).analyticsService = analyticsService;
  console.log('🧪 Analytics service exposed globally for testing');
}

export default analyticsService;

// Export types for external use
export type { SimpleAnalyticsConfig, SimpleEventParams };
