import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { validateCorroborationInput, validateCorroborationFile } from '../src/lib/corroborationValidation.ts';

const migration = readFileSync('supabase/migrations/20261018110000_claim_corroboration.sql', 'utf8');
const view = readFileSync('src/components/community/CommunityCorroborationView.tsx', 'utf8');

test('corroboration input requires a plausible tracking ID and an explicit source type', () => {
  assert.equal(validateCorroborationInput('SHK-KUR-2026-00001', 'firsthand', ''), null);
  assert.equal(validateCorroborationInput('', 'firsthand', ''), 'Enter the tracking ID shown on the claim receipt.');
  assert.match(validateCorroborationInput('SHK-123456', 'unknown', '') ?? '', /Choose firsthand/);
  assert.match(validateCorroborationInput('SHK-123456', 'heard_from_others', 'x'.repeat(2001)) ?? '', /2000/);
});

test('supporting evidence allows only expected MIME types and a 10 MB maximum', () => {
  const make = (type: string, size: number) => ({ type, size } as File);
  assert.equal(validateCorroborationFile(make('application/pdf', 1024)), null);
  assert.match(validateCorroborationFile(make('text/html', 100)) ?? '', /PDF/);
  assert.match(validateCorroborationFile(make('image/png', 10 * 1024 * 1024 + 1)) ?? '', /10 MB/);
});

test('migration isolates witness identity, requires verified citizen submission, prevents duplicates, and scopes review', () => {
  assert.match(migration, /unique \(claim_id, witness_id\)/i);
  assert.match(migration, /private\.is_verified_auth_user\(\)[\s\S]*?current_access_role\(\)\) <> 'citizen'/i);
  assert.match(migration, /claimant_id=\(select auth\.uid\(\)\)[\s\S]*?Claim owner cannot corroborate own claim/i);
  assert.match(migration, /private\.officer_can_review_claim\(x\.claim_id\)/i);
  assert.match(migration, /grant select \(id, claim_id, observation_type, description, review_status, created_at, reviewed_at, review_reason\)/i);
  assert.doesNotMatch(migration, /grant select[^;]*witness_id/i);
  assert.match(migration, /bucket_id='witness-evidence'[\s\S]*?storage\.foldername\(name\)\)\[1\].*auth\.uid/i);
});

test('corroboration review records an audit event without changing the land-loss claim status', () => {
  const review = migration.match(/create or replace function public\.review_claim_corroboration[\s\S]*?end; \$\$;/i)?.[0] ?? '';
  assert.match(review, /private\.officer_can_review_claim\(x\.claim_id\)/i);
  assert.match(review, /claim_corroboration_events/i);
  assert.match(review, /No update to erosion_claims/i);
  assert.doesNotMatch(review, /update public\.erosion_claims|decide_erosion_claim/i);
});

test('migration is additive and scoped to new corroboration tables and a private evidence bucket', () => {
  assert.match(migration, /create table public\.claim_corroborations/i);
  assert.match(migration, /create table public\.claim_corroboration_media/i);
  assert.match(migration, /create table public\.claim_corroboration_events/i);
  assert.match(migration, /values\('witness-evidence','witness-evidence',false/i);
  assert.doesNotMatch(migration, /drop table|truncate|delete from public\.(erosion_claims|claim_media)|alter table public\.erosion_claims/i);
  assert.doesNotMatch(migration, /decide_erosion_claim\s*\(/i);
});

test('citizen workflow exposes a minimal claim reference and no private claimant or land fields', () => {
  const lookup = migration.match(/create or replace function public\.get_claim_reference_for_corroboration[\s\S]*?end; \$\$;/i)?.[0] ?? '';
  assert.match(lookup, /returns table\(tracking_id text\)/i);
  assert.doesNotMatch(lookup, /claimant_id|district|upazila|khatian|dag_no|profiles/i);
});

test('community UI distinguishes firsthand and hearsay, gives retry state, and separates claim owner from private files', () => {
  assert.match(view, /firsthand/);
  assert.match(view, /heard_from_others/);
  assert.match(view, /Retry file upload/);
  assert.match(view, /Only you and authorized reviewers can open it/);
  assert.match(view, /Submitter account identity and attached files are not shown here/);
});

test('authorized reviewer roles can see and decide submissions while loading, empty, and error states stay distinct', () => {
  assert.match(view, /currentUser\.role === 'admin' \|\| currentUser\.role === 'officer'/);
  assert.match(view, /Review community submissions/);
  assert.match(view, /reviewCorroboration/);
  assert.match(view, /Loading review queue/);
  assert.match(view, /review queue could not be loaded/);
  assert.match(view, /There are no submissions to review/);
  assert.match(view, /does not change the underlying claim status/);
});
