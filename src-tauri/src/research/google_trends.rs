use crate::models::brand::TrendRecord;
use chrono::Utc;
use serde_json::Value;
use uuid::Uuid;

pub async fn fetch_google_trends(niche: &str, brand_id: Option<&str>) -> Vec<TrendRecord> {
    println!("[Google Trends] Fetching trends for niche: {}", niche);
    
    let mut trends = Vec::new();
    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .unwrap_or_default();

    // Google Trends doesn't have a public API, so we'll use the web interface
    // This is a simplified approach - in production, you'd want to use a proper API or service
    let query = urlencoding::encode(niche);
    let url = format!("https://trends.google.com/trends/api/explore?hl=en-US&tz=360&req={{\"comparisonItem\":[{{\"keyword\":\"{}\",\"geo\":\"\",\"time\":\"today 3-m\"}}],\"category\":0,\"property\":\"\"}}", query);

    match client.get(&url).send().await {
        Ok(resp) => {
            match resp.text().await {
                Ok(text) => {
                    // Google Trends returns JSON with a prefix, need to strip it
                    let json_str = text.trim_start_matches(")]}'");
                    
                    match serde_json::from_str::<Value>(json_str) {
                        Ok(json) => {
                            println!("[Google Trends] Successfully parsed response");
                            
                            // Extract related queries and rising searches
                            if let Some(timelines) = json["widgets"].as_array() {
                                for widget in timelines {
                                    if let Some(related_queries) = widget["relatedQueries"]["rankedList"].as_array() {
                                        for (i, query_data) in related_queries.iter().take(8).enumerate() {
                                            if let Some(query) = query_data["query"].as_str() {
                                                if let Some(value) = query_data["value"].as_f64() {
                                                    if value > 50.0 { // Only include significant trends
                                                        let trend_score = (value / 100.0) as f32;
                                                        
                                                        trends.push(TrendRecord {
                                                            id: Uuid::new_v4().to_string(),
                                                            brand_id: brand_id.map(|s| s.to_string()),
                                                            source: "google_trends".into(),
                                                            title: query.to_string(),
                                                            url: Some(format!("https://trends.google.com/trends/explore?q={}", urlencoding::encode(query))),
                                                            summary: format!("Trending search term with interest score of {:.0}", value),
                                                            keywords: query.split_whitespace().filter(|w| w.len() > 4).map(|w| w.to_lowercase()).take(5).collect(),
                                                            created_at: Utc::now().to_rfc3339(),
                                                            r#type: Some("keyword".into()),
                                                            platform: Some("google".into()),
                                                            thumbnail_url: None,
                                                            view_count: Some(value as i64),
                                                            published_at: Some(Utc::now().to_rfc3339()),
                                                            growth_velocity: trend_score,
                                                            audience_relevance: trend_score,
                                                            source_frequency: 0.95, // Google Trends is very high frequency
                                                            competition_level: 1.0 - (i as f32 / 10.0), // Lower ranked = more competitive
                                                            freshness: 1.0, // Google Trends is always fresh
                                                            trend_score,
                                                            analysis: None,
                                                            source_platforms: vec!["google_trends".to_string()],
                                                            source_count: 1,
                                                            source_urls: vec![format!("https://trends.google.com/trends/explore?q={}", urlencoding::encode(query))],
                                                            first_seen: Some(Utc::now().to_rfc3339()),
                                                            last_seen: Some(Utc::now().to_rfc3339()),
                                                        });
                                                    }
                                                }
                                            }
                                        }
                                    }
                                    
                                    if let Some(rising_searches) = widget["risingSearches"]["rankedList"].as_array() {
                                        for search_data in rising_searches.iter().take(5) {
                                            if let Some(query) = search_data["query"].as_str() {
                                                trends.push(TrendRecord {
                                                    id: Uuid::new_v4().to_string(),
                                                    brand_id: brand_id.map(|s| s.to_string()),
                                                    source: "google_trends_rising".into(),
                                                    title: format!("Rising: {}", query),
                                                    url: Some(format!("https://trends.google.com/trends/explore?q={}", urlencoding::encode(query))),
                                                    summary: "Rising search term on Google Trends".to_string(),
                                                    keywords: query.split_whitespace().filter(|w| w.len() > 4).map(|w| w.to_lowercase()).take(5).collect(),
                                                    created_at: Utc::now().to_rfc3339(),
                                                    r#type: Some("keyword".into()),
                                                    platform: Some("google".into()),
                                                    thumbnail_url: None,
                                                    view_count: None,
                                                    published_at: Some(Utc::now().to_rfc3339()),
                                                    growth_velocity: 0.9, // Rising searches have high growth
                                                    audience_relevance: 0.85,
                                                    source_frequency: 0.95,
                                                    competition_level: 0.7,
                                                    freshness: 1.0,
                                                    trend_score: 0.9,
                                                    analysis: None,
                                                    source_platforms: vec!["google_trends".to_string()],
                                                    source_count: 1,
                                                    source_urls: vec![format!("https://trends.google.com/trends/explore?q={}", urlencoding::encode(query))],
                                                    first_seen: Some(Utc::now().to_rfc3339()),
                                                    last_seen: Some(Utc::now().to_rfc3339()),
                                                });
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        Err(e) => {
                            println!("[Google Trends] Failed to parse JSON: {}", e);
                            // Fallback: Generate simulated trends based on niche keywords
                            println!("[Google Trends] Using fallback keyword-based trends");
                            trends = generate_fallback_trends(niche, brand_id);
                        }
                    }
                }
                Err(e) => {
                    println!("[Google Trends] Failed to read response: {}", e);
                    trends = generate_fallback_trends(niche, brand_id);
                }
            }
        }
        Err(e) => {
            println!("[Google Trends] Failed to fetch: {}", e);
            trends = generate_fallback_trends(niche, brand_id);
        }
    }

    println!("[Google Trends] Returning {} trends", trends.len());
    trends
}

fn generate_fallback_trends(niche: &str, brand_id: Option<&str>) -> Vec<TrendRecord> {
    let keywords: Vec<&str> = niche.split_whitespace().collect();
    let mut trends = Vec::new();
    
    for keyword in keywords.iter().take(5) {
        trends.push(TrendRecord {
            id: Uuid::new_v4().to_string(),
            brand_id: brand_id.map(|s| s.to_string()),
            source: "google_trends_fallback".into(),
            title: format!("{} trends", keyword),
            url: Some(format!("https://trends.google.com/trends/explore?q={}", urlencoding::encode(keyword))),
            summary: format!("Search interest for {}", keyword),
            keywords: vec![keyword.to_string()],
            created_at: Utc::now().to_rfc3339(),
            r#type: Some("keyword".into()),
            platform: Some("google".into()),
            thumbnail_url: None,
            view_count: None,
            published_at: Some(Utc::now().to_rfc3339()),
            growth_velocity: 0.7,
            audience_relevance: 0.8,
            source_frequency: 0.9,
            competition_level: 0.6,
            freshness: 0.9,
            trend_score: 0.75,
            analysis: None,
            source_platforms: vec!["google_trends".to_string()],
            source_count: 1,
            source_urls: vec![format!("https://trends.google.com/trends/explore?q={}", urlencoding::encode(keyword))],
            first_seen: Some(Utc::now().to_rfc3339()),
            last_seen: Some(Utc::now().to_rfc3339()),
        });
    }
    
    trends
}
