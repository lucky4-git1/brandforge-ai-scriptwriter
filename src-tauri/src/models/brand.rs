use crate::storage::memory::{AudienceProfile, VoiceProfile};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct BrandProfile {
    pub voice: VoiceProfile,
    pub audience: AudienceProfile,
    pub products: Vec<String>,
    pub values: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Brand {
    pub id: String,
    pub name: String,
    pub niche: String,
    pub description: String,
    pub profile: BrandProfile,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeneratedContentRecord {
    pub id: String,
    pub brand_id: String,
    pub content_type: String,
    pub platform: String,
    pub content: String,
    pub metadata: serde_json::Value,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrendOpportunityAnalysis {
    pub why_it_matters: String,
    pub target_audience: String,
    pub suggested_content_angles: Vec<String>,
    pub suggested_hooks: Vec<String>,
    pub suggested_content_formats: Vec<String>,
    pub suggested_titles: Vec<String>,
    pub suggested_reels: Vec<String>,
    pub suggested_shorts: Vec<String>,
    pub suggested_long_form: Vec<String>,
    pub estimated_opportunity_score: f32,
    pub growth_analysis: String,
    pub key_keywords: Vec<String>,
    pub content_opportunities: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrendRecord {
    pub id: String,
    pub brand_id: Option<String>,
    pub source: String,
    pub title: String,
    pub url: Option<String>,
    pub summary: String,
    pub keywords: Vec<String>,
    pub created_at: String,
    #[serde(default)]
    pub r#type: Option<String>,
    #[serde(default)]
    pub platform: Option<String>,
    #[serde(default)]
    pub thumbnail_url: Option<String>,
    #[serde(default)]
    pub view_count: Option<i64>,
    #[serde(default)]
    pub published_at: Option<String>,

    #[serde(default)]
    pub growth_velocity: f32,
    #[serde(default)]
    pub audience_relevance: f32,
    #[serde(default)]
    pub source_frequency: f32,
    #[serde(default)]
    pub competition_level: f32,
    #[serde(default)]
    pub freshness: f32,
    #[serde(default)]
    pub trend_score: f32,

    #[serde(default)]
    pub analysis: Option<TrendOpportunityAnalysis>,

    // Source attribution fields
    #[serde(default)]
    pub source_platforms: Vec<String>,
    #[serde(default)]
    pub source_count: i32,
    #[serde(default)]
    pub source_urls: Vec<String>,
    #[serde(default)]
    pub first_seen: Option<String>,
    #[serde(default)]
    pub last_seen: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrendAnalysis {
    pub trending_topics: Vec<String>,
    pub viral_hooks: Vec<String>,
    pub engagement_patterns: Vec<String>,
    pub content_angles: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContentIdea {
    pub title: String,
    pub hook: String,
    pub platform: String,
    pub format: String,
    pub rationale: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PipelineResult {
    pub workflow_id: String,
    pub trends: TrendAnalysis,
    pub ideas: Vec<ContentIdea>,
    pub scripts: Vec<GeneratedContentRecord>,
    pub creative_direction: String,
}
