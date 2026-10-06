import { useCallback, useEffect, useState } from 'react';
import { emailsApi } from '../api/emails';
import { EmailCategory, EmailItem, EmailListPagination } from '../types/email';

export function useEmails(initialFilters: {
  accountId?: string;
  folder?: string;
  category?: EmailCategory;
  page?: number;
} = {}) {
  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [categorizing, setCategorizing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [accountId, setAccountId] = useState<string | undefined>(initialFilters.accountId);
  const [folder, setFolder] = useState<string | undefined>(initialFilters.folder);
  const [category, setCategory] = useState<EmailCategory | undefined>(initialFilters.category);
  const [page, setPage] = useState<number>(initialFilters.page || 1);
  const [limit] = useState<number>(20);

  const [pagination, setPagination] = useState<EmailListPagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1
  });

  const fetchEmails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await emailsApi.getEmails({
        page,
        limit,
        accountId,
        folder,
        category
      });

      if (res.success) {
        setEmails(res.data);
        setPagination(res.pagination);

        // Auto-select first email if none selected or current selection is not in list
        if (res.data.length > 0 && !selectedEmail) {
          fetchEmailDetail(res.data[0].id);
        } else if (res.data.length === 0) {
          setSelectedEmail(null);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch emails';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [page, limit, accountId, folder, category]);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  const fetchEmailDetail = async (id: string) => {
    try {
      setDetailLoading(true);
      const res = await emailsApi.getEmailById(id);
      if (res.success && res.data) {
        setSelectedEmail(res.data);
      }
    } catch (err) {
      console.error('Failed to load email detail:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const selectEmail = (id: string) => {
    fetchEmailDetail(id);
  };

  const recategorizeSelected = async () => {
    if (!selectedEmail) return;
    try {
      setCategorizing(true);
      const res = await emailsApi.categorizeEmail(selectedEmail.id);
      if (res.success) {
        setSelectedEmail((prev) =>
          prev
            ? {
                ...prev,
                category: res.category,
                categoryConfidence: res.confidence,
                categoryReasoning: res.reasoning
              }
            : null
        );

        // Also update in list
        setEmails((prev) =>
          prev.map((item) =>
            item.id === selectedEmail.id
              ? {
                  ...item,
                  category: res.category,
                  categoryConfidence: res.confidence,
                  categoryReasoning: res.reasoning
                }
              : item
          )
        );
      }
    } catch (err) {
      console.error('Failed to re-categorize email:', err);
    } finally {
      setCategorizing(false);
    }
  };

  return {
    emails,
    selectedEmail,
    loading,
    detailLoading,
    categorizing,
    error,
    pagination,
    accountId,
    folder,
    category,
    page,
    setAccountId: (acc?: string) => {
      setAccountId(acc);
      setPage(1);
    },
    setFolder: (f?: string) => {
      setFolder(f);
      setPage(1);
    },
    setCategory: (cat?: EmailCategory) => {
      setCategory(cat);
      setPage(1);
    },
    setPage,
    selectEmail,
    recategorizeSelected,
    refreshEmails: fetchEmails
  };
}
