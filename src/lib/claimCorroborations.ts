import { supabase } from './supabase';
import { validateCorroborationFile, validateCorroborationInput } from './corroborationValidation';
export { validateCorroborationFile, validateCorroborationInput } from './corroborationValidation';

export type ObservationType = 'firsthand' | 'heard_from_others';
export type CorroborationStatus = 'submitted' | 'accepted' | 'rejected';
export interface ClaimReference { trackingId: string; }
export interface CorroborationSubmission {
  id: string; claimId: string; trackingId: string; district: string; upazila: string; unionName: string;
  mouzaName: string; observationType: ObservationType; description: string | null; status: CorroborationStatus;
  createdAt: string; reviewedAt: string | null; reviewReason?: string | null;
}
export interface CorroborationMedia { id: string; path: string; type: string; description: string | null; uploadedAt: string; }

function mapReference(row: Record<string, unknown>): ClaimReference {
  return { trackingId: String(row.tracking_id) };
}
export async function findClaimReference(trackingId: string): Promise<{ reference: ClaimReference | null; error: boolean }> {
  const { data, error } = await supabase.rpc('get_claim_reference_for_corroboration', { p_tracking_id: trackingId.trim() });
  return { reference: !error && data?.[0] ? mapReference(data[0] as Record<string, unknown>) : null, error: Boolean(error) };
}
export async function submitCorroboration(trackingId: string, observationType: ObservationType, description: string): Promise<{ id: string | null; error: string | null }> {
  const validation = validateCorroborationInput(trackingId, observationType, description);
  if (validation) return { id: null, error: validation };
  const { data, error } = await supabase.rpc('submit_claim_corroboration', {
    p_tracking_id: trackingId.trim(), p_observation_type: observationType, p_description: description.trim() || null,
  });
  return error || !data ? { id: null, error: error?.message ?? 'Submission did not return an identifier.' } : { id: String(data), error: null };
}

export async function uploadCorroborationEvidence(userId: string, submissionId: string, file: File, description: string): Promise<string | null> {
  const validation = validateCorroborationFile(file);
  if (validation) return validation;
  if (description.trim().length > 500) return 'Evidence description must be 500 characters or fewer.';
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const path = `${userId}/${submissionId}/${crypto.randomUUID()}.${/^[a-z0-9]{1,8}$/.test(ext) ? ext : 'bin'}`;
  const { data, error } = await supabase.storage.from('witness-evidence').upload(path, file, { contentType: file.type, upsert: false });
  if (error || !data) return 'Evidence upload failed. Your submission is saved; retry the file upload.';
  const { error: attachError } = await supabase.rpc('attach_claim_corroboration_media', {
    p_id: submissionId, p_path: data.path, p_type: file.type, p_description: description.trim() || null,
  });
  if (attachError) {
    await supabase.storage.from('witness-evidence').remove([data.path]);
    return 'Evidence could not be attached. The file was removed; retry the upload.';
  }
  return null;
}
function mapSubmission(row: Record<string, unknown>): CorroborationSubmission {
  return { id: String(row.id), claimId: String(row.claim_id ?? ''), trackingId: String(row.tracking_id ?? ''),
    district: String(row.district ?? ''), upazila: String(row.upazila ?? ''), unionName: String(row.union_name ?? ''),
    mouzaName: String(row.mouza_name ?? ''), observationType: String(row.observation_type) as ObservationType,
    description: row.description == null ? null : String(row.description), status: String(row.review_status) as CorroborationStatus,
    createdAt: String(row.created_at),
    reviewedAt: row.reviewed_at == null ? null : String(row.reviewed_at),
    reviewReason: row.review_reason == null ? null : String(row.review_reason) };
}
export async function getMyCorroborations(): Promise<{ rows: CorroborationSubmission[]; error: boolean }> {
  const { data, error } = await supabase.rpc('get_my_claim_corroborations');
  if (error || !data) return { rows: [], error: Boolean(error) };
  return { rows: data.map((r: Record<string, unknown>) => mapSubmission(r)), error: false };
}
export async function getOwnerCorroborations(claimId: string): Promise<{ rows: CorroborationSubmission[]; error: boolean }> {
  const { data, error } = await supabase.from('claim_corroborations').select('id,claim_id,observation_type,description,review_status,created_at,reviewed_at,review_reason').eq('claim_id', claimId).order('created_at', { ascending: false });
  if (error || !data) return { rows: [], error: Boolean(error) };
  return { rows: data.map((r) => mapSubmission(r as Record<string, unknown>)), error: false };
}
export async function getCorroborationReviewQueue(): Promise<{ rows: CorroborationSubmission[]; error: boolean }> {
  const { data, error } = await supabase.rpc('get_claim_corroborations_for_review');
  if (error || !data) return { rows: [], error: Boolean(error) };
  return { rows: data.map((r: Record<string, unknown>) => mapSubmission(r)), error: false };
}
export async function getCorroborationMedia(id: string): Promise<{ rows: CorroborationMedia[]; error: boolean }> {
  const { data, error } = await supabase.from('claim_corroboration_media').select('id,corroboration_id,storage_path,media_type,description,uploaded_at').eq('corroboration_id', id);
  if (error || !data) return { rows: [], error: Boolean(error) };
  return { rows: data.map((r) => ({ id: r.id, path: r.storage_path, type: r.media_type, description: r.description, uploadedAt: r.uploaded_at })), error: false };
}
export async function getCorroborationSignedUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from('witness-evidence').createSignedUrl(path, 60);
  return error ? null : data?.signedUrl ?? null;
}
export async function reviewCorroboration(id: string, decision: Exclude<CorroborationStatus, 'submitted'>, reason: string): Promise<string | null> {
  if (!reason.trim() || reason.trim().length > 2000) return 'A review reason of 1 to 2000 characters is required.';
  const { error } = await supabase.rpc('review_claim_corroboration', { p_id: id, p_decision: decision, p_reason: reason.trim() });
  return error ? error.message : null;
}
