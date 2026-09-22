use crate::ai_runtime::model_manager::ModelManager;
use std::sync::Arc;
use tokio::sync::Mutex;

pub struct AppState {
    pub model_manager: Arc<Mutex<ModelManager>>,
}

impl AppState {
    pub fn new() -> Self {
        let mut mgr = ModelManager::new();
        mgr.detect_gpu();
        if let Ok(config) = crate::storage::settings::get_llm_config() {
            if config.provider == "ollama" {
                crate::ai_runtime::ollama::set_active_model(&config.model);
            }
        }
        Self {
            model_manager: Arc::new(Mutex::new(mgr)),
        }
    }
}
