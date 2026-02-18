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
import { articleService } from '@/services/articles';
import type { Article } from '@/types/api';
import { truncate, stripHtml } from '@/utils/format';
import { useTranslation } from '@/hooks/useTranslation';
import { spacing, radius } from '@/theme';
import type { RootNavigation } from '@/navigation/types';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const DETAILS_BG_PRIMARY = '#091725';
const DETAILS_BG_SECONDARY = '#134765';
const TITLE_COLOR = '#FFFFFF';
const SUBTITLE_COLOR = 'rgba(230,244,255,0.88)';
const CARD_TEXT_COLOR = '#F8FBFF';
const CARD_TEXT_MUTED = 'rgba(214,236,255,0.82)';

const ARTICLE_CARD_VARIANTS = [
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

function hexToRgba(hexColor: string, alpha: number) {
  const hex = hexColor.replace('#', '');
  const fullHex = hex.length === 3 ? hex.split('').map((char) => `${char}${char}`).join('') : hex;
  const r = Number.parseInt(fullHex.slice(0, 2), 16);
  const g = Number.parseInt(fullHex.slice(2, 4), 16);
  const b = Number.parseInt(fullHex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

type SemesterRouteParams = {
  semesterId: number;
  fileCategory?: string;
  semesterName?: string;
  categoryLabel?: string;
};

export function SemesterDetailsScreen() {
  const route = useRoute<RouteProp<{ params: SemesterRouteParams }, 'params'>>();
  const navigation = useNavigation<RootNavigation>();
  const { country } = useCountry();
  const { t, locale } = useTranslation();
  const isRTL = locale === 'ar';
  const isOppositeRTL = !isRTL;
  const oppositeTextAlign: 'left' | 'right' = isRTL ? 'left' : 'right';
  const oppositeWritingDirection: 'ltr' | 'rtl' = isRTL ? 'ltr' : 'rtl';
  const oppositeItemsAlign: 'flex-start' | 'flex-end' = isRTL ? 'flex-start' : 'flex-end';
  const [loading, setLoading] = useState(true);
  const [articles, setArticles] = useState<Article[]>([]);
  const bgDrift = useSharedValue(0);

  const labels = useMemo(() => ({
    subtitle: t('semesterContentSubtitle'),
    openLabel: t('openLesson'),
  }), [t]);

  const headerTitle = useMemo(() => {
    const parts = [route.params.semesterName, route.params.categoryLabel].filter(Boolean);
    return parts.join(' - ');
  }, [route.params.semesterName, route.params.categoryLabel]);

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
    setArticles([]);

    const params: Record<string, string | number | boolean> = {
      semester_id: route.params.semesterId,
    };
    if (route.params.fileCategory) {
      params.file_category = route.params.fileCategory;
    }

    articleService.list(params)
      .then((data) => {
        const list = Array.isArray(data.data) ? data.data : [];
        if (mounted) setArticles(list);
      })
      .catch(() => {
        if (mounted) setArticles([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [route.params.semesterId, route.params.fileCategory, country.id]);

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
          <Ionicons name="newspaper-outline" size={22} color="#63E6E2" />
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
            {headerTitle || t('latestLessons')}
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

  const renderSkeleton = (
    <View style={styles.skeletonWrap}>
      {renderHeader}
      {[1, 2, 3].map((i) => (
        <View key={i} style={styles.skeletonCard}>
          <Skeleton height={154} borderRadius={22} />
        </View>
      ))}
    </View>
  );

  if (loading) {
    return (
      <Screen scroll style={styles.screen} contentStyle={styles.content} background={renderBackground}>
        {renderSkeleton}
      </Screen>
    );
  }

  if (!articles.length) {
    return (
      <Screen scroll style={styles.screen} contentStyle={styles.content} background={renderBackground}>
        {renderHeader}
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
            {t('noResultsTitle')}
          </AppText>
          <AppText
            size="sm"
            color={SUBTITLE_COLOR}
            style={[
              styles.emptySubtitle,
              { textAlign: oppositeTextAlign, writingDirection: oppositeWritingDirection },
            ]}
          >
            {t('noResultsSubtitle')}
          </AppText>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll style={styles.screen} contentStyle={styles.content} background={renderBackground}>
      {renderHeader}

      <View style={styles.articlesWrap}>
        {articles.map((item, index) => {
          const variant = ARTICLE_CARD_VARIANTS[index % ARTICLE_CARD_VARIANTS.length];
          const accentSoft = hexToRgba(variant.borderColor, 0.2);
          const accentBorder = hexToRgba(variant.borderColor, 0.48);
          const excerpt = truncate(stripHtml(item.meta_description || item.content || ''), 140);
          const dateLabel = item.created_at
            ? new Date(item.created_at).toLocaleDateString(locale === 'ar' ? 'ar-JO' : 'en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })
            : '';
          const topIcon: IconName = item.file_category === 'pdf' ? 'document-text-outline' : 'book-outline';

          return (
            <Animated.View key={item.id} entering={FadeInUp.delay(index * 60).springify()} style={styles.articleCardWrap}>
              <AnimatedPressable
                onPress={() => navigation.navigate('ArticleDetails', { articleId: item.id })}
                style={styles.articlePressable}
              >
                <View
                  style={[
                    styles.articleCard,
                    {
                      borderColor: variant.borderColor,
                      shadowColor: variant.glowColor,
                    },
                    variant.shape,
                  ]}
                >
                  <BlurView intensity={24} tint="dark" pointerEvents="none" style={styles.articleGlassLayer} />
                  <LinearGradient
                    pointerEvents="none"
                    colors={[
                      'rgba(255,255,255,0.16)',
                      'rgba(255,255,255,0.04)',
                      'rgba(255,255,255,0)',
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.articleGlassSheen}
                  />

                  <View style={[styles.articleHead, isOppositeRTL && styles.articleHeadOppositeRTL]}>
                    <View style={[styles.articleIconShell, { borderColor: accentBorder, backgroundColor: accentSoft }]}>
                      <Ionicons name={topIcon} size={18} color={variant.borderColor} />
                    </View>
                    <View style={[styles.articleTextWrap, { alignItems: oppositeItemsAlign }]}>
                      <AppText
                        weight="bold"
                        size="md"
                        color={CARD_TEXT_COLOR}
                        numberOfLines={2}
                        style={[
                          styles.articleTitle,
                          { textAlign: oppositeTextAlign, writingDirection: oppositeWritingDirection },
                        ]}
                      >
                        {item.title}
                      </AppText>
                      <AppText
                        size="sm"
                        color={CARD_TEXT_MUTED}
                        numberOfLines={3}
                        style={[
                          styles.articleExcerpt,
                          { textAlign: oppositeTextAlign, writingDirection: oppositeWritingDirection },
                        ]}
                      >
                        {excerpt}
                      </AppText>
                    </View>
                  </View>

                  <View style={[styles.articleMetaRow, isOppositeRTL && styles.articleMetaRowOppositeRTL]}>
                    {route.params.categoryLabel ? (
                      <View style={[styles.metaChip, { borderColor: accentBorder, backgroundColor: accentSoft }]}>
                        <AppText
                          size="xs"
                          weight="semibold"
                          color={CARD_TEXT_COLOR}
                          style={{ textAlign: oppositeTextAlign, writingDirection: oppositeWritingDirection }}
                        >
                          {route.params.categoryLabel}
                        </AppText>
                      </View>
                    ) : null}

                    {dateLabel ? (
                      <View style={[styles.metaChip, { borderColor: accentBorder, backgroundColor: accentSoft }]}>
                        <AppText
                          size="xs"
                          weight="semibold"
                          color={CARD_TEXT_COLOR}
                          style={{ textAlign: oppositeTextAlign, writingDirection: oppositeWritingDirection }}
                        >
                          {dateLabel}
                        </AppText>
                      </View>
                    ) : null}

                    <View style={[styles.openChip, { borderColor: accentBorder, backgroundColor: accentSoft }]}>
                      <Ionicons
                        name={isOppositeRTL ? 'arrow-back-outline' : 'arrow-forward-outline'}
                        size={13}
                        color={variant.borderColor}
                      />
                      <AppText
                        size="xs"
                        weight="semibold"
                        color={CARD_TEXT_COLOR}
                        style={{ textAlign: oppositeTextAlign, writingDirection: oppositeWritingDirection }}
                      >
                        {labels.openLabel}
                      </AppText>
                    </View>
                  </View>
                </View>
              </AnimatedPressable>
            </Animated.View>
          );
        })}
      </View>
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
  articlesWrap: {
    gap: spacing.sm,
  },
  articleCardWrap: {
    width: '100%',
  },
  articlePressable: {
    width: '100%',
  },
  articleCard: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: 'rgba(9,23,37,0.34)',
    borderWidth: 1.2,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    minHeight: 154,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.62,
    shadowRadius: 12,
    elevation: 8,
    gap: spacing.sm,
  },
  articleGlassLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  articleGlassSheen: {
    ...StyleSheet.absoluteFillObject,
  },
  articleHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  articleHeadOppositeRTL: {
    flexDirection: 'row-reverse',
  },
  articleIconShell: {
    width: 38,
    height: 38,
    borderRadius: 13,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  articleTextWrap: {
    flex: 1,
    gap: spacing['2xs'],
  },
  articleTitle: {
    lineHeight: 24,
  },
  articleExcerpt: {
    lineHeight: 20,
  },
  articleMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  articleMetaRowOppositeRTL: {
    flexDirection: 'row-reverse',
  },
  metaChip: {
    minHeight: 28,
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    justifyContent: 'center',
  },
  openChip: {
    minHeight: 28,
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
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
