pub mod templates;

pub struct PromptEngine;

impl PromptEngine {
    pub fn render(template: &str, variables: &[(&str, &str)]) -> String {
        let mut out = template.to_string();
        for (key, value) in variables {
            let placeholder = format!("{{{{{}}}}}", key);
            out = out.replace(&placeholder, value);
        }
        out
    }

    pub fn build_agent_prompt(system: &str, context: &str, user_request: &str) -> String {
        templates::agent_prompt(system, context, user_request)
    }
}
