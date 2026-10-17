begin;

-- Keep the applicant's requested office location separate from the area
-- assigned by an administrator. New fields have no client write grants.
alter table public.officer_applications
  add column if not exists assigned_district text,
  add column if not exists assigned_upazila text,
  add column if not exists assigned_by uuid references auth.users (id),
  add column if not exists area_assigned_at timestamptz,
  add constraint officer_applications_assigned_area_pair_check
    check (assigned_upazila is null or assigned_district is not null);

alter table public.erosion_claims
  add column if not exists officer_review_authorized boolean not null default false,
  add column if not exists officer_review_authorized_by uuid references auth.users (id),
  add column if not exists officer_review_authorized_at timestamptz;

alter table public.erosion_claims
  add constraint erosion_claims_officer_review_requires_verification
    check (not officer_review_authorized or is_satellite_verified is true),
  add constraint erosion_claims_officer_review_audit_pair_check
    check (
      (officer_review_authorized and officer_review_authorized_by is not null and officer_review_authorized_at is not null)
      or
      (not officer_review_authorized and officer_review_authorized_by is null and officer_review_authorized_at is null)
    );

revoke update (assigned_district, assigned_upazila, assigned_by, area_assigned_at)
  on table public.officer_applications from public, anon, authenticated;
revoke update (officer_review_authorized, officer_review_authorized_by, officer_review_authorized_at)
  on table public.erosion_claims from public, anon, authenticated;

create index if not exists officer_applications_assigned_area_idx
  on public.officer_applications (applicant_id, lower(btrim(assigned_district)), lower(btrim(assigned_upazila)))
  where status = 'approved' and assigned_district is not null;
create index if not exists erosion_claims_verified_area_idx
  on public.erosion_claims (lower(btrim(district)), lower(btrim(upazila)))
  where is_satellite_verified is true;

create or replace function private.officer_area_matches(p_district text, p_upazila text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, private, public, auth
as $$
  select (select auth.uid()) is not null
    and (select private.is_verified_auth_user())
    and exists (
      select 1
      from public.profiles p
      join public.officer_applications a on a.applicant_id = p.id
      where p.id = (select auth.uid())
        and p.role = 'officer'
        and a.status = 'approved'
        and a.assigned_district is not null
        and lower(btrim(a.assigned_district)) = lower(btrim(p_district))
        and (
          a.assigned_upazila is null
          or lower(btrim(a.assigned_upazila)) = lower(btrim(p_upazila))
        )
    );
$$;
revoke all on function private.officer_area_matches(text, text) from public, anon;
grant execute on function private.officer_area_matches(text, text) to authenticated;

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
      and c.is_satellite_verified is true
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

  v_claim_id := case
    when v_parts[1] = (select auth.uid())::text then v_parts[2]
    else v_parts[1]
  end;
  if v_claim_id is null then
    return false;
  end if;

  return exists (
    select 1
    from public.erosion_claims c
    where c.id::text = v_claim_id
      and c.is_satellite_verified is true
      and c.officer_review_authorized is true
      and (select private.officer_area_matches(c.district, c.upazila))
  );
end;
$$;
revoke all on function private.officer_can_review_claim_path(text) from public, anon;
grant execute on function private.officer_can_review_claim_path(text) to authenticated;

-- Officers can read only a minimized verified-record result through this RPC.
-- Direct table reads remain limited to claim owners, admins, or explicitly
-- authorized claim review.
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
  select
    c.id,
    c.tracking_id,
    c.district,
    c.upazila,
    c.union_name,
    c.mouza_name,
    c.erosion_year,
    c.river_basin,
    c.total_area_acre,
    c.submerged_area_acre,
    c.is_satellite_verified,
    c.satellite_match_rate,
    c.created_at
  from public.erosion_claims c
  where c.is_satellite_verified is true
    and (select private.is_verified_auth_user())
    and (
      (select private.is_admin())
      or c.claimant_id = (select auth.uid())
      or (select private.officer_area_matches(c.district, c.upazila))
    )
  order by c.created_at desc;
$$;
revoke all on function public.get_authorized_verified_erosion_records() from public, anon;
grant execute on function public.get_authorized_verified_erosion_records() to authenticated;

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
  where c.id = p_claim_id
    and (not p_authorized or c.is_satellite_verified is true);
  if not found then
    raise exception 'Only an existing verified claim can be authorized for officer review.' using errcode = '23514';
  end if;
end;
$$;
revoke all on function public.set_claim_officer_review(uuid, boolean) from public, anon;
grant execute on function public.set_claim_officer_review(uuid, boolean) to authenticated;

-- Application area approval and reassignment are admin-only RPC operations.
drop function if exists public.decide_officer_application(uuid, text, text);
create function public.decide_officer_application(
  p_application_id uuid,
  p_decision text,
  p_rejection_reason text,
  p_assigned_district text,
  p_assigned_upazila text
)
returns text
language plpgsql
security definer
set search_path = pg_catalog, private, public, auth
as $$
declare
  v_application public.officer_applications%rowtype;
  v_confirmed_at timestamptz;
begin
  if not (select private.is_admin()) then
    raise exception 'Administrator access is required.' using errcode = '42501';
  end if;
  if p_decision is null or p_decision not in ('approved', 'rejected') then
    raise exception 'Invalid application decision.' using errcode = '22023';
  end if;
  if p_decision = 'rejected' and nullif(btrim(p_rejection_reason), '') is null then
    raise exception 'A rejection reason is required.' using errcode = '23514';
  end if;
  if p_decision = 'approved' and nullif(btrim(p_assigned_district), '') is null then
    raise exception 'An administrator-assigned district is required for approval.' using errcode = '23514';
  end if;
  if length(btrim(coalesce(p_assigned_district, ''))) > 100
     or length(btrim(coalesce(p_assigned_upazila, ''))) > 100 then
    raise exception 'The assigned area is too long.' using errcode = '22023';
  end if;

  select * into v_application
  from public.officer_applications a
  where a.id = p_application_id
  for update;
  if not found or v_application.status <> 'pending' then
    raise exception 'Only a pending application can be decided.' using errcode = '23505';
  end if;
  if v_application.applicant_id = (select auth.uid()) then
    raise exception 'Administrators cannot approve their own officer application.' using errcode = '42501';
  end if;
  if not exists (
    select 1 from storage.objects o
    where o.bucket_id = 'officer-appointment-letters'
      and o.name = v_application.appointment_letter_path
  ) then
    raise exception 'The appointment letter is unavailable.' using errcode = '23514';
  end if;

  select u.email_confirmed_at into v_confirmed_at
  from auth.users u where u.id = v_application.applicant_id;
  if v_confirmed_at is null then
    raise exception 'The applicant must verify their email before approval.' using errcode = '23514';
  end if;

  if p_decision = 'approved' then
    update public.profiles
    set role = 'officer'
    where id = v_application.applicant_id and role = 'citizen';
    if not found then
      raise exception 'The applicant account is not eligible for officer activation.' using errcode = '23514';
    end if;
  end if;

  update public.officer_applications
  set status = p_decision,
      rejection_reason = case when p_decision = 'rejected' then btrim(p_rejection_reason) else null end,
      assigned_district = case when p_decision = 'approved' then btrim(p_assigned_district) else null end,
      assigned_upazila = case when p_decision = 'approved' then nullif(btrim(p_assigned_upazila), '') else null end,
      assigned_by = case when p_decision = 'approved' then (select auth.uid()) else null end,
      area_assigned_at = case when p_decision = 'approved' then now() else null end,
      decided_at = now(),
      decided_by = (select auth.uid()),
      notification_status = 'pending',
      notification_last_error = null
  where id = v_application.id;

  insert into public.officer_application_events (
    application_id, actor_id, from_status, to_status, reason
  ) values (
    v_application.id, (select auth.uid()), 'pending', p_decision,
    case
      when p_decision = 'rejected' then btrim(p_rejection_reason)
      else 'Administrator assigned area: ' || btrim(p_assigned_district)
        || case when nullif(btrim(p_assigned_upazila), '') is null then '' else ', ' || btrim(p_assigned_upazila) end
    end
  );
  return p_decision;
end;
$$;
revoke all on function public.decide_officer_application(uuid, text, text, text, text) from public, anon;
grant execute on function public.decide_officer_application(uuid, text, text, text, text) to authenticated;

-- Preserve the old RPC shape for safe rejection requests, but prevent legacy
-- clients from approving officers without an explicit assigned area.
create function public.decide_officer_application(
  p_application_id uuid,
  p_decision text,
  p_rejection_reason text default null
)
returns text
language plpgsql
security definer
set search_path = pg_catalog, private, public, auth
as $$
begin
  if p_decision = 'approved' then
    raise exception 'An administrator-assigned district is required for approval.' using errcode = '23514';
  end if;
  return public.decide_officer_application(p_application_id, p_decision, p_rejection_reason, null, null);
end;
$$;
revoke all on function public.decide_officer_application(uuid, text, text) from public, anon;
grant execute on function public.decide_officer_application(uuid, text, text) to authenticated;

create or replace function public.set_officer_application_area(
  p_application_id uuid,
  p_assigned_district text,
  p_assigned_upazila text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, private, public, auth
as $$
declare
  v_applicant_id uuid;
begin
  if not (select private.is_admin()) then
    raise exception 'Administrator access is required.' using errcode = '42501';
  end if;
  if nullif(btrim(p_assigned_district), '') is null
     or length(btrim(p_assigned_district)) > 100
     or length(btrim(coalesce(p_assigned_upazila, ''))) > 100 then
    raise exception 'A valid administrator-assigned district is required.' using errcode = '23514';
  end if;

  update public.officer_applications a
  set assigned_district = btrim(p_assigned_district),
      assigned_upazila = nullif(btrim(p_assigned_upazila), ''),
      assigned_by = (select auth.uid()),
      area_assigned_at = now()
  where a.id = p_application_id
    and a.status = 'approved'
    and exists (
      select 1 from public.profiles p
      where p.id = a.applicant_id and p.role = 'officer'
    )
  returning a.applicant_id into v_applicant_id;
  if not found then
    raise exception 'Only an approved officer application can be assigned an area.' using errcode = '23514';
  end if;

  insert into public.officer_application_events (
    application_id, actor_id, from_status, to_status, reason
  ) values (
    p_application_id,
    (select auth.uid()),
    'approved',
    'approved',
    'Administrator reassigned area: ' || btrim(p_assigned_district)
      || case when nullif(btrim(p_assigned_upazila), '') is null then '' else ', ' || btrim(p_assigned_upazila) end
  );
end;
$$;
revoke all on function public.set_officer_application_area(uuid, text, text) from public, anon;
grant execute on function public.set_officer_application_area(uuid, text, text) to authenticated;

drop policy if exists "claims_read_own_or_admin" on public.erosion_claims;
create policy "claims_read_own_admin_or_authorized_officer"
  on public.erosion_claims for select to authenticated
  using (
    claimant_id = (select auth.uid())
    or (select private.is_admin())
    or (select private.officer_can_review_claim(id))
  );

drop policy if exists "claim_media_read_own_or_admin" on public.claim_media;
create policy "claim_media_read_own_admin_or_authorized_officer"
  on public.claim_media for select to authenticated
  using (
    (select private.is_admin())
    or exists (
      select 1 from public.erosion_claims c
      where c.id = claim_media.claim_id and c.claimant_id = (select auth.uid())
    )
    or (select private.officer_can_review_claim(claim_id))
  );

drop policy if exists "claim_witnesses_read_own_or_admin" on public.claim_witnesses;
create policy "claim_witnesses_read_own_admin_or_authorized_officer"
  on public.claim_witnesses for select to authenticated
  using (
    (select private.is_admin())
    or exists (
      select 1 from public.erosion_claims c
      where c.id = claim_witnesses.claim_id and c.claimant_id = (select auth.uid())
    )
    or (select private.officer_can_review_claim(claim_id))
  );

drop policy if exists "certificates_read_own_or_admin" on public.loss_certificates;
create policy "certificates_read_own_admin_or_authorized_officer"
  on public.loss_certificates for select to authenticated
  using (
    (select private.is_admin())
    or exists (
      select 1 from public.erosion_claims c
      where c.id = loss_certificates.claim_id and c.claimant_id = (select auth.uid())
    )
    or (select private.officer_can_review_claim(claim_id))
  );

drop policy if exists "citizen_evidence_read_own_or_admin" on storage.objects;
create policy "citizen_evidence_read_own_or_admin"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'citizen-evidence'
    and (
      (select private.is_admin())
      or (
        (storage.foldername(name))[1] = (select auth.uid())::text
        and exists (
          select 1 from public.erosion_claims c
          where c.id::text = (storage.foldername(name))[2]
            and c.claimant_id = (select auth.uid())
        )
      )
      or exists (
        select 1 from public.erosion_claims c
        where c.id::text = (storage.foldername(name))[1]
          and c.claimant_id = (select auth.uid())
      )
      or (select private.officer_can_review_claim_path(name))
    )
  );

commit;
