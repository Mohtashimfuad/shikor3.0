begin;

-- Fail closed if this migration is run against a database that does not have
-- the audited identity, claim, storage, and area-scope foundation it extends.
do $$
begin
  if to_regclass('public.erosion_claims') is null
     or to_regclass('public.claim_media') is null
     or to_regclass('public.officer_applications') is null
     or to_regclass('public.profiles') is null
     or to_regprocedure('private.is_admin()') is null
     or to_regprocedure('private.is_verified_auth_user()') is null
     or to_regprocedure('private.officer_area_matches(text,text)') is null then
    raise exception 'Trusted claim review prerequisites are missing. Reconcile and inspect migration history before applying.';
  end if;
  if (select count(*) from information_schema.columns
      where table_schema = 'public' and table_name = 'erosion_claims'
        and column_name = any (array[
          'id', 'claimant_id', 'district', 'upazila', 'tracking_id', 'union_name',
          'mouza_name', 'erosion_year', 'river_basin', 'total_area_acre',
          'submerged_area_acre', 'is_satellite_verified', 'satellite_match_rate', 'officer_review_authorized',
          'officer_review_authorized_by', 'officer_review_authorized_at',
          'publicly_visible', 'publicly_visible_at'
        ])) <> 18 then
    raise exception 'Claim schema prerequisites are incomplete. Reconcile migration history before applying.';
  end if;
  if (select count(*) from information_schema.columns
      where table_schema = 'public' and table_name = 'profiles'
        and column_name = any (array['id', 'role', 'full_name_en'])) <> 3
     or (select count(*) from information_schema.columns
      where table_schema = 'public' and table_name = 'officer_applications'
        and column_name = any (array['applicant_id', 'status', 'assigned_district', 'assigned_upazila'])) <> 4 then
    raise exception 'Identity or officer assignment prerequisites are incomplete. Reconcile migration history before applying.';
  end if;
  if (select count(*) from information_schema.columns
      where table_schema = 'public' and table_name = 'claim_media'
        and column_name = any (array['claim_id', 'storage_path', 'media_type'])) <> 3 then
    raise exception 'Claim evidence schema prerequisites are incomplete. Reconcile migration history before applying.';
  end if;
  if not exists (select 1 from storage.buckets where id = 'citizen-evidence') then
    raise exception 'The private citizen-evidence bucket is missing. Inspect Storage configuration before applying.';
  end if;
end $$;

alter table public.erosion_claims
  add column if not exists review_status text not null default 'submitted',
  add column if not exists review_reason text,
  add column if not exists reviewed_by uuid references auth.users (id),
  add column if not exists reviewed_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.erosion_claims'::regclass and conname = 'erosion_claims_review_status_check') then
    alter table public.erosion_claims add constraint erosion_claims_review_status_check
      check (review_status in ('submitted', 'under_review', 'additional_evidence_requested', 'verified', 'rejected'));
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.erosion_claims'::regclass and conname = 'erosion_claims_review_audit_pair_check') then
    alter table public.erosion_claims add constraint erosion_claims_review_audit_pair_check
      check ((reviewed_by is null) = (reviewed_at is null));
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.erosion_claims'::regclass and conname = 'erosion_claims_review_reason_length_check') then
    alter table public.erosion_claims add constraint erosion_claims_review_reason_length_check
      check (review_reason is null or length(review_reason) <= 2000);
  end if;
end $$;

-- The existing evidence table allowed categories, while the connected client
-- stores MIME types. Expand the check without dropping existing valid values.
alter table public.claim_media drop constraint if exists claim_media_media_type_check;
alter table public.claim_media add constraint claim_media_media_type_check
  check (media_type is null or media_type in (
    'image', 'video', 'tax_receipt',
    'application/pdf', 'image/jpeg', 'image/png', 'image/webp'
  ));

-- Enforce the same evidence limits at Storage, not only in the browser.
update storage.buckets
set public = false,
    file_size_limit = 10485760,
    allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']::text[]
where id = 'citizen-evidence';

create table if not exists public.claim_review_events (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.erosion_claims (id) on delete cascade,
  reviewer_id uuid not null references auth.users (id) on delete restrict,
  reviewer_display_name text not null,
  previous_status text not null check (previous_status in ('submitted', 'under_review', 'additional_evidence_requested', 'verified', 'rejected')),
  new_status text not null check (new_status in ('under_review', 'additional_evidence_requested', 'verified', 'rejected')),
  reason text not null check (length(btrim(reason)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists claim_review_events_claim_created_idx
  on public.claim_review_events (claim_id, created_at desc);

alter table public.claim_review_events enable row level security;
revoke all on table public.claim_review_events from public, anon, authenticated;
grant select on table public.claim_review_events to authenticated;
drop policy if exists claim_review_events_read_owner_admin_authorized_officer on public.claim_review_events;
create policy claim_review_events_read_owner_admin_authorized_officer
  on public.claim_review_events for select to authenticated
  using (
    (select private.is_admin())
    or exists (
      select 1 from public.erosion_claims c
      where c.id = claim_review_events.claim_id
        and c.claimant_id = (select auth.uid())
    )
    or (select private.officer_can_review_claim(claim_id))
  );

-- Authorization grants dossier review before verification. Area and approved
-- status are still enforced by private.officer_area_matches.
alter table public.erosion_claims
  drop constraint if exists erosion_claims_officer_review_requires_verification;

create or replace function private.officer_can_review_claim(p_claim_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, private, public, auth
as $$
  select exists (
    select 1
    from public.erosion_claims c
    where c.id = p_claim_id
      and c.officer_review_authorized is true
      and (select private.officer_area_matches(c.district, c.upazila))
  );
$$;
revoke all on function private.officer_can_review_claim(uuid) from public, anon;
grant execute on function private.officer_can_review_claim(uuid) to authenticated;

create or replace function private.officer_can_review_claim_path(p_object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = pg_catalog, private, public, auth, storage
as $$
declare
  v_parts text[] := storage.foldername(p_object_name);
  v_claim_id text;
begin
  if (select auth.uid()) is null or coalesce(array_length(v_parts, 1), 0) = 0 then
    return false;
  end if;
  v_claim_id := case when v_parts[1] = (select auth.uid())::text then v_parts[2] else v_parts[1] end;
  if v_claim_id is null then return false; end if;
  return exists (
    select 1 from public.erosion_claims c
    where c.id::text = v_claim_id
      and c.officer_review_authorized is true
      and (select private.officer_area_matches(c.district, c.upazila))
  );
end;
$$;
revoke all on function private.officer_can_review_claim_path(text) from public, anon;
grant execute on function private.officer_can_review_claim_path(text) to authenticated;

create or replace function public.set_claim_officer_review(
  p_claim_id uuid,
  p_authorized boolean
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, private, public, auth
as $$
begin
  if not (select private.is_admin()) then
    raise exception 'Administrator access is required.' using errcode = '42501';
  end if;
  if p_authorized is null then
    raise exception 'A review authorization decision is required.' using errcode = '22023';
  end if;
  update public.erosion_claims c
  set officer_review_authorized = p_authorized,
      officer_review_authorized_by = case when p_authorized then (select auth.uid()) else null end,
      officer_review_authorized_at = case when p_authorized then now() else null end
  where c.id = p_claim_id;
  if not found then
    raise exception 'Claim was not found.' using errcode = 'P0002';
  end if;
end;
$$;
revoke all on function public.set_claim_officer_review(uuid, boolean) from public, anon;
grant execute on function public.set_claim_officer_review(uuid, boolean) to authenticated;

create or replace function public.get_authorized_claims_for_officer_review()
returns table (
  id uuid,
  tracking_id text,
  district text,
  upazila text,
  union_name text,
  mouza_name text,
  erosion_year integer,
  review_status text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = pg_catalog, private, public, auth
as $$
  select c.id, c.tracking_id, c.district, c.upazila, c.union_name,
         c.mouza_name, c.erosion_year, c.review_status, c.created_at
  from public.erosion_claims c
  where c.officer_review_authorized is true
    and c.review_status in ('submitted', 'under_review', 'additional_evidence_requested')
    and (select private.is_verified_auth_user())
    and (select private.officer_area_matches(c.district, c.upazila))
  order by c.created_at desc;
$$;
revoke all on function public.get_authorized_claims_for_officer_review() from public, anon;
grant execute on function public.get_authorized_claims_for_officer_review() to authenticated;

-- Close the earlier verified-record RPC path as well: area scope alone does
-- not authorize an Officer to read a citizen dossier or review its claim.
create or replace function public.get_authorized_verified_erosion_records()
returns table (
  id uuid,
  tracking_id text,
  district text,
  upazila text,
  union_name text,
  mouza_name text,
  erosion_year integer,
  river_basin text,
  total_area_acre numeric,
  submerged_area_acre numeric,
  is_satellite_verified boolean,
  satellite_match_rate numeric,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = pg_catalog, private, public, auth
as $$
  select c.id, c.tracking_id, c.district, c.upazila, c.union_name,
         c.mouza_name, c.erosion_year, c.river_basin, c.total_area_acre,
         c.submerged_area_acre, c.is_satellite_verified,
         c.satellite_match_rate, c.created_at
  from public.erosion_claims c
  where c.is_satellite_verified is true
    and (select private.is_verified_auth_user())
    and (
      (select private.is_admin())
      or c.claimant_id = (select auth.uid())
      or (
        c.officer_review_authorized is true
        and (select private.officer_area_matches(c.district, c.upazila))
      )
    )
  order by c.created_at desc;
$$;
revoke all on function public.get_authorized_verified_erosion_records() from public, anon;
grant execute on function public.get_authorized_verified_erosion_records() to authenticated;

create or replace function public.decide_erosion_claim(
  p_claim_id uuid,
  p_decision text,
  p_reason text
)
returns text
language plpgsql
security definer
set search_path = pg_catalog, private, public, auth
as $$
declare
  v_claim public.erosion_claims%rowtype;
  v_name text;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;
  if p_decision is null or p_decision not in ('under_review', 'additional_evidence_requested', 'verified', 'rejected') then
    raise exception 'Invalid claim decision.' using errcode = '22023';
  end if;
  if nullif(btrim(p_reason), '') is null or length(btrim(p_reason)) > 2000 then
    raise exception 'A reason of 1 to 2000 characters is required.' using errcode = '23514';
  end if;

  select * into v_claim from public.erosion_claims c
  where c.id = p_claim_id for update;
  if not found then raise exception 'Claim was not found.' using errcode = 'P0002'; end if;
  if v_claim.claimant_id = (select auth.uid()) then
    raise exception 'A claimant cannot review their own claim.' using errcode = '42501';
  end if;
  if not (select private.is_admin())
     and not (select private.officer_can_review_claim(v_claim.id)) then
    raise exception 'Administrator or explicitly authorized area Officer access is required.' using errcode = '42501';
  end if;
  if v_claim.review_status in ('verified', 'rejected') then
    raise exception 'A final claim decision cannot be changed.' using errcode = '23514';
  end if;
  if not (
    (v_claim.review_status = 'submitted' and p_decision in ('under_review', 'additional_evidence_requested', 'verified', 'rejected'))
    or (v_claim.review_status = 'under_review' and p_decision in ('additional_evidence_requested', 'verified', 'rejected'))
    or (v_claim.review_status = 'additional_evidence_requested' and p_decision in ('under_review', 'verified', 'rejected'))
  ) then
    raise exception 'Invalid claim review transition.' using errcode = '23514';
  end if;
  if p_decision = 'verified' and not exists (
    select 1 from public.claim_media m
    join storage.objects o on o.bucket_id = 'citizen-evidence' and o.name = m.storage_path
    where m.claim_id = v_claim.id
      and m.storage_path like v_claim.claimant_id::text || '/' || v_claim.id::text || '/%'
  ) then
    raise exception 'At least one evidence file must be attached before verification.' using errcode = '23514';
  end if;

  select coalesce(nullif(btrim(p.full_name_en), ''), (select auth.uid())::text)
  into v_name from public.profiles p where p.id = (select auth.uid());
  v_name := coalesce(v_name, (select auth.uid())::text);

  update public.erosion_claims c
  set review_status = p_decision,
      review_reason = btrim(p_reason),
      reviewed_by = (select auth.uid()),
      reviewed_at = now()
  where c.id = v_claim.id;

  insert into public.claim_review_events (
    claim_id, reviewer_id, reviewer_display_name, previous_status, new_status, reason
  ) values (
    v_claim.id, (select auth.uid()), v_name, v_claim.review_status, p_decision, btrim(p_reason)
  );
  return p_decision;
end;
$$;
revoke all on function public.decide_erosion_claim(uuid, text, text) from public, anon;
grant execute on function public.decide_erosion_claim(uuid, text, text) to authenticated;

revoke update on table public.erosion_claims from public, anon, authenticated;

-- Preserve the RPC shape for clients already deployed, but replace legacy
-- tracking IDs (which may encode dag numbers) with an opaque public reference.
drop function if exists public.get_public_verified_erosion_records();
create function public.get_public_verified_erosion_records()
returns table (
  tracking_id text,
  district text,
  upazila text,
  union_name text,
  mouza_name text,
  erosion_year integer,
  river_basin text,
  total_area_acre numeric,
  submerged_area_acre numeric,
  published_at timestamptz
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select 'PUB-' || upper(substr(md5(c.id::text), 1, 12)),
         c.district, c.upazila, c.union_name, c.mouza_name,
         c.erosion_year, c.river_basin, c.total_area_acre,
         c.submerged_area_acre, c.publicly_visible_at
  from public.erosion_claims c
  where c.publicly_visible is true
    and c.is_satellite_verified is true
  order by c.publicly_visible_at desc;
$$;
revoke all on function public.get_public_verified_erosion_records() from public, anon, authenticated;
grant execute on function public.get_public_verified_erosion_records() to anon, authenticated;

commit;
