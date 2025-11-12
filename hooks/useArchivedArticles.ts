import { useState, useEffect, useCallback } from 'react';

const ARCHIVED_ARTICLES_KEY = 'newsbot_archived_articles';

export interface ArchivedArticle {
  articleId: string;
  archivedAt: number;
}

export const useArchivedArticles = () => {
  const [archivedArticles, setArchivedArticles] = useState<ArchivedArticle[]>([]);

  // Charger les articles archivés depuis le localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(ARCHIVED_ARTICLES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ArchivedArticle[];
        setArchivedArticles(parsed);
      }
    } catch (error) {
      console.warn('Unable to load archived articles:', error);
    }
  }, []);

  // Archiver un article
  const archiveArticle = useCallback((articleId: string) => {
    const newArchived: ArchivedArticle = {
      articleId,
      archivedAt: Date.now(),
    };

    setArchivedArticles(prev => {
      // Éviter les doublons
      if (prev.some(item => item.articleId === articleId)) {
        return prev;
      }

      const updated = [newArchived, ...prev];
      try {
        localStorage.setItem(ARCHIVED_ARTICLES_KEY, JSON.stringify(updated));
      } catch (error) {
        console.warn('Unable to save archived article:', error);
      }
      return updated;
    });
  }, []);

  // Désarchiver un article
  const unarchiveArticle = useCallback((articleId: string) => {
    setArchivedArticles(prev => {
      const updated = prev.filter(item => item.articleId !== articleId);
      try {
        localStorage.setItem(ARCHIVED_ARTICLES_KEY, JSON.stringify(updated));
      } catch (error) {
        console.warn('Unable to update archived articles:', error);
      }
      return updated;
    });
  }, []);

  // Vérifier si un article est archivé
  const isArticleArchived = useCallback(
    (articleId: string): boolean => {
      return archivedArticles.some(item => item.articleId === articleId);
    },
    [archivedArticles]
  );

  // Effacer tous les articles archivés
  const clearArchived = useCallback(() => {
    setArchivedArticles([]);
    try {
      localStorage.removeItem(ARCHIVED_ARTICLES_KEY);
    } catch (error) {
      console.warn('Unable to clear archived articles:', error);
    }
  }, []);

  return {
    archivedArticles,
    archiveArticle,
    unarchiveArticle,
    isArticleArchived,
    clearArchived,
  };
};
