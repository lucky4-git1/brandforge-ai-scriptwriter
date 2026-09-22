import { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ViralContent } from '../../adapters/types';
import { Heart, MessageCircle, Eye, Activity, PlayCircle, Image as ImageIcon, Flame } from 'lucide-react';
import { SkeletonGrid } from './SkeletonLoader';

interface Props {
  content: ViralContent[];
  loading: boolean;
}

const PLATFORM_COLORS = {
  instagram: '#E4405F',
  tiktok: '#000000',
  youtube: '#FF0000',
  reddit: '#FF4500'
};

export const ViralContentList = memo(({ content, loading }: Props) => {
  const [platform, setPlatform] = useState<string>('all');

  if (loading) return <SkeletonGrid count={6} />;

  const filtered = platform === 'all' ? content : content.filter(c => c.platform === platform);

  if (filtered.length === 0) {
    return (
      <div className="glass-card p-12 text-center flex flex-col items-center">
         <Flame size={48} className="mb-4 text-gray-300" />
         <h3 className="text-xl font-bold mb-2" style={{ color: '#4A3B45' }}>No Viral Content Found</h3>
         <p style={{ color: '#7A6670' }}>Try running research on a different niche to discover viral hits.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2 p-1 glass-card w-fit rounded-full">
        {['all', 'instagram', 'tiktok', 'youtube', 'reddit'].map(p => (
          <button
            key={p}
            onClick={() => setPlatform(p)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold capitalize transition-all ${
              platform === p ? 'bg-gradient-to-r from-[#FF7EB6] to-[#DDA0FF] text-white' : 'text-[#7A6670] hover:bg-white/50'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {filtered.map((c, i) => (
            <motion.div
              key={c.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2, delay: i * 0.05 }}
              className="glass-card p-5 hover:-translate-y-1 transition-transform cursor-pointer"
              onClick={() => c.url && window.open(c.url, '_blank')}
            >
              <div className="flex justify-between items-start mb-3">
                <span 
                  className="text-[10px] font-bold px-2 py-1 rounded-full text-white uppercase tracking-wider flex items-center gap-1"
                  style={{ backgroundColor: PLATFORM_COLORS[c.platform] }}
                >
                  {c.platform === 'instagram' ? <ImageIcon size={10} /> : <PlayCircle size={10} />}
                  {c.platform}
                </span>
                <span className="text-xs font-bold text-[#FF7EB6] bg-white/80 px-2 py-0.5 rounded-full shadow-sm">
                  {c.trendScore} Score
                </span>
              </div>

              <h4 className="font-bold text-lg mb-2 line-clamp-3 leading-tight" style={{ color: '#4A3B45' }}>{c.title}</h4>
              
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gray-200 to-gray-300" />
                <div className="text-xs font-medium" style={{ color: '#7A6670' }}>{c.creatorHandle}</div>
                {c.format && (
                  <span className="ml-auto text-[10px] bg-[#FFF7FA] text-[#DDA0FF] font-semibold px-2 py-0.5 rounded-md border border-[#FFD6E7]">
                    {c.format}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-4 gap-2 pt-3 border-t border-[#FFD6E7]/50">
                <Stat icon={<Eye size={14} />} value={formatNumber(c.views)} />
                <Stat icon={<Heart size={14} />} value={formatNumber(c.likes)} />
                <Stat icon={<MessageCircle size={14} />} value={formatNumber(c.comments)} />
                <Stat icon={<Activity size={14} />} value={`${c.engagementRate.toFixed(1)}%`} highlight />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
});

function Stat({ icon, value, highlight = false }: { icon: React.ReactNode, value: string, highlight?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1">
      <div className={highlight ? 'text-[#FF7EB6]' : 'text-gray-400'}>{icon}</div>
      <div className={`text-xs font-bold ${highlight ? 'text-[#FF7EB6]' : 'text-gray-600'}`}>{value}</div>
    </div>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}
