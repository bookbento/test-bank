// Analytics Testing Script
// Run this in browser console to test all analytics events

console.log('🧪 Starting Analytics Testing Suite...');

// Test 1: Check analytics service initialization
console.log('\n📊 Test 1: Analytics Service Initialization');
if (typeof window !== 'undefined' && window.analyticsService) {
  console.log('✅ Analytics service available globally');
  console.log('   - Enabled:', window.analyticsService.isEnabled());
  console.log('   - User Type:', window.analyticsService.getUserType());
} else {
  console.log('❌ Analytics service not found on window object');
}

// Test 2: Test manual event tracking
console.log('\n🎯 Test 2: Manual Event Tracking');
try {
  if (window.analyticsService) {
    window.analyticsService.trackEvent('test_manual_event', {
      test_type: 'manual',
      timestamp: new Date().toISOString(),
      test_data: { value: 42, category: 'testing' },
    });
    console.log('✅ Manual event tracked successfully');
  }
} catch (error) {
  console.error('❌ Manual event tracking failed:', error);
}

// Test 3: Test button click tracking
console.log('\n🖱️ Test 3: Button Click Tracking');
try {
  if (window.analyticsService) {
    window.analyticsService.trackButtonClick('test_button', '/test', {
      section: 'testing',
      button_type: 'primary',
    });
    console.log('✅ Button click tracked successfully');
  }
} catch (error) {
  console.error('❌ Button click tracking failed:', error);
}

// Test 4: Test navigation tracking
console.log('\n🧭 Test 4: Navigation Tracking');
try {
  if (window.analyticsService) {
    window.analyticsService.trackAppNavigation('test_from', 'test_to', {
      navigation_type: 'test',
      user_initiated: true,
    });
    console.log('✅ Navigation tracked successfully');
  }
} catch (error) {
  console.error('❌ Navigation tracking failed:', error);
}

// Test 5: Test page view tracking
console.log('\n📄 Test 5: Page View Tracking');
try {
  if (window.analyticsService) {
    window.analyticsService.trackPageView('/test-page', 'Test Page Title');
    console.log('✅ Page view tracked successfully');
  }
} catch (error) {
  console.error('❌ Page view tracking failed:', error);
}

// Test 6: Test user type changes
console.log('\n👤 Test 6: User Type Tracking');
try {
  if (window.analyticsService) {
    // Test guest user
    window.analyticsService.setGuestUser();
    console.log('✅ Guest user set:', window.analyticsService.getUserType());

    // Test authenticated user (mock)
    const mockUser = { uid: 'test-user-123' };
    window.analyticsService.setAuthenticatedUser(mockUser);
    console.log(
      '✅ Authenticated user set:',
      window.analyticsService.getUserType()
    );

    // Reset to guest
    window.analyticsService.setGuestUser();
    console.log(
      '✅ Reset to guest user:',
      window.analyticsService.getUserType()
    );
  }
} catch (error) {
  console.error('❌ User type tracking failed:', error);
}

// Test 7: Test cookie consent tracking
console.log('\n🍪 Test 7: Cookie Consent Tracking');
try {
  if (window.analyticsService) {
    window.analyticsService.trackCookieConsent('shown');
    window.analyticsService.trackCookieConsent('accepted');
    console.log('✅ Cookie consent events tracked successfully');
  }
} catch (error) {
  console.error('❌ Cookie consent tracking failed:', error);
}

// Test 8: Test app analytics functions
console.log('\n📱 Test 8: App Analytics Functions');
try {
  // These should be available if appAnalytics is imported
  if (window.trackFlashcardEvent) {
    window.trackFlashcardEvent('test_flashcard_event', {
      test: true,
      card_set: 'test-set',
    });
    console.log('✅ Flashcard event tracked successfully');
  } else {
    console.log(
      'ℹ️ App analytics functions not available on window (normal for production)'
    );
  }

  if (window.trackCardSetSelection) {
    window.trackCardSetSelection('test-card-set', {
      card_count: 10,
      language: 'test',
    });
    console.log('✅ Card set selection tracked successfully');
  }
} catch (error) {
  console.error('❌ App analytics tracking failed:', error);
}

// Test 9: Check for errors in console
console.log('\n⚠️ Test 9: Error Detection');
const originalError = console.error;
let errorCount = 0;
console.error = function (...args) {
  if (
    args.some(
      (arg) =>
        typeof arg === 'string' &&
        (arg.includes('analytics') ||
          arg.includes('Analytics') ||
          arg.includes('tracking') ||
          arg.includes('Firebase'))
    )
  ) {
    errorCount++;
    console.log(`❌ Analytics-related error detected: ${args.join(' ')}`);
  }
  originalError.apply(console, args);
};

// Restore original console.error after 5 seconds
setTimeout(() => {
  console.error = originalError;
  if (errorCount === 0) {
    console.log('✅ No analytics-related errors detected');
  } else {
    console.log(`⚠️ Found ${errorCount} analytics-related errors`);
  }
}, 5000);

// Test 10: Summary
console.log('\n📋 Test Summary');
console.log('✅ Analytics Testing Suite Complete');
console.log('📊 Check development console for detailed analytics logs');
console.log(
  '🏠 Visit /home to test marketing page analytics with cookie consent'
);
console.log(
  '📱 Use the flashcard app to test navigation and interaction analytics'
);
console.log('🔐 Try signing in/out to test authentication analytics');

// Export test functions to window for manual testing
window.testAnalytics = {
  trackManualEvent: () => {
    if (window.analyticsService) {
      window.analyticsService.trackEvent('manual_test_event', {
        timestamp: new Date().toISOString(),
        manual_test: true,
      });
    }
  },
  trackButtonTest: () => {
    if (window.analyticsService) {
      window.analyticsService.trackButtonClick('manual_test_button');
    }
  },
  trackPageTest: () => {
    if (window.analyticsService) {
      window.analyticsService.trackPageView('/manual-test', 'Manual Test Page');
    }
  },
};

console.log('\n🛠️ Manual Test Functions Available:');
console.log('   - testAnalytics.trackManualEvent()');
console.log('   - testAnalytics.trackButtonTest()');
console.log('   - testAnalytics.trackPageTest()');
