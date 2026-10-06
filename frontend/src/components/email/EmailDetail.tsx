import React, { useEffect, useState } from 'react';
import DOMPurify from 'dompurify';
import { Mail, Clock, Folder, User, Users, AtSign, Loader2, AlertCircle } from 'lucide-react';
import { EmailDocument } from '../../types/email';
import { emailsApi } from '../../api/emails';
import { AiInsightCard } from './AiInsightCard';
import { SuggestedReplies } from './SuggestedReplies';

interface EmailDetailProps {
  emailId: string | null;
  initialEmail?: EmailDocument | null;
  onEmailUpdated?: (email: EmailDocument) => void;
}

export const EmailDetail: React.FC<EmailDetailProps> = ({
  emailId,
  initialEmail,
  onEmailUpdated,
}) => {
  const [email, setEmail] = useState<EmailDocument | null>(initialEmail || null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!emailId) {
      setEmail(null);
      return;
    }

    // If initialEmail matches the selected id, use it immediately
    if (initialEmail && initialEmail.id === emailId) {
      setEmail(initialEmail);
    }

    let isMounted = true;
    const fetchEmailDetail = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await emailsApi.getEmailById(emailId);
        if (isMounted && res.data) {
          setEmail(res.data);
          onEmailUpdated?.(res.data);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : 'Failed to fetch email details';
          setError(msg);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchEmailDetail();

    return () => {
      isMounted = false;
    };
  }, [emailId]);

  if (!emailId) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-gray-50/50">
        <div className="w-16 h-16 bg-blue-50 text-reachinbox-accent rounded-2xl flex items-center justify-center mb-4 shadow-xs">
          <Mail className="w-8 h-8" />
        </div>
        <h3 className="text-base font-semibold text-gray-800 mb-1.5">No email selected</h3>
        <p className="text-xs text-gray-500 max-w-sm leading-relaxed">
          Select an email from the inbox list to read the full conversation, view Gemini AI
          categorization, and generate vector RAG suggested replies.
        </p>
      </div>
    );
  }

  if (isLoading && !email) {
    return (
      <div className="h-full flex items-center justify-center p-8 bg-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-reachinbox-accent" />
          <span className="text-xs text-gray-500 font-medium">Loading email details...</span>
        </div>
      </div>
    );
  }

  if (error && !email) {
    return (
      <div className="h-full flex items-center justify-center p-8 bg-white">
        <div className="max-w-md p-6 bg-red-50 border border-red-200 rounded-xl text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <h4 className="text-sm font-semibold text-gray-900 mb-1">Failed to load email</h4>
          <p className="text-xs text-red-600 mb-3">{error}</p>
        </div>
      </div>
    );
  }

  if (!email) return null;

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString(undefined, {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const handleCategorized = (updated: EmailDocument) => {
    setEmail(updated);
    onEmailUpdated?.(updated);
  };

  // Safely render HTML or fall back to plain text
  const renderBody = () => {
    if (email.bodyHtml && email.bodyHtml.trim().length > 0) {
      const cleanHtml = DOMPurify.sanitize(email.bodyHtml, {
        USE_PROFILES: { html: true },
        ADD_ATTR: ['target'],
      });
      return (
        <div
          className="prose prose-sm max-w-none text-gray-800 leading-relaxed overflow-x-auto"
          dangerouslySetInnerHTML={{ __html: cleanHtml }}
        />
      );
    }

    return (
      <div className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">
        {email.bodyText || '(This email has no body content)'}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-white overflow-y-auto">
      {/* Top Header Information */}
      <div className="p-6 border-b border-gray-200 bg-white space-y-4">
        {/* Subject & Meta badges */}
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-1.5">
            <span className="flex items-center gap-1 font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
              <AtSign className="w-3 h-3 text-gray-400" />
              {email.accountId}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 text-gray-500">
              <Folder className="w-3 h-3 text-gray-400" />
              {email.folder}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 text-gray-500">
              <Clock className="w-3 h-3 text-gray-400" />
              {formatDate(email.date)}
            </span>
          </div>

          <h1 className="text-lg font-bold text-gray-900 leading-snug">
            {email.subject || '(No Subject)'}
          </h1>
        </div>

        {/* Sender & Recipients */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2 border-t border-gray-100 text-xs">
          <div className="flex items-start gap-2">
            <User className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <span className="text-gray-500 mr-1.5 font-medium">From:</span>
              <span className="font-semibold text-gray-900">{email.from.name || email.from.address}</span>
              {email.from.name && (
                <span className="text-gray-400 font-mono ml-1.5">
                  &lt;{email.from.address}&gt;
                </span>
              )}
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Users className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <span className="text-gray-500 mr-1.5 font-medium">To:</span>
              <span className="text-gray-800">
                {email.to?.map((t) => t.name || t.address).join(', ') || 'Undisclosed recipients'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Body & Intelligence Area */}
      <div className="p-6 space-y-6 flex-1">
        {/* AI Insight Card */}
        <AiInsightCard email={email} onCategorized={handleCategorized} />

        {/* Email Body Content */}
        <div className="bg-white border border-gray-150 rounded-xl p-6 shadow-2xs min-h-[160px]">
          {renderBody()}
        </div>

        {/* RAG Suggested Replies Section */}
        <SuggestedReplies emailId={email.id} />
      </div>
    </div>
  );
};
