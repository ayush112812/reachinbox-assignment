import { useCallback, useEffect, useState } from 'react';
import { accountsApi } from '../api/accounts';
import { ImapAccountStatus } from '../types/account';

export function useAccounts() {
  const [accounts, setAccounts] = useState<ImapAccountStatus[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await accountsApi.getAccounts();
      if (res.success && res.data) {
        setAccounts(res.data);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load accounts';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const triggerSync = async (accountId: string, daysBack: number = 30) => {
    try {
      setSyncingId(accountId);
      await accountsApi.triggerSync(accountId, daysBack);
      await fetchAccounts();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sync trigger failed';
      setError(msg);
    } finally {
      setSyncingId(null);
    }
  };

  return {
    accounts,
    loading,
    error,
    syncingId,
    refreshAccounts: fetchAccounts,
    triggerSync
  };
}
