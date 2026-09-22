import { useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { useBrandStore } from '../state/brandStore';
import { useContentStore } from '../state/contentStore';
import { useSkillsStore } from '../state/skillsStore';
import { Loader2, Wand2, Languages, Edit, X } from 'lucide-react';
import { ScriptEditor } from '../components/editor/ScriptEditor';
import { VersionHistory } from '../components/editor/VersionHistory';
import { AIEditing } from '../components/editor/AIEditing';
import { ExportEngine } from '../components/editor/ExportEngine';

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

export function ContentGenerator() {
  const { currentBrand } = useBrandStore();
  const { loadContent } = useContentStore();
  const { activeSkills } = useSkillsStore();
  const [topic, setTopic] = useState('');
  const [platform, setPlatform] = useState('tiktok');
  const [language, setLanguage] = useState<Language>('english');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [editorContent, setEditorContent] = useState('');
  const [contentId, setContentId] = useState('');

  const generate = async (type: 'caption' | 'script') => {
    if (!currentBrand || !topic) return;
    setLoading(true);
    setResult('');
    try {
      const res = await invoke<{ content: string; id: string }>(
        type === 'caption' ? 'generate_caption' : 'generate_script',
        {
          context: `Topic: ${topic}`,
          brandId: currentBrand.id,
          platform,
          language,
          activeSkills,
        }
      );
      setResult(res.content);
      setContentId(res.id);
      await loadContent(currentBrand.id);
    } catch (e) {
      setResult(`Error: ${e}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setEditorContent(result);
    setShowEditor(true);
  };

  const handleSave = async (content: string) => {
    if (!contentId) {
      alert('No content ID available. Please generate content first.');
      return;
    }
    try {
      await invoke('update_generated_content', { id: contentId, content });
      setResult(content);
    } catch (error) {
      console.error('Save failed:', error);
      alert(`Save failed: ${error}`);
    }
  };

  const handleSaveAsVersion = async (content: string, versionName: string) => {
    if (!contentId) {
      alert('No content ID available. Please generate content first.');
      return;
    }
    try {
      await invoke('save_content_version', {
        req: {
          content_id: contentId,
          version_name: versionName,
          content,
          metadata: {
            language,
            platform,
            content_type: platform === 'tiktok' ? 'script' : 'caption',
            brand_name: currentBrand?.name,
          },
        }
      });
    } catch (error) {
      console.error('Save as version failed:', error);
      alert(`Save as version failed: ${error}`);
    }
  };

  const handleRestore = (content: string) => {
    setEditorContent(content);
    setShowVersionHistory(false);
  };

  const handleAIEdit = (editedContent: string) => {
    setEditorContent(editedContent);
  };

  const handleExport = async (format: 'txt' | 'md' | 'json' | 'docx' | 'pdf' | 'html' | 'gdocs') => {
    try {
      await ExportEngine.export({
        content: editorContent,
        brandName: currentBrand?.name || 'Brand',
        contentType: platform === 'tiktok' ? 'Script' : 'Caption',
        language,
        exportFormat: format,
      });
    } catch (error) {
      console.error('Export failed:', error);
      alert(`Export failed: ${error}`);
    }
  };

  if (!currentBrand) {
    return (
      <div className="p-8" style={{ color: '#7A6670' }}>Create or select a brand on the Dashboard first.</div>
    );
  }

  return (
    <div className="p-8 max-w-3xl page-transition">
      <h1 className="text-3xl font-bold mb-6" style={{ color: '#4A3B45' }}>Content Generator</h1>
      <div className="glass-card p-6 space-y-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-2" style={{ color: '#7A6670' }}>Platform</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="w-full input-soft"
            >
              <option value="tiktok">TikTok</option>
              <option value="instagram">Instagram</option>
              <option value="youtube">YouTube</option>
              <option value="linkedin">LinkedIn</option>
            </select>
          </div>
          <div className="flex-1">
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
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: '#7A6670' }}>Topic or brief</label>
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Enter your topic or content brief..."
            rows={4}
            className="w-full input-soft resize-none"
          />
        </div>
        <div className="flex gap-3">
          <button
            disabled={loading || !topic}
            onClick={() => generate('caption')}
            className="flex-1 flex items-center justify-center gap-2 btn-premium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Wand2 size={18} />}
            Caption
          </button>
          <button
            disabled={loading || !topic}
            onClick={() => generate('script')}
            className="flex-1 flex items-center justify-center gap-2 btn-premium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Script
          </button>
        </div>
        {result && !showEditor && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Languages size={16} style={{ color: '#FF7EB6' }} />
                <span className="text-sm font-medium" style={{ color: '#7A6670' }}>
                  Generated in: {LANGUAGE_OPTIONS.find(l => l.value === language)?.label}
                </span>
              </div>
              <button
                onClick={handleEdit}
                className="flex items-center gap-2 px-4 py-2 btn-premium"
              >
                <Edit size={16} /> Edit
              </button>
            </div>
            <pre className="p-4 bg-white/60 backdrop-blur-sm rounded-2xl border border-[#FFD6E7] text-sm whitespace-pre-wrap" style={{ color: '#4A3B45' }}>{result}</pre>
          </div>
        )}

        {showEditor && (
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold" style={{ color: '#4A3B45' }}>Script Editor</h2>
              <button
                onClick={() => setShowEditor(false)}
                className="p-2 rounded-lg hover:bg-white/50 transition-colors"
              >
                <X size={20} style={{ color: '#7A6670' }} />
              </button>
            </div>

            <ScriptEditor
              initialContent={editorContent}
              language={language}
              onSave={handleSave}
              onSaveAsVersion={handleSaveAsVersion}
              onChange={setEditorContent}
            />

            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => setShowVersionHistory(true)}
                className="flex-1 px-4 py-2 btn-premium"
              >
                Version History
              </button>
              <button
                onClick={() => handleExport('txt')}
                className="flex-1 px-4 py-2 btn-premium"
              >
                Export TXT
              </button>
              <button
                onClick={() => handleExport('md')}
                className="flex-1 px-4 py-2 btn-premium"
              >
                Export Markdown
              </button>
              <button
                onClick={() => handleExport('json')}
                className="flex-1 px-4 py-2 btn-premium"
              >
                Export JSON
              </button>
              <button
                onClick={() => handleExport('html')}
                className="flex-1 px-4 py-2 btn-premium"
              >
                Export HTML
              </button>
              <button
                onClick={() => handleExport('gdocs')}
                className="flex-1 px-4 py-2 btn-premium"
              >
                Export Google Docs
              </button>
              <button
                onClick={() => handleExport('pdf')}
                className="flex-1 px-4 py-2 btn-premium"
              >
                Export PDF
              </button>
            </div>

            <AIEditing
              content={editorContent}
              language={language}
              tone={currentBrand?.profile?.voice?.tone || 'professional'}
              onEditComplete={handleAIEdit}
            />
          </div>
        )}

        {showVersionHistory && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="max-w-2xl w-full p-4">
              <VersionHistory
                contentId={contentId}
                onRestore={handleRestore}
                onClose={() => setShowVersionHistory(false)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
