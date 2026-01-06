// Client-side analytics initialization for home page
// This script runs in the browser to track page views with cookie consent

import analyticsService from '../services/analyticsService';
import { getCookieConsent } from '../components/common/PrivacyNotice';

/**
 * Initialize analytics tracking for home page with cookie consent
 * This function should be called when the home page loads
 */
export function initializeHomeAnalytics(): void {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeHomeAnalytics);
    return;
  }

  console.log('🏠 Initializing home page analytics...');

  // Check if user has already given consent
  const consentData = getCookieConsent();

  if (consentData && consentData.accepted) {
    // User has consented, track page view
    trackHomePageView();
    setupHomePageTracking();
  } else if (consentData && !consentData.accepted) {
    // User has declined, don't track
    console.log('📊 Home analytics: User declined consent, skipping tracking');
  } else {
    // No consent decision yet, consent banner will be shown
    console.log('📊 Home analytics: Waiting for consent decision');
  }
}

/**
 * Track home page view with relevant metadata
 */
function trackHomePageView(): void {
  const pageTitle = document.title || 'NinjaLingo Home';
  const language = document.documentElement.lang || 'en';

  // Track basic page view
  analyticsService.trackPageView('/home', pageTitle);

  // Track enhanced page view with additional context
  analyticsService.trackEvent('page_view_enhanced', {
    page: '/home',
    page_type: 'marketing',
    language: language,
    user_agent: navigator.userAgent,
    screen_resolution: `${screen.width}x${screen.height}`,
    timestamp: new Date().toISOString(),
  });

  console.log(`📊 Home page view tracked: ${pageTitle} (${language})`);
}

/**
 * Set up event tracking for home page interactions
 */
function setupHomePageTracking(): void {
  // Track CTA button clicks
  const ctaButtons = document.querySelectorAll('[data-analytics="cta-button"]');
  ctaButtons.forEach((button) => {
    button.addEventListener('click', (event) => {
      const target = event.currentTarget as HTMLElement;
      const buttonId = target.getAttribute('data-button-id') || 'unknown-cta';

      analyticsService.trackButtonClick(buttonId, '/home', {
        button_text: target.textContent?.trim(),
        section: target.closest('section')?.id || 'unknown-section',
      });
    });
  });

  // Track language switcher
  const languageSwitcher = document.querySelector(
    '[data-analytics="language-switch"]'
  );
  if (languageSwitcher) {
    languageSwitcher.addEventListener('click', (event) => {
      const target = event.currentTarget as HTMLElement;
      const targetLang = target.getAttribute('data-target-lang') || 'unknown';

      analyticsService.trackEvent('language_switch', {
        page: '/home',
        from_language: document.documentElement.lang || 'en',
        to_language: targetLang,
      });
    });
  }

  // Track scroll depth (simple implementation)
  let maxScrollPercent = 0;
  const trackScrollDepth = () => {
    const scrollPercent = Math.round(
      (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
    );

    if (scrollPercent > maxScrollPercent) {
      maxScrollPercent = scrollPercent;

      // Track milestone scroll depths
      if (scrollPercent >= 25 && maxScrollPercent < 25) {
        analyticsService.trackEvent('scroll_depth', {
          page: '/home',
          depth: 25,
        });
      } else if (scrollPercent >= 50 && maxScrollPercent < 50) {
        analyticsService.trackEvent('scroll_depth', {
          page: '/home',
          depth: 50,
        });
      } else if (scrollPercent >= 75 && maxScrollPercent < 75) {
        analyticsService.trackEvent('scroll_depth', {
          page: '/home',
          depth: 75,
        });
      } else if (scrollPercent >= 90 && maxScrollPercent < 90) {
        analyticsService.trackEvent('scroll_depth', {
          page: '/home',
          depth: 90,
        });
      }
    }
  };

  // Throttled scroll tracking
  let scrollTimeout: number;
  window.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = window.setTimeout(trackScrollDepth, 100);
  });

  console.log('🏠 Home page event tracking initialized');
}

/**
 * Handle consent acceptance - called from CookieConsent component
 */
export function handleConsentAccepted(): void {
  trackHomePageView();
  setupHomePageTracking();
}

// Export for use in Astro scripts
export default {
  initializeHomeAnalytics,
  handleConsentAccepted,
};
