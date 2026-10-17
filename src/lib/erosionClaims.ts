import { supabase } from './supabase';

export interface CitizenClaimInput {
  district: string;
  upazila: string;
  unionName: string;
  mouzaName: string;
  jlNumber: string;
  khatianNumber: string;
  dagNumber: string;
  totalAreaAcre: number;
  submergedAreaAcre: number;
  erosionYear: number;
  riverBasin: string;
  evidence: File[];
}

export interface CitizenClaimSummary {
  id: string;
  trackingId: string;
  district: string;
  upazila: string;
  unionName: string;
  mouzaName: string;
  erosionYear: number;
  totalAreaAcre: number;
  submergedAreaAcre: number;
  status: string;
  reviewStatus: ClaimReviewStatus;
  reviewReason: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  isVerified: boolean;
  createdAt: string;
}

export type ClaimReviewStatus = 'submitted' | 'under_review' | 'additional_evidence_requested' | 'verified' | 'rejected';

export interface ClaimReviewEvent {
  id: string;
  reviewerId: string;
  reviewerName: string;
  previousStatus: ClaimReviewStatus;
  newStatus: ClaimReviewStatus;
  reason: string;
  createdAt: string;
}

export async function getClaimReviewHistory(claimId: string): Promise<{ events: ClaimReviewEvent[]; error: boolean }> {
  const { data, error } = await supabase.from('claim_review_events')
    .select('id, reviewer_id, reviewer_display_name, previous_status, new_status, reason, created_at')
    .eq('claim_id', claimId)
    .order('created_at', { ascending: false });
  if (error || !data) return { events: [], error: true };
  return {
    error: false,
    events: data.map((row) => ({
      id: row.id,
      reviewerId: row.reviewer_id,
      reviewerName: row.reviewer_display_name,
      previousStatus: row.previous_status as ClaimReviewStatus,
      newStatus: row.new_status as ClaimReviewStatus,
      reason: row.reason,
      createdAt: row.created_at,
    })),
  };
}

export async function decideClaim(claimId: string, decision: Exclude<ClaimReviewStatus, 'submitted'>, reason: string): Promise<string | null> {
  const { error } = await supabase.rpc('decide_erosion_claim', {
    p_claim_id: claimId,
    p_decision: decision,
    p_reason: reason.trim(),
  });
  return error ? 'The claim decision was not saved. Confirm authorization, status, and evidence, then retry.' : null;
}

export interface OfficerReviewClaim {
  id: string;
  trackingId: string;
  district: string;
  upazila: string;
  unionName: string;
  mouzaName: string;
  erosionYear: number;
  reviewStatus: ClaimReviewStatus;
  createdAt: string;
}

export async function getAuthorizedOfficerReviewClaims(): Promise<{ claims: OfficerReviewClaim[]; error: boolean }> {
  const { data, error } = await supabase.rpc('get_authorized_claims_for_officer_review');
  if (error || !data) return { claims: [], error: Boolean(error) };
  return {
    error: false,
    claims: data.map((row: Record<string, unknown>) => ({
      id: String(row.id), trackingId: String(row.tracking_id), district: String(row.district),
      upazila: String(row.upazila), unionName: String(row.union_name), mouzaName: String(row.mouza_name),
      erosionYear: Number(row.erosion_year), reviewStatus: String(row.review_status) as ClaimReviewStatus,
      createdAt: String(row.created_at),
    })),
  };
}

const CLAIM_EVIDENCE_MAX_BYTES = 10 * 1024 * 1024;
const CLAIM_EVIDENCE_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);

async function uploadClaimEvidence(userId: string, claimId: string, files: File[]): Promise<string | null> {
  if (files.some((file) => !CLAIM_EVIDENCE_TYPES.has(file.type) || file.size <= 0 || file.size > CLAIM_EVIDENCE_MAX_BYTES)) {
    return 'Evidence must be a non-empty PDF, JPEG, PNG, or WebP file no larger than 10 MB.';
  }
  for (const file of files) {
    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
    const safeExtension = /^[a-z0-9]{1,8}$/.test(extension) ? extension : 'bin';
    const storagePath = `${userId}/${claimId}/${crypto.randomUUID()}.${safeExtension}`;
    const { data: uploaded, error: uploadError } = await supabase.storage.from('citizen-evidence').upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    });
    if (uploadError || !uploaded) return 'The file could not be uploaded. Check the connection and try again.';
    const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
    const sha256 = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
    const { error: mediaError } = await supabase.from('claim_media').insert({
      claim_id: claimId,
      storage_path: uploaded.path,
      media_type: file.type.startsWith('image/') ? 'image' : file.type,
      sha256_hash: sha256,
    });
    if (mediaError) {
      await supabase.storage.from('citizen-evidence').remove([uploaded.path]);
      return 'The uploaded file could not be attached to this claim.';
    }
  }
  return null;
}

export async function submitCitizenClaim(input: CitizenClaimInput): Promise<{
  claim: CitizenClaimSummary | null;
  error: string | null;
}> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return { claim: null, error: 'Sign in with a verified citizen account to submit a claim.' };
  const { data: role, error: roleError } = await supabase.rpc('current_access_role');
  if (roleError || role !== 'citizen') return { claim: null, error: 'Only a verified citizen account can submit a claim.' };

  const invalidFile = input.evidence.some((file) => !CLAIM_EVIDENCE_TYPES.has(file.type) || file.size <= 0 || file.size > CLAIM_EVIDENCE_MAX_BYTES);
  if (invalidFile) return { claim: null, error: 'Evidence must be a non-empty PDF, JPEG, PNG, or WebP file no larger than 10 MB.' };

  const trackingId = `SHK-${crypto.randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`;
  const { data, error } = await supabase.from('erosion_claims').insert({
    tracking_id: trackingId,
    claimant_id: authData.user.id,
    district: input.district.trim(),
    upazila: input.upazila.trim(),
    union_name: input.unionName.trim(),
    mouza_name: input.mouzaName.trim(),
    jl_number: input.jlNumber.trim() || null,
    khatian_no: input.khatianNumber.trim(),
    dag_no: input.dagNumber.trim(),
    total_area_acre: input.totalAreaAcre,
    submerged_area_acre: input.submergedAreaAcre,
    erosion_year: input.erosionYear,
    river_basin: input.riverBasin.trim(),
  }).select('id, tracking_id, district, upazila, union_name, mouza_name, erosion_year, total_area_acre, submerged_area_acre, status, review_status, review_reason, reviewed_by, reviewed_at, is_satellite_verified, created_at').single();

  if (error || !data) return { claim: null, error: 'The claim could not be submitted. Check the required details and try again.' };

  const claim: CitizenClaimSummary = {
    id: data.id,
    trackingId: data.tracking_id,
    district: data.district,
    upazila: data.upazila,
    unionName: data.union_name,
    mouzaName: data.mouza_name,
    erosionYear: data.erosion_year,
    totalAreaAcre: Number(data.total_area_acre),
    submergedAreaAcre: Number(data.submerged_area_acre),
    status: data.status,
    reviewStatus: data.review_status,
    reviewReason: data.review_reason,
    reviewedBy: data.reviewed_by,
    reviewedAt: data.reviewed_at,
    isVerified: data.is_satellite_verified,
    createdAt: data.created_at,
  };

  const evidenceError = await uploadClaimEvidence(authData.user.id, data.id, input.evidence);
  if (evidenceError) return { claim, error: `Claim ${data.tracking_id} was created, but ${evidenceError} Open its dossier to attach the files later.` };

  return {
    claim,
    error: null,
  };
}

export async function addCitizenClaimEvidence(claimId: string, files: File[]): Promise<string | null> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return 'Sign in with your citizen account to attach evidence.';
  const { data: role, error: roleError } = await supabase.rpc('current_access_role');
  if (roleError || role !== 'citizen') return 'Only a citizen account can attach evidence.';
  const { data: claim, error } = await supabase.from('erosion_claims').select('id').eq('id', claimId).maybeSingle();
  if (error || !claim) return 'This claim is not available in your account.';
  return uploadClaimEvidence(authData.user.id, claimId, files);
}

export async function getMyCitizenClaims(): Promise<{ claims: CitizenClaimSummary[]; error: boolean }> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return { claims: [], error: true };
  const { data, error } = await supabase.from('erosion_claims')
    .select('id, tracking_id, district, upazila, union_name, mouza_name, erosion_year, total_area_acre, submerged_area_acre, status, review_status, review_reason, reviewed_by, reviewed_at, is_satellite_verified, created_at')
    .eq('claimant_id', userData.user.id)
    .order('created_at', { ascending: false });
  if (error || !data) return { claims: [], error: true };
  return {
    error: false,
    claims: data.map((row) => ({
      id: row.id,
      trackingId: row.tracking_id,
      district: row.district,
      upazila: row.upazila,
      unionName: row.union_name,
      mouzaName: row.mouza_name,
      erosionYear: row.erosion_year,
      totalAreaAcre: Number(row.total_area_acre),
      submergedAreaAcre: Number(row.submerged_area_acre),
      status: row.status,
      reviewStatus: row.review_status,
      reviewReason: row.review_reason,
      reviewedBy: row.reviewed_by,
      reviewedAt: row.reviewed_at,
      isVerified: row.is_satellite_verified,
      createdAt: row.created_at,
    })),
  };
}

export interface CitizenClaimEvidence {
  id: string;
  storagePath: string;
  mediaType: string | null;
  uploadedAt: string;
}

export async function getCitizenClaimEvidence(claimId: string): Promise<{ files: CitizenClaimEvidence[]; error: boolean }> {
  const { data, error } = await supabase.from('claim_media')
    .select('id, storage_path, media_type, uploaded_at')
    .eq('claim_id', claimId)
    .order('uploaded_at', { ascending: false });
  if (error || !data) return { files: [], error: true };
  return {
    error: false,
    files: data.map((row) => ({ id: row.id, storagePath: row.storage_path, mediaType: row.media_type, uploadedAt: row.uploaded_at })),
  };
}

export async function getCitizenEvidenceUrl(storagePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from('citizen-evidence').createSignedUrl(storagePath, 60);
  return error ? null : data.signedUrl;
}

export interface VerifiedErosionRecord {
  id: string;
  trackingId: string;
  district: string;
  upazila: string;
  unionName: string;
  mouzaName: string;
  erosionYear: number;
  riverBasin: string;
  totalAreaAcre: number;
  submergedAreaAcre: number;
  satelliteMatchRate: number | null;
  createdAt: string;
}

export interface PublicErosionRecord {
  id: string;
  district: string;
  upazila: string;
  unionName: string;
  mouzaName: string;
  erosionYear: number;
  riverBasin: string;
  totalAreaAcre: number;
  submergedAreaAcre: number;
  publishedAt: string;
}

export async function getPublicErosionRecords(): Promise<{ records: PublicErosionRecord[]; error: boolean }> {
  const { data, error } = await supabase.rpc('get_public_verified_erosion_records');
  if (error || !data) return { records: [], error: Boolean(error) };

  return {
    error: false,
    records: data.map((row: Record<string, unknown>, index: number) => ({
      id: `${String(row.district)}-${String(row.upazila)}-${String(row.erosion_year)}-${index}`,
      district: String(row.district),
      upazila: String(row.upazila),
      unionName: String(row.union_name),
      mouzaName: String(row.mouza_name),
      erosionYear: Number(row.erosion_year),
      riverBasin: String(row.river_basin),
      totalAreaAcre: Number(row.total_area_acre),
      submergedAreaAcre: Number(row.submerged_area_acre),
      publishedAt: String(row.published_at),
    })),
  };
}

export interface OfficerClaimDossier {
  id: string;
  trackingId: string;
  district: string;
  upazila: string;
  unionName: string;
  mouzaName: string;
  jlNumber: string;
  khatianNumber: string;
  dagNumber: string;
  erosionYear: number;
  totalAreaAcre: number;
  submergedAreaAcre: number;
  riverBasin: string;
  reviewStatus: ClaimReviewStatus;
}

export interface ClaimEvidenceFile {
  id: string;
  storagePath: string;
  mediaType: string | null;
  sha256: string;
  uploadedAt: string;
}

export async function getAuthorizedVerifiedErosionRecords(): Promise<{
  records: VerifiedErosionRecord[];
  error: boolean;
}> {
  const { data, error } = await supabase.rpc('get_authorized_verified_erosion_records');
  if (error || !data) return { records: [], error: Boolean(error) };

  return {
    error: false,
    records: data.map((row: Record<string, unknown>) => ({
      id: String(row.id),
      trackingId: String(row.tracking_id),
      district: String(row.district),
      upazila: String(row.upazila),
      unionName: String(row.union_name),
      mouzaName: String(row.mouza_name),
      erosionYear: Number(row.erosion_year),
      riverBasin: String(row.river_basin),
      totalAreaAcre: Number(row.total_area_acre),
      submergedAreaAcre: Number(row.submerged_area_acre),
      satelliteMatchRate: row.satellite_match_rate == null ? null : Number(row.satellite_match_rate),
      createdAt: String(row.created_at),
    })),
  };
}

export async function getOfficerClaimDossier(claimId: string): Promise<{
  dossier: OfficerClaimDossier | null;
  evidence: ClaimEvidenceFile[];
  error: 'not_authorized' | 'load_failed' | null;
}> {
  const { data, error } = await supabase
    .from('erosion_claims')
    .select('id, tracking_id, district, upazila, union_name, mouza_name, jl_number, khatian_no, dag_no, erosion_year, total_area_acre, submerged_area_acre, river_basin, review_status')
    .eq('id', claimId)
    .maybeSingle();
  if (error) return { dossier: null, evidence: [], error: 'load_failed' };
  if (!data) return { dossier: null, evidence: [], error: 'not_authorized' };

  const { data: media, error: mediaError } = await supabase
    .from('claim_media')
    .select('id, storage_path, media_type, sha256_hash, uploaded_at')
    .eq('claim_id', claimId)
    .order('uploaded_at', { ascending: false });
  if (mediaError) return { dossier: null, evidence: [], error: 'load_failed' };

  return {
    error: null,
    dossier: {
      id: data.id,
      trackingId: data.tracking_id,
      district: data.district,
      upazila: data.upazila,
      unionName: data.union_name,
      mouzaName: data.mouza_name,
      jlNumber: data.jl_number,
      khatianNumber: data.khatian_no,
      dagNumber: data.dag_no,
      erosionYear: data.erosion_year,
      totalAreaAcre: Number(data.total_area_acre),
      submergedAreaAcre: Number(data.submerged_area_acre),
      riverBasin: data.river_basin,
      reviewStatus: data.review_status as ClaimReviewStatus,
    },
    evidence: media.map((row) => ({
      id: row.id,
      storagePath: row.storage_path,
      mediaType: row.media_type,
      sha256: row.sha256_hash,
      uploadedAt: row.uploaded_at,
    })),
  };
}

export async function getOfficerEvidenceUrl(storagePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('citizen-evidence')
    .createSignedUrl(storagePath, 60);
  return error ? null : data.signedUrl;
}
