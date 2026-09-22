use crate::ai_runtime::model_manager::ModelInfo;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn list_models(state: State<'_, AppState>) -> Result<Vec<ModelInfo>, String> {
    let mgr = state.model_manager.lock().await;
    mgr.list_models().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn load_model(
    state: State<'_, AppState>,
    model_id: String,
    provider: Option<String>,
) -> Result<ModelInfo, String> {
    let mut mgr = state.model_manager.lock().await;
    let prov = provider.unwrap_or_else(|| "ollama".to_string());
    mgr.activate(&prov, &model_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_model_info(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let mgr = state.model_manager.lock().await;
    mgr.get_status().await.map_err(|e| e.to_string())
}
