# Docs Persistence Migration Playbook

Operational runbook for the Codex document editor changes that introduced structured blocks, Supabase storage snapshots, and new telemetry. Use this guide before deploying migrations, during rollout, and when rollback is required.

---

## 1. Pre-Flight Checklist

- [ ] **Verify migrations applied**
  - `supabase/migrations/20251125_add_blocks_metadata_column.sql` must exist in production with `blocks_metadata JSONB DEFAULT '{}'::jsonb`.
  - Run `select column_name from information_schema.columns where table_name = 'gtm_docs';` and confirm the new column is present.
- [ ] **Provision storage bucket**
  - Execute `create_doc_block_assets_bucket.sql` and confirm the `doc-block-assets` bucket exists with RLS enabled.
- [ ] **Feature flag audit**
  - In `workspace_feature_flags`, confirm `docs.canvas-mode` is disabled by default. Enable it only for beta workspaces.
- [ ] **Telemetry endpoint**
  - Ensure `VITE_TELEMETRY_ENDPOINT` points to the ingestion service so `doc_editor_boot`, `doc_storage_failure`, and `yjs_handshake_latency` are captured during smoke tests.

---

## 2. Deployment Steps

1. **Apply database migrations**
   ```sql
   -- within Supabase SQL editor or psql
   \i supabase/migrations/20251125_add_blocks_metadata_column.sql
   ```
2. **Run storage script**
   ```sh
   supabase db execute --file create_doc_block_assets_bucket.sql
   ```
3. **Deploy edge function + moderation**
   - Ship `supabase/functions/moderation-check` so AI flows remain guarded after the editor deploy.
4. **Deploy web app**
   - Push the latest `main` build containing structured block nodes, UploadService, and telemetry wiring.
5. **Seed feature flag overrides**
   - Insert `docs.canvas-mode` overrides for the internal QA workspace using `create_workspace_feature_flags_table.sql` or Supabase dashboard.

---

## 3. Validation Matrix

| Area | Action | Expected Signal |
| --- | --- | --- |
| **Structured blocks** | Create a Text Box and Signature node, reload page | Nodes reappear in original positions (check `blocks_metadata` payload in Supabase) |
| **Upload pipeline** | Draw a signature and save | File stored under `doc-block-assets/<workspace>/<doc>/<block>.png` |
| **Persistence fallback** | Toggle airplane mode for 30s while editing | Warning banner appears, edits sync after reconnect |
| **Telemetry** | Load existing doc & save | Events: `doc_editor_boot`, `yjs_handshake_latency`, `doc_storage_failure` (only on forced error) visible in telemetry console |
| **Feature flag** | Disable `docs.canvas-mode` for workspace | Canvas palette and nodes no longer render; legacy editor still functional |

---

## 4. Rollback Procedure

If any of the validation steps fail in production:

1. **Disable feature flag**
   ```sql
   update workspace_feature_flags
      set enabled = false
    where feature_key = 'docs.canvas-mode';
   ```
   This reverts the UI to the legacy editor immediately.

2. **Revert client deploy (if needed)**
   - Redeploy the previous stable build from the CDN or hosting platform.

3. **Optional schema rollback**
   - If the `blocks_metadata` column causes issues, run:
     ```sql
     alter table public.gtm_docs drop column if exists blocks_metadata;
     ```
   - Only do this once all structured-block clients are off to avoid runtime errors.

4. **Restore bucket state**
   - Delete the `doc-block-assets` bucket if uploads need to be purged. Use Supabase dashboard or `supabase storage bucket remove`.

5. **Incident notes**
   - Export telemetry traces around `doc_storage_failure` to capture timing and affected workspaces.

---

## 5. Go-Live Monitoring

- Create temporary alerts on the telemetry sink for:
  - `doc_storage_failure` rate > 1% per 5 minutes.
  - `yjs_handshake_latency` > 4000 ms median.
- Watch Supabase Realtime dashboards for disconnect spikes on the `doc-collab-*` channels.
- Keep feature flag dashboard open to quickly kill `docs.canvas-mode` if regressions appear.

---

## 6. Hand-Off Notes

- The structured block plan is documented in `STRUCTURED_BLOCK_LIBRARY_PLAN.md`.
- Canvas feature specs live under `docs/roadmap/2025-11-22-codex-doc-editor-roadmap.md`.
- Telemetry schema is defined in `lib/services/telemetry.ts`; add new events there before future rollouts.
