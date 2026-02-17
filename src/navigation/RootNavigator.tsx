import React, { useMemo } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '@/theme/ThemeContext';
import { typography } from '@/theme';
import { useAuth } from '@/store/AuthContext';
import { LoadingState } from '@/components';
import { AuthStack } from './AuthStack';
import { MainTabs } from './MainTabs';
import { ArticleDetailsScreen } from '@/screens/home/ArticleDetailsScreen';
import { DownloadScreen } from '@/screens/home/DownloadScreen';
import { PostDetailsScreen } from '@/screens/posts/PostDetailsScreen';
import { ClassDetailsScreen } from '@/screens/classes/ClassDetailsScreen';
import { SubjectDetailsScreen } from '@/screens/classes/SubjectDetailsScreen';
import { SemesterDetailsScreen } from '@/screens/classes/SemesterDetailsScreen';
import { CategoryDetailsScreen } from '@/screens/classes/CategoryDetailsScreen';
import { SettingsScreen } from '@/screens/profile/SettingsScreen';
import { LegalScreen } from '@/screens/legal/LegalScreen';
import { PolicyDetailsScreen } from '@/screens/legal/PolicyDetailsScreen';
import { ContactScreen } from '@/screens/profile/ContactScreen';
import { MembersScreen } from '@/screens/profile/MembersScreen';
import { NotificationsScreen } from '@/screens/notifications/NotificationsScreen';
import { useTranslation } from '@/hooks/useTranslation';
import { navigationRef } from '@/navigation/navigationRef';
import { pushNotificationsService } from '@/services/pushNotifications';

const Stack = createNativeStackNavigator();

export function RootNavigator() {
  const { bootstrapping } = useAuth();
  const { t } = useTranslation();
  const { theme, isDark } = useTheme();

  const navigationTheme = useMemo(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        // Transparent in dark mode so root gradient shows through
        background: isDark ? 'transparent' : theme.colors.background,
        card: isDark ? 'transparent' : theme.colors.surface,
        text: theme.colors.onSurface,
        border: isDark ? 'rgba(255,255,255,0.05)' : theme.colors.outlineVariant,
        primary: theme.colors.primary,
        notification: theme.colors.error,
      },
    };
  }, [isDark, theme]);

  if (bootstrapping) {
    return <LoadingState />;
  }

  return (
    <NavigationContainer
      theme={navigationTheme}
      ref={navigationRef}
      onReady={() => {
        pushNotificationsService.flushPendingNavigation();
      }}
    >
      <Stack.Navigator
        screenOptions={{
          ...(isDark ? {
            headerTransparent: false,
            // Keep dark header fully opaque to prevent content showing "under" the header.
            headerStyle: { backgroundColor: '#0B2338' },
            headerShadowVisible: false,
          } : {
            headerStyle: { backgroundColor: theme.colors.surface },
          }),
          headerTitleStyle: {
            color: theme.colors.onSurface,
            fontFamily: typography.fontFamily.semibold,
          },
          headerTintColor: theme.colors.onSurface,
        }}
      >
        <>
          <Stack.Screen name="Tabs" component={MainTabs} options={{ headerShown: false }} />
          <Stack.Screen name="Auth" component={AuthStack} options={{ headerShown: false }} />
          <Stack.Screen name="ArticleDetails" component={ArticleDetailsScreen} options={{ title: t('article') }} />
          <Stack.Screen name="Download" component={DownloadScreen} options={{ title: t('download') || 'Download' }} />
          <Stack.Screen name="PostDetails" component={PostDetailsScreen} options={{ title: t('post') }} />
          <Stack.Screen name="ClassDetails" component={ClassDetailsScreen} options={{ title: t('class') }} />
          <Stack.Screen name="SubjectDetails" component={SubjectDetailsScreen} options={{ title: t('subject') }} />
          <Stack.Screen name="SemesterDetails" component={SemesterDetailsScreen} options={{ title: t('semester') }} />
          <Stack.Screen name="CategoryDetails" component={CategoryDetailsScreen} options={{ title: t('category') }} />
          <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: t('settings') }} />
          <Stack.Screen name="Legal" component={LegalScreen} options={{ title: t('policies') }} />
          <Stack.Screen
            name="PolicyDetails"
            component={PolicyDetailsScreen}
            options={({ route }: { route: { params?: { title?: string } } }) => ({
              title: route.params?.title || t('policies'),
            })}
          />
          <Stack.Screen name="Contact" component={ContactScreen} options={{ title: t('contactUs') }} />
          <Stack.Screen name="Members" component={MembersScreen} options={{ title: t('members') }} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: t('notifications') }} />
        </>
      </Stack.Navigator>
    </NavigationContainer>
  );
}
