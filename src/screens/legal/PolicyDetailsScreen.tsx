import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { AnimatedPressable, AppText, Card, Screen } from '@/components';
import { ENV } from '@/config/env';
import { useTranslation } from '@/hooks/useTranslation';
import { adMobService } from '@/services/admob';
import { frontService, type LegalType } from '@/services/front';
import { radius, spacing } from '@/theme';
import { useTheme } from '@/theme/ThemeContext';
import policySource from './policy-extract.json';

type PolicyRouteParams = {
  policyType: LegalType;
  title: string;
};

type RawBlock = {
  type: 'h2' | 'h3' | 'h4' | 'p' | 'li';
  text: string;
};

type PolicySourceMap = Record<LegalType, {
  mainBlocks: RawBlock[];
}>;

const POLICY_SOURCE = policySource as PolicySourceMap;

function pickSetting(settings: Record<string, unknown>, keys: string[], fallback: string) {
  for (const key of keys) {
    const value = settings[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return fallback;
}

function resolveDynamicTokens(
  rawText: string,
  vars: { siteName: string; siteUrl: string; contactEmail: string }
) {
  let text = rawText;

  text = text.replace(/\{\{\s*__\('([^']*)'\)\s*\}\}/g, '$1');

  text = text.replace(/\{\{\s*config\('settings\.site_name'(?:\s*,\s*[^)]*)?\)\s*\}\}/g, vars.siteName);
  text = text.replace(/\{\{\s*\$settings\['contact_email'\]\s*\?\?\s*'[^']*'\s*\}\}/g, vars.contactEmail);
  text = text.replace(/\{\{\s*\$settings\['canonical_url'\]\s*\?\?\s*'[^']*'\s*\}\}/g, vars.siteUrl);
  text = text.replace(/\{\{\s*\$siteName\s*\}\}/g, vars.siteName);
  text = text.replace(/\{\{\s*\$siteUrl\s*\}\}/g, vars.siteUrl);
  text = text.replace(/\{\{\s*siteName\s*\}\}/g, vars.siteName);
  text = text.replace(/\{\{\s*siteUrl\s*\}\}/g, vars.siteUrl);
  text = text.replace(/\{\{\s*contactEmail\s*\}\}/g, vars.contactEmail);

  text = text.replace(/\{\{\s*[^}]*\s*\}\}/g, '');

  return text.replace(/\s+/g, ' ').trim();
}

function normalizePolicyBlocks(
  blocks: RawBlock[],
  routeTitle: string,
  vars: { siteName: string; siteUrl: string; contactEmail: string }
) {
  const ignored = new Set([
    'Home',
    'Privacy Policy',
    'Terms of Service',
    'Cookie Policy',
    'Disclaimer',
    routeTitle.trim(),
  ]);

  return blocks
    .map((block) => ({
      type: block.type,
      text: resolveDynamicTokens(block.text, vars),
    }))
    .filter((block) => block.text.length > 0)
    .filter((block) => !ignored.has(block.text));
}

function extractUpdatedLine(blocks: Array<{ type: string; text: string }>) {
  const pattern = /^(?:\u0622\u062e\u0631\s+\u062a\u062d\u062f\u064a\u062b|Last\s+update)\s*:/i;
  const found = blocks.find((block) => block.type === 'p' && pattern.test(block.text));
  return found?.text || '';
}

export function PolicyDetailsScreen() {
  const route = useRoute<RouteProp<{ params: PolicyRouteParams }, 'params'>>();
  const { locale, t } = useTranslation();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [consentLoading, setConsentLoading] = useState(false);
  const [settings, setSettings] = useState<Record<string, unknown>>({});

  const isRTL = locale === 'ar';
  const oppositeTextStyle = isRTL ? styles.oppositeTextRTL : styles.oppositeTextLTR;
  const oppositeBulletRow = isRTL ? styles.bulletRowLTR : styles.bulletRowRTL;
  const canShowConsentLink = route.params.policyType === 'privacy' || route.params.policyType === 'cookie';

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    frontService.legal(route.params.policyType)
      .then((result) => {
        if (!mounted) return;
        setSettings(result.settings || {});
      })
      .catch(() => {
        if (!mounted) return;
        setSettings({});
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [route.params.policyType]);

  const siteName = pickSetting(
    settings,
    ['site_name', 'siteName'],
    locale === 'ar' ? '\u0645\u0648\u0642\u0639 \u0627\u0644\u0625\u064a\u0645\u0627\u0646 \u0627\u0644\u062a\u0639\u0644\u064a\u0645\u064a' : 'Alemancenter'
  );
  const siteUrl = pickSetting(settings, ['canonical_url', 'site_url', 'siteUrl'], ENV.SITE_URL);
  const contactEmail = pickSetting(settings, ['contact_email', 'site_email'], 'info@alemancenter.com');

  const policyBlocks = useMemo(
    () => normalizePolicyBlocks(
      POLICY_SOURCE[route.params.policyType]?.mainBlocks || [],
      route.params.title,
      { siteName, siteUrl, contactEmail }
    ),
    [route.params.policyType, route.params.title, siteName, siteUrl, contactEmail]
  );

  const updatedAt = useMemo(() => extractUpdatedLine(policyBlocks), [policyBlocks]);

  const contentBlocks = useMemo(
    () => policyBlocks.filter((block) => block.text !== updatedAt),
    [policyBlocks, updatedAt]
  );

  const consentCopy = useMemo(() => {
    if (isRTL) {
      return {
        title: '\u062e\u064a\u0627\u0631\u0627\u062a \u062e\u0635\u0648\u0635\u064a\u0629 \u0627\u0644\u0625\u0639\u0644\u0627\u0646\u0627\u062a',
        description:
          '\u064a\u0645\u0643\u0646\u0643 \u062a\u0639\u062f\u064a\u0644 \u0623\u0648 \u0633\u062d\u0628 \u0645\u0648\u0627\u0641\u0642\u0629 \u0627\u0644\u0625\u0639\u0644\u0627\u0646\u0627\u062a \u0641\u064a \u0623\u064a \u0648\u0642\u062a.',
        action: '\u0625\u062f\u0627\u0631\u0629 \u062e\u064a\u0627\u0631\u0627\u062a \u0627\u0644\u062e\u0635\u0648\u0635\u064a\u0629',
        unavailableTitle: '\u063a\u064a\u0631 \u0645\u062a\u0627\u062d',
        unavailableMessage:
          '\u0644\u0627 \u062a\u062a\u0648\u0641\u0631 \u062e\u064a\u0627\u0631\u0627\u062a \u0627\u0644\u062e\u0635\u0648\u0635\u064a\u0629 \u0644\u0647\u0630\u0627 \u0627\u0644\u0645\u0646\u0637\u0642\u0629 \u062d\u0627\u0644\u064a\u064b\u0627.',
      };
    }

    return {
      title: 'Ad privacy options',
      description: 'You can update or withdraw ad consent at any time.',
      action: 'Manage privacy choices',
      unavailableTitle: 'Not available',
      unavailableMessage: 'Privacy options are not available for your region right now.',
    };
  }, [isRTL]);

  const openConsentOptions = async () => {
    if (consentLoading) return;
    setConsentLoading(true);
    try {
      const opened = await adMobService.openAdSettings();
      if (!opened) {
        Alert.alert(consentCopy.unavailableTitle, consentCopy.unavailableMessage);
      }
    } finally {
      setConsentLoading(false);
    }
  };

  if (loading) {
    return (
      <Screen style={styles.screen} contentStyle={styles.content}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={theme.colors.primary} />
          <AppText size="sm" color={theme.colors.onSurfaceVariant} style={oppositeTextStyle}>
            {t('loading')}
          </AppText>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll style={styles.screen} contentStyle={styles.content}>
      <Card style={styles.headerCard}>
        <AppText weight="bold" size="xl" style={[styles.headerTitle, oppositeTextStyle]}>
          {route.params.title}
        </AppText>

        {updatedAt ? (
          <AppText size="sm" color={theme.colors.onSurfaceVariant} style={oppositeTextStyle}>
            {updatedAt}
          </AppText>
        ) : null}

        <AppText size="sm" color={theme.colors.onSurfaceVariant} style={[styles.metaLine, oppositeTextStyle]}>
          {locale === 'ar' ? `\u0627\u0644\u0645\u0648\u0642\u0639: ${siteName}` : `Site: ${siteName}`}
        </AppText>
      </Card>

      <View style={styles.blocksWrap}>
        {contentBlocks.map((block, index) => {
          if (block.type === 'h2') {
            return (
              <AppText
                key={`${route.params.policyType}-${index}`}
                weight="bold"
                size="lg"
                style={[styles.h2, oppositeTextStyle]}
              >
                {block.text}
              </AppText>
            );
          }

          if (block.type === 'h3') {
            return (
              <AppText
                key={`${route.params.policyType}-${index}`}
                weight="bold"
                size="md"
                style={[styles.h3, oppositeTextStyle]}
              >
                {block.text}
              </AppText>
            );
          }

          if (block.type === 'h4') {
            return (
              <AppText
                key={`${route.params.policyType}-${index}`}
                weight="semibold"
                size="md"
                style={[styles.h4, oppositeTextStyle]}
              >
                {block.text}
              </AppText>
            );
          }

          if (block.type === 'li') {
            return (
              <View key={`${route.params.policyType}-${index}`} style={[styles.bulletRow, oppositeBulletRow]}>
                <View style={[styles.bulletDot, { backgroundColor: theme.colors.primary }]} />
                <AppText size="sm" color={theme.colors.onSurfaceVariant} style={[styles.bulletText, oppositeTextStyle]}>
                  {block.text}
                </AppText>
              </View>
            );
          }

          return (
            <AppText
              key={`${route.params.policyType}-${index}`}
              size="sm"
              color={theme.colors.onSurfaceVariant}
              style={[styles.paragraph, oppositeTextStyle]}
            >
              {block.text}
            </AppText>
          );
        })}
      </View>

      {canShowConsentLink ? (
        <Card style={styles.privacyCard}>
          <AppText weight="bold" size="md" style={oppositeTextStyle}>
            {consentCopy.title}
          </AppText>
          <AppText size="sm" color={theme.colors.onSurfaceVariant} style={[styles.paragraph, oppositeTextStyle]}>
            {consentCopy.description}
          </AppText>
          <AnimatedPressable onPress={openConsentOptions} disabled={consentLoading} style={styles.privacyActionWrap}>
            <View style={[styles.privacyActionButton, consentLoading && styles.privacyActionDisabled]}>
              <AppText size="sm" weight="semibold" color={theme.colors.primary} style={oppositeTextStyle}>
                {consentCopy.action}
              </AppText>
              <AppText size="sm" color={theme.colors.onSurfaceVariant}>
                {consentLoading ? '...' : isRTL ? '<' : '>'}
              </AppText>
            </View>
          </AnimatedPressable>
        </Card>
      ) : null}

      <Card style={styles.contactCard}>
        <AppText weight="bold" size="md" style={oppositeTextStyle}>
          {locale === 'ar' ? '\u0645\u0639\u0644\u0648\u0645\u0627\u062a \u0627\u0644\u062a\u0648\u0627\u0635\u0644' : 'Contact Details'}
        </AppText>
        <AppText size="sm" color={theme.colors.onSurfaceVariant} style={[styles.paragraph, oppositeTextStyle]}>
          {locale === 'ar' ? `\u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a: ${contactEmail}` : `Email: ${contactEmail}`}
        </AppText>
        <AppText size="sm" color={theme.colors.onSurfaceVariant} style={[styles.paragraph, oppositeTextStyle]}>
          {locale === 'ar' ? `\u0627\u0644\u0645\u0648\u0642\u0639: ${siteUrl}` : `Website: ${siteUrl}`}
        </AppText>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    padding: 0,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  headerCard: {
    borderRadius: radius.xl,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  headerTitle: {
    lineHeight: 32,
  },
  metaLine: {
    lineHeight: 22,
  },
  blocksWrap: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(190,224,255,0.18)',
    backgroundColor: 'rgba(8,27,45,0.42)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  h2: {
    marginTop: spacing.sm,
    lineHeight: 28,
  },
  h3: {
    marginTop: spacing.xs,
    lineHeight: 24,
  },
  h4: {
    marginTop: spacing['2xs'],
    lineHeight: 22,
  },
  paragraph: {
    lineHeight: 22,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  bulletRowLTR: {
    flexDirection: 'row',
  },
  bulletRowRTL: {
    flexDirection: 'row-reverse',
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 99,
    marginTop: 8,
  },
  bulletText: {
    flex: 1,
    lineHeight: 22,
  },
  privacyCard: {
    marginTop: spacing.md,
    borderRadius: radius.lg,
    gap: spacing.xs,
  },
  privacyActionWrap: {
    marginTop: spacing.xs,
  },
  privacyActionButton: {
    minHeight: 44,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(99,230,226,0.35)',
    backgroundColor: 'rgba(8,27,45,0.42)',
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  privacyActionDisabled: {
    opacity: 0.58,
  },
  contactCard: {
    marginTop: spacing.md,
    borderRadius: radius.lg,
    gap: spacing.xs,
  },
  oppositeTextRTL: {
    textAlign: 'left',
    writingDirection: 'ltr',
  },
  oppositeTextLTR: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});
