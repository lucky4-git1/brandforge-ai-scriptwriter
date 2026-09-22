use crate::ai_runtime::inference_manager::InferenceManager;
use crate::error::AppError;
use crate::models::agent::{Agent, AgentOutput, Tool};
use crate::prompt_engine::templates::SCRIPT_FULL;
use crate::storage::memory::Memory;
use async_trait::async_trait;

pub struct ScriptWriterAgent;

#[async_trait]
impl Agent for ScriptWriterAgent {
    fn name(&self) -> &str {
        "Script Writer"
    }

    fn system_prompt(&self) -> String {
        r#"You are an expert short-form VIDEO scriptwriter for TikTok, Instagram Reels, and YouTube Shorts.
You always deliver full production-ready scripts with hooks, scenes, voiceover, and CTA — never just a title."#
            .into()
    }

    fn get_tools(&self) -> Vec<Tool> {
        vec![]
    }

    async fn execute(
        &self,
        prompt: &str,
        memory: &Memory,
        brand_context: &str,
    ) -> Result<AgentOutput, AppError> {
        let ctx = memory
            .retrieve_relevant_context(prompt, 3)
            .await
            .unwrap_or_default();
        let memory_text = Memory::format_context(&ctx);
        let brand_name = extract(prompt, "brand_name", "Brand");
        let voice = extract(prompt, "voice", &memory_text);
        let idea = extract(prompt, "idea", prompt);
        let platform = extract(prompt, "platform", "tiktok");
        let hooks = extract(prompt, "hooks", "");
        let creative_direction = extract(prompt, "creative_direction", "");
        let language = extract(prompt, "language", "english");

        let result = InferenceManager::run(
            SCRIPT_FULL,
            &[
                ("brand_name", &brand_name),
                ("voice", &voice),
                ("idea", &idea),
                ("platform", &platform),
                ("hooks", &hooks),
                ("creative_direction", &creative_direction),
                ("language", &language),
            ],
            &format!("{}\n{}", self.system_prompt(), brand_context),
        )
        .await?;

        Ok(AgentOutput {
            agent_name: self.name().to_string(),
            thinking: "Crafted full video script with scenes and voiceover".into(),
            output: result.text,
            structured_data: None,
            confidence: 0.9,
            used_memory: !ctx.is_empty(),
            execution_time_ms: 0,
        })
    }
}

pub async fn generate_video_script(
    brand_name: &str,
    voice: &str,
    topic: &str,
    platform: &str,
    language: &str,
    hooks: &str,
    creative_direction: &str,
    brand_context: &str,
) -> Result<String, AppError> {
    let agent = ScriptWriterAgent;
    let prompt = format!(
        "brand_name: {}\nvoice: {}\nidea: {}\nplatform: {}\nlanguage: {}\nhooks: {}\ncreative_direction: {}",
        brand_name, voice, topic, platform, language, hooks, creative_direction
    );
    let out = agent
        .execute(&prompt, &Memory::for_brand("script"), brand_context)
        .await?;
    Ok(out.output)
}

fn extract(text: &str, key: &str, default: &str) -> String {
    for line in text.lines() {
        if line.to_lowercase().starts_with(&format!("{}:", key)) {
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
