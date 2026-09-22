import { invoke } from '@tauri-apps/api/tauri';

class ContentGenerationService {
  async generateReelIdeas(niche: string, context: string, brandId: string | null): Promise<string> {
    return this.invokeBackend('generate_caption', brandId, 'instagram', `Generate 5 viral Reel ideas for the ${niche} niche based on this trend context: ${context}`);
  }

  async generateHooks(niche: string, context: string, brandId: string | null): Promise<string> {
    return this.invokeBackend('generate_caption', brandId, 'tiktok', `Generate 10 scroll-stopping hooks for the ${niche} niche based on this trend context: ${context}`);
  }

  async generateScripts(niche: string, context: string, brandId: string | null): Promise<string> {
    return this.invokeBackend('generate_script', brandId, 'tiktok', `Write a full 60-second video script for the ${niche} niche based on this trend context: ${context}`);
  }

  async generateCaptions(niche: string, context: string, brandId: string | null): Promise<string> {
     return this.invokeBackend('generate_caption', brandId, 'instagram', `Write 3 engaging Instagram captions for the ${niche} niche based on this trend context: ${context}`);
  }

  async generateHashtags(niche: string, context: string, brandId: string | null): Promise<string> {
     return this.invokeBackend('generate_caption', brandId, 'instagram', `Generate a list of 30 optimized hashtags for the ${niche} niche categorized by size, based on this context: ${context}`);
  }

  async generateCarouselIdeas(niche: string, context: string, brandId: string | null): Promise<string> {
     return this.invokeBackend('generate_caption', brandId, 'linkedin', `Generate a 5-slide carousel outline for the ${niche} niche based on this context: ${context}`);
  }

  async generateContentCalendar(niche: string, context: string, brandId: string | null): Promise<string> {
     return this.invokeBackend('generate_script', brandId, 'youtube', `Create a 7-day content calendar for the ${niche} niche based on this context: ${context}`);
  }

  private async invokeBackend(command: string, brandId: string | null, platform: string, prompt: string): Promise<string> {
    try {
      if (!brandId) {
          throw new Error("Brand must be selected to generate content");
      }
      const result = await invoke<{content: string, id: string}>(command, {
        brandId,
        platform,
        language: 'english',
        context: prompt,
        activeSkills: []
      });
      return result.content;
    } catch (error) {
      console.error(`ContentGenerationService ${command} error:`, error);
      throw new Error(typeof error === 'string' ? error : 'Generation failed');
    }
  }
}

export const contentGenerationService = new ContentGenerationService();
