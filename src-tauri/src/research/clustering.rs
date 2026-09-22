use crate::models::brand::TrendRecord;
use std::collections::HashMap;

pub fn cluster_keywords(trends: &[TrendRecord]) -> Vec<String> {
    let mut freq: HashMap<String, usize> = HashMap::new();
    for t in trends {
        for kw in &t.keywords {
            *freq.entry(kw.clone()).or_insert(0) += 1;
        }
        for word in t.title.to_lowercase().split_whitespace() {
            if word.len() > 4 {
                *freq.entry(word.to_string()).or_insert(0) += 1;
            }
        }
    }
    let mut sorted: Vec<_> = freq.into_iter().collect();
    sorted.sort_by(|a, b| b.1.cmp(&a.1));
    sorted.into_iter().take(15).map(|(k, _)| k).collect()
}

pub fn viral_patterns(trends: &[TrendRecord]) -> Vec<String> {
    let mut patterns = vec![
        "Curiosity-gap hooks in first 2 seconds".into(),
        "Problem-agitate-solve structure".into(),
        "Before/after visual contrast".into(),
    ];
    if trends.iter().any(|t| t.source.contains("reddit")) {
        patterns.push("Community discussion threads as content seeds".into());
    }
    if trends.iter().any(|t| t.source.contains("youtube")) {
        patterns.push("Tutorial + personal story hybrid formats".into());
    }
    if trends.iter().any(|t| t.source.contains("google_trends")) {
        patterns.push("Search-optimized titles and descriptions".into());
    }
    patterns
}

pub fn rank_trends(mut trends: Vec<TrendRecord>) -> Vec<TrendRecord> {
    use std::collections::HashMap;
    
    // Group trends by title (case-insensitive)
    let mut title_groups: HashMap<String, Vec<TrendRecord>> = HashMap::new();
    for trend in trends {
        let key = trend.title.to_lowercase();
        title_groups.entry(key).or_insert_with(Vec::new).push(trend);
    }
    
    // Merge trends with same title
    let mut merged_trends: Vec<TrendRecord> = Vec::new();
    for (title_key, group) in title_groups {
        if group.len() == 1 {
            merged_trends.push(group.into_iter().next().unwrap());
        } else {
            // Merge multiple sources for same trend
            let first = &group[0];
            let mut merged = first.clone();
            
            // Aggregate source attribution
            let mut all_platforms: Vec<String> = Vec::new();
            let mut all_urls: Vec<String> = Vec::new();
            let mut first_seen = merged.first_seen.clone();
            let mut last_seen = merged.last_seen.clone();
            
            for trend in &group {
                if !all_platforms.contains(&trend.platform.clone().unwrap_or_default()) {
                    if let Some(platform) = &trend.platform {
                        all_platforms.push(platform.clone());
                    }
                }
                if let Some(url) = &trend.url {
                    if !all_urls.contains(url) {
                        all_urls.push(url.clone());
                    }
                }
                if let Some(seen) = &trend.first_seen {
                    if first_seen.is_none() || seen < first_seen.as_ref().unwrap() {
                        first_seen = Some(seen.clone());
                    }
                }
                if let Some(seen) = &trend.last_seen {
                    if last_seen.is_none() || seen > last_seen.as_ref().unwrap() {
                        last_seen = Some(seen.clone());
                    }
                }
            }
            
            merged.source_platforms = all_platforms.clone();
            merged.source_count = all_platforms.len() as i32;
            merged.source_urls = all_urls;
            merged.first_seen = first_seen;
            merged.last_seen = last_seen;
            
            // Update source_frequency based on actual cross-source count
            merged.source_frequency = (merged.source_count as f32 / 4.0).min(1.0);
            
            // Re-calculate trend_score with updated source_frequency
            merged.trend_score = 
                (0.40 * merged.growth_velocity) + 
                (0.25 * merged.audience_relevance) + 
                (0.15 * merged.source_frequency) + 
                (0.10 * merged.competition_level) + 
                (0.10 * merged.freshness);
            
            merged_trends.push(merged);
        }
    }
    
    // Sort by trend_score
    merged_trends.sort_by(|a, b| {
        b.trend_score
            .partial_cmp(&a.trend_score)
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    merged_trends
}

pub fn calculate_cross_source_frequency(trends: &[TrendRecord]) -> HashMap<String, f32> {
    let mut title_sources: HashMap<String, Vec<String>> = HashMap::new();
    for trend in trends {
        title_sources
            .entry(trend.title.to_lowercase())
            .or_insert_with(Vec::new)
            .push(trend.source.clone());
    }
    
    let mut frequency_map: HashMap<String, f32> = HashMap::new();
    for (title, sources) in title_sources {
        let frequency = (sources.len() as f32 / 4.0).min(1.0); // Max 4 sources
        frequency_map.insert(title, frequency);
    }
    
    frequency_map
}
