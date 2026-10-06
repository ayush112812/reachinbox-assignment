import React, { useEffect, useState } from 'react';
import {
  Database,
  Layers,
  Play,
  RefreshCw,
  Send,
  X
} from 'lucide-react';
import { knowledgeApi } from '../../api/knowledge';
import { KnowledgeStatsResponse } from '../../types/rag';

interface DeveloperModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeveloperModal: React.FC<DeveloperModalProps> = ({ isOpen, onClose }) => {
  const [stats, setStats] = useState<KnowledgeStatsResponse | null>(null);
  const [loadingStats, setLoadingStats] = useState<boolean>(false);
  const [seeding, setSeeding] = useState<boolean>(false);
  const [seedResult, setSeedResult] = useState<string | null>(null);

  const [testingWebhook, setTestingWebhook] = useState<boolean>(false);
  const [webhookResult, setWebhookResult] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchStats();
      setSeedResult(null);
      setWebhookResult(null);
    }
  }, [isOpen]);

  const fetchStats = async () => {
    try {
      setLoadingStats(true);
      const res = await knowledgeApi.getKnowledgeStats();
      if (res.success) {
        setStats(res);
      }
    } catch (err) {
      console.error('Failed to load knowledge stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleSeed = async () => {
    try {
      setSeeding(true);
      setSeedResult(null);
      const res = await knowledgeApi.seedKnowledge();
      if (res.success) {
        setSeedResult(`✅ Successfully indexed ${res.chunksIndexed} vector chunks into '${res.indexName}'!`);
        await fetchStats();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Seeding failed';
      setSeedResult(`❌ Error: ${msg}`);
    } finally {
      setSeeding(false);
    }
  };

  const handleTestWebhook = async () => {
    try {
      setTestingWebhook(true);
      setWebhookResult(null);
      const res = await knowledgeApi.triggerTestWebhook({
        subject: 'Demo Inbound Inquiry - ReachInbox Test',
        from: { name: 'Demo Lead', address: 'lead@acmecorp.com' },
        snippet: 'We would love to schedule a demo to see ReachInbox in action.',
        category: 'Interested',
        confidence: 0.98,
        reasoning: 'Explicit request for a demo meeting.'
      });
      if (res.success) {
        setWebhookResult('✅ Test notifications dispatched to configured Slack & Webhook endpoints!');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Webhook test failed';
      setWebhookResult(`❌ Error: ${msg}`);
    } finally {
      setTestingWebhook(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center text-brand-700">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-900">RAG Knowledge Base & Developer Panel</h3>
              <p className="text-xs text-slate-500">Inspect vector database & trigger test dispatches</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 text-xs text-slate-600">
          {/* Section 1: Vector Index Status */}
          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-brand-600" />
                Elasticsearch Vector Store
              </span>
              <button
                onClick={fetchStats}
                disabled={loadingStats}
                className="text-brand-600 hover:text-brand-700 flex items-center gap-1 font-medium"
              >
                <RefreshCw className={`w-3 h-3 ${loadingStats ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-slate-700 pt-1">
              <div className="p-2 bg-white rounded border border-slate-200/80">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Index Name</span>
                <span className="font-mono text-xs text-slate-900 font-medium">
                  {stats?.indexName || 'reachinbox-knowledge'}
                </span>
              </div>
              <div className="p-2 bg-white rounded border border-slate-200/80">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Stored Chunks</span>
                <span className="font-mono text-xs text-slate-900 font-bold">
                  {stats?.chunkCount !== undefined ? `${stats.chunkCount} vectors` : 'Checking...'}
                </span>
              </div>
              <div className="p-2 bg-white rounded border border-slate-200/80">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Embedding Model</span>
                <span className="font-mono text-xs text-slate-900">
                  {stats?.embeddingModel || 'gemini-embedding-001'}
                </span>
              </div>
              <div className="p-2 bg-white rounded border border-slate-200/80">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Vector Dimension</span>
                <span className="font-mono text-xs text-slate-900 font-semibold">
                  {stats?.vectorDimension || 768} dims
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Action Buttons */}
          <div className="space-y-3">
            <div>
              <h4 className="font-semibold text-slate-800 mb-1">Knowledge Base Seeding</h4>
              <p className="text-slate-500 mb-2">
                Reads 8 documents (22 chunks) from disk, generates 768-dim embeddings, and idempotently upserts them into Elasticsearch.
              </p>
              <button
                onClick={handleSeed}
                disabled={seeding}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium shadow-xs transition-colors disabled:opacity-50"
              >
                {seeding ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Generating Embeddings & Seeding...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Seed Knowledge Base (POST /api/knowledge/seed)</span>
                  </>
                )}
              </button>
              {seedResult && (
                <div className="mt-2 p-2 bg-slate-100 rounded text-[11px] font-mono break-all text-slate-800">
                  {seedResult}
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100">
              <h4 className="font-semibold text-slate-800 mb-1">Simulate Notifications (Slack & Webhook)</h4>
              <p className="text-slate-500 mb-2">
                Triggers an Interested lead event payload to test your Slack Incoming Webhook and Webhook.site URLs.
              </p>
              <button
                onClick={handleTestWebhook}
                disabled={testingWebhook}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-medium border border-slate-200 transition-colors disabled:opacity-50"
              >
                {testingWebhook ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Posting to Webhooks...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Trigger Test Notification (POST /api/test/webhook)</span>
                  </>
                )}
              </button>
              {webhookResult && (
                <div className="mt-2 p-2 bg-slate-100 rounded text-[11px] font-mono break-all text-slate-800">
                  {webhookResult}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 rounded-md transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
