import { ResearchQuery, ResearchResult, ViralContent, HookPattern, ContentFormat } from '../../adapters/types';
import { trendService } from '../trends/trendService';
import { InstagramAdapter } from '../../adapters/instagram.adapter';
import { TiktokAdapter } from '../../adapters/tiktok.adapter';
import { YoutubeAdapter } from '../../adapters/youtube.adapter';
import { RedditAdapter } from '../../adapters/reddit.adapter';
import { analyticsService } from '../analytics/analyticsService';

class ResearchService {
  private adapters = [
    new InstagramAdapter(),
    new TiktokAdapter(),
    new YoutubeAdapter(),
    new RedditAdapter()
  ];

  async runResearch(query: ResearchQuery, brandId: string | null): Promise<ResearchResult> {
    try {
      // 1. Fetch trends from backend via trendService
      const trends = await trendService.getTrends(brandId, query.niche, true);

      // 2. Fetch viral content from all adapters concurrently
      const viralContentPromises = this.adapters.map(adapter => 
        adapter.fetchViralContent(query.niche, 4).catch(e => {
            console.error(`Adapter ${adapter.platform} failed:`, e);
            return [] as ViralContent[];
        })
      );
      const viralContentArrays = await Promise.all(viralContentPromises);
      const allViralContent = viralContentArrays.flat();

      // 3. Generate AI analysis using analyticsService (compute-based)
      const hookPatterns = analyticsService.extractHookPatterns(allViralContent, trends);
      const contentFormats = analyticsService.analyzeContentFormats(allViralContent);
      const ctaPatterns = analyticsService.generateCTAPatterns(query.niche);
      const opportunities = analyticsService.identifyOpportunities(trends, allViralContent, query.niche);

      // 4. Generate Executive Summary
      const summary = this.generateExecutiveSummary(query, trends, hookPatterns, contentFormats);

      return {
        query,
        trends,
        viralContent: allViralContent,
        hookPatterns,
        contentFormats,
        ctaPatterns,
        opportunities,
        summary,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('ResearchService error:', error);
      throw new Error('Failed to run research. Please try again.');
    }
  }

  private generateExecutiveSummary(
    query: ResearchQuery, 
    trends: any[], 
    hooks: HookPattern[], 
    formats: ContentFormat[]
  ): string {
    const topFormat = formats.sort((a,b) => b.popularity - a.popularity)[0]?.name || 'Video Tutorials';
    const topHook = hooks.sort((a,b) => b.effectiveness - a.effectiveness)[0]?.pattern || 'Question-based hooks';
    const trendCount = trends.length;

    return `The **${query.niche}** space is currently showing strong engagement signals. We identified ${trendCount} key trends driving conversation.

### Top Performing Formats
Currently, **${topFormat}** are seeing the highest engagement, particularly when they focus on actionable advice. Other strong formats include:
${formats.slice(1, 3).map(f => `- ${f.name}`).join('\n')}

### Most Common Hooks
Creators are successfully capturing attention using:
${hooks.slice(0, 3).map(h => `- "${h.pattern}"`).join('\n')}

### Recommended Direction
Focus on creating ${topFormat.toLowerCase()} that address immediate pain points in ${query.niche}. Use curiosity-driven hooks like "${topHook}" and ensure your content delivers value within the first 5 seconds. Incorporate rising keywords like ${trends[0]?.keywords[0] || 'efficiency'} and ${trends[1]?.keywords[0] || 'growth'} to maximize discoverability.`;
  }
}

export const researchService = new ResearchService();
