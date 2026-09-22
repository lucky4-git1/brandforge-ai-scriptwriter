use crate::models::brand::TrendRecord;
use chrono::Utc;
use serde_json::Value;
use uuid::Uuid;

pub async fn fetch_youtube_trends(niche: &str, brand_id: Option<&str>) -> Vec<TrendRecord> {
    println!("[YouTube] Fetching trends for niche: {}", niche);
    
    let mut trends = Vec::new();
    let q = format!("{} trends", niche);
    let query = urlencoding::encode(&q);
    
    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .timeout(std::time::Duration::from_secs(12))
        .build()
        .unwrap_or_default();

    let url = format!("https://www.youtube.com/results?search_query={}&sp=CAM%253D", query); // Sorted by upload date

    match client.get(&url).send().await {
        Ok(resp) => {
            match resp.text().await {
                Ok(html) => {
                    // Extract ytInitialData
                    if let Some(start_idx) = html.find("var ytInitialData = ") {
                        let json_start = html[start_idx + 20..].to_string();
                        if let Some(end_idx) = json_start.find(";</script>") {
                            let json_str = &json_start[..end_idx];
                            
                            match serde_json::from_str::<Value>(json_str) {
                                Ok(json) => {
                                    let contents = json["contents"]["twoColumnSearchResultsRenderer"]["primaryContents"]["sectionListRenderer"]["contents"].as_array();
                                    
                                    if let Some(sections) = contents {
                                        for section in sections {
                                            if let Some(items) = section["itemSectionRenderer"]["contents"].as_array() {
                                                for (_, item) in items.iter().take(15).enumerate() {
                                                    if let Some(video) = item.get("videoRenderer") {
                                                        let video_id = video["videoId"].as_str().unwrap_or("");
                                                        if video_id.is_empty() { continue; }
                                                        
                                                        let title = video["title"]["runs"][0]["text"].as_str().unwrap_or("");
                                                        let view_count_text = video["viewCountText"]["simpleText"].as_str().unwrap_or("");
                                                        let published_time_text = video["publishedTimeText"]["simpleText"].as_str().unwrap_or("");
                                                        
                                                        let thumbnail = format!("https://i.ytimg.com/vi/{}/hqdefault.jpg", video_id);
                                                        let video_url = format!("https://www.youtube.com/watch?v={}", video_id);
                                                        
                                                        // Extract views (rough parse)
                                                        let mut views: f32 = 100.0;
                                                        if view_count_text.contains("K") {
                                                            views = view_count_text.replace("K views", "").trim().parse::<f32>().unwrap_or(0.0) * 1000.0;
                                                        } else if view_count_text.contains("M") {
                                                            views = view_count_text.replace("M views", "").trim().parse::<f32>().unwrap_or(0.0) * 1000000.0;
                                                        } else {
                                                            views = view_count_text.replace(" views", "").replace(",", "").trim().parse::<f32>().unwrap_or(100.0);
                                                        }
                                                        
                                                        // Extract age in hours (rough parse)
                                                        let mut age_hours: f32 = 24.0;
                                                        if published_time_text.contains("hour") {
                                                            age_hours = published_time_text.split_whitespace().next().unwrap_or("1").parse().unwrap_or(1.0);
                                                        } else if published_time_text.contains("day") {
                                                            age_hours = published_time_text.split_whitespace().next().unwrap_or("1").parse::<f32>().unwrap_or(1.0) * 24.0;
                                                        } else if published_time_text.contains("week") {
                                                            age_hours = published_time_text.split_whitespace().next().unwrap_or("1").parse::<f32>().unwrap_or(1.0) * 24.0 * 7.0;
                                                        }
                                                        
                                                        // Scoring Metrics
                                                        let growth_velocity = ((views / age_hours) / 10000.0).min(1.0);
                                                        let audience_relevance = 0.8;
                                                        let source_frequency = 0.7;
                                                        let competition_level = (24.0 / age_hours).min(1.0);
                                                        let freshness = (48.0 / age_hours).min(1.0);
                                                        
                                                        let trend_score = 
                                                            (0.40 * growth_velocity) + 
                                                            (0.25 * audience_relevance) + 
                                                            (0.15 * source_frequency) + 
                                                            (0.10 * competition_level) + 
                                                            (0.10 * freshness);

                                                        let is_shorts = video["lengthText"].is_null(); // If no length text, often a short, or we can just say video
                                                        
                                                        trends.push(TrendRecord {
                                                            id: Uuid::new_v4().to_string(),
                                                            brand_id: brand_id.map(|s| s.to_string()),
                                                            source: "youtube".into(),
                                                            title: title.to_string(),
                                                            url: Some(video_url.clone()),
                                                            summary: format!("YouTube video about {} with {} views (published {})", niche, view_count_text, published_time_text),
                                                            keywords: title.split_whitespace().filter(|w| w.len() > 4).map(|w| w.to_lowercase()).take(5).collect(),
                                                            created_at: Utc::now().to_rfc3339(),
                                                            r#type: Some(if is_shorts { "video".into() } else { "video".into() }),
                                                            platform: Some("youtube".into()),
                                                            thumbnail_url: Some(thumbnail),
                                                            view_count: Some(views as i64),
                                                            published_at: Some(Utc::now().to_rfc3339()), // Rough estimate
                                                            growth_velocity,
                                                            audience_relevance,
                                                            source_frequency,
                                                            competition_level,
                                                            freshness,
                                                            trend_score,
                                                            analysis: None,
                                                            source_platforms: vec!["youtube".to_string()],
                                                            source_count: 1,
                                                            source_urls: vec![video_url],
                                                            first_seen: Some(Utc::now().to_rfc3339()),
                                                            last_seen: Some(Utc::now().to_rfc3339()),
                                                        });
                                                        
                                                        if trends.len() >= 8 {
                                                            println!("[YouTube] Returning {} trends (limit reached)", trends.len());
                                                            return trends;
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    } else {
                                        println!("[YouTube] No contents found in JSON");
                                    }
                                }
                                Err(e) => {
                                    println!("[YouTube] Failed to parse JSON: {}", e);
                                }
                            }
                        }
                    } else {
                        println!("[YouTube] ytInitialData not found in HTML");
                    }
                }
                Err(e) => {
                    println!("[YouTube] Failed to read HTML: {}", e);
                }
            }
        }
        Err(e) => {
            println!("[YouTube] Failed to fetch: {}", e);
        }
    }

    println!("[YouTube] Returning {} trends", trends.len());
    trends
}
