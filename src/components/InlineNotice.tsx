import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { useTheme } from '@/theme/ThemeContext';
import { radius, spacing } from '@/theme';

type NoticeVariant = 'error' | 'success' | 'info';

type InlineNoticeProps = {
  title: string;
  message: string;
  variant?: NoticeVariant;
  isRTL?: boolean;
  onDismiss?: () => void;
  style?: ViewStyle;
};

export function InlineNotice({
  title,
  message,
  variant = 'error',
  isRTL = false,
  onDismiss,
  style,
}: InlineNoticeProps) {
  const { theme } = useTheme();

  const palette = useMemo(() => {
    if (variant === 'success') {
      return {
        border: theme.colors.success,
        background: theme.colors.successContainer,
        text: theme.colors.onSuccessContainer,
        icon: 'checkmark-circle-outline' as const,
      };
    }

    if (variant === 'info') {
      return {
        border: theme.colors.info,
        background: theme.colors.infoContainer,
        text: theme.colors.onInfoContainer,
        icon: 'information-circle-outline' as const,
      };
    }

    return {
      border: theme.colors.error,
      background: theme.colors.errorContainer,
      text: theme.colors.onErrorContainer,
      icon: 'alert-circle-outline' as const,
    };
  }, [theme, variant]);

  return (
    <View
      style={[
        styles.container,
        {
          borderColor: palette.border,
          backgroundColor: palette.background,
          flexDirection: isRTL ? 'row-reverse' : 'row',
        },
        style,
      ]}
    >
      <View style={styles.iconWrap}>
        <Ionicons name={palette.icon} size={20} color={palette.border} />
      </View>

      <View style={styles.textWrap}>
        <AppText
          weight="bold"
          size="sm"
          style={{ color: palette.text, textAlign: isRTL ? 'right' : 'left' }}
        >
          {title}
        </AppText>
        <AppText
          size="sm"
          style={{ color: palette.text, textAlign: isRTL ? 'right' : 'left' }}
        >
          {message}
        </AppText>
      </View>

      {onDismiss ? (
        <Pressable
          onPress={onDismiss}
          hitSlop={8}
          style={styles.dismissButton}
          accessibilityRole="button"
          accessibilityLabel={isRTL ? 'إغلاق الرسالة' : 'Dismiss message'}
        >
          <Ionicons name="close" size={18} color={palette.text} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconWrap: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  dismissButton: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
