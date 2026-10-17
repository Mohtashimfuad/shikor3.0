import { supabase } from './supabase';
import { buildAppointmentLetterPath, validateAppointmentLetter } from './phase1';

export interface OfficerApplicationFormData {
  applicantName: string;
  applicantPhone: string;
  department: string;
  designation: string;
  employeeNumber: string;
  district: string;
  upazila: string;
  documentConsent: boolean;
}

export interface OfficerApplicationRecord {
  id: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  rejectionReason: string | null;
  submittedAt: string | null;
  createdAt: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  department: string;
  designation: string;
  employeeNumber: string;
  district: string;
  upazila: string;
  assignedDistrict: string | null;
  assignedUpazila: string | null;
  appointmentLetterPath: string;
  notificationStatus: 'not_sent' | 'pending' | 'sending' | 'sent' | 'failed';
  notificationAttempts: number;
  decidedAt: string | null;
}

export interface OfficerApplicationEvent {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  reason: string | null;
  createdAt: string;
}

export async function submitOfficerApplication(
  form: OfficerApplicationFormData,
  file: File,
  existingDraftId?: string,
): Promise<{ applicationId: string | null; error: 'unauthorized' | 'file_type' | 'file_size' | 'submit_failed' | null }> {
  const fileError = validateAppointmentLetter(file);
  if (fileError) return { applicationId: existingDraftId ?? null, error: fileError === 'fileType' ? 'file_type' : 'file_size' };

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return { applicationId: null, error: 'unauthorized' };
  const { data: role, error: roleError } = await supabase.rpc('current_access_role');
  if (roleError || role !== 'citizen') return { applicationId: null, error: 'unauthorized' };

  const applicantId = authData.user.id;
  const applicationId = existingDraftId ?? crypto.randomUUID();
  const filePath = buildAppointmentLetterPath(applicantId, applicationId, file.type);
  if (!filePath) return { applicationId: existingDraftId ?? null, error: 'file_type' };

  if (!existingDraftId) {
    const { error: insertError } = await supabase.from('officer_applications').insert({
      id: applicationId,
      applicant_id: applicantId,
      applicant_name: form.applicantName.trim(),
      applicant_phone: form.applicantPhone.trim(),
      department: form.department.trim(),
      designation: form.designation.trim(),
      employee_number: form.employeeNumber.trim(),
      office_district: form.district.trim(),
      office_upazila: form.upazila.trim(),
      appointment_letter_path: filePath,
      document_consent: form.documentConsent,
    });
    if (insertError) return { applicationId: null, error: 'submit_failed' };
  } else {
    const { data: draft, error: draftError } = await supabase
      .from('officer_applications')
      .select('id, status, appointment_letter_path')
      .eq('id', applicationId)
      .eq('applicant_id', applicantId)
      .eq('status', 'draft')
      .maybeSingle();
    if (draftError || !draft || draft.appointment_letter_path !== filePath) {
      return { applicationId: null, error: 'unauthorized' };
    }
  }

  const { error: uploadError } = await supabase.storage
    .from('officer-appointment-letters')
    .upload(filePath, file, { contentType: file.type, upsert: true });
  if (uploadError) return { applicationId, error: 'submit_failed' };

  const { error: submitError } = await supabase.rpc('submit_officer_application', {
    p_application_id: applicationId,
  });
  if (submitError) return { applicationId, error: 'submit_failed' };
  return { applicationId, error: null };
}

export async function getMyOfficerApplications(): Promise<OfficerApplicationRecord[]> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return [];
  const { data, error } = await supabase
    .from('officer_applications')
    .select('id, status, rejection_reason, submitted_at, created_at, applicant_name, applicant_email, applicant_phone, department, designation, employee_number, office_district, office_upazila, assigned_district, assigned_upazila, appointment_letter_path, notification_status, notification_attempts, decided_at')
    .eq('applicant_id', userData.user.id)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map(mapApplication);
}

export async function getMyOfficerApplicationEvents(applicationId: string): Promise<OfficerApplicationEvent[]> {
  const { data, error } = await supabase
    .from('officer_application_events')
    .select('id, from_status, to_status, reason, created_at')
    .eq('application_id', applicationId)
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  return data.map((event) => ({
    id: event.id as string,
    fromStatus: event.from_status as string | null,
    toStatus: event.to_status as string,
    reason: event.reason as string | null,
    createdAt: event.created_at as string,
  }));
}

export async function getAdminOfficerApplications(): Promise<OfficerApplicationRecord[]> {
  const { data, error } = await supabase
    .from('officer_applications')
    .select('id, status, rejection_reason, submitted_at, created_at, applicant_name, applicant_email, applicant_phone, department, designation, employee_number, office_district, office_upazila, assigned_district, assigned_upazila, appointment_letter_path, notification_status, notification_attempts, decided_at')
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map(mapApplication);
}

export async function getAdminOfficerApplicationEvents(applicationId: string): Promise<OfficerApplicationEvent[]> {
  return getMyOfficerApplicationEvents(applicationId);
}

export async function getAppointmentLetterUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('officer-appointment-letters')
    .createSignedUrl(path, 60);
  return error ? null : data.signedUrl;
}

export async function decideOfficerApplication(
  action: 'approve' | 'reject' | 'retry_notification' | 'assign_area',
  applicationId: string,
  options?: { reason?: string; district?: string; upazila?: string },
): Promise<{ ok: boolean; notificationStatus?: string }> {
  const { data, error } = await supabase.functions.invoke('officer-admin', {
    body: {
      action,
      applicationId,
      ...(options?.reason ? { reason: options.reason } : {}),
      ...(options?.district ? { assignedDistrict: options.district } : {}),
      ...(options?.upazila ? { assignedUpazila: options.upazila } : {}),
    },
  });
  if (error || !data?.ok) return { ok: false };
  return { ok: true, notificationStatus: data.notificationStatus as string | undefined };
}

function mapApplication(row: Record<string, unknown>): OfficerApplicationRecord {
  return {
    id: row.id as string,
    status: row.status as OfficerApplicationRecord['status'],
    rejectionReason: row.rejection_reason as string | null,
    submittedAt: row.submitted_at as string | null,
    createdAt: row.created_at as string,
    applicantName: row.applicant_name as string,
    applicantEmail: row.applicant_email as string,
    applicantPhone: row.applicant_phone as string,
    department: row.department as string,
    designation: row.designation as string,
    employeeNumber: row.employee_number as string,
    district: row.office_district as string,
    upazila: row.office_upazila as string,
    assignedDistrict: row.assigned_district as string | null,
    assignedUpazila: row.assigned_upazila as string | null,
    appointmentLetterPath: row.appointment_letter_path as string,
    notificationStatus: row.notification_status as OfficerApplicationRecord['notificationStatus'],
    notificationAttempts: row.notification_attempts as number,
    decidedAt: row.decided_at as string | null,
  };
}
