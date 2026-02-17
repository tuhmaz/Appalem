export const COUNTRIES = [
  { id: '1', code: 'jo', name: 'الأردن', nameEn: 'Jordan' },
  { id: '2', code: 'sa', name: 'السعودية', nameEn: 'Saudi Arabia' },
  { id: '3', code: 'eg', name: 'مصر', nameEn: 'Egypt' },
  { id: '4', code: 'ps', name: 'فلسطين', nameEn: 'Palestine' }
] as const;

export type Country = typeof COUNTRIES[number];

export const DEFAULT_COUNTRY = COUNTRIES[0];