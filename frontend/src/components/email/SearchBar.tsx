import React from 'react';
import { Search, X, Loader2 } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (val: string) => void;
  isLoading?: boolean;
  totalResults?: number;
  isSearching?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  isLoading = false,
  totalResults,
  isSearching = false,
}) => {
  return (
    <div className="relative px-3 py-2 bg-white border-b border-gray-200">
      <div className="relative flex items-center">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-reachinbox-accent" />
          ) : (
            <Search className="w-4 h-4" />
          )}
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search subject, body, sender with Elasticsearch..."
          className="w-full pl-9 pr-8 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-reachinbox-accent/20 focus:border-reachinbox-accent transition-all placeholder:text-gray-400 text-gray-800"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
            title="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {isSearching && (
        <div className="flex items-center justify-between mt-1.5 px-1 text-xs text-gray-500">
          <span>
            Elasticsearch query: <span className="font-semibold text-gray-700">"{value}"</span>
          </span>
          {totalResults !== undefined && (
            <span className="font-medium text-reachinbox-accent bg-blue-50 px-2 py-0.5 rounded-full">
              {totalResults} {totalResults === 1 ? 'hit' : 'hits'}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
