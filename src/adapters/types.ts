// ViralContent - represents a viral content item from any platform
export interface ViralContent {
  id: string;
  title: string;
  platform: 'instagram' | 'tiktok' | 'youtube' | 'reddit';
  views: number;
  likes: number;
  comments: number;
  engagementRate: number;
  creator: string;
  creatorHandle: string;
  publishDate: string;
  trendScore: number;
  thumbnail?: string;
  url?: string;
  description?: string;
  hashtags?: string[];
  format?: string; // Tutorial, Listicle, Storytelling, etc.
}

// PlatformAdapter interface - all platform adapters implement this
export interface PlatformAdapter {
  platform: string;
  fetchViralContent(niche: string, limit?: number): Promise<ViralContent[]>;
  isAvailable(): boolean;
}

export interface TrendOpportunityAnalysis {
  why_it_matters: string;
  target_audience: string;
  suggested_content_angles: string[];
  suggested_hooks: string[];
  suggested_content_formats: string[];
  estimated_opportunity_score: number;
}

// TrendData - enriched trend with scores
export interface TrendData {
  id: string;
  title: string;
  summary: string;
  keywords: string[];
  source: string;
  platform?: string;
  type?: 'topic' | 'video';
  url?: string;
  thumbnail_url?: string;
  view_count?: number;
  published_at?: string;
  created_at: string;

  growth_velocity: number;
  audience_relevance: number;
  source_frequency: number;
  competition_level: number;
  freshness: number;
  trend_score: number;

  analysis?: TrendOpportunityAnalysis;
}

// ResearchQuery
export interface ResearchQuery {
  brandName?: string;
  niche: string;
  industry?: string;
  keywords: string[];
}

// ResearchResult
export interface ResearchResult {
  query: ResearchQuery;
  trends: TrendData[];
  viralContent: ViralContent[];
  hookPatterns: HookPattern[];
  contentFormats: ContentFormat[];
  ctaPatterns: CTAPattern[];
  opportunities: Opportunity[];
  summary: string;
  generatedAt: string;
}

// HookPattern
export interface HookPattern {
  pattern: string;
  examples: string[];
  effectiveness: number; // 0-100
  usageCount: number;
}

// ContentFormat
export interface ContentFormat {
  name: string;
  description: string;
  popularity: number; // 0-100
  engagement: number; // 0-100
  platforms: string[];
}

// CTAPattern
export interface CTAPattern {
  pattern: string;
  conversionRate: number; // 0-100
  examples: string[];
}

// Opportunity
export interface Opportunity {
  id: string;
  title: string;
  description: string;
  opportunityScore: number; // 0-100
  competitionScore: number; // 0-100 (lower = less competition = better)
  growthPotential: number; // 0-100
  demandRating: number; // 0-100
  category: 'underserved' | 'low-competition' | 'emerging' | 'high-demand' | 'viral' | 'whitespace';
  suggestedFormats: string[];
  relatedKeywords: string[];
}

// TimelinePoint
export interface TimelinePoint {
  date: string;
  value: number;
  phase: 'birth' | 'growth' | 'peak' | 'decline';
}

// TrendTimeline
export interface TrendTimelineData {
  trendId: string;
  trendTitle: string;
  points: TimelinePoint[];
}

// SmartFilterState
export interface SmartFilterState {
  platform: string;
  dateRange: '7d' | '30d' | '90d';
  industry: string;
  niche: string;
  contentType: string;
  engagementLevel: string;
  trendStrength: string;
  growthRate: string;
}

export const DEFAULT_FILTERS: SmartFilterState = {
  platform: 'all',
  dateRange: '30d',
  industry: 'all',
  niche: 'all',
  contentType: 'all',
  engagementLevel: 'all',
  trendStrength: 'all',
  growthRate: 'all',
};
