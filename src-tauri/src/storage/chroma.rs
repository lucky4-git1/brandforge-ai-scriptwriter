use crate::error::AppError;
use crate::storage::vector_store;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

const CHROMA_URL: &str = "http://127.0.0.1:8000";

#[derive(Serialize)]
struct ChromaAddRequest {
    ids: Vec<String>,
    documents: Vec<String>,
    metadatas: Vec<HashMap<String, String>>,
}

pub async fn init_chroma() -> Result<(), AppError> {
    if is_chroma_available().await {
        eprintln!("ChromaDB available at {}", CHROMA_URL);
    } else {
        eprintln!("ChromaDB not running; using SQLite vector fallback");
    }
    Ok(())
}

pub async fn is_chroma_available() -> bool {
    Client::new()
        .get(format!("{}/api/v1/heartbeat", CHROMA_URL))
        .send()
        .await
        .map(|r| r.status().is_success())
        .unwrap_or(false)
}

pub async fn upsert(
    collection: &str,
    brand_id: &str,
    document: &str,
    metadata: HashMap<String, String>,
) -> Result<(), AppError> {
    if is_chroma_available().await {
        let id = uuid::Uuid::new_v4().to_string();
        let url = format!("{}/api/v1/collections/{}/add", CHROMA_URL, collection);
        let _ = Client::new()
            .post(&url)
            .json(&ChromaAddRequest {
                ids: vec![id],
                documents: vec![document.to_string()],
                metadatas: vec![metadata.clone()],
            })
            .send()
            .await;
    }
    vector_store::upsert_document(brand_id, collection, document, metadata)
}

pub async fn search(
    brand_id: &str,
    query: &str,
    top_k: usize,
) -> Result<Vec<(String, f32)>, AppError> {
    if is_chroma_available().await {
        #[derive(Deserialize)]
        struct QueryResult {
            documents: Option<Vec<Vec<String>>>,
            distances: Option<Vec<Vec<f32>>>,
        }
        let url = format!("{}/api/v1/collections/brand_context/query", CHROMA_URL);
        let body = serde_json::json!({
            "query_texts": [query],
            "n_results": top_k,
            "where": {"brand_id": brand_id}
        });
        if let Ok(resp) = Client::new().post(&url).json(&body).send().await {
            if let Ok(data) = resp.json::<QueryResult>().await {
                if let (Some(docs), Some(dist)) = (data.documents, data.distances) {
                    if let (Some(d), Some(scores)) = (docs.first(), dist.first()) {
                        return Ok(d
                            .iter()
                            .zip(scores.iter())
                            .map(|(text, score)| (text.clone(), 1.0 - score))
                            .collect());
                    }
                }
            }
        }
    }
    vector_store::search(brand_id, query, top_k)
}
