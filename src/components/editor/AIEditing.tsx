import { useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { Sparkles, Minus, Plus, Zap, Heart, Briefcase, RotateCcw, Languages } from 'lucide-react';

export type AIEditAction = 
  | 'shorten'
  | 'expand'
  | 'improve-hook'
  | 'improve-cta'
  | 'emotional'
  | 'professional'
  | 'rewrite'
  | 'translate'
  | 'convert-language';

interface AIEditingProps {
  content: string;
  language: string;
  tone: string;
  onEditComplete: (editedContent: string) => void;
}

interface AIEditOption {
  id: AIEditAction;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const AI_EDIT_OPTIONS: AIEditOption[] = [
  {
    id: 'shorten',
    label: 'Shorten',
    icon: <Minus size={16} />,
    description: 'Make content more concise',
  },
  {
    id: 'expand',
    label: 'Expand',
    icon: <Plus size={16} />,
    description: 'Add more detail and depth',
  },
  {
    id: 'improve-hook',
    label: 'Improve Hook',
    icon: <Zap size={16} />,
    description: 'Make the opening more engaging',
  },
  {
    id: 'improve-cta',
    label: 'Improve CTA',
    icon: <Sparkles size={16} />,
    description: 'Strengthen call to action',
  },
  {
    id: 'emotional',
    label: 'More Emotional',
    icon: <Heart size={16} />,
    description: 'Add emotional resonance',
  },
  {
    id: 'professional',
    label: 'More Professional',
    icon: <Briefcase size={16} />,
    description: 'Enhance professional tone',
  },
  {
    id: 'rewrite',
    label: 'Rewrite',
    icon: <RotateCcw size={16} />,
    description: 'Completely rephrase content',
  },
  {
    id: 'translate',
    label: 'Translate',
    icon: <Languages size={16} />,
    description: 'Translate to another language',
  },
];

export function AIEditing({ content, language, tone, onEditComplete }: AIEditingProps) {
  const [loading, setLoading] = useState<AIEditAction | null>(null);

  const testInference = async () => {
    try {
      console.log('Testing InferenceManager...');
      const result = await invoke<{ result: string; provider: string; model: string }>('test_inference');
      console.log('Test inference result:', result);
      alert(`Test inference successful using ${result.provider} / ${result.model}: ${result.result}`);
    } catch (error) {
      console.error('Test inference failed:', error);
      alert(`Test inference failed: ${error}`);
    }
  };

  const handleAIEdit = async (action: AIEditAction) => {
    setLoading(action);
    try {
      console.log('Starting AI edit:', action, 'Language:', language, 'Tone:', tone);
      console.log('Content length:', content.length);
      
      const result = await invoke<{ content: string }>('ai_edit_content', {
        req: {
          content,
          action,
          language,
          tone,
        }
      });
      
      console.log('AI edit result length:', result.content.length);
      console.log('AI edit result preview:', result.content.substring(0, 100));
      
      onEditComplete(result.content);
    } catch (error) {
      console.error('AI edit failed:', error);
      alert(`AI edit failed: ${error}`);
    } finally {
      setLoading(null);
    }
  };

  const handleTranslate = async () => {
    const targetLanguage = prompt('Enter target language (e.g., Spanish, French, German):');
    if (targetLanguage) {
      setLoading('translate');
      try {
        console.log('Starting translation to:', targetLanguage);
        const result = await invoke<{ content: string }>('ai_edit_content', {
          req: {
            content,
            action: 'translate',
            language,
            tone,
            targetLanguage,
          }
        });
        console.log('Translation result:', result);
        onEditComplete(result.content);
      } catch (error) {
        console.error('Translation failed:', error);
        alert(`Translation failed: ${error}`);
      } finally {
        setLoading(null);
      }
    }
  };

  const handleConvertLanguage = async () => {
    const options = ['Roman Telugu', 'Hinglish', 'Tanglish', 'English'];
    const targetLanguage = prompt(`Enter target format:\n${options.join('\n')}`);
    if (targetLanguage && options.includes(targetLanguage)) {
      setLoading('convert-language');
      try {
        console.log('Starting language conversion to:', targetLanguage);
        const result = await invoke<{ content: string }>('ai_edit_content', {
          req: {
            content,
            action: 'convert-language',
            language,
            tone,
            targetLanguage,
          }
        });
        console.log('Language conversion result:', result);
        onEditComplete(result.content);
      } catch (error) {
        console.error('Language conversion failed:', error);
        alert(`Language conversion failed: ${error}`);
      } finally {
        setLoading(null);
      }
    }
  };

  return (
    <div className="glass-card p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles size={20} className="text-[#FF7EB6]" />
        <h2 className="text-lg font-semibold" style={{ color: '#4A3B45' }}>AI-Assisted Editing</h2>
        <button
          onClick={testInference}
          className="ml-auto px-3 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded"
          style={{ color: '#4A3B45' }}
        >
          Test AI
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {AI_EDIT_OPTIONS.map((option) => (
          <button
            key={option.id}
            onClick={() => {
              if (option.id === 'translate') {
                handleTranslate();
              } else if (option.id === 'convert-language') {
                handleConvertLanguage();
              } else {
                handleAIEdit(option.id);
              }
            }}
            disabled={loading !== null}
            className="flex flex-col items-center gap-2 p-4 bg-white/60 backdrop-blur-sm rounded-2xl border border-[#FFD6E7] hover:border-[#FF7EB6] hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="p-2 rounded-full bg-gradient-to-r from-[#FF7EB6] to-[#DDA0FF] text-white">
              {loading === option.id ? (
                <div className="animate-spin">⟳</div>
              ) : (
                option.icon
              )}
            </div>
            <span className="text-sm font-medium" style={{ color: '#4A3B45' }}>{option.label}</span>
            <span className="text-xs text-center" style={{ color: '#7A6670' }}>{option.description}</span>
          </button>
        ))}
      </div>

      <div className="text-xs" style={{ color: '#7A6670' }}>
        <strong>Note:</strong> AI editing preserves your selected language, tone, and brand voice settings.
      </div>
    </div>
  );
}
