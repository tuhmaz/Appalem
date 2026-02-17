import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  FadeInUp,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  cancelAnimation,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { AppText, AnimatedPressable, Screen, Skeleton } from '@/components';
import { useCountry } from '@/store/CountryContext';
import { filterService } from '@/services/filter';
import type { Subject } from '@/types/api';
import { spacing } from '@/theme';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootNavigation } from '@/navigation/types';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const SUBJECT_CARD_VARIANTS = [
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

const SUBJECT_CATEGORY_ICONS: IconName[] = [
  'document-text-outline',
  'albums-outline',
  'create-outline',
  'book-outline',
  'archive-outline',
];

const DETAILS_BG_PRIMARY = '#091725';
const DETAILS_BG_SECONDARY = '#134765';
const TITLE_COLOR = '#FFFFFF';
const SUBTITLE_COLOR = 'rgba(230,244,255,0.88)';
const CARD_TEXT_COLOR = '#F8FBFF';

function hexToRgba(hexColor: string, alpha: number) {
  const hex = hexColor.replace('#', '');
  const fullHex = hex.length === 3 ? hex.split('').map((char) => `${char}${char}`).join('') : hex;
  const r = Number.parseInt(fullHex.slice(0, 2), 16);
  const g = Number.parseInt(fullHex.slice(2, 4), 16);
  const b = Number.parseInt(fullHex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getSubjectIconName(subjectName: string): IconName {
  const value = subjectName.toLowerCase();

  if (
    value.includes('رياض') ||
    value.includes('math') ||
    value.includes('algebra') ||
    value.includes('geometry') ||
    value.includes('هندسة') ||
    value.includes('جبر')
  ) {
    return 'calculator-outline';
  }
  if (value.includes('فيزياء') || value.includes('physics')) return 'magnet-outline';
  if (value.includes('كيمياء') || value.includes('chem')) return 'flask-outline';
  if (value.includes('أحياء') || value.includes('احياء') || value.includes('biology') || value.includes('bio')) return 'leaf-outline';
  if (value.includes('عربي') || value.includes('arabic') || value.includes('لغة')) return 'text-outline';
  if (value.includes('انجليزي') || value.includes('english') || value.includes('french') || value.includes('فرنسي')) return 'language-outline';
  if (value.includes('تاريخ') || value.includes('history')) return 'time-outline';
  if (value.includes('جغراف') || value.includes('geography')) return 'earth-outline';
  if (
    value.includes('حاسوب') ||
    value.includes('كمبيوتر') ||
    value.includes('تقنية') ||
    value.includes('برمجة') ||
    value.includes('computer') ||
    value.includes('ict')
  ) {
    return 'hardware-chip-outline';
  }
  if (value.includes('اسلام') || value.includes('دين') || value.includes('قرآن') || value.includes('quran')) return 'moon-outline';
  if (value.includes('فن') || value.includes('رسم') || value.includes('art')) return 'color-palette-outline';
  if (value.includes('رياضة') || value.includes('بدنية') || value.includes('sport')) return 'fitness-outline';
  if (value.includes('موسيقى') || value.includes('music')) return 'musical-notes-outline';
  return 'book-outline';
}

type ClassDetailsParams = {
  classId: number;
  className?: string;
};

export function ClassDetailsScreen() {
  const route = useRoute<RouteProp<{ params: ClassDetailsParams }, 'params'>>();
  const navigation = useNavigation<RootNavigation>();
  const { country } = useCountry();
  const { locale } = useTranslation();
  const isRTL = locale === 'ar';
  const isOppositeRTL = !isRTL;
  const oppositeTextAlign: 'left' | 'right' = isRTL ? 'left' : 'right';
  const oppositeWritingDirection: 'ltr' | 'rtl' = isRTL ? 'ltr' : 'rtl';
  const oppositeItemsAlign: 'flex-start' | 'flex-end' = isRTL ? 'flex-start' : 'flex-end';
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const bgDrift = useSharedValue(0);

  const labels = useMemo(() => {
    if (isRTL) {
      return {
        title: route.params.className ? `مواد ${route.params.className}` : 'المواد الدراسية',
        subtitle: 'اختر المادة للانتقال إلى الفصول والتصنيفات.',
        emptyTitle: 'لا توجد مواد',
        emptySubtitle: 'لا توجد مواد مرتبطة بهذا الصف حالياً.',
      };
    }

    return {
      title: route.params.className ? `${route.params.className} subjects` : 'Subjects',
      subtitle: 'Choose a subject to continue to semesters and categories.',
      emptyTitle: 'No subjects',
      emptySubtitle: 'There are no subjects in this class yet.',
    };
  }, [isRTL, route.params.className]);

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
    setSubjects([]);

    filterService.getSubjectsByClass(route.params.classId)
      .then((data) => {
        if (mounted) setSubjects(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (mounted) setSubjects([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [route.params.classId, country.id]);

  const renderBackground = (
    <View pointerEvents="none" style={styles.background}>
      <LinearGradient
        colors={[DETAILS_BG_PRIMARY, DETAILS_BG_SECONDARY, DETAILS_BG_PRIMARY]}
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
  );

  const renderHeader = (
    <View style={styles.headerCard}>
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(99,230,226,0.2)', 'rgba(99,230,226,0)', 'rgba(59,130,246,0.14)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGlow}
      />
      <View style={[styles.headerRow, isOppositeRTL && styles.headerRowOppositeRTL]}>
        <View style={styles.headerIconShell}>
          <Ionicons name="bookmarks-outline" size={22} color="#63E6E2" />
        </View>
        <View style={[styles.headerTextWrap, { alignItems: oppositeItemsAlign }]}>
          <AppText
            weight="bold"
            size="xl"
            color={TITLE_COLOR}
            style={[
              styles.headerTitle,
              { textAlign: oppositeTextAlign, writingDirection: oppositeWritingDirection },
            ]}
          >
            {labels.title}
          </AppText>
          <AppText
            size="sm"
            color={SUBTITLE_COLOR}
            style={[
              styles.headerSubtitle,
              { textAlign: oppositeTextAlign, writingDirection: oppositeWritingDirection },
            ]}
          >
            {labels.subtitle}
          </AppText>
        </View>
      </View>
    </View>
  );

  const renderSkeleton = () => (
    <View>
      {renderHeader}
      <View style={[styles.skeletonGrid, isOppositeRTL && styles.skeletonGridOppositeRTL]}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <View key={i} style={styles.skeletonItem}>
            <Skeleton height={150} borderRadius={20} />
          </View>
        ))}
      </View>
    </View>
  );

  const renderItem = ({ item, index }: { item: Subject; index: number }) => {
    const variant = SUBJECT_CARD_VARIANTS[index % SUBJECT_CARD_VARIANTS.length];
    const topIconName = getSubjectIconName(item.subject_name || '');
    const accentSoft = hexToRgba(variant.borderColor, 0.2);
    const accentBorder = hexToRgba(variant.borderColor, 0.45);

    return (
      <Animated.View entering={FadeInUp.delay(Math.min(index, 8) * 70).springify()} style={styles.cardWrapper}>
        <AnimatedPressable
          onPress={() => navigation.navigate('SubjectDetails', { subjectId: item.id, subjectName: item.subject_name })}
          style={styles.pressable}
        >
          <View
            style={[
              styles.subjectCard,
              {
                borderColor: variant.borderColor,
                shadowColor: variant.glowColor,
              },
              variant.shape,
            ]}
          >
            <BlurView intensity={24} tint="dark" pointerEvents="none" style={styles.subjectGlassLayer} />
            <LinearGradient
              pointerEvents="none"
              colors={[
                'rgba(255,255,255,0.16)',
                'rgba(255,255,255,0.04)',
                'rgba(255,255,255,0)',
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.subjectGlassSheen}
            />

            <View style={styles.subjectCardContent}>
              <View style={[styles.subjectIconShell, { borderColor: accentBorder, backgroundColor: accentSoft }]}>
                <Ionicons name={topIconName} size={18} color={variant.borderColor} />
              </View>

              <View style={styles.subjectTextWrap}>
                <AppText weight="bold" size="sm" style={styles.subjectTitle} numberOfLines={2}>
                  {item.subject_name}
                </AppText>
              </View>

              <View style={styles.subjectMiniRow}>
                {SUBJECT_CATEGORY_ICONS.map((iconName, iconIndex) => (
                  <View
                    key={`${item.id}-${iconName}-${iconIndex}`}
                    style={[
                      styles.subjectMiniChip,
                      {
                        borderColor: accentBorder,
                        backgroundColor: accentSoft,
                      },
                    ]}
                  >
                    <Ionicons name={iconName} size={9} color={variant.borderColor} />
                  </View>
                ))}
              </View>
            </View>
          </View>
        </AnimatedPressable>
      </Animated.View>
    );
  };

  const renderListHeader = <View style={styles.listHeaderWrap}>{renderHeader}</View>;

  return (
    <Screen
      style={styles.screen}
      contentStyle={styles.content}
      background={renderBackground}
    >
      {loading ? (
        renderSkeleton()
      ) : (
        <FlatList
          data={subjects}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={[styles.columnWrapper, isOppositeRTL && styles.columnWrapperOppositeRTL]}
          contentContainerStyle={styles.list}
          ListHeaderComponent={renderListHeader}
          ListEmptyComponent={(
            <View style={styles.emptyCard}>
              <AppText
                weight="bold"
                size="lg"
                color={TITLE_COLOR}
                style={[
                  styles.emptyTitle,
                  { textAlign: oppositeTextAlign, writingDirection: oppositeWritingDirection },
                ]}
              >
                {labels.emptyTitle}
              </AppText>
              <AppText
                size="sm"
                color={SUBTITLE_COLOR}
                style={[
                  styles.emptySubtitle,
                  { textAlign: oppositeTextAlign, writingDirection: oppositeWritingDirection },
                ]}
              >
                {labels.emptySubtitle}
              </AppText>
            </View>
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: DETAILS_BG_PRIMARY,
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
    shadowColor: DETAILS_BG_SECONDARY,
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
  headerCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(207,233,255,0.3)',
    backgroundColor: 'rgba(8,27,45,0.55)',
    padding: spacing.md,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  headerGlow: {
    ...StyleSheet.absoluteFillObject,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerRowOppositeRTL: {
    flexDirection: 'row-reverse',
  },
  headerIconShell: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(99,230,226,0.5)',
    backgroundColor: 'rgba(99,230,226,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: {
    flex: 1,
    gap: 3,
  },
  headerTitle: {
    lineHeight: 30,
  },
  headerSubtitle: {
    lineHeight: 20,
  },
  listHeaderWrap: {
    marginBottom: spacing.xs,
  },
  list: {
    paddingBottom: spacing.lg,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  columnWrapperOppositeRTL: {
    flexDirection: 'row-reverse',
  },
  cardWrapper: {
    width: '48.5%',
  },
  pressable: {
    width: '100%',
  },
  subjectCard: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: 'rgba(9,23,37,0.34)',
    borderWidth: 1.2,
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    height: 150,
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
  subjectGlassLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  subjectGlassSheen: {
    ...StyleSheet.absoluteFillObject,
  },
  subjectCardContent: {
    width: '100%',
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subjectIconShell: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subjectTextWrap: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: spacing['2xs'],
  },
  subjectTitle: {
    textAlign: 'center',
    color: CARD_TEXT_COLOR,
    lineHeight: 18,
    textShadowColor: 'rgba(9,23,37,0.48)',
    textShadowOffset: {
      width: 0,
      height: 1,
    },
    textShadowRadius: 2,
  },
  subjectMiniRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  subjectMiniChip: {
    width: 17,
    height: 17,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(207,233,255,0.28)',
    backgroundColor: 'rgba(8,27,45,0.56)',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptySubtitle: {
    textAlign: 'center',
    lineHeight: 20,
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  skeletonGridOppositeRTL: {
    flexDirection: 'row-reverse',
  },
  skeletonItem: {
    width: '48.5%',
  },
});
