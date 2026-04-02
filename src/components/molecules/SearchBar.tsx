import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  debounceDelay?: number;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  placeholder = 'Buscar…',
  debounceDelay = 300,
}) => {
  const [query, setQuery] = useState('');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setQuery(value);

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        onSearch(value);
      }, debounceDelay);
    },
    [onSearch, debounceDelay]
  );

  const handleClear = () => {
    setQuery('');
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    onSearch('');
  };

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-dark-400" aria-hidden />
      <input
        type="search"
        value={query}
        onChange={handleChange}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full pl-10 pr-10 py-2 border border-dark-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-opacity-20 focus:border-primary-400"
      />
      {query && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-dark-400 hover:text-dark-600"
          aria-label="Limpiar búsqueda"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};
