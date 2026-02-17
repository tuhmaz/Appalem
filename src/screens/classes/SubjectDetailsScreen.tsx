import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
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
import type { Semester, Subject } from '@/types/api';
import { useTranslation } from '@/hooks/useTranslation';
import { spacing, radius } from '@/theme';
import type { RootNavigation } from '@/navigation/types';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const DETAILS_BG_PRIMARY = '#091725';
const DETAILS_BG_SECONDARY = '#134765';
const TITLE_COLOR = '#FFFFFF';
const SUBTITLE_COLOR = 'rgba(230,244,255,0.88)';
const CARD_TEXT_COLOR = '#F8FBFF';

const SEMESTER_CARD_VARIANTS = [
  {
    borderColor: '#22D3EE',
    glowColor: 'rgba(34, 211, 238, 0.46)',
    shape: {
      borderTopLeftRadius: 20,
      borderTopRightRadius: 14,
      borderBottomRightRadius: 20,
      borderBottomLeftRadius: 14,
    },
  },
  {
    borderColor: '#3B82F6',
    glowColor: 'rgba(59, 130, 246, 0.46)',
    shape: {
      borderTopLeftRadius: 14,
      borderTopRightRadius: 20,
      borderBottomRightRadius: 14,
      borderBottomLeftRadius: 20,
    },
  },
  {
    borderColor: '#10B981',
    glowColor: 'rgba(16, 185, 129, 0.44)',
    shape: {
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      borderBottomRightRadius: 12,
      borderBottomLeftRadius: 12,
    },
  },
  {
    borderColor: '#F59E0B',
    glowColor: 'rgba(245, 158, 11, 0.44)',
    shape: {
      borderTopLeftRadius: 12,
      borderTopRightRadius: 12,
      borderBottomRightRadius: 20,
      borderBottomLeftRadius: 20,
    },
  },
] as const;

const CATEGORY_ITEMS = [
  { id: 'plans', labelKey: 'studyPlans', icon: 'documents-outline' as IconName },
  { id: 'papers', labelKey: 'worksheets', icon: 'albums-outline' as IconName },
  { id: 'tests', labelKey: 'tests', icon: 'create-outline' as IconName },
  { id: 'books', labelKey: 'books', icon: 'book-outline' as IconName },
  { id: 'records', labelKey: 'records', icon: 'archive-outline' as IconName },
] as const;

function hexToRgba(hexColor: string, alpha: number) {
  const hex = hexColor.replace('#', '');
  const fullHex = hex.length === 3 ? hex.split('').map((char) => `${char}${char}`).join('') : hex;
  const r = Number.parseInt(fullHex.slice(0, 2), 16);
  const g = Number.parseInt(fullHex.slice(2, 4), 16);
  const b = Number.parseInt(fullHex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

type SubjectDetailsParams = {
  subjectId: number;
  subjectName?: string;
};

export function SubjectDetailsScreen() {
  const route = useRoute<RouteProp<{ params: SubjectDetailsParams }, 'params'>>();
  const navigation = useNavigation<RootNavigation>();
  const { country } = useCountry();
  const { t, locale } = useTranslation();
  const isRTL = locale === 'ar';
  const isOppositeRTL = !isRTL;
  const oppositeTextAlign: 'left' | 'right' = isRTL ? 'left' : 'right';
  const oppositeWritingDirection: 'ltr' | 'rtl' = isRTL ? 'ltr' : 'rtl';
  const oppositeItemsAlign: 'flex-start' | 'flex-end' = isRTL ? 'flex-start' : 'flex-end';
  const [loading, setLoading] = useState(true);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [subject, setSubject] = useState<Subject | null>(null);
  const bgDrift = useSharedValue(0);

  const labels = useMemo(() => ({
    title: route.params.subjectName || t('subjectFallback'),
    subtitle: t('subjectSubtitle'),
    termLabel: t('semester'),
    chooseType: t('chooseContentType'),
    emptyTitle: t('noSemestersTitle'),
    emptySubtitle: t('noSemestersSubtitle'),
  }), [t, route.params.subjectName]);

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
    setSemesters([]);
    setSubject(null);

    filterService.getSemestersBySubject(route.params.subjectId)
      .then((data) => {
        if (!mounted) return;
        setSemesters(Array.isArray(data.semesters) ? data.semesters : []);
        setSubject(data.subject || null);
      })
      .catch(() => {
        if (!mounted) return;
        setSemesters([]);
        setSubject(null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [route.params.subjectId, country.id]);

  const resolvedTitle = subject?.subject_name || labels.title;

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
          <Ionicons name="library-outline" size={22} color="#63E6E2" />
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
            {resolvedTitle}
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
    <View style={styles.skeletonWrap}>
      {renderHeader}
      {[1, 2].map((i) => (
        <View key={i} style={styles.skeletonCard}>
          <Skeleton height={164} borderRadius={22} />
        </View>
      ))}
    </View>
  );

  return (
    <Screen
      scroll
      style={styles.screen}
      contentStyle={styles.content}
      background={renderBackground}
    >
      {loading ? (
        renderSkeleton()
      ) : (
        <>
          {renderHeader}

          {semesters.length ? (
            <View style={styles.semestersWrap}>
              {semesters.map((semester, index) => {
                const variant = SEMESTER_CARD_VARIANTS[index % SEMESTER_CARD_VARIANTS.length];
                const accentSoft = hexToRgba(variant.borderColor, 0.2);
                const accentBorder = hexToRgba(variant.borderColor, 0.48);

                return (
                  <Animated.View
                    key={semester.id}
                    entering={FadeInUp.delay(index * 70).springify()}
                    style={styles.semesterCardWrap}
                  >
                    <View
                      style={[
                        styles.semesterCard,
                        {
                          borderColor: variant.borderColor,
                          shadowColor: variant.glowColor,
                        },
                        variant.shape,
                      ]}
                    >
                      <BlurView intensity={24} tint="dark" pointerEvents="none" style={styles.semesterGlassLayer} />
                      <LinearGradient
                        pointerEvents="none"
                        colors={[
                          'rgba(255,255,255,0.16)',
                          'rgba(255,255,255,0.04)',
                          'rgba(255,255,255,0)',
                        ]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.semesterGlassSheen}
                      />

                      <View style={[styles.semesterHead, isOppositeRTL && styles.semesterHeadOppositeRTL]}>
                        <View style={[styles.semesterIconShell, { borderColor: accentBorder, backgroundColor: accentSoft }]}>
                          <Ionicons name="layers-outline" size={18} color={variant.borderColor} />
                        </View>
                        <View style={[styles.semesterTextWrap, { alignItems: oppositeItemsAlign }]}>
                          <AppText
                            weight="bold"
                            size="lg"
                            color={CARD_TEXT_COLOR}
                            style={[
                              styles.semesterTitle,
                              { textAlign: oppositeTextAlign, writingDirection: oppositeWritingDirection },
                            ]}
                          >
                            {semester.semester_name}
                          </AppText>
                          <AppText
                            size="xs"
                            color="rgba(228,243,255,0.8)"
                            style={[
                              styles.semesterSubtitle,
                              { textAlign: oppositeTextAlign, writingDirection: oppositeWritingDirection },
                            ]}
                          >
                            {labels.termLabel}
                          </AppText>
                        </View>
                      </View>

                      <View style={[styles.categoryRowHeader, isOppositeRTL && styles.categoryRowHeaderOppositeRTL]}>
                        <AppText
                          size="sm"
                          color="rgba(228,243,255,0.88)"
                          style={[
                            styles.chooseTypeText,
                            { writingDirection: oppositeWritingDirection },
                          ]}
                        >
                          {labels.chooseType}
                        </AppText>
                      </View>

                      <View style={styles.categoryRow}>
                        {CATEGORY_ITEMS.map((category) => (
                          <AnimatedPressable
                            key={`${semester.id}-${category.id}`}
                            onPress={() => navigation.navigate('SemesterDetails', {
                              semesterId: semester.id,
                              fileCategory: category.id,
                              semesterName: semester.semester_name,
                              categoryLabel: t(category.labelKey),
                            })}
                            style={styles.categoryChipWrap}
                          >
                            <View style={[styles.categoryChip, { borderColor: accentBorder, backgroundColor: accentSoft }]}>
                              <Ionicons name={category.icon} size={15} color={variant.borderColor} />
                              <AppText size="sm" weight="semibold" style={[styles.categoryText, { color: CARD_TEXT_COLOR }]}>
                                {t(category.labelKey)}
                              </AppText>
                            </View>
                          </AnimatedPressable>
                        ))}
                      </View>
                    </View>
                  </Animated.View>
                );
              })}
            </View>
          ) : (
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
        </>
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
    paddingBottom: spacing.xl,
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
  semestersWrap: {
    gap: spacing.sm,
  },
  semesterCardWrap: {
    width: '100%',
  },
  semesterCard: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: 'rgba(9,23,37,0.34)',
    borderWidth: 1.2,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    minHeight: 164,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.62,
    shadowRadius: 12,
    elevation: 8,
    gap: spacing.sm,
  },
  semesterGlassLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  semesterGlassSheen: {
    ...StyleSheet.absoluteFillObject,
  },
  semesterHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  semesterHeadOppositeRTL: {
    flexDirection: 'row-reverse',
  },
  semesterIconShell: {
    width: 38,
    height: 38,
    borderRadius: 13,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  semesterTextWrap: {
    flex: 1,
    gap: 2,
  },
  semesterTitle: {
    lineHeight: 24,
  },
  semesterSubtitle: {
    lineHeight: 16,
  },
  categoryRowHeader: {
    flexDirection: 'row',
  },
  categoryRowHeaderOppositeRTL: {
    flexDirection: 'row-reverse',
  },
  chooseTypeText: {
    width: '100%',
    textAlign: 'center',
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'stretch',
    gap: spacing.sm,
  },
  categoryChipWrap: {
    width: '48%',
    alignSelf: 'stretch',
  },
  categoryChip: {
    minHeight: 42,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  categoryText: {
    textAlign: 'center',
    lineHeight: 18,
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
  skeletonWrap: {
    gap: spacing.sm,
  },
  skeletonCard: {
    width: '100%',
  },
});
