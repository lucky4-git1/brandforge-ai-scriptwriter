use crate::ai_runtime::inference_manager::InferenceManager;
use crate::error::AppError;
use crate::models::agent::{Agent, AgentOutput, Tool};
use crate::models::brand::ContentIdea;
use crate::prompt_engine::templates::CONTENT_IDEAS;
use crate::storage::memory::Memory;
use async_trait::async_trait;

pub struct ContentIdeaGeneratorAgent;

#[async_trait]
impl Agent for ContentIdeaGeneratorAgent {
    fn name(&self) -> &str {
        "Content Idea Generator"
    }

    fn system_prompt(&self) -> String {
        "You generate viral content ideas grounded in trends and brand strategy. Return valid JSON array only.".into()
    }

    fn get_tools(&self) -> Vec<Tool> {
        vec![Tool {
            name: "trend_context".into(),
            description: "Access trend analysis".into(),
        }]
    }

    async fn execute(
        &self,
        prompt: &str,
        _memory: &Memory,
        brand_context: &str,
    ) -> Result<AgentOutput, AppError> {
        let brand_name = extract_field(brand_context, "brand_name", "Brand");
        let niche = extract_field(brand_context, "niche", "marketing");
        let creative = extract_field(prompt, "creative_direction", prompt);
        let trends = extract_field(prompt, "trends", "");

        let result = InferenceManager::run(
            CONTENT_IDEAS,
            &[
                ("brand_name", &brand_name),
                ("niche", &niche),
                ("creative_direction", &creative),
                ("trends", &trends),
            ],
            &format!("{}\n{}", self.system_prompt(), brand_context),
        )
        .await?;

        let ideas = parse_ideas(&result.text);
        Ok(AgentOutput {
            agent_name: self.name().to_string(),
            thinking: "Generated content ideas from trends + creative direction".into(),
            output: result.text.clone(),
            structured_data: Some(serde_json::to_value(&ideas).unwrap_or_default()),
            confidence: 0.88,
            used_memory: false,
            execution_time_ms: 0,
        })
    }
}

fn extract_field(text: &str, key: &str, default: &str) -> String {
    for line in text.lines() {
        if line
            .to_lowercase()
            .starts_with(&format!("{}:", key.to_lowercase()))
        {
            return line
                .split(':')
                .skip(1)
                .collect::<Vec<_>>()
                .join(":")
                .trim()
                .to_string();
        }
    }
    default.to_string()
}

pub fn parse_ideas(text: &str) -> Vec<ContentIdea> {
    if let Ok(ideas) = serde_json::from_str::<Vec<ContentIdea>>(text) {
        return ideas;
    }
    if let Some(start) = text.find('[') {
        if let Some(end) = text.rfind(']') {
            if let Ok(ideas) = serde_json::from_str::<Vec<ContentIdea>>(&text[start..=end]) {
                return ideas;
            }
        }
    }
    vec![ContentIdea {
        title: "Trend-led educational short".into(),
        hook: "Stop scrolling if you want to grow faster".into(),
        platform: "tiktok".into(),
        format: "short_video".into(),
        rationale: "Educational hooks with trend keywords perform well".into(),
    }]
}

pub fn ideas_from_output(output: &AgentOutput) -> Vec<ContentIdea> {
    output
        .structured_data
        .as_ref()
        .and_then(|v| serde_json::from_value(v.clone()).ok())
        .unwrap_or_else(|| parse_ideas(&output.output))
}
