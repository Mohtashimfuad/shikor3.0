import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';

const migrations = readdirSync('supabase/migrations')
  .filter((name) => name.endsWith('.sql'))
  .sort()
  .map((name) => readFileSync(`supabase/migrations/${name}`, 'utf8'))
  .join('\n');

test('officer scope is stored separately from applicant requested office location', () => {
  assert.match(migrations, /add column if not exists assigned_district text/i);
  assert.match(migrations, /add column if not exists assigned_upazila text/i);
  assert.match(migrations, /revoke update\s*\(\s*assigned_district\s*,\s*assigned_upazila[\s\S]*?\)\s*on table public\.officer_applications from public, anon, authenticated/i);
});

test('only approved officers with an admin-assigned matching area can read verified claims', () => {
  assert.match(migrations, /create or replace function private\.officer_area_matches/i);
  assert.match(migrations, /a\.status\s*=\s*'approved'[\s\S]*?a\.assigned_district/i);
  assert.match(migrations, /create or replace function public\.get_authorized_verified_erosion_records[\s\S]*?c\.is_satellite_verified is true[\s\S]*?private\.officer_area_matches/i);
  assert.match(migrations, /create policy "claims_read_own_admin_or_authorized_officer"[\s\S]*?private\.officer_can_review_claim/i);
});

test('officer dossier and evidence reads require explicit admin review authorization', () => {
  assert.match(migrations, /add column if not exists officer_review_authorized boolean not null default false/i);
  assert.match(migrations, /create or replace function public\.set_claim_officer_review/i);
  assert.match(migrations, /create policy "claim_media_read_own_admin_or_authorized_officer"[\s\S]*?private\.officer_can_review_claim/i);
  assert.match(migrations, /create policy "citizen_evidence_read_own_or_admin"[\s\S]*?private\.officer_can_review_claim_path/i);
});

test('admin approval requires an assigned district and cannot use applicant-provided area as authorization', () => {
  assert.match(migrations, /p_assigned_district text/i);
  assert.match(migrations, /if p_decision = 'approved' and nullif\(btrim\(p_assigned_district\), ''\) is null/i);
  assert.match(migrations, /create or replace function public\.set_officer_application_area/i);
});
