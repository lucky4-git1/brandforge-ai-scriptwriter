import { memo } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, FileText } from 'lucide-react';

interface Props {
  summary: string;
  niche: string;
}

export const ResearchSummary = memo(({ summary, niche }: Props) => {
  if (!summary) {
    return (
      <div className="glass-card p-6 text-center border-t-4 border-t-[#DDA0FF]">
        <FileText className="mx-auto mb-2 text-[#DDA0FF]/50" size={24} />
        <p className="text-sm font-medium text-[#7A6670]">Run research to generate an AI executive summary.</p>
      </div>
    );
  }

  // Very basic markdown parser for the summary text
  const parseMarkdown = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, i) => {
      if (line.startsWith('### ')) {
        return <h3 key={i} className="text-lg font-bold text-[#4A3B45] mt-6 mb-3">{line.replace('### ', '')}</h3>;
      }
      if (line.startsWith('- ')) {
        return (
          <li key={i} className="text-[#4A3B45] text-sm ml-4 list-disc mb-1">
            {line.replace('- ', '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}
          </li>
        );
      }
      if (line.trim() === '') return null;
      
      // Handle bold
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <p key={i} className="text-[#4A3B45] text-sm leading-relaxed mb-3">
          {parts.map((part, j) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={j} className="font-bold text-[#FF7EB6]">{part.slice(2, -2)}</strong>;
            }
            return part;
          })}
        </p>
      );
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#FF7EB6] via-[#DDA0FF] to-[#FF7EB6]" />
      
      <div className="p-6 md:p-8">
        <div className="flex items-center gap-2 mb-6 border-b border-[#FFD6E7]/50 pb-4">
          <div className="p-2 bg-gradient-to-br from-[#FFD6E7] to-[#FFF7FA] rounded-lg">
             <Sparkles className="text-[#FF7EB6]" size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#4A3B45] leading-tight">AI Executive Summary</h2>
            <p className="text-xs font-semibold text-[#DDA0FF] uppercase tracking-wider">{niche} Intelligence</p>
          </div>
        </div>

        <div className="prose prose-sm max-w-none">
          {parseMarkdown(summary)}
        </div>
      </div>
    </motion.div>
  );
});
