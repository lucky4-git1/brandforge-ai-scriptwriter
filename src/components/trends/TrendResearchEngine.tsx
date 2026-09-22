import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Loader2, Search } from 'lucide-react';
import { useBrandStore } from '../../state/brandStore';
import { useResearch } from '../../hooks/useResearch';

export function TrendResearchEngine() {
  const { currentBrand } = useBrandStore();
  const { isResearching, runResearch } = useResearch();

  const [brandName, setBrandName] = useState(currentBrand?.name || '');
  const [niche, setNiche] = useState(currentBrand?.niche || '');
  const [industry, setIndustry] = useState('');
  const [keywords, setKeywords] = useState('');

  // Sync inputs if brand changes
  useEffect(() => {
    if (currentBrand) {
      setBrandName(currentBrand.name);
      setNiche(currentBrand.niche);
    }
  }, [currentBrand]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!niche) return;

    const keywordsList = keywords
      .split('\n')
      .map(k => k.trim())
      .filter(k => k.length > 0);

    runResearch({
      brandName,
      niche,
      industry,
      keywords: keywordsList,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6 md:p-8 max-w-2xl mx-auto"
    >
      <div className="flex items-center justify-center gap-3 mb-8">
        <div className="p-3 bg-gradient-to-br from-[#FF7EB6] to-[#DDA0FF] rounded-2xl shadow-lg shadow-[#FF7EB6]/20">
          <Sparkles className="text-white" size={24} />
        </div>
        <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#4A3B45] to-[#7A6670]">
          Trend Research Engine
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold" style={{ color: '#4A3B45' }}>Brand Name</label>
            <input
              type="text"
              className="input-soft w-full"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="e.g. Acme Corp"
              disabled={isResearching}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold" style={{ color: '#4A3B45' }}>Niche <span className="text-red-400">*</span></label>
            <input
              type="text"
              className="input-soft w-full"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              placeholder="e.g. Productivity Software"
              disabled={isResearching}
              required
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold" style={{ color: '#4A3B45' }}>Industry</label>
          <input
            type="text"
            className="input-soft w-full"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            placeholder="e.g. Technology, SaaS, B2B"
            disabled={isResearching}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold flex justify-between" style={{ color: '#4A3B45' }}>
            <span>Target Keywords</span>
            <span className="text-xs font-normal" style={{ color: '#7A6670' }}>One per line</span>
          </label>
          <textarea
            className="input-soft w-full min-h-[120px] resize-y"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="AI Agents&#10;Automation&#10;Future of Work"
            disabled={isResearching}
          />
        </div>

        <button
          type="submit"
          disabled={isResearching || !niche}
          className={`btn-premium w-full flex justify-center items-center gap-2 mt-4 py-4 text-lg ${
            isResearching || !niche ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isResearching ? (
            <>
              <Loader2 className="animate-spin" /> Deep Researching...
            </>
          ) : (
            <>
              <Search size={20} /> Generate Intelligence Report
            </>
          )}
        </button>
        
        {!currentBrand && (
           <p className="text-xs text-center text-red-400 font-medium">
              Please select a brand from the workspace first, or enter details manually.
           </p>
        )}
      </form>
    </motion.div>
  );
}
