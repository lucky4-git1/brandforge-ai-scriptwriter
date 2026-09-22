import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendTimelineData } from '../../adapters/types';
import { LineChart } from 'lucide-react';

interface Props {
  timelines?: TrendTimelineData[];
}

export function TrendTimeline({ timelines: initialTimelines }: Props) {
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('30d');
  
  // Generate mock data if none provided (for the UI demonstration)
  const timelines = useMemo(() => {
    if (initialTimelines && initialTimelines.length > 0) return initialTimelines;
    
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    
    return [
      {
        trendId: 'mock1',
        trendTitle: 'AI Automation',
        points: Array.from({ length: days }).map((_, i) => ({
          date: new Date(Date.now() - (days - 1 - i) * 86400000).toISOString().split('T')[0],
          value: Math.min(100, Math.max(0, 20 + i * (80/days) + (Math.random() * 15 - 7))),
          phase: (i / days) < 0.2 ? 'birth' : (i / days) < 0.6 ? 'growth' : 'peak' as any
        }))
      },
      {
        trendId: 'mock2',
        trendTitle: 'Short-form Storytelling',
        points: Array.from({ length: days }).map((_, i) => ({
          date: new Date(Date.now() - (days - 1 - i) * 86400000).toISOString().split('T')[0],
          value: Math.min(100, Math.max(0, 90 - i * (50/days) + (Math.random() * 10 - 5))),
          phase: 'decline' as any
        }))
      }
    ];
  }, [initialTimelines, range]);

  const COLORS = ['#FF7EB6', '#DDA0FF', '#4A3B45', '#FFD6E7', '#A78BFA'];
  
  const width = 800;
  const height = 300;
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  // Simple scales
  const days = timelines[0]?.points.length || 0;
  
  const getX = (index: number) => padding.left + (index / Math.max(1, days - 1)) * innerWidth;
  const getY = (value: number) => padding.top + innerHeight - (value / 100) * innerHeight;

  const makePath = (points: {value: number}[]) => {
    if (points.length === 0) return '';
    return points.reduce((path, p, i) => {
      const x = getX(i);
      const y = getY(p.value);
      return i === 0 ? `M ${x},${y}` : `${path} L ${x},${y}`;
    }, '');
  };

  return (
    <div className="glass-card p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <LineChart className="text-[#FF7EB6]" />
          <h2 className="text-xl font-bold text-[#4A3B45]">Trend Lifecycle</h2>
        </div>
        
        <div className="flex gap-2 bg-white/50 p-1 rounded-full border border-white">
          {(['7d', '30d', '90d'] as const).map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                range === r ? 'bg-gradient-to-r from-[#FF7EB6] to-[#DDA0FF] text-white shadow-sm' : 'text-[#7A6670] hover:text-[#4A3B45]'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="relative w-full overflow-x-auto pb-4">
        <div style={{ minWidth: '600px' }}>
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
            {/* Grid lines */}
            {[0, 25, 50, 75, 100].map(v => (
              <g key={v}>
                <line 
                  x1={padding.left} y1={getY(v)} 
                  x2={width - padding.right} y2={getY(v)} 
                  stroke="#FFD6E7" strokeWidth="1" strokeDasharray="4 4" 
                />
                <text x={padding.left - 10} y={getY(v)} fill="#7A6670" fontSize="10" textAnchor="end" dominantBaseline="middle">
                  {v}
                </text>
              </g>
            ))}

            {/* Phase Backgrounds (approximate) */}
            <rect x={padding.left} y={padding.top} width={innerWidth * 0.2} height={innerHeight} fill="#FFD6E7" opacity="0.1" />
            <rect x={padding.left + innerWidth * 0.2} y={padding.top} width={innerWidth * 0.4} height={innerHeight} fill="#DDA0FF" opacity="0.1" />
            <rect x={padding.left + innerWidth * 0.6} y={padding.top} width={innerWidth * 0.4} height={innerHeight} fill="#FF7EB6" opacity="0.05" />
            
            <text x={padding.left + innerWidth * 0.1} y={padding.top + 10} fill="#7A6670" fontSize="10" textAnchor="middle" opacity="0.5" fontWeight="bold">BIRTH</text>
            <text x={padding.left + innerWidth * 0.4} y={padding.top + 10} fill="#7A6670" fontSize="10" textAnchor="middle" opacity="0.5" fontWeight="bold">GROWTH</text>
            <text x={padding.left + innerWidth * 0.8} y={padding.top + 10} fill="#7A6670" fontSize="10" textAnchor="middle" opacity="0.5" fontWeight="bold">PEAK/MATURITY</text>

            {/* Lines */}
            {timelines.map((tl, i) => (
              <motion.path
                key={tl.trendId}
                d={makePath(tl.points)}
                fill="none"
                stroke={COLORS[i % COLORS.length]}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              />
            ))}
          </svg>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-[#FFD6E7]/50">
        {timelines.map((tl, i) => (
          <div key={tl.trendId} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
            <span className="text-sm font-semibold text-[#4A3B45]">{tl.trendTitle}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
