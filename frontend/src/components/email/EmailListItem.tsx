import React from 'react';
import DOMPurify from 'dompurify';
import { EmailDocument } from '../../types/email';
import { Badge } from '../common/Badge';

interface EmailListItemProps {
  email: EmailDocument;
  isSelected: boolean;
  onSelect: (email: EmailDocument) => void;
  showAccountBadge?: boolean;
}

export const EmailListItem: React.FC<EmailListItemProps> = ({
  email,
  isSelected,
  onSelect,
  showAccountBadge = false,
}) => {
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const isToday = date.toDateString() === now.toDateString();
      if (isToday) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Render highlighted subject or regular subject safely
  const renderSubject = () => {
    if (email.highlight?.subject && email.highlight.subject.length > 0) {
      const cleanHtml = DOMPurify.sanitize(email.highlight.subject[0]);
      return (
        <span
          className="search-highlight font-medium text-gray-900 line-clamp-1"
          dangerouslySetInnerHTML={{ __html: cleanHtml }}
        />
      );
    }
    return <span className="font-medium text-gray-900 line-clamp-1">{email.subject || '(No Subject)'}</span>;
  };

  // Render highlighted snippet or regular snippet
  const renderSnippet = () => {
    if (email.highlight?.bodyText && email.highlight.bodyText.length > 0) {
      const cleanHtml = DOMPurify.sanitize(email.highlight.bodyText[0]);
      return (
        <span
          className="search-highlight text-xs text-gray-600 line-clamp-2 mt-0.5 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: cleanHtml }}
        />
      );
    }
    const snippet = email.snippet || email.bodyText?.slice(0, 120) || '(No preview available)';
    return <span className="text-xs text-gray-500 line-clamp-2 mt-0.5 leading-relaxed">{snippet}</span>;
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(email)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(email);
        }
      }}
      className={`p-3.5 border-b border-gray-150 cursor-pointer transition-all duration-150 text-left select-none relative focus:outline-none focus:bg-blue-50/50 ${
        isSelected
          ? 'bg-blue-50/80 border-l-4 border-l-reachinbox-accent shadow-sm'
          : 'hover:bg-gray-50/80 border-l-4 border-l-transparent bg-white'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-semibold text-xs text-gray-900 truncate">
            {email.from.name || email.from.address}
          </span>
          {showAccountBadge && (
            <span className="text-[10px] px-1.5 py-0.2 bg-gray-100 text-gray-500 rounded font-mono truncate max-w-[80px]">
              {email.accountId}
            </span>
          )}
        </div>
        <span className="text-[11px] text-gray-400 whitespace-nowrap flex-shrink-0">
          {formatDate(email.date)}
        </span>
      </div>

      <div className="mb-1">{renderSubject()}</div>

      <div>{renderSnippet()}</div>

      <div className="mt-2.5 flex items-center justify-between">
        <Badge category={email.category} />
        {email.confidence !== undefined && email.confidence > 0 && (
          <span className="text-[10px] text-gray-400 font-medium">
            {Math.round(email.confidence * 100)}% conf
          </span>
        )}
      </div>
    </div>
  );
};
