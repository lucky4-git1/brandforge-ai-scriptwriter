use crate::models::brand::PipelineResult;
use crate::models::skill::SkillConfig;
use crate::orchestration::workflows::ContentPipeline;
use serde::Deserialize;
use tauri::Window;

#[derive(Debug, Deserialize)]
pub struct ExecuteWorkflowRequest {
    pub workflow_type: String,
    pub brand_id: String,
    pub topic: String,
    pub platform: Option<String>,
    pub language: Option<String>,
    pub active_skills: Option<Vec<SkillConfig>>,
}

#[tauri::command]
pub async fn execute_workflow(
    window: Window,
    req: ExecuteWorkflowRequest,
) -> Result<PipelineResult, String> {
    match req.workflow_type.as_str() {
        "content_pipeline" | "full_pipeline" => ContentPipeline::run_full(
            &window,
            &req.brand_id,
            &req.topic,
            req.platform.as_deref().unwrap_or("tiktok"),
            req.language.as_deref().unwrap_or("english"),
            req.active_skills.as_deref().unwrap_or(&[]),
        )
        .await
        .map_err(|e| e.to_string()),
        _ => Err(format!("Unknown workflow: {}", req.workflow_type)),
    }
}

#[tauri::command]
pub async fn get_workflow_status(workflow_id: String) -> Result<serde_json::Value, String> {
    Ok(serde_json::json!({ "workflow_id": workflow_id, "status": "unknown" }))
}

#[tauri::command]
pub async fn run_content_pipeline(
    window: Window,
    brand_id: String,
    topic: String,
    platform: Option<String>,
    language: Option<String>,
    active_skills: Option<Vec<SkillConfig>>,
) -> Result<PipelineResult, String> {
    execute_workflow(
        window,
        ExecuteWorkflowRequest {
            workflow_type: "content_pipeline".into(),
            brand_id,
            topic,
            platform,
            language,
            active_skills,
        },
    )
    .await
}
