use crate::error::AppError;
use crate::models::agent::run_agent;
use crate::models::brand::{ContentIdea, GeneratedContentRecord, PipelineResult};
use crate::models::skill::{SkillConfig, SkillSelection};
use crate::orchestration::agents::brand_voice::refine_script;
use crate::orchestration::agents::script_writer::generate_video_script;
use crate::orchestration::agents::{
    analysis_from_output, ideas_from_output, ContentIdeaGeneratorAgent, TrendResearchAgent,
};
use crate::storage::memory::Memory;
use crate::storage::sqlite;
use serde_json::json;
use tauri::Window;
use uuid::Uuid;

const EVT_PROGRESS: &str = "workflow-progress";
const EVT_STREAM: &str = "agent-response";

pub struct ContentPipeline;

impl ContentPipeline {
    pub async fn run_full(
        window: &Window,
        brand_id: &str,
        topic: &str,
        platform: &str,
        language: &str,
        active_skills: &[SkillConfig],
    ) -> Result<PipelineResult, AppError> {
        let workflow_id = Uuid::new_v4().to_string();
        let brand = sqlite::get_brand(brand_id)?;
        let memory = Memory::for_brand(brand_id);
        let skills = SkillSelection::from_slice(active_skills);

        let profile_text = format!(
            "tone: {} | audience: {} | products: {:?}",
            brand.profile.voice.tone, brand.profile.audience.demographics, brand.profile.products
        );
        memory
            .index_brand(&brand.name, &brand.niche, &profile_text)
            .await?;

        let dynamic_memory = memory.get_brand_context_for_generation(topic).await.unwrap_or_default();
        let brand_ctx = format!(
            "brand_id: {}\nbrand_name: {}\nniche: {}\ntone: {}\nlanguage: {}\nforbidden: {}\n{}\n{}",
            brand.id,
            brand.name,
            brand.niche,
            brand.profile.voice.tone,
            language,
            brand.profile.voice.forbidden_phrases.join(", "),
            skills.prompt_context(),
            dynamic_memory
        );

        let mut steps = vec![];
        let emit_step = |w: &Window, step: &str, status: &str| {
            let _ = w.emit(
                EVT_PROGRESS,
                json!({ "workflowId": workflow_id, "step": step, "status": status }),
            );
        };

        sqlite::save_workflow_run(
            &workflow_id,
            brand_id,
            "content_pipeline",
            "running",
            &json!([]),
            None,
        )?;

        // 1. Trend research (no LLM — fast)
        let trends = if skills.enabled("trend-analyzer") {
            emit_step(window, "trend_research", "running");
            let trend_agent = TrendResearchAgent::new();
            let trend_prompt = format!(
                "niche: {}\ntopic: {}\nlanguage: {}\n{}",
                brand.niche,
                topic,
                language,
                skills.prompt_context()
            );
            let trend_out = run_agent(&trend_agent, &trend_prompt, &memory, &brand_ctx).await?;
            let trends = analysis_from_output(&trend_out);
            steps.push(
                json!({"step": "trend_research", "status": "complete", "skill": "trend-analyzer"}),
            );
            emit_step(window, "trend_research", "complete");
            trends
        } else {
            steps.push(json!({"step": "trend_research", "status": "skipped", "reason": "Trend Analyzer skill inactive"}));
            emit_step(window, "trend_research", "skipped");
            crate::models::brand::TrendAnalysis {
                trending_topics: vec![],
                viral_hooks: vec![],
                engagement_patterns: vec![],
                content_angles: vec![],
            }
        };

        let trends_text = serde_json::to_string(&trends)?;
        let hooks = trends.viral_hooks.join(" | ");

        // 2. Content ideas (single LLM call — skip separate creative director for speed)
        let creative_direction = format!(
            "Topic: {} | Platform: {} | Brand: {} | Niche: {} | Language: {} | {}",
            topic,
            platform,
            brand.name,
            brand.niche,
            language,
            skills.prompt_context()
        );
        let ideas: Vec<ContentIdea> = if skills.enabled("content-creator") {
            emit_step(window, "content_ideas", "running");
            let idea_agent = ContentIdeaGeneratorAgent;
            let idea_prompt = format!(
                "creative_direction: {}\ntrends: {}\nbrand_name: {}\nniche: {}\nlanguage: {}\n{}",
                creative_direction,
                trends_text,
                brand.name,
                brand.niche,
                language,
                skills.prompt_context()
            );
            let idea_out = run_agent(&idea_agent, &idea_prompt, &memory, &brand_ctx).await?;
            let ideas = ideas_from_output(&idea_out);
            steps.push(
                json!({"step": "content_ideas", "status": "complete", "skill": "content-creator"}),
            );
            emit_step(window, "content_ideas", "complete");
            ideas
        } else {
            steps.push(json!({"step": "content_ideas", "status": "skipped", "reason": "Content Creator skill inactive"}));
            emit_step(window, "content_ideas", "skipped");
            vec![ContentIdea {
                title: topic.to_string(),
                hook: hooks.clone(),
                platform: platform.to_string(),
                format: "short_video".into(),
                rationale: "Generated directly from the user topic because Content Creator skill is inactive".into(),
            }]
        };

        // 3. ONE full video script for the selected platform
        let scripts = if skills.enabled("script-writer") {
            emit_step(window, "script_writer", "running");
            let primary = ideas.first();
            let idea_title = primary.map(|i| i.title.as_str()).unwrap_or(topic);
            let idea_hook = primary.map(|i| i.hook.as_str()).unwrap_or(&hooks);
            let script_topic = format!("{} — {}", idea_title, topic);

            let raw_script = generate_video_script(
                &brand.name,
                &brand.profile.voice.tone,
                &script_topic,
                platform,
                language,
                &hooks,
                &creative_direction,
                &brand_ctx,
            )
            .await?;

            let _ = window.emit(EVT_STREAM, &raw_script);

            let refined = refine_script(
                &raw_script,
                &brand.profile.voice.tone,
                &brand.profile.voice.forbidden_phrases.join(", "),
                language,
                &brand_ctx,
            )
            .await
            .unwrap_or(raw_script);

            let record = GeneratedContentRecord {
                id: Uuid::new_v4().to_string(),
                brand_id: brand_id.to_string(),
                content_type: "script".into(),
                platform: platform.to_string(),
                content: refined.clone(),
                metadata: json!({
                    "title": idea_title,
                    "hook": idea_hook,
                    "topic": topic,
                    "format": "video_script",
                    "word_count": refined.split_whitespace().count(),
                    "active_skills": skills.enabled_ids(),
                    "content_manager": skills.enabled("content-manager"),
                    "calendar_ready": skills.enabled("content-manager"),
                    "language": language
                }),
                created_at: chrono::Utc::now().to_rfc3339(),
            };
            sqlite::save_generated_content(&record)?;
            memory
                .add_generated_content_memory("script", &refined)
                .await?;
                
            let _ = memory.learn_from_content(&record.id, &refined, "script").await;

            steps.push(json!({"step": "script_writer", "status": "complete", "scripts": 1, "skill": "script-writer"}));
            emit_step(window, "script_writer", "complete");
            vec![record]
        } else {
            steps.push(json!({"step": "script_writer", "status": "skipped", "reason": "Content Script Writer skill inactive"}));
            emit_step(window, "script_writer", "skipped");
            vec![]
        };

        let script_count = scripts.len();
        let result = PipelineResult {
            workflow_id: workflow_id.clone(),
            trends,
            ideas,
            scripts,
            creative_direction,
        };

        sqlite::save_workflow_run(
            &workflow_id,
            brand_id,
            "content_pipeline",
            "complete",
            &json!(steps),
            Some(&serde_json::to_value(&result)?),
        )?;

        emit_step(window, "complete", "complete");
        let _ = window.emit("workflow-complete", &result);

        memory
            .add_episodic_memory(crate::storage::memory::EpisodeRecord {
                workflow_type: "content_pipeline".into(),
                input: topic.to_string(),
                output: format!("{} video script(s) generated in {}", script_count, language),
            })
            .await?;

        Ok(result)
    }
}
