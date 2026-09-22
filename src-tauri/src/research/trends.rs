use crate::error::AppError;
use crate::models::brand::{TrendRecord, TrendAnalysis};
use crate::research::clustering::{cluster_keywords, rank_trends, viral_patterns};
use crate::research::reddit::fetch_reddit_trends;
use crate::research::rss_feed::fetch_rss_trends;
use crate::research::youtube::fetch_youtube_trends;
use crate::research::google_trends::fetch_google_trends;
use crate::storage::sqlite;

pub struct TrendEngine;

impl TrendEngine {
    pub fn new() -> Self {
        Self
    }

    pub async fn research(
        &self,
        niche: &str,
        brand_id: Option<&str>,
    ) -> Result<Vec<TrendRecord>, AppError> {
        println!("[TrendEngine] Starting research for niche: {}", niche);
        let mut all = Vec::new();

        // Fetch from multiple sources
        println!("[TrendEngine] Fetching from RSS...");
        all.extend(fetch_rss_trends(niche, brand_id).await);
        
        println!("[TrendEngine] Fetching from Reddit...");
        all.extend(fetch_reddit_trends(niche, brand_id).await);
        
        println!("[TrendEngine] Fetching from YouTube...");
        all.extend(fetch_youtube_trends(niche, brand_id).await);
        
        println!("[TrendEngine] Fetching from Google Trends...");
        all.extend(fetch_google_trends(niche, brand_id).await);

        println!("[TrendEngine] Total trends fetched: {}", all.len());

        if all.is_empty() {
            return Err(AppError::TrendError("Unable to retrieve trend data from any source".into()));
        }

        // Apply brand-aware filtering if brand_id is provided
        let filtered = if let Some(bid) = brand_id {
            println!("[TrendEngine] Applying brand-aware filtering for brand: {}", bid);
            apply_brand_filtering(all, niche)
        } else {
            all
        };

        println!("[TrendEngine] Trends after filtering: {}", filtered.len());

        println!("[TrendEngine] Ranking trends...");
        let ranked = rank_trends(filtered);
        
        println!("[TrendEngine] Saving to database...");
        sqlite::insert_trends(&ranked)?;
        
        println!("[TrendEngine] Research complete. Returning {} trends", ranked.len());
        Ok(ranked)
    }

    pub fn build_analysis(trends: &[TrendRecord]) -> TrendAnalysis {
        let keywords = cluster_keywords(trends);
        let patterns = viral_patterns(trends);
        TrendAnalysis {
            trending_topics: trends.iter().take(5).map(|t| t.title.clone()).collect(),
            viral_hooks: trends
                .iter()
                .take(5)
                .map(|t| format!("Why {} is changing everything in {}", t.title, "your niche"))
                .collect(),
            engagement_patterns: patterns,
            content_angles: keywords
                .into_iter()
                .take(5)
                .map(|k| format!("Create content around: {}", k))
                .collect(),
        }
    }
}

// Apply brand-aware filtering to trends
fn apply_brand_filtering(trends: Vec<TrendRecord>, brand_niche: &str) -> Vec<TrendRecord> {
    let niche_keywords: Vec<&str> = brand_niche.split_whitespace().collect();
    let niche_lower = brand_niche.to_lowercase();
    
    trends
        .into_iter()
        .filter(|trend| {
            // Calculate brand relevance score
            let title_lower = trend.title.to_lowercase();
            let summary_lower = trend.summary.to_lowercase();
            
            // Check if trend contains niche keywords
            let keyword_match = niche_keywords.iter().any(|kw| {
                title_lower.contains(&kw.to_lowercase()) || 
                summary_lower.contains(&kw.to_lowercase())
            });
            
            // Check if trend keywords overlap with niche
            let keyword_overlap = trend.keywords.iter().any(|kw| {
                niche_lower.contains(&kw.to_lowercase()) || 
                kw.to_lowercase().contains(&niche_lower)
            });
            
            // Boost score for relevant trends
            if keyword_match || keyword_overlap {
                true
            } else {
                // Keep trends with high scores even if not directly related
                trend.trend_score > 0.7
            }
        })
        .map(|mut trend| {
            // Boost audience_relevance for brand-matching trends
            let title_lower = trend.title.to_lowercase();
            if niche_keywords.iter().any(|kw| title_lower.contains(&kw.to_lowercase())) {
                trend.audience_relevance = (trend.audience_relevance + 0.2).min(1.0);
                // Recalculate trend_score
                trend.trend_score = 
                    (0.40 * trend.growth_velocity) + 
                    (0.25 * trend.audience_relevance) + 
                    (0.15 * trend.source_frequency) + 
                    (0.10 * trend.competition_level) + 
                    (0.10 * trend.freshness);
            }
            trend
        })
        .collect()
}
