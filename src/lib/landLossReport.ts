import type { AuthProfile } from '../context/AuthContext';
import type { ClaimReviewEvent, CitizenClaimEvidence, CitizenClaimSummary } from './erosionClaims';
import type { CorroborationSubmission } from './claimCorroborations';

export interface LandLossReportModel {
  claim: CitizenClaimSummary;
  evidence: CitizenClaimEvidence[];
  claimReviewHistory: ClaimReviewEvent[];
  corroborations: CorroborationSubmission[];
  corroborationsUnavailable: boolean;
}

export function canGenerateCitizenReport(role: AuthProfile['role'], claimId: string, ownedClaimIds: readonly string[]): boolean {
  return role === 'citizen' && Boolean(claimId) && ownedClaimIds.includes(claimId);
}

export function buildLandLossReportModel(
  claim: CitizenClaimSummary,
  evidence: CitizenClaimEvidence[],
  claimReviewHistory: ClaimReviewEvent[],
  corroborations: { rows: CorroborationSubmission[]; error: boolean },
): LandLossReportModel {
  return {
    claim,
    evidence: [...evidence],
    claimReviewHistory: [...claimReviewHistory],
    corroborations: corroborations.error ? [] : [...corroborations.rows],
    corroborationsUnavailable: corroborations.error,
  };
}

export function reportValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined || String(value).trim() === '') return 'Not provided';
  return String(value);
}

export function reportEvidenceFilename(evidence: Pick<CitizenClaimEvidence, 'originalFilename' | 'storagePath'>): string {
  const originalFilename = evidence.originalFilename?.trim();
  if (originalFilename) return originalFilename;
  const extension = evidence.storagePath.split('.').pop()?.toLowerCase();
  return extension && extension !== evidence.storagePath ? `Filename not recorded (.${extension})` : 'Filename not recorded';
}

export function isReportImage(evidence: Pick<CitizenClaimEvidence, 'mediaType' | 'originalFilename' | 'storagePath'>): boolean {
  const filename = evidence.originalFilename ?? evidence.storagePath;
  return evidence.mediaType === 'image' && /\.(jpe?g|png|webp)$/i.test(filename);
}
