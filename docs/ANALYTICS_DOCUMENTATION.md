# Google Analytics Implementation Documentation - NinjaLingo

## 📋 Overview

This document describes the comprehensive Google Analytics implementation for the NinjaLingo flashcard application. The analytics system tracks user behavior across marketing pages and the core application while respecting privacy requirements.

## 🏗️ Architecture

### Core Components

1. **Analytics Service** (`src/services/analyticsService.ts`)
   - Centralized analytics management
   - Firebase Analytics integration
   - Development/production mode handling
   - User type management (guest/authenticated)

2. **Privacy Notice Component** (`src/components/common/PrivacyNotice.tsx`)
   - GDPR-compliant cookie consent banner
   - Multi-language support (English/Thai)
   - LocalStorage persistence with versioning

3. **Analytics Utilities**
   - `src/utils/homeAnalytics.ts` - Marketing page tracking
   - `src/utils/appAnalytics.ts` - Flashcard app tracking
   - `src/hooks/useAnalytics.ts` - React hook for analytics

## 🎯 Event Categories

### Core Events

#### Page Tracking

- **`page_view`** - Basic page view tracking

  ```javascript
  {
    user_type: 'guest' | 'authenticated',
    page_title: string,
    page_location: string,
    page_path: string
  }
  ```

- **`page_view_enhanced`** - Enhanced page view with metadata

  ```javascript
  {
    page: string,
    page_type: 'marketing' | 'application',
    language: 'en' | 'th',
    screen_resolution: string,
    timestamp: string
  }
  ```

#### App Navigation

- **`app_state_change`** - Navigation between app screens

  ```javascript
  {
    from_state: 'dashboard' | 'review' | 'complete' | 'card-sets' | 'profile' | 'subscription',
    to_state: 'dashboard' | 'review' | 'complete' | 'card-sets' | 'profile' | 'subscription',
    navigation_type: 'manual' | 'automatic',
    trigger?: 'session_complete' | 'session_active' | 'no_session'
  }
  ```

- **`screen_view`** - Screen display within flashcard app

  ```javascript
  {
    screen_name: string,
    has_session: boolean,
    session_progress: {
      current_index: number,
      total_cards: number,
      reviewed_cards: number
    } | null
  }
  ```

#### User Interactions

- **`button_click`** - Button click tracking

  ```javascript
  {
    button_id: string,
    page: string,
    button_text?: string,
    section?: string
  }
  ```

### Authentication Events

#### Sign In/Out

- **`sign_in`** - User authentication

  ```javascript
  {
    user_id: string,
    sign_in_method: 'google.com' | string,
    is_new_user: boolean,
    timestamp: string
  }
  ```

- **`sign_out`** - User sign out

  ```javascript
  {
    previous_user_type: 'authenticated',
    timestamp: string
  }
  ```

#### Auth System Events

- **`auth_listener_initialized`** - Auth monitoring setup
- **`auth_state_changed`** - Firebase auth state transitions
- **`user_profile_auto_saved`** - Profile save on sign-in
- **`user_profile_save_failed`** - Profile save errors

### Cookie Consent Events

- **`cookie_consent_shown`** - Banner displayed
- **`cookie_consent_accepted`** - User accepts tracking
- **`cookie_consent_declined`** - User declines tracking

### Flashcard App Events

#### App Lifecycle

- **`app_entry`** - App initialization

  ```javascript
  {
    page: '/',
    page_type: 'application',
    user_type: 'guest' | 'authenticated',
    screen_resolution: string,
    referrer: string,
    timestamp: string
  }
  ```

- **`flashcard_app_initialized`** - React app startup

  ```javascript
  {
    initialization_mode: 'preload' | 'normal',
    preload_card_set: string | null,
    initial_route: string
  }
  ```

- **`app_hydration_complete`** - React hydration timing

  ```javascript
  {
    load_time_ms: number,
    page: '/'
  }
  ```

#### Learning Events

- **`card_set_selected`** - Card set choice

  ```javascript
  {
    card_set_id: string,
    selection_type: 'preload' | 'manual',
    card_set_name: string,
    card_count: number,
    language: string
  }
  ```

- **`review_session_start`** - Study session begins
- **`review_session_complete`** - Study session ends
- **`card_set_preload_complete`** - Direct URL card set loading

#### Performance Events

- **`scroll_depth`** - Scroll tracking on marketing pages

  ```javascript
  {
    page: '/home',
    depth: 25 | 50 | 75 | 90
  }
  ```

- **`language_switch`** - Language change tracking

  ```javascript
  {
    page: '/home',
    from_language: 'en' | 'th',
    to_language: 'en' | 'th'
  }
  ```

## 🔧 Implementation Guide

### Adding New Events

1. **Define Event in Types** (`src/types/analytics.ts`)

   ```typescript
   export const ANALYTICS_EVENTS = {
     // ... existing events
     NEW_EVENT: 'new_event_name',
   } as const;
   ```

2. **Track the Event**

   ```typescript
   import analyticsService from '../services/analyticsService';

   analyticsService.trackEvent('new_event_name', {
     // event parameters
     user_type: analyticsService.getUserType(),
     timestamp: new Date().toISOString(),
   });
   ```

3. **Use Helper Methods**

   ```typescript
   // For button clicks
   analyticsService.trackButtonClick('button_id', '/page', { extra: 'data' });

   // For navigation
   analyticsService.trackAppNavigation('from', 'to', { context: 'manual' });

   // For cookie consent
   analyticsService.trackCookieConsent('accepted');
   ```

### Page-Level Integration

#### Marketing Pages (with Cookie Consent)

```astro
---
import PrivacyNotice from '../components/common/PrivacyNotice.tsx';
---

<Layout>
  <main><!-- content --></main>
  <PrivacyNotice lang={lang} client:load />
</Layout>

<script>
  import { initializeHomeAnalytics } from '../utils/homeAnalytics';

  function initializePage() {
    initializeHomeAnalytics();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePage);
  } else {
    initializePage();
  }
</script>
```

#### App Pages (no Cookie Consent)

```astro
<script>
  import { initializeAppAnalytics } from '../utils/appAnalytics';

  function initializeApp() {
    initializeAppAnalytics();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
  } else {
    initializeApp();
  }
</script>
```

#### React Component Integration

```tsx
import { useEffect } from 'react';
import analyticsService from '../services/analyticsService';

export const MyComponent = () => {
  useEffect(() => {
    // Track component mount
    analyticsService.trackEvent('component_mounted', {
      component_name: 'MyComponent',
    });
  }, []);

  const handleButtonClick = () => {
    analyticsService.trackButtonClick('my_button', window.location.pathname);
    // ... button logic
  };

  return <button onClick={handleButtonClick}>Click me</button>;
};
```

## 🔒 Privacy & Compliance

### Cookie Consent Implementation

**Marketing Pages Only**: Cookie consent is required for `/home` and `/th/home` pages.

**App Pages**: No cookie consent required as these are core functionality.

### Data Storage

1. **Analytics Consent**: Stored in `localStorage` with versioning

   ```javascript
   {
     accepted: boolean,
     version: '1.0',
     timestamp: string
   }
   ```

2. **User Privacy**:
   - Guest users: No personal data stored
   - Authenticated users: Only Firebase UID (hashed)
   - No IP addresses or personal information collected

### GDPR Compliance

- ✅ Explicit consent required for marketing pages
- ✅ Consent can be withdrawn (decline button)
- ✅ Data minimization (only essential metrics)
- ✅ No cross-site tracking
- ✅ Consent versioning for policy updates

## 🧪 Testing & Debugging

### Development Mode

**Global Access**: Analytics service exposed on `window` object

```javascript
// Test analytics service
window.analyticsService.trackEvent('test', { debug: true });
window.analyticsService.isEnabled(); // false in dev
window.analyticsService.getUserType(); // 'guest' or 'authenticated'

// Test app functions
window.trackFlashcardEvent('test', { data: 'test' });
window.trackCardSetSelection('test-set', { cards: 10 });
```

**Console Logging**: All events logged with 🎯 prefix

```
🎯 [DEV] Event: page_view { page: '/home', user_type: 'guest', ... }
📄 [DEV] Page: /home (NinjaLingo Home)
```

### Production Mode

**Firebase Analytics**: Events sent to Google Analytics dashboard

**No Console Logs**: Events not visible in browser console

**Security**: Analytics service not exposed globally

### Testing Tools

1. **Test Page**: Visit `/analytics-test.html` for interactive testing
2. **Browser Console**: Use global functions in development
3. **Firebase Dashboard**: View real analytics in production
4. **Network Tab**: See analytics requests in browser DevTools

### Common Issues

#### Development

- Analytics service not available globally → Check imports
- Events not firing → Check console for errors
- Cookie consent not working → Clear localStorage

#### Production

- No events in Firebase → Check measurement ID
- Events missing parameters → Verify event structure
- High bounce rate → Check page load performance

## 📊 Firebase Analytics Configuration

### Measurement ID

```javascript
PUBLIC_FIREBASE_MEASUREMENT_ID = G - ZK2QES54E1;
```

### Environment Setup

```bash
# Development
PUBLIC_FIREBASE_MEASUREMENT_ID=G-ZK2QES54E1

# Production (automatically provided by Firebase Hosting)
# No manual configuration needed
```

### Analytics Initialization

- **Development**: Disabled with console logging
- **Production**: Enabled with real tracking
- **Browser Support**: Automatic fallback for unsupported browsers
- **Content Blockers**: Graceful degradation when blocked

## 🚀 Best Practices

### Event Naming

- Use snake_case for event names
- Be descriptive but concise
- Group related events with prefixes

### Parameters

- Always include `user_type` for segmentation
- Add `timestamp` for time-based analysis
- Use consistent parameter names across events
- Limit custom parameters to essential data

### Performance

- Track asynchronously to avoid blocking UI
- Batch events when possible
- Avoid tracking every user interaction
- Focus on meaningful user actions

### Privacy

- Never track personal information
- Use hashed/anonymized identifiers
- Respect user consent preferences
- Implement data retention policies

## 🔮 Future Enhancements

### Planned Features

- [ ] Detailed learning analytics (study patterns, difficulty metrics)
- [ ] Error and performance monitoring integration
- [ ] A/B testing framework for features
- [ ] Real-time analytics dashboard for admins
- [ ] Cross-device user journey tracking

### Analytics Expansion

- [ ] Conversion funnel analysis
- [ ] User retention cohort analysis
- [ ] Content effectiveness metrics
- [ ] Mobile app analytics (if developed)
- [ ] Social sharing tracking

---

**Last Updated**: October 3, 2025  
**Version**: 1.0  
**Contact**: Development Team
