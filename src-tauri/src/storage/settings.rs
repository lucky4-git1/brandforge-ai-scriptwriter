use crate::error::AppError;
use crate::storage::sqlite::connection;
use rusqlite::params;
use serde::{Deserialize, Serialize};

pub const KEY_LLM_CONFIG: &str = "llm_config";

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct LlmConfig {
    pub provider: String,
    pub model: String,
    pub openrouter_api_key: String,
    pub openrouter_model: String,
    pub openai_api_key: String,
    pub openai_model: String,
    pub nvidia_api_key: String,
    pub nvidia_base_url: String,
    pub nvidia_model: String,
}

impl LlmConfig {
    pub fn default_local() -> Self {
        Self {
            provider: "ollama".into(),
            model: "phi3".into(),
            openrouter_model: "openai/gpt-4o-mini".into(),
            openai_model: "gpt-4o-mini".into(),
            nvidia_base_url: "https://integrate.api.nvidia.com/v1".into(),
            nvidia_model: "meta/llama-3.1-8b-instruct".into(),
            ..Default::default()
        }
    }
}

pub fn get_llm_config() -> Result<LlmConfig, AppError> {
    let db = connection()?;
    let conn = db.lock();
    let mut stmt = conn.prepare("SELECT value FROM app_settings WHERE key = ?1")?;
    let result: Result<String, rusqlite::Error> =
        stmt.query_row(params![KEY_LLM_CONFIG], |row| row.get(0));
    match result {
        Ok(json) => serde_json::from_str(&json)
            .map(normalize_llm_config)
            .map_err(|e| AppError::InvalidInput(e.to_string())),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(LlmConfig::default_local()),
        Err(e) => Err(e.into()),
    }
}

pub fn save_llm_config(config: &LlmConfig) -> Result<(), AppError> {
    let db = connection()?;
    let conn = db.lock();
    let normalized = normalize_llm_config(config.clone());
    let json = serde_json::to_string(&normalized)?;
    conn.execute(
        "INSERT OR REPLACE INTO app_settings (key, value) VALUES (?1, ?2)",
        params![KEY_LLM_CONFIG, json],
    )?;
    Ok(())
}

pub fn normalize_provider_model(provider: &str, model: &str) -> String {
    match (provider, model) {
        ("nvidia" | "nvidia_nim", "gemma-4-31b-it") => "google/gemma-4-31b-it".into(),
        ("nvidia" | "nvidia_nim", "gemma-3n-e4b-it") => "google/gemma-3n-e4b-it".into(),
        ("nvidia" | "nvidia_nim", "llama-4-maverick-17b-128e-instruct") => {
            "meta/llama-4-maverick-17b-128e-instruct".into()
        }
        _ => model.to_string(),
    }
}

fn normalize_llm_config(mut config: LlmConfig) -> LlmConfig {
    if config.provider == "nvidia_nim" {
        config.provider = "nvidia".into();
    }

    if config.provider == "nvidia" {
        if config.model.is_empty() {
            config.model = config.nvidia_model.clone();
        }
        config.model = normalize_provider_model("nvidia", &config.model);
        config.nvidia_model = normalize_provider_model("nvidia", &config.nvidia_model);
        if config.nvidia_model.is_empty() {
            config.nvidia_model = config.model.clone();
        }
    }

    if config.provider == "openai" && config.model.is_empty() {
        config.model = config.openai_model.clone();
    }

    if config.provider == "openrouter" && config.model.is_empty() {
        config.model = config.openrouter_model.clone();
    }

    config
}
