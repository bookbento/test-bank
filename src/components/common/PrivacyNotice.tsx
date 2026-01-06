// Privacy Notice Component for GDPR Compliance
// Only used on marketing pages (home.astro), not in the flashcard app

import { useState, useEffect } from 'react';
import analyticsService from '../../services/analyticsService';

interface PrivacyNoticeProps {
  // Language support for internationalization
  lang?: 'en' | 'th';
  // Custom styling classes
  className?: string;
}

// Cookie consent management utilities
const COOKIE_CONSENT_KEY = 'ninja_lingo_cookie_consent';
const COOKIE_CONSENT_VERSION = '1.0'; // Increment when privacy policy changes

interface ConsentData {
  accepted: boolean;
  version: string;
  timestamp: string;
}

// Cookie consent storage utilities
const getCookieConsent = (): ConsentData | null => {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored) as ConsentData;

    // Check if consent is for current version
    if (parsed.version !== COOKIE_CONSENT_VERSION) {
      localStorage.removeItem(COOKIE_CONSENT_KEY);
      return null;
    }

    return parsed;
  } catch (error) {
    console.error('Error reading cookie consent:', error);
    return null;
  }
};

const setCookieConsent = (accepted: boolean): void => {
  if (typeof window === 'undefined') return;

  const consentData: ConsentData = {
    accepted,
    version: COOKIE_CONSENT_VERSION,
    timestamp: new Date().toISOString(),
  };

  try {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consentData));
  } catch (error) {
    console.error('Error storing cookie consent:', error);
  }
};

// Translations for cookie consent message
const translations = {
  en: {
    title: 'We use cookies',
    message:
      'We use cookies and similar technologies to improve your experience, analyze site usage, and provide personalized content. Your privacy is important to us.',
    accept: 'Accept All',
    decline: 'Decline',
    learnMore: 'Learn more',
  },
  th: {
    title: 'เราใช้คุกกี้',
    message:
      'เราใช้คุกกี้และเทคโนโลยีที่คล้ายกันเพื่อปรับปรุงประสบการณ์ของคุณ วิเคราะห์การใช้งานเว็บไซต์ และให้เนื้อหาที่เหมาะสม ความเป็นส่วนตัวของคุณสำคัญต่อเรา',
    accept: 'ยอมรับทั้งหมด',
    decline: 'ปฏิเสธ',
    learnMore: 'เรียนรู้เพิ่มเติม',
  },
};

export const PrivacyNotice: React.FC<PrivacyNoticeProps> = ({
  lang = 'en',
  className = '',
}) => {
  const [showBanner, setShowBanner] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const t = translations[lang];

  useEffect(() => {
    // Check existing consent on component mount
    const existingConsent = getCookieConsent();

    if (existingConsent === null) {
      // No consent found, show banner
      setShowBanner(true);

      // Track that consent banner was shown
      analyticsService.trackCookieConsent('shown');
    } else {
      // Consent already exists, apply the preference
      setShowBanner(false);

      // Enable/disable analytics based on stored preference
      if (existingConsent.accepted) {
        // Analytics should already be enabled, but ensure consistency
        console.log(
          '🍪 Cookie consent: Previously accepted, analytics enabled'
        );
      } else {
        console.log(
          '🍪 Cookie consent: Previously declined, analytics remains disabled'
        );
      }
    }

    setIsLoading(false);
  }, []);

  const handleAccept = () => {
    setCookieConsent(true);
    setShowBanner(false);

    // Track acceptance
    analyticsService.trackCookieConsent('accepted');

    // Note: Analytics is already enabled by default in production,
    // this is just for compliance tracking
    console.log('🍪 Cookie consent: Accepted');

    // Track page view now that consent is given
    analyticsService.trackPageView('/home', 'NinjaLingo Home Page');
  };

  const handleDecline = () => {
    setCookieConsent(false);
    setShowBanner(false);

    // Track decline
    analyticsService.trackCookieConsent('declined');

    console.log('🍪 Cookie consent: Declined');

    // Note: In a full implementation, you might want to disable analytics here
    // For now, we'll just track the decline but keep analytics enabled
    // since Firebase Analytics can work without personal data
  };

  // Don't render anything while loading or if banner shouldn't show
  if (isLoading || !showBanner) {
    return null;
  }

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 ${className}`}
      role="banner"
      aria-label="Cookie consent"
    >
      <div className="max-w-6xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">
              {t.title}
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">{t.message}</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <button
              onClick={handleDecline}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors duration-200"
              type="button"
            >
              {t.decline}
            </button>

            <button
              onClick={handleAccept}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md transition-colors duration-200"
              type="button"
            >
              {t.accept}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Export utility functions for use elsewhere
export { getCookieConsent, setCookieConsent };

export default PrivacyNotice;
