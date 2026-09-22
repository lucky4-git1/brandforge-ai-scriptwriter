use crate::storage::memory::Memory;
use crate::storage::sqlite::{
    self, AudienceInsight, BrandLearning, ContentPerformance,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize)]
pub struct BrandMemorySummary {
    pub brand_id: String,
    pub learnings: Vec<BrandLearning>,
    pub insights: Vec<AudienceInsight>,
    pub performance_history: Vec<ContentPerformance>,
}

#[tauri::command]
pub async fn get_brand_memory_summary(brand_id: String) -> Result<BrandMemorySummary, String> {
    let learnings = sqlite::get_brand_learnings(&brand_id, None, 10).map_err(|e| e.to_string())?;
    let insights = sqlite::get_audience_insights(&brand_id).map_err(|e| e.to_string())?;
    let performance_history =
        sqlite::get_content_performance(&brand_id, 10).map_err(|e| e.to_string())?;

    Ok(BrandMemorySummary {
        brand_id,
        learnings,
        insights,
        performance_history,
    })
}

#[derive(Debug, Deserialize)]
pub struct RateContentPayload {
    pub content_id: String,
    pub brand_id: String,
    pub rating: i32,
    pub notes: Option<String>,
}

#[tauri::command]
pub async fn rate_content(payload: RateContentPayload) -> Result<(), String> {
    let memory = Memory::for_brand(&payload.brand_id);
    memory
        .record_content_feedback(&payload.content_id, payload.rating, payload.notes.as_deref())
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_brand_context(brand_id: String, query: String) -> Result<String, String> {
    let memory = Memory::for_brand(&brand_id);
    memory
        .get_brand_context_for_generation(&query)
        .await
        .map_err(|e| e.to_string())
}
