import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ResearchQuery, ResearchResult, TrendData, ViralContent, SmartFilterState, DEFAULT_FILTERS } from '../adapters/types';

interface TrendsStore {
  // Research state
  researchQuery: ResearchQuery | null;
  researchResult: ResearchResult | null;
  isResearching: boolean;
  
  // Trends state
  trends: TrendData[];
  viralContent: ViralContent[];
  
  // Filter state
  filters: SmartFilterState;
  
  // UI state
  activeTab: 'dashboard' | 'viral' | 'analysis' | 'opportunities' | 'content' | 'timeline' | 'engine';
  
  // Actions
  setResearchQuery: (query: ResearchQuery) => void;
  setResearchResult: (result: ResearchResult) => void;
  setIsResearching: (v: boolean) => void;
  setTrends: (trends: TrendData[]) => void;
  setViralContent: (content: ViralContent[]) => void;
  setFilters: (filters: Partial<SmartFilterState>) => void;
  resetFilters: () => void;
  setActiveTab: (tab: TrendsStore['activeTab']) => void;
}

export const useTrendsStore = create<TrendsStore>()(
  persist(
    (set) => ({
      researchQuery: null,
      researchResult: null,
      isResearching: false,
      trends: [],
      viralContent: [],
      filters: { ...DEFAULT_FILTERS },
      activeTab: 'dashboard',
      
      setResearchQuery: (query) => set({ researchQuery: query }),
      setResearchResult: (result) => set({ researchResult: result }),
      setIsResearching: (isResearching) => set({ isResearching }),
      setTrends: (trends) => set({ trends }),
      setViralContent: (viralContent) => set({ viralContent }),
      setFilters: (newFilters) => set((state) => ({ filters: { ...state.filters, ...newFilters } })),
      resetFilters: () => set({ filters: { ...DEFAULT_FILTERS } }),
      setActiveTab: (activeTab) => set({ activeTab }),
    }),
    {
      name: 'brandforge-trends-store',
      partialize: (state) => ({
        researchQuery: state.researchQuery,
        filters: state.filters,
        activeTab: state.activeTab
      })
    }
  )
);
