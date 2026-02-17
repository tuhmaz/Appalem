import React, { useState } from 'react';
import { FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { AppButton, AppInput, AppText, Card, Screen } from '@/components';
import { searchLessons } from '@/services/search';
import type { SearchResult } from '@/services/search';
import { spacing } from '@/theme';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from '@/hooks/useTranslation';
import { useTheme } from '@/theme/ThemeContext';

type SearchNavigation = NativeStackNavigationProp<{
  ArticleDetails: { articleId: number };
  PostDetails: { postId: number };
}>;

export function SearchScreen() {
  const navigation = useNavigation<SearchNavigation>();
  const { t, locale } = useTranslation();
  const { theme } = useTheme();
  const isRTL = locale === 'ar';
  const oppositeTextAlign: 'left' | 'right' = isRTL ? 'left' : 'right';
  const oppositeWritingDirection: 'ltr' | 'rtl' = isRTL ? 'ltr' : 'rtl';
  const oppositeTextStyle = {
    textAlign: oppositeTextAlign,
    writingDirection: oppositeWritingDirection,
  } as const;
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);

  const onSearch = async () => {
    setLoading(true);
    try {
      const data = await searchLessons({ query });
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen tabScreen>
      <View style={styles.searchRow}>
        <AppInput
          placeholder={t('searchPlaceholder')}
          value={query}
          onChangeText={setQuery}
          style={[styles.searchInput, oppositeTextStyle]}
        />
        <AppButton
          title={t('searchAction')}
          onPress={onSearch}
          loading={loading}
          style={[
            styles.searchButton,
            isRTL ? styles.searchButtonOppositeRTL : styles.searchButtonOppositeLTR,
          ]}
        />
      </View>

      {results.length === 0 && !loading ? (
        <View style={styles.emptyWrap}>
          <AppText weight="bold" size="lg" style={oppositeTextStyle}>
            {t('noResultsTitle')}
          </AppText>
          <AppText
            size="sm"
            color={theme.colors.onSurfaceVariant}
            style={[styles.emptySubtitle, oppositeTextStyle]}
          >
            {t('noResultsSubtitle')}
          </AppText>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.resultsList}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => {
                if (item.type === 'post') {
                  navigation.navigate('PostDetails', { postId: Number(item.id) });
                } else {
                  navigation.navigate('ArticleDetails', { articleId: Number(item.id) });
                }
              }}
            >
              <Card style={styles.card}>
                <AppText weight="bold" style={oppositeTextStyle}>
                  {item.title}
                </AppText>
                {item.description ? (
                  <AppText size="sm" color={theme.colors.onSurfaceVariant} style={[styles.subtitle, oppositeTextStyle]}>
                    {item.description}
                  </AppText>
                ) : null}
              </Card>
            </TouchableOpacity>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchRow: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  searchInput: {
    marginBottom: spacing.sm,
  },
  searchButton: {
    minWidth: 130,
  },
  searchButtonOppositeRTL: {
    alignSelf: 'flex-start',
  },
  searchButtonOppositeLTR: {
    alignSelf: 'flex-end',
  },
  emptyWrap: {
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptySubtitle: {
    marginTop: spacing.sm,
  },
  resultsList: {
    paddingBottom: spacing.xl,
  },
  card: {
    marginBottom: spacing.md,
  },
  subtitle: {
    marginTop: spacing.xs,
  },
});
