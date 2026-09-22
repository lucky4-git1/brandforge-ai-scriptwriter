use crate::error::AppError;
use crate::models::agent::run_agent;
use crate::models::agent::AgentOutput;
use crate::orchestration::agents::{CreativeDirectorAgent, ScriptWriterAgent, TrendResearchAgent};
use crate::storage::memory::Memory;
use std::collections::HashMap;
use std::sync::Arc;

pub struct WorkflowOrchestrator {
    pub memory: Arc<Memory>,
}

impl WorkflowOrchestrator {
    pub fn new() -> Self {
        Self {
            memory: Arc::new(Memory::for_brand("default")),
        }
    }

    pub fn with_brand(brand_id: &str) -> Self {
        Self {
            memory: Arc::new(Memory::for_brand(brand_id)),
        }
    }

    pub async fn execute_workflow(
        &self,
        workflow_type: &str,
        input: &str,
        brand_id: &str,
        brand_context: &str,
    ) -> Result<Vec<AgentOutput>, AppError> {
        let memory = Memory::for_brand(brand_id);
        match workflow_type {
            "content_generation" => {
                let cd = run_agent(&CreativeDirectorAgent, input, &memory, brand_context).await?;
                let sw = run_agent(
                    &ScriptWriterAgent,
                    &format!("{}\n\n{}", cd.output, input),
                    &memory,
                    brand_context,
                )
                .await?;
                Ok(vec![cd, sw])
            }
            "trend_analysis" => {
                let ta = TrendResearchAgent::new();
                let out = run_agent(&ta, input, &memory, brand_context).await?;
                Ok(vec![out])
            }
            _ => Err(AppError::WorkflowNotFound),
        }
    }

    pub fn get_agent_status() -> HashMap<String, String> {
        let mut m = HashMap::new();
        for name in [
            "Creative Director",
            "Trend Research",
            "Content Idea Generator",
            "Script Writer",
            "Brand Voice",
        ] {
            m.insert(name.to_string(), "ready".to_string());
        }
        m
    }
}
