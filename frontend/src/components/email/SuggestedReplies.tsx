import React, { useState } from 'react';
import { Sparkles, Copy, Check, Bot, AlertCircle, RefreshCw } from 'lucide-react';
import { RagReplyResponse } from '../../types/rag';
import { emailsApi } from '../../api/emails';
import { KnowledgeSources } from './KnowledgeSources';

interface SuggestedRepliesProps {
  emailId: string;
}

export const SuggestedReplies: React.FC<SuggestedRepliesProps> = ({ emailId }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [ragData, setRagData] = useState<RagReplyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedType, setCopiedType] = useState<'concise' | 'detailed' | null>(null);
  const [activeTab, setActiveTab] = useState<'concise' | 'detailed'>('concise');

  const handleGenerateReply = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await emailsApi.suggestReply(emailId);
      if (res) {
        setRagData(res);
      } else {
        throw new Error('No reply data returned from server');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate RAG suggested reply';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const getReplyText = (style: 'concise' | 'detailed'): string => {
    if (!ragData) return '';

    // Handle replies as array of { style, text }
    if (ragData.replies && Array.isArray(ragData.replies)) {
      const match = ragData.replies.find(
        (r) => r.style.toLowerCase() === style.toLowerCase()
      );
      if (match) return match.text;
      if (style === 'concise' && ragData.replies[0]) return ragData.replies[0].text;
      if (style === 'detailed' && ragData.replies[1]) return ragData.replies[1].text;
    }

    // Handle suggestedReplies object { concise, detailed }
    if (ragData.suggestedReplies) {
      return style === 'concise'
        ? ragData.suggestedReplies.concise
        : ragData.suggestedReplies.detailed;
    }

    return '';
  };

  const handleCopy = async (type: 'concise' | 'detailed') => {
    const text = getReplyText(type);
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2000);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2000);
    }
  };

  const activeReplyText = getReplyText(activeTab);

  return (
    <div className="border border-purple-100 bg-gradient-to-b from-purple-50/50 via-white to-white rounded-xl p-4 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-purple-100 text-purple-700 rounded-lg">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wider">
              RAG AI Suggested Replies
            </h4>
            <span className="text-[11px] text-gray-500">
              Elasticsearch kNN Vector Search + Gemini LLM
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGenerateReply}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-xs transition-colors disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Retrieving & Generating...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              <span>{ragData ? 'Regenerate Reply' : 'Generate Suggested Reply'}</span>
            </>
          )}
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium">Failed to generate reply</p>
            <p className="text-[11px] text-red-600 mt-0.5">{error}</p>
          </div>
          <button
            type="button"
            onClick={handleGenerateReply}
            className="text-xs text-red-700 font-semibold underline hover:no-underline ml-2"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && !ragData && (
        <div className="p-4 border border-purple-100 rounded-lg bg-white/70 animate-pulse space-y-3">
          <div className="flex gap-2">
            <div className="h-7 bg-purple-100 rounded w-24" />
            <div className="h-7 bg-purple-100 rounded w-24" />
          </div>
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-3 bg-gray-150 rounded w-full" />
          <div className="h-3 bg-gray-150 rounded w-5/6" />
          <div className="h-3 bg-gray-150 rounded w-2/3" />
        </div>
      )}

      {/* Generated Replies Content */}
      {ragData && (
        <div className="space-y-3.5">
          {/* Tabs for Concise vs Detailed */}
          <div className="flex items-center justify-between border-b border-gray-200">
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('concise')}
                className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${
                  activeTab === 'concise'
                    ? 'border-purple-600 text-purple-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Concise Reply
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('detailed')}
                className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${
                  activeTab === 'detailed'
                    ? 'border-purple-600 text-purple-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Detailed Reply
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleCopy(activeTab)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              title="Copy response to clipboard"
            >
              {copiedType === activeTab ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-semibold">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-gray-500" />
                  <span>Copy {activeTab === 'concise' ? 'Concise' : 'Detailed'}</span>
                </>
              )}
            </button>
          </div>

          {/* Active Reply Card */}
          <div className="p-3.5 bg-white border border-gray-200 rounded-lg shadow-2xs">
            <p className="text-xs text-gray-800 leading-relaxed whitespace-pre-wrap select-text font-sans">
              {activeReplyText || '(No reply generated for this option)'}
            </p>
          </div>

          {/* Transparent Knowledge Base Sources */}
          <KnowledgeSources sources={ragData.retrievedSources} />
        </div>
      )}

      {/* Initial state placeholder before generation */}
      {!isLoading && !ragData && !error && (
        <div className="p-4 bg-purple-50/40 border border-purple-100/60 rounded-lg text-center">
          <p className="text-xs text-purple-900 font-medium">
            Draft an instant reply grounded in the ReachInbox product knowledge base
          </p>
          <p className="text-[11px] text-purple-600/80 mt-1">
            Elasticsearch kNN will locate matching context chunks, and Gemini will synthesize personalized concise and detailed reply options.
          </p>
        </div>
      )}
    </div>
  );
};
