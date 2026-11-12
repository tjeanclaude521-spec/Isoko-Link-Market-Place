import { WifiOff, X } from 'lucide-react';
import { useState } from 'react';
import { useOnlineStatus } from '@/lib/use-online-status';

// Shows a banner when the browser is offline. Communicates that cached
// listings may be stale and that any new action (payment, enquiry, edit)
// will NOT go through until the connection returns.
export function OfflineBanner() {
  const online = useOnlineStatus();
  const [dismissed, setDismissed] = useState(false);

  if (online || dismissed) return null;

  return (
    <div className="bg-amber-500 text-white text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between gap-3">
        <p className="flex items-center gap-2">
          <WifiOff className="h-4 w-4 flex-shrink-0" />
          <span>
            You are offline. Listings shown may be out of date. New enquiries, payments, and edits will not go through until you are back online.
          </span>
        </p>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 rounded hover:bg-amber-600 flex-shrink-0"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
