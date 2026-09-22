# BrandForge Trends Engine Audit Report

**Date**: June 5, 2026
**Purpose**: Audit current trend flow before modifications

---

## STEP 1: CURRENT TREND FLOW MAPPING

### Frontend → Backend Flow

```
Frontend (Trends.tsx)
  ↓
useTrends hook
  ↓
trendService.getTrends()
  ↓ (with caching: 5 min TTL, in-flight deduplication)
Tauri Command: get_trends()
  ↓
trend_commands.rs::get_trends()
  ↓ (checks SQLite cache if not force_refresh)
TrendEngine::research()
  ↓
Data Sources (parallel):
  - fetch_reddit_trends()
  - fetch_rss_trends()
  - fetch_youtube_trends()
  ↓
rank_trends() (clustering.rs)
  ↓
sqlite::insert_trends()
  ↓
sqlite::get_trends() (merge & deduplicate)
  ↓
Frontend display
```

### Component Analysis

**Frontend Components:**
- `Trends.tsx` - Main trends page with tabs
- `trendService.ts` - Service layer with caching
- `trendsStore.ts` - Zustand state management
- `useTrends.ts` - Custom hook
- UI Components: TrendDashboard, TrendResearchEngine, TrendTimeline, etc.

**Backend Components:**
- `trend_commands.rs` - Tauri command handlers
- `trends.rs` - TrendEngine orchestration
- `reddit.rs` - Reddit data fetcher
- `rss_feed.rs` - RSS/Google News fetcher
- `youtube.rs` - YouTube scraper
- `clustering.rs` - Ranking and keyword clustering

**Data Models:**
- `TrendRecord` - Main trend data structure
- `TrendAnalysis` - Aggregated analysis
- `TrendOpportunityAnalysis` - AI-generated opportunity analysis

---

## STEP 2: BROKEN LINKS & ISSUES

### Critical Issues

1. **Missing Google Trends Integration**
   - Status: NOT IMPLEMENTED
   - Impact: Missing major trend signal source
   - Required: Add Google Trends as 4th data source

2. **Incomplete Source Attribution**
   - Current: Only `source` field (single string)
   - Missing: `source_platforms`, `source_count`, `source_urls`, `first_seen`, `last_seen`
   - Impact: Users cannot see where trends came from or signal strength
   - Required: Extend TrendRecord model

3. **Brand-Aware Research Partial**
   - Current: `brand_id` passed but not used in scoring
   - Impact: Fitness brand receives AI startup trends
   - Required: Use brand niche to filter/rank trends

4. **Trend Drilldown Incomplete**
   - Current: `analyze_trend()` generates basic analysis
   - Missing: Detailed drilldown with hooks, titles, formats, reels, shorts
   - Required: Expand analyze_trend() output

5. **Caching Basic**
   - Current: 5 min TTL frontend cache, SQLite backend cache
   - Missing: stale-while-revalidate, source caching, cache invalidation
   - Required: Advanced caching strategy

6. **No Rate Limiting**
   - Current: No explicit rate limiting on API calls
   - Risk: API bans from Reddit/YouTube
   - Required: Add rate limiting

### Medium Issues

7. **Dead Code: TrendResearchAgent**
   - Location: `orchestration/agents/trend_research.rs`
   - Status: Defined but not used in main flow
   - Impact: Unused code, potential confusion
   - Required: Either integrate or remove

8. **Silent Failures**
   - Current: Data sources return empty Vec on error
   - Impact: No error visibility, hard to debug
   - Required: Add proper error handling and logging

9. **No Duplicate Detection Across Sources**
   - Current: Deduplication only by title after aggregation
   - Impact: Same trend from multiple sources counted separately
   - Required: Cross-source deduplication during aggregation

10. **Scoring Component Storage**
    - Current: Component scores stored but not exposed to UI
    - Impact: Users cannot see "why this trend is recommended"
    - Required: Expose component scores in UI

### Minor Issues

11. **YouTube Scraping Fragile**
    - Current: Scrapes HTML, relies on ytInitialData
    - Risk: Breaks if YouTube changes structure
    - Required: Consider YouTube API or more robust scraping

12. **No Trend History**
    - Current: No tracking of trend evolution over time
    - Impact: Cannot see trend growth patterns
    - Required: Add trend history tracking

13. **Keyword Extraction Basic**
    - Current: Simple word frequency, stop word filtering
    - Impact: Low-quality keywords
    - Required: Improve keyword extraction

---

## STEP 3: DATA SOURCE VALIDATION

### Reddit (fetch_reddit_trends)
- **Status**: IMPLEMENTED
- **API**: Reddit public search API (no auth required)
- **Rate Limit**: None implemented (risk)
- **Error Handling**: Silent failure (returns empty Vec)
- **Data Quality**: Good (upvotes, comments, age)
- **Real Requests**: Yes
- **Issues**: No rate limiting, silent failures

### RSS/Google News (fetch_rss_trends)
- **Status**: IMPLEMENTED
- **API**: Google News RSS (public)
- **Rate Limit**: None implemented (risk)
- **Error Handling**: Silent failure (returns empty Vec)
- **Data Quality**: Good (ranking, age)
- **Real Requests**: Yes
- **Issues**: No rate limiting, silent failures

### YouTube (fetch_youtube_trends)
- **Status**: IMPLEMENTED
- **API**: HTML scraping (not official API)
- **Rate Limit**: None implemented (high risk)
- **Error Handling**: Silent failure (returns empty Vec)
- **Data Quality**: Medium (views, age, but fragile)
- **Real Requests**: Yes
- **Issues**: Fragile scraping, no rate limiting, silent failures

### Google Trends
- **Status**: NOT IMPLEMENTED
- **Required**: Add as 4th data source
- **API Options**: 
  - pytrends (Python library, not Rust)
  - Google Trends API (unofficial, requires reverse engineering)
  - Alternative: Use Google Trends RSS (deprecated)
- **Recommendation**: Implement basic Google Trends integration

---

## STEP 4: SCORING SYSTEM ANALYSIS

### Current Scoring (5-Factor)
```
Growth Velocity = 40%
Audience Relevance = 25%
Cross Source Frequency = 15%
Competition Score = 10%
Freshness = 10%
```

### Implementation Status
- **Location**: Each data source calculates scores independently
- **Storage**: Component scores stored in TrendRecord
- **Aggregation**: Not done (no cross-source frequency calculation)
- **UI Exposure**: Not exposed to UI
- **Issues**:
  - Cross Source Frequency not actually calculated
  - No brand relevance factor
  - Component scores not visible to users

### Required Improvements
1. Calculate actual cross-source frequency
2. Add brand relevance factor
3. Expose component scores to UI
4. Add trend score explanation

---

## STEP 5: PLACEHOLDER SEARCH RESULTS

### Search for: mock, fake, placeholder, dummy, sample, fallback

**Results**: Mostly in node_modules (expected)

**Source Code Search Results**:
- No significant placeholders found in source code
- Data sources use real APIs (Reddit, Google News, YouTube)
- No mock data generation detected

**Conclusion**: No placeholder removal needed for trend system

---

## STEP 6: WORKFLOW COMPLETENESS

### Current Workflow
```
Trend Discovery
  ↓
Research
  ↓
Analysis (basic)
  ↓
[MISSING] Opportunity detailed analysis
  ↓
[MISSING] Hook generation
  ↓
[MISSING] Outline generation
  ↓
[MISSING] Script generation
  ↓
[MISSING] Editor integration
  ↓
[MISSING] Export
```

### Missing Transitions
1. Trend → Content generation (no direct link)
2. Analysis → Hook generation (not implemented)
3. Hook → Script generation (not implemented)
4. Trend → Editor (not integrated)

---

## SUMMARY

### Strengths
- Solid architecture with clear separation of concerns
- Real data sources (Reddit, RSS, YouTube)
- 5-factor scoring system implemented
- Frontend caching with deduplication
- SQLite persistence
- AI-powered analysis

### Critical Gaps
1. **Google Trends not integrated**
2. **Source attribution incomplete**
3. **Brand-aware scoring not implemented**
4. **Trend drilldown incomplete**
5. **No rate limiting**
6. **Silent failures**
7. **Cross-source deduplication missing**
8. **Workflow incomplete**

### Recommended Action Plan
1. Add Google Trends integration
2. Extend TrendRecord model with source attribution
3. Implement brand-aware scoring
4. Expand trend drilldown with detailed analysis
5. Add rate limiting to all data sources
6. Add proper error handling and logging
7. Implement cross-source deduplication
8. Complete end-to-end workflow

---

**Next Steps**: Proceed with Step 2 (Verify Live Data Sources) and Step 3 (Add Google Trends Support)
