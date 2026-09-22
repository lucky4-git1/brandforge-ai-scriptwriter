use serde::Serialize;

#[derive(Debug, Serialize, thiserror::Error)]
pub enum AppError {
    #[error("Ollama error: {0}")]
    OllamaError(String),
    #[error("Database error: {0}")]
    DatabaseError(String),
    #[error("Memory error: {0}")]
    MemoryError(String),
    #[error("Workflow not found")]
    WorkflowNotFound,
    #[error("Agent not found: {0}")]
    AgentNotFound(String),
    #[error("Model not found")]
    ModelNotFound,
    #[error("Brand not found")]
    BrandNotFound,
    #[error("Invalid input: {0}")]
    InvalidInput(String),
    #[error("Trend research error: {0}")]
    TrendError(String),
}

impl From<rusqlite::Error> for AppError {
    fn from(e: rusqlite::Error) -> Self {
        AppError::DatabaseError(e.to_string())
    }
}

impl From<serde_json::Error> for AppError {
    fn from(e: serde_json::Error) -> Self {
        AppError::InvalidInput(e.to_string())
    }
}

impl From<reqwest::Error> for AppError {
    fn from(e: reqwest::Error) -> Self {
        AppError::OllamaError(e.to_string())
    }
}
