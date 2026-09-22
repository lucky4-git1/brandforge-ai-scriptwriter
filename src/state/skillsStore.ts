import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Skill {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  isDefault: boolean;
  config?: Record<string, any>;
}

interface SkillsStore {
  availableSkills: Skill[];
  activeSkills: Skill[];
  addSkill: (skill: Skill) => void;
  removeSkill: (id: string) => void;
  deleteSkill: (id: string) => void;
  importSkill: (skill: Skill) => void;
  reorderSkills: (fromIndex: number, toIndex: number) => void;
  initializeDefaultSkills: () => void;
}

const defaultSkills: Skill[] = [
  {
    id: 'content-creator',
    name: 'Content Creator',
    description: 'Generate engaging content ideas and posts',
    category: 'Creation',
    icon: '✨',
    isDefault: true,
    config: {
      platforms: ['tiktok', 'instagram', 'youtube', 'linkedin'],
      outputTypes: ['ideas', 'captions', 'hashtags']
    }
  },
  {
    id: 'script-writer',
    name: 'Content Script Writer',
    description: 'Write compelling video scripts and outlines',
    category: 'Writing',
    icon: '📝',
    isDefault: true,
    config: {
      scriptTypes: ['short-form', 'long-form', 'tutorial', 'story'],
      toneOptions: ['casual', 'professional', 'humorous', 'educational']
    }
  },
  {
    id: 'trend-analyzer',
    name: 'Trend Analyzer',
    description: 'Analyze trending topics and viral content',
    category: 'Analytics',
    icon: '📊',
    isDefault: true,
    config: {
      platforms: ['tiktok', 'instagram', 'youtube', 'twitter'],
      timeframes: ['24h', '7d', '30d']
    }
  },
  {
    id: 'content-manager',
    name: 'Content Manager',
    description: 'Organize and manage content calendar',
    category: 'Management',
    icon: '📅',
    isDefault: true,
    config: {
      features: ['scheduling', 'calendar', 'analytics', 'team-collaboration']
    }
  }
];

export const useSkillsStore = create<SkillsStore>()(
  persist(
    (set) => ({
      availableSkills: [],
      activeSkills: [],

      addSkill: (skill) => {
        set((state) => ({
          activeSkills: [...state.activeSkills, skill]
        }));
      },

      removeSkill: (id) => {
        set((state) => ({
          activeSkills: state.activeSkills.filter((s) => s.id !== id)
        }));
      },

      deleteSkill: (id) => {
        set((state) => {
          const skill = state.availableSkills.find((s) => s.id === id);
          if (skill?.isDefault) return state; // Don't delete default skills
          return {
            availableSkills: state.availableSkills.filter((s) => s.id !== id),
            activeSkills: state.activeSkills.filter((s) => s.id !== id)
          };
        });
      },

      importSkill: (skill) => {
        set((state) => {
          const exists = state.availableSkills.find((s) => s.id === skill.id);
          if (exists) return state;
          return {
            availableSkills: [...state.availableSkills, { ...skill, isDefault: false }]
          };
        });
      },

      reorderSkills: (fromIndex, toIndex) => {
        set((state) => {
          const newSkills = [...state.activeSkills];
          const [removed] = newSkills.splice(fromIndex, 1);
          newSkills.splice(toIndex, 0, removed);
          return { activeSkills: newSkills };
        });
      },

      initializeDefaultSkills: () => {
        set((state) => {
          if (state.availableSkills.length === 0) {
            return { availableSkills: defaultSkills };
          }
          return state;
        });
      }
    }),
    { name: 'brandforge-skills' }
  )
);
