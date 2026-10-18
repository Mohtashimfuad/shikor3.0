begin;

-- Preserve the citizen-selected filename for future evidence reports. Existing
-- files remain valid and nullable rows are displayed with a clear fallback.
alter table public.claim_media
  add column if not exists original_filename text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.claim_media'::regclass
      and conname = 'claim_media_original_filename_length_check'
  ) then
    alter table public.claim_media
      add constraint claim_media_original_filename_length_check
      check (original_filename is null or length(btrim(original_filename)) between 1 and 255);
  end if;
end $$;

commit;
