use crate::models::brand::TrendRecord;
use chrono::{DateTime, Utc};
use feed_rs::parser;
use uuid::Uuid;

pub async fn fetch_rss_trends(niche: &str, brand_id: Option<&str>) -> Vec<TrendRecord> {
    println!("[RSS] Fetching trends for niche: {}", niche);
    
    let mut trends = Vec::new();
    let client = reqwest::Client::builder()
        .user_agent("BrandForgeAI/0.1")
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .unwrap_or_default();

    let query = urlencoding::encode(niche);
    let url = format!("https://news.google.com/rss/search?q={}&hl=en-US&gl=US&ceid=US:en", query);

    match client.get(&url).send().await {
        Ok(resp) => {
            match resp.bytes().await {
                Ok(bytes) => {
                    match parser::parse(bytes.as_ref()) {
                        Ok(feed) => {
                            println!("[RSS] Found {} entries", feed.entries.len());
                            for (i, entry) in feed.entries.into_iter().take(10).enumerate() {
                                let title = entry
                                    .title
                                    .map(|t| t.content)
                                    .unwrap_or_else(|| "Untitled".into());
                                
                                let summary = entry.summary.map(|s| s.content).unwrap_or_default();
                                let link = entry.links.first().map(|l| l.href.clone());
                                
                                let published_date = entry.published.map(|d| d.with_timezone(&Utc));
                                
                                // Synthesize metrics
                                let age_hours = if let Some(pub_date) = published_date {
                                    ((Utc::now().timestamp() as f64 - pub_date.timestamp() as f64) / 3600.0).max(1.0) as f32
                                } else {
                                    24.0
                                };
                                
                                // News doesn't have direct upvotes, simulate based on ranking (i) and age
                                let growth_velocity = (10.0 / (i as f32 + 1.0) / age_hours).min(1.0);
                                let audience_relevance = 0.6; // General news relevance
                                let source_frequency = 0.9; // News is high frequency
                                let competition_level = (24.0 / age_hours).min(1.0); // Fresher news is more competitive
                                let freshness = (48.0 / age_hours).min(1.0);
                                
                                let trend_score = 
                                    (0.40 * growth_velocity) + 
                                    (0.25 * audience_relevance) + 
                                    (0.15 * source_frequency) + 
                                    (0.10 * competition_level) + 
                                    (0.10 * freshness);

                                trends.push(TrendRecord {
                                    id: Uuid::new_v4().to_string(),
                                    brand_id: brand_id.map(|s| s.to_string()),
                                    source: "google_news".into(),
                                    title: title.clone(),
                                    url: link.clone(),
                                    summary: summary.chars().take(300).collect(),
                                    keywords: extract_keywords(&title, &summary),
                                    created_at: Utc::now().to_rfc3339(),
                                    r#type: Some("topic".into()),
                                    platform: Some("news".into()),
                                    thumbnail_url: None,
                                    view_count: None,
                                    published_at: published_date.map(|d| d.to_rfc3339()).or_else(|| Some(Utc::now().to_rfc3339())),
                                    growth_velocity,
                                    audience_relevance,
                                    source_frequency,
                                    competition_level,
                                    freshness,
                                    trend_score,
                                    analysis: None,
                                    source_platforms: vec!["google_news".to_string()],
                                    source_count: 1,
                                    source_urls: link.into_iter().collect(),
                                    first_seen: published_date.map(|d| d.to_rfc3339()),
                                    last_seen: Some(Utc::now().to_rfc3339()),
                                });
                            }
                        }
                        Err(e) => {
                            println!("[RSS] Failed to parse feed: {}", e);
                        }
                    }
                }
                Err(e) => {
                    println!("[RSS] Failed to read response: {}", e);
                }
            }
        }
        Err(e) => {
            println!("[RSS] Failed to fetch: {}", e);
        }
    }
    
    println!("[RSS] Returning {} trends", trends.len());
    trends
}

fn extract_keywords(title: &str, summary: &str) -> Vec<String> {
    let text = format!("{} {}", title, summary).to_lowercase();
    let stop = [
        "the", "a", "an", "and", "or", "to", "in", "for", "of", "on", "with", "is", "by", "at"
    ];
    let mut words: Vec<String> = text
        .split(|c: char| !c.is_alphanumeric())
        .filter(|w| w.len() > 4 && !stop.contains(&w))
        .map(|w| w.to_string())
        .collect();
    words.sort();
    words.dedup();
    words.truncate(8);
    words
}
