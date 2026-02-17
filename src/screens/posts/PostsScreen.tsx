import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
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
import { LinearGradient } from 'expo-linear-gradient';
import {
  AppText,
  Card,
  Screen,
  Skeleton,
  AnimatedPressable,
} from '@/components';
import { useTranslation } from '@/hooks/useTranslation';
import { useCountry } from '@/store/CountryContext';
import { categoryService } from '@/services/categories';
import { postService } from '@/services/posts';
import type { Category, Post } from '@/types/api';
import { spacing, radius } from '@/theme';
import { stripHtml, truncate } from '@/utils/format';

type CategoryWithStatus = Category & {
  is_active?: boolean;
};

type SortMode = 'latest' | 'popular';

type PostsScreenNavigation = NativeStackNavigationProp<{
  PostDetails: { postId: number };
}>;

const CATEGORY_CARD_VARIANTS = [
  {
    borderColor: '#22D3EE',
    glowColor: 'rgba(34, 211, 238, 0.5)',
    chipBg: 'rgba(34, 211, 238, 0.16)',
  },
  {
    borderColor: '#3B82F6',
    glowColor: 'rgba(59, 130, 246, 0.5)',
    chipBg: 'rgba(59, 130, 246, 0.16)',
  },
  {
    borderColor: '#10B981',
    glowColor: 'rgba(16, 185, 129, 0.5)',
    chipBg: 'rgba(16, 185, 129, 0.16)',
  },
  {
    borderColor: '#F59E0B',
    glowColor: 'rgba(245, 158, 11, 0.5)',
    chipBg: 'rgba(245, 158, 11, 0.16)',
  },
] as const;

const POSTS_BG_PRIMARY = '#091725';
const POSTS_BG_SECONDARY = '#134765';
const CARD_TEXT_PRIMARY = '#F4FAFF';
const CARD_TEXT_SECONDARY = 'rgba(224,239,255,0.86)';
const CARD_TEXT_MUTED = 'rgba(193,216,238,0.78)';
const CARD_SURFACE = 'rgba(8,27,45,0.5)';
const CARD_SURFACE_ACTIVE = 'rgba(10,32,52,0.62)';
const CARD_OUTLINE_SOFT = 'rgba(209,233,255,0.34)';

function hexToRgba(hexColor: string, alpha: number) {
  const hex = hexColor.replace('#', '');
  const fullHex = hex.length === 3 ? hex.split('').map((char) => `${char}${char}`).join('') : hex;
  const r = Number.parseInt(fullHex.slice(0, 2), 16);
  const g = Number.parseInt(fullHex.slice(2, 4), 16);
  const b = Number.parseInt(fullHex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function toPostList(payload: unknown): Post[] {
  if (Array.isArray(payload)) return payload as Post[];
  if (
    payload &&
    typeof payload === 'object' &&
    Array.isArray((payload as { data?: unknown }).data)
  ) {
    return (payload as { data: Post[] }).data;
  }
  return [];
}

function toCategoryList(payload: unknown): CategoryWithStatus[] {
  if (!Array.isArray(payload)) return [];
  return payload.filter((item): item is CategoryWithStatus => (
    Boolean(item) &&
    typeof item === 'object' &&
    typeof (item as Category).id === 'number' &&
    typeof (item as Category).name === 'string'
  ));
}

function getPostKey(item: Post, index: number) {
  return typeof item.id === 'number' ? `post-${item.id}` : `post-fallback-${index}`;
}

export function PostsScreen() {
  const navigation = useNavigation<PostsScreenNavigation>();
  const { t, locale } = useTranslation();
  const { country } = useCountry();
  const isRTL = locale === 'ar';

  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<CategoryWithStatus[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [categoriesCountryId, setCategoriesCountryId] = useState<string | null>(null);
  const [countrySwitching, setCountrySwitching] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('latest');
  const previousCountryIdRef = useRef<string | null>(null);
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

  const labels = useMemo(() => ({
    subtitle: t('postsSubtitle'),
    chooseCategory: t('chooseCategoryPrompt'),
    showCategories: t('showCategories'),
    filterBy: t('filterBy'),
    latest: t('latest'),
    popular: t('mostViewed'),
    categoryTag: t('category'),
    postCount: t('postCount'),
    countrySwitching: t('countrySwitchingMessage'),
  }), [t]);

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedCategoryId) || null,
    [categories, selectedCategoryId]
  );

  const selectedVariant = useMemo(() => {
    const selectedIndex = categories.findIndex((category) => category.id === selectedCategoryId);
    const safeIndex = selectedIndex < 0 ? 0 : selectedIndex;
    return CATEGORY_CARD_VARIANTS[safeIndex % CATEGORY_CARD_VARIANTS.length];
  }, [categories, selectedCategoryId]);

  const headerTitle = selectedCategoryId === null
    ? t('categoriesLabel')
    : (selectedCategory?.name || t('posts'));

  const headerSubtitle = selectedCategoryId === null
    ? labels.subtitle
    : t('postsInCategory');

  const headerOppositeAlignStyle = selectedCategoryId === null
    ? (isRTL ? styles.headerTextOppositeRTL : styles.headerTextOppositeLTR)
    : undefined;
  const selectedViewTextOppositeStyle = selectedCategoryId !== null
    ? (isRTL ? styles.selectedTextOppositeRTL : styles.selectedTextOppositeLTR)
    : undefined;

  const handleCategoryPress = (categoryId: number) => {
    setSortMode('latest');
    setSelectedCategoryId(categoryId);
  };

  useEffect(() => {
    let mounted = true;
    const loadCategories = async () => {
      const isSwitching = previousCountryIdRef.current !== null && previousCountryIdRef.current !== country.id;
      if (isSwitching) {
        setCountrySwitching(true);
      }
      setCategoriesCountryId(null);
      setCategories([]);
      setPosts([]);
      setSelectedCategoryId(null);
      setSortMode('latest');
      setCategoriesLoading(true);
      try {
        const data = await categoryService.list();
        if (!mounted) return;
        const categoryList = toCategoryList(data).filter(category => category.is_active !== false);
        setCategories(categoryList);
        setCategoriesCountryId(country.id);
      } catch {
        if (!mounted) return;
        setCategories([]);
        setCategoriesCountryId(country.id);
      } finally {
        if (mounted) {
          setCategoriesLoading(false);
          setCountrySwitching(false);
          previousCountryIdRef.current = country.id;
        }
      }
    };
    loadCategories();
    return () => {
      mounted = false;
    };
  }, [country.id]);

  useEffect(() => {
    if (selectedCategoryId === null || categoriesCountryId !== country.id) {
      setPosts([]);
      setPostsLoading(false);
      return;
    }

    let mounted = true;
    setPostsLoading(true);

    const params: Record<string, string | number | boolean> = {
      per_page: 20,
      category_id: selectedCategoryId,
      sort_by: sortMode === 'popular' ? 'views' : 'created_at',
      sort_dir: 'desc',
    };

    postService.list(params)
      .then((data) => {
        if (!mounted) return;
        setPosts(toPostList(data));
      })
      .catch(() => {
        if (!mounted) return;
        setPosts([]);
      })
      .finally(() => {
        if (mounted) setPostsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [selectedCategoryId, sortMode, categoriesCountryId, country.id]);

  const hasFreshCountryData = categoriesCountryId === country.id;
  const showCategoriesLoading = categoriesLoading || !hasFreshCountryData;

  const renderCategorySkeleton = () => (
    <View style={[styles.categoryGrid, isRTL && styles.categoryGridRTL]}>
      {Array.from({ length: 6 }).map((_, index) => (
        <View key={index} style={styles.categoryGridItem}>
          <Skeleton height={124} borderRadius={radius.xl} />
        </View>
      ))}
    </View>
  );

  const renderPostsSkeleton = () => (
    <View style={styles.postsWrap}>
      {[1, 2, 3].map(i => (
        <Card key={i} style={styles.postCard}>
          <Skeleton width="72%" height={22} style={{ marginBottom: spacing.xs }} />
          <Skeleton width="100%" height={16} />
          <Skeleton width="88%" height={16} style={{ marginTop: 4 }} />
        </Card>
      ))}
    </View>
  );

  const renderCategoryCards = () => (
    <View style={[styles.categoryGrid, isRTL && styles.categoryGridRTL]}>
      {categories.map((category, index) => {
        const variant = CATEGORY_CARD_VARIANTS[index % CATEGORY_CARD_VARIANTS.length];
        const isSelected = selectedCategoryId === category.id;
        const accentBorder = hexToRgba(variant.borderColor, isSelected ? 0.84 : 0.56);
        const accentGlow = hexToRgba(variant.borderColor, isSelected ? 0.5 : 0.34);

        return (
          <Animated.View
            key={category.id}
            entering={FadeInUp.delay(Math.min(index, 8) * 70).springify()}
            style={styles.categoryGridItem}
          >
            <AnimatedPressable
              onPress={() => handleCategoryPress(category.id)}
              style={styles.categoryPressable}
            >
              <View
                style={[
                  styles.categoryCard,
                  {
                    borderColor: accentBorder,
                    shadowColor: accentGlow,
                    backgroundColor: isSelected ? CARD_SURFACE_ACTIVE : CARD_SURFACE,
                  },
                  isSelected && styles.categoryCardActive,
                ]}
              >
                <LinearGradient
                  pointerEvents="none"
                  colors={[
                    hexToRgba(variant.borderColor, isSelected ? 0.22 : 0.12),
                    'rgba(255,255,255,0.04)',
                    'rgba(255,255,255,0)',
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.categoryShine}
                />

                <View
                  style={[
                    styles.categoryTag,
                    {
                      borderColor: hexToRgba(variant.borderColor, 0.4),
                      backgroundColor: variant.chipBg,
                    },
                  ]}
                >
                  <AppText
                    size="xs"
                    weight="semibold"
                    color={variant.borderColor}
                    style={styles.categoryTagText}
                  >
                    {labels.categoryTag}
                  </AppText>
                </View>

                <View style={styles.categoryBody}>
                  <AppText
                    weight="bold"
                    size="md"
                    color={CARD_TEXT_PRIMARY}
                    numberOfLines={2}
                    style={styles.categoryTitle}
                  >
                    {category.name}
                  </AppText>
                </View>

                <View style={styles.categoryFooter}>
                  {[0, 1, 2].map((slot) => (
                    <View
                      key={`${category.id}-${slot}`}
                      style={[
                        styles.footerDot,
                        {
                          backgroundColor: variant.borderColor,
                          opacity: isSelected ? 0.96 : 0.56,
                        },
                      ]}
                    />
                  ))}
                </View>
              </View>
            </AnimatedPressable>
          </Animated.View>
        );
      })}
    </View>
  );

  const renderItem = ({ item, index }: { item: Post; index: number }) => (
    <Animated.View key={getPostKey(item, index)} entering={FadeInUp.delay(index * 55).springify()}>
      <AnimatedPressable
        onPress={() => navigation.navigate('PostDetails', { postId: item.id })}
        style={styles.postCardWrap}
      >
        <Card
          style={[
            styles.postCard,
            {
              borderColor: hexToRgba(selectedVariant.borderColor, 0.48),
            },
          ]}
        >
          <AppText
            weight="bold"
            size="lg"
            color={CARD_TEXT_PRIMARY}
            style={selectedViewTextOppositeStyle}
          >
            {item.title}
          </AppText>
          <AppText
            size="sm"
            color={CARD_TEXT_SECONDARY}
            style={[styles.postSubtitle, selectedViewTextOppositeStyle]}
          >
            {truncate(stripHtml(item.meta_description || item.content || ''), 120)}
          </AppText>
        </Card>
      </AnimatedPressable>
    </Animated.View>
  );

  return (
    <Screen
      tabScreen
      scroll
      style={styles.screen}
      contentStyle={styles.content}
      background={(
        <View pointerEvents="none" style={styles.background}>
          <LinearGradient
            colors={[POSTS_BG_PRIMARY, POSTS_BG_SECONDARY, POSTS_BG_PRIMARY]}
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
      <View style={styles.header}>
        <AppText
          size="xl"
          weight="bold"
          color="#FFFFFF"
          style={[headerOppositeAlignStyle, selectedViewTextOppositeStyle]}
        >
          {headerTitle}
        </AppText>
        <AppText
          size="sm"
          color="rgba(234,244,255,0.86)"
          style={[styles.subtitleText, headerOppositeAlignStyle, selectedViewTextOppositeStyle]}
        >
          {headerSubtitle}
        </AppText>
      </View>

      {showCategoriesLoading ? (
        <>
          {countrySwitching ? (
            <View style={styles.countrySwitchingCard}>
              <AppText size="sm" weight="semibold" color={CARD_TEXT_PRIMARY} style={styles.countrySwitchingText}>
                {labels.countrySwitching}
              </AppText>
            </View>
          ) : null}
          {renderCategorySkeleton()}
        </>
      ) : (
        selectedCategoryId === null ? (
          <>
            {renderCategoryCards()}
            <View style={styles.chooseCategoryCard}>
              <AppText size="sm" color={CARD_TEXT_SECONDARY} style={styles.chooseCategoryText}>
                {labels.chooseCategory}
              </AppText>
            </View>
          </>
        ) : (
          <View style={styles.resultsSection}>
            <View style={[styles.resultsHeader, isRTL && styles.resultsHeaderRTL]}>
              <View style={styles.resultsTitleWrap}>
                <AppText
                  weight="bold"
                  size="lg"
                  color={CARD_TEXT_PRIMARY}
                  style={selectedViewTextOppositeStyle}
                >
                  {selectedCategory?.name}
                </AppText>
                <AppText size="xs" color={CARD_TEXT_MUTED} style={selectedViewTextOppositeStyle}>
                  {`${posts.length} ${labels.postCount}`}
                </AppText>
              </View>
              <AnimatedPressable
                onPress={() => setSelectedCategoryId(null)}
                style={styles.showCategoriesWrap}
              >
                <View
                  style={[
                    styles.showCategoriesChip,
                    {
                      borderColor: hexToRgba(selectedVariant.borderColor, 0.6),
                      backgroundColor: hexToRgba(selectedVariant.borderColor, 0.16),
                    },
                  ]}
                >
                  <AppText
                    size="xs"
                    weight="semibold"
                    color={CARD_TEXT_PRIMARY}
                    style={[styles.showCategoriesText, selectedViewTextOppositeStyle]}
                  >
                    {labels.showCategories}
                  </AppText>
                </View>
              </AnimatedPressable>
            </View>

            <View style={[styles.filterRow, isRTL && styles.filterRowRTL]}>
              <AppText
                size="sm"
                weight="semibold"
                color={CARD_TEXT_MUTED}
                style={selectedViewTextOppositeStyle}
              >
                {labels.filterBy}
              </AppText>
              <View style={[styles.filterOptions, isRTL && styles.filterOptionsRTL]}>
                {(['latest', 'popular'] as SortMode[]).map((mode) => {
                  const active = sortMode === mode;
                  const filterTitle = mode === 'latest' ? labels.latest : labels.popular;
                  return (
                    <AnimatedPressable
                      key={mode}
                      onPress={() => setSortMode(mode)}
                      style={styles.filterChipWrap}
                    >
                      <View
                        style={[
                          styles.filterChip,
                          active
                            ? {
                                backgroundColor: selectedVariant.borderColor,
                                borderColor: selectedVariant.borderColor,
                              }
                            : {
                                backgroundColor: 'rgba(255,255,255,0.04)',
                                borderColor: CARD_OUTLINE_SOFT,
                              },
                        ]}
                      >
                        <AppText
                          size="xs"
                          weight="semibold"
                          color={active ? '#FFFFFF' : CARD_TEXT_SECONDARY}
                          style={[styles.filterChipText, selectedViewTextOppositeStyle]}
                        >
                          {filterTitle}
                        </AppText>
                      </View>
                    </AnimatedPressable>
                  );
                })}
              </View>
            </View>

            {postsLoading ? (
              renderPostsSkeleton()
            ) : (
              <View style={styles.postsWrap}>
                {posts.length > 0 ? (
                  posts.map((item, index) => renderItem({ item, index }))
                ) : (
                  <View style={styles.emptyState}>
                    <AppText weight="bold" size="md" color={CARD_TEXT_PRIMARY} style={selectedViewTextOppositeStyle}>
                      {t('noArticlesTitle')}
                    </AppText>
                    <AppText
                      size="sm"
                      color={CARD_TEXT_SECONDARY}
                      style={[styles.emptySubtitle, selectedViewTextOppositeStyle]}
                    >
                      {t('noArticlesSubtitle')}
                    </AppText>
                  </View>
                )}
              </View>
            )}
          </View>
        )
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: POSTS_BG_PRIMARY,
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
    shadowColor: POSTS_BG_SECONDARY,
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
  header: {
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  subtitleText: {
    lineHeight: 20,
  },
  headerTextOppositeRTL: {
    width: '100%',
    textAlign: 'left',
  },
  headerTextOppositeLTR: {
    width: '100%',
    textAlign: 'right',
  },
  selectedTextOppositeRTL: {
    textAlign: 'left',
  },
  selectedTextOppositeLTR: {
    textAlign: 'right',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  categoryGridRTL: {
    flexDirection: 'row-reverse',
  },
  categoryGridItem: {
    width: '48.5%',
    alignSelf: 'flex-start',
  },
  categoryPressable: {
    width: '100%',
  },
  categoryCard: {
    minHeight: 124,
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: CARD_SURFACE,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 6,
  },
  categoryCardActive: {
    borderWidth: 1.3,
  },
  categoryShine: {
    ...StyleSheet.absoluteFillObject,
  },
  categoryTag: {
    alignSelf: 'flex-start',
    minHeight: 22,
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  categoryTagText: {
    textAlign: 'center',
    fontSize: 10,
    lineHeight: 12,
  },
  categoryBody: {
    flex: 1,
    justifyContent: 'center',
  },
  categoryTitle: {
    textAlign: 'center',
    lineHeight: 22,
    textShadowColor: 'rgba(6,21,35,0.64)',
    textShadowOffset: {
      width: 0,
      height: 1,
    },
    textShadowRadius: 2,
  },
  categoryFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
    marginTop: spacing.md,
  },
  footerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  chooseCategoryCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: CARD_OUTLINE_SOFT,
    backgroundColor: 'rgba(10,32,52,0.5)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  chooseCategoryText: {
    textAlign: 'center',
  },
  countrySwitchingCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: CARD_OUTLINE_SOFT,
    backgroundColor: 'rgba(10,32,52,0.56)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  countrySwitchingText: {
    textAlign: 'center',
  },
  resultsSection: {
    marginTop: spacing.xs,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  resultsHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  resultsTitleWrap: {
    flex: 1,
    gap: 2,
  },
  showCategoriesWrap: {
    alignSelf: 'flex-start',
  },
  showCategoriesChip: {
    minHeight: 30,
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    justifyContent: 'center',
  },
  showCategoriesText: {
    textAlign: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  filterRowRTL: {
    flexDirection: 'row-reverse',
  },
  filterOptions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  filterOptionsRTL: {
    flexDirection: 'row-reverse',
  },
  filterChipWrap: {
    alignSelf: 'flex-start',
  },
  filterChip: {
    minHeight: 30,
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  filterChipText: {
    textAlign: 'center',
  },
  postsWrap: {
    gap: spacing.sm,
  },
  postCardWrap: {
    marginBottom: spacing.sm,
  },
  postCard: {
    borderWidth: 1,
    backgroundColor: 'rgba(10,31,50,0.56)',
  },
  postSubtitle: {
    marginTop: spacing.xs,
    lineHeight: 19,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  emptySubtitle: {
    textAlign: 'center',
  },
});
