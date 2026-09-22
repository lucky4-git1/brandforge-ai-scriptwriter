import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { useBrandStore } from '../state/brandStore';
import { useContentStore } from '../state/contentStore';
import { Loader2, Edit, X, Languages } from 'lucide-react';
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

export function Workspace() {
  const { currentBrand } = useBrandStore();
  const { items, loading, loadContent } = useContentStore();
  const [showEditor, setShowEditor] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [editorContent, setEditorContent] = useState('');
  const [contentId, setContentId] = useState('');
  const [language, setLanguage] = useState<Language>('english');
  const [platform, setPlatform] = useState('');

  useEffect(() => {
    if (currentBrand) loadContent(currentBrand.id);
  }, [currentBrand?.id, loadContent]);

  const handleEdit = (item: any) => {
    setEditorContent(item.content);
    setContentId(item.id);
    const meta = item.metadata as Record<string, unknown>;
    setLanguage((meta?.language as Language) || 'english');
    setPlatform(item.platform);
    setShowEditor(true);
  };

  const handleSave = async (content: string) => {
    if (!contentId) {
      alert('No content ID available. Please select a script to edit.');
      return;
    }
    try {
      await invoke('update_generated_content', { id: contentId, content });
      await loadContent(currentBrand?.id || '');
    } catch (error) {
      console.error('Save failed:', error);
      alert(`Save failed: ${error}`);
    }
  };

  const handleSaveAsVersion = async (content: string, versionName: string) => {
    if (!contentId) {
      alert('No content ID available. Please select a script to edit.');
      return;
    }
    try {
      await invoke('save_content_version', {
        contentId,
        versionName,
        content,
        metadata: {
          language,
          platform,
          content_type: platform === 'tiktok' ? 'script' : 'caption',
          brand_name: currentBrand?.name,
        },
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

  return (
    <div className="p-8 max-w-6xl page-transition">
      <h1 className="text-3xl font-bold mb-2" style={{ color: '#4A3B45' }}>Workspace</h1>
      <p className="text-sm mb-6" style={{ color: '#7A6670' }}>Full video scripts saved from the pipeline</p>
      {loading && <Loader2 className="animate-spin text-[#FF7EB6] mb-4" />}
      
      {!showEditor && (
        <div className="grid gap-6 lg:grid-cols-2">
          {items.map((item) => {
            const meta = item.metadata as Record<string, unknown>;
            const title = (meta?.title as string) || 'Video script';
            const wordCount = (meta?.word_count as number) || item.content.split(/\s+/).length;
            const itemLanguage = (meta?.language as Language) || 'english';
            return (
              <article
                key={item.id}
                className="glass-card overflow-hidden flex flex-col"
              >
                <div className="px-4 py-3 bg-gradient-to-r from-[#FF7EB6] to-[#DDA0FF]">
                  <p className="text-white font-semibold">{title}</p>
                  <p className="text-white/70 text-xs mt-1 capitalize">
                    {item.platform} · {wordCount} words · {item.content_type}
                  </p>
                </div>
                <pre className="p-4 text-sm whitespace-pre-wrap flex-1 overflow-auto max-h-[28rem] leading-relaxed" style={{ color: '#4A3B45' }}>
                  {item.content}
                </pre>
                <div className="px-4 pb-3 flex items-center justify-between">
                  <p className="text-xs" style={{ color: '#7A6670' }}>{item.created_at}</p>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-xs" style={{ color: '#7A6670' }}>
                      <Languages size={14} />
                      {LANGUAGE_OPTIONS.find(l => l.value === itemLanguage)?.label}
                    </div>
                    {currentBrand && <StarRating brandId={currentBrand.id} contentId={item.id} />}
                    <button
                      onClick={() => handleEdit(item)}
                      className="flex items-center gap-2 px-3 py-1 btn-premium text-sm"
                    >
                      <Edit size={14} /> Edit
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {showEditor && (
        <div className="space-y-4">
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

      {!loading && items.length === 0 && (
        <p className="text-center py-8" style={{ color: '#7A6670' }}>No scripts yet. Run the pipeline on Dashboard.</p>
      )}
    </div>
  );
}

function StarRating({
  brandId,
  contentId,
}: {
  brandId: string;
  contentId: string;
}) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [notes, setNotes] = useState('');

  const submitFeedback = async (score: number) => {
    try {
      await invoke('rate_content', {
        payload: {
          brand_id: brandId,
          content_id: contentId,
          rating: score,
          notes: notes.trim() || undefined,
        },
      });
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
    } catch (e) {
      alert(`Failed to submit feedback: ${e}`);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => {
              setRating(star);
              submitFeedback(star);
            }}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(rating)}
            className="text-lg focus:outline-none"
            style={{
              color: star <= (hover || rating) ? '#FFD700' : '#E5E7EB',
              transition: 'color 0.2s',
            }}
          >
            ★
          </button>
        ))}
      </div>
      {rating > 0 && !submitted && (
        <input
          type="text"
          placeholder="Optional notes..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => submitFeedback(rating)}
          className="text-xs px-2 py-1 rounded border border-gray-200 focus:outline-none w-32"
        />
      )}
      {submitted && <span className="text-xs text-green-500 font-medium">Recorded!</span>}
    </div>
  );
}

