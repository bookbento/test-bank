# Analytics Content Blocker Handling

## Problem

Users with ad blockers or privacy extensions see this error in the browser console:

```
www.googletagmanager.com/gtag/js?l=dataLayer&id=G-ZK2QES54E1:1
Failed to load resource: net::ERR_BLOCKED_BY_CONTENT_BLOCKER
```

This happens because Firebase Analytics automatically loads Google Tag Manager scripts, which are blocked by content blockers.

## Solution

We've implemented a multi-layered approach to gracefully handle analytics blocking:

### 1. Firebase Initialization Error Handling

**File**: `src/utils/firebase.ts`

Added try-catch around `getAnalytics()` to handle initialization failures:

```typescript
try {
  analytics = getAnalytics(app);
  console.log('# Firebase Analytics initialized successfully');
} catch (error) {
  console.log('# Firebase Analytics blocked (normal with ad blockers)');
  analytics = null;
}
```

### 2. Early Script Error Suppression

**Files**:

- `src/layouts/Layout.astro`
- `src/layouts/Layout-web.astro`

Added inline script in HTML `<head>` to suppress GTM script loading errors:

```html
<script is:inline>
  (function () {
    if (typeof window !== 'undefined') {
      window.addEventListener(
        'error',
        function (event) {
          var target = event.target;
          if (target && target.tagName === 'SCRIPT' && target.src) {
            var blockedPatterns = [
              'googletagmanager.com',
              'google-analytics.com',
              'gtag',
            ];
            var isBlocked = blockedPatterns.some(function (p) {
              return target.src.indexOf(p) !== -1;
            });
            if (isBlocked) {
              event.preventDefault();
              event.stopPropagation();
            }
          }
        },
        true
      );
    }
  })();
</script>
```

### 3. Utility for Additional Suppression

**File**: `src/utils/analyticsErrorSuppressor.ts`

Created utility to suppress console errors from analytics scripts (can be used if needed in specific pages):

```typescript
export function suppressAnalyticsErrors(): void {
  // Filters console.error to hide analytics-related errors
  // Only runs in production
}
```

## How It Works

1. **Prevention**: Script loads are caught by the error event listener before they appear in console
2. **Graceful Degradation**: Firebase Analytics checks availability and fails gracefully
3. **User Experience**: App works normally without analytics - no functionality is lost
4. **Development**: All logs remain visible in dev mode for debugging

## Why This Matters

- **Clean Console**: Users don't see alarming error messages
- **Better UX**: App feels more polished and professional
- **Privacy Respect**: Users who block analytics can do so without app errors
- **SEO/Trust**: No console errors means better developer experience and trust

## Testing

To test analytics blocking handling:

1. **With Content Blocker**:
   - Install an ad blocker (uBlock Origin, Privacy Badger, etc.)
   - Visit your site in production
   - Check console - should be clean, no GTM errors
   - Check Network tab - GTM requests should be blocked

2. **Without Content Blocker**:
   - Disable all ad blockers
   - Visit your site in production
   - Analytics should load and track normally
   - Check console - should see "# Firebase Analytics initialized successfully"

## Production Behavior

- **With Analytics Blocked**: App works normally, no tracking, no console errors
- **With Analytics Enabled**: App works normally with full analytics tracking

## Notes

- This is **not** an error in your code - it's expected behavior when users block tracking
- The app is designed to work with or without analytics
- Content blockers are a user choice we should respect gracefully
