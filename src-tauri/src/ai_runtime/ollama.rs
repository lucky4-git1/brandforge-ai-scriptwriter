use crate::error::AppError;
use once_cell::sync::Lazy;
use parking_lot::RwLock;
use reqwest::Client;
use serde::{Deserialize, Serialize};

static CURRENT_MODEL: Lazy<RwLock<String>> = Lazy::new(|| RwLock::new("mistral".to_string()));

#[derive(Serialize)]
struct OllamaRequest {
    model: String,
    prompt: String,
    stream: bool,
}

/// Ollama NDJSON chunks — fields vary per line (thinking models, done markers, errors).
#[derive(Debug, Deserialize)]
struct OllamaChunk {
    #[serde(default)]
    response: Option<String>,
    #[serde(default)]
    thinking: Option<String>,
    #[serde(default)]
    _done: bool,
    error: Option<String>,
    message: Option<OllamaMessage>,
}

#[derive(Debug, Deserialize)]
struct OllamaMessage {
    #[serde(default)]
    content: Option<String>,
    #[serde(default)]
    thinking: Option<String>,
}

#[derive(Deserialize)]
struct TagsResponse {
    models: Vec<TagModel>,
}

#[derive(Deserialize)]
struct TagModel {
    name: String,
}

pub fn set_active_model(model: &str) {
    *CURRENT_MODEL.write() = model.to_string();
}

pub fn get_active_model() -> String {
    CURRENT_MODEL.read().clone()
}

pub async fn is_ollama_running() -> bool {
    Client::new()
        .get("http://127.0.0.1:11434/api/tags")
        .send()
        .await
        .map(|r| r.status().is_success())
        .unwrap_or(false)
}

pub async fn list_installed_models() -> Result<Vec<String>, AppError> {
    let resp: TagsResponse = Client::new()
        .get("http://127.0.0.1:11434/api/tags")
        .send()
        .await?
        .json()
        .await
        .map_err(|e| AppError::OllamaError(e.to_string()))?;
    Ok(resp.models.into_iter().map(|m| m.name).collect())
}

/// Pick first installed model matching our supported list, or first available.
pub async fn resolve_model(requested: &str) -> String {
    let installed = list_installed_models().await.unwrap_or_default();
    if installed.is_empty() {
        return requested.to_string();
    }
    // Exact or prefix match (e.g. mistral:7b matches mistral:latest)
    if installed
        .iter()
        .any(|m| m == requested || m.starts_with(requested))
    {
        return installed
            .iter()
            .find(|m| *m == requested || m.starts_with(requested))
            .cloned()
            .unwrap_or_else(|| requested.to_string());
    }
    for candidate in ["mistral", "llama3.2", "qwen2.5", "phi3", "gemma2"] {
        if let Some(m) = installed.iter().find(|name| name.starts_with(candidate)) {
            return m.clone();
        }
    }
    installed[0].clone()
}

pub async fn generate_chat(system: &str, user: &str) -> Result<String, AppError> {
    let model_name = crate::storage::settings::get_llm_config()
        .map(|c| c.model)
        .unwrap_or_else(|_| get_active_model());
    let model = resolve_model(&model_name).await;
    let prompt = format!("{}\n\n---\n\n{}", system.trim(), user.trim());
    generate_with_model(&prompt, &model, false, |_| {}).await
}

fn text_from_chunk(chunk: &OllamaChunk) -> String {
    let mut out = String::new();
    if let Some(r) = &chunk.response {
        out.push_str(r);
    }
    if let Some(t) = &chunk.thinking {
        out.push_str(t);
    }
    if let Some(msg) = &chunk.message {
        if let Some(c) = &msg.content {
            out.push_str(c);
        }
        if let Some(t) = &msg.thinking {
            out.push_str(t);
        }
    }
    out
}

fn parse_ndjson_body(body: &str) -> Result<String, AppError> {
    let mut full = String::new();

    for line in body.lines().map(str::trim).filter(|l| !l.is_empty()) {
        let chunk: OllamaChunk = serde_json::from_str(line).map_err(|e| {
            AppError::OllamaError(format!(
                "Failed to parse Ollama output: {} — line: {}",
                e,
                if line.len() > 120 {
                    format!("{}…", &line[..120])
                } else {
                    line.to_string()
                }
            ))
        })?;

        if let Some(err) = chunk.error {
            return Err(AppError::OllamaError(err));
        }

        full.push_str(&text_from_chunk(&chunk));
    }

    if full.trim().is_empty() {
        return Err(AppError::OllamaError(
            "Ollama returned empty text. Pull a model first, e.g. `ollama pull mistral`".into(),
        ));
    }

    Ok(full)
}

async fn generate_with_model<F>(
    prompt: &str,
    model: &str,
    stream: bool,
    mut on_chunk: F,
) -> Result<String, AppError>
where
    F: FnMut(String),
{
    let client = Client::new();
    let request = OllamaRequest {
        model: model.to_string(),
        prompt: prompt.to_string(),
        stream,
    };

    let response = client
        .post("http://127.0.0.1:11434/api/generate")
        .json(&request)
        .send()
        .await
        .map_err(|e| AppError::OllamaError(format!("Cannot reach Ollama: {}", e)))?;

    let status = response.status();
    let body = response
        .text()
        .await
        .map_err(|e| AppError::OllamaError(e.to_string()))?;

    if !status.is_success() {
        return Err(AppError::OllamaError(format!(
            "Ollama HTTP {}: {}",
            status,
            body.chars().take(300).collect::<String>()
        )));
    }

    if !stream {
        return parse_ndjson_body(&body);
    }

    let mut full = String::new();
    for line in body.lines().map(str::trim).filter(|l| !l.is_empty()) {
        if let Ok(chunk) = serde_json::from_str::<OllamaChunk>(line) {
            if let Some(err) = chunk.error {
                return Err(AppError::OllamaError(err));
            }
            let text = text_from_chunk(&chunk);
            if !text.is_empty() {
                on_chunk(text.clone());
                full.push_str(&text);
            }
        }
    }

    if full.trim().is_empty() {
        return parse_ndjson_body(&body);
    }

    Ok(full)
}
