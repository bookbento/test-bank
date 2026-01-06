// Analytics for Flashcard App Pages
// Unlike home pages, these don't require cookie consent since they're core app functionality

import analyticsService from '../services/analyticsService';

/**
 * Initialize analytics tracking for the main flashcard app
 * This runs on /index.astro (the app entry point)
 */
export function initializeAppAnalytics(): void {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAppAnalytics);
    return;
  }

  console.log('📱 Initializing app analytics...');

  // Track app entry page view
  trackAppPageView();

  // Set up app-level event tracking
  setupAppLevelTracking();
}

/**
 * Track the main app page view (index.astro)
 * No cookie consent needed for core app functionality
 */
function trackAppPageView(): void {
  const pageTitle = document.title || 'NinjaLingo Flashcard App';

  // Track basic page view
  analyticsService.trackPageView('/', pageTitle);

  // Track enhanced page view with app-specific metadata
  analyticsService.trackEvent('app_entry', {
    page: '/',
    page_type: 'application',
    user_type: analyticsService.getUserType(),
    screen_resolution: `${screen.width}x${screen.height}`,
    user_agent: navigator.userAgent,
    timestamp: new Date().toISOString(),
    referrer: document.referrer || 'direct',
  });

  console.log(`📱 App page view tracked: ${pageTitle}`);
}

/**
 * Set up tracking for app-level interactions
 * These are events that happen before the React app fully loads
 */
function setupAppLevelTracking(): void {
  // Track loading screen interactions
  const loadingScreen = document.getElementById('loading-screen');
  if (loadingScreen) {
    // Track how long loading screen is visible
    const startTime = Date.now();

    // Monitor when loading screen is hidden (when React hydrates)
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === 'attributes' &&
          mutation.attributeName === 'style'
        ) {
          const target = mutation.target as HTMLElement;
          if (target.style.display === 'none') {
            const loadTime = Date.now() - startTime;

            analyticsService.trackEvent('app_hydration_complete', {
              load_time_ms: loadTime,
              page: '/',
            });

            console.log(`📱 App hydration tracked: ${loadTime}ms`);
            observer.disconnect();
          }
        }
      });
    });

    observer.observe(loadingScreen, {
      attributes: true,
      attributeFilter: ['style'],
    });
  }

  // Track any pre-hydration errors
  window.addEventListener('error', (event) => {
    analyticsService.trackEvent('app_error_pre_hydration', {
      error_message: event.message,
      error_source: event.filename,
      error_line: event.lineno,
      page: '/',
    });
  });

  console.log('📱 App-level event tracking initialized');
}

/**
 * Track app state changes (called from FlashcardApp component)
 * This will be used by the main React app to track navigation
 */
export function trackAppStateChange(
  fromState: string,
  toState: string,
  additionalProps?: Record<string, any>
): void {
  analyticsService.trackAppNavigation(fromState, toState, {
    page: '/',
    user_type: analyticsService.getUserType(),
    timestamp: new Date().toISOString(),
    ...additionalProps,
  });
}

/**
 * Track flashcard app interactions
 * These are specific to the flashcard learning functionality
 */
export function trackFlashcardEvent(
  eventType: string,
  properties: Record<string, any> = {}
): void {
  analyticsService.trackEvent(eventType, {
    page: '/',
    category: 'flashcard_interaction',
    user_type: analyticsService.getUserType(),
    timestamp: new Date().toISOString(),
    ...properties,
  });
}

/**
 * Track card set selection
 */
export function trackCardSetSelection(
  cardSetId: string,
  cardSetInfo?: Record<string, any>
): void {
  analyticsService.trackEvent('card_set_selected', {
    card_set_id: cardSetId,
    page: '/',
    user_type: analyticsService.getUserType(),
    ...cardSetInfo,
  });
}

/**
 * Track review session events
 */
export function trackReviewSession(
  action: 'start' | 'complete' | 'pause',
  sessionData?: Record<string, any>
): void {
  analyticsService.trackEvent(`review_session_${action}`, {
    page: '/',
    session_type: 'flashcard_review',
    user_type: analyticsService.getUserType(),
    timestamp: new Date().toISOString(),
    ...sessionData,
  });
}

// Expose app analytics functions globally in development for testing
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  (window as any).trackAppStateChange = trackAppStateChange;
  (window as any).trackFlashcardEvent = trackFlashcardEvent;
  (window as any).trackCardSetSelection = trackCardSetSelection;
  (window as any).trackReviewSession = trackReviewSession;
  console.log('🧪 App analytics functions exposed globally for testing');
}

// Export for use in Astro and React components
export default {
  initializeAppAnalytics,
  trackAppStateChange,
  trackFlashcardEvent,
  trackCardSetSelection,
  trackReviewSession,
};
