import React, { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
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
import { AppText, AnimatedPressable, Screen } from '@/components';
import { IS_ADMOB_AVAILABLE } from '@/config/admob';
import { useTranslation } from '@/hooks/useTranslation';
import { adMobService } from '@/services/admob';
import { useCountry } from '@/store/CountryContext';
import { useLocale } from '@/store/LocaleContext';
import { radius, spacing } from '@/theme';
import { useTheme } from '@/theme/ThemeContext';
import type { ThemeMode } from '@/theme/ThemeContext';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const SETTINGS_BG_PRIMARY = '#091725';
const SETTINGS_BG_SECONDARY = '#134765';
const TEXT_PRIMARY = '#F4FAFF';
const TEXT_SECONDARY = 'rgba(226,240,255,0.88)';
const TEXT_MUTED = 'rgba(185,214,238,0.78)';

const MODE_OPTIONS: Array<{ mode: ThemeMode; icon: IconName; color: string }> = [
  { mode: 'system', icon: 'phone-portrait-outline', color: '#22D3EE' },
  { mode: 'light', icon: 'sunny-outline', color: '#F59E0B' },
  { mode: 'dark', icon: 'moon-outline', color: '#3B82F6' },
];

function toRgba(hexColor: string, alpha: number) {
  const hex = hexColor.replace('#', '');
  const full = hex.length === 3 ? hex.split('').map((v) => `${v}${v}`).join('') : hex;
  const r = Number.parseInt(full.slice(0, 2), 16);
  const g = Number.parseInt(full.slice(2, 4), 16);
  const b = Number.parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function SettingsScreen() {
  const { t, locale } = useTranslation();
  const { setLocale } = useLocale();
  const { mode, setMode } = useTheme();
  const { country, countries, setCountry } = useCountry();
  const isRTL = locale === 'ar';
  const isOppositeRTL = !isRTL;
  const textDirectionStyle = isRTL ? styles.textLTR : styles.textRTL;
  const countryCodeAlignStyle = isRTL ? styles.countryCodeLTR : styles.countryCodeRTL;
  const bgDrift = useSharedValue(0);

  const [localeLoading, setLocaleLoading] = useState(false);
  const [countryLoadingId, setCountryLoadingId] = useState<string | null>(null);
  const [consentLoading, setConsentLoading] = useState(false);

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

  const selectedModeLabel = mode === 'system' ? t('system') : mode === 'light' ? t('lightMode') : t('darkMode');
  const selectedLanguageLabel = locale === 'ar' ? t('arabic') : t('english');
  const selectedCountryLabel = locale === 'ar' ? country.name : country.nameEn;

  const copy = useMemo(() => {
    if (isRTL) {
      return {
        subtitle:
          '\u062a\u062d\u0643\u0645 \u0628\u0627\u0644\u0645\u0638\u0647\u0631 \u0648\u0627\u0644\u0644\u063a\u0629 \u0648\u0627\u0644\u062f\u0648\u0644\u0629 \u0628\u0633\u0647\u0648\u0644\u0629 \u0645\u0646 \u0645\u0643\u0627\u0646 \u0648\u0627\u062d\u062f.',
        appearanceHint:
          '\u0627\u062e\u062a\u0631 \u0646\u0645\u0637 \u0627\u0644\u0639\u0631\u0636 \u0627\u0644\u0623\u0646\u0633\u0628 \u0644\u0643.',
        languageHint:
          '\u063a\u064a\u0651\u0631 \u0644\u063a\u0629 \u0627\u0644\u062a\u0637\u0628\u064a\u0642 \u0628\u0646\u0642\u0631\u0629 \u0648\u0627\u062d\u062f\u0629.',
        countryHint:
          '\u0627\u062e\u062a\u0631 \u0627\u0644\u062f\u0648\u0644\u0629 \u0644\u0645\u062d\u062a\u0648\u0649 \u0645\u0644\u0627\u0626\u0645.',
        privacyHint:
          '\u062a\u0633\u062a\u0637\u064a\u0639 \u0625\u062f\u0627\u0631\u0629 \u0623\u0648 \u0633\u062d\u0628 \u0645\u0648\u0627\u0641\u0642\u0629 \u0627\u0644\u0625\u0639\u0644\u0627\u0646\u0627\u062a \u0641\u064a \u0623\u064a \u0648\u0642\u062a.',
        privacyAction: '\u0625\u062f\u0627\u0631\u0629 \u0645\u0648\u0627\u0641\u0642\u0629 \u0627\u0644\u0625\u0639\u0644\u0627\u0646\u0627\u062a',
        privacyUnavailableTitle: '\u063a\u064a\u0631 \u0645\u062a\u0627\u062d',
        privacyUnavailableMessage:
          '\u0644\u0627 \u062a\u0648\u062c\u062f \u062e\u064a\u0627\u0631\u0627\u062a \u062e\u0635\u0648\u0635\u064a\u0629 \u0645\u062a\u0627\u062d\u0629 \u062d\u0627\u0644\u064a\u064b\u0627 \u0644\u0647\u0630\u0627 \u0627\u0644\u062c\u0647\u0627\u0632 \u0623\u0648 \u0627\u0644\u0628\u0644\u062f.',
        modeTag: '\u0627\u0644\u0645\u0638\u0647\u0631',
        languageTag: '\u0627\u0644\u0644\u063a\u0629',
        countryTag: '\u0627\u0644\u062f\u0648\u0644\u0629',
      };
    }

    return {
      subtitle: 'Control appearance, language, and country from one place.',
      appearanceHint: 'Choose the visual mode that fits your usage.',
      languageHint: 'Update app language instantly.',
      countryHint: 'Select your country for localized content.',
      privacyHint: 'You can update or withdraw ad consent at any time.',
      privacyAction: 'Manage ad consent',
      privacyUnavailableTitle: 'Not available',
      privacyUnavailableMessage: 'Privacy options are not available for this device or region right now.',
      modeTag: 'Theme',
      languageTag: 'Language',
      countryTag: 'Country',
    };
  }, [isRTL]);

  const changeLocale = async (next: 'ar' | 'en') => {
    if (localeLoading || next === locale) return;
    setLocaleLoading(true);
    try {
      await setLocale(next);
      Alert.alert(t('updatedTitle'), t('restartNotice'));
    } finally {
      setLocaleLoading(false);
    }
  };

  const changeCountry = async (countryId: string) => {
    const selected = countries.find((item) => item.id === countryId);
    if (!selected || selected.id === country.id || countryLoadingId) return;
    setCountryLoadingId(selected.id);
    try {
      await setCountry(selected);
    } finally {
      setCountryLoadingId(null);
    }
  };

  const manageAdConsent = async () => {
    if (consentLoading) return;
    setConsentLoading(true);
    try {
      const opened = await adMobService.openAdSettings();
      if (!opened) {
        Alert.alert(copy.privacyUnavailableTitle, copy.privacyUnavailableMessage);
      }
    } finally {
      setConsentLoading(false);
    }
  };

  const renderBackground = (
    <View pointerEvents="none" style={styles.background}>
      <LinearGradient
        colors={[SETTINGS_BG_PRIMARY, SETTINGS_BG_SECONDARY, SETTINGS_BG_PRIMARY]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(19,71,101,0.88)', 'rgba(19,71,101,0.2)', 'rgba(9,23,37,0.92)']}
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

  return (
    <Screen scroll style={styles.screen} contentStyle={styles.content} background={renderBackground}>
      <Animated.View entering={FadeInUp.springify()}>
        <View style={styles.heroCard}>
          <BlurView intensity={24} tint="dark" pointerEvents="none" style={styles.glassLayer} />
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(255,255,255,0.16)', 'rgba(255,255,255,0.04)', 'rgba(255,255,255,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.glassSheen}
          />

          <View style={[styles.heroRow, isRTL && styles.rowRTL]}>
            <View style={styles.heroIconShell}>
              <Ionicons name="settings-outline" size={20} color="#63E6E2" />
            </View>
            <View style={styles.heroTextWrap}>
              <AppText weight="bold" size="xl" color={TEXT_PRIMARY} style={textDirectionStyle}>
                {t('settings')}
              </AppText>
              <AppText size="sm" color={TEXT_SECONDARY} style={textDirectionStyle}>
                {copy.subtitle}
              </AppText>
            </View>
          </View>

          <View style={[styles.summaryRow, isRTL && styles.rowRTL]}>
            <View style={styles.summaryChip}>
              <AppText size="xs" weight="semibold" color={TEXT_PRIMARY} style={styles.summaryText}>
                {`${copy.modeTag}: ${selectedModeLabel}`}
              </AppText>
            </View>
            <View style={styles.summaryChip}>
              <AppText size="xs" weight="semibold" color={TEXT_PRIMARY} style={styles.summaryText}>
                {`${copy.languageTag}: ${selectedLanguageLabel}`}
              </AppText>
            </View>
            <View style={styles.summaryChip}>
              <AppText size="xs" weight="semibold" color={TEXT_PRIMARY} style={styles.summaryText}>
                {`${copy.countryTag}: ${selectedCountryLabel}`}
              </AppText>
            </View>
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(80).springify()}>
        <View style={styles.sectionCard}>
          <BlurView intensity={20} tint="dark" pointerEvents="none" style={styles.glassLayer} />
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(255,255,255,0.14)', 'rgba(255,255,255,0.04)', 'rgba(255,255,255,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.glassSheen}
          />

          <View style={[styles.sectionHeader, isRTL && styles.rowRTL]}>
            <Ionicons name="color-palette-outline" size={18} color="#63E6E2" />
            <AppText weight="bold" size="lg" color={TEXT_PRIMARY} style={textDirectionStyle}>
              {t('theme')}
            </AppText>
          </View>

          <AppText size="sm" color={TEXT_MUTED} style={textDirectionStyle}>
            {copy.appearanceHint}
          </AppText>

          <View style={[styles.modeGrid, isRTL && styles.rowRTL]}>
            {MODE_OPTIONS.map((item) => {
              const active = mode === item.mode;
              const label = item.mode === 'system' ? t('system') : item.mode === 'light' ? t('lightMode') : t('darkMode');
              return (
                <AnimatedPressable key={item.mode} onPress={() => setMode(item.mode)} style={styles.modeButtonWrap}>
                  <View
                    style={[
                      styles.modeButton,
                      active
                        ? {
                            borderColor: toRgba(item.color, 0.6),
                            backgroundColor: toRgba(item.color, 0.2),
                            shadowColor: item.color,
                            shadowOpacity: 0.26,
                            shadowRadius: 12,
                          }
                        : styles.modeButtonIdle,
                    ]}
                  >
                    <View style={[styles.modeIconWrap, active && { borderColor: toRgba(item.color, 0.62) }]}>
                      <Ionicons name={item.icon} size={16} color={active ? item.color : '#C9DFF4'} />
                    </View>
                    <AppText size="xs" weight="semibold" color={active ? item.color : TEXT_SECONDARY} style={styles.modeButtonText}>
                      {label}
                    </AppText>
                  </View>
                </AnimatedPressable>
              );
            })}
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(140).springify()}>
        <View style={styles.sectionCard}>
          <BlurView intensity={20} tint="dark" pointerEvents="none" style={styles.glassLayer} />
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(255,255,255,0.14)', 'rgba(255,255,255,0.04)', 'rgba(255,255,255,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.glassSheen}
          />

          <View style={[styles.sectionHeader, isRTL && styles.rowRTL]}>
            <Ionicons name="language-outline" size={18} color="#63E6E2" />
            <AppText weight="bold" size="lg" color={TEXT_PRIMARY} style={textDirectionStyle}>
              {t('language')}
            </AppText>
          </View>

          <AppText size="sm" color={TEXT_MUTED} style={textDirectionStyle}>
            {copy.languageHint}
          </AppText>

          <View style={[styles.languageRow, isRTL && styles.rowRTL]}>
            {(['ar', 'en'] as const).map((lang) => {
              const active = locale === lang;
              const color = lang === 'ar' ? '#22D3EE' : '#3B82F6';
              return (
                <AnimatedPressable
                  key={lang}
                  onPress={() => changeLocale(lang)}
                  style={styles.languageButtonWrap}
                  disabled={localeLoading}
                >
                  <View
                    style={[
                      styles.languageButton,
                      active
                        ? { borderColor: toRgba(color, 0.6), backgroundColor: toRgba(color, 0.2) }
                        : styles.languageButtonIdle,
                      localeLoading && styles.disabled,
                    ]}
                  >
                    <AppText size="sm" weight="semibold" color={active ? color : TEXT_SECONDARY} style={styles.languageButtonText}>
                      {lang === 'ar' ? t('arabic') : t('english')}
                    </AppText>
                  </View>
                </AnimatedPressable>
              );
            })}
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(200).springify()}>
        <View style={styles.sectionCard}>
          <BlurView intensity={20} tint="dark" pointerEvents="none" style={styles.glassLayer} />
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(255,255,255,0.14)', 'rgba(255,255,255,0.04)', 'rgba(255,255,255,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.glassSheen}
          />

          <View style={[styles.sectionHeader, isOppositeRTL && styles.rowRTL]}>
            <Ionicons name="globe-outline" size={18} color="#63E6E2" />
            <AppText weight="bold" size="lg" color={TEXT_PRIMARY} style={textDirectionStyle}>
              {t('country')}
            </AppText>
          </View>

          <AppText size="sm" color={TEXT_MUTED} style={textDirectionStyle}>
            {copy.countryHint}
          </AppText>

          <View style={styles.countryList}>
            {countries.map((item, index) => {
              const active = item.id === country.id;
              const loading = countryLoadingId === item.id;
              const name = locale === 'ar' ? item.name : item.nameEn;
              const showDivider = index < countries.length - 1;
              const actionIconName = loading
                ? 'hourglass-outline'
                : active
                  ? 'checkmark'
                  : isOppositeRTL
                    ? 'chevron-back-outline'
                    : 'chevron-forward-outline';
              const actionIconColor = active ? '#63E6E2' : TEXT_MUTED;
              return (
                <AnimatedPressable
                  key={item.id}
                  onPress={() => changeCountry(item.id)}
                  style={styles.countryPressable}
                  disabled={!!countryLoadingId}
                >
                  <View style={[styles.countryRow, isOppositeRTL && styles.rowRTL]}>
                    <View style={[styles.countryLeft, isOppositeRTL && styles.rowRTL]}>
                      <View style={[styles.countryIconShell, active ? styles.countryIconShellActive : styles.countryIconShellIdle]}>
                        <Ionicons name="location-outline" size={15} color={active ? '#63E6E2' : '#B8D5F2'} />
                      </View>
                      <View style={styles.countryLabelWrap}>
                        <AppText
                          numberOfLines={1}
                          size="md"
                          weight={active ? 'bold' : 'regular'}
                          color={TEXT_PRIMARY}
                          style={[textDirectionStyle, styles.countryName]}
                        >
                          {name}
                        </AppText>
                        <View style={[styles.countryCode, countryCodeAlignStyle, active ? styles.countryCodeActive : styles.countryCodeIdle]}>
                          <AppText size="xs" weight="semibold" color={active ? '#63E6E2' : '#C9DFF4'} style={styles.countryCodeText}>
                            {item.code.toUpperCase()}
                          </AppText>
                        </View>
                      </View>
                    </View>

                    <View
                      style={[
                        styles.countryAction,
                        isOppositeRTL ? styles.countryActionRTL : styles.countryActionLTR,
                        active ? styles.countryActionActive : styles.countryActionIdle,
                      ]}
                    >
                      <Ionicons name={actionIconName} size={active ? 18 : 17} color={actionIconColor} />
                    </View>

                    {showDivider ? <View style={styles.countryDivider} /> : null}
                  </View>
                </AnimatedPressable>
              );
            })}
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(260).springify()}>
        <View style={styles.sectionCard}>
          <BlurView intensity={20} tint="dark" pointerEvents="none" style={styles.glassLayer} />
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(255,255,255,0.14)', 'rgba(255,255,255,0.04)', 'rgba(255,255,255,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.glassSheen}
          />

          <View style={[styles.sectionHeader, isRTL && styles.rowRTL]}>
            <Ionicons name="shield-checkmark-outline" size={18} color="#63E6E2" />
            <AppText weight="bold" size="lg" color={TEXT_PRIMARY} style={textDirectionStyle}>
              {t('privacyPolicy')}
            </AppText>
          </View>

          <AppText size="sm" color={TEXT_MUTED} style={textDirectionStyle}>
            {copy.privacyHint}
          </AppText>

          <AnimatedPressable
            onPress={manageAdConsent}
            disabled={consentLoading || !IS_ADMOB_AVAILABLE}
            style={styles.consentActionWrap}
          >
            <View style={[styles.consentAction, (consentLoading || !IS_ADMOB_AVAILABLE) && styles.disabled]}>
              <View style={[styles.consentActionLead, isRTL && styles.rowRTL]}>
                <Ionicons name="options-outline" size={17} color="#63E6E2" />
                <AppText size="sm" weight="semibold" color={TEXT_PRIMARY} style={textDirectionStyle}>
                  {copy.privacyAction}
                </AppText>
              </View>
              <Ionicons
                name={
                  consentLoading
                    ? 'hourglass-outline'
                    : isOppositeRTL
                      ? 'chevron-back-outline'
                      : 'chevron-forward-outline'
                }
                size={17}
                color={TEXT_MUTED}
              />
            </View>
          </AnimatedPressable>
        </View>
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: SETTINGS_BG_PRIMARY,
  },
  content: {
    position: 'relative',
    zIndex: 1,
    paddingBottom: spacing.xl,
    gap: spacing.md,
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
    shadowColor: SETTINGS_BG_SECONDARY,
    shadowOffset: { width: 0, height: 0 },
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
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  textRTL: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  textLTR: {
    textAlign: 'left',
    writingDirection: 'ltr',
  },
  heroCard: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(207,233,255,0.3)',
    backgroundColor: 'rgba(8,27,45,0.56)',
    padding: spacing.md,
    gap: spacing.sm,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  heroIconShell: {
    width: 46,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(99,230,226,0.5)',
    backgroundColor: 'rgba(99,230,226,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTextWrap: {
    flex: 1,
    gap: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  summaryChip: {
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(190,224,255,0.28)',
    backgroundColor: 'rgba(12,40,62,0.6)',
    paddingHorizontal: spacing.sm,
    minHeight: 28,
    justifyContent: 'center',
  },
  summaryText: {
    textAlign: 'center',
  },
  sectionCard: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(190,224,255,0.24)',
    backgroundColor: 'rgba(8,27,45,0.52)',
    padding: spacing.md,
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  modeGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modeButtonWrap: {
    flex: 1,
  },
  modeButton: {
    minHeight: 78,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing['2xs'],
    paddingVertical: spacing.sm,
  },
  modeButtonIdle: {
    borderColor: 'rgba(190,224,255,0.24)',
    backgroundColor: 'rgba(14,43,67,0.45)',
  },
  modeIconWrap: {
    width: 28,
    height: 28,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(190,224,255,0.28)',
    backgroundColor: 'rgba(14,43,67,0.52)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeButtonText: {
    textAlign: 'center',
  },
  languageRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  languageButtonWrap: {
    flex: 1,
  },
  languageButton: {
    minHeight: 42,
    borderRadius: radius.lg,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  languageButtonIdle: {
    borderColor: 'rgba(190,224,255,0.24)',
    backgroundColor: 'rgba(14,43,67,0.45)',
  },
  languageButtonText: {
    textAlign: 'center',
  },
  countryList: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(190,224,255,0.2)',
    backgroundColor: 'rgba(9,23,37,0.2)',
    overflow: 'hidden',
  },
  countryPressable: {
    position: 'relative',
  },
  countryRow: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    position: 'relative',
  },
  countryLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  countryLabelWrap: {
    flex: 1,
    gap: 4,
    justifyContent: 'center',
  },
  countryName: {
    lineHeight: 22,
  },
  countryIconShell: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countryIconShellActive: {
    borderColor: 'rgba(99,230,226,0.54)',
    backgroundColor: 'rgba(99,230,226,0.18)',
  },
  countryIconShellIdle: {
    borderColor: 'rgba(190,224,255,0.24)',
    backgroundColor: 'rgba(14,43,67,0.45)',
  },
  countryCode: {
    minWidth: 46,
    height: 24,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs + 1,
  },
  countryCodeText: {
    textAlign: 'center',
  },
  countryCodeLTR: {
    alignSelf: 'flex-start',
  },
  countryCodeRTL: {
    alignSelf: 'flex-end',
  },
  countryCodeActive: {
    borderColor: 'rgba(99,230,226,0.5)',
    backgroundColor: 'rgba(99,230,226,0.14)',
  },
  countryCodeIdle: {
    borderColor: 'rgba(190,224,255,0.22)',
    backgroundColor: 'rgba(12,39,61,0.48)',
  },
  countryAction: {
    width: 30,
    height: 30,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  countryActionLTR: {
    marginLeft: spacing.sm,
  },
  countryActionRTL: {
    marginRight: spacing.sm,
  },
  countryActionActive: {
    borderColor: 'rgba(99,230,226,0.54)',
    backgroundColor: 'rgba(99,230,226,0.2)',
  },
  countryActionIdle: {
    borderColor: 'rgba(190,224,255,0.22)',
    backgroundColor: 'rgba(12,39,61,0.46)',
  },
  countryDivider: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 1,
    backgroundColor: 'rgba(190,224,255,0.15)',
  },
  consentActionWrap: {
    width: '100%',
  },
  consentAction: {
    minHeight: 46,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(99,230,226,0.35)',
    backgroundColor: 'rgba(14,43,67,0.52)',
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  consentActionLead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 1,
  },
  disabled: {
    opacity: 0.58,
  },
});
