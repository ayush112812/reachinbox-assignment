import React, { useState } from 'react';
import { Database, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { RetrievedSource } from '../../types/rag';

interface KnowledgeSourcesProps {
  sources: RetrievedSource[];
}

export const KnowledgeSources: React.FC<KnowledgeSourcesProps> = ({ sources }) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (!sources || sources.length === 0) {
    return (
      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-500 italic">
        No specific knowledge base sources were retrieved for this reply.
      </div>
    );
  }

  const toggleExpand = (idx: number) => {
    setExpandedIndex(expandedIndex === idx ? null : idx);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
        <Database className="w-3.5 h-3.5 text-reachinbox-accent" />
        <span>Retrieved Vector Knowledge Sources ({sources.length})</span>
      </div>

      <div className="space-y-1.5">
        {sources.map((src, idx) => {
          const isExpanded = expandedIndex === idx;
          const scoreDisplay =
            src.score !== undefined
              ? `${Math.round(src.score * 100)}% match`
              : undefined;

          return (
            <div
              key={src.id || idx}
              className="border border-gray-200 rounded-lg bg-gray-50/70 overflow-hidden text-xs transition-colors hover:border-gray-300"
            >
              <button
                type="button"
                onClick={() => toggleExpand(idx)}
                className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-gray-100/50 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-semibold text-gray-800 truncate">
                    {src.title || `Source Document #${idx + 1}`}
                  </span>
                  {src.category && (
                    <span className="text-[10px] px-1.5 py-0.2 bg-blue-100/80 text-blue-700 rounded font-medium">
                      {src.category}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {scoreDisplay && (
                    <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      {scoreDisplay}
                    </span>
                  )}
                  {isExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="px-3 pb-2.5 pt-1 border-t border-gray-150 bg-white text-gray-600 leading-relaxed text-[11px]">
                  <p className="whitespace-pre-wrap">{src.content}</p>
                  {src.metadata && Object.keys(src.metadata).length > 0 && (
                    <div className="mt-2 pt-1.5 border-t border-gray-100 text-[10px] text-gray-400 flex items-center gap-2">
                      <ExternalLink className="w-3 h-3" />
                      <span>Doc ID: {src.id}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
