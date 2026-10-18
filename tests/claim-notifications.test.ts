import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import type { ClaimReviewEvent, CitizenClaimSummary } from '../src/lib/erosionClaims.ts';
import { buildClaimNotifications, getClaimNotificationSuggestion } from '../src/lib/claimNotifications.ts';

const claim: CitizenClaimSummary = {
  id: 'claim-1', trackingId: 'SHK-123', district: 'Kurigram', upazila: 'Chilmari', unionName: 'Ramna',
  mouzaName: 'Mouza', jlNumber: null, khatianNumber: '10', dagNumber: '3', riverBasin: 'Brahmaputra',
  erosionYear: 2024, totalAreaAcre: 1, submergedAreaAcre: 0.5, status: 'under_review', reviewStatus: 'under_review',
  reviewReason: 'Please check the submitted record.', reviewedBy: 'reviewer-1', reviewedAt: '2026-01-02T10:00:00Z',
  isVerified: false, createdAt: '2026-01-01T10:00:00Z',
};

const event = (id: string, createdAt: string, newStatus: ClaimReviewEvent['newStatus']): ClaimReviewEvent => ({
  id, reviewerId: 'reviewer-1', reviewerName: 'Authorized reviewer', previousStatus: 'submitted', newStatus,
  reason: 'Recorded by a reviewer.', createdAt,
});

test('notification centre only derives updates from events for the citizen claim list and sorts newest first', () => {
  const notifications = buildClaimNotifications([claim], {
    'claim-1': [event('older', '2026-01-02T10:00:00Z', 'under_review'), event('newer', '2026-01-03T10:00:00Z', 'additional_evidence_requested')],
    'someone-elses-claim': [event('private', '2026-01-04T10:00:00Z', 'rejected')],
  });

  assert.deepEqual(notifications.map(({ id, trackingId }) => [id, trackingId]), [
    ['newer', 'SHK-123'], ['older', 'SHK-123'],
  ]);
});

test('status guidance is explicitly a suggestion and does not invent an event', () => {
  assert.match(getClaimNotificationSuggestion('additional_evidence_requested', 'en'), /^Suggestion:/);
  assert.match(getClaimNotificationSuggestion('verified', 'bn'), /পরামর্শ/);
  assert.deepEqual(buildClaimNotifications([claim], {}), []);
});

test('notification UI reads review history, discloses manual refresh, and exposes loading/error/empty states', () => {
  const view = readFileSync('src/components/claim/ClaimNotificationCentre.tsx', 'utf8');
  assert.match(view, /getClaimReviewHistory/);
  assert.match(view, /not automatic or real-time notifications/i);
  assert.match(view, /Loading recorded updates/);
  assert.match(view, /review history could not be loaded/i);
  assert.match(view, /No review events have been recorded yet/i);
  assert.match(view, /Recorded reviewer reason/);
});
