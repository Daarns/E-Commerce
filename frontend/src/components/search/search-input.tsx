'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Search, Loader2, TrendingUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useSearchInput } from '@/hooks/useSearchInput';

interface SearchInputProps {
  placeholder?: string;
}

export function SearchInput({ placeholder = 'Search products...' }: SearchInputProps) {
  const {
    query,
    suggestions,
    popularSearches,
    isLoading,
    showDropdown,
    activeSuggestionIndex,
    inputRef,
    dropdownRef,
    setShowDropdown,
    setActiveSuggestionIndex,
    handleInputChange,
    handleSearch,
    handleKeyDown,
  } = useSearchInput();

  return (
    <div className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowDropdown(true)}
          className="pl-10 pr-10"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      <AnimatePresence>
        {showDropdown && (
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 right-0 mt-2 bg-popover border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto"
          >
            {/* Suggestions */}
            {suggestions.length > 0 && (
              <>
                <div className="px-3 py-2 text-xs font-medium text-muted-foreground">
                  Suggestions
                </div>
                {suggestions.map((suggestion, index) => (
                  <motion.button
                    key={suggestion}
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleSearch(suggestion)}
                    onMouseEnter={() => setActiveSuggestionIndex(index)}
                    className={`w-full text-left px-4 py-2 flex items-center gap-2 hover:bg-accent transition-colors ${
                      index === activeSuggestionIndex ? 'bg-accent' : ''
                    }`}
                  >
                    <Search className="h-3 w-3 text-muted-foreground" />
                    {suggestion}
                  </motion.button>
                ))}
              </>
            )}

            {/* Popular Searches */}
            {suggestions.length === 0 && popularSearches.length > 0 && (
              <>
                <div className="px-3 py-2 text-xs font-medium text-muted-foreground">
                  Popular Searches
                </div>
                {popularSearches.map((search) => (
                  <motion.button
                    key={search.query}
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => handleSearch(search.query)}
                    className="w-full text-left px-4 py-2 flex items-center justify-between hover:bg-accent transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <TrendingUp className="h-3 w-3 text-muted-foreground" />
                      {search.query}
                    </span>
                  </motion.button>
                ))}
              </>
            )}

            {/* No Results */}
            {query.trim() && suggestions.length === 0 && !isLoading && (
              <div className="px-4 py-3 text-sm text-muted-foreground text-center">
                No suggestions found
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
