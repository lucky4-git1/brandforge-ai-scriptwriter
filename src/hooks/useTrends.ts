import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useBrandStore } from '../state/brandStore';
import { useTrendsStore } from '../state/trendsStore';
import { trendService } from '../services/trends/trendService';

export function useTrends() {
  const { currentBrand } = useBrandStore();
  const { trends, setTrends, filters } = useTrendsStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Use a generation counter to prevent race conditions
  const generationRef = useRef(0);

  const fetchTrends = useCallback(async (forceRefresh = false) => {
    // If no brand is selected, we can't reliably fetch context-aware trends
    // but the backend handles `null` brandId by using the niche string.
    const niche = currentBrand?.niche || 'marketing';
    const brandId = currentBrand?.id || null;

    generationRef.current += 1;
    const currentGeneration = generationRef.current;

    setLoading(true);
    setError(null);

    try {
      const data = await trendService.getTrends(brandId, niche, forceRefresh);
      
      // Only update state if this is the latest request
      if (currentGeneration === generationRef.current) {
        setTrends(data);
      }
    } catch (err) {
      if (currentGeneration === generationRef.current) {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      if (currentGeneration === generationRef.current) {
        setLoading(false);
      }
    }
  }, [currentBrand?.id, currentBrand?.niche, setTrends]);

  useEffect(() => {
    fetchTrends(false);
  }, [fetchTrends]);

  const filteredTrends = useMemo(() => {
    return trends.filter(trend => {
      if (filters.platform !== 'all' && trend.platform !== filters.platform) return false;
      if (filters.contentType === 'topics' && trend.type === 'video') return false;
      if (filters.contentType === 'videos' && trend.type === 'topic') return false;
      
      if (filters.engagementLevel !== 'all') {
        const isHigh = trend.trend_score > 0.8;
        const isLow = trend.trend_score < 0.4;
        if (filters.engagementLevel === 'high' && !isHigh) return false;
        if (filters.engagementLevel === 'low' && !isLow) return false;
        if (filters.engagementLevel === 'medium' && (isHigh || isLow)) return false;
      }
      
      if (filters.trendStrength !== 'all') {
         const score100 = trend.trend_score * 100;
         const isStrong = score100 > 80;
         const isWeak = score100 < 40;
         if (filters.trendStrength === 'strong' && !isStrong) return false;
         if (filters.trendStrength === 'weak' && !isWeak) return false;
         if (filters.trendStrength === 'moderate' && (isStrong || isWeak)) return false;
      }

      if (filters.growthRate !== 'all') {
        const momentum = trend.growth_velocity > 0.6 ? 'rising' : trend.growth_velocity < 0.4 ? 'declining' : 'stable';
        if (momentum !== filters.growthRate) return false;
      }

      return true;
    });
  }, [trends, filters]);

  const trendStats = useMemo(() => {
    const topics = filteredTrends.filter(t => t.type === 'topic').length;
    const videos = filteredTrends.filter(t => t.type === 'video').length;
    const rising = filteredTrends.filter(t => t.growth_velocity > 0.6).length;
    const declining = filteredTrends.filter(t => t.growth_velocity < 0.4).length;
    const avgEngagement = filteredTrends.length > 0 
      ? filteredTrends.reduce((sum, t) => sum + t.trend_score, 0) / filteredTrends.length 
      : 0;

    return {
      total: filteredTrends.length,
      topics,
      videos,
      rising,
      declining,
      avgEngagement
    };
  }, [filteredTrends]);

  return {
    trends,
    loading,
    error,
    retry: () => fetchTrends(true),
    refresh: () => fetchTrends(true),
    filteredTrends,
    trendStats
  };
}
