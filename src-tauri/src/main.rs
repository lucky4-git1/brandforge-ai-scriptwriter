#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod ai_runtime;
mod commands;
mod error;
mod models;
mod orchestration;
mod prompt_engine;
mod research;
mod state;
mod storage;

use state::AppState;
use tauri::Manager;

#[tokio::main]
async fn main() {
    let app_state = AppState::new();

    tauri::Builder::default()
        .manage(app_state)
        .setup(|app| {
            let handle = app.app_handle();
            tauri::async_runtime::spawn(async move {
                if let Err(e) = storage::sqlite::init_database().await {
                    eprintln!("DB init error: {}", e);
                }
                if let Err(e) = storage::chroma::init_chroma().await {
                    eprintln!("Chroma init: {}", e);
                }
                if !ai_runtime::ollama::is_ollama_running().await {
                    let _ = handle.emit_all("ollama-not-running", ());
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::agent_commands::execute_agent_workflow,
            commands::agent_commands::get_agent_status,
            commands::content_commands::generate_content,
            commands::content_commands::generate_caption,
            commands::content_commands::generate_script,
            commands::content_commands::get_workspace_content,
            commands::trend_commands::get_trends,
            commands::trend_commands::analyze_trend,
            commands::model_commands::load_model,
            commands::model_commands::list_models,
            commands::model_commands::get_model_info,
            commands::provider_commands::get_provider_settings,
            commands::provider_commands::save_provider_settings,
            commands::brand_commands::create_brand,
            commands::brand_commands::get_brands,
            commands::brand_commands::update_brand_profile,
            commands::workflow_commands::execute_workflow,
            commands::workflow_commands::get_workflow_status,
            commands::workflow_commands::run_content_pipeline,
            commands::editor_commands::save_content_version,
            commands::editor_commands::get_content_versions,
            commands::editor_commands::get_content_version,
            commands::editor_commands::delete_content_version,
            commands::editor_commands::rename_content_version,
            commands::editor_commands::update_generated_content,
            commands::editor_commands::ai_edit_content,
            commands::editor_commands::test_inference,
            commands::brand_memory_commands::get_brand_memory_summary,
            commands::brand_memory_commands::rate_content,
            commands::brand_memory_commands::get_brand_context,
        ])
        .run(tauri::generate_context!())
        .expect("error running BrandForge AI");
}
