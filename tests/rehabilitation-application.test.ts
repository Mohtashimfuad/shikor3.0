import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import type { CitizenClaimEvidence, CitizenClaimSummary } from '../src/lib/erosionClaims.ts';
import {
  editApplicationDraft,
  generateApplicationDraft,
  getApplicationEvidenceReferences,
} from '../src/lib/rehabilitationApplication.ts';

const claim: CitizenClaimSummary = {
  id: 'claim-1', trackingId: 'SHK-ABC123', district: 'Kurigram', upazila: 'Chilmari', unionName: 'Ramna',
  mouzaName: 'Example Mouza', jlNumber: null, khatianNumber: '12', dagNumber: '45', riverBasin: 'Brahmaputra',
  erosionYear: 2023, totalAreaAcre: 2, submergedAreaAcre: 1, status: 'submitted', reviewStatus: 'submitted',
  reviewReason: null, reviewedBy: null, reviewedAt: null, isVerified: false, createdAt: '2026-01-01T10:00:00Z',
};
const evidence: CitizenClaimEvidence[] = [{
  id: 'media-1', storagePath: 'private/user/claim/river.jpg', mediaType: 'image', description: 'Riverbank photograph',
  originalFilename: 'river.jpg', latitude: null, longitude: null, sha256: 'abc', uploadedAt: '2026-01-02T10:00:00Z',
}];

test('generates purpose-specific Bangla-first and English drafts from claim and profile data', () => {
  const bn = generateApplicationDraft(claim, { name: 'Applicant Name', phone: '01700000000', email: 'applicant@example.test' }, 'rehabilitation', 'bn', '2026-05-04');
  assert.match(bn.subject, /পুনর্বাসন সহায়তার অনুরোধ/);
  assert.match(bn.body, /SHK-ABC123/);
  assert.match(bn.body, /খতিয়ান: 12/);
  assert.match(bn.generatedDate, /২০২৬/);
  assert.equal(bn.recipient, '');
  assert.equal(bn.applicantName, 'Applicant Name');
  assert.equal(bn.applicantEmail, 'applicant@example.test');
  const en = generateApplicationDraft(claim, { name: 'Applicant Name', phone: null }, 'land_record_guidance', 'en', '2026-05-04');
  assert.match(en.subject, /land-record verification/);
  assert.match(en.body, /how I can verify the land records/);
  assert.equal(en.applicantPhone, '');
});

test('missing optional values remain explicitly unavailable and do not introduce assumed facts', () => {
  const sparseClaim = { ...claim, trackingId: 'SHK-SPARSE', mouzaName: '', khatianNumber: '', dagNumber: '', riverBasin: '', submergedAreaAcre: null as unknown as number, erosionYear: null as unknown as number };
  const draft = generateApplicationDraft(sparseClaim, { name: '', phone: null }, 'erosion_loss_report', 'en', '2026-05-04');
  assert.match(draft.body, /Not provided in the claim/);
  assert.doesNotMatch(draft.body, /UNO|AC Land|Khas|eligible|approved/i);
  assert.equal(draft.applicantName, '');
  assert.equal(draft.applicantPhone, '');
});

test('editing recipient, subject and letter text returns an edited copy and preserves the original draft', () => {
  const original = generateApplicationDraft(claim, { name: 'Applicant', phone: null, email: 'applicant@example.test' }, 'rehabilitation', 'en', '2026-05-04');
  const edited = editApplicationDraft(original, {
    recipient: 'User-entered authority', subject: 'User-edited subject', body: 'User-edited letter text',
  });
  assert.equal(edited.recipient, 'User-entered authority');
  assert.equal(edited.subject, 'User-edited subject');
  assert.equal(edited.body, 'User-edited letter text');
  assert.equal(edited.applicantName, original.applicantName);
  assert.equal(edited.applicantEmail, original.applicantEmail);
  assert.notEqual(edited, original);
  assert.notEqual(original.subject, edited.subject);
});

test('dossier evidence is referenced by filename and description without exposing private storage paths or claiming attachment', () => {
  const references = getApplicationEvidenceReferences(evidence);
  assert.deepEqual(references, [{ id: 'media-1', filename: 'river.jpg', description: 'Riverbank photograph' }]);
  assert.doesNotMatch(JSON.stringify(references), /private\/user/);
  const view = readFileSync('src/components/claim/ClaimDraftModal.tsx', 'utf8');
  assert.match(view, /No files are attached to this draft/i);
  assert.match(view, /not attached to application/i);
  assert.match(view, /not provided or verified by Shikor/i);
});

test('assistant is launched from an owned claim and print/PDF output uses editable fields', () => {
  const citizenView = readFileSync('src/components/claim/CitizenClaimsView.tsx', 'utf8');
  const modal = readFileSync('src/components/claim/ClaimDraftModal.tsx', 'utf8');
  assert.match(citizenView, /getCitizenClaimEvidence\(claimId\)/);
  assert.match(citizenView, /claims\.some\(\(claim\) => claim\.id === claimId\)/);
  assert.match(citizenView, /Draft application/);
  assert.match(modal, /value=\{draft\.recipient\}/);
  assert.match(modal, /value=\{draft\.subject\}/);
  assert.match(modal, /value=\{draft\.body\}/);
  assert.match(modal, /window\.print\(\)/);
  assert.match(modal, /Print \/ Save as PDF/);
  assert.match(modal, /not a government filing/i);
});
