import React from 'react';
import { AccountConnectionState } from '../../types/account';

interface ConnectionStatusBadgeProps {
  state: AccountConnectionState;
  showText?: boolean;
}

export const ConnectionStatusBadge: React.FC<ConnectionStatusBadgeProps> = ({ state, showText = true }) => {
  const isIdle = state === 'idle';
  const isSyncing = state === 'syncing';
  const isConnected = state === 'connected';
  const isError = state === 'error' || state === 'disconnected';

  let colorClasses = 'bg-slate-400';
  let text = 'Offline';

  if (isIdle) {
    colorClasses = 'bg-emerald-500';
    text = 'IDLE (Real-time)';
  } else if (isSyncing) {
    colorClasses = 'bg-blue-500 animate-pulse';
    text = 'Syncing...';
  } else if (isConnected) {
    colorClasses = 'bg-teal-500';
    text = 'Connected';
  } else if (isError) {
    colorClasses = 'bg-rose-500';
    text = 'Error';
  }

  return (
    <div className="inline-flex items-center gap-1.5 text-xs text-slate-600">
      <span className="relative flex h-2 w-2">
        {isIdle && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${colorClasses}`}></span>
      </span>
      {showText && <span className="font-medium text-[11px] capitalize">{text}</span>}
    </div>
  );
};
