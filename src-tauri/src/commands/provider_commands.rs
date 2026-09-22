use crate::storage::settings::{
    get_llm_config, normalize_provider_model, save_llm_config, LlmConfig,
};
use serde::Deserialize;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveProviderSettingsPayload {
    pub provider: Option<String>,
    pub model: Option<String>,
    pub openrouter_api_key: Option<String>,
    pub openrouter_model: Option<String>,
    pub openai_api_key: Option<String>,
    pub openai_model: Option<String>,
    pub nvidia_api_key: Option<String>,
    pub nvidia_base_url: Option<String>,
    pub nvidia_model: Option<String>,
}

#[tauri::command]
pub async fn get_provider_settings() -> Result<LlmConfig, String> {
    get_llm_config().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_provider_settings(
    payload: SaveProviderSettingsPayload,
) -> Result<LlmConfig, String> {
    let mut config = get_llm_config().unwrap_or_else(|_| LlmConfig::default_local());
    if let Some(p) = payload.provider {
        config.provider = match p.as_str() {
            "nvidia_nim" => "nvidia".into(),
            other => other.to_string(),
        };
    }
    if let Some(m) = payload.model {
        config.model = normalize_provider_model(&config.provider, &m);
    }
    if let Some(k) = payload.openrouter_api_key {
        config.openrouter_api_key = k;
    }
    if let Some(m) = payload.openrouter_model {
        config.openrouter_model = m;
    }
    if let Some(k) = payload.openai_api_key {
        config.openai_api_key = k;
    }
    if let Some(m) = payload.openai_model {
        config.openai_model = m;
    }
    if let Some(k) = payload.nvidia_api_key {
        config.nvidia_api_key = k;
    }
    if let Some(u) = payload.nvidia_base_url {
        config.nvidia_base_url = u;
    }
    if let Some(m) = payload.nvidia_model {
        config.nvidia_model = normalize_provider_model("nvidia", &m);
    }
    save_llm_config(&config).map_err(|e| e.to_string())?;
    Ok(config)
}
