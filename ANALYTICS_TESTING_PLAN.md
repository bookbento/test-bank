# Analytics Testing Plan - NinjaLingo

## 🎯 Testing Objectives

Verify that all analytics implementations work correctly across:

- Marketing pages (with cookie consent)
- Flashcard app (without cookie consent)
- Authentication flows
- Navigation and interactions

## 📋 Test Scenarios

### 1. Marketing Page Analytics (`/home` & `/th/home`)

**Expected Behavior:**

- Cookie consent banner appears on first visit
- No analytics until consent is given
- Page view tracked after consent
- Button clicks and scroll depth tracked
- Language switching tracked

**Test Steps:**

1. Visit `/home` in incognito browser
2. Verify cookie consent banner appears
3. Click "Accept" - verify page view fires
4. Click various buttons - verify button tracking
5. Scroll to different sections - verify scroll depth
6. Switch language - verify language tracking

### 2. Flashcard App Analytics (`/`)

**Expected Behavior:**

- Immediate analytics tracking (no consent required)
- App initialization tracked
- Navigation between screens tracked
- Screen view events fired
- Loading time metrics captured

**Test Steps:**

1. Visit `/` (flashcard app)
2. Verify app initialization event
3. Navigate between Dashboard, Card Sets, Review screens
4. Verify navigation tracking fires
5. Check screen view events

### 3. Authentication Analytics

**Expected Behavior:**

- Auth listener initialization tracked
- Sign-in events with provider info
- User type changes (guest ↔ authenticated)
- Profile save success/failure events
- Sign-out events

**Test Steps:**

1. Sign in with Google
2. Verify sign-in event with provider data
3. Check user profile save events
4. Sign out
5. Verify sign-out events

### 4. Card Set and Review Analytics

**Expected Behavior:**

- Card set selection tracked
- Review session start/end events
- Progress tracking during sessions
- Preload tracking for direct card set URLs

**Test Steps:**

1. Select a card set from Dashboard
2. Verify card set selection event
3. Start review session
4. Verify session start event
5. Complete session
6. Verify session completion with stats

## 🔍 Analytics Events to Verify

### Core Events

- `page_view` - All page loads
- `app_entry` - App initialization
- `screen_view` - Screen changes within app
- `button_click` - Button interactions
- `app_state_change` - Navigation events

### Authentication Events

- `auth_listener_initialized` - Auth setup
- `auth_state_changed` - Auth state transitions
- `sign_in` - User sign in with method
- `sign_out` - User sign out
- `user_profile_auto_saved` - Profile operations

### Cookie Consent Events

- `cookie_consent_shown` - Banner displayed
- `cookie_consent_accepted` - User accepts
- `cookie_consent_declined` - User declines

### Flashcard Events

- `flashcard_app_initialized` - App startup
- `card_set_selected` - Card set choice
- `review_session_start` - Study begins
- `review_session_complete` - Study ends
- `card_set_preload_complete` - Direct URL loads

## 🧪 Testing Tools

### Browser Console Testing

1. Open browser DevTools → Console
2. Look for analytics event logs (prefixed with 📊, 🎯, 📄)
3. All events show detailed parameters in dev mode

### Analytics Test Page

- Visit `/analytics-test.html`
- Use interactive test buttons
- Monitor console output
- Export logs for analysis

### Manual Browser Testing

```javascript
// Test analytics service availability
window.analyticsService.isEnabled();
window.analyticsService.getUserType();

// Test manual events
window.analyticsService.trackEvent('test_event', { test: true });

// Test app functions (if available)
window.trackFlashcardEvent('test', { data: 'test' });
```

## ✅ Success Criteria

### Development Mode

- All events logged to console with 🎯 prefix
- Event parameters properly structured
- No JavaScript errors in console
- Analytics service disabled message shown

### Production Mode

- Events sent to Firebase Analytics
- User types properly distinguished
- Cookie consent respected
- Performance metrics captured

## 🚨 Common Issues to Check

### Cookie Consent Issues

- Banner not appearing on marketing pages
- Analytics firing before consent
- Consent state not persisting

### App Integration Issues

- Analytics service not available globally
- Events not firing on navigation
- Missing event parameters

### Authentication Issues

- User type not updating on sign-in/out
- Profile save events missing
- Auth errors not tracked

## 📊 Expected Console Output (Dev Mode)

```
🧪 Analytics service exposed globally for testing
🧪 App analytics functions exposed globally for testing
📊 Analytics disabled (dev mode or unsupported)
🎯 [DEV] Event: page_view { page: '/home', ... }
🎯 [DEV] Event: app_entry { page: '/', ... }
🎯 [DEV] Event: screen_view { screen_name: 'dashboard', ... }
```

## 🔧 Debugging Commands

```javascript
// Check service status
console.log('Analytics enabled:', window.analyticsService?.isEnabled());
console.log('User type:', window.analyticsService?.getUserType());

// Test tracking functions
window.analyticsService?.trackEvent('debug_test', { debug: true });

// Check for errors
console.error = (function (original) {
  return function (...args) {
    if (args.some((arg) => String(arg).includes('analytics'))) {
      console.log('🚨 Analytics error detected:', args);
    }
    return original.apply(console, args);
  };
})(console.error);
```

This comprehensive testing plan ensures all analytics implementations work correctly across all scenarios.
