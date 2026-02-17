import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  FadeInUp,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  cancelAnimation,
  withRepeat,
  withTiming
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import {
  AppText,
  Screen,
  Skeleton,
  AnimatedPressable
} from '@/components';
import { useCountry } from '@/store/CountryContext';
import { classService } from '@/services/classes';
import type { SchoolClass } from '@/types/api';
import { spacing } from '@/theme';
import type { RootNavigation } from '@/navigation/types';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const CLASS_CARD_VARIANTS = [
  {
    borderColor: '#22D3EE',
    glowColor: 'rgba(34, 211, 238, 0.48)',
    shape: {
      borderTopLeftRadius: 20,
      borderTopRightRadius: 14,
      borderBottomRightRadius: 20,
      borderBottomLeftRadius: 14,
    },
  },
  {
    borderColor: '#3B82F6',
    glowColor: 'rgba(59, 130, 246, 0.48)',
    shape: {
      borderTopLeftRadius: 14,
      borderTopRightRadius: 20,
      borderBottomRightRadius: 14,
      borderBottomLeftRadius: 20,
    },
  },
  {
    borderColor: '#10B981',
    glowColor: 'rgba(16, 185, 129, 0.45)',
    shape: {
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      borderBottomRightRadius: 12,
      borderBottomLeftRadius: 12,
    },
  },
  {
    borderColor: '#F59E0B',
    glowColor: 'rgba(245, 158, 11, 0.45)',
    shape: {
      borderTopLeftRadius: 12,
      borderTopRightRadius: 12,
      borderBottomRightRadius: 20,
      borderBottomLeftRadius: 20,
    },
  },
] as const;

const CLASS_TOP_ICONS: IconName[] = [
  'school-outline',
  'ribbon-outline',
  'bulb-outline',
  'planet-outline',
  'library-outline',
  'telescope-outline',
];

const CLASS_BG_PRIMARY = '#091725';
const CLASS_BG_SECONDARY = '#134765';

function hexToRgba(hexColor: string, alpha: number) {
  const hex = hexColor.replace('#', '');
  const fullHex = hex.length === 3 ? hex.split('').map((char) => `${char}${char}`).join('') : hex;
  const r = Number.parseInt(fullHex.slice(0, 2), 16);
  const g = Number.parseInt(fullHex.slice(2, 4), 16);
  const b = Number.parseInt(fullHex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function ClassesScreen() {
  const navigation = useNavigation<RootNavigation>();
  const { country } = useCountry();
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const bgDrift = useSharedValue(0);

  useEffect(() => {
    bgDrift.value = withRepeat(
      withTiming(1, {
        duration: 9000,
        easing: Easing.inOut(Easing.quad),
      }),
      -1,
      true
    );
    return () => { cancelAnimation(bgDrift); };
  }, [bgDrift]);

  const orbTopAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(bgDrift.value, [0, 1], [0.4, 0.58]),
    transform: [
      { translateX: interpolate(bgDrift.value, [0, 1], [-12, 16]) },
      { translateY: interpolate(bgDrift.value, [0, 1], [0, 20]) },
      { rotate: `${interpolate(bgDrift.value, [0, 1], [-5, 7])}deg` },
    ],
  }));

  const orbBottomAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(bgDrift.value, [0, 1], [0.34, 0.52]),
    transform: [
      { translateX: interpolate(bgDrift.value, [0, 1], [14, -10]) },
      { translateY: interpolate(bgDrift.value, [0, 1], [0, -16]) },
      { rotate: `${interpolate(bgDrift.value, [0, 1], [6, -4])}deg` },
    ],
  }));

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setClasses([]);

    classService.list()
      .then((data) => {
        if (mounted) setClasses(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (mounted) setClasses([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [country.id]);

  const renderSkeleton = () => (
    <View style={styles.skeletonGrid}>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <View key={i} style={styles.skeletonItem}>
          <Skeleton height={146} borderRadius={20} />
        </View>
      ))}
    </View>
  );

  const renderItem = ({ item, index }: { item: SchoolClass; index: number }) => {
    const variant = CLASS_CARD_VARIANTS[index % CLASS_CARD_VARIANTS.length];
    const topIconName = CLASS_TOP_ICONS[index % CLASS_TOP_ICONS.length];
    const accentSoft = hexToRgba(variant.borderColor, 0.2);
    const accentBorder = hexToRgba(variant.borderColor, 0.45);
    const miniIcons: IconName[] = [
      'calculator-outline',
      'flask-outline',
      'book-outline',
      'language-outline',
      'earth-outline',
      'hardware-chip-outline',
      'leaf-outline',
      'color-palette-outline',
    ];
    const visibleMiniIcons = Array.from({ length: 4 }, (_, i) => miniIcons[(index + i) % miniIcons.length]);

    return (
      <Animated.View entering={FadeInUp.delay(index * 55).springify()} style={styles.cardWrapper}>
        <AnimatedPressable
          onPress={() => navigation.navigate('ClassDetails', { classId: item.id, className: item.grade_name })}
          style={styles.pressable}
        >
          <View
            style={[
              styles.classCard,
              {
                borderColor: variant.borderColor,
                shadowColor: variant.glowColor,
              },
              variant.shape,
            ]}
          >
            <BlurView intensity={24} tint="dark" pointerEvents="none" style={styles.classGlassLayer} />
            <LinearGradient
              pointerEvents="none"
              colors={[
                'rgba(255,255,255,0.16)',
                'rgba(255,255,255,0.04)',
                'rgba(255,255,255,0)',
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.classGlassSheen}
            />

            <View style={styles.classCardContent}>
              <View style={[styles.classIconShell, { borderColor: accentBorder, backgroundColor: accentSoft }]}>
                <Ionicons name={topIconName} size={18} color={variant.borderColor} />
              </View>

              <View style={styles.classTextWrap}>
                <AppText weight="bold" size="sm" style={styles.classTitle} numberOfLines={2}>
                  {item.grade_name}
                </AppText>
              </View>

              <View style={styles.classMiniRow}>
                {visibleMiniIcons.map((iconName, iconIndex) => (
                  <View
                    key={`${item.id}-${iconName}-${iconIndex}`}
                    style={[
                      styles.classMiniChip,
                      {
                        borderColor: accentBorder,
                        backgroundColor: accentSoft,
                      },
                    ]}
                  >
                    <Ionicons name={iconName} size={10} color={variant.borderColor} />
                  </View>
                ))}
              </View>
            </View>
          </View>
        </AnimatedPressable>
      </Animated.View>
    );
  };

  return (
    <Screen
      tabScreen
      style={styles.screen}
      contentStyle={styles.content}
      background={(
        <View pointerEvents="none" style={styles.background}>
          <LinearGradient
            colors={[CLASS_BG_PRIMARY, CLASS_BG_SECONDARY, CLASS_BG_PRIMARY]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={[
              'rgba(19,71,101,0.88)',
              'rgba(19,71,101,0.22)',
              'rgba(9,23,37,0.92)',
            ]}
            start={{ x: 0.95, y: 0.02 }}
            end={{ x: 0.1, y: 1 }}
            style={styles.backgroundOverlay}
          />
          <Animated.View style={[styles.backgroundOrb, styles.backgroundOrbTop, orbTopAnimatedStyle]} />
          <Animated.View style={[styles.backgroundOrb, styles.backgroundOrbBottom, orbBottomAnimatedStyle]} />
          <View style={styles.backgroundBeamLeft} />
          <View style={styles.backgroundBeamRight} />
          <View style={styles.backgroundFrame} />
        </View>
      )}
    >
      {loading ? (
        renderSkeleton()
      ) : (
        <FlatList
          data={classes}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: CLASS_BG_PRIMARY,
  },
  content: {
    position: 'relative',
    zIndex: 1,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  backgroundOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundOrb: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(19,71,101,0.32)',
    borderWidth: 1,
    borderColor: 'rgba(19,71,101,0.62)',
    shadowColor: CLASS_BG_SECONDARY,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 1,
    shadowRadius: 26,
    elevation: 8,
  },
  backgroundOrbTop: {
    width: 250,
    height: 250,
    top: -88,
    left: -80,
  },
  backgroundOrbBottom: {
    width: 300,
    height: 300,
    bottom: -130,
    right: -92,
  },
  backgroundBeamLeft: {
    position: 'absolute',
    width: 260,
    height: 260,
    top: '21%',
    left: -165,
    borderWidth: 1,
    borderColor: 'rgba(19,71,101,0.55)',
    borderRadius: 38,
    transform: [{ rotate: '32deg' }],
  },
  backgroundBeamRight: {
    position: 'absolute',
    width: 240,
    height: 240,
    top: '54%',
    right: -160,
    borderWidth: 1,
    borderColor: 'rgba(19,71,101,0.52)',
    borderRadius: 36,
    transform: [{ rotate: '-28deg' }],
  },
  backgroundFrame: {
    position: 'absolute',
    top: 14,
    right: 12,
    bottom: 12,
    left: 12,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(19,71,101,0.42)',
  },
  list: {
    paddingBottom: spacing.lg,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  cardWrapper: {
    width: '48.5%',
  },
  pressable: {
    width: '100%',
  },
  classCard: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: 'rgba(9,23,37,0.32)',
    borderWidth: 1.2,
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    height: 146,
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.62,
    shadowRadius: 12,
    elevation: 8,
  },
  classGlassLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  classGlassSheen: {
    ...StyleSheet.absoluteFillObject,
  },
  classCardContent: {
    width: '100%',
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  classIconShell: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  classTextWrap: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: spacing['2xs'],
  },
  classTitle: {
    textAlign: 'center',
    color: '#F8FBFF',
    lineHeight: 18,
    textShadowColor: 'rgba(9,23,37,0.48)',
    textShadowOffset: {
      width: 0,
      height: 1,
    },
    textShadowRadius: 2,
  },
  classMiniRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  classMiniChip: {
    width: 18,
    height: 18,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  skeletonItem: {
    width: '48.5%',
  },
});
