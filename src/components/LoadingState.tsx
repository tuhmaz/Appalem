import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/theme/ThemeContext';

export function LoadingState() {
  const { theme, isDark } = useTheme();
  const colors = theme.colors as any;

  return (
    <View style={[styles.container, {
      backgroundColor: isDark ? (colors.gradientStart || theme.colors.background) : theme.colors.background,
    }]}>
      {isDark && colors.gradientStart && (
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientMid, colors.gradientEnd]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      <ActivityIndicator color={theme.colors.primary} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
