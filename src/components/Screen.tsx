import React, { useMemo } from 'react';
import { ScrollView, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeContext';
import { spacing } from '@/theme';
import { useLocale } from '@/store/LocaleContext';
import { TAB_BAR_CONTENT_HEIGHT } from '@/navigation/constants';

type ScreenProps = {
  children: React.ReactNode;
  scroll?: boolean;
  scrollable?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  gradient?: boolean;
  /** Optional static layer rendered behind content (use absolute positioning in the node). */
  background?: React.ReactNode;
  /** Pass true when this screen is inside a bottom-tab navigator to add padding for the absolute tab bar */
  tabScreen?: boolean;
};

export function Screen({ children, scroll, scrollable, style, contentStyle, background, tabScreen }: ScreenProps) {
  const { theme, isDark } = useTheme();
  const { locale } = useLocale();
  const isRTL = locale === 'ar';

  // In dark mode: transparent so the App-level gradient shows through
  const bgColor = isDark ? 'transparent' : theme.colors.background;

  // Extra bottom padding when tab bar is absolute-positioned (dark mode + tab screens).
  // Only the content portion; SafeAreaView already handles the system inset.
  const tabPadding = (tabScreen && isDark) ? TAB_BAR_CONTENT_HEIGHT : 0;
  // In dark mode with stack headers, add a small extra top offset to avoid visual overlap.
  const darkTopOffset = (!tabScreen && isDark) ? spacing.md : 0;

  const contentBaseStyle = useMemo(() => ({
    flexGrow: 1,
    padding: spacing.lg,
  }), []);

  const directionStyle = { direction: isRTL ? 'rtl' : 'ltr' } as ViewStyle;

  // Support both 'scroll' and 'scrollable' props
  const isScrollable = scroll || scrollable;

  const scrollContent = isScrollable ? (
    <ScrollView
      contentContainerStyle={[
        contentBaseStyle,
        darkTopOffset > 0 && { paddingTop: spacing.lg + darkTopOffset },
        directionStyle,
        tabPadding > 0 && { paddingBottom: spacing.lg + tabPadding },
        contentStyle,
      ]}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[
      contentBaseStyle,
      darkTopOffset > 0 && { paddingTop: spacing.lg + darkTopOffset },
      directionStyle,
      tabPadding > 0 && { paddingBottom: spacing.lg + tabPadding },
      contentStyle,
    ]}>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={[{ flex: 1, backgroundColor: bgColor }, style]}>
      {background}
      {scrollContent}
    </SafeAreaView>
  );
}
