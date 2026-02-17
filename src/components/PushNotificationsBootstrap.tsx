import { useEffect } from 'react';
import { useAuth } from '@/store/AuthContext';
import { pushNotificationsService } from '@/services/pushNotifications';

export function PushNotificationsBootstrap() {
  const { user } = useAuth();

  useEffect(() => {
    pushNotificationsService.initialize();
  }, []);

  useEffect(() => {
    pushNotificationsService.syncUser(user?.id ?? null);
  }, [user?.id]);

  return null;
}

