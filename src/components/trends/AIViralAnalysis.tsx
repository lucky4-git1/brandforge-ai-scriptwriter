import { memo } from 'react';
import { motion } from 'framer-motion';
import { HookPattern, ContentFormat, CTAPattern } from '../../adapters/types';
import { MessageSquareQuote, Layout, Target, Zap } from 'lucide-react';

interface Props {
  hookPatterns: HookPattern[];
  contentFormats: ContentFormat[];
  ctaPatterns: CTAPattern[];
}

export const AIViralAnalysis = memo(({ hookPatterns, contentFormats, ctaPatterns }: Props) => {
  if (!hookPatterns.length && !contentFormats.length) {
    return (
      <div className="glass-card p-12 text-center">
        <Zap size={48} className="mx-auto mb-4 text-[#DDA0FF]" />
        <h3 className="text-xl font-bold mb-2 text-[#4A3B45]">No Analysis Available</h3>
        <p className="text-[#7A6670]">Run the Research Engine to generate viral pattern analysis.</p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Hooks Section */}
      <section>
        <div className="flex items-center gap-2 mb-6">
          <MessageSquareQuote className="text-[#FF7EB6]" />
          <h2 className="text-2xl font-bold text-[#4A3B45]">Viral Hook Patterns</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {hookPatterns.map((hook, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass-card p-6"
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-bold text-lg text-[#4A3B45] pr-4 leading-tight">"{hook.pattern}"</h3>
                <span className="bg-[#FFF7FA] text-[#FF7EB6] text-xs font-bold px-2 py-1 rounded border border-[#FFD6E7]">
                  {hook.usageCount}x Seen
                </span>
              </div>
              
              <div className="mb-4">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#7A6670] font-medium">Effectiveness Score</span>
                  <span className="font-bold text-[#DDA0FF]">{hook.effectiveness}/100</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${hook.effectiveness}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className="bg-gradient-to-r from-[#FF7EB6] to-[#DDA0FF] h-full rounded-full"
                  />
                </div>
              </div>

              <div className="bg-white/50 rounded-xl p-3 border border-white">
                <p className="text-xs font-semibold text-[#7A6670] mb-2 uppercase tracking-wide">In the wild</p>
                <ul className="space-y-2">
                  {hook.examples.map((ex, j) => (
                    <li key={j} className="text-sm italic text-[#4A3B45] before:content-[''] before:inline-block before:w-1 before:h-1 before:bg-[#FF7EB6] before:rounded-full before:mr-2 before:align-middle">
                      {ex}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Formats Section */}
      <section>
        <div className="flex items-center gap-2 mb-6">
          <Layout className="text-[#DDA0FF]" />
          <h2 className="text-2xl font-bold text-[#4A3B45]">Top Performing Formats</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {contentFormats.map((format, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass-card p-6 flex flex-col"
            >
              <h3 className="font-bold text-xl text-[#4A3B45] mb-2">{format.name}</h3>
              <p className="text-sm text-[#7A6670] mb-6 flex-1">{format.description}</p>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-1 font-medium text-[#4A3B45]">
                    <span>Popularity</span>
                    <span>{Math.round(format.popularity)}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-[#FF7EB6] h-full rounded-full" style={{ width: `${format.popularity}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1 font-medium text-[#4A3B45]">
                    <span>Avg Engagement</span>
                    <span>{Math.round(format.engagement)}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-[#DDA0FF] h-full rounded-full" style={{ width: `${format.engagement}%` }} />
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-[#FFD6E7]/50 flex flex-wrap gap-1">
                {format.platforms.map(p => (
                  <span key={p} className="text-[10px] uppercase tracking-wider font-semibold bg-white px-2 py-0.5 rounded text-[#7A6670]">
                    {p}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTAs Section */}
      <section>
        <div className="flex items-center gap-2 mb-6">
          <Target className="text-[#FF7EB6]" />
          <h2 className="text-2xl font-bold text-[#4A3B45]">High-Converting CTAs</h2>
        </div>
        <div className="space-y-3">
          {ctaPatterns.map((cta, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass-card p-4 flex items-center justify-between"
            >
              <div>
                <h4 className="font-bold text-[#4A3B45] text-lg">"{cta.pattern}"</h4>
                <p className="text-sm text-[#7A6670] italic mt-1">e.g. {cta.examples[0]}</p>
              </div>
              <div className="text-right ml-4 shrink-0">
                <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#FF7EB6] to-[#DDA0FF]">
                  {cta.conversionRate}%
                </div>
                <div className="text-[10px] uppercase font-bold text-[#7A6670] tracking-wider">Conversion</div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
});
