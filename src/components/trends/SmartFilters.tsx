import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, RefreshCw } from 'lucide-react';
import { useTrendsStore } from '../../state/trendsStore';
import { SmartFilterState } from '../../adapters/types';
import clsx from 'clsx';

export function SmartFilters() {
  const { filters, setFilters, resetFilters } = useTrendsStore();
  const [isExpanded, setIsExpanded] = useState(false);

  const updateFilter = (key: keyof SmartFilterState, value: string) => {
    setFilters({ [key]: value });
  };

  const activeFilterCount = Object.values(filters).filter(v => v !== 'all' && v !== '30d').length;

  const FilterGroup = ({ title, filterKey, options }: { title: string, filterKey: keyof SmartFilterState, options: {label: string, value: string}[] }) => (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#7A6670' }}>{title}</span>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => {
          const isActive = filters[filterKey] === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => updateFilter(filterKey, opt.value)}
              className={clsx(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300",
                isActive 
                  ? "bg-gradient-to-r from-[#FF7EB6] to-[#DDA0FF] text-white shadow-md"
                  : "bg-white/50 text-[#7A6670] hover:bg-white/80 border border-transparent hover:border-[#FFD6E7]"
              )}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  );

  return (
    <div className="glass-card mb-6">
      <div className="p-4 flex items-center justify-between cursor-pointer select-none" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FFD6E7] to-[#FFF7FA] flex items-center justify-center border border-white">
             <Filter size={16} style={{ color: '#FF7EB6' }} />
          </div>
          <span className="font-semibold" style={{ color: '#4A3B45' }}>Smart Filters</span>
          {activeFilterCount > 0 && (
             <span className="bg-gradient-to-r from-[#FF7EB6] to-[#DDA0FF] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
               {activeFilterCount} active
             </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={(e) => { e.stopPropagation(); resetFilters(); }}
            className="flex items-center gap-1.5 text-xs font-medium text-[#7A6670] hover:text-[#FF7EB6] transition-colors"
          >
            <RefreshCw size={12} /> Reset
          </button>
          <motion.div animate={{ rotate: isExpanded ? 180 : 0 }}>
             <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
               <path d="M2.5 4.5L6 8L9.5 4.5" stroke="#7A6670" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
             </svg>
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden border-t border-[#FFD6E7]/50"
          >
            <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <FilterGroup 
                title="Platform" 
                filterKey="platform" 
                options={[
                  {label: 'All', value: 'all'},
                  {label: 'Instagram', value: 'instagram'},
                  {label: 'TikTok', value: 'tiktok'},
                  {label: 'YouTube', value: 'youtube'},
                  {label: 'Reddit', value: 'reddit'}
                ]} 
              />
              <FilterGroup 
                title="Content Type" 
                filterKey="contentType" 
                options={[
                  {label: 'All', value: 'all'},
                  {label: 'Topics', value: 'topics'},
                  {label: 'Videos', value: 'videos'}
                ]} 
              />
              <FilterGroup 
                title="Engagement Level" 
                filterKey="engagementLevel" 
                options={[
                  {label: 'All', value: 'all'},
                  {label: 'High (>80%)', value: 'high'},
                  {label: 'Medium', value: 'medium'},
                  {label: 'Low (<40%)', value: 'low'}
                ]} 
              />
              <FilterGroup 
                title="Trend Strength" 
                filterKey="trendStrength" 
                options={[
                  {label: 'All', value: 'all'},
                  {label: 'Strong', value: 'strong'},
                  {label: 'Moderate', value: 'moderate'},
                  {label: 'Weak', value: 'weak'}
                ]} 
              />
              <FilterGroup 
                title="Growth Rate" 
                filterKey="growthRate" 
                options={[
                  {label: 'All', value: 'all'},
                  {label: 'Rising', value: 'rising'},
                  {label: 'Stable', value: 'stable'},
                  {label: 'Declining', value: 'declining'}
                ]} 
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
