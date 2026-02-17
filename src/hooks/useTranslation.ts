import { t } from '@/i18n/i18n';
import { useLocale } from '@/store/LocaleContext';

export function useTranslation() {
  const { locale } = useLocale();
  return { t, locale };
}