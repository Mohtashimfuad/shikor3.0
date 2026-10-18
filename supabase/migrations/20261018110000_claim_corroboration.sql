begin;

-- Separate corroboration workflow. A corroboration decision never changes a claim.
create table public.claim_corroborations (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.erosion_claims(id) on delete cascade,
  witness_id uuid not null references auth.users(id) on delete cascade,
  observation_type text not null check (observation_type in ('firsthand', 'heard_from_others')),
  description text check (description is null or length(btrim(description)) between 1 and 2000),
  review_status text not null default 'submitted' check (review_status in ('submitted', 'accepted', 'rejected')),
  created_at timestamptz not null default now(), reviewed_by uuid references auth.users(id), reviewed_at timestamptz, review_reason text,
  check ((review_status = 'submitted' and reviewed_by is null and reviewed_at is null and review_reason is null)
    or (review_status <> 'submitted' and reviewed_by is not null and reviewed_at is not null and review_reason is not null and length(btrim(review_reason)) between 1 and 2000)),
  unique (claim_id, witness_id)
);
create index claim_corroborations_claim_created_idx on public.claim_corroborations (claim_id, created_at desc);
create table public.claim_corroboration_media (
  id uuid primary key default gen_random_uuid(), corroboration_id uuid not null references public.claim_corroborations(id) on delete cascade,
  storage_path text not null unique, media_type text not null check (media_type in ('application/pdf','image/jpeg','image/png','image/webp')),
  description text check (description is null or length(btrim(description)) between 1 and 500), uploaded_at timestamptz not null default now()
);
create table public.claim_corroboration_events (
  id uuid primary key default gen_random_uuid(), corroboration_id uuid not null references public.claim_corroborations(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id), previous_status text not null, new_status text not null,
  reason text not null check (length(btrim(reason)) between 1 and 2000), created_at timestamptz not null default now()
);

alter table public.claim_corroborations enable row level security;
alter table public.claim_corroboration_media enable row level security;
alter table public.claim_corroboration_events enable row level security;
revoke all on table public.claim_corroborations, public.claim_corroboration_media, public.claim_corroboration_events from public, anon, authenticated;
grant select (id, claim_id, observation_type, description, review_status, created_at, reviewed_at, review_reason) on public.claim_corroborations to authenticated;
grant select (id, corroboration_id, storage_path, media_type, description, uploaded_at) on public.claim_corroboration_media to authenticated;
grant select (id, corroboration_id, previous_status, new_status, reason, created_at) on public.claim_corroboration_events to authenticated;

create or replace function private.corroboration_reviewer_can_access(p_id uuid)
returns boolean language sql stable security definer set search_path = pg_catalog, private, public, auth as $$
 select (select private.is_verified_auth_user()) and exists (select 1 from public.claim_corroborations x where x.id=p_id
   and ((select private.is_admin()) or (select private.officer_can_review_claim(x.claim_id))));
$$;
revoke all on function private.corroboration_reviewer_can_access(uuid) from public, anon;
grant execute on function private.corroboration_reviewer_can_access(uuid) to authenticated;
create policy corroborations_read_authorized on public.claim_corroborations for select to authenticated using (
 witness_id=(select auth.uid()) or exists(select 1 from public.erosion_claims c where c.id=claim_id and c.claimant_id=(select auth.uid()))
 or (select private.corroboration_reviewer_can_access(id)));
create policy corroboration_media_read_witness_reviewer on public.claim_corroboration_media for select to authenticated using (
 exists(select 1 from public.claim_corroborations x where x.id=corroboration_id and x.witness_id=(select auth.uid()))
 or (select private.corroboration_reviewer_can_access(corroboration_id)));
create policy corroboration_events_read_authorized on public.claim_corroboration_events for select to authenticated using (
 exists(select 1 from public.claim_corroborations x where x.id=corroboration_id and x.witness_id=(select auth.uid()))
 or exists(select 1 from public.claim_corroborations x join public.erosion_claims c on c.id=x.claim_id where x.id=corroboration_id and c.claimant_id=(select auth.uid()))
 or (select private.corroboration_reviewer_can_access(corroboration_id)));

create or replace function public.get_claim_reference_for_corroboration(p_tracking_id text)
returns table(tracking_id text)
language plpgsql stable security definer set search_path=pg_catalog,private,public,auth as $$
begin
 if (select auth.uid()) is null or not (select private.is_verified_auth_user()) or (select public.current_access_role()) <> 'citizen' then raise exception 'Verified citizen account required.' using errcode='42501'; end if;
 return query select c.tracking_id from public.erosion_claims c where c.tracking_id=upper(btrim(p_tracking_id)) limit 1;
end; $$;
create or replace function public.submit_claim_corroboration(p_tracking_id text,p_observation_type text,p_description text default null)
returns uuid language plpgsql security definer set search_path=pg_catalog,private,public,auth as $$
declare c public.erosion_claims%rowtype; new_id uuid; d text:=nullif(btrim(p_description),'');
begin
 if (select auth.uid()) is null or not (select private.is_verified_auth_user()) or (select public.current_access_role()) <> 'citizen' then raise exception 'Verified citizen account required.' using errcode='42501'; end if;
 if p_observation_type not in ('firsthand','heard_from_others') or (d is not null and length(d)>2000) then raise exception 'Invalid submission.' using errcode='22023'; end if;
 select * into c from public.erosion_claims where tracking_id=upper(btrim(p_tracking_id)) for key share;
 if not found then raise exception 'No claim found for that tracking ID.' using errcode='P0002'; end if;
 if c.claimant_id=(select auth.uid()) then raise exception 'Claim owner cannot corroborate own claim.' using errcode='42501'; end if;
 insert into public.claim_corroborations(claim_id,witness_id,observation_type,description) values(c.id,(select auth.uid()),p_observation_type,d) returning id into new_id;
 return new_id;
exception when unique_violation then raise exception 'Already submitted for this claim.' using errcode='23505';
end; $$;
create or replace function public.attach_claim_corroboration_media(p_id uuid,p_path text,p_type text,p_description text default null)
returns uuid language plpgsql security definer set search_path=pg_catalog,private,public,auth,storage as $$
declare new_id uuid;
begin
 if not exists(select 1 from public.claim_corroborations x where x.id=p_id and x.witness_id=(select auth.uid()) and x.review_status='submitted') then raise exception 'Submission cannot accept evidence.' using errcode='42501'; end if;
 if p_path !~ ('^'||(select auth.uid())::text||'/'||p_id::text||'/[A-Za-z0-9._-]+$') or p_type not in ('application/pdf','image/jpeg','image/png','image/webp') or (p_description is not null and length(btrim(p_description)) not between 1 and 500) then raise exception 'Invalid evidence metadata.' using errcode='22023'; end if;
 if not exists(select 1 from storage.objects where bucket_id='witness-evidence' and name=p_path) then raise exception 'Evidence upload not found.' using errcode='P0002'; end if;
 insert into public.claim_corroboration_media(corroboration_id,storage_path,media_type,description) values(p_id,p_path,p_type,nullif(btrim(p_description),'')) returning id into new_id;
 return new_id;
end; $$;
create or replace function public.get_claim_corroborations_for_review()
returns table(id uuid,claim_id uuid,tracking_id text,district text,upazila text,union_name text,mouza_name text,observation_type text,description text,review_status text,created_at timestamptz)
language plpgsql stable security definer set search_path=pg_catalog,private,public,auth as $$
begin
 if (select auth.uid()) is null or not (select private.is_verified_auth_user()) then raise exception 'Verified account required.' using errcode='42501'; end if;
 return query select x.id,x.claim_id,c.tracking_id,c.district,c.upazila,c.union_name,c.mouza_name,x.observation_type,x.description,x.review_status,x.created_at from public.claim_corroborations x join public.erosion_claims c on c.id=x.claim_id where (select private.is_admin()) or (select private.officer_can_review_claim(x.claim_id)) order by x.created_at desc;
end; $$;
create or replace function public.get_my_claim_corroborations()
returns table(id uuid,tracking_id text,observation_type text,review_status text,review_reason text,created_at timestamptz)
language plpgsql stable security definer set search_path=pg_catalog,private,public,auth as $$
begin
 if (select auth.uid()) is null or not (select private.is_verified_auth_user()) then raise exception 'Verified account required.' using errcode='42501'; end if;
 return query select x.id,c.tracking_id,x.observation_type,x.review_status,x.review_reason,x.created_at
 from public.claim_corroborations x join public.erosion_claims c on c.id=x.claim_id where x.witness_id=(select auth.uid()) order by x.created_at desc;
end; $$;
create or replace function public.review_claim_corroboration(p_id uuid,p_decision text,p_reason text)
returns void language plpgsql security definer set search_path=pg_catalog,private,public,auth as $$
declare x public.claim_corroborations%rowtype;
begin
 if (select auth.uid()) is null or not (select private.is_verified_auth_user()) then raise exception 'Verified account required.' using errcode='42501'; end if;
 if p_decision not in ('accepted','rejected') or length(btrim(coalesce(p_reason,''))) not between 1 and 2000 then raise exception 'Invalid decision or reason.' using errcode='22023'; end if;
 select * into x from public.claim_corroborations where id=p_id for update;
 if not found or not ((select private.is_admin()) or (select private.officer_can_review_claim(x.claim_id))) then raise exception 'Not authorized.' using errcode='42501'; end if;
 if x.witness_id=(select auth.uid()) then raise exception 'Cannot review own submission.' using errcode='42501'; end if;
 if x.review_status <> 'submitted' then raise exception 'Already reviewed.' using errcode='55000'; end if;
 update public.claim_corroborations set review_status=p_decision,reviewed_by=(select auth.uid()),reviewed_at=now(),review_reason=btrim(p_reason) where id=p_id;
 insert into public.claim_corroboration_events(corroboration_id,reviewer_id,previous_status,new_status,reason) values(p_id,(select auth.uid()),x.review_status,p_decision,btrim(p_reason));
 -- No update to erosion_claims or its claim review history.
end; $$;

revoke all on function public.get_claim_reference_for_corroboration(text) from public,anon;
revoke all on function public.submit_claim_corroboration(text,text,text) from public,anon;
revoke all on function public.attach_claim_corroboration_media(uuid,text,text,text) from public,anon;
revoke all on function public.get_claim_corroborations_for_review() from public,anon;
revoke all on function public.get_my_claim_corroborations() from public,anon;
revoke all on function public.review_claim_corroboration(uuid,text,text) from public,anon;
grant execute on function public.get_claim_reference_for_corroboration(text) to authenticated;
grant execute on function public.submit_claim_corroboration(text,text,text) to authenticated;
grant execute on function public.attach_claim_corroboration_media(uuid,text,text,text) to authenticated;
grant execute on function public.get_claim_corroborations_for_review() to authenticated;
grant execute on function public.get_my_claim_corroborations() to authenticated;
grant execute on function public.review_claim_corroboration(uuid,text,text) to authenticated;

create or replace function private.corroboration_reviewer_can_access_path(p_path text)
returns boolean language sql stable security definer set search_path=pg_catalog,private,public,auth,storage as $$
 select exists(select 1 from public.claim_corroborations x where x.id::text=(storage.foldername(p_path))[2] and (select private.corroboration_reviewer_can_access(x.id)));
$$;
revoke all on function private.corroboration_reviewer_can_access_path(text) from public,anon;
grant execute on function private.corroboration_reviewer_can_access_path(text) to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('witness-evidence','witness-evidence',false,10485760,array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=10485760,allowed_mime_types=excluded.allowed_mime_types;
create policy witness_evidence_insert_own on storage.objects for insert to authenticated with check(bucket_id='witness-evidence' and (storage.foldername(name))[1]=(select auth.uid())::text and exists(select 1 from public.claim_corroborations x where x.id::text=(storage.foldername(name))[2] and x.witness_id=(select auth.uid()) and x.review_status='submitted'));
create policy witness_evidence_read_own_or_reviewer on storage.objects for select to authenticated using(bucket_id='witness-evidence' and ((storage.foldername(name))[1]=(select auth.uid())::text or (select private.corroboration_reviewer_can_access_path(name))));
create policy witness_evidence_delete_own_pending on storage.objects for delete to authenticated using(bucket_id='witness-evidence' and (storage.foldername(name))[1]=(select auth.uid())::text and exists(select 1 from public.claim_corroborations x where x.id::text=(storage.foldername(name))[2] and x.witness_id=(select auth.uid()) and x.review_status='submitted'));
commit;
