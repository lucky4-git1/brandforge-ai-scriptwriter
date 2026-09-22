import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wand2, Video, Zap, FileText, MessageSquare, Hash, LayoutGrid, Calendar, X, Copy, CheckCircle2 } from 'lucide-react';
import { useBrandStore } from '../../state/brandStore';
import { contentGenerationService } from '../../services/content-generation/contentGenerationService';

type ActionType = 'reels' | 'hooks' | 'scripts' | 'captions' | 'hashtags' | 'carousels' | 'calendar';

export function ContentActions() {
  const { currentBrand } = useBrandStore();
  const [activeAction, setActiveAction] = useState<ActionType | null>(null);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const actions = [
    { id: 'reels', icon: <Video />, title: 'Generate Reel Ideas', desc: '5 viral concepts', gradient: 'from-[#FF7EB6] to-[#DDA0FF]' },
    { id: 'hooks', icon: <Zap />, title: 'Generate Hooks', desc: '10 scroll-stopping hooks', gradient: 'from-[#DDA0FF] to-[#A78BFA]' },
    { id: 'scripts', icon: <FileText />, title: 'Generate Scripts', desc: '60s video script', gradient: 'from-[#60A5FA] to-[#FF7EB6]' },
    { id: 'captions', icon: <MessageSquare />, title: 'Generate Captions', desc: '3 engaging captions', gradient: 'from-[#A78BFA] to-[#F472B6]' },
    { id: 'hashtags', icon: <Hash />, title: 'Generate Hashtags', desc: '30 optimized tags', gradient: 'from-[#2DD4BF] to-[#FF7EB6]' },
    { id: 'carousels', icon: <LayoutGrid />, title: 'Carousel Ideas', desc: '5-slide outline', gradient: 'from-[#FB923C] to-[#F472B6]' },
    { id: 'calendar', icon: <Calendar />, title: 'Content Calendar', desc: '7-day plan', gradient: 'from-[#4ADE80] to-[#FF7EB6]' },
  ] as const;

  const handleGenerate = async (action: ActionType) => {
    if (!currentBrand) return;
    
    setActiveAction(action);
    setIsGenerating(true);
    setGeneratedContent(null);
    setCopied(false);
    
    try {
      const niche = currentBrand.niche;
      const context = "Focus on high-engagement educational content.";
      const brandId = currentBrand.id;
      
      let result = '';
      switch (action) {
        case 'reels': result = await contentGenerationService.generateReelIdeas(niche, context, brandId); break;
        case 'hooks': result = await contentGenerationService.generateHooks(niche, context, brandId); break;
        case 'scripts': result = await contentGenerationService.generateScripts(niche, context, brandId); break;
        case 'captions': result = await contentGenerationService.generateCaptions(niche, context, brandId); break;
        case 'hashtags': result = await contentGenerationService.generateHashtags(niche, context, brandId); break;
        case 'carousels': result = await contentGenerationService.generateCarouselIdeas(niche, context, brandId); break;
        case 'calendar': result = await contentGenerationService.generateContentCalendar(niche, context, brandId); break;
      }
      
      setGeneratedContent(result);
    } catch (e) {
      setGeneratedContent(`Error generating content: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (generatedContent) {
      navigator.clipboard.writeText(generatedContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Wand2 className="text-[#FF7EB6]" />
        <h2 className="text-2xl font-bold text-[#4A3B45]">AI Content Generator</h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
        {actions.map((act) => (
          <motion.button
            key={act.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleGenerate(act.id)}
            disabled={!currentBrand}
            className={`glass-card p-4 text-left flex flex-col items-start gap-3 relative overflow-hidden group ${!currentBrand ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${act.gradient} opacity-0 group-hover:opacity-10 transition-opacity`} />
            <div className={`p-2 rounded-xl bg-gradient-to-br ${act.gradient} text-white shadow-sm`}>
              {act.icon}
            </div>
            <div>
              <h3 className="font-bold text-[#4A3B45] text-sm leading-tight">{act.title}</h3>
              <p className="text-xs text-[#7A6670] mt-1">{act.desc}</p>
            </div>
          </motion.button>
        ))}
      </div>

      {!currentBrand && (
         <div className="p-4 bg-red-50 text-red-500 rounded-xl mb-6 text-sm text-center font-medium border border-red-100">
            Please select a brand from the workspace to generate contextual content.
         </div>
      )}

      <AnimatePresence>
        {(isGenerating || generatedContent) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass-card overflow-hidden"
          >
            <div className="p-4 border-b border-[#FFD6E7]/50 flex justify-between items-center bg-white/30">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#4A3B45] capitalize">{activeAction?.replace('-', ' ')}</span>
                {isGenerating && <span className="text-xs font-semibold text-[#FF7EB6] bg-[#FFD6E7]/50 px-2 py-0.5 rounded-full animate-pulse">Generating...</span>}
              </div>
              <button 
                onClick={() => { setActiveAction(null); setGeneratedContent(null); }}
                className="text-[#7A6670] hover:text-[#4A3B45] transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6">
              {isGenerating ? (
                <div className="space-y-3">
                  <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 w-5/6 bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse" />
                </div>
              ) : (
                <div className="relative group">
                  <div className="whitespace-pre-wrap text-sm text-[#4A3B45] leading-relaxed font-medium">
                    {generatedContent}
                  </div>
                  
                  <button
                    onClick={copyToClipboard}
                    className="absolute top-0 right-0 p-2 bg-white rounded-lg shadow-sm border border-gray-100 text-[#7A6670] hover:text-[#FF7EB6] transition-colors opacity-0 group-hover:opacity-100"
                  >
                    {copied ? <CheckCircle2 size={16} className="text-green-500" /> : <Copy size={16} />}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
