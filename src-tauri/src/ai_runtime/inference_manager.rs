use crate::ai_runtime::llm_provider;
use crate::error::AppError;
use crate::prompt_engine::PromptEngine;
use crate::storage::settings::get_llm_config;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InferenceResult {
    pub text: String,
    pub model: String,
    pub provider: String,
    pub tokens_approx: usize,
}

pub struct InferenceManager;

impl InferenceManager {
    pub async fn run(
        template: &str,
        variables: &[(&str, &str)],
        system: &str,
    ) -> Result<InferenceResult, AppError> {
        let user = PromptEngine::render(template, variables);
        
        let requires_roman_telugu = system.contains("roman-telugu-enforcer") || system.contains("telugu-tanglish-script-writer");
        
        println!("[RomanTelugu]\nSkill detected: {}", requires_roman_telugu);
        
        let mut final_system = system.to_string();
        if requires_roman_telugu {
            println!("[RomanTelugu]\nPrompt injection applied");
            let roman_telugu_rules = "CRITICAL:
Generate content in Roman Telugu only.
Use English alphabet characters only.
Never output Telugu Unicode characters.
Never output Hindi Unicode characters.
Never output Indic scripts.
Transliterate all Telugu words into English letters.";
            final_system = format!("{}\n\n{}", roman_telugu_rules, system);
        }

        println!("[RomanTelugu]\nPrompt before model execution:\n{}", final_system);

        let mut text = llm_provider::complete(&final_system, &user).await?;
        
        if requires_roman_telugu {
            let has_telugu_unicode = text.chars().any(|c| {
                let u = c as u32;
                u >= 0x0C00 && u <= 0x0C7F
            });
            
            println!("[RomanTelugu]\nValidation result: {}", has_telugu_unicode);
            
            if has_telugu_unicode {
                println!("[RomanTelugu]\nUnicode Telugu detected");
                println!("[RomanTelugu]\nRegenerating output");
                
                let retry_system = format!(
                    "{}\n\nCRITICAL ENFORCEMENT FAILURE: Your previous output contained Telugu Unicode. \
                     You MUST rewrite it using ONLY English letters. Transliterate to Roman Telugu. NO Indic scripts.", 
                    final_system
                );
                
                let retry_text = llm_provider::complete(&retry_system, &user).await?;
                
                let still_has_telugu = retry_text.chars().any(|c| {
                    let u = c as u32;
                    u >= 0x0C00 && u <= 0x0C7F
                });

                
                if still_has_telugu {
                    eprintln!("[RomanTeluguValidator] Unicode Telugu detected after retry. Returning output.");
                }
                
                text = retry_text;
            }
        }
        let config = get_llm_config().unwrap_or_default();
        Ok(InferenceResult {
            model: config.model,
            provider: config.provider,
            tokens_approx: text.split_whitespace().count(),
            text,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_roman_telugu_enforcement() {
        let brand_context = "Active skills: telugu-tanglish-script-writer (Write scripts in Roman Telugu)";
        let template = "Write a very short 1 sentence greeting in Telugu.";
        
        println!("--- RUNNING TEST: RAW SCRIPT ---");
        let result = InferenceManager::run(template, &[], brand_context).await;
        
        assert!(result.is_ok(), "InferenceManager::run failed");
        let result = result.unwrap();
        
        let has_telugu = result.text.chars().any(|c| {
            let u = c as u32;
            u >= 0x0C00 && u <= 0x0C7F
        });
        
        assert!(!has_telugu, "Output contained Telugu Unicode! Text: {}", result.text);
        println!("SUCCESS: No Telugu Unicode in text: {}", result.text);
    }
}
