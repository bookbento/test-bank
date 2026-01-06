// Analytics Error Suppressor
// Prevents content blocker errors from cluttering the console in production

/**
 * Suppresses network errors from analytics and tracking scripts that are blocked by content blockers.
 * This is a cosmetic improvement - it doesn't affect functionality since analytics is gracefully degraded.
 */
export function suppressAnalyticsErrors(): void {
  if (typeof window === 'undefined' || import.meta.env.DEV) {
    return; // Only run in production browser environment
  }

  // Store original console.error for non-analytics errors
  const originalConsoleError = console.error;

  // List of patterns that indicate analytics/tracking script blocking
  const blockedScriptPatterns = [
    'googletagmanager.com',
    'google-analytics.com',
    'analytics.js',
    'gtag/js',
    'gtag.js',
    'ERR_BLOCKED_BY_CLIENT',
    'ERR_BLOCKED_BY_CONTENT_BLOCKER',
    'net::ERR_BLOCKED',
  ];

  // Override console.error to filter out analytics-related errors
  console.error = function (...args: any[]) {
    // Convert arguments to string for pattern matching
    const errorMessage = args.join(' ').toLowerCase();

    // Check if error is related to blocked analytics scripts
    const isAnalyticsError = blockedScriptPatterns.some((pattern) =>
      errorMessage.includes(pattern.toLowerCase())
    );

    // Only log if it's not an analytics blocking error
    if (!isAnalyticsError) {
      originalConsoleError.apply(console, args);
    }
    // Silently ignore analytics blocking errors
  };

  // Also suppress network resource loading errors via error event listener
  window.addEventListener(
    'error',
    (event) => {
      if (event.target instanceof HTMLScriptElement) {
        const scriptSrc = event.target.src || '';

        // Check if it's an analytics script that failed to load
        const isAnalyticsScript = blockedScriptPatterns.some((pattern) =>
          scriptSrc.includes(pattern)
        );

        if (isAnalyticsScript) {
          // Prevent the error from appearing in console
          event.preventDefault();
          event.stopPropagation();

          // Log in dev mode for debugging
          if (import.meta.env.DEV) {
            console.log(
              `[Dev] Analytics script blocked: ${scriptSrc} (this is expected)`
            );
          }
        }
      }
    },
    true
  ); // Use capture phase to catch errors early
}
