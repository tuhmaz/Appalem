import React, { useEffect } from 'react';
import { StyleSheet, View, Image, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withSpring,
  Easing,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/theme/ThemeContext';
import * as SplashScreen from 'expo-splash-screen';

const { width } = Dimensions.get('window');

interface SplashScreenProps {
  onFinish: () => void;
}

// Reusing theme constants for consistency with the rest of the app
const BG_PRIMARY = '#091725';
const BG_SECONDARY = '#134765';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const splashLogo = require('../../assets/icon.png');

export function CustomSplashScreen({ onFinish }: SplashScreenProps) {
  const { isDark } = useTheme();
  
  // Animation values
  const logoScale = useSharedValue(0.3);
  const logoOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const containerOpacity = useSharedValue(1);
  const bgDrift = useSharedValue(0);

  useEffect(() => {
    // Prevent native splash screen from auto-hiding
    SplashScreen.preventAutoHideAsync().catch(() => {});

    // Start animations
    logoScale.value = withSpring(1, { damping: 12 });
    logoOpacity.value = withTiming(1, { duration: 800 });
    
    // Background subtle movement
    bgDrift.value = withTiming(1, { 
      duration: 3000, 
      easing: Easing.inOut(Easing.quad) 
    });

    // Text fade in after logo
    textOpacity.value = withSequence(
      withTiming(0, { duration: 400 }),
      withTiming(1, { duration: 800 })
    );

    // Finish sequence
    const timeout = setTimeout(() => {
      // Fade out container
      containerOpacity.value = withTiming(0, { duration: 500 }, (finished) => {
        if (finished) {
          runOnJS(onFinish)();
        }
      });
    }, 2500); // Total splash duration

    return () => clearTimeout(timeout);
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: interpolate(textOpacity.value, [0, 1], [20, 0]) }],
  }));

  const orbTopAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(bgDrift.value, [0, 1], [0.4, 0.58]),
    transform: [
      { translateX: interpolate(bgDrift.value, [0, 1], [-20, 20]) },
      { translateY: interpolate(bgDrift.value, [0, 1], [0, 30]) },
      { rotate: `${interpolate(bgDrift.value, [0, 1], [-5, 7])}deg` },
    ],
  }));

  const orbBottomAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(bgDrift.value, [0, 1], [0.34, 0.52]),
    transform: [
      { translateX: interpolate(bgDrift.value, [0, 1], [20, -20]) },
      { translateY: interpolate(bgDrift.value, [0, 1], [0, -20]) },
      { rotate: `${interpolate(bgDrift.value, [0, 1], [6, -4])}deg` },
    ],
  }));

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      {/* Background Gradient */}
      <LinearGradient
        colors={[BG_PRIMARY, BG_SECONDARY, BG_PRIMARY]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      
      {/* Animated Background Elements */}
      <View pointerEvents="none" style={styles.backgroundOverlay}>
         <LinearGradient
          colors={[
            'rgba(19,71,101,0.88)',
            'rgba(19,71,101,0.22)',
            'rgba(9,23,37,0.92)',
          ]}
          start={{ x: 0.95, y: 0.02 }}
          end={{ x: 0.1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View style={[styles.backgroundOrb, styles.backgroundOrbTop, orbTopAnimatedStyle]} />
        <Animated.View style={[styles.backgroundOrb, styles.backgroundOrbBottom, orbBottomAnimatedStyle]} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Animated.View style={[styles.logoContainer, logoStyle]}>
          <Image 
            source={splashLogo} 
            style={styles.logo} 
            resizeMode="contain"
          />
        </Animated.View>
        
        <Animated.View style={textStyle}>
          {/* You can add app name text here if desired, or just rely on the logo */}
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99999, // Ensure it's on top of everything
  },
  backgroundOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    width: width * 0.4,
    height: width * 0.4,
    marginBottom: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 30,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  backgroundOrb: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(19,71,101,0.32)',
    borderWidth: 1,
    borderColor: 'rgba(19,71,101,0.62)',
    shadowColor: '#134765',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 1,
    shadowRadius: 40,
    elevation: 20,
  },
  backgroundOrbTop: {
    top: -100,
    right: -60,
    width: 320,
    height: 320,
  },
  backgroundOrbBottom: {
    bottom: -80,
    left: -80,
    width: 380,
    height: 380,
  },
});
