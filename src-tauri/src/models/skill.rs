use serde::{Deserialize, Serialize};
use std::collections::HashSet;

const DEFAULT_SKILL_IDS: [&str; 4] = [
    "content-creator",
    "script-writer",
    "trend-analyzer",
    "content-manager",
];

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillConfig {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub category: String,
    #[serde(default)]
    pub icon: String,
    #[serde(default)]
    pub is_default: bool,
    #[serde(default)]
    pub config: serde_json::Value,
}

#[derive(Debug, Clone)]
pub struct SkillSelection {
    ids: HashSet<String>,
    skills: Vec<SkillConfig>,
    use_defaults: bool,
    selected_builtin_count: usize,
}

impl SkillSelection {
    pub fn from_optional(skills: Option<Vec<SkillConfig>>) -> Self {
        Self::from_slice(skills.as_deref().unwrap_or(&[]))
    }

    pub fn from_slice(skills: &[SkillConfig]) -> Self {
        let use_defaults = skills.is_empty();
        let ids: HashSet<String> = if use_defaults {
            DEFAULT_SKILL_IDS.iter().map(|id| id.to_string()).collect()
        } else {
            skills.iter().map(|skill| skill.id.clone()).collect()
        };
        let selected_builtin_count = ids
            .iter()
            .filter(|id| DEFAULT_SKILL_IDS.contains(&id.as_str()))
            .count();

        Self {
            ids,
            skills: skills.to_vec(),
            use_defaults,
            selected_builtin_count,
        }
    }

    pub fn enabled(&self, id: &str) -> bool {
        if DEFAULT_SKILL_IDS.contains(&id) && self.selected_builtin_count == 0 {
            return true;
        }

        self.ids.contains(id)
    }

    pub fn enabled_ids(&self) -> Vec<String> {
        let mut ids = self.ids.iter().cloned().collect::<Vec<_>>();
        ids.sort();
        ids
    }

    pub fn prompt_context(&self) -> String {
        if self.use_defaults {
            return "Active skills: default full content workflow".into();
        }

        let descriptions = self
            .skills
            .iter()
            .map(|skill| {
                let config_instruction = skill
                    .config
                    .get("promptInstruction")
                    .or_else(|| skill.config.get("instruction"))
                    .or_else(|| skill.config.get("systemPrompt"))
                    .and_then(|v| v.as_str())
                    .unwrap_or("");

                let detail = [skill.description.as_str(), config_instruction]
                    .into_iter()
                    .filter(|part| !part.trim().is_empty())
                    .collect::<Vec<_>>()
                    .join(" ");

                if detail.is_empty() {
                    format!("{} ({})", skill.name, skill.id)
                } else {
                    format!("{} ({}): {}", skill.name, skill.id, detail)
                }
            })
            .collect::<Vec<_>>()
            .join(" | ");

        format!("Active skills: {}", descriptions)
    }
}
