use crate::error::AppError;
use crate::storage::settings::get_llm_config;
use reqwest::Client;
use serde::{Deserialize, Serialize};

#[derive(Serialize)]
struct ChatMessage {
    role: String,
    content: String,
}

#[derive(Serialize)]
struct ChatRequest {
    model: String,
    messages: Vec<ChatMessage>,
    #[serde(skip_serializing_if = "Option::is_none")]
    stream: Option<bool>,
}

#[derive(Deserialize)]
struct ChatResponse {
    choices: Vec<ChatChoice>,
    error: Option<ApiErrorBody>,
}

#[derive(Deserialize)]
struct ChatChoice {
    message: Option<ChatMessageOut>,
}

#[derive(Deserialize)]
struct ChatMessageOut {
    content: Option<String>,
}

#[derive(Deserialize)]
struct ApiErrorBody {
    message: Option<String>,
}

pub async fn complete(system: &str, user: &str) -> Result<String, AppError> {
    let config = get_llm_config()?;
    match config.provider.as_str() {
        "openrouter" => {
            chat_completion(
                "https://openrouter.ai/api/v1/chat/completions",
                &config.openrouter_api_key,
                &config.openrouter_model,
                system,
                user,
                Some(("https://brandforge.local", "BrandForge AI")),
            )
            .await
        }
        "openai" => {
            chat_completion(
                "https://api.openai.com/v1/chat/completions",
                &config.openai_api_key,
                &config.openai_model,
                system,
                user,
                None,
            )
            .await
        }
        "nvidia" | "nvidia_nim" => {
            let base = config.nvidia_base_url.trim_end_matches('/').to_string();
            chat_completion(
                &format!("{}/chat/completions", base),
                &config.nvidia_api_key,
                &config.nvidia_model,
                system,
                user,
                None,
            )
            .await
        }
        _ => crate::ai_runtime::ollama::generate_chat(system, user).await,
    }
}

async fn chat_completion(
    url: &str,
    api_key: &str,
    model: &str,
    system: &str,
    user: &str,
    app_headers: Option<(&str, &str)>,
) -> Result<String, AppError> {
    if api_key.trim().is_empty() {
        return Err(AppError::InvalidInput(
            "API key is required for this provider. Add it in Settings.".into(),
        ));
    }

    let client = Client::new();
    let body = ChatRequest {
        model: model.to_string(),
        messages: vec![
            ChatMessage {
                role: "system".into(),
                content: system.to_string(),
            },
            ChatMessage {
                role: "user".into(),
                content: user.to_string(),
            },
        ],
        stream: Some(false),
    };

    let mut req = client
        .post(url)
        .header("Authorization", format!("Bearer {}", api_key.trim()))
        .header("Content-Type", "application/json")
        .json(&body);

    if let Some((referer, title)) = app_headers {
        req = req
            .header("HTTP-Referer", referer)
            .header("X-Title", title);
    }

    let resp = req.send().await?;
    let status = resp.status();
    let text = resp.text().await?;

    if !status.is_success() {
        return Err(AppError::OllamaError(format!("API {}: {}", status, text)));
    }

    let parsed: ChatResponse = serde_json::from_str(&text)
        .map_err(|e| AppError::OllamaError(format!("Invalid API response: {} — {}", e, text)))?;

    if let Some(err) = parsed.error {
        return Err(AppError::OllamaError(
            err.message.unwrap_or_else(|| "API error".into()),
        ));
    }

    parsed
        .choices
        .first()
        .and_then(|c| c.message.as_ref())
        .and_then(|m| m.content.clone())
        .filter(|s| !s.trim().is_empty())
        .ok_or_else(|| AppError::OllamaError("API returned empty content".into()))
}

pub fn is_cloud_provider(provider: &str) -> bool {
    matches!(provider, "openrouter" | "openai" | "nvidia" | "nvidia_nim")
}

pub async fn active_provider_label() -> String {
    let config = get_llm_config().unwrap_or_default();
    if is_cloud_provider(&config.provider) {
        format!("{} · {}", config.provider, config.model)
    } else {
        format!("ollama · {}", config.model)
    }
}
