import { invoke } from '@tauri-apps/api/tauri';
import { TrendData } from '../../adapters/types';

class TrendService {
  private cache: Map<string, { data: TrendData[]; timestamp: number }> = new Map();
  private CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private inFlightRequests: Map<string, Promise<TrendData[]>> = new Map();

  async getTrends(brandId: string | null, niche: string, forceRefresh: boolean = false): Promise<TrendData[]> {
    const cacheKey = `${brandId || 'global'}_${niche}`;

    if (!forceRefresh && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      if (Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.data;
      }
    }

    if (this.inFlightRequests.has(cacheKey) && !forceRefresh) {
      return this.inFlightRequests.get(cacheKey)!;
    }

    const request = this.fetchAndEnrichTrends(brandId, niche, forceRefresh)
      .then(data => {
        this.cache.set(cacheKey, { data, timestamp: Date.now() });
        this.inFlightRequests.delete(cacheKey);
        return data;
      })
      .catch(error => {
        this.inFlightRequests.delete(cacheKey);
        throw error;
      });

    this.inFlightRequests.set(cacheKey, request);
    return request;
  }

  private async fetchAndEnrichTrends(brandId: string | null, niche: string, forceRefresh: boolean): Promise<TrendData[]> {
    try {
      const trends = await invoke<TrendData[]>('get_trends', {
        brandId,
        niche,
        forceRefresh
      });
      return trends;
    } catch (error) {
      console.error('TrendService.getTrends error:', error);
      throw new Error(typeof error === 'string' ? error : 'Unable to retrieve trend data');
    }
  }

  async analyzeTrend(trendId: string): Promise<any> {
      try {
          return await invoke('analyze_trend', { trendId });
      } catch (e) {
           console.error('TrendService.analyzeTrend error:', e);
           throw new Error(typeof e === 'string' ? e : 'Failed to analyze trend');
      }
  }
}

export const trendService = new TrendService();
