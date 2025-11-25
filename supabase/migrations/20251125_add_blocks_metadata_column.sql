-- Add blocks_metadata column for structured block layouts
alter table public.gtm_docs
    add column if not exists blocks_metadata jsonb not null default '{}'::jsonb;

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'gtm_docs_blocks_metadata_object'
          and conrelid = 'public.gtm_docs'::regclass
    ) then
        alter table public.gtm_docs
            add constraint gtm_docs_blocks_metadata_object
            check (blocks_metadata is null or jsonb_typeof(blocks_metadata) = 'object');
    end if;
end $$;
