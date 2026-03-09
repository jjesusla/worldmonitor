# World Monitor Agent Context File

> Gives any AI agent enough context to continue development without reading the entire codebase.
> Last updated: 2026-03-05 | Version: 2.5.25

---

## 1. What Is This Project?

**World Monitor** is a real-time global intelligence dashboard: a TypeScript SPA aggregating 30+ external data sources (geopolitics, military, markets, cyber, climate) into a unified operational picture rendered through a 3D globe, a WebGL flat map, and a grid of specialized panels.

Variants (all from one codebase, switchable at runtime):

- `worldmonitor.app` — full: geopolitics, military, OSINT, conflicts
- `tech.worldmonitor.app` — AI/ML, startups, cybersecurity
- `finance.worldmonitor.app` — markets, central banks, macro, Gulf FDI
- `happy.worldmonitor.app` — positive news

Desktop app: Tauri 2 (Windows, macOS arm64/x64, Linux).

Variant resolution: `localStorage('worldmonitor-variant')` -> `VITE_VARIANT` env var -> default `full`

---

## 2. Technology Stack

| Layer | Technology |
|---|---|
| Frontend | TypeScript, Vite 6, no framework (vanilla class-based) |
| Map 3D | globe.gl + Three.js |
| Map flat | deck.gl + MapLibre GL JS |
| API | 60+ Vercel edge functions (api/*.js, plain JS) |
| Cache | Upstash Redis (server), IndexedDB + localStorage (client) |
| Desktop | Tauri 2 (Rust) + Node.js sidecar on 127.0.0.1:46123 |
| ML/AI | Web Worker + ONNX / Transformers.js; Ollama / Groq / OpenRouter |
| Service Worker | Workbox |
| i18n | i18next — 21 languages, lazy-loaded locale bundles |
| Testing | Node built-in test runner, Playwright |

---

## 3. Repository Structure

```
worldmonitor/
  api/                    # 60+ Vercel edge functions (plain JS)
    _cors.js              # Shared CORS utility
    _relay.js             # Shared relay helper (used by 10+ handlers)
    rss-proxy.js          # RSS feed proxy
    groq-summarize.js     # LLM summarization (Groq)
    openrouter-summarize.js
    supply-chain.js
  src/
    App.ts                # Main class (~4,300 lines) -- BUG-001 monolith
    app/                  # Extracted controllers (Phase 1 done, Phase 2 pending)
      app-context.ts      # AppContext interface - shared mutable state
      data-loader.ts      # All data fetching and news rendering (~1,540 lines)
      panel-layout.ts     # Panel creation, layout, drag-and-drop
      refresh-scheduler.ts
      desktop-updater.ts
      country-intel.ts    # Country briefs, CII signals, timeline
      event-handlers.ts   # Event listeners, idle detection
      search-manager.ts
      index.ts
    components/           # 44+ Panel class components
      Panel.ts            # Base class for all panels
      DeckGLMap.ts        # Flat map (156 KB -- BUG-020)
      GlobeMap.ts         # 3D globe
      MapPopup.ts         # Map popups (113 KB -- BUG-016)
      CIIPanel.ts         # Country Instability Index
      CountryBriefPage.ts
      DeductionPanel.ts   # AI forecasting
      NewsPanel.ts
    config/
      panels.ts           # Panel catalog -- all 44 panels, variant assignments
      feeds.ts            # RSS feed URLs by language/region
      countries.ts
      military.ts         # 210+ military bases
    services/
      country-instability.ts  # CII scoring engine
      clustering.ts           # News clustering Web Worker
      rss.ts
      data-freshness.ts
      signal-aggregator.ts    # Intelligence signal bus
      circuit-breaker.ts
    locales/              # 21 i18n locale JSON files (en.json is base)
    utils/
  docs/Docs_To_Review/
    ARCHITECTURE.md       # Full system design
    COMPONENTS.md
    DATA_MODEL.md
    STATE_MANAGEMENT.md
    PANELS.md
    bugs.md               # Bug registry BUG-001 to BUG-020
    todo.md               # Roadmap TODO-001 to TODO-131
  vite.config.ts
  package.json
  CHANGELOG.md
```

---

## 4. Core Architecture Patterns

### State Management

No framework, no reactive stores. All state lives as private properties on the `App` class:

```
Service fetch -> App method -> update private properties -> component.update() -> DOM mutation
```

Persistence:
- **localStorage** — panel order, preferences, variant, theme, disabled sources
- **IndexedDB** (worldmonitor_db) — playback snapshots, temporal baselines, RAG vector store
- **URL params** — map center, zoom, active layers, time range (shareable views)

### Panel System

All panels extend `Panel` (`src/components/Panel.ts`). Registered in `src/config/panels.ts` (single source of truth for variant assignment). Panel order key: `worldmonitor-panel-order-v1.9`.

### Dual Map Engine

Switchable at runtime (persisted in localStorage):
- **3D Globe** (globe.gl + Three.js) — photorealistic, rotatable, HTML marker layer, 28+ data categories
- **Flat Map** (deck.gl + MapLibre GL JS) — WebGL-accelerated, smart clustering, 45+ layer types

Both engines share `map-layer-definitions.ts` — adding a new layer is a single-file operation.

### AI / LLM Pipeline

4-tier fallback: `Ollama (local) -> Groq (cloud) -> OpenRouter (cloud) -> Transformers.js (browser T5)`

Results Redis-cached with TTL. Headline Memory (RAG) runs fully in-browser: ONNX embeddings in IndexedDB (max 5,000 vectors, LRU eviction).

### API Layer

60+ plain JS Vercel handlers in `api/`. Pattern: Redis check first, upstream fetch on miss, CORS via `_cors.js`, relay via `_relay.js`, always set TTL.

---

## 5. Key Configuration Files

| File | Purpose |
|---|---|
| src/config/panels.ts | Panel catalog — all 44 panels, variant assignments |
| src/config/feeds.ts | RSS feed URLs per language/region |
| src/config/countries.ts | Country data (ISO codes, coordinates, metadata) |
| src/config/military.ts | 210+ military base definitions |
| src/config/variant.ts | Variant resolution logic |
| vite.config.ts | Dev proxy rules, Workbox config, build settings |
| src/locales/en.json | English base locale (all keys must exist here first) |

---

## 6. Bug Registry Summary

Full details: `docs/Docs_To_Review/bugs.md`

### Critical (open)

| ID | Summary | Key Files |
|---|---|---|
| BUG-001 | Monolithic App.ts (~4,300 lines). Phase 1 controllers extracted to src/app/. Phase 2 wiring pending. | src/App.ts, src/app/ |
| BUG-002 | Unsafe innerHTML with external data — XSS risk. Missing escapeHtml() calls throughout. | MapPopup.ts, DeckGLMap.ts, App.ts |
| BUG-003 | youtube/live dev endpoint always returns null videoId — live stream broken in dev. | vite.config.ts |

### High (open)

| ID | Summary |
|---|---|
| BUG-004 | Migration log says v1.8 but localStorage key is v1.9 — cosmetic. |
| BUG-005 | layerToSource map duplicated in two places — divergence risk when adding layers. |
| BUG-006 | Polymarket dev proxy tunnels through production URL worldmonitor.app — circular dependency. |
| BUG-007 | No error boundary on news cluster rendering — bad cluster crashes panel entirely. |
| BUG-008 | setInterval clock leak in startHeaderClock(). Fixed in extracted controller; App.ts still affected until Phase 2. |
| BUG-009 | deepLinkCountry polling has no max retry — infinite loop if data source is permanently down. |
| BUG-010 | Finance variant missing desktop packaging scripts (desktop:package:*:finance). |

### Medium (open)

| ID | Summary |
|---|---|
| BUG-011 | Inconsistent idle timeout: 2 min in App.ts vs 5 min in stream panels. |
| BUG-012 | GDELT Doc, FRED, Polymarket, Predictions not tracked in freshness system. |
| BUG-013 | VITE_VARIANT=x scripts use Unix syntax — fail silently on Windows. Fix: use cross-env. |
| BUG-014 | 52 of 55 API handlers have zero unit tests. |
| BUG-015 | Workbox precaches ML JS chunk (~60 MB) even when browser ML is unused. |

### Low (open)

| ID | Summary |
|---|---|
| BUG-016 | MapPopup.ts at 113 KB — split into per-layer popup renderers. |
| BUG-017 | Magic numbers in scoring algorithms — extract to analysis-constants.ts. |
| BUG-018 | i18n gaps — several components use hardcoded English strings. |
| BUG-019 | E2E test scripts fail on Windows (same root cause as BUG-013). |
| BUG-020 | DeckGLMap.ts at 156 KB — split into DeckGLLayers, DeckGLControls, DeckGLInteraction. |

---

## 7. Resolved Issues (Do Not Regress)

| Area | Fix | Version |
|---|---|---|
| Security | Wrap t() calls in escapeHtml() — XSS fix | 2.5.24 |
| Security | Use crypto.randomUUID() instead of Math.random() for element IDs | 2.5.24 |
| Security | Move Finnhub API key to X-Finnhub-Token header (away from query string) | 2.5.24 |
| Security | CSP: replace unsafe-inline with script hashes | 2.5.24 |
| Performance | POST to GET conversion for RPCs to enable CDN caching | 2.5.24 |
| Performance | Split monolithic edge function into per-domain functions (~46% egress reduction) | 2.5.24 |
| Performance | Tiered bootstrap: fast data first, slow data deferred | 2.5.24 |
| Performance | Debounced globe marker flush — prevents Three.js scene graph crashes | 2.5.x |
| Desktop | WebGL render loop pauses when window loses focus, resumes on refocus | 2.5.x |
| Desktop | Harden Windows installer update path; only open valid http(s) links externally | 2.5.24 |
| i18n | French support with French Live TV channels | 2.5.24 |
| i18n | Replace hardcoded English strings with i18n translation keys | 2.5.24 |
| UCDP | Deduplicate UCDP constants that crashed Railway container | 2.5.24 |
| OREF | Prevent LLM translation cache from poisoning Hebrew-to-English pipeline | 2.5.24 |
| API | Remove [domain] catch-all Vercel route that intercepted all RPC calls | 2.5.24 |
| API | Return 405 for wrong HTTP method; add pageSize bounds validation | 2.5.24 |
| UI | Cancel pending debounced calls on component destroy | 2.5.24 |
| UI | Guard async operations against stale DOM references | 2.5.24 |
| Supply Chain | Cache keys bumped to v2; added aisDisruptions field; chokepoint TTL 15->5 min | 2.5.25 |
| Relay | Exponential backoff for failing RSS feeds | 2.5.24 |

---

## 8. Feature Roadmap Highlights

Full details: `docs/Docs_To_Review/todo.md` (TODO-001 to TODO-131)

### High Priority

| ID | Feature |
|---|---|
| TODO-001 | Complete BUG-001 Phase 2 — wire App.ts as thin composition root (~400 lines) |
| TODO-002 | Server-side RSS aggregation: single /api/news endpoint + Vercel cron |
| TODO-003 | Real-time alert webhooks (Slack / Discord / Email) for critical signals |
| TODO-004 | API handler test suite (52 of 55 handlers untested) |
| TODO-005 | Cross-platform npm scripts via cross-env (fixes BUG-013 / BUG-019) |
| TODO-039 | Command palette (Ctrl+K) — partially implemented |
| TODO-064 | Responsive mobile layout (currently shows MobileWarningModal below 768px) |
| TODO-131 | Self-hosted map tiles via Protomaps + CloudFront (eliminates CARTO CORS failures) |

### Medium Priority (selected)

| ID | Feature |
|---|---|
| TODO-006 | Temporal anomaly detection ("unusual for this time of day") |
| TODO-008 | CII choropleth map layer (basic implementation exists) |
| TODO-009 | Custom country watchlists (Tier 2 monitoring) |
| TODO-010 | Historical playback with visual timeline scrubber |
| TODO-013 | Map popup modularization into per-layer renderers (BUG-016 / BUG-020) |
| TODO-014 | ESLint + Prettier setup (no linter currently configured) |

---

## 9. Development Workflow

```bash
npm install
npm run dev           # Full variant (worldmonitor.app)
npm run dev:tech      # Tech variant
npm run dev:finance   # Finance variant
npm run build         # Production build
npm test              # Unit tests (Node built-in runner)
npm run test:e2e      # Playwright e2e tests
npm run desktop:dev   # Tauri desktop dev with hot reload
npm run desktop:build # Tauri production build
```

**Windows note:** `VITE_VARIANT=x` in npm scripts fails silently on Windows (BUG-013). Use `cross-env` or run in Git Bash / WSL.

### Key Environment Variables

| Variable | Purpose |
|---|---|
| VITE_VARIANT | full / tech / finance / happy |
| VITE_MAP_INTERACTION_MODE | globe / flat |
| UPSTASH_REDIS_REST_URL | Redis REST endpoint |
| UPSTASH_REDIS_REST_TOKEN | Redis REST token |
| GROQ_API_KEY | Groq LLM API key |
| OPENROUTER_API_KEY | OpenRouter API key |

---

## 10. Coding Conventions

- **No framework**: all components are TypeScript classes extending `Panel`. No React, Vue, or Svelte.
- **Direct DOM manipulation**: use `textContent`, `appendChild`, `createElement`. Avoid `innerHTML` with external data (BUG-002).
- **Escape external data**: always pass feed-sourced strings through `escapeHtml()` before DOM insertion.
- **New panels**: add to `src/config/panels.ts` only — single source of truth for variant assignment.
- **New map layers**: add to `map-layer-definitions.ts` — consumed by both globe and flat map engines.
- **i18n**: all user-facing strings must use `t('key')` from i18next. Add keys to `src/locales/en.json` first, then all other locale files.
- **API handlers**: plain JS, one file per endpoint in `api/`. Redis first; TTL always; CORS via `_cors.js`.
- **TypeScript strict mode**: zero errors required on all new code.
- **Commit convention**: `feat:`, `fix:`, `perf:`, `refactor:`, `docs:`, `chore:`.

---

## 11. Critical Gotchas

1. **App.ts is still the monolith** — Phase 1 controllers in `src/app/` are NOT wired yet. Old methods still live in `App.ts`. Do NOT remove `App.ts` methods until Phase 2 wiring (TODO-001) is complete.

2. **Windows is the primary dev OS** — Windows 11. Unix env vars in npm scripts do not work. Always use `cross-env` or Git Bash.

3. **Polymarket dev proxy goes through production** (`worldmonitor.app`) — BUG-006. Be aware when debugging Polymarket-related issues.

4. **Globe performance** — Tauri builds cap pixel ratio at 1.25x and disable auto-rotation to prevent 1 fps on machines without discrete GPUs. Do not change these defaults without testing on low-end hardware.

5. **ML chunk is ~60 MB** — do NOT add to Workbox precache (BUG-015). It is lazy-loaded only when the user enables Headline Memory in Settings.

6. **Redis cache key versioning** — bump version suffix when changing cached data shape (e.g., v1 -> v2). Old keys expire via TTL automatically; no manual cleanup needed.

7. **Panel order migration key** is `worldmonitor-panel-order-v1.9`. Migration log incorrectly says v1.8 (BUG-004). Do not create a new migration unless the panel schema actually changes.

8. **Supply chain cache**: `supply_chain:chokepoints:v1` and `supply_chain:minerals:v1` are deprecated as of v2.5.25. Only v2 keys are active. No action needed.

9. **i18n first-load boost** — on first load for non-English users, a one-time locale boost automatically enables native-language RSS feeds without overwriting manual preferences. This is intentional behavior; do not remove.

---

## 12. External Data Sources

| Source | Handler | Notes |
|---|---|---|
| ACLED | api/acled.js | Conflict events; requires ACLED API key |
| UCDP | api/ucdp-events.js | Uppsala Conflict Data Program; armed conflict DB |
| GDELT | api/gdelt*.js | Geo events / media; free, no key needed |
| NASA FIRMS | api/firms.js | Satellite fire detection; FIRMS API key required |
| OpenSky | api/opensky.js | ADS-B flight tracking; rate-limited |
| AIS | api/ais*.js | Naval vessel monitoring |
| Finnhub | api/finnhub.js | Stock data; key via X-Finnhub-Token header |
| Yahoo Finance | api/yahoo-finance.js | Market data; no key, rate-limited |
| CoinGecko | api/coingecko.js | Crypto prices; free tier |
| FRED | api/fred.js | Macro economics; St. Louis Fed |
| Polymarket | api/polymarket.js | Prediction markets; dev proxy via prod (BUG-006) |
| Groq | api/groq-summarize.js | LLM summarization; fallback tier 2 |
| OpenRouter | api/openrouter-summarize.js | LLM fallback; tier 3 |
| USGS | api/usgs.js | Earthquakes M4.5+ |
| Oref | api/oref*.js | Israel rocket siren alerts |
| AviationStack | api/aviationstack.js | Airport delays; routed via Railway relay |

---

## 13. Recent Architecture Decisions

| Decision | Rationale | Version |
|---|---|---|
| Unified Vercel deployment (1 for all 4 variants) | Simplify CI/CD; runtime variant detection via hostname | 2.5.24 |
| POST to GET for RPCs | Enable CDN edge caching (CDN cannot cache POST responses) | 2.5.24 |
| Per-domain edge functions (replace monolith) | Isolate failure domains; reduce cold-start bundle size | 2.5.24 |
| Tiered bootstrap: fast/slow data | ~46% CDN egress reduction; critical panels render first | 2.5.24 |
| Supply chain cache v2 | Added aisDisruptions field; v1 shape incompatible | 2.5.25 |
| Background WebGL pause (desktop) | Eliminate continuous GPU wakeups when window loses focus | 2.5.x |
| Debounced globe marker flush | Prevent Three.js scene graph crashes on rapid concurrent updates | 2.5.x |
| _relay.js shared helper | Eliminate relay boilerplate duplicated across 10+ API handlers | 2.5.24 |
| CSP script hashes (remove unsafe-inline) | Security hardening; blocks inline script injection | 2.5.24 |
