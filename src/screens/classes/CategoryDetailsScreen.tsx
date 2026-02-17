import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { AppText, Card, EmptyState, LoadingState, Screen } from '@/components';
import { useCountry } from '@/store/CountryContext';
import { articleService } from '@/services/articles';
import type { Article } from '@/types/api';
import { truncate, stripHtml } from '@/utils/format';
import { useTranslation } from '@/hooks/useTranslation';
import { spacing } from '@/theme';
import { useTheme } from '@/theme/ThemeContext';
import type { RootNavigation } from '@/navigation/types';

export function CategoryDetailsScreen() {
  const route = useRoute<RouteProp<{ params: { categoryId: number } }, 'params'>>();
  const navigation = useNavigation<RootNavigation>();
  const { country } = useCountry();
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [articles, setArticles] = useState<Article[]>([]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setArticles([]);

    articleService.list({ category_id: route.params.categoryId })
      .then(data => {
        const list = Array.isArray(data?.data) ? data.data : data;
        if (mounted) setArticles(list || []);
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
  }, [route.params.categoryId, country.id]);

  if (loading) return <LoadingState />;

  if (!articles.length) {
    return (
      <Screen>
        <EmptyState title={t('noArticlesTitle')} subtitle={t('noArticlesSubtitle')} />
      </Screen>
    );
  }

  return (
    <Screen>
      <FlatList
        data={articles}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => navigation.navigate('ArticleDetails', { articleId: item.id })}>
            <Card style={styles.card}>
              <AppText weight="bold">{item.title}</AppText>
              <AppText size="sm" color={theme.colors.onSurfaceVariant} style={styles.subtitle}>
                {truncate(stripHtml(item.meta_description || item.content || ''), 110)}
              </AppText>
            </Card>
          </TouchableOpacity>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md
  },
  subtitle: {
    marginTop: spacing.xs
  }
});
