import React, { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { AppButton, AppInput, AppText, Screen } from '@/components';
import { RecaptchaModal } from '@/components/RecaptchaModal';
import { frontService } from '@/services/front';
import { useTranslation } from '@/hooks/useTranslation';
import type { ContactForm, Settings } from '@/types/api';
import { radius, spacing } from '@/theme';

type FieldName = keyof ContactForm;
type FormErrors = Partial<Record<FieldName, string>>;
type FieldTouched = Partial<Record<FieldName, boolean>>;

const SCREEN_BG_PRIMARY = '#091725';
const SCREEN_BG_SECONDARY = '#134765';
const TEXT_PRIMARY = '#F4FAFF';
const TEXT_SECONDARY = 'rgba(223,239,255,0.88)';
const TEXT_MUTED = 'rgba(184,214,239,0.8)';
const ERROR_COLOR = '#FCA5A5';
const FALLBACK_CONTACT_EMAIL = 'info@alemancenter.com';
const MESSAGE_MAX_LENGTH = 1000;

function getStringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function resolveSettingValue(settingsPayload: Settings | null | undefined, key: string): string {
  if (!settingsPayload || typeof settingsPayload !== 'object') {
    return '';
  }

  const payload = settingsPayload as Record<string, unknown>;
  const direct = getStringValue(payload[key]);
  if (direct) {
    return direct;
  }

  const nested = payload.settings;
  if (nested && typeof nested === 'object') {
    const nestedRecord = nested as Record<string, unknown>;
    const nestedValue = getStringValue(nestedRecord[key]);
    if (nestedValue) {
      return nestedValue;
    }
  }

  return '';
}

function resolveContactEmail(settingsPayload: Settings | null | undefined): string {
  return resolveSettingValue(settingsPayload, 'contact_email') || FALLBACK_CONTACT_EMAIL;
}

function resolveRecaptchaSiteKey(settingsPayload: Settings | null | undefined): string {
  return resolveSettingValue(settingsPayload, 'recaptcha_site_key');
}

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function pickApiError(record: Record<string, unknown>, field: string): string | undefined {
  const value = record[field];
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (Array.isArray(value) && typeof value[0] === 'string' && value[0].trim()) {
    return value[0].trim();
  }
  return undefined;
}

function mapApiFieldErrors(error: unknown): FormErrors {
  if (!error || typeof error !== 'object' || !('errors' in error)) {
    return {};
  }

  const errors = (error as { errors?: unknown }).errors;
  if (!errors || typeof errors !== 'object') {
    return {};
  }

  const record = errors as Record<string, unknown>;

  return {
    name: pickApiError(record, 'name'),
    email: pickApiError(record, 'email'),
    subject: pickApiError(record, 'subject'),
    message: pickApiError(record, 'message'),
  };
}

function mapApiRecaptchaError(error: unknown): string | undefined {
  if (!error || typeof error !== 'object' || !('errors' in error)) {
    return undefined;
  }

  const errors = (error as { errors?: unknown }).errors;
  if (!errors || typeof errors !== 'object') {
    return undefined;
  }

  const record = errors as Record<string, unknown>;
  return pickApiError(record, 'g-recaptcha-response') || pickApiError(record, 'captcha');
}

function validateForm(
  form: ContactForm,
  labels: {
    nameRequired: string;
    nameShort: string;
    emailRequired: string;
    emailInvalid: string;
    subjectRequired: string;
    subjectShort: string;
    messageRequired: string;
    messageShort: string;
  }
): FormErrors {
  const errors: FormErrors = {};
  const name = form.name.trim();
  const email = form.email.trim();
  const subject = form.subject.trim();
  const message = form.message.trim();

  if (!name) {
    errors.name = labels.nameRequired;
  } else if (name.length < 2) {
    errors.name = labels.nameShort;
  }

  if (!email) {
    errors.email = labels.emailRequired;
  } else if (!validateEmail(email)) {
    errors.email = labels.emailInvalid;
  }

  if (!subject) {
    errors.subject = labels.subjectRequired;
  } else if (subject.length < 3) {
    errors.subject = labels.subjectShort;
  }

  if (!message) {
    errors.message = labels.messageRequired;
  } else if (message.length < 10) {
    errors.message = labels.messageShort;
  }

  return errors;
}

export function ContactScreen() {
  const { t, locale } = useTranslation();
  const isRTL = locale === 'ar';
  const isOppositeRTL = !isRTL;
  const textDirectionStyle = isRTL ? styles.textOppositeRTL : styles.textOppositeLTR;
  const inputDirectionStyle = isRTL ? styles.inputOppositeRTL : styles.inputOppositeLTR;
  const [form, setForm] = useState<ContactForm>({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [touched, setTouched] = useState<FieldTouched>({});
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState(FALLBACK_CONTACT_EMAIL);
  const [recipientLoading, setRecipientLoading] = useState(true);
  const [recaptchaSiteKey, setRecaptchaSiteKey] = useState('');
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [recaptchaError, setRecaptchaError] = useState<string | null>(null);
  const [recaptchaModalVisible, setRecaptchaModalVisible] = useState(false);

  const labels = useMemo(
    () =>
      isRTL
        ? {
            subtitle: 'نموذج مراسلة سريع، وسيصلنا محتوى رسالتك مباشرة.',
            helperTitle: 'إلى أي بريد تُرسل الرسالة؟',
            helperHint: 'يتم إرسال رسالتك إلى البريد التالي:',
            nameLabel: 'الاسم الكامل',
            emailLabel: 'البريد الإلكتروني',
            subjectLabel: 'عنوان الرسالة',
            messageLabel: 'تفاصيل الرسالة',
            recipientLoading: 'جاري تحميل بريد الاستقبال...',
            messageCounter: (count: number) => `${count}/${MESSAGE_MAX_LENGTH}`,
            nameRequired: 'يرجى إدخال الاسم.',
            nameShort: 'الاسم يجب أن يكون حرفين على الأقل.',
            emailRequired: 'يرجى إدخال البريد الإلكتروني.',
            emailInvalid: 'صيغة البريد الإلكتروني غير صحيحة.',
            subjectRequired: 'يرجى إدخال الموضوع.',
            subjectShort: 'الموضوع يجب أن يكون 3 أحرف على الأقل.',
            messageRequired: 'يرجى كتابة الرسالة.',
            messageShort: 'الرسالة يجب أن تكون 10 أحرف على الأقل.',
          }
        : {
            subtitle: 'Send your message quickly and we will receive it directly.',
            helperTitle: 'Where are messages sent?',
            helperHint: 'Your message is delivered to:',
            nameLabel: 'Full name',
            emailLabel: 'Email address',
            subjectLabel: 'Message subject',
            messageLabel: 'Message details',
            recipientLoading: 'Loading recipient email...',
            messageCounter: (count: number) => `${count}/${MESSAGE_MAX_LENGTH}`,
            nameRequired: 'Please enter your name.',
            nameShort: 'Name must be at least 2 characters.',
            emailRequired: 'Please enter your email.',
            emailInvalid: 'Please enter a valid email.',
            subjectRequired: 'Please enter a subject.',
            subjectShort: 'Subject must be at least 3 characters.',
            messageRequired: 'Please write your message.',
            messageShort: 'Message must be at least 10 characters.',
          },
    [isRTL]
  );

  const recaptchaTexts = useMemo(
    () =>
      isRTL
        ? {
            title: 'التحقق الأمني',
            help: 'يرجى إكمال reCAPTCHA قبل إرسال الرسالة.',
            verify: 'إكمال التحقق',
            retry: 'إعادة التحقق',
            verified: 'تم التحقق بنجاح.',
            required: 'يرجى إكمال التحقق الأمني أولاً.',
            expired: 'انتهت صلاحية التحقق. يرجى إعادة المحاولة.',
            loadError: 'تعذر تحميل التحقق الأمني. حاول مرة أخرى.',
            missingConfig: 'نموذج التواصل غير مهيأ حالياً. يرجى المحاولة لاحقاً.',
            modalTitle: 'تحقق أمني',
            modalDescription: 'أكمل التحقق للمتابعة.',
            modalClose: 'إغلاق',
          }
        : {
            title: 'Security verification',
            help: 'Please complete reCAPTCHA before sending your message.',
            verify: 'Complete verification',
            retry: 'Verify again',
            verified: 'Verification completed successfully.',
            required: 'Please complete the security verification first.',
            expired: 'Verification expired. Please verify again.',
            loadError: 'Could not load verification. Please try again.',
            missingConfig: 'Contact form is temporarily unavailable. Please try again later.',
            modalTitle: 'Security check',
            modalDescription: 'Complete the verification to continue.',
            modalClose: 'Close',
          },
    [isRTL]
  );

  useEffect(() => {
    let mounted = true;
    setRecipientLoading(true);

    frontService
      .settings()
      .then((settings) => {
        if (!mounted) return;
        setRecipientEmail(resolveContactEmail(settings));
        setRecaptchaSiteKey(resolveRecaptchaSiteKey(settings));
        setRecaptchaToken(null);
        setRecaptchaError(null);
      })
      .catch(() => {
        if (!mounted) return;
        setRecipientEmail(FALLBACK_CONTACT_EMAIL);
        setRecaptchaSiteKey('');
        setRecaptchaToken(null);
        setRecaptchaError(null);
      })
      .finally(() => {
        if (mounted) {
          setRecipientLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const hasAnyTouched = touched.name || touched.email || touched.subject || touched.message;

  useEffect(() => {
    if (!hasAnyTouched && !submitAttempted) return;
    setErrors(validateForm(form, labels));
  }, [form, hasAnyTouched, labels, submitAttempted]);

  const updateField = (field: FieldName, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const touchField = (field: FieldName) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const getFieldError = (field: FieldName) => {
    if (!submitAttempted && !touched[field]) return undefined;
    return errors[field];
  };

  const canSubmit =
    !loading &&
    form.name.trim().length > 0 &&
    form.email.trim().length > 0 &&
    form.subject.trim().length > 0 &&
    form.message.trim().length > 0 &&
    recaptchaSiteKey.trim().length > 0 &&
    !!recaptchaToken;

  const openRecaptcha = () => {
    if (!recaptchaSiteKey.trim()) {
      setRecaptchaError(recaptchaTexts.missingConfig);
      return;
    }

    setRecaptchaError(null);
    setRecaptchaModalVisible(true);
  };

  const handleRecaptchaToken = (token: string) => {
    setRecaptchaToken(token);
    setRecaptchaError(null);
    setRecaptchaModalVisible(false);
  };

  const handleRecaptchaExpired = () => {
    setRecaptchaToken(null);
    setRecaptchaError(recaptchaTexts.expired);
  };

  const handleRecaptchaError = () => {
    setRecaptchaToken(null);
    setRecaptchaError(recaptchaTexts.loadError);
  };

  const submit = async () => {
    setSubmitAttempted(true);
    setTouched({
      name: true,
      email: true,
      subject: true,
      message: true,
    });

    const localValidation = validateForm(form, labels);
    setErrors(localValidation);
    if (Object.keys(localValidation).length) {
      return;
    }

    if (!recaptchaSiteKey.trim()) {
      setRecaptchaError(recaptchaTexts.missingConfig);
      return;
    }

    if (!recaptchaToken) {
      setRecaptchaError(recaptchaTexts.required);
      return;
    }

    setLoading(true);
    setRecaptchaError(null);
    try {
      await frontService.submitContact({
        name: form.name.trim(),
        email: form.email.trim(),
        subject: form.subject.trim(),
        message: form.message.trim(),
        'g-recaptcha-response': recaptchaToken,
      });
      Alert.alert(t('sentTitle'), t('sentMessage'));
      setForm({
        name: '',
        email: '',
        subject: '',
        message: '',
      });
      setTouched({});
      setErrors({});
      setSubmitAttempted(false);
      setRecaptchaToken(null);
      setRecaptchaError(null);
    } catch (error) {
      const apiErrors = mapApiFieldErrors(error);
      if (Object.keys(apiErrors).length > 0) {
        setErrors((prev) => ({ ...prev, ...apiErrors }));
      }
      const recaptchaApiError = mapApiRecaptchaError(error);
      if (recaptchaApiError) {
        setRecaptchaToken(null);
        setRecaptchaError(recaptchaApiError);
      }
      Alert.alert(t('errorTitle'), recaptchaApiError || t('errorMessage'));
    } finally {
      setLoading(false);
    }
  };

  const renderBackground = (
    <View pointerEvents="none" style={styles.background}>
      <LinearGradient
        colors={[SCREEN_BG_PRIMARY, SCREEN_BG_SECONDARY, SCREEN_BG_PRIMARY]}
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
      <View style={[styles.backgroundOrb, styles.backgroundOrbTop]} />
      <View style={[styles.backgroundOrb, styles.backgroundOrbBottom]} />
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

          <View style={[styles.heroTop, isOppositeRTL && styles.rowOppositeRTL]}>
            <View style={styles.heroIconShell}>
              <Ionicons name="mail-open-outline" size={20} color="#63E6E2" />
            </View>
            <View style={styles.heroTextWrap}>
              <AppText weight="bold" size="xl" color={TEXT_PRIMARY} style={textDirectionStyle}>
                {t('contactUs')}
              </AppText>
              <AppText size="sm" color={TEXT_SECONDARY} style={textDirectionStyle}>
                {labels.subtitle}
              </AppText>
            </View>
          </View>

          <View style={styles.recipientCard}>
            <View style={[styles.recipientHeader, isOppositeRTL && styles.rowOppositeRTL]}>
              <Ionicons name="send-outline" size={16} color="#63E6E2" />
              <AppText weight="bold" size="sm" color={TEXT_PRIMARY} style={textDirectionStyle}>
                {labels.helperTitle}
              </AppText>
            </View>

            <AppText size="xs" color={TEXT_MUTED} style={textDirectionStyle}>
              {labels.helperHint}
            </AppText>

            <View style={styles.recipientEmailPill}>
              <AppText size="sm" weight="semibold" color="#63E6E2" style={styles.recipientEmailText}>
                {recipientLoading ? labels.recipientLoading : recipientEmail}
              </AppText>
            </View>
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(80).springify()}>
        <View style={styles.formCard}>
          <BlurView intensity={20} tint="dark" pointerEvents="none" style={styles.glassLayer} />
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(255,255,255,0.14)', 'rgba(255,255,255,0.04)', 'rgba(255,255,255,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.glassSheen}
          />

          <View style={styles.field}>
            <View style={[styles.fieldHeader, isOppositeRTL && styles.rowOppositeRTL]}>
              <Ionicons name="person-outline" size={15} color="#63E6E2" />
              <AppText size="sm" weight="semibold" color={TEXT_PRIMARY} style={textDirectionStyle}>
                {labels.nameLabel}
              </AppText>
            </View>
            <AppInput
              placeholder={t('name')}
              value={form.name}
              onChangeText={(value) => updateField('name', value)}
              onBlur={() => touchField('name')}
              error={!!getFieldError('name')}
              autoCapitalize="words"
              returnKeyType="next"
              style={inputDirectionStyle}
            />
            {getFieldError('name') ? (
              <AppText size="xs" color={ERROR_COLOR} style={[styles.errorText, textDirectionStyle]}>
                {getFieldError('name')}
              </AppText>
            ) : null}
          </View>

          <View style={styles.field}>
            <View style={[styles.fieldHeader, isOppositeRTL && styles.rowOppositeRTL]}>
              <Ionicons name="mail-outline" size={15} color="#63E6E2" />
              <AppText size="sm" weight="semibold" color={TEXT_PRIMARY} style={textDirectionStyle}>
                {labels.emailLabel}
              </AppText>
            </View>
            <AppInput
              placeholder={t('email')}
              value={form.email}
              onChangeText={(value) => updateField('email', value)}
              onBlur={() => touchField('email')}
              error={!!getFieldError('email')}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              style={inputDirectionStyle}
            />
            {getFieldError('email') ? (
              <AppText size="xs" color={ERROR_COLOR} style={[styles.errorText, textDirectionStyle]}>
                {getFieldError('email')}
              </AppText>
            ) : null}
          </View>

          <View style={styles.field}>
            <View style={[styles.fieldHeader, isOppositeRTL && styles.rowOppositeRTL]}>
              <Ionicons name="bookmark-outline" size={15} color="#63E6E2" />
              <AppText size="sm" weight="semibold" color={TEXT_PRIMARY} style={textDirectionStyle}>
                {labels.subjectLabel}
              </AppText>
            </View>
            <AppInput
              placeholder={t('subject')}
              value={form.subject}
              onChangeText={(value) => updateField('subject', value)}
              onBlur={() => touchField('subject')}
              error={!!getFieldError('subject')}
              returnKeyType="next"
              style={inputDirectionStyle}
            />
            {getFieldError('subject') ? (
              <AppText size="xs" color={ERROR_COLOR} style={[styles.errorText, textDirectionStyle]}>
                {getFieldError('subject')}
              </AppText>
            ) : null}
          </View>

          <View style={styles.field}>
            <View style={[styles.fieldHeader, isOppositeRTL && styles.rowOppositeRTL]}>
              <Ionicons name="chatbox-ellipses-outline" size={15} color="#63E6E2" />
              <AppText size="sm" weight="semibold" color={TEXT_PRIMARY} style={textDirectionStyle}>
                {labels.messageLabel}
              </AppText>
            </View>
            <AppInput
              placeholder={t('yourMessage')}
              value={form.message}
              onChangeText={(value) => updateField('message', value)}
              onBlur={() => touchField('message')}
              error={!!getFieldError('message')}
              multiline
              maxLength={MESSAGE_MAX_LENGTH}
              style={[styles.messageInput, inputDirectionStyle]}
              textAlignVertical="top"
            />
            <View style={[styles.messageFooter, isOppositeRTL && styles.rowOppositeRTL]}>
              {getFieldError('message') ? (
                <AppText size="xs" color={ERROR_COLOR} style={[styles.errorText, textDirectionStyle]}>
                  {getFieldError('message')}
                </AppText>
              ) : (
                <View />
              )}
              <AppText size="xs" color={TEXT_MUTED} style={textDirectionStyle}>
                {labels.messageCounter(form.message.length)}
              </AppText>
            </View>
          </View>

          {recaptchaSiteKey ? (
            <View style={styles.recaptchaCard}>
              <View style={[styles.fieldHeader, isOppositeRTL && styles.rowOppositeRTL]}>
                <Ionicons
                  name={recaptchaToken ? 'shield-checkmark-outline' : 'shield-outline'}
                  size={15}
                  color={recaptchaToken ? '#86EFAC' : '#63E6E2'}
                />
                <AppText size="sm" weight="semibold" color={TEXT_PRIMARY} style={textDirectionStyle}>
                  {recaptchaTexts.title}
                </AppText>
              </View>

              <AppText size="xs" color={TEXT_MUTED} style={textDirectionStyle}>
                {recaptchaToken ? recaptchaTexts.verified : recaptchaTexts.help}
              </AppText>

              <AppButton
                title={recaptchaToken ? recaptchaTexts.retry : recaptchaTexts.verify}
                onPress={openRecaptcha}
                variant="secondary"
                fullWidth
                style={styles.recaptchaButton}
              />

              {recaptchaError ? (
                <AppText size="xs" color={ERROR_COLOR} style={[styles.errorText, textDirectionStyle]}>
                  {recaptchaError}
                </AppText>
              ) : null}
            </View>
          ) : (
            <View style={styles.recaptchaWarning}>
              <AppText size="xs" color="#FECACA" style={textDirectionStyle}>
                {recaptchaTexts.missingConfig}
              </AppText>
            </View>
          )}

          <AppButton
            title={t('send')}
            onPress={submit}
            loading={loading}
            disabled={!canSubmit}
            fullWidth
            style={styles.submitButton}
          />
        </View>
      </Animated.View>

      <RecaptchaModal
        visible={recaptchaModalVisible}
        siteKey={recaptchaSiteKey}
        locale={locale}
        title={recaptchaTexts.modalTitle}
        description={recaptchaTexts.modalDescription}
        closeLabel={recaptchaTexts.modalClose}
        onClose={() => setRecaptchaModalVisible(false)}
        onToken={handleRecaptchaToken}
        onExpired={handleRecaptchaExpired}
        onError={handleRecaptchaError}
      />
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
    shadowColor: SCREEN_BG_SECONDARY,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 26,
    elevation: 8,
  },
  backgroundOrbTop: {
    width: 240,
    height: 240,
    top: -86,
    left: -72,
  },
  backgroundOrbBottom: {
    width: 296,
    height: 296,
    bottom: -124,
    right: -88,
  },
  backgroundBeamLeft: {
    position: 'absolute',
    width: 246,
    height: 246,
    top: '22%',
    left: -160,
    borderWidth: 1,
    borderColor: 'rgba(19,71,101,0.54)',
    borderRadius: 36,
    transform: [{ rotate: '30deg' }],
  },
  backgroundBeamRight: {
    position: 'absolute',
    width: 234,
    height: 234,
    top: '56%',
    right: -152,
    borderWidth: 1,
    borderColor: 'rgba(19,71,101,0.5)',
    borderRadius: 34,
    transform: [{ rotate: '-26deg' }],
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
  rowOppositeRTL: {
    flexDirection: 'row-reverse',
  },
  textOppositeRTL: {
    textAlign: 'left',
    writingDirection: 'ltr',
  },
  textOppositeLTR: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  inputOppositeRTL: {
    textAlign: 'left',
    writingDirection: 'ltr',
  },
  inputOppositeLTR: {
    textAlign: 'right',
    writingDirection: 'rtl',
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
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  heroIconShell: {
    width: 46,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(99,230,226,0.52)',
    backgroundColor: 'rgba(99,230,226,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTextWrap: {
    flex: 1,
    gap: 2,
  },
  recipientCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(190,224,255,0.2)',
    backgroundColor: 'rgba(9,23,37,0.3)',
    padding: spacing.sm,
    gap: spacing.xs,
  },
  recipientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  recipientEmailPill: {
    minHeight: 36,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(99,230,226,0.45)',
    backgroundColor: 'rgba(99,230,226,0.14)',
    paddingHorizontal: spacing.sm,
    justifyContent: 'center',
  },
  recipientEmailText: {
    textAlign: 'center',
    writingDirection: 'ltr',
  },
  formCard: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(190,224,255,0.24)',
    backgroundColor: 'rgba(8,27,45,0.52)',
    padding: spacing.md,
    gap: spacing.sm,
  },
  field: {
    gap: spacing.xs,
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  recaptchaCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(190,224,255,0.2)',
    backgroundColor: 'rgba(9,23,37,0.26)',
    padding: spacing.sm,
    gap: spacing.xs,
  },
  recaptchaButton: {
    marginTop: spacing.xs,
  },
  recaptchaWarning: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(252,165,165,0.55)',
    backgroundColor: 'rgba(127,29,29,0.25)',
    padding: spacing.sm,
  },
  messageInput: {
    height: 180,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  messageFooter: {
    minHeight: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    lineHeight: 18,
  },
  submitButton: {
    marginTop: spacing.sm,
  },
});
