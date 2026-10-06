import { useEffect, useState } from 'react';
import { realtimeEventClient } from '../api/events';

export interface ToastMessage {
  id: string;
  title: string;
  description: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export function useRealtimeEvents(onRefreshNeeded?: () => void) {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (toast: Omit<ToastMessage, 'id'>) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { ...toast, id }]);

    setTimeout(() => {
      removeToast(id);
    }, 6000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    realtimeEventClient.connect();

    const unsubConnection = realtimeEventClient.on('connection', (data) => {
      setIsConnected(Boolean(data.connected));
    });

    const unsubNewEmail = realtimeEventClient.on('email:new', (payload) => {
      const email = payload.email;
      const isRealtime = payload.isRealtime;

      addToast({
        title: isRealtime ? '⚡ New Real-Time Email' : '📥 Email Synced',
        description: `From: ${email.from.name || email.from.address} - "${email.subject || 'No Subject'}"`,
        type: email.category === 'Interested' ? 'success' : 'info'
      });

      if (onRefreshNeeded) {
        onRefreshNeeded();
      }
    });

    const unsubCategorized = realtimeEventClient.on('email:categorized', (payload) => {
      const data = payload.data || payload;
      if (data.category === 'Interested') {
        addToast({
          title: '🔥 Lead Categorized: Interested',
          description: `Email classified as Interested (${Math.round((data.confidence || 0) * 100)}% confidence).`,
          type: 'success'
        });
      }

      if (onRefreshNeeded) {
        onRefreshNeeded();
      }
    });

    const unsubSynced = realtimeEventClient.on('email:synced', (data) => {
      addToast({
        title: '✅ Historical Sync Completed',
        description: `Account '${data.accountId}' synchronized ${data.count} emails.`,
        type: 'info'
      });

      if (onRefreshNeeded) {
        onRefreshNeeded();
      }
    });

    return () => {
      unsubConnection();
      unsubNewEmail();
      unsubCategorized();
      unsubSynced();
      realtimeEventClient.disconnect();
    };
  }, [onRefreshNeeded]);

  return {
    isConnected,
    toasts,
    removeToast,
    addToast
  };
}
