import { extractApiErrorMessage } from './apiError';

type ApiErrorLike = {
  status?: unknown;
};

function getStatus(error: unknown): number | null {
  if (!error || typeof error !== 'object') return null;
  const status = (error as ApiErrorLike).status;
  return typeof status === 'number' ? status : null;
}

export function buildLoginErrorMessage(error: unknown, isRTL: boolean, fallback: string) {
  const status = getStatus(error);
  if (status === 401 || status === 422) {
    return isRTL
      ? 'تعذر تسجيل الدخول. تأكد من البريد الإلكتروني وكلمة المرور ثم حاول مرة أخرى.'
      : 'Unable to sign in. Check your email and password, then try again.';
  }

  if (status !== null && status >= 500) {
    return isRTL
      ? 'الخدمة غير متاحة حالياً. حاول مرة أخرى بعد قليل.'
      : 'Service is temporarily unavailable. Please try again shortly.';
  }

  return extractApiErrorMessage(error, fallback);
}

export function buildRegisterErrorMessage(error: unknown, isRTL: boolean, fallback: string) {
  const status = getStatus(error);
  const message = extractApiErrorMessage(error, fallback);

  if (status === 422) {
    return isRTL
      ? `تعذر إنشاء الحساب. ${message}`
      : `Unable to create account. ${message}`;
  }

  if (status !== null && status >= 500) {
    return isRTL
      ? 'الخدمة غير متاحة حالياً. حاول مرة أخرى بعد قليل.'
      : 'Service is temporarily unavailable. Please try again shortly.';
  }

  return message;
}

export function buildGoogleAuthErrorMessage(error: unknown, isRTL: boolean, fallback: string) {
  const message = extractApiErrorMessage(error, fallback);
  if (message === 'google_auth_cancelled') return message;
  if (message === 'google_auth_failed') {
    return isRTL
      ? 'تعذر إكمال تسجيل الدخول عبر Google. حاول مرة أخرى.'
      : 'Unable to complete Google sign-in. Please try again.';
  }
  return message;
}
