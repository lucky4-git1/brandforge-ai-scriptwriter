use crate::ai_runtime::gpu::{detect_gpu, estimate_vram_for_model, recommend_device};
use crate::ai_runtime::ollama::{list_installed_models, set_active_model};
use crate::error::AppError;
use crate::storage::settings::{get_llm_config, save_llm_config, LlmConfig};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelInfo {
    pub id: String,
    pub name: String,
    pub provider: String,
    pub size_gb: f32,
    pub quantization: String,
    pub is_installed: bool,
    pub is_active: bool,
    pub vram_usage_gb: f32,
    pub recommended_device: String,
    pub description: String,
}

pub struct ModelManager {
    pub device_type: String,
}

impl ModelManager {
    pub fn new() -> Self {
        Self {
            device_type: "CPU".to_string(),
        }
    }

    pub fn detect_gpu(&mut self) {
        self.device_type = detect_gpu().device_type;
    }

    pub fn cloud_model_catalog() -> Vec<ModelInfo> {
        vec![
            cloud_entry(
                "nvidia",
                "google/gemma-4-31b-it",
                "Gemma 4 31B Instruct (NVIDIA)",
                "Large Gemma instruct model via NVIDIA NIM",
            ),
            cloud_entry(
                "nvidia",
                "google/gemma-3n-e4b-it",
                "Gemma 3n E4B Instruct (NVIDIA)",
                "Efficient Gemma instruct model via NVIDIA NIM",
            ),
            cloud_entry(
                "nvidia",
                "meta/llama-4-maverick-17b-128e-instruct",
                "Llama 4 Maverick 17B 128E (NVIDIA)",
                "Llama Maverick instruct model via NVIDIA NIM",
            ),
            cloud_entry(
                "nvidia",
                "meta/llama-3.1-8b-instruct",
                "Llama 3.1 8B (NVIDIA NIM)",
                "NVIDIA NIM cloud inference",
            ),
            cloud_entry(
                "openai",
                "gpt-5.2",
                "GPT-5.2 (OpenAI)",
                "Strongest direct OpenAI general model",
            ),
            cloud_entry(
                "openai",
                "gpt-5.1",
                "GPT-5.1 (OpenAI)",
                "High quality direct OpenAI model",
            ),
            cloud_entry(
                "openai",
                "gpt-5-mini",
                "GPT-5 Mini (OpenAI)",
                "Fast, cost-efficient OpenAI model",
            ),
            cloud_entry(
                "openai",
                "gpt-5-nano",
                "GPT-5 Nano (OpenAI)",
                "Lowest latency OpenAI model for simple tasks",
            ),
            cloud_entry(
                "openai",
                "gpt-4.1",
                "GPT-4.1 (OpenAI)",
                "Reliable non-reasoning OpenAI model",
            ),
            cloud_entry(
                "openai",
                "gpt-4.1-mini",
                "GPT-4.1 Mini (OpenAI)",
                "Balanced speed and quality through OpenAI",
            ),
            cloud_entry(
                "openai",
                "gpt-4o",
                "GPT-4o (OpenAI)",
                "Fast multimodal OpenAI model",
            ),
            cloud_entry(
                "openai",
                "gpt-4o-mini",
                "GPT-4o Mini (OpenAI)",
                "Affordable OpenAI fallback model",
            ),
            cloud_entry(
                "openrouter",
                "openai/gpt-5.2",
                "GPT-5.2 (OpenRouter)",
                "OpenAI GPT-5.2 routed through OpenRouter",
            ),
            cloud_entry(
                "openrouter",
                "openai/gpt-5-mini",
                "GPT-5 Mini (OpenRouter)",
                "Fast OpenAI model routed through OpenRouter",
            ),
            cloud_entry(
                "openrouter",
                "anthropic/claude-sonnet-4.5",
                "Claude Sonnet 4.5 (OpenRouter)",
                "High quality Anthropic model through OpenRouter",
            ),
            cloud_entry(
                "openrouter",
                "google/gemini-2.5-pro",
                "Gemini 2.5 Pro (OpenRouter)",
                "Strong Google model through OpenRouter",
            ),
            cloud_entry(
                "openrouter",
                "google/gemini-2.5-flash",
                "Gemini 2.5 Flash (OpenRouter)",
                "Fast Google model through OpenRouter",
            ),
            cloud_entry(
                "openrouter",
                "deepseek/deepseek-chat-v3.1",
                "DeepSeek Chat V3.1 (OpenRouter)",
                "Cost-effective chat model through OpenRouter",
            ),
            cloud_entry(
                "openrouter",
                "meta-llama/llama-4-maverick",
                "Llama 4 Maverick (OpenRouter)",
                "Meta Llama model through OpenRouter",
            ),
            cloud_entry(
                "openrouter",
                "qwen/qwen3-coder",
                "Qwen3 Coder (OpenRouter)",
                "Coding-focused model through OpenRouter",
            ),
        ]
    }

    pub async fn list_models(&self) -> Result<Vec<ModelInfo>, AppError> {
        let config = get_llm_config().unwrap_or_else(|_| LlmConfig::default_local());
        let installed = list_installed_models().await.unwrap_or_default();
        let mut models = Vec::new();

        if installed.is_empty() {
            for (id, label) in [
                ("phi3", "Phi-3 (recommended — fast)"),
                ("mistral", "Mistral 7B"),
                ("llama3.2", "Llama 3.2"),
            ] {
                models.push(local_entry(
                    id,
                    label,
                    false,
                    is_active_local(&config, id),
                    "Run: ollama pull phi3",
                ));
            }
        } else {
            for name in &installed {
                let base = name.split(':').next().unwrap_or(name).to_string();
                models.push(local_entry(
                    name,
                    &format_display_name(name),
                    true,
                    is_active_local(&config, name) || is_active_local(&config, &base),
                    "Installed locally via Ollama",
                ));
            }
        }

        for mut cloud in Self::cloud_model_catalog() {
            cloud.is_active = config.provider == cloud.provider && config.model == cloud.id;
            models.push(cloud);
        }

        models.sort_by(|a, b| {
            b.is_active
                .cmp(&a.is_active)
                .then(b.is_installed.cmp(&a.is_installed))
                .then(a.name.cmp(&b.name))
        });

        Ok(models)
    }

    pub async fn activate(
        &mut self,
        provider: &str,
        model_id: &str,
    ) -> Result<ModelInfo, AppError> {
        let mut config = get_llm_config().unwrap_or_else(|_| LlmConfig::default_local());
        config.provider = provider.to_string();
        config.model = model_id.to_string();

        match provider {
            "openrouter" => config.openrouter_model = model_id.to_string(),
            "openai" => config.openai_model = model_id.to_string(),
            "nvidia" | "nvidia_nim" => {
                config.provider = "nvidia".into();
                config.nvidia_model = model_id.to_string();
            }
            _ => {
                config.provider = "ollama".into();
                set_active_model(model_id);
            }
        }

        save_llm_config(&config)?;
        self.detect_gpu();

        self.list_models()
            .await?
            .into_iter()
            .find(|m| m.is_active)
            .ok_or(AppError::ModelNotFound)
    }

    pub async fn get_status(&self) -> Result<serde_json::Value, AppError> {
        let config = get_llm_config().unwrap_or_else(|_| LlmConfig::default_local());
        let gpu = detect_gpu();
        let installed = list_installed_models().await.unwrap_or_default();
        Ok(serde_json::json!({
            "provider": config.provider,
            "current_model": config.model,
            "device_type": self.device_type,
            "gpu": gpu,
            "ollama_running": crate::ai_runtime::ollama::is_ollama_running().await,
            "ollama_installed_models": installed,
            "is_cloud": crate::ai_runtime::llm_provider::is_cloud_provider(&config.provider),
        }))
    }
}

fn is_active_local(config: &LlmConfig, id: &str) -> bool {
    config.provider == "ollama"
        && (config.model == id || config.model.starts_with(id) || id.starts_with(&config.model))
}

fn local_entry(
    id: &str,
    name: &str,
    is_installed: bool,
    is_active: bool,
    description: &str,
) -> ModelInfo {
    ModelInfo {
        id: id.to_string(),
        name: name.to_string(),
        provider: "ollama".into(),
        size_gb: estimate_vram_for_model(id),
        quantization: "local".into(),
        is_installed,
        is_active,
        vram_usage_gb: estimate_vram_for_model(id),
        recommended_device: recommend_device(id),
        description: description.to_string(),
    }
}

fn cloud_entry(provider: &str, id: &str, name: &str, description: &str) -> ModelInfo {
    ModelInfo {
        id: id.to_string(),
        name: name.to_string(),
        provider: provider.to_string(),
        size_gb: 0.0,
        quantization: "cloud".into(),
        is_installed: true,
        is_active: false,
        vram_usage_gb: 0.0,
        recommended_device: "Cloud API".into(),
        description: description.to_string(),
    }
}

fn format_display_name(name: &str) -> String {
    let base = name.split(':').next().unwrap_or(name);
    match base {
        "phi3" => "Phi-3 (fast, local)".to_string(),
        "mistral" => "Mistral (local)".to_string(),
        "llama3.2" => "Llama 3.2 (local)".to_string(),
        other => format!("{} (local)", other),
    }
}
