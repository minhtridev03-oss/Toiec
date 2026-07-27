import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { translate } from '../locales/messages';

const LocaleContext = createContext(undefined);

const SUPPORTED_LOCALES = new Set(['vi', 'en']);

export function LocaleProvider({ children }) {
  const [locale, setLocaleState] = useState(() => {
    const savedLocale = localStorage.getItem('locale');
    return SUPPORTED_LOCALES.has(savedLocale) ? savedLocale : 'vi';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.lang = locale;
    root.classList.toggle('locale-vi', locale === 'vi');
    root.classList.toggle('locale-en', locale === 'en');
    localStorage.setItem('locale', locale);
  }, [locale]);

  const setLocale = (nextLocale) => {
    if (SUPPORTED_LOCALES.has(nextLocale)) setLocaleState(nextLocale);
  };

  const value = useMemo(() => ({
    locale,
    setLocale,
    t: (key, fallback) => translate(locale, key, fallback),
  }), [locale]);

  return (
    <LocaleContext.Provider value={value}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (context === undefined) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
}
