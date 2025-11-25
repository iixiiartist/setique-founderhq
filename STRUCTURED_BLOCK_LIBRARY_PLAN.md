# Structured Block Library v1 – Implementation Plan

Comprehensive plan for landing the Structured Block milestone called out in `docs/roadmap/2025-11-22-codex-doc-editor-roadmap.md`. This document captures the current state, missing pieces, and the integration strategy across data, editor, and backend services.

---

## 1. Current State Snapshot

| Area | Observation | Impact |
| --- | --- | --- |
| **GTMDoc schema** | `gtm_docs` rows expose `content_json` / `content_plain` only. No `blocks_metadata` field in Supabase nor TypeScript types. | No place to persist layout metadata for canvas blocks; Structured nodes would lose their coordinates on save. |
| **DocEditor persistence** | `handleSave` in `components/workspace/DocEditor.tsx` only forwards title/type/visibility/content/tags to `DatabaseService`. | Even if metadata is computed client-side, it never reaches Supabase. |
| **Database service** | `DatabaseService.createGTMDoc` and `.updateGTMDoc` ignore block metadata payloads. | API surface must accept/pass new JSONB column. |
| **Editor extensions** | `lib/tiptap` only includes StarterKit + custom `ChartNode`, `ResizableImage`, etc. No TextBox/Signature nodes exist. | Need brand-new extensions plus shared handles logic for the canvas tooling. |
| **Uploads** | Image uploads live inside `imageUploadService` + inline Supabase calls. No shared retry/telemetry layer. | Signature node + future uploads need centralized policy enforcement and instrumentation. *(Status: ✅ `uploadService` + `create_doc_block_assets_bucket.sql` landed; bucket script documents Supabase setup.)* |
| **RLS tests** | `tests/rls/*` currently cover tasks, marketing, activity. Nothing validates GTM doc access or new metadata column. | Risk of shipping schema changes without guardrails.

---

## 2. Data Contract & Schema Updates

1. **Database column**
   - Add `blocks_metadata JSONB DEFAULT '{}'::jsonb` to `gtm_docs` via a new migration script (`add_blocks_metadata_column.sql`).
   - Column stores a map keyed by block ID; each entry captures `{ type, x, y, width, height, rotation, zIndex, props }`.
   - Add check constraint to enforce total size < ~64KB? (monitor, but Supabase JSONB already caps per row.)
2. **Types**
   - Introduce `StructuredBlock` + `StructuredBlockMap` interfaces in `types.ts`.
   - Extend `GTMDoc` / `GTMDocMetadata` with optional `blocksMetadata?: StructuredBlockMap`.
   - Export `BlockKind = 'textbox' | 'signature'` to keep creation helpers typesafe.
3. **Service layer**
   - Update `DatabaseService.createGTMDoc`/`updateGTMDoc` to accept `blocksMetadata` and include `content_json` fallback.
   - Ensure `loadGTMDocById` hydrates the new column back into camelCase for the editor.

---

## 3. Structured Block API (shared contract)

```ts
export interface StructuredBlock {
  id: string;            // uuid
  type: BlockKind;       // 'textbox' | 'signature'
  position: { x: number; y: number; z: number };
  size: { width: number; height: number };
  rotation?: number;     // degrees, default 0
  data: Record<string, unknown>; // node-specific payload
  createdAt: string;
  updatedAt: string;
}
```

- `blocksMetadata` will be `{ [blockId: string]: StructuredBlock }`.
- Editor keeps metadata in React state synced with Tiptap transactions (ProseMirror decorations) so that `handleSave` can serialize `Object.values(blockMap)`.
- Telemetry event `structured_block_mutation` fires for create/update/delete to monitor adoption.

---

## 4. TextBoxNode Implementation Plan

1. **File:** `lib/tiptap/TextBoxNode.ts`
   - Extend `Node` from `@tiptap/core` with attributes for `blockId`, `x`, `y`, `width`, `height`, `rotation`, `placeholder`, `theme`.
   - Provide `addCommands()` for `insertTextBox` accepting initial rect + content.
   - Use React node view via `@tiptap/react` to render a `contenteditable` div with resize handles from `components/docs/handles/ResizeHandle.tsx` (new shared component).
   - Emit events to update Redux? We'll keep local callback: node view receives `updateBlockMetadata(blockId, patch)` from DocEditor context.
2. **Styling:** share tokens from palette (`components/docs/canvas/CanvasPalette.tsx`). Provide CSS module for outlines/snap-lines.
3. **Persistence:** On every move/resize we push metadata to `blocksMetadataRef` to avoid thrashing React state; we flush on `handleSave` and optionally on `debouncedAutosave` (future).

---

## 5. SignatureNode Implementation Plan

1. **File:** `lib/tiptap/SignatureNode.ts`
   - Canvas-based node storing strokes as PNG uploaded via `UploadService`. Keep local data URL for offline preview.
   - Attributes: `blockId`, `assetId`, `width`, `height`, `strokeColor`, `strokeWidth`.
   - Node view renders `<canvas>` + toolbar (clear, undo). When user saves, call `UploadService.uploadSignature({ workspaceId, docId, blob })`.
2. **Fallback Rendering:** if asset fails to load, render `<div class="signature-placeholder">Signature not available</div>`.
3. **Metadata:** `data` payload stores Supabase storage path + preview dims.

---

## 6. UploadService

- **Location:** `lib/services/uploadService.ts`.
- **Responsibilities:**
  - Normalize uploads for clipboard images, signature PNGs, PDFs.
  - Provide `uploadBinary({ bucket, path, file, cacheKey, onProgress })` with retries (3 attempts, exponential backoff).
  - Emit telemetry (`upload_started`, `upload_succeeded`, `upload_failed`).
  - Use Supabase Storage bucket `doc-block-assets` (create if missing via script).
- **Integration Points:** `DocEditor.handlePastedImage`, `SignatureNode`, future attachments.

---

## 7. Editor Wiring

1. **State management:**
   - Add `const [blocksMetadata, setBlocksMetadata] = useState<StructuredBlockMap>({});` in `DocEditor`.
   - When loading a doc, hydrate `blocksMetadata` if column exists.
   - Provide callbacks via React Context or props down to node views for real-time updates.
2. **Saving:**
   - Extend `handleSave` payload with `blocksMetadata`.
   - Guard for legacy docs (send `{}` when empty`).
3. **Feature flag:** keep nodes/canvas behind `docs.canvas-mode` initially; degrade gracefully (nodes render as static divs if flag disabled).
4. **Telemetry:** record block creation/resizing events to measure usage.

---

## 8. Testing & RLS Coverage

- **Unit tests:**
   - `tests/unit/textBoxNode.test.ts` (schema + command coverage).
   - `tests/unit/signatureNode.test.ts` (command + attribute coverage).
   - `tests/unit/uploadService.test.ts` (retry + telemetry mocks).
- **RLS tests:**
   - New `tests/rls/gtmDocs.test.ts` verifying owner/member CRUD on `gtm_docs` including `blocks_metadata` writes. *(Added in this slice.)*
- **Smoke test:** extend `tests/smoke/docEditorPersistence.smoke.test.ts` to confirm metadata survives save/load round trip. *(Implemented: store now persists `blocksMetadata` and asserts DB-vs-Yjs precedence.)*

---

## 9. Execution Order (2-day slice)

1. **Schema + Types (Today)**
   - Migration SQL, `types.ts`, `DatabaseService`, doc state updates.
2. **TextBoxNode + handles**
   - Build node, shared handles, integrate with canvas UI.
3. **UploadService foundation**
   - Ship service + swap existing image upload call site.
4. **SignatureNode + storage**
   - Implement node leveraging UploadService.
5. **Testing + docs**
   - Add RLS + smoke/unit coverage, update roadmap status.

This plan completes Todo #1 (“Assess Structured Block milestone”) and unlocks implementation work for the structured nodes.
