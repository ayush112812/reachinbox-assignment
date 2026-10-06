import React, { useState, useCallback } from 'react';
import { useAccounts } from './hooks/useAccounts';
import { useEmails } from './hooks/useEmails';
import { useSearch } from './hooks/useSearch';
import { useRealtimeEvents } from './hooks/useRealtimeEvents';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { DeveloperModal } from './components/layout/DeveloperModal';
import { EmailList } from './components/email/EmailList';
import { EmailDetail } from './components/email/EmailDetail';
import { Toast } from './components/common/Toast';
import { EmailCategory, EmailDocument } from './types/email';

export const App: React.FC = () => {
  // Filter States
  const [selectedAccountId, setSelectedAccountId] = useState<string | undefined>(undefined);
  const [selectedFolder, setSelectedFolder] = useState<string>('INBOX');
  const [selectedCategory, setSelectedCategory] = useState<EmailCategory | undefined>(undefined);

  // Selected Email State
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [selectedEmailItem, setSelectedEmailItem] = useState<EmailDocument | null>(null);

  // Developer Modal State
  const [isDevModalOpen, setIsDevModalOpen] = useState<boolean>(false);

  // Data Hooks
  const {
    accounts,
    syncingId,
    refreshAccounts,
    triggerSync,
  } = useAccounts();

  const {
    emails,
    loading: emailsLoading,
    error: emailsError,
    pagination: emailsPagination,
    page: emailPage,
    setPage: setEmailPage,
    refreshEmails,
    setAccountId,
    setFolder,
    setCategory,
  } = useEmails({
    accountId: selectedAccountId,
    folder: selectedFolder,
    category: selectedCategory,
  });

  const {
    query: searchQuery,
    setQuery: setSearchQuery,
    searchResults,
    searchLoading,
    searchError,
    searchPagination,
    isSearching,
    setSearchPage,
  } = useSearch({
    accountId: selectedAccountId,
    folder: selectedFolder,
    category: selectedCategory,
  });

  // Handle global refresh (called by header or SSE updates)
  const handleGlobalRefresh = useCallback(() => {
    refreshEmails();
    refreshAccounts();
  }, [refreshEmails, refreshAccounts]);

  // Real-time Server-Sent Events (SSE) listener
  const { isConnected, toasts, removeToast } = useRealtimeEvents(handleGlobalRefresh);

  // Handlers for Filter Selection
  const handleSelectAccount = (accId?: string) => {
    setSelectedAccountId(accId);
    setAccountId(accId);
    setSelectedEmailId(null);
    setSelectedEmailItem(null);
  };

  const handleSelectFolder = (folderName?: string) => {
    const f = folderName || 'INBOX';
    setSelectedFolder(f);
    setFolder(f);
    setSelectedEmailId(null);
    setSelectedEmailItem(null);
  };

  const handleSelectCategory = (cat?: EmailCategory) => {
    setSelectedCategory(cat);
    setCategory(cat);
    setSelectedEmailId(null);
    setSelectedEmailItem(null);
  };

  const handleSelectEmail = (email: EmailDocument) => {
    setSelectedEmailId(email.id);
    setSelectedEmailItem(email);
  };

  const handleEmailUpdated = (updated: EmailDocument) => {
    setSelectedEmailItem(updated);
  };

  // Determine active email list (Search vs Regular list)
  const activeEmails = isSearching ? searchResults : emails;
  const activeLoading = isSearching ? searchLoading : emailsLoading;
  const activeError = isSearching ? searchError : emailsError;
  const activePage = isSearching ? searchPagination.page : emailPage;
  const activeTotalPages = isSearching ? searchPagination.totalPages : emailsPagination.totalPages;
  const activeTotal = isSearching ? searchPagination.total : emailsPagination.total;

  const handlePageChange = (newPage: number) => {
    if (isSearching) {
      setSearchPage(newPage);
    } else {
      setEmailPage(newPage);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-white text-gray-900 font-sans antialiased">
      {/* Top Application Header */}
      <Header
        accounts={accounts}
        isRealtimeConnected={isConnected}
        onRefresh={handleGlobalRefresh}
        onOpenDevModal={() => setIsDevModalOpen(true)}
      />

      {/* 3-Pane Responsive Layout */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Pane 1: Left Sidebar */}
        <Sidebar
          accounts={accounts}
          selectedAccountId={selectedAccountId}
          selectedFolder={selectedFolder}
          selectedCategory={selectedCategory}
          syncingId={syncingId}
          onSelectAccount={handleSelectAccount}
          onSelectFolder={handleSelectFolder}
          onSelectCategory={handleSelectCategory}
          onTriggerSync={(id) => triggerSync(id, 30)}
        />

        {/* Pane 2: Middle Email List */}
        <div className="w-96 flex-shrink-0 flex flex-col h-full bg-white z-0">
          <EmailList
            emails={activeEmails}
            selectedEmailId={selectedEmailId}
            onSelectEmail={handleSelectEmail}
            isLoading={activeLoading}
            error={activeError}
            onRefresh={handleGlobalRefresh}
            page={activePage}
            totalPages={activeTotalPages}
            total={activeTotal}
            onPageChange={handlePageChange}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            isSearching={isSearching}
            selectedAccount={selectedAccountId || 'all'}
            selectedCategory={selectedCategory || 'all'}
            selectedFolder={selectedFolder}
          />
        </div>

        {/* Pane 3: Right Email Detail View */}
        <main className="flex-1 min-w-0 h-full bg-white z-0">
          <EmailDetail
            emailId={selectedEmailId}
            initialEmail={selectedEmailItem}
            onEmailUpdated={handleEmailUpdated}
          />
        </main>
      </div>

      {/* Real-time Toast Notifications */}
      <Toast toasts={toasts} onDismiss={removeToast} />

      {/* Developer & RAG Knowledge Base Modal */}
      <DeveloperModal
        isOpen={isDevModalOpen}
        onClose={() => setIsDevModalOpen(false)}
      />
    </div>
  );
};

export default App;
