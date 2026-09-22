import { memo } from 'react';
import { motion } from 'framer-motion';
import { Opportunity } from '../../adapters/types';
import { Lightbulb, Compass } from 'lucide-react';

interface Props {
  opportunities: Opportunity[];
}

const CATEGORY_COLORS: Record<string, string> = {
  'underserved': 'bg-blue-100 text-blue-700 border-blue-200',
  'low-competition': 'bg-green-100 text-green-700 border-green-200',
  'emerging': 'bg-purple-100 text-purple-700 border-purple-200',
  'high-demand': 'bg-orange-100 text-orange-700 border-orange-200',
  'viral': 'bg-pink-100 text-pink-700 border-pink-200',
  'whitespace': 'bg-teal-100 text-teal-700 border-teal-200'
};

export const OpportunityEngine = memo(({ opportunities }: Props) => {
  if (opportunities.length === 0) {
    return (
      <div className="glass-card p-12 text-center">
        <Compass size={48} className="mx-auto mb-4 text-[#DDA0FF]" />
        <h3 className="text-xl font-bold mb-2 text-[#4A3B45]">No Opportunities Found</h3>
        <p className="text-[#7A6670]">Run the Research Engine to uncover content gaps in your niche.</p>
      </div>
    );
  }

  // Sort by opportunity score descending
  const sorted = [...opportunities].sort((a, b) => b.opportunityScore - a.opportunityScore);

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Lightbulb className="text-[#FF7EB6]" />
        <h2 className="text-2xl font-bold text-[#4A3B45]">Content Gaps & Opportunities</h2>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {sorted.map((opp, i) => (
          <motion.div
            key={opp.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-6 border-l-4"
            style={{ borderLeftColor: '#FF7EB6' }}
          >
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-bold text-xl text-[#4A3B45] leading-tight pr-4">{opp.title}</h3>
              <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded border ${CATEGORY_COLORS[opp.category] || CATEGORY_COLORS['emerging']}`}>
                {opp.category.replace('-', ' ')}
              </span>
            </div>

            <p className="text-[#7A6670] text-sm mb-6 h-10 line-clamp-2">{opp.description}</p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <ScoreMeter label="Opp. Score" value={opp.opportunityScore} gradient />
              <ScoreMeter label="Competition" value={opp.competitionScore} inverted />
              <ScoreMeter label="Growth Potential" value={opp.growthPotential} />
              <ScoreMeter label="Demand Rating" value={opp.demandRating} />
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#7A6670] block mb-1">Suggested Formats</span>
                <div className="flex flex-wrap gap-1">
                  {opp.suggestedFormats.map(f => (
                    <span key={f} className="text-xs bg-white text-[#4A3B45] px-2 py-1 rounded shadow-sm border border-[#FFD6E7]/30">
                      {f}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#7A6670] block mb-1">Target Keywords</span>
                <div className="flex flex-wrap gap-1">
                  {opp.relatedKeywords.map(k => (
                    <span key={k} className="text-xs text-[#FF7EB6] font-medium">#{k}</span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
});

function ScoreMeter({ label, value, gradient = false, inverted = false }: { label: string, value: number, gradient?: boolean, inverted?: boolean }) {
  // For inverted (like competition), low is good (green), high is bad (red)
  let barColor = 'bg-[#FF7EB6]';
  if (gradient) {
    barColor = 'bg-gradient-to-r from-[#FF7EB6] to-[#DDA0FF]';
  } else if (inverted) {
    barColor = value < 40 ? 'bg-green-400' : value > 70 ? 'bg-red-400' : 'bg-yellow-400';
  } else {
    barColor = value > 80 ? 'bg-green-400' : value < 40 ? 'bg-red-400' : 'bg-[#DDA0FF]';
  }

  return (
    <div className="bg-white/50 p-2 rounded-lg border border-white">
      <div className="flex justify-between text-[10px] font-bold uppercase tracking-wide text-[#7A6670] mb-1">
        <span>{label}</span>
        <span className="text-[#4A3B45]">{value}/100</span>
      </div>
      <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1, delay: 0.2 }}
          className={`h-full rounded-full ${barColor}`}
        />
      </div>
    </div>
  );
}
