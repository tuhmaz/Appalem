import React from 'react';
import { ActivityIndicator, View, ViewStyle } from 'react-native';
import { AppText } from './AppText';
import { AppInput } from './AppInput';
import { AppButton } from './AppButton';
import { Card } from './Card';
import { EmptyState } from './EmptyState';
import { useTheme } from '@/theme/ThemeContext';
import { spacing, typography } from '@/theme';
import { useLocale } from '@/store/LocaleContext';
import type { Comment } from '@/types/api';

type CommentsSectionProps = {
  comments: Comment[];
  commentsLoading: boolean;
  commentBody: string;
  onCommentBodyChange: (text: string) => void;
  onSubmitComment: () => void;
  commentSubmitting: boolean;
  isLoggedIn: boolean;
  onLoginPress: () => void;
  t: (key: string) => string;
  invertDirection?: boolean;
};

function sanitizeUiText(value: string) {
  // Remove hidden bidi/control marks that can appear as tofu squares on some devices/fonts.
  return value.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, '').trim();
}

export function CommentsSection({
  comments,
  commentsLoading,
  commentBody,
  onCommentBodyChange,
  onSubmitComment,
  commentSubmitting,
  isLoggedIn,
  onLoginPress,
  t,
  invertDirection = false,
}: CommentsSectionProps) {
  const { theme } = useTheme();
  const { locale } = useLocale();
  const isRTL = locale === 'ar';
  const effectiveRTL = invertDirection ? !isRTL : isRTL;
  const commentsTitle = sanitizeUiText(t('comments'));
  const headingTextDirectionStyle = isRTL
    ? { textAlign: 'right' as const, writingDirection: 'rtl' as const }
    : { textAlign: 'left' as const, writingDirection: 'ltr' as const };
  const textDirectionStyle = effectiveRTL
    ? { textAlign: 'right' as const, writingDirection: 'rtl' as const }
    : { textAlign: 'left' as const, writingDirection: 'ltr' as const };
  const dateLocale = locale === 'ar' ? 'ar-JO' : 'en-US';

  return (
    <>
      <View
        style={{
          flexDirection: effectiveRTL ? 'row-reverse' : 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: spacing.md,
          marginTop: spacing.lg,
        }}
      >
        <AppText weight="bold" size="lg" style={headingTextDirectionStyle}>{commentsTitle || t('comments')}</AppText>
        <AppText size="sm" color={theme.colors.onSurfaceVariant} style={headingTextDirectionStyle}>{comments.length}</AppText>
      </View>

      {isLoggedIn ? (
        <Card style={{ gap: spacing.md, marginBottom: spacing.lg } as ViewStyle}>
          <AppText weight="semibold" size="md" style={textDirectionStyle}>{t('addComment')}</AppText>
          <AppInput
            placeholder={t('commentPlaceholder')}
            value={commentBody}
            onChangeText={onCommentBodyChange}
            style={{
              height: 120,
              textAlignVertical: 'top',
              textAlign: effectiveRTL ? 'right' : 'left',
              writingDirection: effectiveRTL ? 'rtl' : 'ltr',
            }}
            multiline
          />
          <AppButton
            title={t('sendComment')}
            onPress={onSubmitComment}
            loading={commentSubmitting}
          />
        </Card>
      ) : (
        <Card style={{ gap: spacing.md, marginBottom: spacing.lg } as ViewStyle}>
          <AppText size="sm" color={theme.colors.onSurfaceVariant} style={textDirectionStyle}>{t('loginToComment')}</AppText>
          <AppButton title={t('loginAction')} onPress={onLoginPress} />
        </Card>
      )}

      {commentsLoading ? (
        <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.lg }}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : comments.length === 0 ? (
        invertDirection ? (
          <Card style={{ gap: spacing.xs } as ViewStyle}>
            <AppText weight="bold" size="md" style={textDirectionStyle}>{t('noCommentsTitle')}</AppText>
            <AppText size="sm" color={theme.colors.onSurfaceVariant} style={textDirectionStyle}>{t('noCommentsSubtitle')}</AppText>
          </Card>
        ) : (
          <EmptyState title={t('noCommentsTitle')} subtitle={t('noCommentsSubtitle')} />
        )
      ) : (
        <View style={{ gap: spacing.md } as ViewStyle}>
          {comments.map((comment, index) => (
            <Card key={comment.id || `comment-${index}`} style={{ gap: spacing.sm } as ViewStyle}>
              <View style={{ flexDirection: effectiveRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: spacing.sm }}>
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 19,
                    backgroundColor: theme.colors.primary,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AppText weight="bold" color={theme.colors.onPrimary}>
                    {(comment.user?.name || t('unknownUser')).slice(0, 1).toUpperCase()}
                  </AppText>
                </View>
                <View style={{ flex: 1 }}>
                  <AppText weight="bold" style={textDirectionStyle}>{comment.user?.name || t('unknownUser')}</AppText>
                  <AppText size="xs" color={theme.colors.onSurfaceVariant} style={textDirectionStyle}>
                    {comment.created_at
                      ? new Date(comment.created_at).toLocaleDateString(dateLocale)
                      : ''}
                  </AppText>
                </View>
              </View>
              <AppText style={[{ lineHeight: typography.lineHeight.sm }, textDirectionStyle]}>{comment.body}</AppText>
            </Card>
          ))}
        </View>
      )}
    </>
  );
}
