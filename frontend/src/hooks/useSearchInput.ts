import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { productService, type PopularSearch } from '@/services/product';

interface UseSearchInputReturn {
  query: string;
  suggestions: string[];
  popularSearches: PopularSearch[];
  isLoading: boolean;
  showDropdown: boolean;
  activeSuggestionIndex: number;
  inputRef: React.RefObject<HTMLInputElement | null>;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
  setShowDropdown: (show: boolean) => void;
  setActiveSuggestionIndex: React.Dispatch<React.SetStateAction<number>>;
  handleInputChange: (value: string) => void;
  handleSearch: (searchQuery: string | undefined) => void;
  handleKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
}

export function useSearchInput(): UseSearchInputReturn {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [popularSearches, setPopularSearches] = useState<PopularSearch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;

    productService
      .getPopularSearches(5, 'week')
      .then((searches) => {
        if (isMounted) setPopularSearches(searches);
      })
      .catch((error: unknown) => {
        console.error('Failed to load popular searches:', error);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    let isMounted = true;

    const timeout = window.setTimeout(() => {
      productService
        .getSearchAutocomplete(trimmedQuery, 8)
        .then((results) => {
          if (isMounted) setSuggestions(results.map((result) => result.query));
        })
        .catch((error: unknown) => {
          console.error('Failed to fetch suggestions:', error);
          if (isMounted) setSuggestions([]);
        })
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });
    }, 300);

    return () => {
      isMounted = false;
      window.clearTimeout(timeout);
    };
  }, [query]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent): void {
      const target = event.target;
      if (!(target instanceof Node)) return;

      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        inputRef.current &&
        !inputRef.current.contains(target)
      ) {
        setShowDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = useCallback(
    (searchQuery: string | undefined): void => {
      if (!searchQuery?.trim()) return;

      router.push(`/products?search=${encodeURIComponent(searchQuery)}`);
      setQuery('');
      setShowDropdown(false);
      setSuggestions([]);
    },
    [router]
  );

  const handleInputChange = useCallback((value: string): void => {
    setQuery(value);
    setShowDropdown(true);
    setActiveSuggestionIndex(-1);

    if (!value.trim()) {
      setSuggestions([]);
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }
  }, []);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>): void => {
      if (!showDropdown) return;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setActiveSuggestionIndex((previous) =>
            previous < suggestions.length - 1 ? previous + 1 : 0
          );
          break;
        case 'ArrowUp':
          event.preventDefault();
          setActiveSuggestionIndex((previous) =>
            previous > 0 ? previous - 1 : suggestions.length - 1
          );
          break;
        case 'Enter':
          event.preventDefault();
          handleSearch(activeSuggestionIndex >= 0 ? suggestions[activeSuggestionIndex] : query);
          break;
        case 'Escape':
          event.preventDefault();
          setShowDropdown(false);
          break;
      }
    },
    [activeSuggestionIndex, handleSearch, query, showDropdown, suggestions]
  );

  return {
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
  };
}
