// Simple i18n utilities based on Astro documentation

export const languages = {
  en: 'English',
  th: 'ไทย',
};

export const defaultLang = 'en';
export type Lang = keyof typeof languages;

// Get language from URL
export function getLangFromUrl(url: URL): Lang {
  const [, lang] = url.pathname.split('/');
  if (lang in languages) return lang as Lang;
  return defaultLang;
}

// Translation helper
export function useTranslations(lang: Lang) {
  return function t(_key: string, translations: Record<Lang, string>) {
    return translations[lang] || translations[defaultLang];
  };
}

// Get preferred language from browser
export function getPreferredLanguage(): Lang {
  if (typeof navigator === 'undefined') return defaultLang;

  const browserLanguages = navigator.languages || [navigator.language];

  for (const lang of browserLanguages) {
    if (lang === 'th' || lang.startsWith('th-')) return 'th';
    if (lang === 'en' || lang.startsWith('en-')) return 'en';
  }

  return defaultLang;
}

// Path translation helper
export function useTranslatedPath(lang: Lang) {
  return function translatePath(path: string, targetLang: Lang = lang) {
    // English (default) doesn't need prefix
    if (targetLang === defaultLang) {
      return path;
    }
    // Other languages get prefix
    return `/${targetLang}${path}`;
  };
}
