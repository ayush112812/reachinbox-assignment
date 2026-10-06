import React from 'react';
import {
  Archive,
  CalendarCheck2,
  Folder,
  Inbox,
  Mail,
  RefreshCw,
  Send,
  ShieldAlert,
  Sparkles,
  Tag,
  UserX
} from 'lucide-react';
import { ImapAccountStatus } from '../../types/account';
import { EmailCategory } from '../../types/email';
import { ConnectionStatusBadge } from '../common/ConnectionStatusBadge';

interface SidebarProps {
  accounts: ImapAccountStatus[];
  selectedAccountId?: string;
  selectedFolder?: string;
  selectedCategory?: EmailCategory;
  syncingId?: string | null;
  onSelectAccount: (accountId?: string) => void;
  onSelectFolder: (folder?: string) => void;
  onSelectCategory: (category?: EmailCategory) => void;
  onTriggerSync: (accountId: string) => void;
}

const CATEGORIES: Array<{
  id: EmailCategory;
  label: string;
  icon: React.ReactNode;
  activeColor: string;
}> = [
  {
    id: 'Interested',
    label: 'Interested',
    icon: <Sparkles className="w-4 h-4 text-emerald-600" />,
    activeColor: 'bg-emerald-50 text-emerald-800 font-semibold'
  },
  {
    id: 'Meeting Booked',
    label: 'Meeting Booked',
    icon: <CalendarCheck2 className="w-4 h-4 text-purple-600" />,
    activeColor: 'bg-purple-50 text-purple-800 font-semibold'
  },
  {
    id: 'Not Interested',
    label: 'Not Interested',
    icon: <UserX className="w-4 h-4 text-slate-500" />,
    activeColor: 'bg-slate-100 text-slate-800 font-semibold'
  },
  {
    id: 'Spam',
    label: 'Spam',
    icon: <ShieldAlert className="w-4 h-4 text-rose-600" />,
    activeColor: 'bg-rose-50 text-rose-800 font-semibold'
  },
  {
    id: 'Out of Office',
    label: 'Out of Office',
    icon: <Send className="w-4 h-4 text-amber-600" />,
    activeColor: 'bg-amber-50 text-amber-800 font-semibold'
  },
  {
    id: 'Uncategorized',
    label: 'Uncategorized',
    icon: <Tag className="w-4 h-4 text-gray-400" />,
    activeColor: 'bg-gray-100 text-gray-800 font-semibold'
  }
];

export const Sidebar: React.FC<SidebarProps> = ({
  accounts,
  selectedAccountId,
  selectedFolder = 'INBOX',
  selectedCategory,
  syncingId,
  onSelectAccount,
  onSelectFolder,
  onSelectCategory,
  onTriggerSync
}) => {
  const totalEmailsCount = accounts.reduce((acc, a) => acc + (a.totalIndexed || 0), 0);

  return (
    <aside className="w-64 border-r border-slate-200 bg-white flex flex-col h-full shrink-0 select-none overflow-y-auto">
      {/* ACCOUNTS SECTION */}
      <div className="p-3 border-b border-slate-100">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1.5">
          Mailbox Inboxes
        </div>

        {/* All Inboxes Button */}
        <button
          onClick={() => onSelectAccount(undefined)}
          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-xs transition-colors ${
            !selectedAccountId
              ? 'bg-brand-50 text-brand-700 font-semibold shadow-xs'
              : 'text-slate-700 hover:bg-slate-50 font-medium'
          }`}
        >
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-brand-600" />
            <span>All Accounts</span>
          </div>
          <span className="text-[11px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full font-mono">
            {totalEmailsCount}
          </span>
        </button>

        {/* Individual IMAP Accounts */}
        <div className="mt-1 space-y-0.5">
          {accounts.map((acc) => {
            const isSelected = selectedAccountId === acc.id;
            const isSyncing = syncingId === acc.id || acc.state === 'syncing';

            return (
              <div
                key={acc.id}
                className={`group flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                  isSelected
                    ? 'bg-brand-50 text-brand-700 font-semibold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <button
                  onClick={() => onSelectAccount(acc.id)}
                  className="flex-1 flex flex-col text-left overflow-hidden mr-2"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <ConnectionStatusBadge state={acc.state} showText={false} />
                    <span className="truncate font-medium">{acc.id}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 truncate pl-3.5">
                    {acc.user}
                  </span>
                </button>

                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[10px] bg-slate-100 text-slate-500 px-1 rounded font-mono">
                    {acc.totalIndexed}
                  </span>
                  <button
                    onClick={() => onTriggerSync(acc.id)}
                    disabled={isSyncing}
                    title="Trigger historical 30-day IMAP sync"
                    className="p-1 text-slate-400 hover:text-brand-600 rounded transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-brand-600' : ''}`} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FOLDERS SECTION */}
      <div className="p-3 border-b border-slate-100">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1.5">
          Folders
        </div>
        <div className="space-y-0.5">
          <button
            onClick={() => onSelectFolder('INBOX')}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors ${
              selectedFolder === 'INBOX'
                ? 'bg-slate-100 text-slate-900 font-semibold'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Inbox className="w-4 h-4 text-slate-500" />
            <span>INBOX</span>
          </button>
          <button
            onClick={() => onSelectFolder('Archive')}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors ${
              selectedFolder === 'Archive'
                ? 'bg-slate-100 text-slate-900 font-semibold'
                : 'text-slate-400 hover:bg-slate-50'
            }`}
          >
            <Archive className="w-4 h-4 text-slate-400" />
            <span>Archive</span>
          </button>
        </div>
      </div>

      {/* AI CATEGORIES SECTION */}
      <div className="p-3 flex-1">
        <div className="flex items-center justify-between px-2 mb-1.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            AI Categories
          </span>
          {selectedCategory && (
            <button
              onClick={() => onSelectCategory(undefined)}
              className="text-[10px] text-brand-600 hover:underline"
            >
              Clear
            </button>
          )}
        </div>

        <div className="space-y-0.5">
          {/* All Categories Option */}
          <button
            onClick={() => onSelectCategory(undefined)}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors ${
              !selectedCategory
                ? 'bg-slate-100 text-slate-900 font-semibold'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Folder className="w-4 h-4 text-slate-400" />
            <span>All Categories</span>
          </button>

          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                  isSelected ? cat.activeColor : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {cat.icon}
                <span className="truncate">{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* FOOTER INFO */}
      <div className="p-3 bg-slate-50 border-t border-slate-200/80 text-[11px] text-slate-500">
        <div className="flex items-center justify-between">
          <span>Active Inboxes:</span>
          <span className="font-semibold text-slate-700">{accounts.length} Accounts</span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span>Sync Protocol:</span>
          <span className="text-emerald-700 font-medium">IMAP IDLE (RFC 2177)</span>
        </div>
      </div>
    </aside>
  );
};
