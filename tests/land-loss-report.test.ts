import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import type { ClaimReviewEvent, CitizenClaimSummary, CitizenClaimEvidence } from '../src/lib/erosionClaims.ts';
import type { CorroborationSubmission } from '../src/lib/claimCorroborations.ts';
import { buildLandLossReportModel, canGenerateCitizenReport, isReportImage, reportEvidenceFilename, reportValue } from '../src/lib/landLossReport.ts';

const claim: CitizenClaimSummary = {
  id: 'claim-1', trackingId: 'SHK-ABC123', district: 'Kurigram', upazila: 'Chilmari', unionName: 'Ramna',
  mouzaName: 'Example Mouza', jlNumber: null, khatianNumber: '12', dagNumber: '45', riverBasin: 'Brahmaputra',
  erosionYear: 2023, totalAreaAcre: 2, submergedAreaAcre: 1, status: 'submitted', reviewStatus: 'submitted',
  reviewReason: null, reviewedBy: null, reviewedAt: null, isVerified: false, createdAt: '2026-01-01T10:00:00Z',
};
const image: CitizenClaimEvidence = {
  id: 'media-1', storagePath: 'owner/claim/photo.jpg', mediaType: 'image', description: 'Riverbank photo',
  originalFilename: 'riverbank.jpg', latitude: 25.5, longitude: 89.6, sha256: 'abc', uploadedAt: '2026-01-02T10:00:00Z',
};
const corroboration: CorroborationSubmission = {
  id: 'corr-1', claimId: 'claim-1', trackingId: 'SHK-ABC123', district: '', upazila: '', unionName: '', mouzaName: '',
  observationType: 'heard_from_others', description: 'A neighbor shared this account.', status: 'accepted', createdAt: '2026-01-03T10:00:00Z',
  reviewedAt: '2026-01-04T10:00:00Z', reviewReason: 'Recorded for consideration.',
};
const reviewEvent: ClaimReviewEvent = {
  id: 'review-1', reviewerId: 'reviewer-1', reviewerName: 'Authorized reviewer', previousStatus: 'submitted',
  newStatus: 'under_review', reason: 'Review started.', createdAt: '2026-01-05T10:00:00Z',
};

test('report model preserves claim, evidence, GPS metadata, reviewer history, and authorized corroboration', () => {
  const model = buildLandLossReportModel(claim, [image], [reviewEvent], { rows: [corroboration], error: false });
  assert.equal(model.claim.trackingId, 'SHK-ABC123');
  assert.equal(model.evidence[0].description, 'Riverbank photo');
  assert.equal(model.claimReviewHistory[0].reviewerName, 'Authorized reviewer');
  assert.deepEqual([model.evidence[0].latitude, model.evidence[0].longitude], [25.5, 89.6]);
  assert.equal(model.corroborations[0].status, 'accepted');
  assert.equal(model.corroborationsUnavailable, false);
  assert.equal(reportEvidenceFilename(image), 'riverbank.jpg');
  assert.equal(isReportImage(image), true);
});

test('missing optional values and legacy original filenames are labeled without invented data', () => {
  assert.equal(reportValue(null), 'Not provided');
  assert.equal(reportValue('  '), 'Not provided');
  assert.equal(reportEvidenceFilename({ originalFilename: null, storagePath: 'owner/claim/random.pdf' }), 'Filename not recorded (.pdf)');
  assert.equal(isReportImage({ mediaType: 'application/pdf', originalFilename: 'scan.pdf', storagePath: 'x/scan.pdf' }), false);
  const model = buildLandLossReportModel(claim, [], [], { rows: [corroboration], error: true });
  assert.equal(model.corroborationsUnavailable, true);
  assert.deepEqual(model.corroborations, []);
});

test('only citizens whose owned claim list contains the claim can generate a report', () => {
  assert.equal(canGenerateCitizenReport('citizen', 'claim-1', ['claim-1']), true);
  assert.equal(canGenerateCitizenReport('citizen', 'claim-2', ['claim-1']), false);
  assert.equal(canGenerateCitizenReport('officer', 'claim-1', ['claim-1']), false);
  assert.equal(canGenerateCitizenReport('admin', 'claim-1', ['claim-1']), false);
});

test('report makes provenance, authorization, unavailable data, print/PDF, and no-government-submission limits clear', () => {
  const view = readFileSync('src/components/claim/LandLossEvidenceReport.tsx', 'utf8');
  const dossier = readFileSync('src/components/claim/CitizenClaimsView.tsx', 'utf8');
  const migration = readFileSync('supabase/migrations/20261018130000_claim_media_original_filename.sql', 'utf8');
  assert.match(view, /provided by claimant/i);
  assert.match(view, /GPS metadata \(unverified\)/i);
  assert.match(view, /witness or submitter statements/i);
  assert.match(view, /not a government submission or certificate/i);
  assert.match(view, /window\.print\(\)/);
  assert.match(view, /getOwnerCorroborations\(claim\.id\)/);
  assert.match(view, /corroborationsUnavailable/);
  assert.match(dossier, /canGenerateCitizenReport|LandLossEvidenceReport/);
  assert.match(migration, /add column if not exists original_filename text/i);
});
