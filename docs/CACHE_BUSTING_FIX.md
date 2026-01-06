# Cache Busting Fix for card_set.json

## Problem

After deployment, the `card_set.json` file was not loading the new data in production, even though it worked correctly in development. This was caused by browser/CDN caching.

## Root Cause

1. **No Cache Headers**: The Firebase hosting configuration (`firebase.json`) only had cache headers for `/assets/**`, not for `/data/**`
2. **Browser Caching**: Browsers were caching the old `card_set.json` file indefinitely
3. **CDN Caching**: Firebase CDN might also cache the files

## Solution Applied

### 1. Added Cache Control Headers for Data Files

Updated `firebase.json` to include cache headers for `/data/**`:

```json
{
  "source": "/data/**",
  "headers": [
    {
      "key": "Cache-Control",
      "value": "public, max-age=300, must-revalidate"
    }
  ]
}
```

**What this does**:

- `max-age=300`: Cache for 5 minutes (300 seconds)
- `must-revalidate`: Must check with server when cache expires
- This ensures fresh data while still providing some caching benefit

### 2. Added Cache-Busting Query Parameter

Updated `useCardSets.ts` to append a timestamp to force fresh data:

```typescript
const cacheBuster = `?v=${Date.now()}`;
const response = await fetch(`/data/card_set.json${cacheBuster}`);
```

**What this does**:

- Adds unique query parameter on each page load
- Forces browser to fetch fresh data
- Works alongside cache headers as a double-layer protection

## Deployment Steps

To deploy these fixes:

1. **Build the project**:

   ```bash
   pnpm run build
   ```

2. **Deploy to Firebase**:

   ```bash
   firebase deploy
   ```

3. **Clear CDN Cache** (if needed):
   - Go to Firebase Console → Hosting
   - Click on your site
   - Click "Release History"
   - Find the latest release and click "..." → "Invalidate Cache"

## For Users with Cached Data

Users who already have the old data cached can:

1. **Hard Refresh**:
   - Chrome/Firefox: `Cmd + Shift + R` (Mac) or `Ctrl + Shift + R` (Windows)
   - Safari: `Cmd + Option + E` (Clear cache) then `Cmd + R`

2. **Clear Site Data**:
   - Chrome: Developer Tools → Application → Clear Storage
   - Firefox: Developer Tools → Storage → Clear All
   - Safari: Develop → Empty Caches

3. **Wait 5 minutes**: After the new deployment, the cache will expire automatically

## Verification

To verify the fix is working:

1. Open browser DevTools → Network tab
2. Reload the page
3. Look for `card_set.json` request
4. Check the response headers for `Cache-Control: public, max-age=300, must-revalidate`
5. Check the request URL includes `?v=` timestamp parameter

## Future Considerations

### Option 1: Version-Based Cache Busting (Recommended for Production)

Instead of `Date.now()`, use app version:

```typescript
// In useCardSets.ts
const APP_VERSION = '1.0.0'; // Update this when card_set.json changes
const response = await fetch(`/data/card_set.json?v=${APP_VERSION}`);
```

**Pros**:

- Users benefit from caching between page refreshes
- Only invalidates when you update the version
- More predictable caching behavior

**Cons**:

- Need to remember to update version when data changes

### Option 2: Build-Time Hash (Best Practice)

Generate a hash during build and inject it:

```typescript
// During build, generate hash of card_set.json
// Then inject it into the code
const CARD_SET_HASH = '__CARD_SET_HASH__'; // Replaced at build time
const response = await fetch(`/data/card_set.json?v=${CARD_SET_HASH}`);
```

**Pros**:

- Automatic invalidation when data changes
- Optimal caching behavior
- No manual version management

**Cons**:

- Requires build script changes

## Current Implementation Status

✅ **Implemented**: Cache headers + Date.now() cache buster
🔄 **For Later**: Consider version-based or hash-based approach for better performance

## Testing Checklist

- [ ] Build and deploy to Firebase
- [ ] Open production site in incognito mode
- [ ] Verify `card_set.json` loads with latest data
- [ ] Check Network tab for cache headers
- [ ] Test on different browsers (Chrome, Safari, Firefox)
- [ ] Verify old users can see new data after hard refresh
- [ ] Wait 5 minutes and verify cache revalidation works

## Related Files

- `/firebase.json` - Hosting configuration with cache headers
- `/src/hooks/useCardSets.ts` - Hook that loads card sets
- `/public/data/card_set.json` - Card sets data file
- `/src/utils/cardSetLoader.ts` - Individual card data loader
