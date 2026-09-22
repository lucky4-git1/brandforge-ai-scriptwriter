import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, Activity, Search, Layout, AlertCircle, RefreshCw, Layers, Zap 
} from 'lucide-react';
import { useBrandStore } from '../state/brandStore';
import { useTrendsStore } from '../state/trendsStore';
import { useTrends } from '../hooks/useTrends';

// Component imports
import { SmartFilters } from '../components/trends/SmartFilters';
import { TrendDashboard } from '../components/trends/TrendDashboard';
import { ViralContentList } from '../components/trends/ViralContent';
import { TrendResearchEngine } from '../components/trends/TrendResearchEngine';
import { AIViralAnalysis } from '../components/trends/AIViralAnalysis';
import { OpportunityEngine } from '../components/trends/OpportunityEngine';
import { TrendTimeline } from '../components/trends/TrendTimeline';
import { ContentActions } from '../components/trends/ContentActions';
import { ResearchSummary } from '../components/trends/ResearchSummary';

export function Trends() {
  const { currentBrand } = useBrandStore();
  const { 
    activeTab, setActiveTab, researchResult, isResearching 
  } = useTrendsStore();
  const { loading, error, retry, filteredTrends } = useTrends();

  // Scroll to top on tab change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: <Activity size={16} /> },
    { id: 'engine', label: 'Research Engine', icon: <Zap size={16} /> },
    { id: 'viral', label: 'Viral Content', icon: <TrendingUp size={16} /> },
    { id: 'analysis', label: 'AI Analysis', icon: <Search size={16} /> },
    { id: 'opportunities', label: 'Opportunities', icon: <Layout size={16} /> },
    { id: 'timeline', label: 'Timeline', icon: <Layers size={16} /> }
  ] as const;

  if (error) {
    return (
      <div className="p-8 page-transition">
        <div className="max-w-2xl mx-auto glass-card p-12 text-center border-t-4 border-t-red-400">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} className="text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-[#4A3B45] mb-2">Intelligence Engine Offline</h2>
          <p className="text-[#7A6670] mb-8">{error}</p>
          <button onClick={retry} className="btn-premium flex items-center justify-center gap-2 mx-auto">
             <RefreshCw size={18} /> Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 page-transition max-w-7xl mx-auto space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF7EB6] to-[#DDA0FF] flex items-center justify-center shadow-lg shadow-[#FF7EB6]/20">
              <TrendingUp className="text-white" size={24} />
            </div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#4A3B45] to-[#7A6670]">
              Trend Intelligence
            </h1>
          </div>
          <p className="text-[#7A6670] font-medium pl-13">
            {currentBrand 
              ? `Monitoring the ${currentBrand.niche} niche` 
              : 'Select a brand to view contextual trends'}
          </p>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex flex-wrap bg-white/50 p-1 rounded-2xl border border-white">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'bg-white text-[#4A3B45] shadow-sm' 
                  : 'text-[#7A6670] hover:text-[#4A3B45] hover:bg-white/30'
              }`}
            >
              <span className={activeTab === tab.id ? 'text-[#FF7EB6]' : 'text-current'}>
                {tab.icon}
              </span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Layout */}
      <div className="space-y-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'dashboard' && (
              <>
                <SmartFilters />
                <TrendDashboard trends={filteredTrends} loading={loading} />
              </>
            )}

            {activeTab === 'viral' && (
              <>
                <SmartFilters />
                <ViralContentList 
                  content={researchResult?.viralContent || []} 
                  loading={isResearching} 
                />
              </>
            )}

            {activeTab === 'analysis' && (
              <AIViralAnalysis 
                hookPatterns={researchResult?.hookPatterns || []}
                contentFormats={researchResult?.contentFormats || []}
                ctaPatterns={researchResult?.ctaPatterns || []}
              />
            )}

            {activeTab === 'opportunities' && (
              <OpportunityEngine opportunities={researchResult?.opportunities || []} />
            )}

            {activeTab === 'timeline' && (
              <TrendTimeline timelines={[]} />
            )}

            {activeTab === 'engine' && (
              <div className="max-w-3xl mx-auto space-y-6">
                <TrendResearchEngine />
                
                {researchResult && (
                  <ResearchSummary 
                    summary={researchResult.summary} 
                    niche={researchResult.query.niche} 
                  />
                )}
                
                <ContentActions />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
