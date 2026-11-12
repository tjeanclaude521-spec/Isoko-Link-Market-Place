import { useEffect, useState } from 'react';

// Tracks whether the browser is currently offline. Used to show a banner
// warning users that listings may be stale and that new actions will fail
// until connectivity returns. We never pretend an offline write succeeded.
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return online;
}
