import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  cancelAnimation,
  Easing,
  FadeInUp,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { AppButton, AppText, AnimatedPressable, Screen, Skeleton } from '@/components';
import { notificationService } from '@/services/notifications';
import type { Notification } from '@/types/api';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuth } from '@/store/AuthContext';
import { spacing, radius } from '@/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
type NotificationsNavigation = NativeStackNavigationProp<{
  Auth: { screen?: string } | undefined;
  ArticleDetails: { articleId: number };
  PostDetails: { postId: number };
}>;
type NotificationTarget =
  | { screen: 'ArticleDetails'; params: { articleId: number } }
  | { screen: 'PostDetails'; params: { postId: number } };

const SCREEN_BG_PRIMARY = '#091725';
const SCREEN_BG_SECONDARY = '#134765';
const TEXT_PRIMARY = '#F4FAFF';
const TEXT_SECONDARY = 'rgba(223,239,255,0.88)';
const TEXT_MUTED = 'rgba(184,214,239,0.78)';

const CARD_VARIANTS = [
  { borderColor: '#22D3EE', glowColor: 'rgba(34, 211, 238, 0.46)', icon: 'notifications-outline' as IconName },
  { borderColor: '#3B82F6', glowColor: 'rgba(59, 130, 246, 0.46)', icon: 'mail-unread-outline' as IconName },
  { borderColor: '#10B981', glowColor: 'rgba(16, 185, 129, 0.44)', icon: 'sparkles-outline' as IconName },
  { borderColor: '#F59E0B', glowColor: 'rgba(245, 158, 11, 0.44)', icon: 'megaphone-outline' as IconName },
] as const;

function hexToRgba(hexColor: string, alpha: number) {
  const hex = hexColor.replace('#', '');
  const fullHex = hex.length === 3 ? hex.split('').map((char) => `${char}${char}`).join('') : hex;
  const r = Number.parseInt(fullHex.slice(0, 2), 16);
  const g = Number.parseInt(fullHex.slice(2, 4), 16);
  const b = Number.parseInt(fullHex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function normalizeNotifications(payload: unknown): Notification[] {
  if (Array.isArray(payload)) return payload as Notification[];
  if (
    payload &&
    typeof payload === 'object' &&
    Array.isArray((payload as { data?: unknown }).data)
  ) {
    return (payload as { data: Notification[] }).data;
  }
  return [];
}

function toPositiveInt(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) return value;
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    const parsed = Number(value.trim());
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }
  return null;
}

function detectTopicFromPath(pathname: string): 'article' | 'post' | null {
  const lower = pathname.toLowerCase();
  if (/(^|\/)(article|articles|lesson|lessons)(\/|$)/.test(lower)) return 'article';
  if (/(^|\/)(post|posts)(\/|$)/.test(lower)) return 'post';
  return null;
}

function extractIdFromPath(pathname: string): number | null {
  const segments = pathname.split('/').filter(Boolean);
  for (let i = segments.length - 1; i >= 0; i -= 1) {
    const asId = toPositiveInt(segments[i]);
    if (asId) return asId;
  }
  return null;
}

function resolveNotificationTarget(item: Notification): NotificationTarget | null {
  const dataRecord = item.data as Record<string, unknown> | undefined;
  const typeLower = String(item.type || '').toLowerCase();
  const dataUrl = typeof dataRecord?.url === 'string' ? dataRecord.url.trim() : '';

  const explicitArticleId =
    toPositiveInt(dataRecord?.article_id) ||
    toPositiveInt(dataRecord?.articleId) ||
    toPositiveInt(dataRecord?.lesson_id) ||
    toPositiveInt(dataRecord?.lessonId);
  const explicitPostId =
    toPositiveInt(dataRecord?.post_id) ||
    toPositiveInt(dataRecord?.postId);
  const genericId = toPositiveInt(dataRecord?.id);

  if ((typeLower.includes('article') || typeLower.includes('lesson')) && (explicitArticleId || genericId)) {
    return { screen: 'ArticleDetails', params: { articleId: explicitArticleId || (genericId as number) } };
  }
  if (typeLower.includes('post') && (explicitPostId || genericId)) {
    return { screen: 'PostDetails', params: { postId: explicitPostId || (genericId as number) } };
  }

  if (!dataUrl) return null;

  let parsedPath = '';
  let articleIdFromQuery: number | null = null;
  let postIdFromQuery: number | null = null;
  let genericIdFromQuery: number | null = null;
  try {
    const parsed = new URL(dataUrl, 'https://internal.local');
    parsedPath = parsed.pathname || '';
    articleIdFromQuery =
      toPositiveInt(parsed.searchParams.get('article_id')) ||
      toPositiveInt(parsed.searchParams.get('articleId')) ||
      toPositiveInt(parsed.searchParams.get('lesson_id')) ||
      toPositiveInt(parsed.searchParams.get('lessonId'));
    postIdFromQuery =
      toPositiveInt(parsed.searchParams.get('post_id')) ||
      toPositiveInt(parsed.searchParams.get('postId'));
    genericIdFromQuery = toPositiveInt(parsed.searchParams.get('id'));
  } catch {
    parsedPath = dataUrl;
  }

  const topic = detectTopicFromPath(parsedPath);
  const pathId = extractIdFromPath(parsedPath);

  if (topic === 'article') {
    const articleId = explicitArticleId || articleIdFromQuery || pathId || genericIdFromQuery;
    if (articleId) return { screen: 'ArticleDetails', params: { articleId } };
  }
  if (topic === 'post') {
    const postId = explicitPostId || postIdFromQuery || pathId || genericIdFromQuery;
    if (postId) return { screen: 'PostDetails', params: { postId } };
  }

  if (articleIdFromQuery || explicitArticleId) {
    return { screen: 'ArticleDetails', params: { articleId: (articleIdFromQuery || explicitArticleId) as number } };
  }
  if (postIdFromQuery || explicitPostId) {
    return { screen: 'PostDetails', params: { postId: (postIdFromQuery || explicitPostId) as number } };
  }

  return null;
}

function formatNotificationDate(rawDate: string | undefined, locale: 'ar' | 'en') {
  if (!rawDate) return '';
  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) return '';

  const resolvedLocale = locale === 'ar' ? 'ar-JO' : 'en-US';
  const datePart = date.toLocaleDateString(resolvedLocale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const timePart = date.toLocaleTimeString(resolvedLocale, {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${datePart} - ${timePart}`;
}

export function NotificationsScreen() {
  const navigation = useNavigation<NotificationsNavigation>();
  const { t, locale } = useTranslation();
  const { user } = useAuth();
  const isRTL = locale === 'ar';
  const isOppositeRTL = !isRTL;
  const oppositeTextAlign: 'left' | 'right' = isRTL ? 'left' : 'right';
  const oppositeWritingDirection: 'ltr' | 'rtl' = isRTL ? 'ltr' : 'rtl';
  const oppositeTextStyle = {
    textAlign: oppositeTextAlign,
    writingDirection: oppositeWritingDirection,
  } as const;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markAllLoading, setMarkAllLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const [requiresAuth, setRequiresAuth] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const bgDrift = useSharedValue(0);

  const labels = useMemo(() => ({
    subtitle: t('notificationsSubtitle'),
    retry: t('retry'),
    refresh: t('refresh'),
    markAll: t('markAllRead'),
    unread: t('unread'),
    read: t('readStatus'),
    noItemsTitle: t('noNotificationsTitle'),
    noItemsSubtitle: t('noNotificationsSubtitle'),
    authTitle: t('loginRequired'),
    authSubtitle: t('loginRequiredSubtitle'),
    login: t('loginAction'),
    openTopicError: t('openTopicError'),
    deleteError: t('deleteNotificationError'),
  }), [t]);

  const unreadCount = useMemo(
    () => items.filter((item) => !item.read_at).length,
    [items]
  );

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

  const loadNotifications = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'refresh') {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setHasError(false);
    setRequiresAuth(false);

    if (!user) {
      setItems([]);
      setRequiresAuth(true);
      if (mode === 'refresh') {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
      return;
    }

    try {
      const response = await notificationService.list({ per_page: 40 });
      const list = normalizeNotifications(response);
      setItems(list);
    } catch (error) {
      if ((error as { status?: number } | null)?.status === 401) {
        setRequiresAuth(true);
        setHasError(false);
        setItems([]);
      } else {
        setHasError(true);
        setItems([]);
      }
    } finally {
      if (mode === 'refresh') {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, [user]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const markAsReadLocally = useCallback((id: string) => {
    const now = new Date().toISOString();
    setItems((prev) => prev.map((item) => (
      item.id === id ? { ...item, read_at: item.read_at || now } : item
    )));
  }, []);

  const handleOpenNotification = useCallback(async (item: Notification) => {
    if (!item.read_at) {
      markAsReadLocally(item.id);
      notificationService.markRead(item.id).catch(() => {});
    }

    const target = resolveNotificationTarget(item);
    if (!target) {
      Alert.alert(t('errorTitle'), labels.openTopicError);
      return;
    }

    if (target.screen === 'ArticleDetails') {
      navigation.navigate('ArticleDetails', target.params);
      return;
    }

    navigation.navigate('PostDetails', target.params);
  }, [markAsReadLocally, t, labels.openTopicError, navigation]);

  const handleMarkAllRead = useCallback(async () => {
    if (!unreadCount || markAllLoading) return;
    setMarkAllLoading(true);
    setItems((prev) => {
      const now = new Date().toISOString();
      return prev.map((item) => ({ ...item, read_at: item.read_at || now }));
    });
    try {
      await notificationService.markAllRead();
    } catch {
      // UI already updated optimistically; keep experience smooth.
    } finally {
      setMarkAllLoading(false);
    }
  }, [unreadCount, markAllLoading]);

  const handleDeleteNotification = useCallback(async (id: string) => {
    if (deletingId) return;

    let removedItem: Notification | null = null;
    let removedIndex = -1;

    setDeletingId(id);
    setItems((prev) => {
      removedIndex = prev.findIndex((entry) => entry.id === id);
      if (removedIndex < 0) return prev;
      removedItem = prev[removedIndex];
      return prev.filter((entry) => entry.id !== id);
    });

    try {
      await notificationService.remove(id);
    } catch {
      if (removedItem && removedIndex >= 0) {
        setItems((prev) => {
          const next = [...prev];
          const safeIndex = Math.min(removedIndex, next.length);
          next.splice(safeIndex, 0, removedItem as Notification);
          return next;
        });
      }
      Alert.alert(t('errorTitle'), labels.deleteError);
    } finally {
      setDeletingId((current) => (current === id ? null : current));
    }
  }, [deletingId, labels.deleteError, t]);

  const renderBackground = (
    <View pointerEvents="none" style={styles.background}>
      <LinearGradient
        colors={[SCREEN_BG_PRIMARY, SCREEN_BG_SECONDARY, SCREEN_BG_PRIMARY]}
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

  const renderSkeleton = (
    <View style={styles.skeletonWrap}>
      <View style={styles.headerCard}>
        <Skeleton height={24} width="45%" />
        <Skeleton height={16} width="80%" style={{ marginTop: spacing.xs }} />
        <View style={styles.headerStats}>
          <Skeleton height={26} width={90} borderRadius={radius.full} />
          <Skeleton height={26} width={110} borderRadius={radius.full} />
        </View>
      </View>
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} height={122} borderRadius={22} />
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
        renderSkeleton
      ) : (
        <>
          <Animated.View entering={FadeInUp.springify()}>
            <View style={styles.headerCard}>
              <BlurView intensity={24} tint="dark" pointerEvents="none" style={styles.glassLayer} />
              <LinearGradient
                pointerEvents="none"
                colors={[
                  'rgba(255,255,255,0.16)',
                  'rgba(255,255,255,0.04)',
                  'rgba(255,255,255,0)',
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.glassSheen}
              />

              <View style={[styles.headerTop, isOppositeRTL && styles.headerTopOppositeRTL]}>
                <View style={styles.headerIconShell}>
                  <Ionicons name="notifications-outline" size={19} color="#63E6E2" />
                </View>
                <View style={styles.headerTextWrap}>
                  <AppText weight="bold" size="xl" color={TEXT_PRIMARY} style={oppositeTextStyle}>
                    {t('notifications')}
                  </AppText>
                  <AppText size="sm" color={TEXT_SECONDARY} style={oppositeTextStyle}>
                    {labels.subtitle}
                  </AppText>
                </View>
              </View>

              <View style={[styles.headerStats, isOppositeRTL && styles.headerStatsOppositeRTL]}>
                <View style={styles.statChip}>
                  <AppText size="xs" weight="semibold" color={TEXT_PRIMARY} style={oppositeTextStyle}>
                    {`${items.length} ${t('notifications')}`}
                  </AppText>
                </View>
                <View style={styles.statChip}>
                  <AppText size="xs" weight="semibold" color={TEXT_PRIMARY} style={oppositeTextStyle}>
                    {`${unreadCount} ${labels.unread}`}
                  </AppText>
                </View>
              </View>
            </View>
          </Animated.View>

          {!requiresAuth ? (
            <Animated.View entering={FadeInUp.delay(70).springify()}>
              <View style={[styles.actionsRow, isOppositeRTL && styles.actionsRowOppositeRTL]}>
                <AppButton
                  title={refreshing ? `${labels.refresh}...` : labels.refresh}
                  variant="secondary"
                  size="sm"
                  onPress={() => loadNotifications('refresh')}
                  loading={refreshing}
                  style={styles.actionButton}
                />
                <AppButton
                  title={labels.markAll}
                  size="sm"
                  onPress={handleMarkAllRead}
                  loading={markAllLoading}
                  disabled={!unreadCount}
                  style={styles.actionButton}
                />
              </View>
            </Animated.View>
          ) : null}

          {requiresAuth ? (
            <View style={styles.errorCard}>
              <AppText weight="bold" size="md" color={TEXT_PRIMARY} style={oppositeTextStyle}>
                {labels.authTitle}
              </AppText>
              <AppText size="sm" color={TEXT_SECONDARY} style={oppositeTextStyle}>
                {labels.authSubtitle}
              </AppText>
              <AppButton
                title={labels.login}
                size="sm"
                onPress={() => navigation.navigate('Auth', { screen: 'Login' })}
                style={styles.retryButton}
              />
            </View>
          ) : hasError ? (
            <View style={styles.errorCard}>
              <AppText weight="bold" size="md" color={TEXT_PRIMARY} style={oppositeTextStyle}>
                {t('errorTitle')}
              </AppText>
              <AppText size="sm" color={TEXT_SECONDARY} style={oppositeTextStyle}>
                {t('errorMessage')}
              </AppText>
              <AppButton title={labels.retry} size="sm" onPress={() => loadNotifications()} style={styles.retryButton} />
            </View>
          ) : items.length === 0 ? (
            <View style={styles.emptyCard}>
              <AppText weight="bold" size="lg" color={TEXT_PRIMARY} style={oppositeTextStyle}>
                {labels.noItemsTitle}
              </AppText>
              <AppText size="sm" color={TEXT_SECONDARY} style={oppositeTextStyle}>
                {labels.noItemsSubtitle}
              </AppText>
            </View>
          ) : (
            <View style={styles.listWrap}>
              {items.map((item, index) => {
                const variant = CARD_VARIANTS[index % CARD_VARIANTS.length];
                const accentSoft = hexToRgba(variant.borderColor, 0.2);
                const accentBorder = hexToRgba(variant.borderColor, 0.48);
                const isUnread = !item.read_at;
                const createdLabel = formatNotificationDate(item.created_at, locale);

                return (
                  <Animated.View
                    key={`${item.id}-${index}`}
                    entering={FadeInUp.delay(index * 55).springify()}
                    style={styles.notificationCardWrap}
                  >
                    <AnimatedPressable
                      onPress={() => handleOpenNotification(item)}
                      style={styles.notificationPressable}
                    >
                      <View
                        style={[
                          styles.notificationCard,
                          {
                            borderColor: variant.borderColor,
                            shadowColor: variant.glowColor,
                          },
                        ]}
                      >
                        <BlurView intensity={20} tint="dark" pointerEvents="none" style={styles.glassLayer} />
                        <LinearGradient
                          pointerEvents="none"
                          colors={[
                            'rgba(255,255,255,0.14)',
                            'rgba(255,255,255,0.04)',
                            'rgba(255,255,255,0)',
                          ]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.glassSheen}
                        />

                        <View style={[styles.notificationTop, isOppositeRTL && styles.notificationTopOppositeRTL]}>
                          <View style={[styles.notificationIconShell, { backgroundColor: accentSoft, borderColor: accentBorder }]}>
                            <Ionicons name={variant.icon} size={17} color={variant.borderColor} />
                          </View>

                          <View style={styles.notificationTextWrap}>
                            <AppText weight="bold" size="md" color={TEXT_PRIMARY} numberOfLines={2} style={[styles.notificationTitle, oppositeTextStyle]}>
                              {item.data?.title || t('newNotification')}
                            </AppText>
                            <AppText size="sm" color={TEXT_SECONDARY} numberOfLines={3} style={[styles.notificationMessage, oppositeTextStyle]}>
                              {item.data?.message || ''}
                            </AppText>
                          </View>

	                          <View style={styles.trailingWrap}>
	                            {isUnread ? <View style={[styles.unreadDot, { backgroundColor: variant.borderColor }]} /> : null}
	                            <AnimatedPressable
	                              scale={0.93}
	                              disabled={deletingId === item.id}
	                              onPress={(event) => {
	                                event.stopPropagation?.();
	                                void handleDeleteNotification(item.id);
	                              }}
	                              style={[
	                                styles.deleteButton,
	                                {
	                                  borderColor: accentBorder,
	                                  backgroundColor: accentSoft,
	                                  opacity: deletingId === item.id ? 0.55 : 1,
	                                },
	                              ]}
	                            >
	                              <Ionicons
	                                name={deletingId === item.id ? 'hourglass-outline' : 'trash-outline'}
	                                size={13}
	                                color={TEXT_MUTED}
	                              />
	                            </AnimatedPressable>
	                            <Ionicons
	                              name={isOppositeRTL ? 'chevron-back-outline' : 'chevron-forward-outline'}
	                              size={17}
                              color={TEXT_MUTED}
                            />
                          </View>
                        </View>

                        <View style={[styles.notificationMetaRow, isOppositeRTL && styles.notificationMetaRowOppositeRTL]}>
                          <View style={[styles.metaChip, { borderColor: accentBorder, backgroundColor: accentSoft }]}>
                            <AppText size="xs" weight="semibold" color={TEXT_PRIMARY} style={oppositeTextStyle}>
                              {isUnread ? labels.unread : labels.read}
                            </AppText>
                          </View>
                          {createdLabel ? (
                            <View style={[styles.metaChip, { borderColor: accentBorder, backgroundColor: accentSoft }]}>
                              <AppText size="xs" weight="semibold" color={TEXT_PRIMARY} style={oppositeTextStyle}>
                                {createdLabel}
                              </AppText>
                            </View>
                          ) : null}
                        </View>
                      </View>
                    </AnimatedPressable>
                  </Animated.View>
                );
              })}
            </View>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: SCREEN_BG_PRIMARY,
  },
  content: {
    position: 'relative',
    zIndex: 1,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
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
    shadowColor: SCREEN_BG_SECONDARY,
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
  glassLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  glassSheen: {
    ...StyleSheet.absoluteFillObject,
  },
  skeletonWrap: {
    gap: spacing.sm,
  },
  headerCard: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(207,233,255,0.3)',
    backgroundColor: 'rgba(8,27,45,0.55)',
    padding: spacing.md,
    gap: spacing.sm,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTopOppositeRTL: {
    flexDirection: 'row-reverse',
  },
  headerIconShell: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(99,230,226,0.5)',
    backgroundColor: 'rgba(99,230,226,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: {
    flex: 1,
    gap: 2,
  },
  headerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerStatsOppositeRTL: {
    flexDirection: 'row-reverse',
  },
  statChip: {
    minHeight: 28,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(190,224,255,0.28)',
    backgroundColor: 'rgba(14,43,67,0.58)',
    paddingHorizontal: spacing.sm,
    justifyContent: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  actionsRowOppositeRTL: {
    flexDirection: 'row-reverse',
  },
  actionButton: {
    flex: 1,
  },
  errorCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(207,233,255,0.3)',
    backgroundColor: 'rgba(8,27,45,0.58)',
    padding: spacing.md,
    gap: spacing.sm,
  },
  retryButton: {
    alignSelf: 'flex-start',
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
  listWrap: {
    gap: spacing.sm,
  },
  notificationCardWrap: {
    width: '100%',
  },
  notificationPressable: {
    width: '100%',
  },
  notificationCard: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 22,
    borderWidth: 1.2,
    backgroundColor: 'rgba(9,23,37,0.34)',
    padding: spacing.sm,
    gap: spacing.sm,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.62,
    shadowRadius: 12,
    elevation: 8,
  },
  notificationTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  notificationTopOppositeRTL: {
    flexDirection: 'row-reverse',
  },
  notificationIconShell: {
    width: 38,
    height: 38,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationTextWrap: {
    flex: 1,
    gap: spacing['2xs'],
  },
  notificationTitle: {
    lineHeight: 22,
  },
  notificationMessage: {
    lineHeight: 19,
  },
  trailingWrap: {
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 6,
    paddingTop: 2,
  },
  deleteButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  notificationMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  notificationMetaRowOppositeRTL: {
    flexDirection: 'row-reverse',
  },
  metaChip: {
    minHeight: 28,
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    justifyContent: 'center',
  },
});
