import { useState, useEffect, useCallback, useRef } from 'react';
import { Save, Copy, Undo, Redo, Search, X, FileText, MoreVertical } from 'lucide-react';

interface ScriptEditorProps {
  initialContent: string;
  language: string;
  onSave: (content: string) => Promise<void>;
  onSaveAsVersion: (content: string, versionName: string) => Promise<void>;
  onChange?: (content: string) => void;
}

export function ScriptEditor({
  initialContent,
  language,
  onSave,
  onSaveAsVersion,
  onChange,
}: ScriptEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [history, setHistory] = useState<string[]>([initialContent]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  
  // Sync with external initialContent changes (e.g. from AI editing or version restore)
  useEffect(() => {
    setContent(prevContent => {
      if (initialContent !== prevContent) {
        setHistory(prevHistory => {
          const newHistory = [...prevHistory, initialContent];
          setHistoryIndex(newHistory.length - 1);
          return newHistory;
        });
        return initialContent;
      }
      return prevContent;
    });
  }, [initialContent]);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autoSaveTimerRef = useRef<number | null>(null);

  // Character and word count
  const charCount = content.length;
  const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;

  // Auto-save every 5 seconds
  useEffect(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(async () => {
      if (content !== initialContent) {
        await handleSave();
      }
    }, 5000);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [content]);

  // Warn before closing if unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (content !== initialContent) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [content, initialContent]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(content);
      setLastSaved(new Date());
    } catch (error) {
      console.error('Save failed:', error);
      alert(`Save failed: ${error}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAsVersion = async () => {
    const versionName = prompt('Enter version name:');
    if (versionName) {
      setIsSaving(true);
      try {
        await onSaveAsVersion(content, versionName);
        setLastSaved(new Date());
      } catch (error) {
        console.error('Save as version failed:', error);
        alert(`Save as version failed: ${error}`);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const newContent = history[newIndex];
      setContent(newContent);
      onChange?.(newContent);
    }
  }, [history, historyIndex, onChange]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const newContent = history[newIndex];
      setContent(newContent);
      onChange?.(newContent);
    }
  }, [history, historyIndex, onChange]);

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newContent);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    onChange?.(newContent);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
  };

  const handleSearch = () => {
    if (!textareaRef.current || !searchTerm) return;
    
    const textarea = textareaRef.current;
    const text = textarea.value;
    const index = text.toLowerCase().indexOf(searchTerm.toLowerCase(), textarea.selectionEnd);
    
    if (index !== -1) {
      textarea.focus();
      textarea.setSelectionRange(index, index + searchTerm.length);
    }
  };

  const handleReplace = () => {
    if (!searchTerm) return;
    const newContent = content.split(searchTerm).join(replaceTerm);
    handleContentChange(newContent);
  };

  const handleReplaceAll = () => {
    if (!searchTerm) return;
    const regex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const newContent = content.replace(regex, replaceTerm);
    handleContentChange(newContent);
  };

  return (
    <div className="glass-card p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: '#4A3B45' }}>Script Editor</h2>
          <div className="flex items-center gap-4 text-sm mt-1" style={{ color: '#7A6670' }}>
            <span>Language: {language}</span>
            <span>•</span>
            <span>{wordCount} words</span>
            <span>•</span>
            <span>{charCount} characters</span>
            {lastSaved && (
              <>
                <span>•</span>
                <span>Last saved: {lastSaved.toLocaleTimeString()}</span>
              </>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Undo/Redo */}
          <button
            onClick={handleUndo}
            disabled={historyIndex === 0}
            className="p-2 rounded-lg hover:bg-white/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Undo"
          >
            <Undo size={18} style={{ color: '#7A6670' }} />
          </button>
          <button
            onClick={handleRedo}
            disabled={historyIndex === history.length - 1}
            className="p-2 rounded-lg hover:bg-white/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Redo"
          >
            <Redo size={18} style={{ color: '#7A6670' }} />
          </button>

          {/* Search */}
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="p-2 rounded-lg hover:bg-white/50 transition-colors"
            title="Search"
          >
            <Search size={18} style={{ color: '#7A6670' }} />
          </button>

          {/* Copy */}
          <button
            onClick={handleCopy}
            className="p-2 rounded-lg hover:bg-white/50 transition-colors"
            title="Copy"
          >
            <Copy size={18} style={{ color: '#7A6670' }} />
          </button>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-[#FF7EB6] to-[#DDA0FF] hover:shadow-lg transition-all duration-300 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>Saving...</>
            ) : (
              <>
                <Save size={16} /> Save
              </>
            )}
          </button>

          {/* More menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-lg hover:bg-white/50 transition-colors"
            >
              <MoreVertical size={18} style={{ color: '#7A6670' }} />
            </button>
            
            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-[#FFD6E7] py-2 z-10">
                <button
                  onClick={handleSaveAsVersion}
                  className="w-full px-4 py-2 text-left hover:bg-[#FFD6E7]/50 transition-colors flex items-center gap-2"
                  style={{ color: '#4A3B45' }}
                >
                  <FileText size={16} /> Save as Version
                </button>
                <button
                  onClick={() => {/* TODO: Implement duplicate */}}
                  className="w-full px-4 py-2 text-left hover:bg-[#FFD6E7]/50 transition-colors flex items-center gap-2"
                  style={{ color: '#4A3B45' }}
                >
                  <Copy size={16} /> Duplicate
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div className="flex items-center gap-2 p-3 bg-white/60 backdrop-blur-sm rounded-2xl border border-[#FFD6E7]">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#7A6670' }} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search..."
              className="w-full pl-10 pr-3 py-2 input-soft"
            />
          </div>
          <input
            type="text"
            value={replaceTerm}
            onChange={(e) => setReplaceTerm(e.target.value)}
            placeholder="Replace..."
            className="w-32 px-3 py-2 input-soft"
          />
          <button
            onClick={handleSearch}
            className="px-3 py-2 btn-premium"
          >
            Find
          </button>
          <button
            onClick={handleReplace}
            className="px-3 py-2 btn-premium"
          >
            Replace
          </button>
          <button
            onClick={handleReplaceAll}
            className="px-3 py-2 btn-premium"
          >
            Replace All
          </button>
          <button
            onClick={() => {
              setShowSearch(false);
              setSearchTerm('');
              setReplaceTerm('');
            }}
            className="p-2 rounded-lg hover:bg-white/50 transition-colors"
          >
            <X size={18} style={{ color: '#7A6670' }} />
          </button>
        </div>
      )}

      {/* Editor */}
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => handleContentChange(e.target.value)}
        className="w-full h-96 p-4 bg-white/60 backdrop-blur-sm rounded-2xl border border-[#FFD6E7] resize-none focus:outline-none focus:ring-2 focus:ring-[#FF7EB6]/30 transition-all"
        style={{ color: '#4A3B45', fontFamily: 'monospace' }}
        placeholder="Start editing your script..."
      />
    </div>
  );
}
