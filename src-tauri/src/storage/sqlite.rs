use crate::error::AppError;
use crate::models::brand::{Brand, BrandProfile, GeneratedContentRecord, TrendRecord};
use once_cell::sync::OnceCell;
use parking_lot::Mutex;
use rusqlite::{params, Connection};
use std::path::PathBuf;

static DB: OnceCell<Mutex<Connection>> = OnceCell::new();

pub fn db_path() -> PathBuf {
    let dir = dirs::data_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("brandforge-ai");
    std::fs::create_dir_all(&dir).ok();
    dir.join("brandforge.db")
}

pub fn connection() -> Result<&'static Mutex<Connection>, AppError> {
    if let Some(db) = DB.get() {
        return Ok(db);
    }
    let path = db_path();
    let conn = Connection::open(&path)?;
    run_migrations(&conn)?;
    DB.set(Mutex::new(conn))
        .map_err(|_| AppError::DatabaseError("Database already initialized".into()))?;
    Ok(DB.get().unwrap())
}

pub async fn init_database() -> Result<(), AppError> {
    let _ = connection()?;
    Ok(())
}

fn run_migrations(conn: &Connection) -> Result<(), AppError> {
    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS brands (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            niche TEXT NOT NULL,
            description TEXT,
            profile_json TEXT NOT NULL DEFAULT '{}',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS generated_content (
            id TEXT PRIMARY KEY,
            brand_id TEXT NOT NULL,
            content_type TEXT NOT NULL,
            platform TEXT,
            content TEXT NOT NULL,
            metadata_json TEXT NOT NULL DEFAULT '{}',
            created_at TEXT NOT NULL,
            FOREIGN KEY (brand_id) REFERENCES brands(id)
        );

        CREATE TABLE IF NOT EXISTS trends (
            id TEXT PRIMARY KEY,
            brand_id TEXT,
            source TEXT NOT NULL,
            title TEXT NOT NULL,
            url TEXT,
            summary TEXT,
            keywords_json TEXT,
            created_at TEXT NOT NULL,
            growth_velocity REAL DEFAULT 0,
            audience_relevance REAL DEFAULT 0,
            source_frequency REAL DEFAULT 0,
            competition_level REAL DEFAULT 0,
            freshness REAL DEFAULT 0,
            trend_score REAL DEFAULT 0,
            analysis_json TEXT
        );

        CREATE TABLE IF NOT EXISTS memory_vectors (
            id TEXT PRIMARY KEY,
            brand_id TEXT NOT NULL,
            collection TEXT NOT NULL,
            document TEXT NOT NULL,
            embedding_json TEXT NOT NULL,
            metadata_json TEXT NOT NULL DEFAULT '{}',
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS workflow_runs (
            id TEXT PRIMARY KEY,
            brand_id TEXT NOT NULL,
            workflow_type TEXT NOT NULL,
            status TEXT NOT NULL,
            steps_json TEXT NOT NULL DEFAULT '[]',
            result_json TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS chat_history (
            id TEXT PRIMARY KEY,
            brand_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            agent_name TEXT,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS app_settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS content_versions (
            id TEXT PRIMARY KEY,
            content_id TEXT NOT NULL,
            version_number INTEGER NOT NULL,
            version_name TEXT,
            content TEXT NOT NULL,
            metadata_json TEXT NOT NULL DEFAULT '{}',
            created_at TEXT NOT NULL,
            FOREIGN KEY (content_id) REFERENCES generated_content(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS brand_learnings (
            id TEXT PRIMARY KEY,
            brand_id TEXT NOT NULL,
            category TEXT NOT NULL,
            insight TEXT NOT NULL,
            source_content_id TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (brand_id) REFERENCES brands(id)
        );

        CREATE TABLE IF NOT EXISTS content_performance (
            id TEXT PRIMARY KEY,
            content_id TEXT NOT NULL,
            brand_id TEXT NOT NULL,
            rating INTEGER NOT NULL DEFAULT 0,
            notes TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (content_id) REFERENCES generated_content(id),
            FOREIGN KEY (brand_id) REFERENCES brands(id)
        );

        CREATE TABLE IF NOT EXISTS audience_insights (
            id TEXT PRIMARY KEY,
            brand_id TEXT NOT NULL,
            insight_type TEXT NOT NULL,
            insight_text TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (brand_id) REFERENCES brands(id)
        );
        "#,
    )?;
    Ok(())
}

pub fn insert_brand(brand: &Brand) -> Result<(), AppError> {
    let db = connection()?;
    let conn = db.lock();
    let profile_json = serde_json::to_string(&brand.profile)?;
    conn.execute(
        "INSERT OR REPLACE INTO brands (id, name, niche, description, profile_json, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            brand.id,
            brand.name,
            brand.niche,
            brand.description,
            profile_json,
            brand.created_at,
            brand.updated_at,
        ],
    )?;
    Ok(())
}

pub fn get_brands() -> Result<Vec<Brand>, AppError> {
    let db = connection()?;
    let conn = db.lock();
    let mut stmt = conn.prepare(
        "SELECT id, name, niche, description, profile_json, created_at, updated_at FROM brands ORDER BY updated_at DESC",
    )?;
    let rows = stmt.query_map([], |row| {
        let profile_json: String = row.get(4)?;
        let profile: BrandProfile = serde_json::from_str(&profile_json).unwrap_or_default();
        Ok(Brand {
            id: row.get(0)?,
            name: row.get(1)?,
            niche: row.get(2)?,
            description: row.get(3)?,
            profile,
            created_at: row.get(5)?,
            updated_at: row.get(6)?,
        })
    })?;
    Ok(rows.filter_map(|r| r.ok()).collect())
}

pub fn get_brand(id: &str) -> Result<Brand, AppError> {
    get_brands()?
        .into_iter()
        .find(|b| b.id == id)
        .ok_or(AppError::BrandNotFound)
}

pub fn save_generated_content(record: &GeneratedContentRecord) -> Result<(), AppError> {
    let db = connection()?;
    let conn = db.lock();
    let meta = serde_json::to_string(&record.metadata)?;
    conn.execute(
        "INSERT OR REPLACE INTO generated_content (id, brand_id, content_type, platform, content, metadata_json, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            record.id,
            record.brand_id,
            record.content_type,
            record.platform,
            record.content,
            meta,
            record.created_at,
        ],
    )?;
    Ok(())
}

pub fn get_generated_content(
    brand_id: Option<&str>,
) -> Result<Vec<GeneratedContentRecord>, AppError> {
    let db = connection()?;
    let conn = db.lock();
    let sql = if brand_id.is_some() {
        "SELECT id, brand_id, content_type, platform, content, metadata_json, created_at FROM generated_content WHERE brand_id = ?1 ORDER BY created_at DESC"
    } else {
        "SELECT id, brand_id, content_type, platform, content, metadata_json, created_at FROM generated_content ORDER BY created_at DESC"
    };
    let mut stmt = conn.prepare(sql)?;
    let rows = if let Some(bid) = brand_id {
        stmt.query_map(params![bid], map_content_row)?
    } else {
        stmt.query_map([], map_content_row)?
    };
    Ok(rows.filter_map(|r| r.ok()).collect())
}

fn map_content_row(row: &rusqlite::Row) -> rusqlite::Result<GeneratedContentRecord> {
    let meta_json: String = row.get(5)?;
    let metadata: serde_json::Value =
        serde_json::from_str(&meta_json).unwrap_or(serde_json::json!({}));
    Ok(GeneratedContentRecord {
        id: row.get(0)?,
        brand_id: row.get(1)?,
        content_type: row.get(2)?,
        platform: row.get(3)?,
        content: row.get(4)?,
        metadata,
        created_at: row.get(6)?,
    })
}

pub fn insert_trends(trends: &[TrendRecord]) -> Result<(), AppError> {
    let db = connection()?;
    let conn = db.lock();

    // Ensure the new columns exist
    conn.execute("ALTER TABLE trends ADD COLUMN type TEXT", [])
        .ok(); // Ignore error if column already exists

    conn.execute("ALTER TABLE trends ADD COLUMN platform TEXT", [])
        .ok();

    conn.execute("ALTER TABLE trends ADD COLUMN thumbnail_url TEXT", [])
        .ok();

    conn.execute("ALTER TABLE trends ADD COLUMN view_count INTEGER", [])
        .ok();

    conn.execute("ALTER TABLE trends ADD COLUMN published_at TEXT", [])
        .ok();

    conn.execute("ALTER TABLE trends ADD COLUMN growth_velocity REAL DEFAULT 0", [])
        .ok();
    conn.execute("ALTER TABLE trends ADD COLUMN audience_relevance REAL DEFAULT 0", [])
        .ok();
    conn.execute("ALTER TABLE trends ADD COLUMN source_frequency REAL DEFAULT 0", [])
        .ok();
    conn.execute("ALTER TABLE trends ADD COLUMN competition_level REAL DEFAULT 0", [])
        .ok();
    conn.execute("ALTER TABLE trends ADD COLUMN freshness REAL DEFAULT 0", [])
        .ok();
    conn.execute("ALTER TABLE trends ADD COLUMN trend_score REAL DEFAULT 0", [])
        .ok();
    conn.execute("ALTER TABLE trends ADD COLUMN analysis_json TEXT", [])
        .ok();
    
    // Add source attribution fields
    conn.execute("ALTER TABLE trends ADD COLUMN source_platforms TEXT DEFAULT '[]'", [])
        .ok();
    conn.execute("ALTER TABLE trends ADD COLUMN source_count INTEGER DEFAULT 1", [])
        .ok();
    conn.execute("ALTER TABLE trends ADD COLUMN source_urls TEXT DEFAULT '[]'", [])
        .ok();
    conn.execute("ALTER TABLE trends ADD COLUMN first_seen TEXT", [])
        .ok();
    conn.execute("ALTER TABLE trends ADD COLUMN last_seen TEXT", [])
        .ok();

    for t in trends {
        let kw = serde_json::to_string(&t.keywords)?;
        let analysis_json = t.analysis.as_ref().map(|a| serde_json::to_string(a).unwrap_or_default());
        let source_platforms_json = serde_json::to_string(&t.source_platforms)?;
        let source_urls_json = serde_json::to_string(&t.source_urls)?;
        
        conn.execute(
            "INSERT OR REPLACE INTO trends (id, brand_id, source, title, url, summary, keywords_json, created_at, type, platform, thumbnail_url, view_count, published_at, growth_velocity, audience_relevance, source_frequency, competition_level, freshness, trend_score, analysis_json, source_platforms, source_count, source_urls, first_seen, last_seen)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23, ?24, ?25)",
            params![
                t.id,
                t.brand_id,
                t.source,
                t.title,
                t.url,
                t.summary,
                kw,
                t.created_at,
                t.r#type,
                t.platform,
                t.thumbnail_url,
                t.view_count,
                t.published_at,
                t.growth_velocity,
                t.audience_relevance,
                t.source_frequency,
                t.competition_level,
                t.freshness,
                t.trend_score,
                analysis_json,
                source_platforms_json,
                t.source_count,
                source_urls_json,
                t.first_seen,
                t.last_seen,
            ],
        )?;
    }
    Ok(())
}

pub fn get_trends(brand_id: Option<&str>, limit: i64) -> Result<Vec<TrendRecord>, AppError> {
    let db = connection()?;
    let conn = db.lock();
    let (sql, has_brand) = match brand_id {
        Some(bid) if !bid.is_empty() => (
            "SELECT id, brand_id, source, title, url, summary, keywords_json, created_at, type, platform, thumbnail_url, view_count, published_at, growth_velocity, audience_relevance, source_frequency, competition_level, freshness, trend_score, analysis_json, source_platforms, source_count, source_urls, first_seen, last_seen \
             FROM trends WHERE brand_id = ?1 ORDER BY trend_score DESC, created_at DESC LIMIT ?2",
            true
        ),
        _ => (
            "SELECT id, brand_id, source, title, url, summary, keywords_json, created_at, type, platform, thumbnail_url, view_count, published_at, growth_velocity, audience_relevance, source_frequency, competition_level, freshness, trend_score, analysis_json, source_platforms, source_count, source_urls, first_seen, last_seen \
             FROM trends ORDER BY trend_score DESC, created_at DESC LIMIT ?1",
            false
        )
    };

    fn map_trend_row(row: &rusqlite::Row) -> rusqlite::Result<TrendRecord> {
        let kw: String = row.get(6)?;
        let analysis_json: Option<String> = row.get(19)?;
        let analysis = analysis_json.and_then(|s| serde_json::from_str(&s).ok());
        
        let source_platforms_json: String = row.get(20).unwrap_or_else(|_| "[]".to_string());
        let source_platforms = serde_json::from_str(&source_platforms_json).unwrap_or_default();
        
        let source_urls_json: String = row.get(22).unwrap_or_else(|_| "[]".to_string());
        let source_urls = serde_json::from_str(&source_urls_json).unwrap_or_default();
        
        Ok(TrendRecord {
            id: row.get(0)?,
            brand_id: row.get(1)?,
            source: row.get(2)?,
            title: row.get(3)?,
            url: row.get(4)?,
            summary: row.get(5)?,
            keywords: serde_json::from_str(&kw).unwrap_or_default(),
            created_at: row.get(7)?,
            r#type: row.get(8)?,
            platform: row.get(9)?,
            thumbnail_url: row.get(10)?,
            view_count: row.get(11)?,
            published_at: row.get(12)?,
            growth_velocity: row.get(13)?,
            audience_relevance: row.get(14)?,
            source_frequency: row.get(15)?,
            competition_level: row.get(16)?,
            freshness: row.get(17)?,
            trend_score: row.get(18)?,
            analysis,
            source_platforms,
            source_count: row.get(21).unwrap_or(1),
            source_urls,
            first_seen: row.get(23)?,
            last_seen: row.get(24)?,
        })
    }

    let mut stmt = conn.prepare(sql)?;
    let rows = if has_brand {
        stmt.query_map(params![brand_id.unwrap(), limit], map_trend_row)?
    } else {
        stmt.query_map(params![limit], map_trend_row)?
    };
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| AppError::DatabaseError(e.to_string()))
}

pub fn save_workflow_run(
    id: &str,
    brand_id: &str,
    workflow_type: &str,
    status: &str,
    steps: &serde_json::Value,
    result: Option<&serde_json::Value>,
) -> Result<(), AppError> {
    let db = connection()?;
    let conn = db.lock();
    let now = chrono::Utc::now().to_rfc3339();
    let steps_json = serde_json::to_string(steps)?;
    let result_json = result.map(serde_json::to_string).transpose()?;
    conn.execute(
        "INSERT OR REPLACE INTO workflow_runs (id, brand_id, workflow_type, status, steps_json, result_json, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, COALESCE((SELECT created_at FROM workflow_runs WHERE id = ?1), ?7), ?7)",
        params![id, brand_id, workflow_type, status, steps_json, result_json, now],
    )?;
    Ok(())
}

pub fn save_chat_message(
    id: &str,
    brand_id: &str,
    role: &str,
    content: &str,
    agent_name: Option<&str>,
) -> Result<(), AppError> {
    let db = connection()?;
    let conn = db.lock();
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO chat_history (id, brand_id, role, content, agent_name, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![id, brand_id, role, content, agent_name, now],
    )?;
    Ok(())
}

// Content version functions
#[derive(Debug, Clone, serde::Serialize)]
pub struct ContentVersion {
    pub id: String,
    pub content_id: String,
    pub version_number: i32,
    pub version_name: Option<String>,
    pub content: String,
    pub metadata: serde_json::Value,
    pub created_at: String,
}

pub fn save_content_version(
    id: &str,
    content_id: &str,
    version_name: Option<&str>,
    content: &str,
    metadata: &serde_json::Value,
) -> Result<(), AppError> {
    let db = connection()?;
    let conn = db.lock();
    
    // Get the next version number
    let version_number: i32 = conn
        .query_row(
            "SELECT COALESCE(MAX(version_number), 0) + 1 FROM content_versions WHERE content_id = ?1",
            params![content_id],
            |row| row.get(0),
        )
        .unwrap_or(1);
    
    let now = chrono::Utc::now().to_rfc3339();
    let metadata_json = serde_json::to_string(metadata)?;
    
    conn.execute(
        "INSERT INTO content_versions (id, content_id, version_number, version_name, content, metadata_json, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![id, content_id, version_number, version_name, content, metadata_json, now],
    )?;
    Ok(())
}

pub fn get_content_versions(content_id: &str) -> Result<Vec<ContentVersion>, AppError> {
    let db = connection()?;
    let conn = db.lock();
    
    let mut stmt = conn.prepare(
        "SELECT id, content_id, version_number, version_name, content, metadata_json, created_at
         FROM content_versions
         WHERE content_id = ?1
         ORDER BY version_number DESC",
    )?;
    
    let rows = stmt.query_map(params![content_id], |row| {
        let metadata_json: String = row.get(5)?;
        let metadata: serde_json::Value = serde_json::from_str(&metadata_json).unwrap_or_default();
        Ok(ContentVersion {
            id: row.get(0)?,
            content_id: row.get(1)?,
            version_number: row.get(2)?,
            version_name: row.get(3)?,
            content: row.get(4)?,
            metadata,
            created_at: row.get(6)?,
        })
    })?;
    
    Ok(rows.filter_map(|r| r.ok()).collect())
}

pub fn get_content_version(version_id: &str) -> Result<Option<ContentVersion>, AppError> {
    let db = connection()?;
    let conn = db.lock();
    
    let mut stmt = conn.prepare(
        "SELECT id, content_id, version_number, version_name, content, metadata_json, created_at
         FROM content_versions
         WHERE id = ?1",
    )?;
    
    let rows = stmt.query_map(params![version_id], |row| {
        let metadata_json: String = row.get(5)?;
        let metadata: serde_json::Value = serde_json::from_str(&metadata_json).unwrap_or_default();
        Ok(ContentVersion {
            id: row.get(0)?,
            content_id: row.get(1)?,
            version_number: row.get(2)?,
            version_name: row.get(3)?,
            content: row.get(4)?,
            metadata,
            created_at: row.get(6)?,
        })
    })?;
    
    let result: Vec<_> = rows.filter_map(|r| r.ok()).collect();
    Ok(result.into_iter().next())
}

pub fn delete_content_version(version_id: &str) -> Result<(), AppError> {
    let db = connection()?;
    let conn = db.lock();
    
    conn.execute(
        "DELETE FROM content_versions WHERE id = ?1",
        params![version_id],
    )?;
    Ok(())
}

pub fn update_generated_content(id: &str, content: &str) -> Result<(), AppError> {
    let db = connection()?;
    let conn = db.lock();
    
    conn.execute(
        "UPDATE generated_content SET content = ?1 WHERE id = ?2",
        params![content, id],
    )?;
    Ok(())
}

// ===== Brand Learnings =====

pub fn save_brand_learning(
    brand_id: &str,
    category: &str,
    insight: &str,
    source_content_id: Option<&str>,
) -> Result<(), AppError> {
    let db = connection()?;
    let conn = db.lock();
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO brand_learnings (id, brand_id, category, insight, source_content_id, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![id, brand_id, category, insight, source_content_id, now],
    )?;
    Ok(())
}

pub fn get_brand_learnings(
    brand_id: &str,
    category: Option<&str>,
    limit: i64,
) -> Result<Vec<BrandLearning>, AppError> {
    let db = connection()?;
    let conn = db.lock();
    let (sql, has_cat) = match category {
        Some(_) => (
            "SELECT id, brand_id, category, insight, source_content_id, created_at FROM brand_learnings WHERE brand_id = ?1 AND category = ?2 ORDER BY created_at DESC LIMIT ?3",
            true,
        ),
        None => (
            "SELECT id, brand_id, category, insight, source_content_id, created_at FROM brand_learnings WHERE brand_id = ?1 ORDER BY created_at DESC LIMIT ?2",
            false,
        ),
    };
    
    fn map_learning_row(row: &rusqlite::Row) -> rusqlite::Result<BrandLearning> {
        Ok(BrandLearning {
            id: row.get(0)?,
            brand_id: row.get(1)?,
            category: row.get(2)?,
            insight: row.get(3)?,
            source_content_id: row.get(4)?,
            created_at: row.get(5)?,
        })
    }

    let mut stmt = conn.prepare(sql)?;
    let rows: Result<Vec<_>, _> = if has_cat {
        stmt.query_map(params![brand_id, category.unwrap(), limit], map_learning_row)?.collect()
    } else {
        stmt.query_map(params![brand_id, limit], map_learning_row)?.collect()
    };
    
    rows.map_err(|e| e.into())
}

// ===== Content Performance =====

pub fn save_content_performance(
    content_id: &str,
    brand_id: &str,
    rating: i32,
    notes: Option<&str>,
) -> Result<(), AppError> {
    let db = connection()?;
    let conn = db.lock();
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "INSERT OR REPLACE INTO content_performance (id, content_id, brand_id, rating, notes, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![id, content_id, brand_id, rating, notes, now],
    )?;
    Ok(())
}

pub fn get_content_performance(
    brand_id: &str,
    limit: i64,
) -> Result<Vec<ContentPerformance>, AppError> {
    let db = connection()?;
    let conn = db.lock();
    let mut stmt = conn.prepare(
        "SELECT cp.id, cp.content_id, cp.brand_id, cp.rating, cp.notes, cp.created_at
         FROM content_performance cp
         WHERE cp.brand_id = ?1
         ORDER BY cp.created_at DESC LIMIT ?2",
    )?;
    let rows = stmt.query_map(params![brand_id, limit], |row| {
        Ok(ContentPerformance {
            id: row.get(0)?,
            content_id: row.get(1)?,
            brand_id: row.get(2)?,
            rating: row.get(3)?,
            notes: row.get(4)?,
            created_at: row.get(5)?,
        })
    })?;
    Ok(rows.filter_map(|r| r.ok()).collect())
}

// ===== Audience Insights =====

pub fn save_audience_insight(
    brand_id: &str,
    insight_type: &str,
    insight_text: &str,
) -> Result<(), AppError> {
    let db = connection()?;
    let conn = db.lock();
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO audience_insights (id, brand_id, insight_type, insight_text, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![id, brand_id, insight_type, insight_text, now],
    )?;
    Ok(())
}

pub fn get_audience_insights(brand_id: &str) -> Result<Vec<AudienceInsight>, AppError> {
    let db = connection()?;
    let conn = db.lock();
    let mut stmt = conn.prepare(
        "SELECT id, brand_id, insight_type, insight_text, created_at FROM audience_insights WHERE brand_id = ?1 ORDER BY created_at DESC",
    )?;
    let rows = stmt.query_map(params![brand_id], |row| {
        Ok(AudienceInsight {
            id: row.get(0)?,
            brand_id: row.get(1)?,
            insight_type: row.get(2)?,
            insight_text: row.get(3)?,
            created_at: row.get(4)?,
        })
    })?;
    Ok(rows.filter_map(|r| r.ok()).collect())
}

// ===== Memory data structs =====

#[derive(Debug, Clone, serde::Serialize)]
pub struct BrandLearning {
    pub id: String,
    pub brand_id: String,
    pub category: String,
    pub insight: String,
    pub source_content_id: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct ContentPerformance {
    pub id: String,
    pub content_id: String,
    pub brand_id: String,
    pub rating: i32,
    pub notes: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct AudienceInsight {
    pub id: String,
    pub brand_id: String,
    pub insight_type: String,
    pub insight_text: String,
    pub created_at: String,
}
