begin;

-- Public access is opt-in and exposes location-level facts only. Claimant and
-- cadastral identifiers remain private behind the claim policies.
alter table public.erosion_claims
  add column if not exists publicly_visible boolean not null default false,
  add column if not exists publicly_visible_by uuid references auth.users (id),
  add column if not exists publicly_visible_at timestamptz;

alter table public.erosion_claims
  add constraint erosion_claims_public_visibility_requires_verification
    check (not publicly_visible or is_satellite_verified is true),
  add constraint erosion_claims_public_visibility_audit_pair_check
    check (
      (publicly_visible and publicly_visible_by is not null and publicly_visible_at is not null)
      or
      (not publicly_visible and publicly_visible_by is null and publicly_visible_at is null)
    );

revoke update (publicly_visible, publicly_visible_by, publicly_visible_at)
  on table public.erosion_claims from public, anon, authenticated;

create or replace function public.set_claim_public_visibility(
  p_claim_id uuid,
  p_publicly_visible boolean
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
  if p_publicly_visible is null then
    raise exception 'A visibility decision is required.' using errcode = '22023';
  end if;

  update public.erosion_claims c
  set publicly_visible = p_publicly_visible,
      publicly_visible_by = case when p_publicly_visible then (select auth.uid()) else null end,
      publicly_visible_at = case when p_publicly_visible then now() else null end
  where c.id = p_claim_id
    and (not p_publicly_visible or c.is_satellite_verified is true);
  if not found then
    raise exception 'Only an existing verified claim can be published.' using errcode = '23514';
  end if;
end;
$$;
revoke all on function public.set_claim_public_visibility(uuid, boolean) from public, anon;
grant execute on function public.set_claim_public_visibility(uuid, boolean) to authenticated;

create or replace function public.get_public_verified_erosion_records()
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
  select
    c.tracking_id,
    c.district,
    c.upazila,
    c.union_name,
    c.mouza_name,
    c.erosion_year,
    c.river_basin,
    c.total_area_acre,
    c.submerged_area_acre,
    c.publicly_visible_at
  from public.erosion_claims c
  where c.publicly_visible is true
    and c.is_satellite_verified is true
  order by c.publicly_visible_at desc;
$$;
revoke all on function public.get_public_verified_erosion_records() from public, anon, authenticated;
grant execute on function public.get_public_verified_erosion_records() to anon, authenticated;

commit;
