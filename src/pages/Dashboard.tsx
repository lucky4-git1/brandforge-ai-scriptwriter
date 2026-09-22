import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { useBrandStore } from '../state/brandStore';
import { useWorkflow } from '../hooks/useWorkflow';
import { Loader2, Play, Plus, Sparkles, Languages } from 'lucide-react';
import { Link } from 'react-router-dom';

type Language = 'english' | 'telugu' | 'roman-telugu' | 'hindi' | 'hinglish' | 'tamil' | 'tanglish';

const LANGUAGE_OPTIONS: { value: Language; label: string }[] = [
  { value: 'english', label: 'English' },
  { value: 'telugu', label: 'Telugu' },
  { value: 'roman-telugu', label: 'Roman Telugu' },
  { value: 'hindi', label: 'Hindi' },
  { value: 'hinglish', label: 'Hinglish' },
  { value: 'tamil', label: 'Tamil' },
  { value: 'tanglish', label: 'Tanglish' },
];

interface BrandLearning {
  id: string;
  category: string;
  insight: string;
  created_at: string;
}

interface AudienceInsight {
  id: string;
  insight_type: string;
  insight_text: string;
  created_at: string;
}

interface ContentPerformance {
  id: string;
  rating: number;
  notes?: string;
  created_at: string;
}

interface BrandMemorySummary {
  learnings: BrandLearning[];
  insights: AudienceInsight[];
  performance_history: ContentPerformance[];
}

export function Dashboard() {
  const { brands, currentBrand, loadBrands, createBrand, selectBrand } = useBrandStore();
  const { runPipeline, status, steps, streamingContent, error } = useWorkflow();
  const [topic, setTopic] = useState('');
  const [name, setName] = useState('');
  const [niche, setNiche] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [platform, setPlatform] = useState('tiktok');
  const [language, setLanguage] = useState<Language>('english');

  useEffect(() => {
    loadBrands();
  }, [loadBrands]);

  const handleCreate = async () => {
    if (!name || !niche) return;
    await createBrand({ name, niche });
    setShowCreate(false);
    setName('');
    setNiche('');
  };

  return (
    <div className="p-8 max-w-5xl page-transition">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" style={{ color: '#4A3B45' }}>Dashboard</h1>
        <p className="text-sm" style={{ color: '#7A6670' }}>Run the full content pipeline: trends → ideas → scripts ✨</p>
      </div>

      <section className="glass-card p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold" style={{ color: '#4A3B45' }}>Brand</h2>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-2 text-sm bg-gradient-to-r from-[#FF7EB6] to-[#DDA0FF] hover:shadow-lg transition-all duration-300 px-4 py-2 rounded-2xl text-white font-medium"
          >
            <Plus size={16} /> New brand
          </button>
        </div>

        {showCreate && (
          <div className="grid gap-3 mb-4 p-4 bg-white/60 backdrop-blur-sm rounded-2xl border border-[#FFD6E7]">
            <input
              placeholder="Brand name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-soft"
            />
            <input
              placeholder="Niche (e.g. fitness coaching)"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              className="input-soft"
            />
            <button onClick={handleCreate} className="btn-premium">
              Create brand
            </button>
          </div>
        )}

        <select
          value={currentBrand?.id ?? ''}
          onChange={(e) => selectBrand(e.target.value)}
          className="w-full input-soft"
        >
          <option value="">Select a brand…</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} — {b.niche}
            </option>
          ))}
        </select>
      </section>

      {currentBrand && <BrandIntelligence brandId={currentBrand.id} refreshKey={status} />}

      {currentBrand && (
        <section className="glass-card p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={20} className="text-[#FF7EB6]" />
            <h2 className="text-lg font-semibold" style={{ color: '#4A3B45' }}>Full pipeline</h2>
          </div>
          <div className="grid gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#7A6670' }}>Platform</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full input-soft"
              >
                <option value="tiktok">TikTok</option>
                <option value="instagram">Instagram Reels</option>
                <option value="youtube">YouTube Shorts</option>
                <option value="linkedin">LinkedIn</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#7A6670' }}>Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
                className="w-full input-soft"
              >
                {LANGUAGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Video topic — e.g. 5 morning habits that doubled my productivity"
            rows={3}
            className="w-full input-soft mb-4 resize-none"
          />
          <button
            disabled={!topic || status === 'running'}
            onClick={() => runPipeline(topic, platform, language)}
            className="flex items-center gap-2 btn-premium disabled:opacity-50 disabled:cursor-not-allowed w-full justify-center"
          >
            {status === 'running' ? <Loader2 className="animate-spin" size={20} /> : <Play size={20} />}
            {status === 'running' ? 'Running pipeline…' : 'Run full pipeline'}
          </button>

          {error && <p className="mt-4 text-sm" style={{ color: '#FF7EB6' }}>{error}</p>}

          {steps.length > 0 && (
            <ul className="mt-6 space-y-2">
              {['trend_research', 'content_ideas', 'script_writer', 'complete'].map(
                (step) => {
                  const s = steps.find((x) => x.step === step);
                  return (
                    <li key={step} className="flex items-center gap-3 text-sm" style={{ color: '#7A6670' }}>
                      <span
                        className={`w-2 h-2 rounded-full ${
                          s?.status === 'complete'
                            ? 'bg-[#FF7EB6]'
                            : s?.status === 'running'
                            ? 'bg-[#DDA0FF] animate-pulse'
                            : 'bg-[#FFD6E7]'
                        }`}
                      />
                      {step.replace(/_/g, ' ')}
                    </li>
                  );
                }
              )}
            </ul>
          )}

          {streamingContent && (
            <pre className="mt-4 p-4 bg-white/60 backdrop-blur-sm rounded-2xl border border-[#FFD6E7] text-xs whitespace-pre-wrap max-h-48 overflow-auto" style={{ color: '#4A3B45' }}>
              {streamingContent}
            </pre>
          )}

          {status === 'complete' && (
            <div className="mt-4 flex items-center gap-2">
              <Languages size={16} className="text-[#FF7EB6]" />
              <span className="text-sm font-medium" style={{ color: '#7A6670' }}>
                Generated in: {LANGUAGE_OPTIONS.find(l => l.value === language)?.label}
              </span>
            </div>
          )}

          {status === 'complete' && (
            <Link to="/workspace" className="inline-block mt-4 text-sm font-medium hover:underline" style={{ color: '#FF7EB6' }}>
              View generated scripts in workspace →
            </Link>
          )}
        </section>
      )}
    </div>
  );
}

function BrandIntelligence({ brandId, refreshKey }: { brandId: string; refreshKey: string }) {
  const [data, setData] = useState<BrandMemorySummary | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    invoke<BrandMemorySummary>('get_brand_memory_summary', { brandId })
      .then((res) => {
        if (active) setData(res);
      })
      .catch((e) => {
        console.error('Failed to load memory summary:', e);
        if (active) setData({ learnings: [], insights: [], performance_history: [] });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [brandId, refreshKey]);

  if (!data && loading) {
    return (
      <section className="glass-card p-6 mb-6">
        <div className="flex items-center gap-2 text-sm" style={{ color: '#7A6670' }}>
          <Loader2 size={16} className="animate-spin text-[#DDA0FF]" />
          Loading brand intelligence...
        </div>
      </section>
    );
  }

  if (!data) return null;

  const recentLearnings = data.learnings.slice(0, 3);
  const recentInsights = data.insights.slice(0, 3);
  const recentFeedback = data.performance_history.slice(0, 3);

  return (
    <section className="glass-card p-6 mb-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Sparkles size={20} className="text-[#DDA0FF]" />
          <h2 className="text-lg font-semibold" style={{ color: '#4A3B45' }}>Brand Intelligence</h2>
        </div>
        {loading && <Loader2 size={16} className="animate-spin text-[#DDA0FF]" />}
      </div>
      
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white/40 p-4 rounded-2xl border border-[#FFD6E7]">
          <h3 className="text-sm font-medium mb-2" style={{ color: '#4A3B45' }}>Learnings</h3>
          <p className="text-2xl font-bold text-[#FF7EB6]">{data.learnings.length}</p>
          <p className="text-xs mt-1" style={{ color: '#7A6670' }}>Insights extracted from content</p>
          <MemoryList
            empty="Run the pipeline to extract brand learnings."
            items={recentLearnings.map((item) => item.insight)}
          />
        </div>
        <div className="bg-white/40 p-4 rounded-2xl border border-[#FFD6E7]">
          <h3 className="text-sm font-medium mb-2" style={{ color: '#4A3B45' }}>Audience</h3>
          <p className="text-2xl font-bold text-[#FF7EB6]">{data.insights.length}</p>
          <p className="text-xs mt-1" style={{ color: '#7A6670' }}>Core audience insights</p>
          <MemoryList
            empty="Audience signals will appear after new scripts are generated."
            items={recentInsights.map((item) => item.insight_text)}
          />
        </div>
        <div className="bg-white/40 p-4 rounded-2xl border border-[#FFD6E7]">
          <h3 className="text-sm font-medium mb-2" style={{ color: '#4A3B45' }}>Feedback</h3>
          <p className="text-2xl font-bold text-[#FF7EB6]">{data.performance_history.length}</p>
          <p className="text-xs mt-1" style={{ color: '#7A6670' }}>Scripts rated & tracked</p>
          <MemoryList
            empty="Rate scripts in Workspace to train feedback memory."
            items={recentFeedback.map((item) => (
              item.notes ? `${item.rating}/5 - ${item.notes}` : `${item.rating}/5 rating recorded`
            ))}
          />
        </div>
      </div>
    </section>
  );
}

function MemoryList({ items, empty }: { items: string[]; empty: string }) {
  if (items.length === 0) {
    return <p className="text-xs mt-3 leading-relaxed" style={{ color: '#7A6670' }}>{empty}</p>;
  }

  return (
    <ul className="mt-3 space-y-2">
      {items.map((item, index) => (
        <li key={`${index}-${item.slice(0, 16)}`} className="text-xs leading-relaxed line-clamp-3" style={{ color: '#4A3B45' }}>
          {item.replace(/^[-*]\s*/, '')}
        </li>
      ))}
    </ul>
  );
}

