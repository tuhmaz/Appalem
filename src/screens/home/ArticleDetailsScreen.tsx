import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, Text, View } from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  cancelAnimation,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import {
  AppButton,
  AppText,
  BannerAd,
  Card,
  CommentsSection,
  Screen,
} from '@/components';
import { articleService } from '@/services/articles';
import { commentService } from '@/services/comments';
import { ENV } from '@/config/env';
import type { Article, Comment, FileItem } from '@/types/api';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuth } from '@/store/AuthContext';
import { useCountry } from '@/store/CountryContext';
import { spacing, radius, typography } from '@/theme';
import { useTheme } from '@/theme/ThemeContext';
import { stripHtml } from '@/utils/format';
import { useInterstitialAd } from '@/hooks/useInterstitialAd';
import { normalizeBaseUrl, normalizeExternalUrl, stripApiSuffix } from '@/utils/url';

const ARTICLE_COMMENT_TYPE = 'App\\Models\\Article';

const DETAIL_BG_PRIMARY = '#091725';
const DETAIL_BG_SECONDARY = '#134765';
const TEXT_PRIMARY = '#F4FAFF';
const TEXT_SECONDARY = 'rgba(223,239,255,0.88)';
const TEXT_MUTED = 'rgba(184,214,239,0.78)';

type ArticleDetailsNavigation = NativeStackNavigationProp<{
  Auth: { screen?: string } | undefined;
  ArticleDetails: { articleId: number };
  Download: {
    fileId: number;
    fileName: string;
    fileSize: number;
    fileType: string;
    fileUrl?: string;
    filePath?: string;
  };
}>;

function resolveAssetUrl(path?: string | null) {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path)) {
    return normalizeExternalUrl(path) ?? undefined;
  }

  const base = stripApiSuffix(normalizeBaseUrl(ENV.API_URL));
  const normalized = path.startsWith('/') ? path : `/${path}`;

  if (normalized.startsWith('/storage/')) {
    return normalizeExternalUrl(`${base}${normalized}`) ?? undefined;
  }

  if (normalized.startsWith('/api/')) {
    return normalizeExternalUrl(`${base}${normalized}`) ?? undefined;
  }

  return normalizeExternalUrl(`${base}/storage${normalized}`) ?? undefined;
}

function normalizeArticleFiles(article: Article | null): FileItem[] {
  if (!article) return [];
  const raw = (article as Article & { files?: unknown }).files;
  if (Array.isArray(raw)) return raw as FileItem[];
  if (
    raw &&
    typeof raw === 'object' &&
    Array.isArray((raw as { data?: unknown }).data)
  ) {
    return (raw as { data: FileItem[] }).data;
  }
  return [];
}

function formatFileSize(bytes?: number) {
  if (!bytes || bytes <= 0) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const precision = value >= 100 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(precision)} ${units[unitIndex]}`;
}

function normalizeArticleContent(raw?: string) {
  if (!raw) return '';
  const withBreaks = raw
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<li>/gi, '- ')
    .replace(/<\/li>/gi, '\n')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');

  return stripHtml(withBreaks)
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function ArticleDetailsScreen() {
  const route = useRoute<RouteProp<{ params: { articleId: number } }, 'params'>>();
  const navigation = useNavigation<ArticleDetailsNavigation>();
  const { t, locale } = useTranslation();
  const { user } = useAuth();
  const { country } = useCountry();
  const { theme } = useTheme();
  const { showAd } = useInterstitialAd();
  const isRTL = locale === 'ar';

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [article, setArticle] = useState<Article | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentBody, setCommentBody] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  const database = useMemo(() => country.code || 'jo', [country.code]);
  const bgDrift = useSharedValue(0);
  
  const writingDirection: 'ltr' | 'rtl' = isRTL ? 'rtl' : 'ltr';
  const textAlign: 'left' | 'right' = 'left';
  const contentDirectionStyle = isRTL ? styles.contentRTL : styles.contentLTR;

  const titleTextStyle = {
    textAlign,
    writingDirection,
  } as const;

  const labels = useMemo(() => ({
    contentTitle: t('articleContent'),
    noContent: t('noContent'),
    noImage: t('noImage'),
    date: t('date'),
    views: t('views'),
    downloads: t('downloads'),
    openAttachment: t('openAttachment'),
    noAttachments: t('noAttachments'),
    fileFallback: t('fileFallback'),
    retry: t('retry'),
  }), [t]);

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

  const loadArticle = useCallback(async (signal?: { cancelled: boolean }) => {
    setLoading(true);
    setLoadError(false);
    setComments([]);

    if (!country.id) {
      setArticle(null);
      setLoadError(true);
      setLoading(false);
      return;
    }

    try {
      const data = await articleService.show(route.params.articleId);
      if (signal?.cancelled) return;
      setArticle(data);
    } catch {
      if (signal?.cancelled) return;
      setArticle(null);
      setLoadError(true);
    } finally {
      if (!signal?.cancelled) setLoading(false);
    }
  }, [route.params.articleId, country.id]);

  useEffect(() => {
    const signal = { cancelled: false };
    loadArticle(signal);
    return () => {
      signal.cancelled = true;
    };
  }, [loadArticle]);

  useEffect(() => {
    if (!article?.id) return;
    let mounted = true;
    setCommentsLoading(true);

    commentService.list(database, {
      commentable_id: article.id,
      commentable_type: ARTICLE_COMMENT_TYPE,
      per_page: 50,
    })
      .then((result) => {
        if (mounted) setComments(result.items || []);
      })
      .catch(() => {
        if (mounted) setComments([]);
      })
      .finally(() => {
        if (mounted) setCommentsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [article?.id, database]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      showAd().catch(() => {});
    });
    return unsubscribe;
  }, [navigation, showAd]);

  const articleImageUrl = resolveAssetUrl(article?.image_url || article?.image);
  const files = normalizeArticleFiles(article);
  const normalizedBody = normalizeArticleContent(article?.content || article?.meta_description || '');
  const dateValue = article?.created_at
    ? new Date(article.created_at).toLocaleDateString(locale === 'ar' ? 'ar-JO' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    : '';
  const articleTitle = article?.title || '';
  const contentTitle = labels.contentTitle;
  const contentBody = normalizedBody || labels.noContent;

  const handleCommentSubmit = useCallback(async () => {
    if (!commentBody.trim()) return;
    if (!user) {
      navigation.navigate('Auth', { screen: 'Login' });
      return;
    }

    setCommentSubmitting(true);
    try {
      const created = await commentService.create(database, {
        body: commentBody.trim(),
        commentable_id: article?.id || route.params.articleId,
        commentable_type: ARTICLE_COMMENT_TYPE,
      });

      const newComment: Comment = {
        id: created?.id || Date.now(),
        body: created?.body || commentBody.trim(),
        user: created?.user || user,
        created_at: created?.created_at || new Date().toISOString(),
      } as Comment;

      setComments((prev) => [newComment, ...prev]);
      setCommentBody('');
    } catch {
      Alert.alert(t('errorTitle'), t('commentSubmitError'));
    } finally {
      setCommentSubmitting(false);
    }
  }, [commentBody, user, navigation, database, article?.id, route.params.articleId, t]);

  const openDownload = (file: FileItem) => {
    navigation.navigate('Download', {
      fileId: file.id,
      fileName: file.file_name || labels.fileFallback,
      fileSize: file.file_size || 0,
      fileType: file.file_type || '',
      fileUrl: file.file_url,
      filePath: file.file_path,
    });
  };

  const renderBackground = (
    <View pointerEvents="none" style={styles.background}>
      <LinearGradient
        colors={[DETAIL_BG_PRIMARY, DETAIL_BG_SECONDARY, DETAIL_BG_PRIMARY]}
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

  if (loading) {
    return (
      <Screen style={styles.screen} contentStyle={styles.loadingContent} background={renderBackground}>
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      </Screen>
    );
  }

  if (!article) {
    return (
      <Screen style={styles.screen} background={renderBackground}>
        <Card style={styles.fallbackCard}>
          <AppText color={TEXT_PRIMARY} style={contentDirectionStyle}>
            {loadError ? t('errorMessage') : t('lessonLoadError')}
          </AppText>
          {loadError ? (
            <AppButton
              title={labels.retry}
              size="sm"
              onPress={() => {
                loadArticle();
              }}
              style={styles.retryButton}
            />
          ) : null}
        </Card>
      </Screen>
    );
  }

  return (
    <Screen
      scroll
      style={styles.screen}
      contentStyle={styles.content}
      background={renderBackground}
    >
      <Card style={styles.heroCard}>
        {articleImageUrl ? (
          <Image source={{ uri: articleImageUrl }} style={styles.heroImage} resizeMode="cover" />
        ) : (
          <View style={styles.heroFallback}>
            <AppText size="sm" color={TEXT_MUTED} style={contentDirectionStyle}>
              {labels.noImage}
            </AppText>
          </View>
        )}

        <AppText weight="bold" size="xl" color={TEXT_PRIMARY} style={[styles.articleTitle, titleTextStyle]}>
          {articleTitle}
        </AppText>

        <View style={styles.metaRow}>
          {dateValue ? (
            <View style={styles.metaChip}>
              <AppText size="xs" weight="semibold" color={TEXT_SECONDARY} style={[styles.metaText, contentDirectionStyle]}>
                {`${labels.date}: ${dateValue}`}
              </AppText>
            </View>
          ) : null}

          {typeof article.views === 'number' ? (
            <View style={styles.metaChip}>
              <AppText size="xs" weight="semibold" color={TEXT_SECONDARY} style={[styles.metaText, contentDirectionStyle]}>
                {`${labels.views}: ${article.views}`}
              </AppText>
            </View>
          ) : null}

          {typeof article.downloads === 'number' ? (
            <View style={styles.metaChip}>
              <AppText size="xs" weight="semibold" color={TEXT_SECONDARY} style={[styles.metaText, contentDirectionStyle]}>
                {`${labels.downloads}: ${article.downloads}`}
              </AppText>
            </View>
          ) : null}
        </View>
      </Card>

      <Card
        style={[
          styles.contentCard,
          {
            direction: writingDirection,
          },
        ]}
      >
        <Text
          style={[
            styles.contentSectionTitle,
            {
              color: TEXT_PRIMARY,
              textAlign: textAlign,
              writingDirection: writingDirection,
              direction: writingDirection,
            },
          ]}
        >
          {contentTitle}
        </Text>
        <Text
          style={[
            styles.contentBodyText,
            {
              color: TEXT_SECONDARY,
              textAlign: textAlign,
              writingDirection: writingDirection,
              direction: writingDirection,
            },
          ]}
        >
          {contentBody}
        </Text>
      </Card>

      <BannerAd size="MEDIUM_RECTANGLE" style={styles.adContainer} />

      <Card style={styles.filesCard}>
        <View style={styles.filesHeader}>
          <AppText weight="bold" size="lg" color={TEXT_PRIMARY} style={contentDirectionStyle}>
            {t('files')}
          </AppText>
          <AppText size="sm" color={TEXT_MUTED} style={contentDirectionStyle}>
            {files.length}
          </AppText>
        </View>

        {files.length > 0 ? (
          <View style={styles.filesList}>
            {files.map((file, index) => {
              const fileMeta = [
                file.file_type ? file.file_type.toUpperCase() : '',
                formatFileSize(file.file_size),
              ]
                .filter(Boolean)
                .join(' - ');

              return (
                <View key={`${file.id}-${index}`} style={styles.fileRow}>
                  <View style={styles.fileInfo}>
                    <AppText weight="semibold" color={TEXT_PRIMARY} numberOfLines={1} style={contentDirectionStyle}>
                      {file.file_name || labels.fileFallback}
                    </AppText>
                    {fileMeta ? (
                      <AppText size="xs" color={TEXT_MUTED} style={contentDirectionStyle}>
                        {fileMeta}
                      </AppText>
                    ) : null}
                  </View>
                  <AppButton
                    title={labels.openAttachment}
                    size="sm"
                    onPress={() => openDownload(file)}
                    style={styles.fileButton}
                  />
                </View>
              );
            })}
          </View>
        ) : (
          <AppText size="sm" color={TEXT_MUTED} style={contentDirectionStyle}>
            {labels.noAttachments}
          </AppText>
        )}
      </Card>

      <CommentsSection
        comments={comments}
        commentsLoading={commentsLoading}
        commentBody={commentBody}
        onCommentBodyChange={setCommentBody}
        onSubmitComment={handleCommentSubmit}
        commentSubmitting={commentSubmitting}
        isLoggedIn={!!user}
        onLoginPress={() => navigation.navigate('Auth', { screen: 'Login' })}
        t={t}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: DETAIL_BG_PRIMARY,
  },
  content: {
    position: 'relative',
    zIndex: 1,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  loadingContent: {
    position: 'relative',
    zIndex: 1,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  fallbackCard: {
    borderWidth: 1,
    borderColor: 'rgba(189,218,246,0.3)',
    backgroundColor: 'rgba(8,27,45,0.55)',
    gap: spacing.sm,
  },
  retryButton: {
    alignSelf: 'flex-start',
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
    shadowColor: DETAIL_BG_SECONDARY,
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
  heroCard: {
    borderWidth: 1,
    borderColor: 'rgba(190,224,255,0.26)',
    backgroundColor: 'rgba(8,27,45,0.56)',
    gap: spacing.sm,
  },
  heroImage: {
    width: '100%',
    height: 220,
    borderRadius: radius.lg,
    marginBottom: spacing.xs,
  },
  heroFallback: {
    width: '100%',
    minHeight: 96,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(190,224,255,0.2)',
    backgroundColor: 'rgba(8,27,45,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  articleTitle: {
    alignSelf: 'stretch',
    lineHeight: 34,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  metaChip: {
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(190,224,255,0.35)',
    backgroundColor: 'rgba(14,43,67,0.62)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing['2xs'],
  },
  metaText: {
    textAlign: 'center',
  },
  contentCard: {
    borderWidth: 1,
    borderColor: 'rgba(190,224,255,0.24)',
    backgroundColor: 'rgba(8,27,45,0.52)',
  },
  contentSectionTitle: {
    width: '100%',
    marginBottom: spacing.sm,
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.lg,
    lineHeight: typography.lineHeight.lg,
  },
  contentBodyText: {
    width: '100%',
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.md,
    lineHeight: 28,
  },
  contentRTL: {
    alignSelf: 'stretch',
    width: '100%',
    textAlign: 'left',
    writingDirection: 'rtl',
    direction: 'rtl',
  },
  contentLTR: {
    alignSelf: 'stretch',
    width: '100%',
    textAlign: 'left',
    writingDirection: 'ltr',
    direction: 'ltr',
  },
  adContainer: {
    marginVertical: spacing.md,
  },
  filesCard: {
    borderWidth: 1,
    borderColor: 'rgba(190,224,255,0.24)',
    backgroundColor: 'rgba(8,27,45,0.52)',
    gap: spacing.sm,
  },
  filesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filesList: {
    gap: spacing.sm,
  },
  fileRow: {
    borderWidth: 1,
    borderColor: 'rgba(190,224,255,0.2)',
    backgroundColor: 'rgba(14,43,67,0.5)',
    borderRadius: radius.lg,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  fileInfo: {
    gap: spacing['2xs'],
  },
  fileButton: {
    alignSelf: 'flex-start',
    minWidth: 126,
  },
});
