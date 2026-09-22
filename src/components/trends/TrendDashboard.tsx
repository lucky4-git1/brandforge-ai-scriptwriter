import { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendData } from '../../adapters/types';
import { TrendingUp, Activity, Lightbulb, Hash, Video, ExternalLink, ArrowUpRight, ArrowDownRight, Minus, ChevronDown, ChevronUp, Zap, Wand2 } from 'lucide-react';
import { SkeletonGrid } from './SkeletonLoader';
import { trendService } from '../../services/trends/trendService';
import { useTrendsStore } from '../../state/trendsStore';
import { useNavigate } from 'react-router-dom';

interface Props {
  trends: TrendData[];
  loading: boolean;
}

export const TrendDashboard = memo(({ trends, loading }: Props) => {
  const { setTrends } = useTrendsStore();
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleAnalyze = async (trendId: string) => {
    if (expandedId === trendId) {
      setExpandedId(null);
      return;
    }

    const trend = trends.find(t => t.id === trendId);
    if (trend?.analysis) {
      setExpandedId(trendId);
      return;
    }

    setAnalyzingId(trendId);
    try {
      const response = await trendService.analyzeTrend(trendId);
      if (response && response.analysis) {
        setTrends(trends.map(t => t.id === trendId ? { ...t, analysis: response.analysis } : t));
        setExpandedId(trendId);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAnalyzingId(null);
    }
  };

  const handleGenerateScript = (trend: TrendData) => {
    // We could pass state or use a URL param. For now, navigate to editor.
    // If you have a script generator workflow, you would trigger it here.
    // Assuming the editor or agent handles the task based on currentBrand and context.
    navigate('/workspace', { state: { sourceTrend: trend } });
  };

  if (loading) return <SkeletonGrid count={6} />;
  
  if (trends.length === 0) {
    return (
      <div className="glass-card p-12 text-center flex flex-col items-center">
         <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#FFD6E7] to-[#FFF7FA] flex items-center justify-center mb-4">
           <Activity size={32} style={{ color: '#FF7EB6' }} />
         </div>
         <h3 className="text-xl font-bold mb-2" style={{ color: '#4A3B45' }}>No Trends Found</h3>
         <p style={{ color: '#7A6670' }}>Adjust your filters or run the Research Engine to discover new trends.</p>
      </div>
    );
  }

  const risingCount = trends.filter(t => t.trend_score > 0.6).length;
  const avgEng = trends.length > 0 ? trends.reduce((acc, t) => acc + (t.trend_score * 100), 0) / trends.length : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Trends" value={trends.length.toString()} icon={<Hash size={20} />} />
        <StatCard title="Rising Trends" value={risingCount.toString()} icon={<TrendingUp size={20} />} color="text-green-500" />
        <StatCard title="Avg Score" value={`${avgEng.toFixed(1)}`} icon={<Activity size={20} />} />
        <StatCard title="Opportunities" value={Math.floor(trends.length * 0.4).toString()} icon={<Lightbulb size={20} />} />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {trends.map((t, i) => {
          const isExpanded = expandedId === t.id;
          const isAnalyzing = analyzingId === t.id;
          const hasAnalysis = !!t.analysis;

          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className="glass-card overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col"
            >
              {t.type === 'video' && t.thumbnail_url && (
                 <div className="h-40 bg-gradient-to-br from-[#FFD6E7] to-[#DDA0FF] relative">
                   <img src={t.thumbnail_url} alt="" className="w-full h-full object-cover mix-blend-overlay opacity-60" />
                 </div>
              )}
              
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex gap-2">
                    <span className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-white/60" style={{ color: '#FF7EB6' }}>
                      {t.type === 'video' ? <Video size={12} /> : <Hash size={12} />}
                      <span className="uppercase">{t.type}</span>
                    </span>
                    {t.platform && (
                       <span className="text-xs font-semibold px-2 py-1 rounded-full bg-white/60 capitalize" style={{ color: '#DDA0FF' }}>
                         {t.platform}
                       </span>
                    )}
                  </div>
                  {t.growth_velocity > 0.6 && <ArrowUpRight size={16} className="text-green-500" />}
                  {t.growth_velocity < 0.4 && <ArrowDownRight size={16} className="text-red-500" />}
                  {(t.growth_velocity >= 0.4 && t.growth_velocity <= 0.6) && <Minus size={16} className="text-yellow-500" />}
                </div>

                <h3 className="font-bold mb-2 line-clamp-2" style={{ color: '#4A3B45' }}>{t.title}</h3>
                <p className="text-sm mb-4 line-clamp-2" style={{ color: '#7A6670' }}>{t.summary}</p>

                <div className="flex flex-wrap gap-2 mb-4">
                  {t.keywords.slice(0, 3).map(k => (
                    <span key={k} className="text-xs px-2 py-1 bg-[#FFF7FA] border border-[#FFD6E7] rounded-md" style={{ color: '#7A6670' }}>
                      #{k}
                    </span>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-2 border-t border-[#FFD6E7]/50 pt-3 mb-4">
                  <div className="text-center">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Score</div>
                    <div className="font-bold text-[#FF7EB6]">{(t.trend_score * 100).toFixed(0)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Growth</div>
                    <div className={`font-bold ${t.growth_velocity > 0.5 ? 'text-green-500' : 'text-red-500'}`}>
                      {(t.growth_velocity * 100).toFixed(0)}%
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Source</div>
                    <div className="font-bold text-[#DDA0FF] flex justify-center">
                      {t.url ? (
                        <a href={t.url} target="_blank" rel="noopener noreferrer" className="hover:opacity-70">
                          <ExternalLink size={16} />
                        </a>
                      ) : '-'}
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => handleAnalyze(t.id)}
                  disabled={isAnalyzing}
                  className="w-full mt-auto py-2 px-4 rounded-lg bg-[#FFF7FA] text-[#FF7EB6] hover:bg-[#FFD6E7] transition-colors flex items-center justify-center gap-2 font-medium text-sm border border-[#FFD6E7]"
                >
                  {isAnalyzing ? (
                    <><Activity size={16} className="animate-spin" /> Analyzing...</>
                  ) : hasAnalysis ? (
                    <>{isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />} Drill Down</>
                  ) : (
                    <><Zap size={16} /> Analyze Opportunity</>
                  )}
                </button>

                <AnimatePresence>
                  {isExpanded && t.analysis && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden mt-4 pt-4 border-t border-[#FFD6E7]"
                    >
                      <div className="space-y-3 text-sm">
                        <div>
                          <h4 className="font-bold text-[#4A3B45] flex items-center gap-1"><Lightbulb size={14} className="text-yellow-500"/> Why it matters</h4>
                          <p className="text-[#7A6670] mt-1">{t.analysis.why_it_matters}</p>
                        </div>
                        <div>
                          <h4 className="font-bold text-[#4A3B45]">Target Audience</h4>
                          <p className="text-[#7A6670] mt-1">{t.analysis.target_audience}</p>
                        </div>
                        <div>
                          <h4 className="font-bold text-[#4A3B45]">Suggested Hooks</h4>
                          <ul className="list-disc pl-4 text-[#7A6670] mt-1">
                            {t.analysis.suggested_hooks.map((h, j) => <li key={j}>{h}</li>)}
                          </ul>
                        </div>
                        
                        <button
                          onClick={() => handleGenerateScript(t)}
                          className="w-full mt-2 py-2.5 px-4 rounded-lg bg-gradient-to-r from-[#FF7EB6] to-[#DDA0FF] text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-2 font-medium shadow-md shadow-[#FF7EB6]/20"
                        >
                          <Wand2 size={16} />
                          Generate Script
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
});

function StatCard({ title, value, icon, color = "text-[#FF7EB6]" }: { title: string, value: string, icon: React.ReactNode, color?: string }) {
  return (
    <div className="glass-card p-5">
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#7A6670' }}>{title}</span>
        <div className={`p-1.5 rounded-lg bg-white/50 ${color}`}>
          {icon}
        </div>
      </div>
      <div className="text-3xl font-bold" style={{ color: '#4A3B45' }}>{value}</div>
    </div>
  );
}
