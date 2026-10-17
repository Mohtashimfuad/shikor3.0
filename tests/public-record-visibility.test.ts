import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';

const migrations = readdirSync('supabase/migrations')
  .filter((name) => name.endsWith('.sql'))
  .sort()
  .map((name) => readFileSync(`supabase/migrations/${name}`, 'utf8'))
  .join('\n');
const publicMigration = readFileSync('supabase/migrations/20261017160000_trusted_claim_review.sql', 'utf8');

test('public erosion data requires explicit admin publication and verified status', () => {
  assert.match(migrations, /add column if not exists publicly_visible boolean not null default false/i);
  assert.match(migrations, /create or replace function public\.set_claim_public_visibility[\s\S]*?private\.is_admin\(\)[\s\S]*?is_satellite_verified is true/i);
});

test('public record RPC exposes minimized facts and only explicitly published records', () => {
  const rpc = publicMigration.match(/create function public\.get_public_verified_erosion_records\(\)([\s\S]*?)revoke all on function/i)?.[1] ?? '';
  assert.match(rpc, /publicly_visible is true/i);
  assert.match(rpc, /is_satellite_verified is true/i);
  assert.match(rpc, /md5\(c\.id::text\)/i);
  assert.doesNotMatch(rpc, /c\.tracking_id|claimant_id|khatian_no|dag_no|nid_number/i);
  assert.match(migrations, /grant execute on function public\.get_public_verified_erosion_records\(\) to anon, authenticated/i);
});
