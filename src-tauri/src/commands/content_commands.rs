use crate::ai_runtime::inference_manager::InferenceManager;
use crate::models::brand::GeneratedContentRecord;
use crate::models::skill::{SkillConfig, SkillSelection};
use crate::storage::sqlite;
use serde::Deserialize;
use uuid::Uuid;

const QUICK_SCRIPT: &str = r#"Write a concise short-form video script.

Brand: {{brand_name}}
Tone: {{voice}}
Platform: {{platform}}
Language: {{language}}
Language instruction: {{language_instruction}}
Context: {{context}}
Skill guidance: {{skills}}

Return only these sections:

## VIDEO TITLE
## HOOK
## SCENES
3-5 numbered beats with visual direction and voiceover.
## CTA
## CAPTION
## HASHTAGS

Keep it practical, specific, and ready to shoot."#;

#[derive(Debug, Deserialize)]
pub struct GenerateContentRequest {
    pub content_type: String,
    pub context: String,
    pub brand_id: String,
    pub platform: Option<String>,
    pub language: Option<String>,
    pub active_skills: Option<Vec<SkillConfig>>,
}

pub fn get_language_instruction(language: &str) -> String {
    match language {
        "telugu" => "Write the content in Telugu script (Unicode). Use natural Telugu speech patterns and vocabulary.".to_string(),
        "roman-telugu" => "Write the content in Tenglish (Telugu language written entirely in the English alphabet, e.g., 'Namaskaram, ela unnaru?'). You MUST use English letters ONLY. Absolutely NO native Telugu script is allowed.".to_string(),
        "hindi" => "Write the content in Hindi script (Devanagari Unicode). Use natural Hindi speech patterns.".to_string(),
        "hinglish" => "Write the content in Hinglish (Hindi written in English alphabet). Use English letters with Hindi vocabulary and grammar patterns.".to_string(),
        "tamil" => "Write the content in Tamil script (Unicode). Use natural Tamil speech patterns.".to_string(),
        "tanglish" => "Write the content in Tanglish (Tamil written in English alphabet). Use English letters with Tamil vocabulary and grammar patterns.".to_string(),
        _ => "Write the content in English.".to_string(),
    }
}



#[tauri::command]
pub async fn generate_content(req: GenerateContentRequest) -> Result<serde_json::Value, String> {
    let brand = sqlite::get_brand(&req.brand_id).map_err(|e| e.to_string())?;
    let skills = SkillSelection::from_optional(req.active_skills.clone());
    let language = req.language.as_deref().unwrap_or("english");
    let language_instruction = get_language_instruction(language);
    
    let display_language = match language {
        "roman-telugu" => "Tenglish (Roman Telugu)",
        "hinglish" => "Hinglish",
        "tanglish" => "Tanglish",
        _ => language,
    };
    
    let brand_ctx = format!(
        "brand_name: {}\nniche: {}\ntone: {}\nlanguage: {}\n{}",
        brand.name,
        brand.niche,
        brand.profile.voice.tone,
        display_language,
        skills.prompt_context()
    );

    let output = match req.content_type.as_str() {
        "caption" => {
            if !skills.enabled("content-creator") {
                return Err(
                    "Content Creator skill is not active. Enable it to generate captions.".into(),
                );
            }
            let result = InferenceManager::run(
                "Write an engaging {{platform}} caption.\nLanguage: {{language}}\nLanguage instruction: {{language_instruction}}\nContext: {{context}}\nSkill guidance: {{skills}}",
                &[
                    ("platform", req.platform.as_deref().unwrap_or("instagram")),
                    ("language", display_language),
                    ("language_instruction", &language_instruction),
                    ("context", &req.context),
                    ("skills", &skills.prompt_context()),
                ],
                &format!("You are a social media copywriter.\n{}", brand_ctx),
            )
            .await
            .map_err(|e| e.to_string())?;
            result.text
        }
        "script" | "hook" => {
            if !skills.enabled("script-writer") {
                return Err(
                    "Content Script Writer skill is not active. Enable it to generate scripts."
                        .into(),
                );
            }
            let platform = req.platform.as_deref().unwrap_or("tiktok");
            let result = InferenceManager::run(
                QUICK_SCRIPT,
                &[
                    ("brand_name", &brand.name),
                    ("voice", &brand.profile.voice.tone),
                    ("platform", platform),
                    ("language", display_language),
                    ("language_instruction", &language_instruction),
                    ("context", &req.context),
                    ("skills", &skills.prompt_context()),
                ],
                &format!(
                    "You are a fast, practical short-form video scriptwriter.\n{}",
                    brand_ctx
                ),
            )
            .await
            .map_err(|e| e.to_string())?;
            result.text
        }
        _ => {
            return Err(format!("Unknown content type: {}", req.content_type));
        }
    };



    let refined = output.clone();

    let record = GeneratedContentRecord {
        id: Uuid::new_v4().to_string(),
        brand_id: req.brand_id,
        content_type: req.content_type,
        platform: req.platform.unwrap_or_else(|| "instagram".into()),
        content: refined.clone(),
        metadata: serde_json::json!({
            "hooks": [],
            "cta": "",
            "active_skills": skills.enabled_ids(),
            "content_manager": skills.enabled("content-manager"),
            "language": language
        }),
        created_at: chrono::Utc::now().to_rfc3339(),
    };
    sqlite::save_generated_content(&record).map_err(|e| e.to_string())?;

    Ok(serde_json::json!({
        "content": refined,
        "id": record.id,
        "hooks": [],
        "cta": "",
        "language": language
    }))
}

#[tauri::command]
pub async fn generate_caption(
    context: String,
    brand_id: String,
    platform: String,
    language: Option<String>,
    active_skills: Option<Vec<SkillConfig>>,
) -> Result<serde_json::Value, String> {
    generate_content(GenerateContentRequest {
        content_type: "caption".into(),
        context,
        brand_id,
        platform: Some(platform),
        language,
        active_skills,
    })
    .await
}

#[tauri::command]
pub async fn generate_script(
    context: String,
    brand_id: String,
    platform: Option<String>,
    language: Option<String>,
    active_skills: Option<Vec<SkillConfig>>,
) -> Result<serde_json::Value, String> {
    generate_content(GenerateContentRequest {
        content_type: "script".into(),
        context,
        brand_id,
        platform: Some(platform.unwrap_or_else(|| "tiktok".into())),
        language,
        active_skills,
    })
    .await
}

#[tauri::command]
pub async fn get_workspace_content(
    brand_id: Option<String>,
) -> Result<Vec<GeneratedContentRecord>, String> {
    sqlite::get_generated_content(brand_id.as_deref()).map_err(|e| e.to_string())
}
