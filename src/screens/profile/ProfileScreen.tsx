import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
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
import { AppButton, AppText, AnimatedPressable, Screen } from '@/components';
import { useAuth } from '@/store/AuthContext';
import { useLocale } from '@/store/LocaleContext';
import { useTranslation } from '@/hooks/useTranslation';
import { spacing, radius } from '@/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const PROFILE_BG_PRIMARY = '#091725';
const PROFILE_BG_SECONDARY = '#134765';
const TEXT_PRIMARY = '#F4FAFF';
const TEXT_SECONDARY = 'rgba(223,239,255,0.88)';
const TEXT_MUTED = 'rgba(184,214,239,0.78)';

type RootStackParamList = {
  Auth: { screen?: string } | undefined;
  Notifications: undefined;
  Settings: undefined;
  Legal: undefined;
  Contact: undefined;
  Members: undefined;
};

type ProfileNavigation = NativeStackNavigationProp<RootStackParamList>;

const ACTION_ITEMS = [
  { key: 'notifications', route: 'Notifications', icon: 'notifications-outline' as IconName, color: '#22D3EE' },
  { key: 'settings', route: 'Settings', icon: 'settings-outline' as IconName, color: '#3B82F6' },
  { key: 'policies', route: 'Legal', icon: 'document-text-outline' as IconName, color: '#10B981' },
  { key: 'contactUs', route: 'Contact', icon: 'mail-open-outline' as IconName, color: '#F59E0B' },
  { key: 'members', route: 'Members', icon: 'people-outline' as IconName, color: '#60A5FA' },
] as const;

function hexToRgba(hexColor: string, alpha: number) {
  const hex = hexColor.replace('#', '');
  const fullHex = hex.length === 3 ? hex.split('').map((char) => `${char}${char}`).join('') : hex;
  const r = Number.parseInt(fullHex.slice(0, 2), 16);
  const g = Number.parseInt(fullHex.slice(2, 4), 16);
  const b = Number.parseInt(fullHex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function ProfileScreen() {
  const navigation = useNavigation<ProfileNavigation>();
  const { user, logout, deleteAccount } = useAuth();
  const { t, locale } = useTranslation();
  const { setLocale } = useLocale();
  const isRTL = locale === 'ar';
  const isOppositeRTL = !isRTL;
  const oppositeTextStyle = isRTL ? styles.textOppositeRTL : styles.textOppositeLTR;
  const oppositeLayoutDirection: 'ltr' | 'rtl' = isRTL ? 'rtl' : 'ltr';
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleDeleteAccount = useCallback(async () => {
    if (!deletePassword.trim()) return;
    setDeleteLoading(true);
    try {
      await deleteAccount(deletePassword);
      setDeleteModalVisible(false);
      setDeletePassword('');
      Alert.alert(t('deleteAccountSuccess'));
    } catch {
      Alert.alert(t('errorTitle'), t('deleteAccountError'));
    } finally {
      setDeleteLoading(false);
    }
  }, [deleteAccount, deletePassword, t]);

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
    guestTitle: t('guestAccount'),
    accountCardHint: t('accountCardHint'),
  }), [t]);

  const changeLocale = async (next: 'ar' | 'en') => {
    if (next === locale) return;
    await setLocale(next);
    Alert.alert(t('updatedTitle'), t('restartNotice'));
  };

  const renderBackground = (
    <View pointerEvents="none" style={styles.background}>
      <LinearGradient
        colors={[PROFILE_BG_PRIMARY, PROFILE_BG_SECONDARY, PROFILE_BG_PRIMARY]}
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

  const displayName = user?.name || labels.guestTitle;
  const subtitle = user?.email || t('profileGuestHint');
  const nameInitial = (user?.name || t('account')).trim().slice(0, 1).toUpperCase();

  return (
    <Screen
      tabScreen
      scroll
      style={styles.screen}
      contentStyle={styles.content}
      background={renderBackground}
    >
      <Animated.View entering={FadeInUp.springify()}>
        <View style={styles.accountCard}>
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

          <View style={[styles.accountRow, isOppositeRTL && styles.accountRowRTL]}>
            <View style={styles.avatarWrap}>
              <AppText weight="bold" size="lg" color="#EAF9FF">
                {nameInitial}
              </AppText>
            </View>
            <View style={styles.accountTextWrap}>
              <AppText weight="bold" size="xl" color={TEXT_PRIMARY} style={[styles.accountTitle, oppositeTextStyle]}>
                {displayName}
              </AppText>
              <AppText size="sm" color={TEXT_SECONDARY} style={[styles.accountSubtitle, oppositeTextStyle]}>
                {subtitle}
              </AppText>
              <AppText size="xs" color={TEXT_MUTED} style={[styles.accountHint, oppositeTextStyle]}>
                {labels.accountCardHint}
              </AppText>
            </View>
          </View>

          {!user ? (
            <View style={[styles.authActions, isOppositeRTL && styles.authActionsRTL]}>
              <AppButton
                title={t('loginAction')}
                onPress={() => navigation.navigate('Auth', { screen: 'Login' })}
                style={styles.authButton}
              />
              <AppButton
                title={t('registerAction')}
                variant="secondary"
                onPress={() => navigation.navigate('Auth', { screen: 'Register' })}
                style={styles.authButton}
              />
            </View>
          ) : null}
        </View>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(80).springify()}>
        <View style={styles.languageCard}>
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

          <View style={[styles.cardHeader, isOppositeRTL && styles.cardHeaderRTL]}>
            <Ionicons name="language-outline" size={18} color="#63E6E2" />
            <AppText weight="bold" size="lg" color={TEXT_PRIMARY} style={oppositeTextStyle}>{t('language')}</AppText>
          </View>

          <View style={[styles.languageRow, isOppositeRTL && styles.languageRowRTL]}>
            {(['ar', 'en'] as const).map((lng) => {
              const active = locale === lng;
              return (
                <AnimatedPressable
                  key={lng}
                  onPress={() => changeLocale(lng)}
                  style={styles.languageChipWrap}
                >
                  <View
                    style={[
                      styles.languageChip,
                      active
                        ? styles.languageChipActive
                        : styles.languageChipIdle,
                    ]}
                  >
                    <AppText
                      weight="semibold"
                      size="sm"
                      color={active ? '#EAF9FF' : TEXT_SECONDARY}
                      style={styles.languageChipText}
                    >
                      {lng === 'ar' ? t('arabic') : t('english')}
                    </AppText>
                  </View>
                </AnimatedPressable>
              );
            })}
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(150).springify()}>
        <View style={styles.menuCard}>
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

          {ACTION_ITEMS.map((item, index) => {
            const accentBg = hexToRgba(item.color, 0.18);
            const accentBorder = hexToRgba(item.color, 0.45);
            const accentIcon = item.color;
            const showDivider = index !== ACTION_ITEMS.length - 1;
            return (
              <AnimatedPressable
                key={item.key}
                onPress={() => navigation.navigate(item.route)}
                style={styles.menuItemPressable}
              >
                <View style={[styles.menuItemRow, { direction: oppositeLayoutDirection }]}>
                  <View style={[styles.menuLeft, { direction: oppositeLayoutDirection }]}>
                    <View style={[styles.menuIconShell, { backgroundColor: accentBg, borderColor: accentBorder }]}>
                      <Ionicons name={item.icon} size={17} color={accentIcon} />
                    </View>
                    <AppText weight="semibold" size="md" color={TEXT_PRIMARY} style={[styles.menuText, oppositeTextStyle]}>
                      {t(item.key)}
                    </AppText>
                  </View>
                  <View style={styles.menuChevronWrap}>
                    <Ionicons
                      name={isRTL ? 'chevron-back-outline' : 'chevron-forward-outline'}
                      size={17}
                      color={TEXT_MUTED}
                    />
                  </View>
                </View>
                {showDivider ? (
                  <View style={styles.menuDividerWrap}>
                    <View style={styles.menuDivider} />
                  </View>
                ) : null}
              </AnimatedPressable>
            );
          })}
        </View>
      </Animated.View>

      {user ? (
        <Animated.View entering={FadeInUp.delay(220).springify()} style={styles.logoutWrap}>
          <AppButton title={t('logout')} variant="secondary" onPress={logout} fullWidth />
        </Animated.View>
      ) : null}

      {user ? (
        <Animated.View entering={FadeInUp.delay(280).springify()} style={styles.deleteWrap}>
          <Pressable onPress={() => setDeleteModalVisible(true)} style={styles.deleteButton}>
            <Ionicons name="trash-outline" size={16} color="#EF4444" />
            <AppText size="sm" color="#EF4444" weight="semibold">{t('deleteAccount')}</AppText>
          </Pressable>
        </Animated.View>
      ) : null}

      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => { setDeleteModalVisible(false); setDeletePassword(''); }}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => { setDeleteModalVisible(false); setDeletePassword(''); }}
        >
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <Ionicons name="warning-outline" size={36} color="#EF4444" style={styles.modalIcon} />
            <AppText weight="bold" size="lg" color={TEXT_PRIMARY} style={styles.modalTitle}>
              {t('deleteAccount')}
            </AppText>
            <AppText size="sm" color={TEXT_SECONDARY} style={styles.modalDescription}>
              {t('deleteAccountConfirm')}
            </AppText>
            <TextInput
              style={[styles.modalInput, isRTL && styles.modalInputRTL]}
              placeholder={t('password')}
              placeholderTextColor="rgba(184,214,239,0.5)"
              secureTextEntry
              value={deletePassword}
              onChangeText={setDeletePassword}
              autoCapitalize="none"
              editable={!deleteLoading}
            />
            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancelButton}
                onPress={() => { setDeleteModalVisible(false); setDeletePassword(''); }}
                disabled={deleteLoading}
              >
                <AppText weight="semibold" size="sm" color={TEXT_SECONDARY}>{t('cancel')}</AppText>
              </Pressable>
              <Pressable
                style={[styles.modalDeleteButton, (!deletePassword.trim() || deleteLoading) && styles.modalButtonDisabled]}
                onPress={handleDeleteAccount}
                disabled={!deletePassword.trim() || deleteLoading}
              >
                <AppText weight="semibold" size="sm" color="#FFFFFF">
                  {deleteLoading ? t('loading') : t('delete')}
                </AppText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: PROFILE_BG_PRIMARY,
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
    shadowColor: PROFILE_BG_SECONDARY,
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
  accountCard: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(207,233,255,0.3)',
    backgroundColor: 'rgba(8,27,45,0.55)',
    padding: spacing.md,
    gap: spacing.md,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  accountRowRTL: {
    flexDirection: 'row-reverse',
  },
  avatarWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(99,230,226,0.5)',
    backgroundColor: 'rgba(99,230,226,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountTextWrap: {
    flex: 1,
    gap: 2,
  },
  accountTitle: {
    lineHeight: 30,
  },
  accountSubtitle: {
    lineHeight: 20,
  },
  accountHint: {
    marginTop: 2,
    lineHeight: 18,
  },
  textOppositeRTL: {
    textAlign: 'left',
    writingDirection: 'ltr',
  },
  textOppositeLTR: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  authActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  authActionsRTL: {
    flexDirection: 'row-reverse',
  },
  authButton: {
    flex: 1,
  },
  languageCard: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(190,224,255,0.24)',
    backgroundColor: 'rgba(8,27,45,0.52)',
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  cardHeaderRTL: {
    flexDirection: 'row-reverse',
    justifyContent: 'flex-end',
  },
  languageRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  languageRowRTL: {
    flexDirection: 'row-reverse',
  },
  languageChipWrap: {
    flex: 1,
  },
  languageChip: {
    minHeight: 40,
    borderRadius: radius.lg,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  languageChipActive: {
    borderColor: 'rgba(99,230,226,0.6)',
    backgroundColor: 'rgba(99,230,226,0.22)',
  },
  languageChipIdle: {
    borderColor: 'rgba(190,224,255,0.24)',
    backgroundColor: 'rgba(14,43,67,0.45)',
  },
  languageChipText: {
    textAlign: 'center',
  },
  menuCard: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(190,224,255,0.24)',
    backgroundColor: 'rgba(8,27,45,0.52)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  menuItemPressable: {
    position: 'relative',
  },
  menuItemRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  menuText: {
    flexShrink: 1,
  },
  menuIconShell: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuChevronWrap: {
    width: 24,
    minHeight: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuDividerWrap: {
    paddingHorizontal: 2,
  },
  menuDivider: {
    height: 1,
    backgroundColor: 'rgba(190,224,255,0.15)',
  },
  logoutWrap: {
    marginTop: spacing.xs,
  },
  deleteWrap: {
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#0E2236',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  modalIcon: {
    marginBottom: spacing.xs,
  },
  modalTitle: {
    textAlign: 'center',
  },
  modalDescription: {
    textAlign: 'center',
    lineHeight: 22,
  },
  modalInput: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(190,224,255,0.2)',
    backgroundColor: 'rgba(8,27,45,0.6)',
    color: TEXT_PRIMARY,
    paddingHorizontal: spacing.md,
    fontSize: 15,
    fontFamily: 'Cairo_400Regular',
    textAlign: 'left',
  },
  modalInputRTL: {
    textAlign: 'right',
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
    width: '100%',
  },
  modalCancelButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(190,224,255,0.2)',
    backgroundColor: 'rgba(14,43,67,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalDeleteButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalButtonDisabled: {
    opacity: 0.5,
  },
});
