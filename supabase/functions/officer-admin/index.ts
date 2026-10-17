import { createClient } from '@supabase/supabase-js';

declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Response | Promise<Response>): void;
};

type RequestAction = 'approve' | 'reject' | 'retry_notification' | 'assign_area';
type NotificationRequest = {
  action: RequestAction;
  applicationId: string;
  reason?: string;
  assignedDistrict?: string;
  assignedUpazila?: string;
};

const appUrl = Deno.env.get('APP_PUBLIC_URL')?.replace(/\/$/, '') ?? '';
const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
};

function jsonResponse(body: Record<string, unknown>, status = 200, origin?: string): Response {
  const originAllowed = Boolean(origin) && (!appUrl || origin === new URL(appUrl).origin);
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      ...(originAllowed ? { 'Access-Control-Allow-Origin': origin } : {}),
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

function html(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character] ?? character);
}

async function sendDecisionEmail(application: Record<string, unknown>): Promise<{ ok: boolean; errorCode?: string }> {
  const resendKey = Deno.env.get('RESEND_API_KEY');
  const mailFrom = Deno.env.get('OFFICER_MAIL_FROM');
  const status = application.status === 'approved' ? 'approved' : 'rejected';
  let activationUrl: string | null = null;

  if (status === 'approved') {
    if (!resendKey || !mailFrom || !appUrl) return { ok: false, errorCode: 'mail_not_configured' };
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) return { ok: false, errorCode: 'auth_service_not_configured' };

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await adminClient.auth.admin.generateLink({
      type: 'recovery',
      email: String(application.applicant_email),
      options: { redirectTo: `${appUrl}/?page=account-activation` },
    });
    if (error || !data.properties?.action_link) return { ok: false, errorCode: 'recovery_link_failed' };
    activationUrl = data.properties.action_link;
  } else if (!resendKey || !mailFrom) {
    return { ok: false, errorCode: 'mail_not_configured' };
  }

  const recipient = String(application.applicant_email);
  const name = html(String(application.applicant_name));
  const subject = status === 'approved'
    ? 'Shikor officer application approved'
    : 'Shikor officer application decision';
  const htmlBody = status === 'approved'
    ? `<p>প্রিয় ${name},</p><p>আপনার Shikor Officer আবেদন অনুমোদিত হয়েছে। নিরাপদ লিংক থেকে আপনার পাসওয়ার্ড সেট করুন:</p><p><a href="${html(activationUrl ?? '')}">নিরাপদ অ্যাকাউন্ট লিংক</a></p><p>এই লিংকটি ব্যক্তিগত রাখুন। Shikor কখনো ইমেইলে আপনার পাসওয়ার্ড চাইবে না।</p><hr><p>Hello ${name}, your Shikor officer application has been approved. Use the secure link to set your password. Keep this link private; Shikor will never ask for your password by email.</p>`
    : `<p>প্রিয় ${name},</p><p>আপনার Shikor Officer আবেদনের সিদ্ধান্ত হয়েছে। কারণ: ${html(String(application.rejection_reason ?? ''))}</p><hr><p>Hello ${name}, a decision was made on your Shikor officer application. Reason: ${html(String(application.rejection_reason ?? ''))}</p>`;
  const textBody = status === 'approved'
    ? `আপনার Shikor Officer আবেদন অনুমোদিত হয়েছে। নিরাপদ পাসওয়ার্ড সেটআপ লিংক: ${activationUrl}\n\nYour Shikor officer application was approved. Secure password setup link: ${activationUrl}`
    : `আপনার Shikor Officer আবেদনের সিদ্ধান্ত হয়েছে। কারণ: ${String(application.rejection_reason ?? '')}\n\nA decision was made on your Shikor officer application. Reason: ${String(application.rejection_reason ?? '')}`;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: mailFrom, to: [recipient], subject, html: htmlBody, text: textBody }),
    });
    return response.ok ? { ok: true } : { ok: false, errorCode: 'mail_provider_failed' };
  } catch {
    return { ok: false, errorCode: 'mail_provider_unavailable' };
  }
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get('origin') ?? undefined;
  if (request.method === 'OPTIONS') {
    if (!origin || (appUrl && origin !== new URL(appUrl).origin)) return new Response(null, { status: 403 });
    return new Response(null, { status: 204, headers: { ...corsHeaders, 'Access-Control-Allow-Origin': origin } });
  }
  if (request.method !== 'POST') return jsonResponse({ ok: false, error: 'method_not_allowed' }, 405, origin);
  if (!Deno.env.get('SUPABASE_URL') || !Deno.env.get('SUPABASE_ANON_KEY')) {
    return jsonResponse({ ok: false, error: 'server_not_configured' }, 503, origin);
  }
  if (origin && appUrl && origin !== new URL(appUrl).origin) return jsonResponse({ ok: false, error: 'origin_not_allowed' }, 403, origin);

  const authorization = request.headers.get('authorization');
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return jsonResponse({ ok: false, error: 'unauthorized' }, 401, origin);

  const caller = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: userError } = await caller.auth.getUser(token);
  if (userError || !userData.user) return jsonResponse({ ok: false, error: 'unauthorized' }, 401, origin);
  const { data: role, error: roleError } = await caller.rpc('current_access_role');
  if (roleError || role !== 'admin') return jsonResponse({ ok: false, error: 'forbidden' }, 403, origin);

  let payload: NotificationRequest;
  try {
    payload = await request.json() as NotificationRequest;
  } catch {
    return jsonResponse({ ok: false, error: 'invalid_request' }, 400, origin);
  }
  if (!payload || !['approve', 'reject', 'retry_notification', 'assign_area'].includes(payload.action)
      || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(payload.applicationId)) {
    return jsonResponse({ ok: false, error: 'invalid_request' }, 400, origin);
  }
  const reason = payload.reason?.trim() ?? '';
  if ((payload.action === 'reject' && !reason) || reason.length > 1000) {
    return jsonResponse({ ok: false, error: 'rejection_reason_required' }, 400, origin);
  }
  const assignedDistrict = payload.assignedDistrict?.trim() ?? '';
  const assignedUpazila = payload.assignedUpazila?.trim() ?? '';
  if ((payload.action === 'approve' || payload.action === 'assign_area')
      && (!assignedDistrict || assignedDistrict.length > 100 || assignedUpazila.length > 100)) {
    return jsonResponse({ ok: false, error: 'assigned_area_required' }, 400, origin);
  }

  if (payload.action === 'assign_area') {
    const { error } = await caller.rpc('set_officer_application_area', {
      p_application_id: payload.applicationId,
      p_assigned_district: assignedDistrict,
      p_assigned_upazila: assignedUpazila || null,
    });
    if (error) return jsonResponse({ ok: false, error: 'area_not_assigned' }, 409, origin);
    return jsonResponse({ ok: true, areaAssigned: true }, 200, origin);
  }

  if (payload.action !== 'retry_notification') {
    const { error } = await caller.rpc('decide_officer_application', {
      p_application_id: payload.applicationId,
      p_decision: payload.action === 'approve' ? 'approved' : 'rejected',
      p_rejection_reason: payload.action === 'reject' ? reason : null,
      p_assigned_district: payload.action === 'approve' ? assignedDistrict : null,
      p_assigned_upazila: payload.action === 'approve' ? assignedUpazila || null : null,
    });
    if (error) return jsonResponse({ ok: false, error: 'decision_not_applied' }, 409, origin);
  }

  const { data: application, error: beginError } = await caller.rpc('begin_officer_notification', {
    p_application_id: payload.applicationId,
  });
  if (beginError || !application || typeof application !== 'object') {
    return jsonResponse({ ok: false, error: 'notification_not_started' }, 409, origin);
  }

  const delivery = await sendDecisionEmail(application as Record<string, unknown>);
  const { data: notificationStatus, error: completeError } = await caller.rpc('complete_officer_notification', {
    p_application_id: payload.applicationId,
    p_success: delivery.ok,
    p_error_code: delivery.errorCode ?? null,
  });
  if (completeError) return jsonResponse({ ok: false, error: 'notification_state_not_saved' }, 500, origin);

  return jsonResponse({
    ok: true,
    applicationStatus: application.status,
    notificationStatus,
  }, 200, origin);
});
