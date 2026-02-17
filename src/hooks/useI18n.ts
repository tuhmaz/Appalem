import { useEffect, useState } from 'react';
import { initI18n, getLocale, type Locale } from '@/i18n/i18n';

export function useI18n() {
  const [ready, setReady] = useState(false);
  const [locale, setLocaleState] = useState<Locale>(getLocale());

  useEffect(() => {
    let mounted = true;
    initI18n()
      .then(current => {
        if (mounted) {
          setLocaleState(current);
          setReady(true);
        }
      })
      .catch(error => {
        if (__DEV__) console.error('Failed to initialize i18n:', error);
        // Set ready anyway to prevent infinite loading
        if (mounted) {
          setReady(true);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  return { ready, locale };
}

