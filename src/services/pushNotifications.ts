import { PermissionsAndroid, Platform } from 'react-native';
import { getApp } from '@react-native-firebase/app';
import {
  getInitialNotification,
  getMessaging,
  getToken,
  onMessage,
  onNotificationOpenedApp,
  onTokenRefresh,
  registerDeviceForRemoteMessages,
  requestPermission,
  type Messaging,
  type RemoteMessage,
} from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';
import { navigationRef } from '@/navigation/navigationRef';
import { pushTokensService } from '@/services/pushTokens';

type NotificationTarget =
  | { screen: 'ArticleDetails'; params: { articleId: number } }
  | { screen: 'PostDetails'; params: { postId: number } };

function toPositiveInt(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) return value;
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    const parsed = Number(value.trim());
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }
  return null;
}

function detectTopicFromPath(pathname: string): 'article' | 'post' | null {
  const lower = pathname.toLowerCase();
  if (/(^|\/)(article|articles|lesson|lessons)(\/|$)/.test(lower)) return 'article';
  if (/(^|\/)(post|posts)(\/|$)/.test(lower)) return 'post';
  return null;
}

function extractIdFromPath(pathname: string): number | null {
  const segments = pathname.split('/').filter(Boolean);
  for (let i = segments.length - 1; i >= 0; i -= 1) {
    const asId = toPositiveInt(segments[i]);
    if (asId) return asId;
  }
  return null;
}

function toNotificationText(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return fallback;
}

function resolveTargetFromData(data: Record<string, unknown>): NotificationTarget | null {
  const typeLower = String(data.type || '').toLowerCase();
  const url = typeof data.url === 'string' ? data.url.trim() : '';

  const explicitArticleId =
    toPositiveInt(data.article_id) ||
    toPositiveInt(data.articleId) ||
    toPositiveInt(data.lesson_id) ||
    toPositiveInt(data.lessonId);

  const explicitPostId =
    toPositiveInt(data.post_id) ||
    toPositiveInt(data.postId);

  if ((typeLower.includes('article') || typeLower.includes('lesson')) && explicitArticleId) {
    return { screen: 'ArticleDetails', params: { articleId: explicitArticleId } };
  }

  if (typeLower.includes('post') && explicitPostId) {
    return { screen: 'PostDetails', params: { postId: explicitPostId } };
  }

  if (!url) return null;

  let path = '';
  let articleIdFromQuery: number | null = null;
  let postIdFromQuery: number | null = null;
  try {
    const parsed = new URL(url, 'https://internal.local');
    path = parsed.pathname || '';
    articleIdFromQuery =
      toPositiveInt(parsed.searchParams.get('article_id')) ||
      toPositiveInt(parsed.searchParams.get('articleId')) ||
      toPositiveInt(parsed.searchParams.get('lesson_id')) ||
      toPositiveInt(parsed.searchParams.get('lessonId'));
    postIdFromQuery =
      toPositiveInt(parsed.searchParams.get('post_id')) ||
      toPositiveInt(parsed.searchParams.get('postId'));
  } catch {
    path = url;
  }

  const topic = detectTopicFromPath(path);
  const pathId = extractIdFromPath(path);

  if (topic === 'article') {
    const articleId = explicitArticleId || articleIdFromQuery || pathId;
    if (articleId) return { screen: 'ArticleDetails', params: { articleId } };
  }

  if (topic === 'post') {
    const postId = explicitPostId || postIdFromQuery || pathId;
    if (postId) return { screen: 'PostDetails', params: { postId } };
  }

  return null;
}

class PushNotificationsService {
  private initialized = false;
  private pendingTarget: NotificationTarget | null = null;
  private currentToken: string | null = null;
  private currentUserId: number | string | null = null;
  private messagingInstance: Messaging | null = null;
  private foregroundEventsBound = false;
  private localNotificationsReady = false;
  private readonly androidChannelId = 'alemancenter_general';

  initialize() {
    if (this.initialized) return;
    this.initialized = true;

    this.messagingInstance = getMessaging(getApp());
    const messaging = this.messagingInstance;

    void this.ensureLocalNotificationSetup();
    void this.bootstrap();

    onTokenRefresh(messaging, (nextToken) => {
      this.currentToken = nextToken?.trim() || null;
      void this.registerTokenIfPossible();
    });

    onNotificationOpenedApp(messaging, (remoteMessage) => {
      this.handleNotificationOpen(remoteMessage);
    });

    onMessage(messaging, (remoteMessage) => {
      void this.showForegroundSystemNotification(remoteMessage);
    });

    getInitialNotification(messaging)
      .then((remoteMessage) => {
        if (remoteMessage) {
          this.handleNotificationOpen(remoteMessage);
        }
      })
      .catch(() => {});
  }

  syncUser(userId: number | string | null | undefined) {
    if (!this.initialized) return;
    const previousUserId = this.currentUserId;
    this.currentUserId = userId ?? null;

    if (!this.currentUserId) {
      // Only unregister when we transition from authenticated -> guest.
      // Initial guest state should not call protected API endpoints.
      if (previousUserId && this.currentToken) {
        pushTokensService.unregister().catch(() => {});
      }
      return;
    }

    void this.registerTokenIfPossible();
  }

  flushPendingNavigation() {
    if (!this.pendingTarget || !navigationRef.isReady()) return;
    this.navigateToTarget(this.pendingTarget);
    this.pendingTarget = null;
  }

  async getCurrentToken(): Promise<string | null> {
    const existing = this.currentToken?.trim();
    if (existing) return existing;
    if (!this.messagingInstance) return null;

    try {
      const token = await getToken(this.messagingInstance);
      this.currentToken = token?.trim() || null;
      return this.currentToken;
    } catch {
      return null;
    }
  }

  async waitForToken(timeoutMs = 6000, signal?: AbortSignal): Promise<string | null> {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
      if (signal?.aborted) return null;
      const token = await this.getCurrentToken();
      if (token) return token;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    return null;
  }

  async registerCurrentTokenForUser(retries = 2): Promise<boolean> {
    const token = await this.getCurrentToken();
    if (!token || !this.currentUserId) return false;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        await pushTokensService.register(token);
        return true;
      } catch {
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        }
      }
    }
    return false;
  }

  private async ensureLocalNotificationSetup() {
    if (this.localNotificationsReady) return;

    if (!this.foregroundEventsBound) {
      notifee.onForegroundEvent(({ type, detail }) => {
        if (type !== EventType.PRESS) return;

        const payload = detail.notification?.data as Record<string, unknown> | undefined;
        if (!payload) return;

        const target = resolveTargetFromData(payload);
        if (!target) return;

        if (!navigationRef.isReady()) {
          this.pendingTarget = target;
          return;
        }

        this.navigateToTarget(target);
      });

      this.foregroundEventsBound = true;
    }

    if (Platform.OS === 'android') {
      await notifee.createChannel({
        id: this.androidChannelId,
        name: 'General Notifications',
        importance: AndroidImportance.HIGH,
        sound: 'default',
      });
    }

    this.localNotificationsReady = true;
  }

  private buildNotificationData(messageData: RemoteMessage['data']): Record<string, string> {
    const data: Record<string, string> = {};
    if (!messageData) return data;

    Object.entries(messageData).forEach(([key, value]) => {
      if (typeof value === 'string') {
        data[key] = value;
      }
    });

    return data;
  }

  private async showForegroundSystemNotification(remoteMessage: RemoteMessage) {
    try {
      await this.ensureLocalNotificationSetup();

      const title = toNotificationText(
        remoteMessage.notification?.title ?? remoteMessage.data?.title,
        'New notification',
      );
      const body =
        toNotificationText(remoteMessage.notification?.body) ||
        toNotificationText(remoteMessage.data?.message) ||
        toNotificationText(remoteMessage.data?.body) ||
        '';

      await notifee.displayNotification({
        title,
        body,
        data: this.buildNotificationData(remoteMessage.data),
        android: {
          channelId: this.androidChannelId,
          smallIcon: 'ic_stat_notify',
          pressAction: {
            id: 'default',
          },
        },
      });
    } catch (error) {
      if (__DEV__) {
        console.log('[FCM][Foreground][Notifee Error]', error);
      }
    }
  }

  private async bootstrap() {
    if (!this.messagingInstance) return;

    try {
      await this.requestPermission();
      await registerDeviceForRemoteMessages(this.messagingInstance);
      const token = await getToken(this.messagingInstance);
      this.currentToken = token?.trim() || null;
      await this.registerTokenIfPossible();
    } catch (error) {
      if (__DEV__) console.warn('[FCM] Bootstrap failed:', error);
    }
  }

  private async requestPermission() {
    if (!this.messagingInstance) return;

    if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
      try {
        await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
      } catch {
        // Ignore permission errors.
      }
      return;
    }

    if (Platform.OS === 'ios') {
      try {
        await requestPermission(this.messagingInstance);
      } catch {
        // Ignore permission errors.
      }
    }
  }

  private async registerTokenIfPossible(retries = 2) {
    const token = this.currentToken?.trim();
    if (!token || !this.currentUserId) return;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        await pushTokensService.register(token);
        return;
      } catch {
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        }
      }
    }
  }

  private handleNotificationOpen(remoteMessage: RemoteMessage) {
    const additionalData = remoteMessage?.data;
    if (!additionalData || typeof additionalData !== 'object') return;

    const target = resolveTargetFromData(additionalData as Record<string, unknown>);
    if (!target) return;

    if (!navigationRef.isReady()) {
      this.pendingTarget = target;
      return;
    }

    this.navigateToTarget(target);
  }

  private navigateToTarget(target: NotificationTarget) {
    if (!navigationRef.isReady()) return;

    if (target.screen === 'ArticleDetails') {
      navigationRef.navigate('ArticleDetails', target.params);
      return;
    }

    navigationRef.navigate('PostDetails', target.params);
  }
}

export const pushNotificationsService = new PushNotificationsService();
