import React, { useState } from 'react';
import { Sparkles, RefreshCw, AlertCircle, BrainCircuit } from 'lucide-react';
import { EmailDocument } from '../../types/email';
import { Badge } from '../common/Badge';
import { emailsApi } from '../../api/emails';

interface AiInsightCardProps {
  email: EmailDocument;
  onCategorized?: (updatedEmail: EmailDocument) => void;
}

export const AiInsightCard: React.FC<AiInsightCardProps> = ({ email, onCategorized }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReanalyze = async () => {
    setIsAnalyzing(true);
    setError(null);
    try {
      const res = await emailsApi.categorizeEmail(email.id);
      if (res && res.success) {
        onCategorized?.({
          ...email,
          category: res.category,
          categoryConfidence: res.confidence,
          confidence: res.confidence,
          categoryReasoning: res.reasoning,
          reasoning: res.reasoning,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Re-categorization failed';
      setError(msg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const confidencePct = email.confidence !== undefined ? Math.round(email.confidence * 100) : null;

  return (
    <div className="bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-white border border-blue-100/80 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-100 text-reachinbox-accent rounded-lg">
            <BrainCircuit className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wider">
              AI Categorization
            </h4>
            <span className="text-[11px] text-gray-500">Gemini LLM Intent Classifier</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleReanalyze}
          disabled={isAnalyzing}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-reachinbox-accent bg-white hover:bg-blue-50 border border-blue-200 rounded-lg transition-colors shadow-2xs disabled:opacity-50"
          title="Re-categorize with Gemini AI"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
          <span>{isAnalyzing ? 'Analyzing...' : 'Re-categorize'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div className="bg-white/80 border border-gray-150 rounded-lg p-2.5">
          <span className="text-[11px] text-gray-500 block mb-1">Detected Category</span>
          <Badge category={email.category} size="md" />
        </div>

        <div className="bg-white/80 border border-gray-150 rounded-lg p-2.5">
          <span className="text-[11px] text-gray-500 block mb-1">Confidence Score</span>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-reachinbox-accent h-full rounded-full transition-all duration-500"
                style={{ width: `${confidencePct ?? 0}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-gray-700">
              {confidencePct !== null ? `${confidencePct}%` : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {email.reasoning && (
        <div className="bg-white/90 border border-gray-150 rounded-lg p-2.5">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-700 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-reachinbox-accent" />
            <span>AI Reasoning</span>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed italic">
            "{email.reasoning}"
          </p>
        </div>
      )}

      {error && (
        <div className="mt-2.5 p-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-600">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
