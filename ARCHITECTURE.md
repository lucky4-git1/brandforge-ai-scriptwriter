# BrandForge AI - Complete Architecture Document

## Executive Summary

BrandForge AI is a locally-running, multi-agent AI marketing platform that operates as an autonomous creative agency. It runs entirely on user hardware without external API dependencies, using state-of-the-art open-source LLMs via Ollama or llama.cpp.

---

## 1. SYSTEM ARCHITECTURE OVERVIEW

### Core Stack Decision Tree

```
┌─────────────────────────────────────────────────────────────┐
│                    BrandForge AI                              │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Frontend Layer (React + TypeScript + Tailwind)              │
│  ↓                                                            │
│  Desktop Runtime (Tauri for native performance)              │
│  ↓                                                            │
│  IPC Bridge (Command execution)                              │
│  ↓                                                            │
│  Backend Runtime (Rust for speed + async)                    │
│  ↓                                                            │
│  AI Orchestration Engine                                     │
│  ├─ Agent Coordinator                                        │
│  ├─ Prompt Management System                                 │
│  ├─ Memory Management                                        │
│  └─ Workflow Execution                                       │
│  ↓                                                            │
│  Model Runtimes                                              │
│  ├─ Ollama Integration (main LLM)                            │
│  ├─ llama.cpp Integration (fallback/optimization)            │
│  ├─ Local Embeddings (Rust-native or onnx-runtime)          │
│  └─ GPU Optimization Layer                                   │
│  ↓                                                            │
│  Data Layer                                                  │
│  ├─ SQLite (brand profiles, configs, history)               │
│  ├─ ChromaDB (vector memory)                                │
│  └─ Document Indexing                                        │
```

### Recommended Stack Justification

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Desktop Runtime | Tauri | Native performance, smaller bundle, Rust backend |
| Frontend | React + TS | Type safety, component reusability, ecosystem |
| UI Framework | Tailwind + Shadcn | Customization, dark mode, accessibility |
| Motion | Framer Motion | React-native animations, performance |
| State Management | Zustand | Lightweight, easy to debug, no boilerplate |
| Backend | Rust | Async performance, memory safety, GPU ops |
| Primary LLM | Ollama | Easy model switching, VRAM management, local |
| Embedding Model | ONNX Runtime + quantized models | Fast local inference, no dependency hell |
| Vector DB | ChromaDB | Python-based, integrates with Rust via IPC |
| Document DB | SQLite | Zero config, embedded, ACID compliance |

---

## 2. PROJECT STRUCTURE

```
brandforge-ai/
├── src-tauri/                          # Tauri + Rust backend
│   ├── src/
│   │   ├── main.rs                     # Tauri app entry point
│   │   ├── models/
│   │   │   ├── agent.rs                # Agent trait + implementations
│   │   │   ├── prompt.rs               # Prompt template system
│   │   │   └── memory.rs               # Vector memory operations
│   │   ├── orchestration/
│   │   │   ├── coordinator.rs          # Multi-agent orchestration
│   │   │   ├── workflow.rs             # Workflow execution engine
│   │   │   └── state.rs                # Shared state management
│   │   ├── ai_runtime/
│   │   │   ├── ollama.rs               # Ollama integration
│   │   │   ├── embeddings.rs           # Local embedding models
│   │   │   └── inference.rs            # Inference pipeline
│   │   ├── storage/
│   │   │   ├── sqlite.rs               # SQLite wrapper
│   │   │   ├── chroma.rs               # ChromaDB integration
│   │   │   └── migrations.rs           # Database migrations
│   │   ├── research/
│   │   │   ├── trends.rs               # Trend analysis engine
│   │   │   ├── web_scraper.rs          # Web scraping utilities
│   │   │   └── rss_feed.rs             # Feed aggregation
│   │   ├── commands/
│   │   │   ├── agent_commands.rs       # IPC command handlers
│   │   │   ├── model_commands.rs       # Model management
│   │   │   └── workflow_commands.rs    # Workflow execution
│   │   └── error.rs                    # Error handling
│   ├── Cargo.toml
│   └── tauri.conf.json
│
├── src/                                # React frontend
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── TopBar.tsx
│   │   │   ├── CommandPalette.tsx
│   │   │   └── Dock.tsx
│   │   ├── workspace/
│   │   │   ├── BrandSelector.tsx
│   │   │   ├── WorkspaceHeader.tsx
│   │   │   └── WorkspaceContent.tsx
│   │   ├── chat/
│   │   │   ├── ChatInterface.tsx
│   │   │   ├── MessageList.tsx
│   │   │   ├── AgentThinking.tsx
│   │   │   └── InputArea.tsx
│   │   ├── content-generator/
│   │   │   ├── ContentGrid.tsx
│   │   │   ├── CaptionGenerator.tsx
│   │   │   ├── ScriptBuilder.tsx
│   │   │   └── ContentPreview.tsx
│   │   ├── trends/
│   │   │   ├── TrendDashboard.tsx
│   │   │   ├── ViralAnalyzer.tsx
│   │   │   └── TrendInsights.tsx
│   │   ├── campaigns/
│   │   │   ├── CampaignBuilder.tsx
│   │   │   ├── CampaignTimeline.tsx
│   │   │   └── FunnelBuilder.tsx
│   │   ├── brand-memory/
│   │   │   ├── BrandProfile.tsx
│   │   │   ├── VoiceEditor.tsx
│   │   │   └── KnowledgeBase.tsx
│   │   ├── models/
│   │   │   ├── ModelManager.tsx
│   │   │   ├── ModelDownloader.tsx
│   │   │   └── PerformanceMonitor.tsx
│   │   └── shared/
│   │       ├── Card.tsx
│   │       ├── Button.tsx
│   │       ├── Input.tsx
│   │       └── LoadingStates.tsx
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── ContentGenerator.tsx
│   │   ├── Campaigns.tsx
│   │   ├── Trends.tsx
│   │   ├── BrandSettings.tsx
│   │   └── ModelManager.tsx
│   ├── hooks/
│   │   ├── useAgent.ts
│   │   ├── useMemory.ts
│   │   ├── useWorkflow.ts
│   │   ├── useTrends.ts
│   │   └── useLocalStorage.ts
│   ├── state/
│   │   ├── brandStore.ts               # Zustand brand store
│   │   ├── chatStore.ts                # Chat state
│   │   ├── contentStore.ts             # Generated content
│   │   ├── uiStore.ts                  # UI state
│   │   └── modelStore.ts               # Model configuration
│   ├── services/
│   │   ├── tauri-bridge.ts             # Tauri IPC wrapper
│   │   ├── api-client.ts               # API call handler
│   │   ├── content-generator.ts        # Content generation logic
│   │   └── trend-analyzer.ts           # Trend analysis frontend
│   ├── utils/
│   │   ├── formatting.ts
│   │   ├── validation.ts
│   │   └── constants.ts
│   ├── styles/
│   │   ├── globals.css                 # Tailwind + custom CSS
│   │   ├── animations.css
│   │   └── theme.css
│   ├── types/
│   │   ├── index.ts                    # Shared TypeScript types
│   │   ├── agent.ts
│   │   ├── content.ts
│   │   ├── brand.ts
│   │   └── workflow.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.html
│
├── docs/
│   ├── SETUP_GUIDE.md
│   ├── MODEL_RECOMMENDATIONS.md
│   ├── ARCHITECTURE.md (this file)
│   ├── API_REFERENCE.md
│   └── DEPLOYMENT.md
│
├── .github/workflows/
│   ├── build-windows.yml
│   └── tests.yml
│
├── package.json
├── tsconfig.json
├── vite.config.ts
├── Cargo.lock
└── README.md
```

---

## 3. MULTI-AGENT ARCHITECTURE

### Agent System Design

Each agent is an independent executor with:
- **System Prompt**: Defines role and expertise
- **Memory Context**: Access to brand memory
- **Tools**: Available functions
- **Output Schema**: Structured response format

```rust
pub trait Agent: Send + Sync {
    fn name(&self) -> &str;
    fn system_prompt(&self) -> String;
    fn get_tools(&self) -> Vec<Tool>;
    async fn execute(&self, prompt: &str, memory: &Memory) -> Result<AgentOutput>;
}

pub struct AgentOutput {
    pub agent_name: String,
    pub thinking: String,
    pub output: String,
    pub structured_data: Option<serde_json::Value>,
    pub confidence: f32,
    pub used_memory: bool,
}
```

### 7-Agent Team

#### 1. Creative Director Agent
```rust
struct CreativeDirectorAgent {
    ollama_client: OllamaClient,
    memory: Arc<Memory>,
}

// Responsibilities:
// - Campaign direction & theme
// - Visual storytelling
// - Emotional tone & mood
// - Brand narrative arc
// - Seasonal angles
// - Hook development
```

**System Prompt:**
```
You are a world-class Creative Director for a brand agency. Your role is to:

1. Define the overarching creative direction for campaigns
2. Establish emotional tone and mood
3. Create compelling visual storytelling frameworks
4. Develop unique brand narratives
5. Find seasonal and trend-based angles
6. Create powerful hooks that stop scrolls

NEVER generate actual content. You provide direction and frameworks.
You work WITH copywriters and managers who execute.

Brand Context: {brand_context}
Current Trends: {trending_topics}

Respond with:
1. Creative Direction (3-5 sentences)
2. Emotional Tone (specific adjectives)
3. Visual Framework (what audience sees)
4. Core Message (what audience feels)
5. Hook Strategy (how to stop attention)
```

#### 2. Social Media Manager Agent
```rust
struct SocialMediaManagerAgent {
    ollama_client: OllamaClient,
    memory: Arc<Memory>,
    platform_data: PlatformKnowledge,
}

// Responsibilities:
// - Platform optimization
// - Posting strategy & timing
// - Engagement optimization
// - Hashtag strategy
// - Community management
// - Cross-platform adaptation
```

#### 3. Trend Analyst Agent
```rust
struct TrendAnalystAgent {
    ollama_client: OllamaClient,
    scraper: WebScraper,
    feed_aggregator: RSSAggregator,
}

// Responsibilities:
// - Monitor trending topics
// - Analyze viral patterns
// - Identify rising topics
// - Predict trend lifecycle
// - Connect trends to brand
// - Spot micro-trends early
```

#### 4. Script Writer Agent
```rust
struct ScriptWriterAgent {
    ollama_client: OllamaClient,
    memory: Arc<Memory>,
}

// Responsibilities:
// - Short-form video scripts (TikTok, Reels, Shorts)
// - Long-form scripts (YouTube, podcasts)
// - Hook writing
// - Call-to-action copy
// - Dialogue and conversation
// - Story structure
```

#### 5. Brand Voice Agent
```rust
struct BrandVoiceAgent {
    voice_profile: BrandVoiceProfile,
    consistency_checker: ConsistencyEngine,
}

// Responsibilities:
// - Ensure brand consistency
// - Apply brand personality
// - Monitor tone violations
// - Create brand voice guidelines
// - Adapt outputs to match brand
// - Evolve voice over time
```

#### 6. Research Agent
```rust
struct ResearchAgent {
    ollama_client: OllamaClient,
    web_scraper: WebScraper,
    vector_memory: ChromaDB,
}

// Responsibilities:
// - Competitor research
// - Audience psychology analysis
// - Niche deep-dives
// - Market gap identification
// - Content consumption patterns
// - Platform-specific insights
```

#### 7. Content Planner Agent
```rust
struct ContentPlannerAgent {
    ollama_client: OllamaClient,
    calendar_engine: ContentCalendarEngine,
}

// Responsibilities:
// - Create content calendars
// - Schedule optimization
// - Campaign sequencing
// - Content batching
// - Resource allocation
// - Cross-platform planning
```

---

## 4. MEMORY SYSTEM ARCHITECTURE

### Triple-Memory Model

```
┌──────────────────────────────────────────────────┐
│             MEMORY ARCHITECTURE                   │
├──────────────────────────────────────────────────┤
│                                                   │
│  1. SEMANTIC MEMORY (ChromaDB)                    │
│     ├─ Brand context embeddings                   │
│     ├─ Audience psychology                        │
│     ├─ Product specifications                     │
│     ├─ Past successful content                    │
│     └─ Competitor analysis                        │
│                                                   │
│  2. EPISODIC MEMORY (SQLite)                      │
│     ├─ Conversation history                       │
│     ├─ Generated content                          │
│     ├─ Campaign history                           │
│     ├─ Performance metrics                        │
│     └─ Agent interactions                         │
│                                                   │
│  3. BRAND MEMORY (SQLite + ChromaDB hybrid)       │
│     ├─ Brand voice profile                        │
│     ├─ Target audience                            │
│     ├─ Values & mission                           │
│     ├─ Visual identity                            │
│     ├─ Content preferences                        │
│     ├─ Forbidden phrases                          │
│     ├─ Style guide                                │
│     └─ Long-term goals                            │
│                                                   │
└──────────────────────────────────────────────────┘
```

### Memory Management Code

```rust
pub struct Memory {
    pub semantic: ChromaDB,
    pub episodic: SQLiteDB,
    pub brand_profile: BrandProfile,
}

pub struct BrandProfile {
    pub brand_id: String,
    pub voice: VoiceProfile,
    pub audience: AudienceProfile,
    pub products: Vec<Product>,
    pub values: Vec<String>,
    pub visual_identity: VisualIdentity,
    pub forbidden_phrases: Vec<String>,
    pub style_guide: StyleGuide,
}

impl Memory {
    pub async fn add_semantic_memory(
        &self,
        text: &str,
        metadata: HashMap<String, String>,
    ) -> Result<()> {
        // Embed text with local embedding model
        let embedding = self.embed_text(text).await?;
        // Store in ChromaDB with metadata
        self.semantic.upsert(embedding, metadata).await?;
        Ok(())
    }

    pub async fn retrieve_relevant_context(
        &self,
        query: &str,
        top_k: usize,
    ) -> Result<Vec<(String, f32)>> {
        // Query embedding
        let query_embedding = self.embed_text(query).await?;
        // Search ChromaDB
        let results = self.semantic.search(query_embedding, top_k).await?;
        Ok(results)
    }

    pub async fn add_episodic_memory(
        &self,
        event: EpisodeRecord,
    ) -> Result<()> {
        // Store in SQLite
        self.episodic.insert_episode(event).await?;
        Ok(())
    }
}
```

---

## 5. WORKFLOW EXECUTION ENGINE

### Workflow State Machine

```
IDLE
  ↓
REQUEST_RECEIVED
  ↓
ROUTE_TO_AGENTS
  ↓
AGENT_EXECUTION (parallel)
  ├─ Creative Director
  ├─ Social Media Manager
  ├─ Trend Analyst
  ├─ Brand Voice
  └─ Research
  ↓
MEMORY_UPDATE
  ↓
CONSOLIDATE_OUTPUTS
  ↓
BRAND_VOICE_CHECK
  ↓
OUTPUT_READY
  ↓
STREAMING_TO_UI
  ↓
COMPLETE
```

### Workflow Orchestrator

```rust
pub struct WorkflowOrchestrator {
    agents: HashMap<String, Arc<dyn Agent>>,
    memory: Arc<Memory>,
    executor: tokio::runtime::Runtime,
}

impl WorkflowOrchestrator {
    pub async fn execute_workflow(
        &self,
        workflow_type: WorkflowType,
        input: WorkflowInput,
    ) -> Result<WorkflowOutput> {
        match workflow_type {
            WorkflowType::ContentGeneration => {
                self.execute_content_generation(input).await
            }
            WorkflowType::CampaignPlanning => {
                self.execute_campaign_planning(input).await
            }
            WorkflowType::TrendAnalysis => {
                self.execute_trend_analysis(input).await
            }
            WorkflowType::CompetitorResearch => {
                self.execute_competitor_research(input).await
            }
        }
    }

    async fn execute_content_generation(
        &self,
        input: WorkflowInput,
    ) -> Result<WorkflowOutput> {
        // 1. Creative Director sets direction
        let creative_direction = self
            .agents["creative_director"]
            .execute(&input.prompt, &self.memory)
            .await?;

        // 2. Parallel execution of specialized agents
        let futures = vec![
            self.agents["script_writer"].execute(&input.prompt, &self.memory),
            self.agents["social_manager"].execute(&input.prompt, &self.memory),
            self.agents["researcher"].execute(&input.prompt, &self.memory),
        ];

        let results = futures::future::try_join_all(futures).await?;

        // 3. Brand voice check
        let branded_outputs = self
            .agents["brand_voice"]
            .apply_brand_consistency(&results, &self.memory)
            .await?;

        // 4. Memory consolidation
        self.memory
            .add_episodic_memory(EpisodeRecord {
                timestamp: chrono::Utc::now(),
                workflow_type: "content_generation".to_string(),
                input: input.clone(),
                output: branded_outputs.clone(),
            })
            .await?;

        Ok(WorkflowOutput {
            outputs: branded_outputs,
            metadata: WorkflowMetadata {
                agents_used: vec!["creative_director", "script_writer", "social_manager"],
                memory_accessed: true,
                execution_time_ms: 0,
            },
        })
    }
}
```

---

## 6. DATA SCHEMAS

### Core Database Schema

```sql
-- Brands
CREATE TABLE brands (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    niche TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Brand Profiles
CREATE TABLE brand_profiles (
    brand_id TEXT PRIMARY KEY,
    voice_tone TEXT,
    target_audience TEXT,
    products JSON,
    values JSON,
    forbidden_phrases JSON,
    style_guide JSON,
    FOREIGN KEY (brand_id) REFERENCES brands(id)
);

-- Generated Content
CREATE TABLE generated_content (
    id TEXT PRIMARY KEY,
    brand_id TEXT NOT NULL,
    content_type TEXT,
    content TEXT,
    platform TEXT,
    metadata JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (brand_id) REFERENCES brands(id)
);

-- Campaigns
CREATE TABLE campaigns (
    id TEXT PRIMARY KEY,
    brand_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    goal TEXT,
    start_date DATETIME,
    end_date DATETIME,
    posts_scheduled INT,
    status TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (brand_id) REFERENCES brands(id)
);

-- Chat History
CREATE TABLE chat_history (
    id TEXT PRIMARY KEY,
    brand_id TEXT NOT NULL,
    user_message TEXT,
    agent_responses JSON,
    created_at DATETIME,
    FOREIGN KEY (brand_id) REFERENCES brands(id)
);

-- Models
CREATE TABLE models (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    model_id TEXT UNIQUE,
    type TEXT, -- llm, embedding, vision
    size_gb REAL,
    quantization TEXT,
    local_path TEXT,
    is_downloaded BOOLEAN,
    last_used DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Vector Database Schema (ChromaDB)

```python
# Collections in ChromaDB

"brand_context" {
    documents: [brand_description, products, values],
    embeddings: [vectors],
    metadatas: [{brand_id, type: "context"}]
}

"audience_psychology" {
    documents: [audience_insights, demographics, behavior],
    embeddings: [vectors],
    metadatas: [{brand_id, type: "audience"}]
}

"successful_content" {
    documents: [past_viral_posts, case_studies],
    embeddings: [vectors],
    metadatas: [{brand_id, platform, engagement_score}]
}

"competitor_analysis" {
    documents: [competitor_posts, strategies],
    embeddings: [vectors],
    metadatas: [{competitor_name, brand_id}]
}
```

---

## 7. LOCAL MODEL INTEGRATION

### Model Management

```rust
pub struct ModelManager {
    ollama: OllamaClient,
    config: ModelConfig,
    gpu_manager: GPUManager,
}

pub struct ModelConfig {
    pub primary_model: String,           // e.g., "qwen:32b-chat"
    pub fast_model: String,              // e.g., "mistral:7b"
    pub embedding_model: String,         // e.g., "nomic-embed-text"
    pub vram_limit_gb: u32,
    pub cpu_threads: u32,}

impl ModelManager {
    pub async fn load_model(&self, model_id: &str) -> Result<()> {
        // Check if model exists locally
        if !self.model_exists(model_id).await? {
            // Download model
            self.download_model(model_id).await?;
        }

        // Load model into memory
        let response = self.ollama
            .pull_model(model_id)
            .await?;

        // Monitor GPU/CPU usage
        self.gpu_manager.monitor_resources().await?;

        Ok(())
    }

    pub async fn switch_model(&self, model_id: &str) -> Result<()> {
        // Unload current model
        self.ollama.unload_model().await?;

        // Load new model
        self.load_model(model_id).await?;

        Ok(())
    }

    pub async fn get_model_info(&self) -> Result<ModelInfo> {
        let vram_usage = self.gpu_manager.get_gpu_memory_usage().await?;
        let cpu_usage = self.gpu_manager.get_cpu_usage().await?;

        Ok(ModelInfo {
            model_name: self.config.primary_model.clone(),
            vram_usage_gb: vram_usage,
            cpu_usage_percent: cpu_usage,
            is_loaded: true,
        })
    }
}
```

### Recommended Model Configurations

| Use Case | Lightweight | Balanced | High Quality |
|----------|------------|----------|--------------|
| Chat/Reasoning | Phi-3 (3.8B) | Mistral (7B) | Qwen (32B) |
| Embedding | BAAI/bge-small | nomic-embed-text | bge-large |
| Speed Priority | TinyLLaMA | Neural Chat | DeepSeek |
| Quality Priority | - | Llama 2 (13B) | Llama 2 (70B) |

---

## 8. INFERENCE PIPELINE

### Streaming Response Handler

```rust
pub struct InferencePipeline {
    ollama: OllamaClient,
    memory: Arc<Memory>,
    prompt_template: PromptTemplate,
}

impl InferencePipeline {
    pub async fn stream_agent_response<F>(
        &self,
        agent: &dyn Agent,
        prompt: &str,
        on_chunk: F,
    ) -> Result<String>
    where
        F: Fn(String) + Send,
    {
        let system_prompt = agent.system_prompt();
        let full_prompt = self.prompt_template
            .format(&system_prompt, prompt)?;

        let mut response = String::new();

        let mut stream = self.ollama
            .generate_stream(&self.config.primary_model, &full_prompt)
            .await?;

        while let Some(chunk) = stream.next().await {
            let chunk_text = chunk?.response;
            response.push_str(&chunk_text);
            on_chunk(chunk_text); // Stream to UI in real-time
        }

        Ok(response)
    }

    pub async fn batch_inference(
        &self,
        prompts: Vec<String>,
    ) -> Result<Vec<String>> {
        let futures = prompts
            .into_iter()
            .map(|prompt| self.ollama.generate(&self.config.primary_model, &prompt))
            .collect::<Vec<_>>();

        let results = futures::future::try_join_all(futures).await?;
        Ok(results)
    }
}
```

---

## 9. TREND RESEARCH ENGINE

### Trend Detection Pipeline

```rust
pub struct TrendEngine {
    web_scraper: WebScraper,
    rss_aggregator: RSSAggregator,
    trend_analyzer: TrendAnalyzer,
}

impl TrendEngine {
    pub async fn discover_trends(&self) -> Result<Vec<Trend>> {
        // 1. Web scraping (Twitter, Reddit, TikTok APIs)
        let twitter_trends = self.scrape_twitter_trends().await?;
        let reddit_trends = self.scrape_reddit_trends().await?;
        let tiktok_trends = self.scrape_tiktok_trends().await?;

        // 2. RSS feed aggregation
        let news_trends = self.rss_aggregator
            .aggregate_tech_news()
            .await?;

        // 3. Combine and analyze
        let combined = vec![twitter_trends, reddit_trends, tiktok_trends, news_trends]
            .into_iter()
            .flatten()
            .collect();

        // 4. Score relevance to brand
        let scored = self.trend_analyzer
            .score_trends_for_brand(&combined)
            .await?;

        // 5. Sort by velocity
        let mut sorted = scored;
        sorted.sort_by(|a, b| b.velocity.partial_cmp(&a.velocity).unwrap());

        Ok(sorted)
    }

    async fn scrape_twitter_trends(&self) -> Result<Vec<Trend>> {
        // Using Twitter API v2 (free tier access)
        // GET /2/trends/by/woeid
        let trends = self.web_scraper
            .scrape_page("https://x.com/explore/tabs/whats_happening")
            .await?;
        
        // Parse and extract trends
        Ok(extract_twitter_trends(&trends))
    }

    async fn scrape_reddit_trends(&self) -> Result<Vec<Trend>> {
        // Scrape r/popular, r/all
        let popular = self.web_scraper
            .scrape_page("https://reddit.com/r/popular")
            .await?;
        
        Ok(extract_reddit_trends(&popular))
    }

    async fn scrape_tiktok_trends(&self) -> Result<Vec<Trend>> {
        // TikTok discovery API
        // Returns hashtags, sounds, challenges
        let trends = self.web_scraper
            .scrape_tiktok_discovery()
            .await?;
        
        Ok(extract_tiktok_trends(&trends))
    }
}

pub struct Trend {
    pub name: String,
    pub platform: String,
    pub mentions: u32,
    pub velocity: f32,  // growth rate
    pub relevance_score: f32,
    pub content_ideas: Vec<ContentIdea>,
    pub lifecycle_stage: LifecycleStage, // emerging, peak, declining
}
```

---

## 10. TAURI IPC COMMAND STRUCTURE

### IPC Protocol

```rust
// Frontend sends commands, backend processes, streams back results

#[tauri::command]
pub async fn execute_agent_workflow(
    agent_type: String,
    prompt: String,
    brand_id: String,
    window: tauri::Window,
) -> Result<String, String> {
    let orchestrator = ORCHESTRATOR.lock().await;

    let agent = orchestrator
        .agents
        .get(&agent_type)
        .ok_or("Agent not found")?;

    // Stream responses to UI in real-time
    orchestrator
        .execute_streaming(agent, &prompt, move |chunk| {
            window.emit("agent-response", chunk).ok();
        })
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn generate_content(
    content_type: String,
    context: String,
    brand_id: String,
) -> Result<GeneratedContent, String> {
    let orchestrator = ORCHESTRATOR.lock().await;
    let content = orchestrator
        .generate_content(&content_type, &context, &brand_id)
        .await
        .map_err(|e| e.to_string())?;

    Ok(content)
}

#[tauri::command]
pub async fn get_trends(
    brand_id: String,
    limit: usize,
) -> Result<Vec<Trend>, String> {
    let trend_engine = TREND_ENGINE.lock().await;
    let trends = trend_engine
        .discover_trends()
        .await
        .map_err(|e| e.to_string())?;

    Ok(trends.into_iter().take(limit).collect())
}

#[tauri::command]
pub async fn load_model(
    model_id: String,
) -> Result<ModelInfo, String> {
    let model_manager = MODEL_MANAGER.lock().await;
    model_manager
        .load_model(&model_id)
        .await
        .map_err(|e| e.to_string())?;

    model_manager
        .get_model_info()
        .await
        .map_err(|e| e.to_string())
}
```

---

## 11. FRONTEND STATE MANAGEMENT

### Zustand Stores

```typescript
// brandStore.ts
import create from 'zustand';

interface BrandProfile {
  id: string;
  name: string;
  niche: string;
  voice: VoiceProfile;
  audience: AudienceProfile;
  products: Product[];
  values: string[];
}

interface BrandStore {
  brands: BrandProfile[];
  currentBrand: BrandProfile | null;
  setBrand: (brand: BrandProfile) => void;
  createBrand: (brand: BrandProfile) => void;
  updateBrand: (id: string, updates: Partial<BrandProfile>) => void;
}

export const useBrandStore = create<BrandStore>((set) => ({
  brands: [],
  currentBrand: null,

  setBrand: (brand) => set({ currentBrand: brand }),

  createBrand: (brand) =>
    set((state) => ({
      brands: [...state.brands, brand],
      currentBrand: brand,
    })),

  updateBrand: (id, updates) =>
    set((state) => ({
      brands: state.brands.map((b) =>
        b.id === id ? { ...b, ...updates } : b
      ),
      currentBrand:
        state.currentBrand?.id === id
          ? { ...state.currentBrand, ...updates }
          : state.currentBrand,
    })),
}));

// chatStore.ts
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  agentName?: string;
  timestamp: Date;
  thinking?: string;
}

interface ChatStore {
  messages: Message[];
  isLoading: boolean;
  addMessage: (message: Message) => void;
  setLoading: (loading: boolean) => void;
  clearHistory: () => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  messages: [],
  isLoading: false,

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  setLoading: (loading) => set({ isLoading: loading }),

  clearHistory: () => set({ messages: [] }),
}));
```

---

## 12. GPU ACCELERATION STRATEGY

### CUDA/ROCm Integration

```rust
pub struct GPUManager {
    device_type: DeviceType, // CUDA, ROCm, Metal, CPU
    available_vram: u64,
}

enum DeviceType {
    CUDA(String),     // Device ID
    ROCm(String),
    Metal,
    CPU,
}

impl GPUManager {
    pub fn detect_gpu() -> Result<Self> {
        // Detect NVIDIA (CUDA)
        if Self::check_cuda_available() {
            return Ok(GPUManager {
                device_type: DeviceType::CUDA("0".to_string()),
                available_vram: Self::get_cuda_memory(),
            });
        }

        // Detect AMD (ROCm)
        if Self::check_rocm_available() {
            return Ok(GPUManager {
                device_type: DeviceType::ROCm("0".to_string()),
                available_vram: Self::get_rocm_memory(),
            });
        }

        // Fall back to CPU
        Ok(GPUManager {
            device_type: DeviceType::CPU,
            available_vram: 0,
        })
    }

    pub async fn optimize_inference(&self, model_size: u64) -> InferenceConfig {
        match self.device_type {
            DeviceType::CUDA(_) => {
                // Use CUDA kernels
                // Set batch size based on available VRAM
                InferenceConfig {
                    use_gpu: true,
                    batch_size: self.calculate_optimal_batch_size(model_size),
                    precision: Precision::FP16, // Mixed precision for speed
                    quantization: None,
                }
            }
            DeviceType::CPU => {
                // Use quantized models
                InferenceConfig {
                    use_gpu: false,
                    batch_size: 1,
                    precision: Precision::INT8,
                    quantization: Some(Quantization::Q4),
                }
            }
            _ => InferenceConfig::default(),
        }
    }
}
```

---

## 13. DEPLOYMENT STRATEGY

### Windows Bundle Creation

```toml
# Cargo.toml
[package.metadata.bundle]
identifier = "com.brandforge.ai"
icon = ["assets/icon.ico"]
windows = { wix_toolset_path = "C:\\Program Files (x86)\\WiX Toolset v3.14" }

# tauri.conf.json
{
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build",
    "devPath": "http://localhost:1420",
    "frontendDist": "../dist"
  },
  "bundle": {
    "active": true,
    "targets": ["msi", "nsis"],
    "msiWebviewInstallMode": "downloadBootstrapper",
    "nsis": {
      "artifactUrl": "https://github.com/yourusername/brandforge-ai/releases/download/v__VERSION__/",
      "shortcutLocations": ["StartMenu", "Desktop"],
      "installerIcon": "assets/icon.ico"
    }
  }
}
```

### Build Process

```bash
# Install dependencies
npm install
cargo build --release

# Generate Windows installer
cargo tauri build --target x86_64-pc-windows-gnu

# Output: src-tauri/target/release/bundle/
#  ├── msi/
#  └── nsis/
```

---

## 14. PERFORMANCE OPTIMIZATION CHECKLIST

- [ ] Lazy load agents on demand
- [ ] Implement request debouncing for trend fetches
- [ ] Cache embeddings with Redis/local cache
- [ ] Batch process multiple prompts
- [ ] Optimize SQLite queries with indexes
- [ ] Monitor VRAM with background task
- [ ] Implement streaming responses for UX
- [ ] Use Web Workers for heavy frontend computation
- [ ] Implement progressive disclosure in UI
- [ ] Cache trend data with TTL (1 hour)

---

## 15. SECURITY CONSIDERATIONS

- **Local Execution Only**: No external API calls = no data leakage
- **Encrypted Storage**: Use SQLCipher for SQLite encryption
- **Memory Isolation**: Each agent runs in isolated async task
- **Input Validation**: Sanitize all user inputs before LLM processing
- **Rate Limiting**: Limit inference requests to prevent resource exhaustion
- **Access Control**: Manage brand workspace access (future multi-user)

---

## Next Steps

1. **Phase 1**: Core architecture setup (Tauri + React skeleton)
2. **Phase 2**: Local LLM integration (Ollama + Agents)
3. **Phase 3**: Memory system (SQLite + ChromaDB)
4. **Phase 4**: UI implementation (All pages)
5. **Phase 5**: Trend research engine
6. **Phase 6**: Advanced workflows (campaigns, RAG)
7. **Phase 7**: Polish & optimization
8. **Phase 8**: Windows deployment

---

This architecture is production-ready, scalable, and designed to run entirely locally without external dependencies.
