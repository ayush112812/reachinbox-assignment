import React from 'react';
import { Database, Inbox, Radio, RefreshCw } from 'lucide-react';
import { ImapAccountStatus } from '../../types/account';

interface HeaderProps {
  accounts: ImapAccountStatus[];
  isRealtimeConnected: boolean;
  onRefresh: () => void;
  onOpenDevModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  accounts,
  isRealtimeConnected,
  onRefresh,
  onOpenDevModal
}) => {
  const idleAccounts = accounts.filter((a) => a.state === 'idle').length;

  return (
    <header className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-4 shrink-0 shadow-sm z-10">
      {/* Brand logo & title */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white shadow-sm">
          <Inbox className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-tight text-slate-900">ReachInbox</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider bg-brand-50 text-brand-700 px-1.5 py-0.5 rounded border border-brand-200/60">
              OneBox
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-normal">Real-Time Multi-Account IMAP & AI Hub</span>
        </div>
      </div>

      {/* Right controls: SSE indicator, IMAP IDLE status, Developer modal button */}
      <div className="flex items-center gap-3">
        {/* Real-time SSE indicator */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border font-medium transition-colors ${
            isRealtimeConnected
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}
          title={isRealtimeConnected ? 'Real-time EventSource connected' : 'Connecting to EventSource...'}
        >
          <Radio className={`w-3.5 h-3.5 ${isRealtimeConnected ? 'animate-pulse text-emerald-600' : 'text-amber-600'}`} />
          <span className="text-[11px]">
            {isRealtimeConnected ? 'Live SSE Active' : 'Connecting SSE...'}
          </span>
        </div>

        {/* IMAP IDLE indicator */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-50 text-slate-700 border border-slate-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-[11px]">
            {idleAccounts} / {accounts.length} Inboxes IDLE
          </span>
        </div>

        {/* Refresh button */}
        <button
          onClick={onRefresh}
          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
          title="Refresh emails & accounts"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {/* Knowledge & Dev Tools Button */}
        <button
          onClick={onOpenDevModal}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-brand-600 hover:bg-brand-50 border border-slate-200 hover:border-brand-200 rounded-md transition-all shadow-xs"
        >
          <Database className="w-3.5 h-3.5 text-brand-600" />
          <span>RAG Knowledge</span>
        </button>
      </div>
    </header>
  );
};
