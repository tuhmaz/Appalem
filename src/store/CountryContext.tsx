import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COUNTRIES, DEFAULT_COUNTRY, type Country } from '@/config/countries';
import { ENV } from '@/config/env';
import { apiClient } from '@/services/apiClient';

export type CountryContextValue = {
  country: Country;
  setCountry: (country: Country) => Promise<void>;
  countries: readonly Country[];
  ready: boolean;
};

const STORAGE_KEY = 'mobile.country';

const CountryContext = createContext<CountryContextValue | undefined>(undefined);

function resolveDefaultCountry(): Country {
  const byEnv = COUNTRIES.find(
    c => c.id === ENV.DEFAULT_COUNTRY_ID || c.code === ENV.DEFAULT_COUNTRY_CODE
  );
  return byEnv || DEFAULT_COUNTRY;
}

export function CountryProvider({ children }: { children: React.ReactNode }) {
  const [country, setCountryState] = useState<Country>(resolveDefaultCountry());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (!mounted) return;
      let resolved = resolveDefaultCountry();
      if (raw) {
        try {
          resolved = JSON.parse(raw) as Country;
        } catch {
          resolved = resolveDefaultCountry();
        }
      }
      setCountryState(resolved);
      apiClient.setCountry(resolved);
      setReady(true);
    }).catch(() => {
      if (!mounted) return;
      apiClient.setCountry(resolveDefaultCountry());
      setReady(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const setCountry = async (next: Country) => {
    setCountryState(next);
    apiClient.setCountry(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const value = useMemo(
    () => ({ country, setCountry, countries: COUNTRIES, ready }),
    [country, ready]
  );

  return <CountryContext.Provider value={value}>{children}</CountryContext.Provider>;
}

export function useCountry(): CountryContextValue {
  const ctx = useContext(CountryContext);
  if (!ctx) {
    throw new Error('useCountry must be used within CountryProvider');
  }
  return ctx;
}

