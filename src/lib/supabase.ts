import { createClient } from '@supabase/supabase-js';
import { LandLossRecord } from '../types';

// Retrieve credentials from environment variables or browser localStorage
export const getStoredCredentials = () => {
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const localUrl = typeof window !== 'undefined' ? localStorage.getItem('shikor_supabase_url') : null;
  const localKey = typeof window !== 'undefined' ? localStorage.getItem('shikor_supabase_key') : null;

  const url = (envUrl && envUrl !== 'https://your-project-id.supabase.co') ? envUrl : (localUrl || '');
  const key = (envKey && envKey !== 'your-anon-public-key') ? envKey : (localKey || '');

  return { url, key };
};

const credentials = getStoredCredentials();

export const isSupabaseConfigured = (): boolean => {
  const { url, key } = getStoredCredentials();
  return Boolean(url && key && url.startsWith('https://') && key.length > 20);
};

// Initialize client
export const supabase = createClient(
  credentials.url || 'https://placeholder-project.supabase.co',
  credentials.key || 'placeholder-anon-key'
);

export const saveSupabaseCredentials = (url: string, key: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('shikor_supabase_url', url.trim());
    localStorage.setItem('shikor_supabase_key', key.trim());
    window.location.reload();
  }
};

export const clearSupabaseCredentials = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('shikor_supabase_url');
    localStorage.removeItem('shikor_supabase_key');
    window.location.reload();
  }
};

export const testSupabaseConnection = async (url: string, key: string): Promise<{ success: boolean; message: string }> => {
  try {
    if (!url.startsWith('https://') || !url.includes('.supabase.co')) {
      return { success: false, message: 'Invalid Supabase URL. Must be in the format: https://[project-ref].supabase.co' };
    }
    const response = await fetch(`${url.replace(/\/$/, '')}/rest/v1/`, {
      headers: { apikey: key, Accept: 'application/openapi+json' },
    });
    if (!response.ok) return { success: false, message: 'Connection failed. Check the project URL and public anon key.' };
    return { success: true, message: 'Supabase API is reachable. User data remains protected by authentication and database policies.' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Failed to connect to Supabase.' };
  }
};

// Insert a new erosion loss claim and certificate into Supabase
export const submitErosionClaimToSupabase = async (formData: {
  fullNameEn: string;
  fullNameBn: string;
  phone: string;
  district: string;
  upazila: string;
  union: string;
  mouza: string;
  jlNumber?: string;
  khatianNo: string;
  dagNo: string;
  lostArea: number;
  totalArea?: number;
  submersionYear: number;
  riverName: string;
  lat?: number;
  lng?: number;
}): Promise<{ success: boolean; record?: LandLossRecord; error?: string }> => {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase is not configured' };
  }

  try {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return { success: false, error: 'A verified citizen account is required.' };
    }
    const { data: role, error: roleError } = await supabase.rpc('current_access_role');
    if (roleError || role !== 'citizen') {
      return { success: false, error: 'A verified citizen account is required.' };
    }

    const trackingId = `SHK-${formData.district.slice(0, 3).toUpperCase()}-${new Date().getFullYear()}-${formData.dagNo.padStart(5, '0')}`;
    const claimPayload = {
      tracking_id: trackingId,
      claimant_id: authData.user.id,
      district: formData.district,
      upazila: formData.upazila,
      union_name: formData.union,
      mouza_name: formData.mouza,
      jl_number: formData.jlNumber || '42',
      khatian_no: formData.khatianNo,
      dag_no: formData.dagNo,
      total_area_acre: formData.totalArea || (Number(formData.lostArea) + 0.1),
      submerged_area_acre: Number(formData.lostArea),
      erosion_year: Number(formData.submersionYear),
      river_basin: formData.riverName,
    };

    const { data: claim, error: claimErr } = await supabase
      .from('erosion_claims')
      .insert(claimPayload)
      .select('id, tracking_id, district, upazila, union_name, mouza_name, jl_number, khatian_no, dag_no, total_area_acre, submerged_area_acre, erosion_year, river_basin, created_at')
      .single();

    if (claimErr) {
      return { success: false, error: 'The claim could not be submitted.' };
    }

    const formattedRecord: LandLossRecord = {
      id: claim.id,
      trackingId: claim.tracking_id,
      ownerName: formData.fullNameEn,
      ownerBanglaName: formData.fullNameBn,
      district: claim.district,
      upazila: claim.upazila,
      union: claim.union_name,
      mouza: claim.mouza_name,
      jlNumber: claim.jl_number,
      khatianNo: claim.khatian_no,
      dagNo: claim.dag_no,
      totalAreaAcre: Number(claim.total_area_acre),
      submergedAreaAcre: Number(claim.submerged_area_acre),
      submersionYear: claim.erosion_year,
      riverBasin: claim.river_basin,
      gpsCoords: { lat: formData.lat || 25.5682, lng: formData.lng || 89.6741 },
      status: 'Pending Community Endorsement',
      satelliteSentinelMatch: 0,
      witnessCount: 0,
      certificateHash: '',
      issuedDate: new Date(claim.created_at || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    };

    return { success: true, record: formattedRecord };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

// Upload media file to private citizen-evidence bucket
export const uploadCitizenMedia = async (
  file: File, 
  claimId: string
): Promise<{ success: boolean; signedUrl?: string; storagePath?: string; error?: string }> => {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase is not configured' };
  }

  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return { success: false, error: 'A signed-in citizen account is required.' };
    const { data: role, error: roleError } = await supabase.rpc('current_access_role');
    if (roleError || role !== 'citizen') return { success: false, error: 'A signed-in citizen account is required.' };

    const fileExt = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
    const fileName = `${userData.user.id}/${claimId}/${Date.now()}_evidence.${fileExt}`;

    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from('citizen-evidence')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadErr) {
      return { success: false, error: uploadErr.message };
    }

    // Keep evidence links short-lived; Storage RLS still controls link creation.
    const { data: signedData, error: signedErr } = await supabase.storage
      .from('citizen-evidence')
      .createSignedUrl(uploadData.path, 60);

    if (signedErr) {
      return { success: true, storagePath: uploadData.path };
    }

    return { 
      success: true, 
      signedUrl: signedData.signedUrl, 
      storagePath: uploadData.path 
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

// Fetch real claims from Supabase
export const fetchErosionClaimsFromSupabase = async (): Promise<LandLossRecord[] | null> => {
  if (!isSupabaseConfigured()) return null;

  try {
    const { data, error } = await supabase
      .from('erosion_claims')
      .select('id, tracking_id, district, upazila, union_name, mouza_name, jl_number, khatian_no, dag_no, total_area_acre, submerged_area_acre, erosion_year, river_basin, is_satellite_verified, satellite_match_rate, created_at, loss_certificates(cryptographic_hash)')
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) return null;

    return data.map((item: any) => ({
      id: item.id,
      trackingId: item.tracking_id,
      ownerName: 'Registered Landowner',
      ownerBanglaName: 'নিবন্ধিত ভূমিমালিক',
      district: item.district,
      upazila: item.upazila,
      union: item.union_name,
      mouza: item.mouza_name,
      jlNumber: item.jl_number,
      khatianNo: item.khatian_no,
      dagNo: item.dag_no,
      totalAreaAcre: Number(item.total_area_acre),
      submergedAreaAcre: Number(item.submerged_area_acre),
      submersionYear: item.erosion_year,
      riverBasin: item.river_basin,
      gpsCoords: { lat: 25.5682, lng: 89.6741 },
      status: item.is_satellite_verified ? 'Verified by Satellite' : 'Pending Community Endorsement',
      satelliteSentinelMatch: item.is_satellite_verified ? Number(item.satellite_match_rate) || 0 : 0,
      witnessCount: 0,
      certificateHash: item.loss_certificates?.[0]?.cryptographic_hash || '',
      issuedDate: new Date(item.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    }));
  } catch (err) {
    // Keep private claim details and backend errors out of browser logs.
    return null;
  }
};
