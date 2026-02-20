import React from 'react';
import { StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { typography } from '@/theme';
import { HomeScreen } from '@/screens/home/HomeScreen';
import { ClassesScreen } from '@/screens/classes/ClassesScreen';
import { PostsScreen } from '@/screens/posts/PostsScreen';
import { SearchScreen } from '@/screens/search/SearchScreen';
import { ProfileScreen } from '@/screens/profile/ProfileScreen';
import { useTranslation } from '@/hooks/useTranslation';
import { TAB_BAR_CONTENT_HEIGHT } from './constants';

const Tab = createBottomTabNavigator();

export function MainTabs() {
  const { t } = useTranslation();
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  // Dynamic height: content area + system navigation bar inset
  const tabBarHeight = TAB_BAR_CONTENT_HEIGHT + insets.bottom;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: typography.fontFamily.semibold,
        },
        // In dark mode: semi-transparent + absolute so gradient shows through
        ...(isDark ? {
          tabBarStyle: {
            position: 'absolute' as const,
            backgroundColor: 'rgba(8,24,38,0.85)',
            borderTopColor: 'rgba(255,255,255,0.05)',
            borderTopWidth: 1,
            height: tabBarHeight,
            paddingBottom: insets.bottom,
            paddingTop: 8,
          },
          tabBarBackground: () => (
            <BlurView
              intensity={40}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
          ),
        } : {
          tabBarStyle: {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.divider,
            borderTopWidth: 1,
            height: tabBarHeight,
            paddingBottom: insets.bottom,
            paddingTop: 8,
          },
        }),
        tabBarIcon: ({ color, size }) => {
          const map: Record<string, keyof typeof Ionicons.glyphMap> = {
            Home: 'home-outline',
            Classes: 'school-outline',
            Posts: 'newspaper-outline',
            Search: 'search-outline',
            Profile: 'person-outline'
          };
          const name = map[route.name] || 'ellipse-outline';
          return <Ionicons name={name} size={size} color={color} />;
        }
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: t('home') }} />
      <Tab.Screen name="Classes" component={ClassesScreen} options={{ title: t('classes') }} />
      <Tab.Screen name="Posts" component={PostsScreen} options={{ title: t('posts') }} />
      <Tab.Screen name="Search" component={SearchScreen} options={{ title: t('search') }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: t('profile') }} />
    </Tab.Navigator>
  );
}
