/**
 * Learning Management System (LMS) Design System
 * Dark Teal + Navy inspired by modern education apps
 * Professional, calm, and trust-building color palette
 */

// Primary Teal Palette - للثقة والإبداع
const tealPalette = {
  50: '#F0FDFA',
  100: '#CCFBF1',
  200: '#99F6E4',
  300: '#5EEAD4',
  400: '#63E6E2', // Accent/Primary
  500: '#14B8A6',
  600: '#0D9488',
  700: '#0F766E',
  800: '#115E59',
  900: '#134E4A',
};

// Secondary Blue Palette - للهدوء والتعلم
const bluePalette = {
  50: '#EFF6FF',
  100: '#DBEAFE',
  200: '#BFDBFE',
  300: '#93C5FD',
  400: '#60A5FA',
  500: '#3B82F6', // Secondary
  600: '#2563EB',
  700: '#1D4ED8',
  800: '#1E40AF',
  900: '#1E3A8A',
};

// Navy Palette - للخلفيات الداكنة
const navyPalette = {
  50: '#F0F4F8',
  100: '#D9E2EC',
  200: '#BCCCDC',
  300: '#9FB3C8',
  400: '#829AB1',
  500: '#627D98',
  600: '#486581',
  700: '#334E68',
  800: '#1E293B',
  900: '#0F172A',
};

// Deep Ocean Palette - ألوان الخلفية الأساسية
const oceanPalette = {
  bgTop: '#081826',
  bgMid: '#0E2F47',
  bgBottom: '#174D73',
  surface: '#10293D',
  surface2: '#0E2233',
  surfaceLight: '#163B56',
  border: 'rgba(255,255,255,0.05)',
  borderLight: 'rgba(255,255,255,0.10)',
};

// Accent Colors - للتنبيهات والحالات
const accentColors = {
  success: '#10B981',
  successLight: '#D1FAE5',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  info: '#3B82F6',
  infoLight: '#DBEAFE',
};

// Light Theme - الوضع الفاتح (يبقى كخيار احتياطي)
export const lightScheme = {
  // Primary (Teal)
  primary: tealPalette[500],
  onPrimary: '#FFFFFF',
  primaryContainer: tealPalette[100],
  onPrimaryContainer: tealPalette[800],

  // Secondary (Blue)
  secondary: bluePalette[500],
  onSecondary: '#FFFFFF',
  secondaryContainer: bluePalette[100],
  onSecondaryContainer: bluePalette[800],

  // Tertiary
  tertiary: tealPalette[400],
  onTertiary: '#FFFFFF',
  tertiaryContainer: tealPalette[100],
  onTertiaryContainer: tealPalette[900],

  // Background & Surface
  background: navyPalette[50],
  onBackground: navyPalette[900],
  surface: '#FFFFFF',
  onSurface: navyPalette[900],
  surfaceVariant: navyPalette[100],
  onSurfaceVariant: navyPalette[500],

  // Surface Containers
  surfaceContainer: navyPalette[50],
  surfaceContainerLow: navyPalette[100],
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerHigh: navyPalette[200],
  surfaceContainerHighest: navyPalette[300],

  // Outline & Dividers
  outline: navyPalette[300],
  outlineVariant: navyPalette[200],
  divider: navyPalette[200],

  // Semantic States
  error: accentColors.error,
  onError: '#FFFFFF',
  errorContainer: accentColors.errorLight,
  onErrorContainer: '#991B1B',

  success: accentColors.success,
  onSuccess: '#FFFFFF',
  successContainer: accentColors.successLight,
  onSuccessContainer: '#065F46',

  warning: accentColors.warning,
  onWarning: '#FFFFFF',
  warningContainer: accentColors.warningLight,
  onWarningContainer: '#92400E',

  info: accentColors.info,
  onInfo: '#FFFFFF',
  infoContainer: accentColors.infoLight,
  onInfoContainer: bluePalette[800],

  // Shadows
  shadow: 'rgba(0, 0, 0, 0.05)',
  shadowMedium: 'rgba(0, 0, 0, 0.1)',
  shadowStrong: 'rgba(0, 0, 0, 0.15)',
  scrim: 'rgba(0, 0, 0, 0.4)',

  // Gradient (للخلفية)
  gradientStart: oceanPalette.bgTop,
  gradientMid: oceanPalette.bgMid,
  gradientEnd: oceanPalette.bgBottom,

  // Accent Glow
  accentGlow: 'rgba(99,230,226,0.25)',

  // Category Colors (للمواد الدراسية)
  categoryPlanBg: tealPalette[50],
  categoryPlanBorder: tealPalette[300],
  categoryPlanText: tealPalette[700],

  categoryPaperBg: accentColors.successLight,
  categoryPaperBorder: accentColors.success,
  categoryPaperText: '#065F46',

  categoryTestBg: accentColors.errorLight,
  categoryTestBorder: accentColors.error,
  categoryTestText: '#991B1B',

  categoryBookBg: accentColors.warningLight,
  categoryBookBorder: accentColors.warning,
  categoryBookText: '#92400E',

  categoryRecordBg: bluePalette[50],
  categoryRecordBorder: bluePalette[300],
  categoryRecordText: bluePalette[700],
};

// Dark Theme - الوضع الداكن (Dark Teal + Navy)
export const darkScheme = {
  // Primary (Teal Accent)
  primary: tealPalette[400],           // #63E6E2
  onPrimary: oceanPalette.bgTop,
  primaryContainer: tealPalette[900],
  onPrimaryContainer: tealPalette[200],

  // Secondary (Blue)
  secondary: bluePalette[400],
  onSecondary: bluePalette[900],
  secondaryContainer: bluePalette[800],
  onSecondaryContainer: bluePalette[100],

  // Tertiary
  tertiary: tealPalette[300],
  onTertiary: tealPalette[900],
  tertiaryContainer: tealPalette[800],
  onTertiaryContainer: tealPalette[100],

  // Background & Surface (Deep ocean navy)
  background: oceanPalette.bgTop,                    // #081826
  onBackground: 'rgba(255,255,255,0.92)',
  surface: oceanPalette.surface,                      // #10293D
  onSurface: 'rgba(255,255,255,0.92)',
  surfaceVariant: oceanPalette.surfaceLight,          // #163B56
  onSurfaceVariant: 'rgba(255,255,255,0.68)',

  // Surface Containers
  surfaceContainer: oceanPalette.surface,             // #10293D
  surfaceContainerLow: oceanPalette.surface2,         // #0E2233
  surfaceContainerLowest: oceanPalette.bgTop,         // #081826
  surfaceContainerHigh: oceanPalette.surfaceLight,    // #163B56
  surfaceContainerHighest: '#1D4A6A',

  // Outline & Dividers
  outline: 'rgba(255,255,255,0.15)',
  outlineVariant: oceanPalette.border,                // rgba(255,255,255,0.05)
  divider: oceanPalette.border,

  // Semantic States
  error: '#F87171',
  onError: '#FFFFFF',
  errorContainer: '#7F1D1D',
  onErrorContainer: '#FCA5A5',

  success: '#34D399',
  onSuccess: '#064E3B',
  successContainer: '#065F46',
  onSuccessContainer: '#A7F3D0',

  warning: '#FBBF24',
  onWarning: '#78350F',
  warningContainer: '#92400E',
  onWarningContainer: '#FDE68A',

  info: bluePalette[400],
  onInfo: bluePalette[900],
  infoContainer: bluePalette[800],
  onInfoContainer: bluePalette[100],

  // Shadows
  shadow: 'rgba(0, 0, 0, 0.3)',
  shadowMedium: 'rgba(0, 0, 0, 0.4)',
  shadowStrong: 'rgba(0, 0, 0, 0.5)',
  scrim: 'rgba(0, 0, 0, 0.6)',

  // Gradient (للخلفية)
  gradientStart: oceanPalette.bgTop,                  // #081826
  gradientMid: oceanPalette.bgMid,                    // #0E2F47
  gradientEnd: oceanPalette.bgBottom,                 // #174D73

  // Accent Glow
  accentGlow: 'rgba(99,230,226,0.25)',

  // Category Colors
  categoryPlanBg: tealPalette[900],
  categoryPlanBorder: tealPalette[400],
  categoryPlanText: tealPalette[200],

  categoryPaperBg: '#064E3B',
  categoryPaperBorder: '#34D399',
  categoryPaperText: '#A7F3D0',

  categoryTestBg: '#7F1D1D',
  categoryTestBorder: '#F87171',
  categoryTestText: '#FCA5A5',

  categoryBookBg: '#78350F',
  categoryBookBorder: '#FBBF24',
  categoryBookText: '#FDE68A',

  categoryRecordBg: bluePalette[900],
  categoryRecordBorder: bluePalette[500],
  categoryRecordText: bluePalette[200],
};

export type ColorScheme = typeof lightScheme;
