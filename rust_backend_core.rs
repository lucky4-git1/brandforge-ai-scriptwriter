// src-tauri/src/main.rs

#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod models;
mod orchestration;
mod ai_runtime;
mod storage;
mod research;
mod commands;
mod error;

use std::sync::Arc;
use tokio::sync::Mutex;
use tauri::Manager;

// Global state
pub static ORCHESTRATOR: once_cell::sync::Lazy<Arc<Mutex<orchestration::WorkflowOrchestrator>>> =
    once_cell::sync::Lazy::new(|| {
        Arc::new(Mutex::new(orchestration::WorkflowOrchestrator::new()))
    });

pub static MODEL_MANAGER: once_cell::sync::Lazy<Arc<Mutex<ai_runtime::ModelManager>>> =
    once_cell::sync::Lazy::new(|| {
        Arc::new(Mutex::new(ai_runtime::ModelManager::new()))
    });

pub static TREND_ENGINE: once_cell::sync::Lazy<Arc<Mutex<research::TrendEngine>>> =
    once_cell::sync::Lazy::new(|| {
        Arc::new(Mutex::new(research::TrendEngine::new()))
    });

#[tokio::main]
async fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let app_handle = app.app_handle();

            // Initialize on startup
            tauri::async_runtime::spawn(async {
                if let Err(e) = initialize_app(&app_handle).await {
                    eprintln!("App initialization error: {}", e);
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Agent commands
            commands::agent_commands::execute_agent_workflow,
            commands::agent_commands::get_agent_status,
            // Content generation
            commands::content_commands::generate_caption,
            commands::content_commands::generate_script,
            commands::content_commands::generate_hooks,
            // Trend analysis
            commands::trend_commands::get_trends,
            commands::trend_commands::analyze_trend,
            // Model management
            commands::model_commands::load_model,
            commands::model_commands::list_models,
            commands::model_commands::get_model_info,
            // Brand management
            commands::brand_commands::create_brand,
            commands::brand_commands::get_brands,
            commands::brand_commands::update_brand_profile,
            // Workflow
            commands::workflow_commands::execute_workflow,
            commands::workflow_commands::get_workflow_status,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

async fn initialize_app(app: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    // Initialize database
    storage::sqlite::init_database().await?;

    // Initialize ChromaDB connection
    storage::chroma::init_chroma().await?;

    // Initialize Ollama connection (check if running)
    if !ai_runtime::ollama::is_ollama_running().await {
        app.emit_all("ollama-not-running", ())?;
    }

    // Initialize model manager
    let mut model_mgr = MODEL_MANAGER.lock().await;
    model_mgr.detect_gpu();

    Ok(())
}

// ============================================================================
// MODELS LAYER
// ============================================================================

// src-tauri/src/models/agent.rs

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[async_trait::async_trait]
pub trait Agent: Send + Sync {
    fn name(&self) -> &str;
    fn system_prompt(&self) -> String;
    fn get_tools(&self) -> Vec<Tool>;
    async fn execute(
        &self,
        prompt: &str,
        memory: &crate::storage::memory::Memory,
    ) -> Result<AgentOutput, crate::error::AppError>;
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentOutput {
    pub agent_name: String,
    pub thinking: String,
    pub output: String,
    pub structured_data: Option<serde_json::Value>,
    pub confidence: f32,
    pub used_memory: bool,
    pub execution_time_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tool {
    pub name: String,
    pub description: String,
    pub parameters: serde_json::Value,
}

#[derive(Debug)]
pub struct CreativeDirectorAgent {
    pub name: String,
}

#[async_trait::async_trait]
impl Agent for CreativeDirectorAgent {
    fn name(&self) -> &str {
        "Creative Director"
    }

    fn system_prompt(&self) -> String {
        r#"You are a world-class Creative Director for a modern brand agency.

Your role is to:
1. Define overarching creative direction for campaigns
2. Establish emotional tone and mood
3. Create compelling visual storytelling frameworks
4. Develop unique brand narratives
5. Find seasonal and trend-based angles
6. Create powerful hooks that stop scrolls

NEVER generate actual content. You provide strategic direction and frameworks.

When provided brand context and trends, respond with:
1. Creative Direction (3-5 compelling sentences)
2. Emotional Tone (specific adjectives)
3. Visual Framework (describe what audience sees)
4. Core Message (what audience feels)
5. Hook Strategy (how to capture attention)

Be bold, insightful, and trend-aware."#
            .to_string()
    }

    fn get_tools(&self) -> Vec<Tool> {
        vec![
            Tool {
                name: "retrieve_brand_context".to_string(),
                description: "Get current brand voice and values".to_string(),
                parameters: serde_json::json!({
                    "brand_id": "string"
                }),
            },
            Tool {
                name: "search_viral_patterns".to_string(),
                description: "Analyze successful content patterns".to_string(),
                parameters: serde_json::json!({
                    "platform": "string"
                }),
            },
        ]
    }

    async fn execute(
        &self,
        prompt: &str,
        memory: &crate::storage::memory::Memory,
    ) -> Result<AgentOutput, crate::error::AppError> {
        let start = std::time::Instant::now();

        // Retrieve relevant memory
        let memory_context = memory
            .retrieve_relevant_context(prompt, 5)
            .await
            .unwrap_or_default();

        let context = memory_context
            .iter()
            .map(|(text, score)| format!("(relevance: {:.2}) {}", score, text))
            .collect::<Vec<_>>()
            .join("\n");

        // Build full prompt with system prompt + context + user prompt
        let full_prompt = format!(
            "{}\n\nRelevant Context:\n{}\n\nRequest: {}",
            self.system_prompt(),
            context,
            prompt
        );

        // Call Ollama
        let output = crate::ai_runtime::ollama::generate_response(&full_prompt).await?;

        Ok(AgentOutput {
            agent_name: self.name().to_string(),
            thinking: "Analyzed brand direction, trends, and audience needs".to_string(),
            output,
            structured_data: None,
            confidence: 0.92,
            used_memory: !memory_context.is_empty(),
            execution_time_ms: start.elapsed().as_millis() as u64,
        })
    }
}

#[derive(Debug)]
pub struct SocialMediaManagerAgent {
    pub name: String,
}

#[async_trait::async_trait]
impl Agent for SocialMediaManagerAgent {
    fn name(&self) -> &str {
        "Social Media Manager"
    }

    fn system_prompt(&self) -> String {
        r#"You are a top-performing Social Media Manager specializing in growth.

Your expertise includes:
1. Platform-specific content optimization (Instagram, TikTok, YouTube, X)
2. Posting strategy and timing optimization
3. Community engagement tactics
4. Hashtag strategy and discoverability
5. Growth hacking techniques
6. Audience psychology

For each request, provide:
1. Platform-Specific Strategy (tailored to each platform)
2. Optimal Posting Time
3. Hashtag Recommendations (10-20, platform-specific)
4. Engagement Tactics (how to drive interaction)
5. Growth Opportunities (how to expand reach)

Focus on data-driven, actionable recommendations."#
            .to_string()
    }

    fn get_tools(&self) -> Vec<Tool> {
        vec![
            Tool {
                name: "get_platform_stats".to_string(),
                description: "Get platform-specific metrics".to_string(),
                parameters: serde_json::json!({
                    "platform": ["instagram", "tiktok", "youtube", "twitter"]
                }),
            },
        ]
    }

    async fn execute(
        &self,
        prompt: &str,
        memory: &crate::storage::memory::Memory,
    ) -> Result<AgentOutput, crate::error::AppError> {
        let start = std::time::Instant::now();

        let memory_context = memory
            .retrieve_relevant_context(prompt, 5)
            .await
            .unwrap_or_default();

        let context = memory_context
            .iter()
            .map(|(text, _)| text.clone())
            .collect::<Vec<_>>()
            .join("\n");

        let full_prompt = format!(
            "{}\n\nBrand Context:\n{}\n\nRequest: {}",
            self.system_prompt(),
            context,
            prompt
        );

        let output = crate::ai_runtime::ollama::generate_response(&full_prompt).await?;

        Ok(AgentOutput {
            agent_name: self.name().to_string(),
            thinking: "Analyzed platform dynamics and audience behavior".to_string(),
            output,
            structured_data: None,
            confidence: 0.88,
            used_memory: !memory_context.is_empty(),
            execution_time_ms: start.elapsed().as_millis() as u64,
        })
    }
}

#[derive(Debug)]
pub struct ScriptWriterAgent {
    pub name: String,
}

#[async_trait::async_trait]
impl Agent for ScriptWriterAgent {
    fn name(&self) -> &str {
        "Script Writer"
    }

    fn system_prompt(&self) -> String {
        r#"You are an elite Video Script Writer specializing in viral short-form content.

Master all formats:
1. TikTok/Reels hooks (3-5 seconds that stop scrolls)
2. YouTube video structure (intro hook, body, CTA)
3. Long-form scripts with narrative arc
4. Dialogue and conversation
5. Pattern interrupts and attention techniques

For each request, write:
1. A complete, word-for-word script
2. Scene/shot descriptions
3. Timing notes
4. Key emotional beats
5. Call-to-action

Make scripts:
- Pattern-interrupting (stop the scroll)
- Emotionally resonant
- Brand-aligned
- Platform-optimized
- Conversion-focused

Use proven hooks: curiosity gaps, contrasts, relatability, urgency."#
            .to_string()
    }

    fn get_tools(&self) -> Vec<Tool> {
        vec![]
    }

    async fn execute(
        &self,
        prompt: &str,
        memory: &crate::storage::memory::Memory,
    ) -> Result<AgentOutput, crate::error::AppError> {
        let start = std::time::Instant::now();

        let memory_context = memory
            .retrieve_relevant_context(prompt, 5)
            .await
            .unwrap_or_default();

        let context = memory_context
            .iter()
            .map(|(text, _)| text.clone())
            .collect::<Vec<_>>()
            .join("\n");

        let full_prompt = format!(
            "{}\n\nBrand Voice Guide:\n{}\n\nRequest: {}",
            self.system_prompt(),
            context,
            prompt
        );

        let output = crate::ai_runtime::ollama::generate_response(&full_prompt).await?;

        Ok(AgentOutput {
            agent_name: self.name().to_string(),
            thinking: "Crafted script with hooks and story structure".to_string(),
            output,
            structured_data: None,
            confidence: 0.90,
            used_memory: !memory_context.is_empty(),
            execution_time_ms: start.elapsed().as_millis() as u64,
        })
    }
}

// Similar implementations for:
// - TrendAnalystAgent
// - BrandVoiceAgent
// - ResearchAgent
// - ContentPlannerAgent

// ============================================================================
// ORCHESTRATION LAYER
// ============================================================================

// src-tauri/src/orchestration/coordinator.rs

use crate::models::Agent;
use std::collections::HashMap;

pub struct WorkflowOrchestrator {
    pub agents: HashMap<String, Arc<dyn Agent>>,
    pub memory: Arc<crate::storage::memory::Memory>,
}

impl WorkflowOrchestrator {
    pub fn new() -> Self {
        let mut agents: HashMap<String, Arc<dyn Agent>> = HashMap::new();

        // Initialize all agents
        agents.insert(
            "creative_director".to_string(),
            Arc::new(crate::models::CreativeDirectorAgent {
                name: "Creative Director".to_string(),
            }) as Arc<dyn Agent>,
        );

        agents.insert(
            "social_manager".to_string(),
            Arc::new(crate::models::SocialMediaManagerAgent {
                name: "Social Media Manager".to_string(),
            }) as Arc<dyn Agent>,
        );

        agents.insert(
            "script_writer".to_string(),
            Arc::new(crate::models::ScriptWriterAgent {
                name: "Script Writer".to_string(),
            }) as Arc<dyn Agent>,
        );

        WorkflowOrchestrator {
            agents,
            memory: Arc::new(crate::storage::memory::Memory::new()),
        }
    }

    pub async fn execute_workflow(
        &self,
        workflow_type: &str,
        input: &str,
        brand_id: &str,
    ) -> Result<Vec<crate::models::AgentOutput>, crate::error::AppError> {
        match workflow_type {
            "content_generation" => self.execute_content_generation(input, brand_id).await,
            "campaign_planning" => self.execute_campaign_planning(input, brand_id).await,
            "trend_analysis" => self.execute_trend_analysis(input, brand_id).await,
            _ => Err(crate::error::AppError::WorkflowNotFound),
        }
    }

    async fn execute_content_generation(
        &self,
        input: &str,
        brand_id: &str,
    ) -> Result<Vec<crate::models::AgentOutput>, crate::error::AppError> {
        // 1. Creative Director sets direction
        let creative_direction = self.agents["creative_director"]
            .execute(input, &self.memory)
            .await?;

        // 2. Run script writer in parallel
        let script_writer = self.agents["script_writer"]
            .execute(&format!("{}\n\nRequest: {}", creative_direction.output, input), &self.memory)
            .await?;

        // 3. Run social manager for platform strategy
        let social_strategy = self.agents["social_manager"]
            .execute(&format!("{}\n\nRequest: {}", creative_direction.output, input), &self.memory)
            .await?;

        Ok(vec![creative_direction, script_writer, social_strategy])
    }

    async fn execute_campaign_planning(
        &self,
        input: &str,
        _brand_id: &str,
    ) -> Result<Vec<crate::models::AgentOutput>, crate::error::AppError> {
        // Campaign-specific workflow
        let strategy = self.agents["social_manager"]
            .execute(input, &self.memory)
            .await?;

        Ok(vec![strategy])
    }

    async fn execute_trend_analysis(
        &self,
        input: &str,
        _brand_id: &str,
    ) -> Result<Vec<crate::models::AgentOutput>, crate::error::AppError> {
        // Would integrate with trend engine
        let analysis = self.agents["social_manager"]
            .execute(input, &self.memory)
            .await?;

        Ok(vec![analysis])
    }
}

// ============================================================================
// AI RUNTIME LAYER
// ============================================================================

// src-tauri/src/ai_runtime/ollama.rs

use reqwest::Client;
use serde::{Deserialize, Serialize};

#[derive(Serialize)]
struct OllamaRequest {
    model: String,
    prompt: String,
    stream: bool,
}

#[derive(Serialize)]
struct OllamaStreamRequest {
    model: String,
    prompt: String,
    stream: bool,
}

#[derive(Deserialize)]
struct OllamaResponse {
    response: String,
    done: bool,
}

pub async fn is_ollama_running() -> bool {
    let client = Client::new();
    client
        .get("http://localhost:11434/api/tags")
        .send()
        .await
        .is_ok()
}

pub async fn generate_response(prompt: &str) -> Result<String, crate::error::AppError> {
    let client = Client::new();

    let request = OllamaRequest {
        model: "mistral".to_string(), // Default to Mistral, configurable
        prompt: prompt.to_string(),
        stream: false,
    };

    let response = client
        .post("http://localhost:11434/api/generate")
        .json(&request)
        .send()
        .await
        .map_err(|e| crate::error::AppError::OllamaError(e.to_string()))?;

    let body = response
        .text()
        .await
        .map_err(|e| crate::error::AppError::OllamaError(e.to_string()))?;

    // Parse JSON lines response
    let response_text = body
        .lines()
        .last()
        .ok_or(crate::error::AppError::OllamaError("Empty response".to_string()))?;

    let parsed: OllamaResponse = serde_json::from_str(response_text)
        .map_err(|e| crate::error::AppError::OllamaError(e.to_string()))?;

    Ok(parsed.response)
}

pub async fn generate_stream<F>(
    prompt: &str,
    mut on_chunk: F,
) -> Result<String, crate::error::AppError>
where
    F: FnMut(String),
{
    let client = Client::new();

    let request = OllamaStreamRequest {
        model: "mistral".to_string(),
        prompt: prompt.to_string(),
        stream: true,
    };

    let response = client
        .post("http://localhost:11434/api/generate")
        .json(&request)
        .send()
        .await
        .map_err(|e| crate::error::AppError::OllamaError(e.to_string()))?;

    let mut full_response = String::new();
    let mut stream = response.bytes_stream();

    use futures_util::StreamExt;

    while let Some(chunk) = stream.next().await {
        let chunk_bytes = chunk
            .map_err(|e| crate::error::AppError::OllamaError(e.to_string()))?;
        let chunk_str = String::from_utf8_lossy(&chunk_bytes);

        for line in chunk_str.lines() {
            if let Ok(parsed) = serde_json::from_str::<OllamaResponse>(line) {
                on_chunk(parsed.response.clone());
                full_response.push_str(&parsed.response);
            }
        }
    }

    Ok(full_response)
}

// src-tauri/src/ai_runtime/model_manager.rs

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelInfo {
    pub name: String,
    pub size_gb: f32,
    pub quantization: String,
    pub is_loaded: bool,
    pub vram_usage_gb: f32,
}

pub struct ModelManager {
    pub current_model: String,
    pub available_models: Vec<ModelInfo>,
    pub device_type: String,
}

impl ModelManager {
    pub fn new() -> Self {
        ModelManager {
            current_model: "mistral".to_string(),
            available_models: vec![
                ModelInfo {
                    name: "Mistral 7B".to_string(),
                    size_gb: 4.0,
                    quantization: "Q4".to_string(),
                    is_loaded: false,
                    vram_usage_gb: 0.0,
                },
                ModelInfo {
                    name: "Qwen 32B".to_string(),
                    size_gb: 19.0,
                    quantization: "Q4".to_string(),
                    is_loaded: false,
                    vram_usage_gb: 0.0,
                },
                ModelInfo {
                    name: "Llama 2 13B".to_string(),
                    size_gb: 7.0,
                    quantization: "Q4".to_string(),
                    is_loaded: false,
                    vram_usage_gb: 0.0,
                },
            ],
            device_type: "CPU".to_string(),
        }
    }

    pub fn detect_gpu(&mut self) {
        // Detect NVIDIA
        if cfg!(feature = "cuda") {
            self.device_type = "NVIDIA CUDA".to_string();
            return;
        }

        // Detect AMD
        if cfg!(feature = "rocm") {
            self.device_type = "AMD ROCm".to_string();
            return;
        }

        self.device_type = "CPU".to_string();
    }

    pub async fn load_model(&mut self, model_id: &str) -> Result<(), crate::error::AppError> {
        // Call Ollama to pull model
        let client = reqwest::Client::new();

        #[derive(Serialize)]
        struct PullRequest {
            name: String,
        }

        client
            .post("http://localhost:11434/api/pull")
            .json(&PullRequest {
                name: model_id.to_string(),
            })
            .send()
            .await
            .map_err(|e| crate::error::AppError::OllamaError(e.to_string()))?;

        self.current_model = model_id.to_string();
        Ok(())
    }
}

// ============================================================================
// STORAGE LAYER
// ============================================================================

// src-tauri/src/storage/memory.rs

use std::collections::HashMap;

pub struct Memory {
    pub semantic: ChromaDBClient,
    pub episodic: SQLiteDB,
    pub brand_profile: BrandProfile,
}

pub struct ChromaDBClient {
    // Connection to ChromaDB (Python service)
}

pub struct SQLiteDB {
    // SQLite connection pool
}

pub struct BrandProfile {
    pub brand_id: String,
    pub voice: VoiceProfile,
    pub audience: AudienceProfile,
    pub products: Vec<String>,
}

pub struct VoiceProfile {
    pub tone: String,
    pub personality: Vec<String>,
    pub forbidden_phrases: Vec<String>,
}

pub struct AudienceProfile {
    pub demographics: String,
    pub psychographics: String,
    pub pain_points: Vec<String>,
}

impl Memory {
    pub fn new() -> Self {
        Memory {
            semantic: ChromaDBClient {},
            episodic: SQLiteDB {},
            brand_profile: BrandProfile {
                brand_id: String::new(),
                voice: VoiceProfile {
                    tone: String::new(),
                    personality: vec![],
                    forbidden_phrases: vec![],
                },
                audience: AudienceProfile {
                    demographics: String::new(),
                    psychographics: String::new(),
                    pain_points: vec![],
                },
                products: vec![],
            },
        }
    }

    pub async fn retrieve_relevant_context(
        &self,
        _query: &str,
        _top_k: usize,
    ) -> Result<Vec<(String, f32)>, crate::error::AppError> {
        // Query ChromaDB for relevant context
        // Return vector of (text, score) tuples
        Ok(vec![])
    }

    pub async fn add_episodic_memory(
        &self,
        _event: EpisodeRecord,
    ) -> Result<(), crate::error::AppError> {
        // Store in SQLite
        Ok(())
    }
}

pub struct EpisodeRecord {
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub workflow_type: String,
    pub input: String,
    pub output: String,
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

// src-tauri/src/error.rs

use serde::Serialize;

#[derive(Debug, Serialize)]
pub enum AppError {
    OllamaError(String),
    DatabaseError(String),
    MemoryError(String),
    WorkflowNotFound,
    ModelNotFound,
    BrandNotFound,
    InvalidInput(String),
}

impl std::fmt::Display for AppError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AppError::OllamaError(msg) => write!(f, "Ollama Error: {}", msg),
            AppError::DatabaseError(msg) => write!(f, "Database Error: {}", msg),
            AppError::MemoryError(msg) => write!(f, "Memory Error: {}", msg),
            AppError::WorkflowNotFound => write!(f, "Workflow not found"),
            AppError::ModelNotFound => write!(f, "Model not found"),
            AppError::BrandNotFound => write!(f, "Brand not found"),
            AppError::InvalidInput(msg) => write!(f, "Invalid input: {}", msg),
        }
    }
}

impl std::error::Error for AppError {}
