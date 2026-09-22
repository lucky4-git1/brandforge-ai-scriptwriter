use crate::orchestration::coordinator::WorkflowOrchestrator;
use crate::storage::sqlite;
#[tauri::command]
pub async fn execute_agent_workflow(
    agent_type: String,
    prompt: String,
    brand_id: String,
) -> Result<String, String> {
    let brand = sqlite::get_brand(&brand_id).map_err(|e| e.to_string())?;
    let brand_ctx = format!(
        "brand_id: {}\nbrand_name: {}\nniche: {}\ntone: {}",
        brand.id, brand.name, brand.niche, brand.profile.voice.tone
    );
    let orch = WorkflowOrchestrator::with_brand(&brand_id);
    let workflow = if agent_type.contains("trend") {
        "trend_analysis"
    } else {
        "content_generation"
    };
    let outputs = orch
        .execute_workflow(workflow, &prompt, &brand_id, &brand_ctx)
        .await
        .map_err(|e| e.to_string())?;
    let combined = outputs
        .iter()
        .map(|o| format!("## {}\n{}", o.agent_name, o.output))
        .collect::<Vec<_>>()
        .join("\n\n");
    Ok(combined)
}

#[tauri::command]
pub fn get_agent_status() -> Result<serde_json::Value, String> {
    Ok(serde_json::to_value(WorkflowOrchestrator::get_agent_status()).unwrap())
}
