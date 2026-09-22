use crate::error::AppError;
use crate::prompt_engine::templates::SCRIPT_REFINE;

/// Light brand-voice pass that preserves full script length and structure.
pub async fn refine_script(content: &str, tone: &str, forbidden: &str, language: &str, brand_context: &str) -> Result<String, AppError> {
    if content.lines().count() < 8 {
        return Ok(content.to_string());
    }
    let result = crate::ai_runtime::inference_manager::InferenceManager::run(
        SCRIPT_REFINE,
        &[
            ("tone", tone),
            ("forbidden", forbidden),
            ("language", language),
            ("content", content),
        ],
        &format!("You polish video scripts without shortening them.\n{}", brand_context),
    )
    .await?;
    let refined = result.text;
    if refined.split_whitespace().count() < content.split_whitespace().count() / 2 {
        return Ok(content.to_string());
    }
    Ok(refined)
}
