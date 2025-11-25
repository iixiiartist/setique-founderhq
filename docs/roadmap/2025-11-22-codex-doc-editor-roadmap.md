# Codex Document Editor Enhancements – 2025-11-22

Roadmap tracking doc for today’s session to keep execution aligned with the new Codex-driven plan.

---

## Foundation & Safety Nets
- Expand automated doc load/save coverage:
  - Broaden `dataPersistenceAdapter.test.ts` to cover Yjs snapshot upload/download, binary blob helpers, and Supabase retry backoff logic.
  - Stand up a lightweight browser smoke test (Playwright/Nightwatch) that edits a GTM doc, refreshes, and validates persistence.
- Stand up Supabase-backed feature flag scaffolding (per-user/per-workspace) and wrap `DocEditor` plus future widgets.
- Emit structured telemetry for editor lifecycle: init time, collaboration handshake latency, storage failures.
- Capture rollback guidance in `DOCS_MIGRATION_PLAYBOOK.md` once new persistence work is in place.

## Canvas Enhancements
- Build the `GridOverlay` wrapper with perf guardrails (rAF, throttled resize) and accessibility-friendly toggles.
- Introduce a Palette shell component (UI chrome, focus trap, keyboard wiring) with tools disabled initially.
- Add shared geometry utilities (`lib/docs/layoutUtils.ts`) for snap-to-grid, bounding boxes, and alignment guides.
- Gate the canvas shell behind a dedicated feature flag (e.g., `feature_codex_canvas`).

### Objectives
- Unlock a layout-aware editing mode that feels like Figma-lite while preserving the existing doc editing stack.
- Keep the first release low-risk: shell + primitives only, no new block types until the Structured Block milestone starts.

### Key Dependencies
- **Feature Flags:** requires `docs.canvas-mode` rollout plumbing from Foundation to target beta workspaces.
- **Persistence Layer:** relies on Yjs snapshot + Supabase blob helpers landing so grid transforms sync across clients.
- **Design Tokens:** needs updated color/spacing variables from the design system branch for palette chrome.

### Workstreams & Owners
1. **GridOverlay + Canvas Frame** *(Owner: Aria Kim – Frontend)*
  - Create `components/docs/canvas/GridOverlay.tsx` with zoom-aware step sizing and reduced repainting via `requestAnimationFrame`.
  - Wire keyboard toggle (`Ctrl+'`) and add SR-only live region messaging for state changes.
  - Dependency: finalized spacing scale from Design Tokens.
2. **Palette Shell & Focus Management** *(Owner: Devin Ortiz – UX Platform)*
  - Scaffold `CanvasPalette.tsx` for tool buttons, selection breadcrumbs, and command triggers.
  - Ensure focus trap + roving tab index for arrow navigation; integrate with global command bus.
  - Dependency: AI palette gating to share shortcut infrastructure.
3. **Geometry Utilities** *(Owner: Priya Natarajan – Runtime)*
  - Add `lib/docs/layoutUtils.ts` exporting `snapToGrid`, `getBounds`, `getAlignmentGuides` with unit tests in `layoutUtils.test.ts`.
  - Provide deterministic serialization helpers so persisted block metadata stays under 1KB per block.
4. **Feature Flag & Telemetry Wiring** *(Owner: Ops Squad – shared)*
  - Introduce `docs.canvas-mode` flag with workspace overrides + kill switch dashboard entry.
  - Emit `canvas_shell_toggled` and `canvas_palette_interaction` events for Product Analytics.

### Timeline & Sequencing
- **Day 0-1:** finalize tokens + create shared layout utils skeleton (Priya).
- **Day 2-3:** build GridOverlay + palette shell stubs behind feature flag (Aria + Devin).
- **Day 4:** hook up telemetry + QA keyboard/a11y flows.
- **Day 5:** run Playwright smoke (`tests/smoke/canvasMode.smoke.test.ts`) in staging workspace, then enable beta cohort.

### Exit Criteria
- Canvas shell renders behind `docs.canvas-mode` flag with zero regressions to legacy editor.
- Grid overlay toggles smoothly (<16ms avg frame) and passes axe-core a11y checks.
- Telemetry events visible in Supabase log drain with <1% error rate.
- Playwright smoke + Vitest unit suites green.

## Structured Block Library v1
- Implement `TextBoxNode` (rich text node with resize + metadata persistence to JSON + Supabase).
- Implement `SignatureNode` (canvas-based drawing w/ Supabase storage + fallback rendering for legacy clients).
- Centralize uploads through a new `UploadService` (optimistic UI, retries, telemetry) for images/PDFs.
- Update document schema/types to store block metadata and add migration helpers for existing docs.
- Provide shared drag/resize handles via `components/docs/handles` so TextBox and Signature nodes stay consistent.

## Collaboration & Presence Polish
- Tune `y-supabase` provider (heartbeat, jitter) and surface warnings when offline edits accumulate.
- Render collaborator avatars/presence indicators directly inside the Palette shell.
- Add an integration test (mocked dual editors) to ensure CRDT merges remain stable across reconnects.
- Log Supabase Realtime channel health + latency to telemetry, with alert hooks for Ops.

## AI Command & Research Copilot
- Ship Palette command runners (registry, fuzzy search, Ctrl/Cmd+K binding) with RBAC/quota enforcement.
- Add an AI research copilot panel that hits Supabase + web fetchers, caches responses, and cites sources inline.
- Integrate moderation + token/rate-limit telemetry with existing AI utilities.
- Provide UX affordances to insert AI-generated blocks directly as TextBox/Signature nodes.

## Export & Distribution Hardening
- Update PDF/Docx exporters to render the new nodes and add snapshot-based visual diff tests.
- Implement “Share to workspace” flows with access auditing, secure links, and Supabase RLS safeguards.
- Produce user-facing docs (videos, in-app walkthrough) once GA-ready and toggle flags progressively.

---

## Detailed TODOs by Milestone

### Foundation & Safety Nets
1. **Persistence Coverage**
  - Extend `tests/smoke/docEditorPersistence.smoke.test.ts` with Yjs snapshot upload/download assertions.
  - Add Supabase retry/backoff unit tests in `dataPersistenceAdapter.test.ts` (mock network failures).
2. **Browser Smoke Harness**
  - Create `tests/e2e/docPersistence.spec.ts` (Playwright) that opens a GTM doc, edits, refreshes, and validates saved content.
3. **Feature Flag Plumbing**
  - Finalize `FeatureFlagContext` overrides + add admin UI in `SettingsFeatureFlags.tsx` for workspace-scoped toggles.
4. **Telemetry + Rollback**
  - Emit `doc_editor_boot`, `doc_storage_failure`, `yjs_handshake_latency` via `lib/services/telemetry.ts`.
  - Update `DOCS_MIGRATION_PLAYBOOK.md` with rollback + verification checklist.

### Structured Block Library v1
1. **TextBoxNode**
  - Implement node schema in `lib/tiptap/TextBoxNode.ts` with resize handles + JSON metadata.
  - Persist block positions via `DatabaseService.updateGTMDoc()` patch payloads.
2. **SignatureNode**
  - Build canvas component under `components/docs/SignatureNode.tsx` with Supabase storage + PNG fallback.
3. **UploadService**
  - New `lib/services/uploadService.ts` centralizes uploads with optimistic progress + retries.
4. **Schema / Migration**
  - Add `blocks_metadata` JSONB column and migration SQL; update TypeScript types + Supabase RLS tests.
5. **Shared Handles**
  - Create `components/docs/handles/ResizeHandle.tsx` reused by both new nodes.

### Collaboration & Presence Polish
1. **Provider Tuning**
  - Adjust heartbeat/jitter in `lib/collab/supabaseProviderConfig.ts` and add exponential backoff on disconnect.
2. **Presence UI**
  - Palette avatar rail component showing active users with color tokens + tooltips.
3. **Dual-Editor Test**
  - Integration test `tests/integration/collabDualEditor.test.ts` mocking two clients via jsdom + shared Yjs doc.
4. **Telemetry Hooks**
  - Log Realtime latency + channel drops via `telemetry.track('collab_channel_health', …)` with Ops alert threshold.

### AI Command & Research Copilot
1. **Palette Command Runner**
  - Build registry in `lib/ai/commandRegistry.ts`, wire fuzzy search + RBAC gating in `AICommandPalette`.
2. **Research Copilot Panel**
  - Implement `components/docs/ResearchCopilot.tsx` hitting Supabase RPC + external fetcher with caching + citation display.
3. **Moderation & Telemetry**
  - Pipe prompts/responses through moderation service, capture token + rate-limit metrics.
4. **Insert AI Blocks**
  - Allow AI output to inject TextBox/Signature nodes through shared creation helpers.

### Export & Distribution Hardening
1. **Exporter Updates**
  - Extend `lib/services/documentExport.ts` renderers for new nodes + add snapshot diff tests in `tests/export/exportVisualDiff.test.ts`.
2. **Share to Workspace Flow**
  - Modal in `ShareDocModal.tsx` for secure links, logging audit events, hooking Supabase RLS policies.
3. **User Education**
  - Draft `docs/GTM_DOCS_USER_GUIDE.md`, record Loom walkthrough, and add in-app tooltip tour triggered post-launch.

---

## Next Steps
1. ✅ Flesh out Milestone #2 (Canvas Enhancements) with explicit dependencies and owners.
2. ✅ Enumerate concrete engineering TODOs per milestone (detailed third-level checklist).
3. Run build/test gates once tasks transition from planning to implementation.
