import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/tauri';

export interface VoiceProfile {
  tone: string;
  personality: string[];
  forbidden_phrases: string[];
}

export interface AudienceProfile {
  demographics: string;
  psychographics: string;
  pain_points: string[];
}

export interface BrandProfile {
  voice: VoiceProfile;
  audience: AudienceProfile;
  products: string[];
  values: string[];
}

export interface Brand {
  id: string;
  name: string;
  niche: string;
  description: string;
  profile: BrandProfile;
  created_at: string;
  updated_at: string;
}

interface BrandStore {
  brands: Brand[];
  currentBrand: Brand | null;
  loading: boolean;
  setBrand: (brand: Brand) => void;
  loadBrands: () => Promise<void>;
  createBrand: (data: {
    name: string;
    niche: string;
    description?: string;
  }) => Promise<Brand>;
  selectBrand: (id: string) => void;
  updateBrandProfile: (id: string, profile: BrandProfile) => Promise<void>;
}

const defaultProfile = (): BrandProfile => ({
  voice: { tone: 'engaging, authentic', personality: ['bold', 'helpful'], forbidden_phrases: [] },
  audience: { demographics: '18-35', psychographics: 'growth-minded creators', pain_points: ['low engagement'] },
  products: [],
  values: ['authenticity', 'value'],
});

export const useBrandStore = create<BrandStore>()(
  persist(
    (set, get) => ({
      brands: [],
      currentBrand: null,
      loading: false,

      setBrand: (brand) => set({ currentBrand: brand }),

      loadBrands: async () => {
        set({ loading: true });
        try {
          const brands = await invoke<Brand[]>('get_brands');
          set({ brands, currentBrand: get().currentBrand ?? brands[0] ?? null });
        } finally {
          set({ loading: false });
        }
      },

      createBrand: async (data) => {
        const brand = await invoke<Brand>('create_brand', {
          payload: {
            name: data.name,
            niche: data.niche,
            description: data.description ?? '',
            profile: defaultProfile(),
          },
        });
        set((s) => ({
          brands: [brand, ...s.brands],
          currentBrand: brand,
        }));
        return brand;
      },

      updateBrandProfile: async (id, profile) => {
        const updated = await invoke<Brand>('update_brand_profile', {
          brandId: id,
          profile,
        });
        set((s) => ({
          brands: s.brands.map(b => b.id === id ? updated : b),
          currentBrand: s.currentBrand?.id === id ? updated : s.currentBrand,
        }));
      },

      selectBrand: (id) => {
        const brand = get().brands.find((b) => b.id === id);
        if (brand) set({ currentBrand: brand });
      },
    }),
    { name: 'brandforge-brands', partialize: (s) => ({ currentBrand: s.currentBrand }) }
  )
);
