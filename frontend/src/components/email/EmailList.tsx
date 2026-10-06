import React from 'react';
import { Mail, RefreshCw, ChevronLeft, ChevronRight, AlertCircle, SearchX } from 'lucide-react';
import { EmailDocument } from '../../types/email';
import { EmailListItem } from './EmailListItem';
import { SearchBar } from './SearchBar';

interface EmailListProps {
  emails: EmailDocument[];
  selectedEmailId: string | null;
  onSelectEmail: (email: EmailDocument) => void;
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (newPage: number) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  isSearching: boolean;
  selectedAccount: string;
  selectedCategory: string;
  selectedFolder: string;
}

export const EmailList: React.FC<EmailListProps> = ({
  emails,
  selectedEmailId,
  onSelectEmail,
  isLoading,
  error,
  onRefresh,
  page,
  totalPages,
  total,
  onPageChange,
  searchQuery,
  onSearchChange,
  isSearching,
  selectedAccount,
  selectedCategory,
  selectedFolder,
}) => {
  // Compute active filters title
  const getFilterSummary = () => {
    const parts: string[] = [];
    if (selectedAccount !== 'all') {
      parts.push(`Account: ${selectedAccount}`);
    }
    if (selectedCategory !== 'all') {
      parts.push(`Category: ${selectedCategory}`);
    }
    if (selectedFolder !== 'INBOX') {
      parts.push(`Folder: ${selectedFolder}`);
    }
    return parts.length > 0 ? parts.join(' • ') : 'All Messages';
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Top Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-gray-900 truncate flex items-center gap-2">
            <Mail className="w-4 h-4 text-reachinbox-accent" />
            <span>{selectedCategory !== 'all' ? selectedCategory : selectedFolder}</span>
            <span className="text-xs font-normal text-gray-500">
              ({total} {total === 1 ? 'email' : 'emails'})
            </span>
          </h2>
          <p className="text-[11px] text-gray-500 truncate mt-0.5">{getFilterSummary()}</p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
          title="Refresh emails"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-reachinbox-accent' : ''}`} />
        </button>
      </div>

      {/* Elasticsearch Search Bar */}
      <SearchBar
        value={searchQuery}
        onChange={onSearchChange}
        isLoading={isSearching && isLoading}
        totalResults={total}
        isSearching={isSearching}
      />

      {/* Email List Content Area */}
      <div className="flex-1 overflow-y-auto">
        {/* Loading Skeletons */}
        {isLoading && emails.length === 0 && (
          <div className="p-3 space-y-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="p-3 border border-gray-100 rounded-lg animate-pulse bg-white space-y-2.5"
              >
                <div className="flex justify-between items-center">
                  <div className="h-3.5 bg-gray-200 rounded w-28" />
                  <div className="h-3 bg-gray-150 rounded w-12" />
                </div>
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-150 rounded w-full" />
                <div className="h-3 bg-gray-150 rounded w-4/5" />
                <div className="flex justify-between items-center pt-1">
                  <div className="h-5 bg-gray-200 rounded-full w-20" />
                  <div className="h-3 bg-gray-150 rounded w-10" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="p-8 text-center flex flex-col items-center justify-center h-full">
            <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Failed to load emails</h3>
            <p className="text-xs text-gray-500 max-w-xs mb-4">{error}</p>
            <button
              type="button"
              onClick={onRefresh}
              className="px-3.5 py-1.5 text-xs font-medium text-white bg-reachinbox-accent hover:bg-reachinbox-accentHover rounded-md shadow-sm transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && emails.length === 0 && (
          <div className="p-8 text-center flex flex-col items-center justify-center h-full text-gray-400">
            {isSearching ? (
              <>
                <div className="w-12 h-12 bg-blue-50 text-reachinbox-accent rounded-full flex items-center justify-center mb-3">
                  <SearchX className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-semibold text-gray-800 mb-1">No matching emails found</h3>
                <p className="text-xs text-gray-500 max-w-xs mb-3">
                  No emails in Elasticsearch match "{searchQuery}" with the current filters.
                </p>
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="text-xs text-reachinbox-accent hover:underline font-medium"
                >
                  Clear search query
                </button>
              </>
            ) : (
              <>
                <div className="w-12 h-12 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mb-3">
                  <Mail className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-semibold text-gray-800 mb-1">Inbox is empty</h3>
                <p className="text-xs text-gray-500 max-w-xs">
                  No emails match the selected filters. Use IMAP sync or adjust your category filter.
                </p>
              </>
            )}
          </div>
        )}

        {/* Email Cards */}
        {!error && emails.length > 0 && (
          <div className="divide-y divide-gray-100">
            {emails.map((email) => (
              <EmailListItem
                key={email.id}
                email={email}
                isSelected={email.id === selectedEmailId}
                onSelect={onSelectEmail}
                showAccountBadge={selectedAccount === 'all'}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="px-4 py-2.5 border-t border-gray-200 bg-gray-50/50 flex items-center justify-between text-xs text-gray-600">
          <span>
            Page <span className="font-semibold">{page}</span> of{' '}
            <span className="font-semibold">{totalPages}</span>
          </span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1 || isLoading}
              className="p-1 rounded border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages || isLoading}
              className="p-1 rounded border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
