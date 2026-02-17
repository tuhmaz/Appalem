import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { initI18n, setLocale as persistLocale, getLocale, type Locale } from '@/i18n/i18n';

type LocaleContextValue = {
  locale: Locale;
  ready: boolean;
  setLocale: (locale: Locale) => Promise<void>;
};

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getLocale());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    initI18n().then(current => {
      if (!mounted) return;
      setLocaleState(current);
      setReady(true);
    }).catch(() => {
      if (!mounted) return;
      setReady(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const setLocale = async (next: Locale) => {
    await persistLocale(next);
    setLocaleState(next);
  };

  const value = useMemo(() => ({ locale, ready, setLocale }), [locale, ready]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error('useLocale must be used within LocaleProvider');
  }
  return ctx;
}