import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/tauri';

export interface GeneratedContent {
  id: string;
  brand_id: string;
  content_type: string;
  platform: string;
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface ContentStore {
  items: GeneratedContent[];
  loading: boolean;
  loadContent: (brandId?: string) => Promise<void>;
  setItems: (items: GeneratedContent[]) => void;
}

export const useContentStore = create<ContentStore>((set) => ({
  items: [],
  loading: false,
  loadContent: async (brandId) => {
    set({ loading: true });
    try {
      const items = await invoke<GeneratedContent[]>('get_workspace_content', {
        brandId: brandId ?? null,
      });
      set({ items });
    } finally {
      set({ loading: false });
    }
  },
  setItems: (items) => set({ items }),
}));
