// Hook for Analytics with Cookie Consent Support
// Handles the integration between cookie consent and analytics tracking

import { useEffect, useRef } from 'react';
import analyticsService from '../services/analyticsService';
import { getCookieConsent } from '../components/common/PrivacyNotice';

interface UseAnalyticsOptions {
  // Page information
  pageName: string;
  pageTitle?: string;

  // Whether this page requires cookie consent
  requiresCookieConsent?: boolean;

  // Additional properties to track with page view
  additionalProps?: Record<string, any>;
}

/**
 * Hook to handle analytics tracking with cookie consent
 *
 * @param options Configuration for analytics tracking
 * @returns Object with tracking functions and consent status
 */
export const useAnalytics = (options: UseAnalyticsOptions) => {
  const {
    pageName,
    pageTitle,
    requiresCookieConsent = false,
    additionalProps = {},
  } = options;

  const hasTrackedPageView = useRef(false);
  const hasConsent = useRef<boolean | null>(null);

  useEffect(() => {
    // Check cookie consent if required
    if (requiresCookieConsent) {
      const consentData = getCookieConsent();

      if (consentData === null) {
        // No consent decision made yet, don't track
        hasConsent.current = null;
        return;
      }

      hasConsent.current = consentData.accepted;

      if (!consentData.accepted) {
        // User declined consent, don't track
        console.log('📊 Analytics: Skipping page view - consent declined');
        return;
      }
    } else {
      // No consent required (e.g., app pages), always track
      hasConsent.current = true;
    }

    // Track page view if we have consent or consent is not required
    if (hasConsent.current && !hasTrackedPageView.current) {
      analyticsService.trackPageView(pageName, pageTitle);

      // Track additional properties if provided
      if (Object.keys(additionalProps).length > 0) {
        analyticsService.trackEvent('page_view_enhanced', {
          page: pageName,
          ...additionalProps,
        });
      }

      hasTrackedPageView.current = true;
      console.log(`📊 Analytics: Page view tracked for ${pageName}`);
    }
  }, [pageName, pageTitle, requiresCookieConsent, additionalProps]);

  // Utility functions for tracking events (only if consent is given)
  const trackEvent = (eventName: string, properties?: Record<string, any>) => {
    if (requiresCookieConsent && hasConsent.current !== true) {
      console.log(`📊 Analytics: Skipping event ${eventName} - no consent`);
      return;
    }

    analyticsService.trackEvent(eventName, properties);
  };

  const trackButtonClick = (
    buttonId: string,
    additionalProps?: Record<string, any>
  ) => {
    if (requiresCookieConsent && hasConsent.current !== true) {
      console.log(
        `📊 Analytics: Skipping button click ${buttonId} - no consent`
      );
      return;
    }

    analyticsService.trackButtonClick(buttonId, pageName, additionalProps);
  };

  // Force track page view after consent is given (called from CookieConsent component)
  const trackPageViewWithConsent = () => {
    if (!hasTrackedPageView.current) {
      analyticsService.trackPageView(pageName, pageTitle);

      if (Object.keys(additionalProps).length > 0) {
        analyticsService.trackEvent('page_view_enhanced', {
          page: pageName,
          ...additionalProps,
        });
      }

      hasTrackedPageView.current = true;
      console.log(
        `📊 Analytics: Page view tracked after consent for ${pageName}`
      );
    }
  };

  return {
    // Current consent status
    hasConsent: hasConsent.current,
    requiresConsent: requiresCookieConsent,

    // Tracking functions
    trackEvent,
    trackButtonClick,
    trackPageViewWithConsent,

    // Status
    hasTrackedPageView: hasTrackedPageView.current,
  };
};

export default useAnalytics;
