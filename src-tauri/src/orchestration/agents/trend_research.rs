use crate::error::AppError;
use crate::models::agent::{Agent, AgentOutput, Tool};
use crate::models::brand::TrendAnalysis;
use crate::research::trends::TrendEngine;
use crate::storage::memory::Memory;
use async_trait::async_trait;
use serde_json::json;

pub struct TrendResearchAgent {
    pub engine: TrendEngine,
}

impl TrendResearchAgent {
    pub fn new() -> Self {
        Self {
            engine: TrendEngine::new(),
        }
    }
}

#[async_trait]
impl Agent for TrendResearchAgent {
    fn name(&self) -> &str {
        "Trend Research"
    }

    fn system_prompt(&self) -> String {
        "You synthesize trend signals into actionable marketing intelligence.".into()
    }

    fn get_tools(&self) -> Vec<Tool> {
        vec![
            Tool {
                name: "fetch_rss".into(),
                description: "RSS trend ingestion".into(),
            },
            Tool {
                name: "scrape_reddit".into(),
                description: "Reddit hot posts".into(),
            },
            Tool {
                name: "youtube_trends".into(),
                description: "YouTube trend extraction".into(),
            },
        ]
    }

    async fn execute(
        &self,
        prompt: &str,
        _memory: &Memory,
        brand_context: &str,
    ) -> Result<AgentOutput, AppError> {
        let niche = extract_niche(prompt, brand_context);
        let brand_id = extract_brand_id(brand_context);
        let trends = self.engine.research(&niche, brand_id.as_deref()).await?;
        let analysis = TrendEngine::build_analysis(&trends);
        let summary = format!(
            "Topics: {}\nHooks: {}\nPatterns: {}",
            analysis.trending_topics.join(", "),
            analysis.viral_hooks.join(" | "),
            analysis.engagement_patterns.join("; ")
        );
        Ok(AgentOutput {
            agent_name: self.name().to_string(),
            thinking: format!(
                "Ingested {} signals from RSS, Reddit, YouTube",
                trends.len()
            ),
            output: summary,
            structured_data: Some(json!(analysis)),
            confidence: 0.95,
            used_memory: false,
            execution_time_ms: 0,
        })
    }
}

fn extract_niche(prompt: &str, ctx: &str) -> String {
    for line in format!("{}\n{}", ctx, prompt).lines() {
        if line.to_lowercase().contains("niche:") {
            return line
                .split(':')
                .nth(1)
                .unwrap_or("marketing")
                .trim()
                .to_string();
        }
    }
    "marketing".into()
}

fn extract_brand_id(ctx: &str) -> Option<String> {
    for line in ctx.lines() {
        if line.to_lowercase().contains("brand_id:") {
            return line.split(':').nth(1).map(|s| s.trim().to_string());
        }
    }
    None
}

pub fn analysis_from_output(output: &AgentOutput) -> TrendAnalysis {
    output
        .structured_data
        .as_ref()
        .and_then(|v| serde_json::from_value(v.clone()).ok())
        .unwrap_or(TrendAnalysis {
            trending_topics: vec![],
            viral_hooks: vec![],
            engagement_patterns: vec![],
            content_angles: vec![],
        })
}
