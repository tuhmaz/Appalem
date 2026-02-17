import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { AppText, Card, LoadingState, Screen } from '@/components';
import { frontService } from '@/services/front';
import type { Member } from '@/types/api';
import { spacing } from '@/theme';
import { useTheme } from '@/theme/ThemeContext';

export function MembersScreen() {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    let mounted = true;
    frontService.members()
      .then(data => {
        if (mounted) setMembers(data || []);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) return <LoadingState />;

  return (
    <Screen>
      <FlatList
        data={members}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <AppText weight="bold">{item.name}</AppText>
            {item.role ? (
              <AppText size="sm" color={theme.colors.onSurfaceVariant}>{item.role}</AppText>
            ) : null}
            {item.bio ? (
              <AppText size="sm" color={theme.colors.onSurfaceVariant}>{item.bio}</AppText>
            ) : null}
          </Card>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
});
