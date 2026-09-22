# Future Integration Architecture

This document outlines the architecture for future export integrations with external platforms.

## Export Adapter Pattern

The export system uses an adapter pattern to support multiple export formats and platforms:

```
ExportEngine (Core)
├── Format Adapters
│   ├── TXTAdapter
│   ├── MarkdownAdapter
│   ├── JSONAdapter
│   ├── DOCXAdapter (future)
│   └── PDFAdapter (future)
└── Platform Adapters (future)
    ├── CanvaAdapter
    ├── CapCutAdapter
    ├── PremiereProAdapter
    ├── FinalCutAdapter
    ├── NotionAdapter
    └── GoogleDocsAdapter
```

## Platform Integration Points

### 1. Canva Integration

**Purpose:** Export scripts as Canva design templates for social media graphics.

**Implementation:**
- Use Canva API to create design templates
- Map script sections to design elements:
  - Hook → Headline text
  - Scenes → Slide content
  - CTA → Call-to-action button
- Export format: JSON with Canva design schema

**Data Flow:**
```
Script → CanvaAdapter → Canva API → Design Template URL
```

**Required Fields:**
- `canva_api_key` (user-provided)
- `design_template_id` (optional, for custom templates)

### 2. CapCut Integration

**Purpose:** Export scripts as CapCut video projects with auto-generated captions.

**Implementation:**
- Use CapCut API to create video projects
- Parse script into timeline segments:
  - Scene 1 → 0-3s clip
  - Scene 2 → 3-6s clip
  - etc.
- Generate captions from voiceover text
- Export format: CapCut project JSON

**Data Flow:**
```
Script → CapCutAdapter → CapCut API → Project ID
```

**Required Fields:**
- `capcut_api_key` (user-provided)
- `video_template_id` (optional)

### 3. Premiere Pro Integration

**Purpose:** Export scripts as Premiere Pro project files (.prproj).

**Implementation:**
- Generate XML project file (XMPX format)
- Create timeline with markers for each scene
- Add captions track
- Export format: .prproj or .xml

**Data Flow:**
```
Script → PremiereProAdapter → XML Generator → .prproj file
```

**Required Fields:**
- None (local file export)

### 4. Final Cut Pro Integration

**Purpose:** Export scripts as Final Cut Pro XML files.

**Implementation:**
- Generate FCPXML format
- Create timeline with clips and markers
- Add captions
- Export format: .fcpxml

**Data Flow:**
```
Script → FinalCutAdapter → FCPXML Generator → .fcpxml file
```

**Required Fields:**
- None (local file export)

### 5. Notion Integration

**Purpose:** Export scripts as Notion pages with structured content.

**Implementation:**
- Use Notion API to create pages
- Map script sections to Notion blocks:
  - Title → H1 block
  - Hook → Callout block
  - Scenes → Toggle list
  - CTA → Quote block
- Export format: Notion page ID

**Data Flow:**
```
Script → NotionAdapter → Notion API → Page URL
```

**Required Fields:**
- `notion_api_key` (user-provided)
- `notion_database_id` (optional)

### 6. Google Docs Integration

**Purpose:** Export scripts as Google Docs with collaborative editing.

**Implementation:**
- Use Google Docs API to create documents
- Format with headings, lists, and tables
- Enable sharing permissions
- Export format: Google Doc URL

**Data Flow:**
```
Script → GoogleDocsAdapter → Google Docs API → Document URL
```

**Required Fields:**
- `google_api_key` (user-provided)
- `google_client_id` (user-provided)

## Extension Points

### Adding New Platform Adapters

To add a new platform integration:

1. Create adapter in `src/components/editor/adapters/[Platform]Adapter.tsx`
2. Implement `ExportAdapter` interface:
```typescript
interface ExportAdapter {
  name: string;
  icon: React.ReactNode;
  requiresAuth: boolean;
  export(content: ExportOptions): Promise<ExportResult>;
}
```

3. Add to adapter registry in `ExportEngine.tsx`
4. Add UI button in editor toolbar
5. Add backend command if API integration needed

### Adding New Format Adapters

To add a new export format:

1. Add format to `ExportFormat` type in `ExportEngine.tsx`
2. Implement format conversion logic
3. Add file extension mapping
4. Add UI option in export dialog

## Configuration Schema

Platform integrations will store configuration in `app_settings` table:

```sql
CREATE TABLE IF NOT EXISTS platform_integrations (
    id TEXT PRIMARY KEY,
    platform TEXT NOT NULL,
    api_key TEXT,
    access_token TEXT,
    refresh_token TEXT,
    user_id TEXT,
    settings_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
```

## Security Considerations

1. **API Keys:** Store encrypted in database
2. **OAuth Tokens:** Implement refresh token flow
3. **Rate Limiting:** Respect platform rate limits
4. **Data Privacy:** Only send necessary data to external platforms
5. **User Consent:** Explicit consent before exporting to external platforms

## Performance Considerations

1. **Async Exports:** Long-running exports should be background jobs
2. **Progress Tracking:** Show export progress to user
3. **Error Handling:** Graceful fallback if external API fails
4. **Caching:** Cache API responses where appropriate
5. **Batch Operations:** Support batch exports for multiple scripts

## Testing Strategy

1. **Unit Tests:** Test each adapter independently
2. **Integration Tests:** Test with mock APIs
3. **E2E Tests:** Test full export flow
4. **User Acceptance:** Test with real platform accounts (sandbox)

## Rollout Plan

1. **Phase 1:** Local file exports (TXT, Markdown, JSON) - ✅ DONE
2. **Phase 2:** DOCX and PDF exports - ✅ DONE (placeholder)
3. **Phase 3:** Notion integration (first API integration)
4. **Phase 4:** Google Docs integration
5. **Phase 5:** Video platform integrations (CapCut, Premiere, Final Cut)
6. **Phase 6:** Design platform integration (Canva)
