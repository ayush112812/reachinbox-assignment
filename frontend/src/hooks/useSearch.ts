import { useEffect, useState } from 'react';
import { emailsApi } from '../api/emails';
import { EmailCategory, EmailItem, EmailListPagination } from '../types/email';

export function useSearch(filters: {
  accountId?: string;
  folder?: string;
  category?: EmailCategory;
}) {
  const [query, setQuery] = useState<string>('');
  const [debouncedQuery, setDebouncedQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<EmailItem[]>([]);
  const [searchLoading, setSearchLoading] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [pagination, setPagination] = useState<EmailListPagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1
  });

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query.trim());
      setPage(1);
    }, 300);

    return () => clearTimeout(handler);
  }, [query]);

  // Execute Elasticsearch search when debounced query or filters change
  useEffect(() => {
    if (!debouncedQuery) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    let isMounted = true;

    async function executeSearch() {
      try {
        setSearchLoading(true);
        setSearchError(null);
        const res = await emailsApi.searchEmails({
          q: debouncedQuery,
          page,
          limit: 20,
          accountId: filters.accountId,
          folder: filters.folder,
          category: filters.category
        });

        if (isMounted && res.success) {
          setSearchResults(res.data);
          setPagination(res.pagination);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : 'Search failed';
          setSearchError(msg);
        }
      } finally {
        if (isMounted) {
          setSearchLoading(false);
        }
      }
    }

    executeSearch();

    return () => {
      isMounted = false;
    };
  }, [debouncedQuery, page, filters.accountId, filters.folder, filters.category]);

  return {
    query,
    setQuery,
    debouncedQuery,
    searchResults,
    searchLoading,
    searchError,
    searchPagination: pagination,
    isSearching: Boolean(debouncedQuery),
    setSearchPage: setPage,
    clearSearch: () => {
      setQuery('');
      setDebouncedQuery('');
      setSearchResults([]);
    }
  };
}
