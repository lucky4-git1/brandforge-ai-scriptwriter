import { useState, useEffect } from 'react';
import { History, Trash2, Edit2, Clock, FileText, Languages, RotateCcw, X } from 'lucide-react';
import { invoke } from '@tauri-apps/api/tauri';

interface ContentVersion {
  id: string;
  content_id: string;
  version_number: number;
  version_name: string | null;
  content: string;
  metadata: Record<string, any>;
  created_at: string;
}

interface VersionHistoryProps {
  contentId: string;
  onRestore: (content: string) => void;
  onClose: () => void;
}

export function VersionHistory({ contentId, onRestore, onClose }: VersionHistoryProps) {
  const [versions, setVersions] = useState<ContentVersion[]>([]);
  const [loading, setLoading] = useState(true);

  const loadVersions = async () => {
    setLoading(true);
    try {
      const result = await invoke<ContentVersion[]>('get_content_versions', { contentId });
      setVersions(result);
    } catch (error) {
      console.error('Failed to load versions:', error);
      alert(`Failed to load versions: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVersions();
  }, [contentId]);

  const handleRestore = async (version: ContentVersion) => {
    if (confirm(`Restore version ${version.version_number}? This will replace your current content.`)) {
      onRestore(version.content);
      onClose();
    }
  };

  const handleDelete = async (versionId: string) => {
    if (confirm('Delete this version? This action cannot be undone.')) {
      try {
        await invoke('delete_content_version', { versionId });
        await loadVersions();
      } catch (error) {
        console.error('Failed to delete version:', error);
        alert(`Failed to delete version: ${error}`);
      }
    }
  };

  const handleRename = async (version: ContentVersion) => {
    const name = prompt('Enter new version name:', version.version_name || '');
    if (name !== null) {
      try {
        await invoke('rename_content_version', { versionId: version.id, name });
        await loadVersions();
      } catch (error) {
        console.error('Failed to rename version:', error);
        alert(`Failed to rename version: ${error}`);
      }
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getLanguage = (metadata: Record<string, any>) => {
    return metadata.language || 'English';
  };

  const getContentType = (metadata: Record<string, any>) => {
    return metadata.content_type || 'Script';
  };

  return (
    <div className="glass-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History size={20} className="text-[#FF7EB6]" />
          <h2 className="text-lg font-semibold" style={{ color: '#4A3B45' }}>Version History</h2>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-[#FFD6E7]/50 transition-colors"
        >
          <X size={20} style={{ color: '#7A6670' }} />
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8" style={{ color: '#7A6670' }}>Loading versions...</div>
      ) : versions.length === 0 ? (
        <div className="text-center py-8" style={{ color: '#7A6670' }}>No versions saved yet</div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {versions.map((version) => (
            <div
              key={version.id}
              className="p-4 bg-white/60 backdrop-blur-sm rounded-2xl border border-[#FFD6E7] hover:border-[#FF7EB6] transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold" style={{ color: '#4A3B45' }}>
                      Version {version.version_number}
                    </span>
                    {version.version_name && (
                      <span className="text-sm" style={{ color: '#7A6670' }}>
                        • {version.version_name}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm mb-2" style={{ color: '#7A6670' }}>
                    <div className="flex items-center gap-1">
                      <Clock size={14} />
                      {formatDate(version.created_at)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Languages size={14} />
                      {getLanguage(version.metadata)}
                    </div>
                    <div className="flex items-center gap-1">
                      <FileText size={14} />
                      {getContentType(version.metadata)}
                    </div>
                  </div>

                  <div className="text-sm line-clamp-2" style={{ color: '#7A6670' }}>
                    {version.content.substring(0, 150)}...
                  </div>
                </div>

                <div className="flex items-center gap-1 ml-4">
                  <button
                    onClick={() => handleRestore(version)}
                    className="p-2 rounded-lg hover:bg-[#FFD6E7]/50 transition-colors"
                    title="Restore this version"
                  >
                    <RotateCcw size={16} style={{ color: '#7A6670' }} />
                  </button>
                  <button
                    onClick={() => handleRename(version)}
                    className="p-2 rounded-lg hover:bg-[#FFD6E7]/50 transition-colors"
                    title="Rename version"
                  >
                    <Edit2 size={16} style={{ color: '#7A6670' }} />
                  </button>
                  <button
                    onClick={() => handleDelete(version.id)}
                    className="p-2 rounded-lg hover:bg-red-100 transition-colors"
                    title="Delete version"
                  >
                    <Trash2 size={16} style={{ color: '#FF7EB6' }} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
