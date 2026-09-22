use crate::models::brand::TrendRecord;
use crate::research::trends::TrendEngine;
use crate::storage::sqlite;
use chrono::Utc;
use serde_json::Value;

#[tauri::command]
pub async fn get_trends(
    brand_id: Option<String>,
    niche: Option<String>,
    force_refresh: Option<bool>,
) -> Result<Vec<TrendRecord>, String> {
    let force = force_refresh.unwrap_or(false);

    // If not forcing refresh, check if we have cached trends for this brand/niche
    if !force {
        let existing = sqlite::get_trends(brand_id.as_deref(), 30).map_err(|e| e.to_string())?;
        if !existing.is_empty() {
            // Deduplicate by title just in case
            use std::collections::HashSet;
            let mut seen_titles = HashSet::new();
            let mut deduplicated = Vec::new();
            for trend in existing {
                if seen_titles.insert(trend.title.clone()) {
                    deduplicated.push(trend);
                }
            }
            return Ok(deduplicated);
        }
    }

    let n = niche.unwrap_or_else(|| "marketing".into());

    let trends = TrendEngine::new()
        .research(&n, brand_id.as_deref())
        .await
        .map_err(|e| e.to_string())?;

    // Save newly generated trends to SQLite
    if let Err(e) = sqlite::insert_trends(&trends) {
        eprintln!("Error caching trends: {:?}", e);
    }

    // Query the full list from SQLite (to merge with any existing ones)
    let existing = sqlite::get_trends(brand_id.as_deref(), 30).map_err(|e| e.to_string())?;

    // Merge and deduplicate by title
    use std::collections::HashSet;
    let mut seen_titles = HashSet::new();
    let mut deduplicated = Vec::new();

    for trend in existing {
        if seen_titles.insert(trend.title.clone()) {
            deduplicated.push(trend);
        }
    }

    Ok(deduplicated)
}



#[tauri::command]
pub async fn analyze_trend(trend_id: String) -> Result<serde_json::Value, String> {
    let trends = sqlite::get_trends(None, 100).map_err(|e| e.to_string())?;
    let mut trend = trends
        .into_iter()
        .find(|t| t.id == trend_id)
        .ok_or_else(|| "Trend not found".to_string())?;

    // If already analyzed, return it
    if let Some(ref analysis) = trend.analysis {
        return Ok(serde_json::json!({
            "trend": trend,
            "analysis": analysis,
        }));
    }

    let system_prompt = r#"You are a content strategist and trend analyst. Analyze the following trend and generate a comprehensive opportunity analysis.

Respond ONLY with a JSON object matching this exact structure:
{
  "why_it_matters": "Brief explanation of why this trend is important",
  "target_audience": "Who this trend appeals to",
  "suggested_content_angles": ["Angle 1", "Angle 2", "Angle 3"],
  "suggested_hooks": ["Hook 1", "Hook 2", "Hook 3"],
  "suggested_content_formats": ["Format 1", "Format 2", "Format 3"],
  "suggested_titles": ["Title 1", "Title 2", "Title 3"],
  "suggested_reels": ["Reel idea 1", "Reel idea 2"],
  "suggested_shorts": ["Short idea 1", "Short idea 2"],
  "suggested_long_form": ["Long form video idea 1"],
  "estimated_opportunity_score": 8.5,
  "growth_analysis": "Analysis of growth trajectory",
  "key_keywords": ["keyword1", "keyword2"],
  "content_opportunities": ["Opportunity 1", "Opportunity 2"]
}"#;

    let user_prompt = format!(
        "Analyze this trend:\nTitle: {}\nSummary: {}\nKeywords: {:?}\nSource: {}\nSource Platforms: {:?}\nSource Count: {}\nTrend Score: {:.2}\nGrowth Velocity: {:.2}\nAudience Relevance: {:.2}",
        trend.title, trend.summary, trend.keywords, trend.source, trend.source_platforms, trend.source_count, trend.trend_score, trend.growth_velocity, trend.audience_relevance
    );

    let analysis_json = crate::ai_runtime::inference_manager::InferenceManager::run(
        &user_prompt,
        &[],
        system_prompt,
    )
    .await
    .map_err(|e| format!("Failed to generate analysis: {}", e))?;

    // We might get markdown json blocks, let's clean it up
    let cleaned_json = analysis_json.text
        .replace("```json", "")
        .replace("```", "")
        .trim()
        .to_string();

    let analysis: crate::models::brand::TrendOpportunityAnalysis = serde_json::from_str(&cleaned_json)
        .map_err(|e| format!("Failed to parse AI response: {}", e))?;

    trend.analysis = Some(analysis.clone());

    if let Err(e) = sqlite::insert_trends(&[trend.clone()]) {
        eprintln!("Error caching trend analysis: {:?}", e);
    }

    Ok(serde_json::json!({
        "trend": trend,
        "analysis": analysis,
    }))
}
