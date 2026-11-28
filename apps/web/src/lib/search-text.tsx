import { createContext, type ReactNode, useContext, useMemo, useState } from 'react';

interface Search {
  text: string;
  setText: (text: string) => void;
}

const SearchContext = createContext<Search | null>(null);

/**
 * Holds what was typed, so it is still there after opening a result and going back. Kept in
 * memory, never in the address bar: it can be a name or a phone number.
 */
export function SearchProvider({ children }: { children: ReactNode }) {
  const [text, setText] = useState('');
  const value = useMemo(() => ({ text, setText }), [text]);
  return <SearchContext value={value}>{children}</SearchContext>;
}

export function useSearchText(): Search {
  const value = useContext(SearchContext);
  if (value === null) throw new Error('useSearchText needs a SearchProvider');
  return value;
}
