use crate::error::AppError;
use crate::storage::sqlite::connection;
use rusqlite::params;
use std::collections::HashMap;
use uuid::Uuid;

pub fn embed_text(text: &str) -> Vec<f32> {
    let mut vec = vec![0.0f32; 256];
    for token in text.to_lowercase().split_whitespace() {
        let hash = fnv_hash(token);
        let idx = (hash as usize) % 256;
        vec[idx] += 1.0;
    }
    let norm: f32 = vec.iter().map(|x| x * x).sum::<f32>().sqrt();
    if norm > 0.0 {
        for v in &mut vec {
            *v /= norm;
        }
    }
    vec
}

fn fnv_hash(s: &str) -> u32 {
    let mut hash: u32 = 2166136261;
    for b in s.bytes() {
        hash ^= b as u32;
        hash = hash.wrapping_mul(16777619);
    }
    hash
}

fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
    a.iter().zip(b.iter()).map(|(x, y)| x * y).sum()
}

pub fn upsert_document(
    brand_id: &str,
    collection: &str,
    document: &str,
    metadata: HashMap<String, String>,
) -> Result<(), AppError> {
    let embedding = embed_text(document);
    let db = connection()?;
    let conn = db.lock();
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "INSERT OR REPLACE INTO memory_vectors (id, brand_id, collection, document, embedding_json, metadata_json, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            id,
            brand_id,
            collection,
            document,
            serde_json::to_string(&embedding)?,
            serde_json::to_string(&metadata)?,
            now,
        ],
    )?;
    Ok(())
}

pub fn search(brand_id: &str, query: &str, top_k: usize) -> Result<Vec<(String, f32)>, AppError> {
    let query_emb = embed_text(query);
    let db = connection()?;
    let conn = db.lock();
    let mut stmt =
        conn.prepare("SELECT document, embedding_json FROM memory_vectors WHERE brand_id = ?1")?;
    let rows = stmt.query_map(params![brand_id], |row| {
        let doc: String = row.get(0)?;
        let emb_json: String = row.get(1)?;
        let emb: Vec<f32> = serde_json::from_str(&emb_json).unwrap_or_default();
        Ok((doc, cosine_similarity(&query_emb, &emb)))
    })?;
    let mut results: Vec<(String, f32)> = rows.filter_map(|r| r.ok()).collect();
    results.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
    results.truncate(top_k);
    Ok(results)
}

pub fn index_brand_profile(
    brand_id: &str,
    name: &str,
    niche: &str,
    profile_text: &str,
) -> Result<(), AppError> {
    let doc = format!("Brand: {} | Niche: {} | {}", name, niche, profile_text);
    let mut meta = HashMap::new();
    meta.insert("type".into(), "brand_context".into());
    upsert_document(brand_id, "brand_context", &doc, meta)
}
