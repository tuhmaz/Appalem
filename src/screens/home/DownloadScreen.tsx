import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Alert, Platform } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import * as FileSystemLegacy from 'expo-file-system/legacy';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  cancelAnimation,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppButton, AppText, Card, Screen, BannerAd } from '@/components';
import { useTranslation } from '@/hooks/useTranslation';
import { spacing } from '@/theme';
import { normalizeExternalUrl, stripApiSuffix, normalizeBaseUrl } from '@/utils/url';
import { ENV } from '@/config/env';
import { API_ENDPOINTS } from '@/services/endpoints';
import { Ionicons } from '@expo/vector-icons';

const DETAIL_BG_PRIMARY = '#091725';
const DETAIL_BG_SECONDARY = '#134765';
const TEXT_PRIMARY = '#F4FAFF';
const TEXT_SECONDARY = 'rgba(223,239,255,0.88)';
const TEXT_MUTED = 'rgba(184,214,239,0.78)';

const ANDROID_DOWNLOAD_DIR_KEY = '@alemancenter:download-dir-uri';

type DownloadScreenParams = {
  fileId: number;
  fileName: string;
  fileSize: number;
  fileType: string;
  fileUrl?: string;
  filePath?: string;
};

type DownloadScreenRouteProp = RouteProp<{ params: DownloadScreenParams }, 'params'>;

function resolveAssetUrl(path?: string | null) {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path)) {
    return normalizeExternalUrl(path) ?? undefined;
  }

  const base = stripApiSuffix(normalizeBaseUrl(ENV.API_URL));
  const normalized = path.startsWith('/') ? path : `/${path}`;

  if (normalized.startsWith('/storage/')) {
    return normalizeExternalUrl(`${base}${normalized}`) ?? undefined;
  }

  if (normalized.startsWith('/api/')) {
    return normalizeExternalUrl(`${base}${normalized}`) ?? undefined;
  }

  return normalizeExternalUrl(`${base}/storage${normalized}`) ?? undefined;
}

function formatFileSize(bytes?: number) {
  if (!bytes || bytes <= 0) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const precision = value >= 100 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(precision)} ${units[unitIndex]}`;
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[/\\]/g, '_').trim() || `file-${Date.now()}`;
}

function ensureExtensionFromUrl(fileName: string, url: string) {
  if (fileName.includes('.')) return fileName;
  const urlExtension = url.split('.').pop()?.split(/[?#]/)[0];
  if (urlExtension && urlExtension.length > 1 && urlExtension.length < 8) {
    return `${fileName}.${urlExtension}`;
  }
  return fileName;
}

function inferMimeType(fileName: string, fileType?: string) {
  const normalized = (fileType || '').trim().toLowerCase();
  if (normalized.includes('/')) return normalized;

  const ext = (normalized || fileName.split('.').pop() || '').toLowerCase();
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'doc') return 'application/msword';
  if (ext === 'docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (ext === 'xls') return 'application/vnd.ms-excel';
  if (ext === 'xlsx') return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (ext === 'ppt') return 'application/vnd.ms-powerpoint';
  if (ext === 'pptx') return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
  if (ext === 'zip') return 'application/zip';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';

  return 'application/octet-stream';
}

async function resolveAndroidDownloadDirectory(forcePick = false): Promise<string | null> {
  if (Platform.OS !== 'android') return null;

  if (!forcePick) {
    const cachedUri = await AsyncStorage.getItem(ANDROID_DOWNLOAD_DIR_KEY);
    if (cachedUri) return cachedUri;
  }

  const initialDownloadsUri = FileSystemLegacy.StorageAccessFramework.getUriForDirectoryInRoot('Download');
  const permission = await FileSystemLegacy.StorageAccessFramework.requestDirectoryPermissionsAsync(initialDownloadsUri);
  if (!permission.granted) return null;

  await AsyncStorage.setItem(ANDROID_DOWNLOAD_DIR_KEY, permission.directoryUri);
  return permission.directoryUri;
}

async function writeLocalFileToSafDirectory(localFileUri: string, dirUri: string, fileName: string, mimeType: string) {
  let safFileUri: string;

  try {
    safFileUri = await FileSystemLegacy.StorageAccessFramework.createFileAsync(dirUri, fileName, mimeType);
  } catch {
    safFileUri = await FileSystemLegacy.StorageAccessFramework.createFileAsync(dirUri, `${Date.now()}-${fileName}`, mimeType);
  }

  const base64 = await FileSystemLegacy.readAsStringAsync(localFileUri, {
    encoding: FileSystemLegacy.EncodingType.Base64,
  });

  await FileSystemLegacy.StorageAccessFramework.writeAsStringAsync(safFileUri, base64, {
    encoding: FileSystemLegacy.EncodingType.Base64,
  });
}

export function DownloadScreen() {
  const route = useRoute<DownloadScreenRouteProp>();
  const { t } = useTranslation();

  const { fileId, fileName, fileSize, fileType, fileUrl, filePath } = route.params;

  const [timeLeft, setTimeLeft] = useState(15);
  const [canDownload, setCanDownload] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
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

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanDownload(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleDownload = async () => {
    if (isDownloading) return;

    const directUrl = resolveAssetUrl(fileUrl || filePath);
    const fallback = `${ENV.API_URL}${API_ENDPOINTS.ARTICLES.DOWNLOAD(fileId)}`;
    const url = directUrl || fallback;

    const errorTitle = t('errorTitle');
    const successTitle = t('success');
    const genericDownloadError = t('downloadError');
    const chooseFolderMessage = t('downloadFolderPrompt');
    const savedInFolderMessage = t('downloadSavedInFolder');
    const downloadedSuccessMessage = t('downloadSuccess');

    if (!url) {
      Alert.alert(errorTitle, t('linkOpenError'));
      return;
    }

    try {
      setIsDownloading(true);

      let safeFileName = sanitizeFileName(fileName);
      safeFileName = ensureExtensionFromUrl(safeFileName, url);

      if (Platform.OS === 'android') {
        const cacheDirectory = FileSystemLegacy.cacheDirectory ?? FileSystemLegacy.documentDirectory;
        if (!cacheDirectory) {
          throw new Error('Local cache directory is unavailable.');
        }

        const localTempUri = `${cacheDirectory}${Date.now()}-${safeFileName}`;
        await FileSystemLegacy.downloadAsync(url, localTempUri);

        try {
          let targetDir = await resolveAndroidDownloadDirectory(false);
          if (!targetDir) {
            Alert.alert(errorTitle, chooseFolderMessage);
            return;
          }

          const mimeType = inferMimeType(safeFileName, fileType);
          try {
            await writeLocalFileToSafDirectory(localTempUri, targetDir, safeFileName, mimeType);
          } catch (firstError) {
            await AsyncStorage.removeItem(ANDROID_DOWNLOAD_DIR_KEY);
            targetDir = await resolveAndroidDownloadDirectory(true);
            if (!targetDir) throw firstError;
            await writeLocalFileToSafDirectory(localTempUri, targetDir, safeFileName, mimeType);
          }
        } finally {
          await FileSystemLegacy.deleteAsync(localTempUri, { idempotent: true });
        }

        Alert.alert(successTitle, savedInFolderMessage);
        return;
      }

      const documentDirectory = FileSystemLegacy.documentDirectory;
      if (!documentDirectory) {
        throw new Error('Local document directory is unavailable.');
      }

      await FileSystemLegacy.downloadAsync(url, `${documentDirectory}${safeFileName}`);
      Alert.alert(successTitle, downloadedSuccessMessage);
    } catch (error) {
      if (__DEV__) console.error('Download error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      Alert.alert(errorTitle, `${genericDownloadError}\n${errorMessage}`);
    } finally {
      setIsDownloading(false);
    }
  };

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

  const renderBackground = (
    <View pointerEvents="none" style={styles.background}>
      <LinearGradient
        colors={[DETAIL_BG_PRIMARY, DETAIL_BG_SECONDARY, DETAIL_BG_PRIMARY]}
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

  return (
    <Screen style={styles.screen} background={renderBackground} scrollable>
      <View style={styles.content}>
        <Card style={styles.card}>
          <View style={styles.iconContainer}>
            <Ionicons name="document-text-outline" size={64} color={TEXT_PRIMARY} />
          </View>

          <AppText weight="bold" size="xl" color={TEXT_PRIMARY} style={styles.fileName}>
            {fileName}
          </AppText>

          <View style={styles.metaContainer}>
            <View style={styles.metaItem}>
              <AppText size="sm" color={TEXT_MUTED}>{t('fileType')}</AppText>
              <AppText weight="semibold" color={TEXT_SECONDARY}>{fileType ? fileType.toUpperCase() : 'FILE'}</AppText>
            </View>
            <View style={styles.divider} />
            <View style={styles.metaItem}>
              <AppText size="sm" color={TEXT_MUTED}>{t('fileSize')}</AppText>
              <AppText weight="semibold" color={TEXT_SECONDARY}>{formatFileSize(fileSize)}</AppText>
            </View>
          </View>

          <View style={styles.timerContainer}>
            {!canDownload ? (
              <>
                <AppText size="lg" weight="bold" color={TEXT_PRIMARY} style={styles.timerText}>
                  {timeLeft}
                </AppText>
                <AppText size="sm" color={TEXT_MUTED}>
                  {t('secondsToDownload')}
                </AppText>
              </>
            ) : (
              <AppText size="lg" weight="bold" color="#4ADE80" style={styles.readyText}>
                {t('fileReadyToDownload')}
              </AppText>
            )}
          </View>

          <AppButton
            title={isDownloading ? t('downloading') : t('downloadFile')}
            onPress={handleDownload}
            disabled={!canDownload || isDownloading}
            style={styles.button}
            loading={isDownloading}
          />
        </Card>

        <View style={styles.adContainer}>
          <BannerAd size="MEDIUM_RECTANGLE" />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: DETAIL_BG_PRIMARY,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  adContainer: {
    marginTop: spacing.xl,
    alignItems: 'center',
    width: '100%',
  },
  card: {
    borderWidth: 1,
    borderColor: 'rgba(190,224,255,0.24)',
    backgroundColor: 'rgba(8,27,45,0.52)',
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.lg,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(19,71,101,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(190,224,255,0.35)',
    marginBottom: spacing.sm,
  },
  fileName: {
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  metaContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
    width: '100%',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(190,224,255,0.1)',
  },
  metaItem: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(190,224,255,0.1)',
  },
  timerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 80,
  },
  timerText: {
    fontSize: 48,
    lineHeight: 56,
  },
  readyText: {
    fontSize: 20,
  },
  button: {
    width: '100%',
    marginTop: spacing.md,
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
    shadowColor: DETAIL_BG_SECONDARY,
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
});
