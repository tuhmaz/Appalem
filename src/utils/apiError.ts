type ApiErrorShape = {
  message?: unknown;
  errors?: unknown;
};

function extractValidationMessage(errors: unknown): string | null {
  if (!errors || typeof errors !== 'object') return null;

  for (const value of Object.values(errors as Record<string, unknown>)) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }

    if (Array.isArray(value)) {
      const firstString = value.find((entry) => typeof entry === 'string' && entry.trim()) as string | undefined;
      if (firstString) return firstString.trim();
    }
  }

  return null;
}

export function extractApiErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== 'object') return fallback;

  const payload = error as ApiErrorShape;

  const validationMessage = extractValidationMessage(payload.errors);
  if (validationMessage) return validationMessage;

  if (typeof payload.message === 'string' && payload.message.trim()) {
    return payload.message.trim();
  }

  return fallback;
}
