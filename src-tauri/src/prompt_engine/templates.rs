pub fn agent_prompt(system: &str, context: &str, user_request: &str) -> String {
    format!(
        "{}\n\n## Brand & Memory Context\n{}\n\n## User Request\n{}\n\nRespond with structured, actionable output.",
        system,
        if context.is_empty() {
            "(no additional context)"
        } else {
            context
        },
        user_request
    )
}

pub const CONTENT_IDEAS: &str = r#"Brand: {{brand_name}} | Niche: {{niche}}
Creative direction: {{creative_direction}}
Trend insights: {{trends}}

Generate 5 content ideas as JSON array. Each item: title, hook, platform, format, rationale."#;

pub const SCRIPT_FULL: &str = r#"You MUST write a complete short-form VIDEO SCRIPT (minimum 250 words). Do NOT output only a title or one-liner.

Brand: {{brand_name}}
Voice/tone: {{voice}}
Topic/idea: {{idea}}
Platform: {{platform}} (optimize pacing & format for this platform)
Language: {{language}}
Trend hooks: {{hooks}}
Creative direction: {{creative_direction}}

Write the full script using EXACTLY these section headers:

## VIDEO TITLE
(one line)

## HOOK (0-3 seconds)
(word-for-word spoken hook + visual direction)

## SCENE-BY-SCENE
| Time | Visual / B-Roll | Audio / Voiceover |
(at least 4 rows)

## FULL VOICEOVER SCRIPT
(complete spoken script, line by line)

## ON-SCREEN TEXT
(key text overlays)

## CTA
(call to action — spoken + visual)

## CAPTION
(post caption, 2-4 sentences)

## HASHTAGS
(10 relevant hashtags)"#;

pub const SCRIPT_REFINE: &str = r#"Polish this video script for brand voice. KEEP ALL SECTIONS AND LENGTH. Do not remove scenes or shorten below 200 words.

Tone: {{tone}}
Forbidden: {{forbidden}}
Language: {{language}}

SCRIPT:
{{content}}"#;
