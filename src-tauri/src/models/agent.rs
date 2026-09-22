use crate::error::AppError;
use crate::storage::memory::Memory;
use async_trait::async_trait;
use serde::{Deserialize, Serialize};

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
}

#[async_trait]
pub trait Agent: Send + Sync {
    fn name(&self) -> &str;
    fn system_prompt(&self) -> String;
    fn get_tools(&self) -> Vec<Tool>;
    async fn execute(
        &self,
        prompt: &str,
        memory: &Memory,
        brand_context: &str,
    ) -> Result<AgentOutput, AppError>;
}

pub async fn run_agent<A: Agent + ?Sized>(
    agent: &A,
    prompt: &str,
    memory: &Memory,
    brand_context: &str,
) -> Result<AgentOutput, AppError> {
    let start = std::time::Instant::now();
    let memory_context = memory
        .retrieve_relevant_context(prompt, 5)
        .await
        .unwrap_or_default();
    let context = Memory::format_context(&memory_context);
    let full_context = format!("{}\n{}", brand_context, context);
    let output = agent.execute(prompt, memory, &full_context).await?;
    Ok(AgentOutput {
        execution_time_ms: start.elapsed().as_millis() as u64,
        used_memory: !memory_context.is_empty(),
        ..output
    })
}
