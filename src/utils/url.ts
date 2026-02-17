const IPV4_REGEX = /^(?:\d{1,3}\.){3}\d{1,3}$/;

function isPrivateIpv4(hostname: string): boolean {
  if (!IPV4_REGEX.test(hostname)) return false;
  const [a, b] = hostname.split('.').map(part => Number(part));

  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;

  return false;
}

export function isLocalHost(hostname: string): boolean {
  if (!hostname) return false;
  if (hostname === 'localhost' || hostname === '::1') return true;
  return isPrivateIpv4(hostname);
}

function allowInsecureHttp(hostname: string): boolean {
  return __DEV__ && isLocalHost(hostname);
}

export function normalizeExternalUrl(raw: string): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;

  const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed);
  const withScheme = hasScheme ? trimmed : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return null;
  }

  if (url.protocol === 'http:' && !allowInsecureHttp(url.hostname)) {
    url.protocol = 'https:';
  }

  return url.toString();
}

export function normalizeBaseUrl(raw: string): string {
  const safe = normalizeExternalUrl(raw);
  return (safe ?? raw.trim()).replace(/\/+$/, '');
}

export function stripApiSuffix(url: string): string {
  return url.replace(/\/+$/, '').replace(/\/api$/, '');
}
