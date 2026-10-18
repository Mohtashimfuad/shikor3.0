begin;

-- Preserve existing evidence rows and all existing RLS/Storage policies.
-- New client uploads attach a short citizen-provided description; GPS continues
-- to use the existing optional EXIF coordinate columns.
alter table public.claim_media
  add column if not exists description text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.claim_media'::regclass
      and conname = 'claim_media_description_length_check'
  ) then
    alter table public.claim_media
      add constraint claim_media_description_length_check
      check (description is null or length(btrim(description)) between 1 and 500);
  end if;
end $$;

commit;
