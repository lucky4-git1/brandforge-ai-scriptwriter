use crate::models::brand::TrendRecord;
use chrono::Utc;
use serde_json::Value;
use uuid::Uuid;

pub async fn fetch_reddit_trends(niche: &str, brand_id: Option<&str>) -> Vec<TrendRecord> {
    println!("[Reddit] Fetching trends for niche: {}", niche);
    
    let client = reqwest::Client::builder()
        .user_agent("BrandForgeAI/0.1 (local research)")
        .timeout(std::time::Duration::from_secs(12))
        .build()
        .unwrap_or_default();

    let mut trends = Vec::new();

    // Query Reddit search API across all subreddits
    let query = urlencoding::encode(niche);
    let url = format!("https://www.reddit.com/search.json?q={}&sort=hot&limit=15", query);

    match client.get(&url).send().await {
        Ok(resp) => {
            match resp.json::<Value>().await {
                Ok(json) => {
                    if let Some(children) = json["data"]["children"].as_array() {
                        println!("[Reddit] Found {} posts", children.len());
                        for item in children {
                            let data = &item["data"];
                            
                            let title = data["title"].as_str().unwrap_or("").to_string();
                            if title.is_empty() || data["promoted"].as_bool().unwrap_or(false) {
                                continue;
                            }

                            let sub = data["subreddit"].as_str().unwrap_or("unknown");
                            let permalink = data["permalink"].as_str().unwrap_or("");
                            let url = format!("https://www.reddit.com{}", permalink);
                            
                            let score = data["score"].as_f64().unwrap_or(100.0) as f32;
                            let num_comments = data["num_comments"].as_f64().unwrap_or(0.0) as f32;
                            let upvote_ratio = data["upvote_ratio"].as_f64().unwrap_or(0.5) as f32;
                            let created_utc = data["created_utc"].as_f64().unwrap_or_else(|| Utc::now().timestamp() as f64);
                            
                            // Synthesize scoring metrics
                            let age_hours = ((Utc::now().timestamp() as f64 - created_utc) / 3600.0).max(1.0) as f32;
                            
                            // growth_velocity: upvotes + comments per hour
                            let growth_velocity = ((score + num_comments * 2.0) / age_hours).min(100.0) / 100.0;
                            
                            // audience_relevance: upvote ratio
                            let audience_relevance = upvote_ratio;
                            
                            // source_frequency: Reddit is a high-frequency source, let's say 0.8
                            let source_frequency = 0.8;
                            
                            // competition_level: inverse of age (newer = less competition)
                            let competition_level = (24.0 / age_hours).min(1.0);
                            
                            // freshness: based on age (newer = fresher)
                            let freshness = (24.0 / age_hours).min(1.0);
                            
                            // Calculate trend_score
                            let trend_score = 
                                (0.40 * growth_velocity) + 
                                (0.25 * audience_relevance) + 
                                (0.15 * source_frequency) + 
                                (0.10 * competition_level) + 
                                (0.10 * freshness);

                            trends.push(TrendRecord {
                                id: Uuid::new_v4().to_string(),
                                brand_id: brand_id.map(|s| s.to_string()),
                                source: format!("reddit/r/{}", sub),
                                title: title.clone(),
                                url: Some(url.clone()),
                                summary: format!("Hot discussion in r/{} related to {}", sub, niche),
                                keywords: title
                                    .split_whitespace()
                                    .filter(|w| w.len() > 4)
                                    .map(|w| w.to_lowercase())
                                    .take(6)
                                    .collect(),
                                created_at: Utc::now().to_rfc3339(),
                                r#type: Some("topic".into()),
                                platform: Some("reddit".into()),
                                thumbnail_url: None,
                                view_count: Some(score as i64),
                                published_at: Some(Utc::now().to_rfc3339()),
                                growth_velocity,
                                audience_relevance,
                                source_frequency,
                                competition_level,
                                freshness,
                                trend_score,
                                analysis: None,
                                source_platforms: vec!["reddit".to_string()],
                                source_count: 1,
                                source_urls: vec![url],
                                first_seen: Some(Utc::now().to_rfc3339()),
                                last_seen: Some(Utc::now().to_rfc3339()),
                            });
                        }
                    } else {
                        println!("[Reddit] No children found in response");
                    }
                }
                Err(e) => {
                    println!("[Reddit] Failed to parse JSON: {}", e);
                }
            }
        }
        Err(e) => {
            println!("[Reddit] Failed to fetch: {}", e);
        }
    }

    println!("[Reddit] Returning {} trends", trends.len());
    trends
}
