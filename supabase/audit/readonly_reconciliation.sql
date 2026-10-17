-- Shikor production reconciliation: READ-ONLY schema and security inspection.
-- Run statements individually in the Supabase Dashboard SQL Editor.
-- These queries do not read citizen rows, auth credentials, or Storage object contents.

-- 1. Confirm whether the Supabase migration ledger exists.
select to_regclass('supabase_migrations.schema_migrations') as migration_ledger;

-- If the standard ledger is absent, look for a differently named migration table.
select schemaname, tablename
from pg_tables
where schemaname not in ('pg_catalog', 'information_schema')
  and tablename ilike '%migration%'
order by schemaname, tablename;

-- 2. Read only migration versions and names. Do not select the statements column.
-- Run this only if query 1 found the standard ledger; otherwise inspect query 1b.
select to_jsonb(m)->>'version' as version,
       to_jsonb(m)->>'name' as name
from supabase_migrations.schema_migrations as m
order by to_jsonb(m)->>'version';

-- 3. Table-level RLS status for claims, review history, identity, and Storage.
select n.nspname as schema_name,
       c.relname as table_name,
       c.relrowsecurity as rls_enabled,
       c.relforcerowsecurity as rls_forced
from pg_class as c
join pg_namespace as n on n.oid = c.relnamespace
where (n.nspname = 'public' and c.relname = any (array[
         'erosion_claims', 'claim_media', 'claim_review_events',
         'officer_applications', 'profiles'
       ]))
   or (n.nspname = 'private' and c.relname = 'admin_authority')
   or (n.nspname = 'storage' and c.relname = 'objects')
order by n.nspname, c.relname;

-- 4. Actual columns, types, nullability, and defaults (no row data).
select table_schema,
       table_name,
       ordinal_position,
       column_name,
       data_type,
       is_nullable,
       column_default
from information_schema.columns
where (table_schema = 'public' and table_name = any (array[
         'erosion_claims', 'claim_media', 'claim_review_events',
         'officer_applications', 'profiles'
       ]))
   or (table_schema = 'storage' and table_name = 'buckets')
order by table_schema, table_name, ordinal_position;

-- 5. Actual constraints and their validated definitions.
select n.nspname as schema_name,
       c.relname as table_name,
       con.conname as constraint_name,
       con.contype as constraint_type,
       con.convalidated as validated,
       pg_get_constraintdef(con.oid) as definition
from pg_constraint as con
join pg_class as c on c.oid = con.conrelid
join pg_namespace as n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = any (array[
    'erosion_claims', 'claim_media', 'claim_review_events', 'officer_applications'
  ])
order by c.relname, con.conname;

-- 6. Every policy on the relevant tables. Keep all rows: permissive policies combine with OR.
select schemaname,
       tablename,
       policyname,
       permissive,
       roles,
       cmd,
       qual,
       with_check
from pg_policies
where (schemaname = 'public' and tablename = any (array[
         'erosion_claims', 'claim_media', 'claim_review_events',
         'claim_witnesses', 'loss_certificates', 'officer_applications', 'profiles'
       ]))
   or (schemaname = 'storage' and tablename = 'objects')
order by schemaname, tablename, policyname;

-- 7. Effective table privileges, including grants inherited from PUBLIC/roles.
with target_roles(role_name) as (
  values ('anon'), ('authenticated'), ('service_role'), ('authenticator')
), target_tables(schema_name, table_name) as (
  values
    ('public', 'erosion_claims'),
    ('public', 'claim_media'),
    ('public', 'claim_review_events'),
    ('public', 'officer_applications'),
    ('public', 'profiles'),
    ('private', 'admin_authority'),
    ('storage', 'objects')
)
select r.role_name,
       t.schema_name,
       t.table_name,
       has_table_privilege(r.role_name, format('%I.%I', t.schema_name, t.table_name), 'SELECT') as can_select,
       has_table_privilege(r.role_name, format('%I.%I', t.schema_name, t.table_name), 'INSERT') as can_insert,
       has_table_privilege(r.role_name, format('%I.%I', t.schema_name, t.table_name), 'UPDATE') as can_update,
       has_table_privilege(r.role_name, format('%I.%I', t.schema_name, t.table_name), 'DELETE') as can_delete,
       has_table_privilege(r.role_name, format('%I.%I', t.schema_name, t.table_name), 'TRUNCATE') as can_truncate
from target_roles as r
cross join target_tables as t
where to_regclass(format('%I.%I', t.schema_name, t.table_name)) is not null
order by r.role_name, t.schema_name, t.table_name;

-- 8. Effective column UPDATE privileges for trusted claim and publication fields.
with target_roles(role_name) as (
  values ('anon'), ('authenticated'), ('service_role')
), target_columns(column_name) as (
  values
    ('review_status'), ('review_reason'), ('reviewed_by'), ('reviewed_at'),
    ('officer_review_authorized'), ('officer_review_authorized_by'), ('officer_review_authorized_at'),
    ('publicly_visible'), ('publicly_visible_by'), ('publicly_visible_at')
)
select r.role_name,
       c.column_name,
       has_column_privilege(r.role_name, 'public.erosion_claims', c.column_name, 'UPDATE') as can_update
from target_roles as r
cross join target_columns as c
where exists (
  select 1 from information_schema.columns
  where table_schema = 'public' and table_name = 'erosion_claims'
    and column_name = c.column_name
)
order by r.role_name, c.column_name;

-- 9. Every relevant RPC/helper definition, owner, security mode, search_path, and effective execute grants.
select n.nspname as schema_name,
       p.proname as function_name,
       pg_get_function_identity_arguments(p.oid) as identity_arguments,
       pg_get_function_result(p.oid) as result_type,
       l.lanname as language,
       p.prosecdef as security_definer,
       p.proconfig as function_settings,
       pg_get_userbyid(p.proowner) as owner,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute,
       has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role_can_execute,
       pg_get_functiondef(p.oid) as definition
from pg_proc as p
join pg_namespace as n on n.oid = p.pronamespace
join pg_language as l on l.oid = p.prolang
where n.nspname in ('public', 'private')
  and p.proname = any (array[
    'is_admin', 'is_verified_auth_user', 'officer_area_matches',
    'officer_can_review_claim', 'officer_can_review_claim_path',
    'current_access_role', 'decide_erosion_claim', 'set_claim_officer_review',
    'get_authorized_claims_for_officer_review', 'get_authorized_verified_erosion_records',
    'set_claim_public_visibility', 'get_public_verified_erosion_records',
    'decide_officer_application', 'set_officer_application_area'
  ])
order by n.nspname, p.proname, identity_arguments;

-- 10. Trigger definitions that could change claim fields or review history.
select n.nspname as schema_name,
       c.relname as table_name,
       t.tgname as trigger_name,
       t.tgenabled as enabled_state,
       pg_get_triggerdef(t.oid) as definition
from pg_trigger as t
join pg_class as c on c.oid = t.tgrelid
join pg_namespace as n on n.oid = c.relnamespace
where not t.tgisinternal
  and n.nspname = 'public'
  and c.relname = any (array[
    'erosion_claims', 'claim_media', 'claim_review_events', 'officer_applications'
  ])
order by c.relname, t.tgname;

-- 11. Private evidence bucket configuration only; no object names or file contents.
select id, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'citizen-evidence';

-- 12. Database objects dependent on the public RPC that the trusted migration replaces.
with target_function as (
  select p.oid
  from pg_proc as p
  join pg_namespace as n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'get_public_verified_erosion_records'
    and p.pronargs = 0
)
select pg_describe_object(d.classid, d.objid, d.objsubid) as dependent_object
from target_function as f
join pg_depend as d
  on d.refclassid = 'pg_proc'::regclass
 and d.refobjid = f.oid
where d.deptype <> 'i'
order by dependent_object;
