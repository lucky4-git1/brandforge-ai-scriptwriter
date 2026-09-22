import { useEffect, useState } from 'react';
import { useSkillsStore, Skill } from '../state/skillsStore';
import { Plus, Trash2, GripVertical, Upload, X, Minus, Sparkles } from 'lucide-react';

export function Skills() {
  const { availableSkills, activeSkills, addSkill, removeSkill, deleteSkill, importSkill, reorderSkills, initializeDefaultSkills } = useSkillsStore();
  const [draggedItem, setDraggedItem] = useState<Skill | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [importJson, setImportJson] = useState('');

  useEffect(() => {
    initializeDefaultSkills();
  }, [initializeDefaultSkills]);

  const handleDragStart = (skill: Skill) => {
    setDraggedItem(skill);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (!draggedItem) return;

    const fromIndex = activeSkills.findIndex((s) => s.id === draggedItem.id);
    if (fromIndex !== -1 && fromIndex !== index) {
      reorderSkills(fromIndex, index);
    } else if (fromIndex === -1) {
      addSkill(draggedItem);
    }

    setDraggedItem(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverIndex(null);
  };

  const handleImport = () => {
    try {
      const skill = JSON.parse(importJson);
      if (skill.id && skill.name && skill.description) {
        importSkill(skill);
        setImportJson('');
        setShowImport(false);
      } else {
        alert('Invalid skill format. Required fields: id, name, description');
      }
    } catch (error) {
      alert('Invalid JSON format');
    }
  };

  const availableToAdd = availableSkills.filter(
    (skill) => !activeSkills.find((active) => active.id === skill.id)
  );

  return (
    <div className="p-8 max-w-6xl page-transition">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2" style={{ color: '#4A3B45' }}>Skills Panel</h1>
          <p className="text-sm" style={{ color: '#7A6670' }}>Drag and drop skills to customize your workflow ✨</p>
        </div>
        <button
          onClick={() => setShowImport(!showImport)}
          className="flex items-center gap-2 btn-premium"
        >
          <Upload size={18} />
          Import Skill
        </button>
      </div>

      {showImport && (
        <div className="glass-card p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold" style={{ color: '#4A3B45' }}>Import Custom Skill</h2>
            <button onClick={() => setShowImport(false)} style={{ color: '#7A6670' }}>
              <X size={20} />
            </button>
          </div>
          <textarea
            value={importJson}
            onChange={(e) => setImportJson(e.target.value)}
            placeholder='Paste skill JSON here. Example:
{
  "id": "custom-skill",
  "name": "My Custom Skill",
  "description": "Description of your skill",
  "category": "Custom",
  "icon": "🎯",
  "config": {
    "promptInstruction": "Tell the AI exactly how this skill should influence the output."
  }
}'
            rows={8}
            className="w-full input-soft mb-4 resize-none font-mono text-sm"
          />
          <div className="flex gap-3">
            <button
              onClick={handleImport}
              className="btn-premium"
            >
              Import Skill
            </button>
            <button
              onClick={() => setShowImport(false)}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl font-medium transition-all duration-300"
              style={{ color: '#7A6670', background: 'rgba(255, 214, 231, 0.5)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Skills */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold mb-4" style={{ color: '#4A3B45' }}>Active Skills ({activeSkills.length})</h2>
          
          {activeSkills.length === 0 ? (
            <div className="text-center py-12" style={{ color: '#7A6670' }}>
              <Sparkles size={48} className="mx-auto mb-4" style={{ color: '#FFD6E7' }} />
              <p>No active skills</p>
              <p className="text-sm mt-2">Drag skills from available skills to add them</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeSkills.map((skill, index) => (
                <div
                  key={skill.id}
                  draggable
                  onDragStart={() => handleDragStart(skill)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`
                    flex items-center gap-3 p-4 rounded-2xl border-2 transition-all
                    ${dragOverIndex === index ? 'border-[#FF7EB6] bg-white/80' : 'border-[#FFD6E7] bg-white/60 hover:border-[#DDA0FF]'}
                    ${draggedItem?.id === skill.id ? 'opacity-50' : ''}
                  `}
                >
                  <GripVertical className="cursor-move" size={20} style={{ color: '#7A6670' }} />
                  <span className="text-2xl">{skill.icon}</span>
                  <div className="flex-1">
                    <h3 className="font-medium" style={{ color: '#4A3B45' }}>{skill.name}</h3>
                    <p className="text-sm" style={{ color: '#7A6670' }}>{skill.description}</p>
                    <span className="inline-block mt-1 text-xs px-3 py-1 rounded-full font-medium" style={{ color: '#4A3B45', background: 'linear-gradient(135deg, #FFD6E7 0%, #DDA0FF 100%)' }}>
                      {skill.category}
                    </span>
                  </div>
                  <button
                    onClick={() => removeSkill(skill.id)}
                    className="p-2 hover:bg-[#FFD6E7]/50 rounded-xl transition-all duration-300"
                    title="Remove from active skills"
                    style={{ color: '#FF7EB6' }}
                  >
                    <Minus size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Available Skills */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold mb-4" style={{ color: '#4A3B45' }}>Available Skills ({availableToAdd.length})</h2>
          
          {availableToAdd.length === 0 ? (
            <div className="text-center py-12" style={{ color: '#7A6670' }}>
              <Sparkles size={48} className="mx-auto mb-4" style={{ color: '#FFD6E7' }} />
              <p>All skills are active</p>
            </div>
          ) : (
            <div className="space-y-3">
              {availableToAdd.map((skill) => (
                <div
                  key={skill.id}
                  draggable
                  onDragStart={() => handleDragStart(skill)}
                  onDragEnd={handleDragEnd}
                  className="flex items-center gap-3 p-4 rounded-2xl border-2 border-[#FFD6E7] bg-white/60 hover:border-[#DDA0FF] cursor-move transition-all"
                >
                  <GripVertical size={20} style={{ color: '#7A6670' }} />
                  <span className="text-2xl">{skill.icon}</span>
                  <div className="flex-1">
                    <h3 className="font-medium" style={{ color: '#4A3B45' }}>{skill.name}</h3>
                    <p className="text-sm" style={{ color: '#7A6670' }}>{skill.description}</p>
                    <span className="inline-block mt-1 text-xs px-3 py-1 rounded-full font-medium" style={{ color: '#4A3B45', background: 'linear-gradient(135deg, #FFD6E7 0%, #DDA0FF 100%)' }}>
                      {skill.category}
                    </span>
                  </div>
                  <button
                    onClick={() => addSkill(skill)}
                    className="flex items-center gap-1 px-3 py-2 hover:bg-[#FFD6E7]/50 rounded-xl transition-all duration-300 font-medium"
                    style={{ color: '#FF7EB6' }}
                  >
                    <Plus size={16} />
                    Add
                  </button>
                </div>
              ))}
            </div>
          )}

          {availableSkills.filter(s => !s.isDefault).length > 0 && (
            <div className="mt-6 pt-6 border-t" style={{ borderColor: '#FFD6E7' }}>
              <h3 className="text-sm font-medium mb-3" style={{ color: '#7A6670' }}>Custom Skills</h3>
              <div className="space-y-2">
                {availableSkills.filter(s => !s.isDefault).map((skill) => (
                  <div
                    key={skill.id}
                    className="flex items-center gap-3 p-3 rounded-2xl border border-[#FFD6E7] bg-white/60"
                  >
                    <span className="text-xl">{skill.icon}</span>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium" style={{ color: '#4A3B45' }}>{skill.name}</h4>
                      <p className="text-xs" style={{ color: '#7A6670' }}>{skill.description}</p>
                    </div>
                    <button
                      onClick={() => deleteSkill(skill.id)}
                      className="p-1 hover:bg-[#FFD6E7]/50 rounded-xl transition-all duration-300"
                      style={{ color: '#FF7EB6' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
