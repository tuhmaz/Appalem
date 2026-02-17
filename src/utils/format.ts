export function formatDate(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('ar-JO');
}

export function truncate(text?: string, length = 140) {
  if (!text) return '';
  return text.length > length ? `${text.slice(0, length)}...` : text;
}

export function stripHtml(text?: string) {
  if (!text) return '';
  return text.replace(/<[^>]+>/g, '');
}

