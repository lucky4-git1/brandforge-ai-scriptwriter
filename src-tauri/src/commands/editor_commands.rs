use crate::storage::sqlite;
use crate::ai_runtime::inference_manager::InferenceManager;
use serde::Deserialize;
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct SaveContentVersionRequest {
    pub content_id: String,
    pub version_name: Option<String>,
    pub content: String,
    pub metadata: serde_json::Value,
}

#[derive(Debug, Deserialize)]
pub struct AIEditRequest {
    pub content: String,
    pub action: String,
    pub language: String,
    pub tone: String,
    pub target_language: Option<String>,
}

#[tauri::command]
pub async fn save_content_version(req: SaveContentVersionRequest) -> Result<String, String> {
    let version_id = Uuid::new_v4().to_string();
    sqlite::save_content_version(
        &version_id,
        &req.content_id,
        req.version_name.as_deref(),
        &req.content,
        &req.metadata,
    )
    .map_err(|e| e.to_string())?;
    Ok(version_id)
}

#[tauri::command]
pub async fn get_content_versions(content_id: String) -> Result<Vec<serde_json::Value>, String> {
    let versions = sqlite::get_content_versions(&content_id).map_err(|e| e.to_string())?;
    Ok(versions
        .into_iter()
        .map(|v| serde_json::to_value(v).unwrap())
        .collect())
}

#[tauri::command]
pub async fn get_content_version(version_id: String) -> Result<Option<serde_json::Value>, String> {
    let version = sqlite::get_content_version(&version_id).map_err(|e| e.to_string())?;
    Ok(version.map(|v| serde_json::to_value(v).unwrap()))
}

#[tauri::command]
pub async fn delete_content_version(version_id: String) -> Result<(), String> {
    sqlite::delete_content_version(&version_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn rename_content_version(version_id: String, name: String) -> Result<(), String> {
    let db = sqlite::connection().map_err(|e| e.to_string())?;
    let conn = db.lock();
    conn.execute(
        "UPDATE content_versions SET version_name = ?1 WHERE id = ?2",
        rusqlite::params![name, version_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn update_generated_content(id: String, content: String) -> Result<(), String> {
    sqlite::update_generated_content(&id, &content).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn test_inference() -> Result<serde_json::Value, String> {
    println!("=== Testing InferenceManager ===");
    
    let result = InferenceManager::run(
        "Say hello",
        &[],
        "You are a helpful assistant.",
    )
    .await
    .map_err(|e| {
        println!("Test inference error: {}", e);
        format!("Test inference failed: {}", e)
    })?;
    
    println!("Test inference success: {}", result.text);
    Ok(serde_json::json!({
        "result": result.text,
        "provider": result.provider,
        "model": result.model
    }))
}

#[tauri::command]
pub async fn ai_edit_content(req: AIEditRequest) -> Result<serde_json::Value, String> {
    println!("=== AI Edit Request ===");
    println!("Action: {}", req.action);
    println!("Language: {}", req.language);
    println!("Tone: {}", req.tone);
    println!("Content length: {}", req.content.len());
    println!("Content preview: {}", &req.content.chars().take(100).collect::<String>());
    
    // Validate inputs
    if req.content.is_empty() {
        return Err("Content cannot be empty".to_string());
    }
    
    if req.action.is_empty() {
        return Err("Action cannot be empty".to_string());
    }
    
    let instruction = get_ai_edit_instruction(&req.action, &req.language, &req.tone, req.target_language.as_deref());
    println!("Instruction: {}", instruction);
    
    // Build the full prompt with instruction and content
    let full_prompt = format!("{}\n\nContent to edit:\n{}", instruction, req.content);
    println!("Full prompt length: {}", full_prompt.len());
    
    println!("Calling InferenceManager...");
    let result = InferenceManager::run(
        &full_prompt,
        &[],
        "You are an expert content editor. Preserve the original meaning while improving the content according to the instruction.",
    )
    .await;
    
    match &result {
        Ok(r) => println!("AI Edit Success - Result length: {}", r.text.len()),
        Err(e) => println!("AI Edit Error: {}", e),
    }
    
    let result = result.map_err(|e| {
        println!("AI Edit Error details: {}", e);
        format!("AI edit failed: {}", e)
    })?;
    
    println!("AI Edit Result preview: {}", &result.text.chars().take(200).collect::<String>());
    Ok(serde_json::json!({ "content": result.text }))
}

fn get_ai_edit_instruction(action: &str, language: &str, tone: &str, target_language: Option<&str>) -> String {
    // Local language instruction function to avoid circular dependency
    let language_instruction = match language {
        "telugu" => "Write the content in Telugu script (Unicode). Use natural Telugu speech patterns and vocabulary.",
        "roman-telugu" => "Write the content in Roman Telugu (Telugu language written entirely in the English alphabet, similar to Hinglish). Do not use any Telugu script. Use natural Telugu speech patterns and vocabulary.",
        "hindi" => "Write the content in Hindi script (Devanagari Unicode). Use natural Hindi speech patterns.",
        "hinglish" => "Write the content in Hinglish (Hindi written in English alphabet). Use English letters with Hindi vocabulary and grammar patterns.",
        "tamil" => "Write the content in Tamil script (Unicode). Use natural Tamil speech patterns.",
        "tanglish" => "Write the content in Tanglish (Tamil written in English alphabet). Use English letters with Tamil vocabulary and grammar patterns.",
        _ => "Write the content in English.",
    };
    
    match action {
        "shorten" => format!("Shorten this content while preserving key points. {}. Tone: {}.", language_instruction, tone),
        "expand" => format!("Expand this content with more detail and examples. {}. Tone: {}.", language_instruction, tone),
        "improve-hook" => format!("Improve the opening hook to be more engaging and attention-grabbing. {}. Tone: {}.", language_instruction, tone),
        "improve-cta" => format!("Strengthen the call to action to be more compelling. {}. Tone: {}.", language_instruction, tone),
        "emotional" => format!("Make this content more emotionally resonant while maintaining professionalism. {}. Tone: {}.", language_instruction, tone),
        "professional" => format!("Enhance the professional tone and polish the language. {}. Tone: {}.", language_instruction, tone),
        "rewrite" => format!("Completely rewrite this content while preserving the core message. {}. Tone: {}.", language_instruction, tone),
        "translate" => {
            let target = target_language.unwrap_or("English");
            format!("Translate this content to {}. Preserve the original meaning and tone.", target)
        },
        "convert-language" => {
            let target = target_language.unwrap_or("English");
            match target {
                "Roman Telugu" => "Convert this content to Roman Telugu (Telugu language written entirely in the English alphabet, similar to Hinglish). Do not use any Telugu script.".to_string(),
                "Hinglish" => "Convert this content to Hinglish (Hindi written in English alphabet).".to_string(),
                "Tanglish" => "Convert this content to Tanglish (Tamil written in English alphabet).".to_string(),
                _ => format!("Convert this content to {}.", target),
            }
        },
        _ => format!("Edit this content. {}. Tone: {}.", language_instruction, tone),
    }
}
