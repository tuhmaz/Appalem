import React from 'react';
import { View, TextInput, StyleSheet, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { radius, spacing, typography } from '@/theme';
import { useLocale } from '@/store/LocaleContext';

type SearchBarProps = {
  placeholder: string;
  onPress?: () => void;
  editable?: boolean;
  value?: string;
  onChangeText?: (text: string) => void;
};

export function SearchBar({ placeholder, onPress, editable = false, value, onChangeText }: SearchBarProps) {
  const { theme, isDark } = useTheme();
  const { locale } = useLocale();
  const isRTL = locale === 'ar';

  const content = (
    <>
      <Ionicons
        name="search-outline"
        size={18}
        color={theme.colors.onSurfaceVariant}
        style={isRTL ? { marginLeft: spacing.sm } : { marginRight: spacing.sm }}
      />
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={theme.colors.onSurfaceVariant}
        editable={editable}
        value={value}
        onChangeText={onChangeText}
        style={[
          styles.input,
          {
            color: theme.colors.onSurface,
            fontFamily: typography.fontFamily.regular,
            textAlign: isRTL ? 'right' : 'left',
            writingDirection: isRTL ? 'rtl' : 'ltr',
          },
        ]}
      />
    </>
  );

  const innerStyle = [
    styles.inner,
    isRTL ? { flexDirection: 'row-reverse' as const } : {},
  ];

  if (isDark) {
    return (
      <Pressable accessibilityRole="search" accessibilityLabel={placeholder} onPress={onPress} style={styles.wrap}>
        <BlurView intensity={25} tint="dark" style={styles.blur}>
          <View style={innerStyle}>{content}</View>
        </BlurView>
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="search"
      accessibilityLabel={placeholder}
      onPress={onPress}
      style={[
        styles.wrap,
        {
          backgroundColor: theme.colors.surfaceContainerLow,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: theme.colors.outlineVariant,
        },
      ]}
    >
      <View style={innerStyle}>{content}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    borderRadius: radius.lg,
  },
  blur: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  input: {
    flex: 1,
    fontSize: typography.size.sm,
    padding: 0,
  },
});
