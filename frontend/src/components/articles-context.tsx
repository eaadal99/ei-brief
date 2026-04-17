'use client';

import { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import type { Article } from '@/lib/types';

interface ArticlesContextValue {
  articles: Article[];
  setArticles: (a: Article[]) => void;
}

const ArticlesContext = createContext<ArticlesContextValue | null>(null);

export function ArticlesProvider({ children }: { children: ReactNode }) {
  const [articles, setArticles] = useState<Article[]>([]);
  const value = useMemo(() => ({ articles, setArticles }), [articles]);
  return <ArticlesContext.Provider value={value}>{children}</ArticlesContext.Provider>;
}

export function useArticlesContext(): ArticlesContextValue {
  const ctx = useContext(ArticlesContext);
  if (!ctx) {
    return { articles: [], setArticles: () => {} };
  }
  return ctx;
}
