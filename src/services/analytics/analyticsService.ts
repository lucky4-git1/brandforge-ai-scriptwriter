import { ViralContent, TrendData, HookPattern, ContentFormat, CTAPattern, Opportunity } from '../../adapters/types';

class AnalyticsService {
  extractHookPatterns(content: ViralContent[], _trends: TrendData[]): HookPattern[] {
    const rawPatterns = [
      { pattern: "Stop doing this if you want to succeed in {niche}", effectiveness: 88, usageCount: 0, examples: [] as string[] },
      { pattern: "The secret nobody tells you about {niche}", effectiveness: 92, usageCount: 0, examples: [] },
      { pattern: "How I grew using {niche}", effectiveness: 85, usageCount: 0, examples: [] },
      { pattern: "3 tools you need for {niche}", effectiveness: 78, usageCount: 0, examples: [] },
      { pattern: "Why your current strategy is failing in {niche}", effectiveness: 82, usageCount: 0, examples: [] },
      { pattern: "Nobody talks about this hack for {niche}", effectiveness: 95, usageCount: 0, examples: [] },
      { pattern: "I tested the viral trick for {niche}", effectiveness: 89, usageCount: 0, examples: [] },
      { pattern: "What is your controversial opinion about {niche}?", effectiveness: 80, usageCount: 0, examples: [] },
    ];

    content.forEach(c => {
      // Very naive matching for mock purposes
      rawPatterns.forEach(p => {
        const regexPattern = p.pattern.replace('{niche}', '(.*)').replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace('\\(.*\\)', '.*');
        if (new RegExp(regexPattern, 'i').test(c.title)) {
          p.usageCount++;
          if (p.examples.length < 2) {
             p.examples.push(c.title);
          }
        }
      });
    });

    // Clean up empty ones, add fallbacks if needed
    const validPatterns = rawPatterns.filter(p => p.usageCount > 0);
    
    if (validPatterns.length === 0) {
      // Return defaults if no exact matches in mock data
      return rawPatterns.slice(0, 4).map(p => ({
        ...p,
        usageCount: Math.floor(Math.random() * 10) + 1,
        examples: [p.pattern.replace('{niche}', 'your niche')]
      }));
    }

    return validPatterns.sort((a,b) => b.effectiveness - a.effectiveness);
  }

  analyzeContentFormats(content: ViralContent[]): ContentFormat[] {
    const formatStats: Record<string, { count: number, totalEngagement: number, platforms: Set<string> }> = {};

    content.forEach(c => {
      const formatName = c.format || 'Standard Video';
      if (!formatStats[formatName]) {
        formatStats[formatName] = { count: 0, totalEngagement: 0, platforms: new Set() };
      }
      formatStats[formatName].count++;
      formatStats[formatName].totalEngagement += c.engagementRate;
      formatStats[formatName].platforms.add(c.platform);
    });

    return Object.entries(formatStats).map(([name, stats]) => ({
      name,
      description: `Format popular on ${Array.from(stats.platforms).join(', ')}`,
      popularity: Math.min(100, (stats.count / content.length) * 200),
      engagement: Math.min(100, stats.totalEngagement / stats.count * 10), // arbitrary scale for mock
      platforms: Array.from(stats.platforms)
    })).sort((a,b) => b.engagement - a.engagement);
  }

  generateCTAPatterns(niche: string): CTAPattern[] {
    return [
      { pattern: "Save this for your next project", conversionRate: 12.5, examples: ["Found this helpful? Save it for later!"] },
      { pattern: "Comment '{keyword}' for the link", conversionRate: 18.2, examples: ["Want the full guide? Comment 'GUIDE' below."] },
      { pattern: "Tag a friend who needs this", conversionRate: 8.7, examples: ["Tag someone trying to grow in " + niche] },
    ];
  }

  identifyOpportunities(trends: TrendData[], _content: ViralContent[], niche: string): Opportunity[] {
    const opportunities: Opportunity[] = [];

    // Analyze high trend score, low content volume keywords
    const topKeywords = new Map<string, number>();
    trends.forEach(t => t.keywords.forEach(k => {
      topKeywords.set(k, (topKeywords.get(k) || 0) + t.trend_score);
    }));

    const sortedKeywords = Array.from(topKeywords.entries()).sort((a, b) => b[1] - a[1]);

    if (sortedKeywords.length > 0) {
      const bestKw = sortedKeywords[0][0];
      opportunities.push({
        id: `opp_1_${niche}`,
        title: `Deep Dive on ${bestKw}`,
        description: `High interest in '${bestKw}' but few detailed guides available. Create a comprehensive tutorial.`,
        opportunityScore: 92,
        competitionScore: 35,
        growthPotential: 88,
        demandRating: 95,
        category: 'underserved',
        suggestedFormats: ['Long-form Video', 'Carousel', 'Detailed Blog'],
        relatedKeywords: [bestKw, `${bestKw} tutorial`, `how to use ${bestKw}`]
      });
    }

    if (sortedKeywords.length > 1) {
      const secondKw = sortedKeywords[1][0];
      opportunities.push({
        id: `opp_2_${niche}`,
        title: `${secondKw} vs Competitors`,
        description: `Audiences are looking for comparisons involving ${secondKw}. A breakdown video could perform well.`,
        opportunityScore: 85,
        competitionScore: 45,
        growthPotential: 80,
        demandRating: 90,
        category: 'high-demand',
        suggestedFormats: ['Shorts', 'Comparison Graphic'],
        relatedKeywords: [secondKw, `best ${secondKw} alternatives`]
      });
    }

    // Add a viral opportunity
    opportunities.push({
        id: `opp_3_${niche}`,
        title: `Mythbusting common ${niche} advice`,
        description: `Contrarian takes are currently going viral across platforms. Call out outdated advice.`,
        opportunityScore: 88,
        competitionScore: 60,
        growthPotential: 95,
        demandRating: 85,
        category: 'viral',
        suggestedFormats: ['TikTok', 'Reels', 'Twitter Thread'],
        relatedKeywords: [`${niche} mistakes`, `stop doing this in ${niche}`]
    });

    return opportunities;
  }
}

export const analyticsService = new AnalyticsService();
