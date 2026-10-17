import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const migration = readFileSync('supabase/migrations/20261017160000_trusted_claim_review.sql', 'utf8');
const areaMigration = readFileSync('supabase/migrations/20261017143049_area_scoped_officer_access.sql', 'utf8');
const claimClient = readFileSync('src/lib/erosionClaims.ts', 'utf8');

test('claim decisions are role-authorized, area-scoped for officers, and block self-review', () => {
  const decisionFunction = migration.match(/create or replace function public\.decide_erosion_claim[\s\S]*?\$\$;/i)?.[0] ?? '';
  assert.match(decisionFunction, /private\.is_admin\(\)/i);
  assert.match(decisionFunction, /private\.officer_can_review_claim\(v_claim\.id\)/i);
  assert.match(decisionFunction, /v_claim\.claimant_id\s*=\s*\(select auth\.uid\(\)\)/i);
  assert.match(decisionFunction, /for update/i);
  assert.match(decisionFunction, /previous_status, new_status, reason/i);
  assert.match(areaMigration, /a\.status\s*=\s*'approved'[\s\S]*?a\.assigned_district/i);
  const officerClaimPredicate = migration.match(/create or replace function private\.officer_can_review_claim\([\s\S]*?\$\$;/i)?.[0] ?? '';
  assert.match(officerClaimPredicate, /c\.officer_review_authorized is true[\s\S]*?private\.officer_area_matches\(c\.district, c\.upazila\)/i);
  assert.doesNotMatch(officerClaimPredicate, /is_satellite_verified/i);
  assert.match(migration, /create or replace function public\.get_authorized_claims_for_officer_review[\s\S]*?officer_review_authorized is true[\s\S]*?private\.officer_area_matches/i);
  const verifiedRecordsRpc = migration.match(/create or replace function public\.get_authorized_verified_erosion_records[\s\S]*?\$\$;/i)?.[0] ?? '';
  assert.match(verifiedRecordsRpc, /c\.officer_review_authorized is true[\s\S]*?private\.officer_area_matches\(c\.district, c\.upazila\)/i);
});

test('claim workflow status has no direct client write and review history is append-only to clients', () => {
  assert.match(migration, /revoke update on table public\.erosion_claims from public, anon, authenticated/i);
  assert.match(migration, /revoke all on table public\.claim_review_events from public, anon, authenticated/i);
  assert.match(migration, /grant select on table public\.claim_review_events to authenticated/i);
  assert.doesNotMatch(migration, /grant\s+(?:insert|update|delete|all)[\s\S]{0,100}claim_review_events[\s\S]{0,80}authenticated/i);
  assert.match(migration, /claim_review_events_read_owner_admin_authorized_officer[\s\S]*?private\.is_admin\(\)[\s\S]*?c\.claimant_id = \(select auth\.uid\(\)\)[\s\S]*?private\.officer_can_review_claim/i);
  assert.match(claimClient, /supabase\.rpc\('decide_erosion_claim'/i);
});

test('verification requires an existing private evidence object and a reasoned decision', () => {
  const decisionFunction = migration.match(/create or replace function public\.decide_erosion_claim[\s\S]*?\$\$;/i)?.[0] ?? '';
  assert.match(decisionFunction, /nullif\(btrim\(p_reason\), ''\) is null/i);
  assert.match(decisionFunction, /join storage\.objects o on o\.bucket_id = 'citizen-evidence' and o\.name = m\.storage_path/i);
  assert.match(decisionFunction, /m\.storage_path like v_claim\.claimant_id::text \|\| '\/' \|\| v_claim\.id::text/i);
  assert.match(decisionFunction, /previous_status, new_status, reason/i);
  assert.match(migration, /file_size_limit = 10485760[\s\S]*?allowed_mime_types = array\['application\/pdf', 'image\/jpeg', 'image\/png', 'image\/webp'\]/i);
  assert.match(claimClient, /media_type:\s*file\.type\.startsWith\('image\/'\)\s*\?\s*'image'\s*:\s*file\.type/i);
  assert.match(claimClient, /createSignedUrl\(storagePath, 60\)/i);
  assert.match(claimClient, /\$\{userId\}\/\$\{claimId\}\/\$\{crypto\.randomUUID\(\)\}/i);
});

test('public RPC keeps publication and satellite eligibility separate and masks legacy tracking ids', () => {
  const rpc = migration.match(/create function public\.get_public_verified_erosion_records\(\)([\s\S]*?)revoke all on function public\.get_public_verified_erosion_records/i)?.[1] ?? '';
  assert.match(rpc, /publicly_visible is true/i);
  assert.match(rpc, /is_satellite_verified is true/i);
  assert.match(rpc, /md5\(c\.id::text\)/i);
  assert.doesNotMatch(rpc, /c\.tracking_id|claimant_id|khatian_no|dag_no|nid_number/i);
  assert.match(migration, /grant execute on function public\.get_public_verified_erosion_records\(\) to anon, authenticated/i);
});
