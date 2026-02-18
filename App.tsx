import 'react-native-gesture-handler';
import 'react-native-url-polyfill/auto';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, Cairo_400Regular, Cairo_600SemiBold, Cairo_700Bold } from '@expo-google-fonts/cairo';
import { RootNavigator } from '@/navigation/RootNavigator';
import { CustomSplashScreen } from '@/screens/SplashScreen';
import { AuthProvider } from '@/store/AuthContext';
import { CountryProvider } from '@/store/CountryContext';
import { LocaleProvider, useLocale } from '@/store/LocaleContext';
import { ThemeProvider, useTheme } from '@/theme/ThemeContext';
import { apiClient } from '@/services/apiClient';
import { adMobService } from '@/services/admob';
import { PushNotificationsBootstrap } from '@/components/PushNotificationsBootstrap';
import { ErrorBoundary } from '@/components/ErrorBoundary';

function AppContent() {
  const { ready, locale } = useLocale();
  const { theme, isDark } = useTheme();
  const [isSplashFinished, setIsSplashFinished] = useState(false);
  const [fontsLoaded, fontError] = useFonts({
    Cairo_400Regular,
    Cairo_600SemiBold,
    Cairo_700Bold
  });

  const colors = theme.colors as typeof theme.colors & {
    gradientStart?: string;
    gradientMid?: string;
    gradientEnd?: string;
  };

  useEffect(() => {
    // Keep native splash screen visible while we prepare our custom one
    SplashScreen.preventAutoHideAsync().catch(() => {});
  }, []);

  useEffect(() => {
    if (ready && (fontsLoaded || fontError)) {
      // Once resources are ready, we can hide the native splash
      // The CustomSplashScreen component will take over visually
      SplashScreen.hideAsync().catch(console.error);
      
      if (ready) {
        apiClient.setLocale(locale);
        adMobService.initialize().catch(console.error);
      }
    }
  }, [ready, fontsLoaded, fontError, locale]);

  if (!ready || (!fontsLoaded && !fontError)) {
    return null;
  }

  const rootBg = isDark ? (colors.gradientStart || theme.colors.background) : theme.colors.background;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[appStyles.root, { backgroundColor: rootBg }]}>
        {!isSplashFinished && (
          <CustomSplashScreen onFinish={() => setIsSplashFinished(true)} />
        )}
        
        {/* App-level gradient background: one seamless gradient behind everything */}
        {isDark && colors.gradientStart && (
          <LinearGradient
            colors={[colors.gradientStart, colors.gradientMid, colors.gradientEnd]}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        )}
        <SafeAreaProvider>
          <CountryProvider>
            <AuthProvider>
              <PushNotificationsBootstrap />
              <RootNavigator />
            </AuthProvider>
          </CountryProvider>
          <StatusBar
            style={isDark ? 'light' : 'dark'}
            translucent={false}
            backgroundColor={isDark ? rootBg : theme.colors.background}
          />
        </SafeAreaProvider>
      </View>
    </GestureHandlerRootView>
  );
}

const appStyles = StyleSheet.create({
  root: { flex: 1 },
});

export default function App() {
  return (
    <ErrorBoundary>
      <LocaleProvider>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </LocaleProvider>
    </ErrorBoundary>
  );
}
