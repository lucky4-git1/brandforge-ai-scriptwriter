import { useState, useCallback } from 'react';
import { useBrandStore } from '../state/brandStore';
import { useTrendsStore } from '../state/trendsStore';
import { researchService } from '../services/research/researchService';
import { ResearchQuery } from '../adapters/types';

export function useResearch() {
  const { currentBrand } = useBrandStore();
  const { researchResult, isResearching, setIsResearching, setResearchResult, setResearchQuery } = useTrendsStore();
  const [error, setError] = useState<string | null>(null);

  const runResearch = useCallback(async (query: ResearchQuery) => {
    if (!currentBrand && !query.brandName) {
       setError("Brand context is required");
       return;
    }

    setResearchQuery(query);
    setIsResearching(true);
    setError(null);

    try {
      const result = await researchService.runResearch(query, currentBrand?.id || null);
      setResearchResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsResearching(false);
    }
  }, [currentBrand?.id, setResearchQuery, setIsResearching, setResearchResult]);

  return {
    result: researchResult,
    isResearching,
    error,
    runResearch
  };
}
