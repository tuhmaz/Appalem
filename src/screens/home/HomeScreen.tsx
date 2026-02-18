import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  cancelAnimation,
  Easing,
  FadeInUp,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import {
  AppText,
  Card,
  SectionHeader,
  Screen,
  SearchBar,
  BannerAd,
  Skeleton,
  AnimatedPressable
} from '@/components';
import { spacing, radius } from '@/theme';
import { useTheme } from '@/theme/ThemeContext';
import { useAuth } from '@/store/AuthContext';
import { useCountry } from '@/store/CountryContext';
import { classService } from '@/services/classes';
import { articleService } from '@/services/articles';
import { filterService } from '@/services/filter';
import type { SchoolClass, Article, Subject } from '@/types/api';
import { stripHtml, truncate } from '@/utils/format';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootNavigation } from '@/navigation/types';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const CLASS_BUTTON_VARIANTS = [
  {
    borderColor: '#22D3EE',
    glowColor: 'rgba(34, 211, 238, 0.55)',
    shape: {
      borderTopLeftRadius: 20,
      borderTopRightRadius: 14,
      borderBottomRightRadius: 20,
      borderBottomLeftRadius: 14,
    },
  },
  {
    borderColor: '#3B82F6',
    glowColor: 'rgba(59, 130, 246, 0.55)',
    shape: {
      borderTopLeftRadius: 14,
      borderTopRightRadius: 20,
      borderBottomRightRadius: 14,
      borderBottomLeftRadius: 20,
    },
  },
  {
    borderColor: '#10B981',
    glowColor: 'rgba(16, 185, 129, 0.52)',
    shape: {
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      borderBottomRightRadius: 12,
      borderBottomLeftRadius: 12,
    },
  },
  {
    borderColor: '#F59E0B',
    glowColor: 'rgba(245, 158, 11, 0.5)',
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

const SUBJECT_ICON_LOADING: IconName[] = ['ellipse', 'ellipse', 'ellipse'];

const HOME_BG_PRIMARY = '#091725';
const HOME_BG_SECONDARY = '#134765';
const HOME_MAIN_HEADING_COLOR = '#FFFFFF';

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

function getUniqueSubjectIcons(subjects: Subject[]) {
  const icons: IconName[] = [];
  subjects.forEach((subject) => {
    const iconName = getSubjectIconName(subject.subject_name || '');
    if (!icons.includes(iconName)) icons.push(iconName);
  });
  return icons;
}

export function HomeScreen() {
  const navigation = useNavigation<RootNavigation>();
  const { t, locale } = useTranslation();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { country } = useCountry();
  const isRTL = locale === 'ar';
  const latestArticlesTitle = t('latestArticles');
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [subjectsByClass, setSubjectsByClass] = useState<Record<number, Subject[]>>({});
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
    setArticles([]);
    setSubjectsByClass({});

    const load = async () => {
      try {
        const [classesResp, articlesResp] = await Promise.all([
          classService.list(),
          articleService.list({ per_page: 6 }),
        ]);
        if (!mounted) return;
        setClasses(Array.isArray(classesResp) ? classesResp : []);
        setArticles(Array.isArray(articlesResp.data) ? articlesResp.data : []);
      } catch {
        if (!mounted) return;
        setClasses([]);
        setArticles([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [country.id]);

  useEffect(() => {
    let mounted = true;

    if (!classes.length) {
      setSubjectsByClass({});
      return () => { mounted = false; };
    }

    const loadSubjectsForClasses = async () => {
      const entries = await Promise.all(
        classes.map(async (cls) => {
          try {
            const subjects = await filterService.getSubjectsByClass(cls.id);
            return [cls.id, Array.isArray(subjects) ? subjects : []] as const;
          } catch {
            return [cls.id, []] as const;
          }
        })
      );

      if (!mounted) return;
      setSubjectsByClass(Object.fromEntries(entries) as Record<number, Subject[]>);
    };

    loadSubjectsForClasses();
    return () => { mounted = false; };
  }, [classes]);

  // Calendar week days
  const weekDays = useMemo(() => {
    const now = new Date();
    const days: { label: string; date: number; isToday: boolean }[] = [];
    const arDays = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
    const enDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = -3; i <= 3; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      days.push({
        label: isRTL ? arDays[d.getDay()] : enDays[d.getDay()],
        date: d.getDate(),
        isToday: i === 0,
      });
    }
    return days;
  }, [isRTL]);

  const currentMonth = useMemo(() => {
    const now = new Date();
    const arMonths = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const month = isRTL ? arMonths[now.getMonth()] : now.toLocaleString('en', { month: 'long' });
    return `${month} ${now.getFullYear()}`;
  }, [isRTL]);

  const userName = user?.name?.trim() || '';
  const welcomeTitle = userName ? `${t('welcome')} ${userName}` : t('welcome');

  const renderSkeleton = () => (
    <View style={{ gap: spacing.lg }}>
      <Skeleton height={32} width="60%" />
      <Skeleton height={44} borderRadius={radius.lg} />
      <View style={{ gap: spacing.sm }}>
        <Skeleton height={24} width="40%" />
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Skeleton height={130} style={{ flex: 1 }} borderRadius={radius.xl} />
          <Skeleton height={130} style={{ flex: 1 }} borderRadius={radius.xl} />
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Skeleton height={130} style={{ flex: 1 }} borderRadius={radius.xl} />
          <Skeleton height={130} style={{ flex: 1 }} borderRadius={radius.xl} />
        </View>
      </View>
      <Skeleton height={120} borderRadius={radius.xl} />
    </View>
  );

  return (
    <Screen
      scroll
      tabScreen
      style={styles.homeScreen}
      contentStyle={styles.homeContent}
      background={(
        <View pointerEvents="none" style={styles.homeBackground}>
          <LinearGradient
            colors={[HOME_BG_PRIMARY, HOME_BG_SECONDARY, HOME_BG_PRIMARY]}
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
            style={styles.homeOverlay}
          />
          <Animated.View style={[styles.homeOrb, styles.homeOrbTop, orbTopAnimatedStyle]} />
          <Animated.View style={[styles.homeOrb, styles.homeOrbBottom, orbBottomAnimatedStyle]} />
          <View style={styles.homeBeamLeft} />
          <View style={styles.homeBeamRight} />
          <View style={styles.homeFrame} />
        </View>
      )}
    >
      {loading ? renderSkeleton() : (
        <>
          {/* Header: Welcome + Bell */}
          <Animated.View entering={FadeInUp.springify()} style={[styles.header, isRTL && styles.headerRTL]}>
            <AppText weight="bold" size="xl" color={HOME_MAIN_HEADING_COLOR}>
              {'\u{1F44B}'} {welcomeTitle}
            </AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('notifications')}
              style={[styles.bellBtn, { borderColor: theme.colors.outlineVariant }]}
              onPress={() => navigation.navigate('Notifications')}
            >
              <Ionicons name="notifications-outline" size={20} color={theme.colors.primary} />
            </Pressable>
          </Animated.View>

          {/* Search Bar */}
          <Animated.View entering={FadeInUp.delay(50).springify()} style={styles.searchWrap}>
            <SearchBar
              placeholder={t('searchBarPlaceholder')}
              onPress={() => navigation.navigate('Search')}
            />
          </Animated.View>

          {/* Classes Section Header */}
          <Animated.View entering={FadeInUp.delay(100).springify()}>
            <SectionHeader
              title={t('classesSection')}
              titleColor={HOME_MAIN_HEADING_COLOR}
              invertDirection
              action={
                <Pressable onPress={() => navigation.navigate('Classes')}>
                  <AppText size="sm" color="rgba(255,255,255,0.86)">{t('viewAll')}</AppText>
                </Pressable>
              }
            />
          </Animated.View>

          {/* Classes Buttons Grid (2 columns) */}
          <View style={[styles.grid, isRTL && styles.gridRTL]}>
            {classes.map((cls, index) => {
              const variant = CLASS_BUTTON_VARIANTS[index % CLASS_BUTTON_VARIANTS.length];
              const classSubjects = subjectsByClass[cls.id] || [];
              const hasLoadedSubjects = Object.prototype.hasOwnProperty.call(subjectsByClass, cls.id);
              const uniqueSubjectIcons = getUniqueSubjectIcons(classSubjects);
              const visibleSubjectIcons = uniqueSubjectIcons.slice(0, 4);
              const subjectIcons = hasLoadedSubjects
                ? (visibleSubjectIcons.length ? visibleSubjectIcons : (['remove-outline'] as IconName[]))
                : SUBJECT_ICON_LOADING;
              const extraSubjects = hasLoadedSubjects ? Math.max(classSubjects.length - subjectIcons.length, 0) : 0;
              const topIconName = CLASS_TOP_ICONS[index % CLASS_TOP_ICONS.length];
              const accentSoft = hexToRgba(variant.borderColor, 0.2);
              const accentChip = 'rgba(8, 22, 36, 0.28)';
              const accentChipBorder = hexToRgba(variant.borderColor, 0.46);

              return (
                <Animated.View
                  key={cls.id}
                  entering={FadeInUp.delay(150 + Math.min(index, 6) * 70).springify()}
                  style={styles.gridItem}
                >
                  <AnimatedPressable
                    onPress={() => navigation.navigate('ClassDetails', { classId: cls.id, className: cls.grade_name })}
                    style={styles.classButtonWrap}
                  >
                    <View
                      style={[
                        styles.classButton,
                        {
                          borderColor: variant.borderColor,
                          shadowColor: variant.glowColor,
                        },
                        variant.shape,
                      ]}
                    >
                      <BlurView
                        intensity={24}
                        tint="dark"
                        pointerEvents="none"
                        style={styles.classGlassLayer}
                      />
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

                      <View style={styles.classInnerContent}>
                        <View
                          style={[
                            styles.classTopIconShell,
                            {
                              borderColor: accentChipBorder,
                              backgroundColor: accentSoft,
                            },
                          ]}
                        >
                          <Ionicons name={topIconName} size={18} color={variant.borderColor} />
                        </View>

                        <View style={styles.classNameWrap}>
                          <AppText weight="bold" size="sm" style={styles.classTitle} numberOfLines={2}>
                            {cls.grade_name}
                          </AppText>
                        </View>

                        <View style={styles.subjectMiniRow}>
                          {subjectIcons.map((iconName, iconIndex) => (
                            <View
                              key={`${cls.id}-${iconName}-${iconIndex}`}
                              style={[
                                styles.subjectMiniChip,
                                {
                                  borderColor: accentChipBorder,
                                  backgroundColor: accentChip,
                                },
                                !hasLoadedSubjects && styles.subjectMiniChipLoading,
                              ]}
                            >
                              <Ionicons name={iconName} size={10} color={variant.borderColor} />
                            </View>
                          ))}

                          {extraSubjects > 0 && (
                            <View
                              style={[
                                styles.subjectMoreChip,
                                {
                                  borderColor: accentChipBorder,
                                  backgroundColor: accentSoft,
                                },
                              ]}
                            >
                              <AppText weight="semibold" size="xs" style={[styles.subjectMoreText, { color: variant.borderColor }]}>
                                +{extraSubjects}
                              </AppText>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                  </AnimatedPressable>
                </Animated.View>
              );
            })}
          </View>

          {/* Banner Ad */}
          <BannerAd size="BANNER" />

          {/* Calendar Section */}
          <Animated.View entering={FadeInUp.delay(500).springify()}>
            <SectionHeader
              title={t('calendarSection')}
              titleColor={HOME_MAIN_HEADING_COLOR}
              invertDirection
            />
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(550).springify()}>
            <Card variant="elevated" style={styles.calendarCard}>
              <AppText weight="semibold" size="sm" color={theme.colors.onSurfaceVariant} style={styles.calMonthLabel}>
                {currentMonth}
              </AppText>
              <View style={[styles.calendarRow, isRTL && { flexDirection: 'row-reverse' }]}>
                {weekDays.map((day) => (
                  <View key={day.label + day.date} style={styles.dayCol}>
                    {day.isToday ? (
                      <View style={styles.todayGlassWrap}>
                        <BlurView intensity={26} tint="dark" pointerEvents="none" style={styles.todayGlassLayer} />
                        <LinearGradient
                          pointerEvents="none"
                          colors={[
                            'rgba(255,255,255,0.16)',
                            'rgba(255,255,255,0.05)',
                            'rgba(255,255,255,0)',
                          ]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.todayGlassShine}
                        />
                        <View style={styles.todayGlassContent}>
                          <AppText
                            size="xs"
                            weight="semibold"
                            color="#EAF9FF"
                            style={styles.todayDayLabel}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            minimumFontScale={0.75}
                          >
                            {day.label}
                          </AppText>
                          <View style={styles.todayDateCore}>
                            <AppText weight="bold" size="sm" color="#FFFFFF" style={styles.todayDateText}>
                              {day.date}
                            </AppText>
                          </View>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.dayRegularWrap}>
                        <View style={styles.dayRegularContent}>
                          <AppText size="xs" color={theme.colors.onSurfaceVariant} style={styles.dayRegularLabel}>
                            {day.label}
                          </AppText>
                          <View
                            style={[
                              styles.dayPill,
                              { borderColor: theme.colors.outlineVariant },
                            ]}
                          >
                            <AppText size="sm" color={theme.colors.onSurfaceVariant}>
                              {day.date}
                            </AppText>
                          </View>
                        </View>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </Card>
          </Animated.View>

          {/* Latest Articles */}
          {articles.length > 0 && (
            <>
              <Animated.View entering={FadeInUp.delay(600).springify()}>
                <SectionHeader
                  title={latestArticlesTitle}
                  titleColor={HOME_MAIN_HEADING_COLOR}
                  invertDirection
                />
              </Animated.View>
              {articles.slice(0, 6).map((article, index) => (
                <Animated.View
                  key={article.id}
                  entering={FadeInUp.delay(650 + index * 80).springify()}
                >
                  <AnimatedPressable
                    onPress={() => navigation.navigate('ArticleDetails', { articleId: article.id })}
                    style={styles.eventCardWrap}
                  >
                    <Card variant="elevated" style={styles.eventCard}>
                      <View style={[styles.eventRow, isRTL && { flexDirection: 'row-reverse' }]}>
                        <View style={[styles.eventIcon, { backgroundColor: theme.colors.primaryContainer }]}>
                          <Ionicons
                            name={article.file_category === 'pdf' ? 'document-text' : 'book'}
                            size={22}
                            color={theme.colors.primary}
                          />
                        </View>
                        <View style={[styles.eventText, isRTL && { alignItems: 'flex-end' }]}>
                          <AppText weight="bold" size="sm" numberOfLines={1}>
                            {article.title}
                          </AppText>
                          <AppText size="xs" color={theme.colors.onSurfaceVariant} numberOfLines={1}>
                            {truncate(stripHtml(article.meta_description || article.content || ''), 60)}
                          </AppText>
                        </View>
                      </View>
                    </Card>
                  </AnimatedPressable>
                </Animated.View>
              ))}
            </>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  homeScreen: {
    backgroundColor: HOME_BG_PRIMARY,
  },
  homeContent: {
    position: 'relative',
    zIndex: 1,
  },
  homeBackground: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  homeOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  homeOrb: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(19,71,101,0.32)',
    borderWidth: 1,
    borderColor: 'rgba(19,71,101,0.62)',
    shadowColor: HOME_BG_SECONDARY,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 1,
    shadowRadius: 26,
    elevation: 8,
  },
  homeOrbTop: {
    width: 250,
    height: 250,
    top: -88,
    left: -80,
  },
  homeOrbBottom: {
    width: 300,
    height: 300,
    bottom: -130,
    right: -92,
  },
  homeBeamLeft: {
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
  homeBeamRight: {
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
  homeFrame: {
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  headerRTL: {
    flexDirection: 'row-reverse',
  },
  bellBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: {
    marginBottom: spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  gridRTL: {
    flexDirection: 'row-reverse',
  },
  gridItem: {
    width: '48.5%',
    alignSelf: 'flex-start',
  },
  classButtonWrap: {
    borderRadius: 20,
    width: '100%',
  },
  classButton: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: 'rgba(9,23,37,0.32)',
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
  classGlassLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  classGlassSheen: {
    ...StyleSheet.absoluteFillObject,
  },
  classInnerContent: {
    width: '100%',
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  classTopIconShell: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  classNameWrap: {
    minHeight: 34,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing['2xs'],
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
  subjectMiniRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    minHeight: 20,
  },
  subjectMiniChip: {
    width: 18,
    height: 18,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subjectMiniChipLoading: {
    opacity: 0.58,
  },
  subjectMoreChip: {
    minWidth: 18,
    height: 18,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  subjectMoreText: {
    fontSize: 10,
    lineHeight: 11,
    textShadowColor: 'rgba(9,23,37,0.3)',
    textShadowOffset: {
      width: 0,
      height: 1,
    },
    textShadowRadius: 1.4,
  },
  calendarCard: {
    marginBottom: spacing.lg,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    shadowOpacity: 0,
    elevation: 0,
  },
  calMonthLabel: {
    marginBottom: spacing.sm,
  },
  calendarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  dayCol: {
    alignItems: 'center',
    flex: 1,
  },
  dayRegularWrap: {
    width: 42,
    height: 56,
    borderRadius: 15,
    alignSelf: 'center',
  },
  dayRegularContent: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  dayRegularLabel: {
    width: '100%',
    textAlign: 'center',
    fontSize: 9,
    lineHeight: 11,
  },
  dayPill: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayGlassWrap: {
    width: 42,
    height: 56,
    borderRadius: 15,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: 'rgba(99,230,226,0.55)',
    backgroundColor: 'rgba(9,23,37,0.34)',
    overflow: 'hidden',
    shadowColor: '#63E6E2',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.24,
    shadowRadius: 5,
    elevation: 3,
  },
  todayGlassLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  todayGlassShine: {
    ...StyleSheet.absoluteFillObject,
  },
  todayGlassContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  todayDayLabel: {
    fontSize: 9,
    lineHeight: 11,
    width: '100%',
    textAlign: 'center',
  },
  todayDateCore: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(99,230,226,0.45)',
    backgroundColor: 'rgba(99,230,226,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayDateText: {
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 17,
    textShadowColor: 'rgba(9,23,37,0.45)',
    textShadowOffset: {
      width: 0,
      height: 1,
    },
    textShadowRadius: 1.5,
  },
  eventCardWrap: {
    marginBottom: spacing.sm,
  },
  eventCard: {
    paddingVertical: spacing.sm,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  eventIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventText: {
    flex: 1,
    gap: 2,
  },
});
