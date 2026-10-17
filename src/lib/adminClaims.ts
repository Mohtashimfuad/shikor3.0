import { supabase } from './supabase';
import type { ClaimReviewStatus } from './erosionClaims';

export interface AdminClaimReviewRow {
  id: string;
  trackingId: string;
  district: string;
  upazila: string;
  unionName: string;
  mouzaName: string;
  erosionYear: number;
  verified: boolean;
  reviewStatus: ClaimReviewStatus;
  officerReviewAuthorized: boolean;
  publiclyVisible: boolean;
  createdAt: string;
}

export async function getAdminClaimReviewRows(): Promise<{
  rows: AdminClaimReviewRow[];
  error: boolean;
}> {
  const { data, error } = await supabase
    .from('erosion_claims')
    .select('id, tracking_id, district, upazila, union_name, mouza_name, erosion_year, is_satellite_verified, review_status, officer_review_authorized, publicly_visible, created_at')
    .order('created_at', { ascending: false });

  if (error || !data) return { rows: [], error: Boolean(error) };
  return {
    error: false,
    rows: data.map((row) => ({
      id: row.id,
      trackingId: row.tracking_id,
      district: row.district,
      upazila: row.upazila,
      unionName: row.union_name,
      mouzaName: row.mouza_name,
      erosionYear: row.erosion_year,
      verified: row.is_satellite_verified,
      reviewStatus: row.review_status as ClaimReviewStatus,
      officerReviewAuthorized: row.officer_review_authorized,
      publiclyVisible: row.publicly_visible,
      createdAt: row.created_at,
    })),
  };
}

export async function setClaimOfficerReviewAuthorization(claimId: string, authorized: boolean): Promise<boolean> {
  const { error } = await supabase.rpc('set_claim_officer_review', {
    p_claim_id: claimId,
    p_authorized: authorized,
  });
  return !error;
}

export async function setClaimPublicVisibility(claimId: string, publiclyVisible: boolean): Promise<boolean> {
  const { error } = await supabase.rpc('set_claim_public_visibility', {
    p_claim_id: claimId,
    p_publicly_visible: publiclyVisible,
  });
  return !error;
}
