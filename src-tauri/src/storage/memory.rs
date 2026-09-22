use crate::error::AppError;
use crate::storage::chroma;
use crate::storage::sqlite;
use crate::storage::vector_store;
use crate::ai_runtime::inference_manager::InferenceManager;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct VoiceProfile {
    pub tone: String,
    pub personality: Vec<String>,
    pub forbidden_phrases: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AudienceProfile {
    pub demographics: String,
    pub psychographics: String,
    pub pain_points: Vec<String>,
}

pub struct Memory {
    pub brand_id: String,
}

impl Memory {
    pub fn for_brand(brand_id: &str) -> Self {
        Self {
            brand_id: brand_id.to_string(),
        }
    }

    pub async fn retrieve_relevant_context(
        &self,
        query: &str,
        top_k: usize,
    ) -> Result<Vec<(String, f32)>, AppError> {
        chroma::search(&self.brand_id, query, top_k).await
    }

    pub async fn add_semantic_memory(
        &self,
        text: &str,
        collection: &str,
        metadata: HashMap<String, String>,
    ) -> Result<(), AppError> {
        chroma::upsert(collection, &self.brand_id, text, metadata).await
    }

    pub async fn index_brand(
        &self,
        name: &str,
        niche: &str,
        profile_text: &str,
    ) -> Result<(), AppError> {
        vector_store::index_brand_profile(&self.brand_id, name, niche, profile_text)?;
        let mut meta = HashMap::new();
        meta.insert("brand_id".into(), self.brand_id.clone());
        self.add_semantic_memory(profile_text, "brand_context", meta)
            .await
    }

    pub async fn add_generated_content_memory(
        &self,
        content_type: &str,
        content: &str,
    ) -> Result<(), AppError> {
        let mut meta = HashMap::new();
        meta.insert("type".into(), content_type.into());
        self.add_semantic_memory(content, "successful_content", meta)
            .await
    }

    pub fn format_context(context: &[(String, f32)]) -> String {
        context
            .iter()
            .map(|(text, score)| format!("[relevance {:.2}] {}", score, text))
            .collect::<Vec<_>>()
            .join("\n")
    }

    /// Extacts learning from a piece of generated content and stores it
    pub async fn learn_from_content(&self, content_id: &str, content: &str, content_type: &str) -> Result<(), AppError> {
        let system_prompt = "You are an expert content strategist. Extract 1 or 2 concise key learnings from the provided content about what tone, structure, or hooks work well. Return ONLY a bulleted list of 1-2 points.";
        let result = InferenceManager::run(
            "Extract learnings from this {{type}} content:\n\n{{content}}",
            &[
                ("type", content_type),
                ("content", content),
            ],
            system_prompt,
        ).await?;
        
        sqlite::save_brand_learning(&self.brand_id, "content_structure", &result.text, Some(content_id))?;
        
        // Also index it semantically
        let mut meta = HashMap::new();
        meta.insert("type".into(), "brand_learning".into());
        meta.insert("source_content_id".into(), content_id.into());
        self.add_semantic_memory(&result.text, "brand_context", meta).await?;

        let audience_prompt = "You are an audience strategist. Infer the primary audience signal from this content. Return one concise sentence describing who this is for or what audience pain point it addresses.";
        if let Ok(audience) = InferenceManager::run(
            "Infer the audience signal from this {{type}} content:\n\n{{content}}",
            &[
                ("type", content_type),
                ("content", content),
            ],
            audience_prompt,
        ).await {
            let insight = audience.text.trim();
            if !insight.is_empty() {
                self.accumulate_audience_insight("generated_content", insight).await?;
            }
        }
        
        Ok(())
    }

    /// Assembles a rich brand context string for the prompt engine, combining vector search and explicit memories
    pub async fn get_brand_context_for_generation(&self, query: &str) -> Result<String, AppError> {
        let mut context_parts = Vec::new();
        
        // 1. Get explicitly accumulated audience insights
        let insights = sqlite::get_audience_insights(&self.brand_id)?;
        if !insights.is_empty() {
            context_parts.push("=== Audience Insights ===".to_string());
            for insight in insights.iter().take(5) {
                context_parts.push(format!("- {}: {}", insight.insight_type, insight.insight_text));
            }
        }
        
        // 2. Get explicitly extracted brand learnings
        let learnings = sqlite::get_brand_learnings(&self.brand_id, None, 5)?;
        if !learnings.is_empty() {
            context_parts.push("\n=== Historical Learnings ===".to_string());
            for learning in learnings {
                context_parts.push(format!("- {}", learning.insight));
            }
        }
        
        // 3. Vector search for similar semantic memory
        let semantic_memory = self.retrieve_relevant_context(query, 3).await?;
        if !semantic_memory.is_empty() {
            context_parts.push("\n=== Relevant Past Content & Rules ===".to_string());
            context_parts.push(Self::format_context(&semantic_memory));
        }
        
        Ok(context_parts.join("\n"))
    }

    /// Records user feedback on a piece of content
    pub async fn record_content_feedback(&self, content_id: &str, rating: i32, notes: Option<&str>) -> Result<(), AppError> {
        sqlite::save_content_performance(content_id, &self.brand_id, rating, notes)?;
        
        if let Some(feedback) = notes {
            if !feedback.is_empty() {
                // Store textual feedback as a learning directly
                sqlite::save_brand_learning(&self.brand_id, "user_feedback", feedback, Some(content_id))?;
                
                let mut meta = HashMap::new();
                meta.insert("type".into(), "user_feedback".into());
                meta.insert("source_content_id".into(), content_id.into());
                meta.insert("rating".into(), rating.to_string());
                self.add_semantic_memory(feedback, "brand_context", meta).await?;
            }
        }
        
        Ok(())
    }

    /// Accumulates manual or AI-extracted insights about the audience
    pub async fn accumulate_audience_insight(&self, insight_type: &str, insight_text: &str) -> Result<(), AppError> {
        sqlite::save_audience_insight(&self.brand_id, insight_type, insight_text)?;
        
        let mut meta = HashMap::new();
        meta.insert("type".into(), "audience_insight".into());
        meta.insert("insight_type".into(), insight_type.into());
        self.add_semantic_memory(insight_text, "brand_context", meta).await?;
        
        Ok(())
    }
}

pub struct EpisodeRecord {
    pub workflow_type: String,
    pub input: String,
    pub output: String,
}

impl Memory {
    pub async fn add_episodic_memory(&self, event: EpisodeRecord) -> Result<(), AppError> {
        let id = uuid::Uuid::new_v4().to_string();
        let content = format!(
            "Workflow: {} | Input: {} | Output: {}",
            event.workflow_type, event.input, event.output
        );
        sqlite::save_chat_message(&id, &self.brand_id, "system", &content, Some("episodic"))?;
        Ok(())
    }
}
