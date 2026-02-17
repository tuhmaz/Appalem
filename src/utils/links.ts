import { Linking } from 'react-native';
import { normalizeExternalUrl } from './url';

export async function openExternalUrl(raw: string): Promise<boolean> {
  const safeUrl = normalizeExternalUrl(raw);
  if (!safeUrl) return false;

  try {
    const canOpen = await Linking.canOpenURL(safeUrl);
    if (!canOpen) return false;

    await Linking.openURL(safeUrl);
    return true;
  } catch {
    return false;
  }
}
