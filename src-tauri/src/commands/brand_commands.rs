use crate::models::brand::{Brand, BrandProfile};
use crate::storage::memory::Memory;
use crate::storage::sqlite;
use chrono::Utc;
use serde::Deserialize;
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct CreateBrandPayload {
    pub id: Option<String>,
    pub name: String,
    pub niche: String,
    pub description: Option<String>,
    pub profile: Option<BrandProfile>,
}

#[tauri::command]
pub async fn create_brand(payload: CreateBrandPayload) -> Result<Brand, String> {
    let now = Utc::now().to_rfc3339();
    let brand = Brand {
        id: payload.id.unwrap_or_else(|| Uuid::new_v4().to_string()),
        name: payload.name,
        niche: payload.niche.clone(),
        description: payload.description.unwrap_or_default(),
        profile: payload.profile.unwrap_or_default(),
        created_at: now.clone(),
        updated_at: now,
    };
    sqlite::insert_brand(&brand).map_err(|e| e.to_string())?;
    let memory = Memory::for_brand(&brand.id);
    let profile_text = serde_json::to_string(&brand.profile).unwrap_or_default();
    memory
        .index_brand(&brand.name, &brand.niche, &profile_text)
        .await
        .map_err(|e| e.to_string())?;
    Ok(brand)
}

#[tauri::command]
pub async fn get_brands() -> Result<Vec<Brand>, String> {
    sqlite::get_brands().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_brand_profile(
    brand_id: String,
    profile: BrandProfile,
) -> Result<Brand, String> {
    let mut brand = sqlite::get_brand(&brand_id).map_err(|e| e.to_string())?;
    brand.profile = profile;
    brand.updated_at = Utc::now().to_rfc3339();
    sqlite::insert_brand(&brand).map_err(|e| e.to_string())?;
    Ok(brand)
}
