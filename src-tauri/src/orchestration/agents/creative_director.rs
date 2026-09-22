use crate::error::AppError;
use crate::models::agent::{Agent, AgentOutput, Tool};
use crate::storage::memory::Memory;
use async_trait::async_trait;

pub struct CreativeDirectorAgent;

#[async_trait]
impl Agent for CreativeDirectorAgent {
    fn name(&self) -> &str {
        "Creative Director"
    }

    fn system_prompt(&self) -> String {
        r#"You are a world-class Creative Director for a modern brand agency.
Define creative direction, emotional tone, visual framework, core message, and hook strategy.
Be bold, insightful, and trend-aware. Output clear structured sections."#
            .into()
    }

    fn get_tools(&self) -> Vec<Tool> {
        vec![
            Tool {
                name: "retrieve_brand_context".into(),
                description: "Get brand voice and values".into(),
            },
            Tool {
                name: "search_viral_patterns".into(),
                description: "Analyze viral content patterns".into(),
            },
        ]
    }

    async fn execute(
        &self,
        prompt: &str,
        _memory: &Memory,
        brand_context: &str,
    ) -> Result<AgentOutput, AppError> {
        let result = crate::ai_runtime::inference_manager::InferenceManager::run(
            "{{prompt}}",
            &[("prompt", prompt)],
            &format!("{}\n{}", self.system_prompt(), brand_context),
        )
        .await?;
        Ok(AgentOutput {
            agent_name: self.name().to_string(),
            thinking: "Analyzed brand, trends, and audience for creative direction".into(),
            output: result.text,
            structured_data: None,
            confidence: 0.92,
            used_memory: false,
            execution_time_ms: 0,
        })
    }
}
