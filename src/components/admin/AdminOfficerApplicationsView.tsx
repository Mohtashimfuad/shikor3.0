import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock3, FileText, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';
import type { Language } from '../../types';
import type { AuthProfile } from '../../context/AuthContext';
import { AdminClaimsReviewPanel } from './AdminClaimsReviewPanel';
import {
  decideOfficerApplication,
  getAdminOfficerApplicationEvents,
  getAdminOfficerApplications,
  getAppointmentLetterUrl,
  type OfficerApplicationEvent,
  type OfficerApplicationRecord,
} from '../../lib/officerApplications';

interface AdminOfficerApplicationsViewProps {
  language: Language;
  currentUser: AuthProfile;
}

export const AdminOfficerApplicationsView: React.FC<AdminOfficerApplicationsViewProps> = ({ language, currentUser }) => {
  const [applications, setApplications] = useState<OfficerApplicationRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [events, setEvents] = useState<OfficerApplicationEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [assignedDistrict, setAssignedDistrict] = useState('');
  const [assignedUpazila, setAssignedUpazila] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'officers' | 'claims'>('officers');
  const copy = (bn: string, en: string) => language === 'bn' ? bn : en;

  const refresh = useCallback(async () => {
    setLoading(true);
    const rows = await getAdminOfficerApplications();
    setApplications(rows);
    setSelectedId((current) => current && rows.some((row) => row.id === current) ? current : rows[0]?.id ?? null);
    setLoading(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const selected = useMemo(() => applications.find((row) => row.id === selectedId) ?? null, [applications, selectedId]);

  useEffect(() => {
    setAssignedDistrict(selected?.assignedDistrict ?? '');
    setAssignedUpazila(selected?.assignedUpazila ?? '');
  }, [selected?.id]);

  useEffect(() => {
    let active = true;
    if (!selected) {
      setEvents([]);
      return;
    }
    void getAdminOfficerApplicationEvents(selected.id).then((history) => {
      if (active) setEvents(history);
    });
    return () => { active = false; };
  }, [selected]);

  const reviewLetter = async () => {
    if (!selected) return;
    setErrorMessage(null);
    const tab = window.open('about:blank', '_blank');
    if (tab) tab.opener = null;
    const signedUrl = await getAppointmentLetterUrl(selected.appointmentLetterPath);
    if (!signedUrl) {
      tab?.close();
      setErrorMessage(copy('নিয়োগপত্র খোলা যায়নি। Admin অনুমতি ও Storage policy যাচাই করুন।', 'Unable to open the letter. Check Admin authorization and Storage policies.'));
      return;
    }
    if (tab) tab.location.href = signedUrl;
    else window.location.assign(signedUrl);
  };

  const decide = async (action: 'approve' | 'reject' | 'retry_notification' | 'assign_area') => {
    if (!selected) return;
    setBusy(true);
    setErrorMessage(null);
    setNotice(null);
    const result = await decideOfficerApplication(action, selected.id, {
      ...(action === 'reject' ? { reason: rejectionReason.trim() } : {}),
      ...(['approve', 'assign_area'].includes(action) ? {
        district: assignedDistrict.trim(),
        upazila: assignedUpazila.trim(),
      } : {}),
    });
    setBusy(false);
    if (!result.ok) {
      setErrorMessage(copy('সিদ্ধান্ত সংরক্ষণ করা যায়নি। Admin অনুমতি ও Edge Function সংযোগ যাচাই করুন।', 'The decision could not be saved. Check Admin authorization and the Edge Function deployment.'));
      return;
    }
    if (result.notificationStatus === 'failed') {
      setNotice(copy('সিদ্ধান্ত সংরক্ষিত হয়েছে, কিন্তু ইমেইল পাঠানো যায়নি। Email service ঠিক করে Retry করুন।', 'The decision is saved, but the email could not be sent. Configure the email service and retry.'));
    } else if (action === 'retry_notification') {
      setNotice(copy('ইমেইল পুনরায় পাঠানোর অনুরোধ সম্পন্ন হয়েছে।', 'The email retry has completed.'));
    } else if (action === 'assign_area') {
      setNotice(copy('Officer-এর অনুমোদিত এলাকা হালনাগাদ হয়েছে।', 'The Officer’s assigned area has been updated.'));
    } else {
      setNotice(copy('সিদ্ধান্ত সংরক্ষিত হয়েছে এবং আবেদনকারীর অ্যাকাউন্ট আপডেট হয়েছে।', 'The decision is saved and the applicant account has been updated.'));
    }
    setShowRejectForm(false);
    setRejectionReason('');
    await refresh();
  };

  const labelStatus = (status: OfficerApplicationRecord['status']) => {
    const labels = { draft: ['অসম্পূর্ণ', 'Draft'], pending: ['যাচাইাধীন', 'Pending'], approved: ['অনুমোদিত', 'Approved'], rejected: ['প্রত্যাখ্যাত', 'Rejected'] };
    const value = labels[status];
    return copy(value[0], value[1]);
  };

  const sortedApplications = [...applications].sort((a, b) => {
    const pendingFirst = Number(b.status === 'pending') - Number(a.status === 'pending');
    return pendingFirst || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="min-h-[85vh] bg-[#F5F1E8] py-8 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto space-y-5">
        <header className="bg-gradient-to-r from-[#123B32] to-[#1a4a40] text-white rounded-2xl p-6 sm:p-8 shadow-xl flex items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-200"><ShieldCheck className="w-4 h-4" />{copy('নিরাপদ Admin এলাকা', 'Protected Admin area')}</span>
            <h1 className="text-2xl font-bold font-serif-title mt-2">{copy('Officer আবেদন পর্যালোচনা', 'Officer application review')}</h1>
            <p className="text-xs text-[#D8E8DF] mt-1">{currentUser.email}</p>
          </div>
          <button onClick={() => void refresh()} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-xs font-bold"><RefreshCw className="w-3.5 h-3.5" />{copy('রিফ্রেশ', 'Refresh')}</button>
        </header>

        <div className="flex gap-2">
          <button onClick={() => setActiveTab('officers')} className={`px-4 py-2 rounded-lg text-xs font-bold ${activeTab === 'officers' ? 'bg-[#123B32] text-white' : 'bg-white border border-[#D9E1DC] text-[#123B32]'}`}>{copy('Officer আবেদন', 'Officer applications')}</button>
          <button onClick={() => setActiveTab('claims')} className={`px-4 py-2 rounded-lg text-xs font-bold ${activeTab === 'claims' ? 'bg-[#123B32] text-white' : 'bg-white border border-[#D9E1DC] text-[#123B32]'}`}>{copy('দাবির অনুমতি', 'Claim access')}</button>
        </div>

        {activeTab === 'claims' ? <AdminClaimsReviewPanel language={language} /> : <>
        {(errorMessage || notice) && <div role={errorMessage ? 'alert' : 'status'} className={`p-3 rounded-xl border text-xs ${errorMessage ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>{errorMessage ?? notice}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-5">
          <aside className="bg-white rounded-2xl border border-[#D9E1DC] shadow-sm overflow-hidden">
            <div className="p-4 border-b border-[#D9E1DC] flex justify-between items-center">
              <h2 className="text-sm font-bold text-[#123B32]">{copy('আবেদনসমূহ', 'Applications')}</h2>
              <span className="text-[10px] px-2 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">{applications.filter((app) => app.status === 'pending').length} {copy('অপেক্ষমাণ', 'pending')}</span>
            </div>
            {loading ? <div className="p-5 text-xs text-[#64748B]">{copy('লোড হচ্ছে…', 'Loading…')}</div> : sortedApplications.length === 0 ? <div className="p-6 text-center text-xs text-[#64748B]">{copy('কোনো Officer আবেদন পাওয়া যায়নি।', 'No Officer applications found.')}</div> : (
              <div className="max-h-[680px] overflow-y-auto divide-y divide-[#EEF1EF]">{sortedApplications.map((application) => (
                <button key={application.id} onClick={() => { setSelectedId(application.id); setErrorMessage(null); setNotice(null); }} className={`w-full text-left p-4 hover:bg-[#F5F1E8] ${application.id === selectedId ? 'bg-[#F5F1E8] border-l-4 border-[#123B32]' : ''}`}>
                  <div className="flex items-start justify-between gap-2"><strong className="text-xs text-[#123B32]">{application.applicantName}</strong><span className="text-[10px] text-[#64748B]">{labelStatus(application.status)}</span></div>
                  <span className="block text-[11px] text-[#64748B] mt-1">{application.designation} · {application.department}</span>
                  <span className="block text-[10px] text-[#94A3B8] mt-1">{new Date(application.createdAt).toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-GB')}</span>
                </button>
              ))}</div>
            )}
          </aside>

          <section className="bg-white rounded-2xl border border-[#D9E1DC] shadow-sm p-5 sm:p-7">
            {!selected ? <div className="min-h-64 flex flex-col items-center justify-center text-center text-[#64748B]"><FileText className="w-9 h-9 text-[#C6A66B] mb-3" /><p className="text-sm">{copy('পর্যালোচনার জন্য একটি আবেদন নির্বাচন করুন।', 'Select an application to review.')}</p></div> : (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-[#D9E1DC] pb-4">
                  <div><span className="text-[10px] uppercase tracking-wider text-[#64748B]">{copy('আবেদনকারী', 'Applicant')}</span><h2 className="text-xl font-bold text-[#123B32]">{selected.applicantName}</h2><p className="text-xs text-[#64748B] mt-1">{selected.applicantEmail} · {selected.applicantPhone}</p></div>
                  <span className="px-3 py-1.5 rounded-full bg-[#F5F1E8] border border-[#D9E1DC] text-xs font-bold text-[#123B32]">{labelStatus(selected.status)}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-[#F5F1E8]"><span className="block text-[#64748B]">{copy('বিভাগ / সরকারি অফিস', 'Department / government office')}</span><strong>{selected.department}</strong></div>
                  <div className="p-3 rounded-lg bg-[#F5F1E8]"><span className="block text-[#64748B]">{copy('পদবি', 'Designation')}</span><strong>{selected.designation}</strong></div>
                  <div className="p-3 rounded-lg bg-[#F5F1E8]"><span className="block text-[#64748B]">{copy('নিবন্ধন / কর্মচারী নম্বর', 'Registration / employee number')}</span><strong className="font-mono">{selected.employeeNumber}</strong></div>
                  <div className="p-3 rounded-lg bg-[#F5F1E8]"><span className="block text-[#64748B]">{copy('আবেদনকারীর প্রস্তাবিত এলাকা', 'Applicant-requested area')}</span><strong>{selected.upazila}, {selected.district}</strong></div>
                  <div className="p-3 rounded-lg bg-[#F5F1E8]"><span className="block text-[#64748B]">{copy('জমা দেওয়ার তারিখ', 'Submission date')}</span><strong>{selected.submittedAt ? new Date(selected.submittedAt).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-GB') : '—'}</strong></div>
                  <div className="p-3 rounded-lg bg-[#F5F1E8]"><span className="block text-[#64748B]">{copy('আবেদনের অবস্থা', 'Application status')}</span><strong>{labelStatus(selected.status)}</strong></div>
                </div>

                <div className="border border-[#D9E1DC] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2"><FileText className="w-5 h-5 text-[#C6A66B]" /><div><strong className="block text-xs text-[#123B32]">{copy('নিয়োগপত্র', 'Appointment letter')}</strong><span className="text-[10px] text-[#64748B]">{copy('ব্যক্তিগত নথি · অস্থায়ী নিরাপদ লিংক', 'Private document · short-lived secure link')}</span></div></div>
                  <button onClick={() => void reviewLetter()} className="px-4 py-2 rounded-lg bg-[#D8E8DF] text-[#123B32] text-xs font-bold">{copy('নথি পর্যালোচনা', 'Review document')}</button>
                </div>

                {selected.status === 'rejected' && selected.rejectionReason && <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900"><strong>{copy('প্রত্যাখ্যানের কারণ', 'Rejection reason')}</strong><p className="mt-1 whitespace-pre-wrap">{selected.rejectionReason}</p></div>}

                <div className="border-t border-[#D9E1DC] pt-4">
                  <div className="flex items-center justify-between gap-3 mb-3"><h3 className="text-sm font-bold text-[#123B32]">{copy('সিদ্ধান্তের ইতিহাস', 'Decision history')}</h3>{selected.status !== 'draft' && <span className="text-[10px] text-[#64748B]">{copy('ইমেইল', 'Email')}: {selected.notificationStatus} · {selected.notificationAttempts} {copy('চেষ্টা', 'attempts')}</span>}</div>
                  {events.length === 0 ? <p className="text-xs text-[#64748B]">{copy('এখনো সিদ্ধান্ত দেওয়া হয়নি।', 'No decision has been recorded.')}</p> : <ol className="space-y-3">{events.map((event) => <li key={event.id} className="flex gap-2 text-xs">{event.toStatus === 'approved' ? <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" /> : event.toStatus === 'rejected' ? <XCircle className="w-4 h-4 text-rose-700 shrink-0" /> : <Clock3 className="w-4 h-4 text-amber-700 shrink-0" />}<div><strong className="text-[#123B32]">{labelStatus(event.toStatus as OfficerApplicationRecord['status'])}</strong><p className="text-[#64748B]">{new Date(event.createdAt).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-GB')}</p>{event.reason && <p className="mt-1 text-rose-800 whitespace-pre-wrap">{event.reason}</p>}</div></li>)}</ol>}
                </div>

                {selected.status === 'pending' && (
                  <div className="pt-3 space-y-3">
                    <section className="rounded-xl border border-[#D9E1DC] bg-[#F5F1E8] p-4 space-y-3">
                      <div>
                        <h3 className="text-xs font-bold text-[#123B32]">{copy('প্রশাসক-নির্ধারিত কাজের এলাকা', 'Admin-assigned operating area')}</h3>
                        <p className="text-[11px] text-[#64748B] mt-1">{copy('আবেদনকারীর প্রস্তাব শুধু তথ্য। অনুমোদনের আগে আপনি জেলা ও ঐচ্ছিক উপজেলা নির্ধারণ করুন।', 'The applicant’s request is informational. Set the district and optional upazila before approval.')}</p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className="text-[11px] font-semibold text-[#1F2933]">{copy('নির্ধারিত জেলা *', 'Assigned district *')}
                          <input value={assignedDistrict} onChange={(event) => setAssignedDistrict(event.target.value)} maxLength={100} className="mt-1 w-full px-3 py-2 rounded-lg border border-[#D9E1DC] text-sm font-normal" />
                        </label>
                        <label className="text-[11px] font-semibold text-[#1F2933]">{copy('নির্ধারিত উপজেলা (ঐচ্ছিক)', 'Assigned upazila (optional)')}
                          <input value={assignedUpazila} onChange={(event) => setAssignedUpazila(event.target.value)} maxLength={100} className="mt-1 w-full px-3 py-2 rounded-lg border border-[#D9E1DC] text-sm font-normal" />
                        </label>
                      </div>
                    </section>
                    <div className="flex flex-col sm:flex-row gap-3">
                    <button disabled={busy || !assignedDistrict.trim()} onClick={() => void decide('approve')} className="px-5 py-2.5 rounded-lg bg-[#123B32] text-white text-xs font-bold disabled:opacity-60">{copy('এলাকা নির্ধারণ করে অনুমোদন', 'Assign area and approve')}</button>
                    <button disabled={busy} onClick={() => setShowRejectForm((visible) => !visible)} className="px-5 py-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold disabled:opacity-60">{copy('প্রত্যাখ্যান করুন', 'Reject application')}</button>
                    </div>
                  </div>
                )}
                {selected.status === 'approved' && (
                  <section className="rounded-xl border border-[#D9E1DC] bg-[#F5F1E8] p-4 space-y-3">
                    <div>
                      <h3 className="text-xs font-bold text-[#123B32]">{copy('অনুমোদিত Officer এলাকা', 'Assigned Officer area')}</h3>
                      <p className="text-[11px] text-[#64748B] mt-1">{selected.assignedDistrict ? `${selected.assignedUpazila ? `${selected.assignedUpazila}, ` : ''}${selected.assignedDistrict}` : copy('এখনো কোনো এলাকা নির্ধারণ করা হয়নি।', 'No area has been assigned yet.')}</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label className="text-[11px] font-semibold text-[#1F2933]">{copy('নির্ধারিত জেলা *', 'Assigned district *')}
                        <input value={assignedDistrict} onChange={(event) => setAssignedDistrict(event.target.value)} maxLength={100} className="mt-1 w-full px-3 py-2 rounded-lg border border-[#D9E1DC] text-sm font-normal" />
                      </label>
                      <label className="text-[11px] font-semibold text-[#1F2933]">{copy('নির্ধারিত উপজেলা (ঐচ্ছিক)', 'Assigned upazila (optional)')}
                        <input value={assignedUpazila} onChange={(event) => setAssignedUpazila(event.target.value)} maxLength={100} className="mt-1 w-full px-3 py-2 rounded-lg border border-[#D9E1DC] text-sm font-normal" />
                      </label>
                    </div>
                    <button disabled={busy || !assignedDistrict.trim() || (assignedDistrict.trim() === selected.assignedDistrict && assignedUpazila.trim() === (selected.assignedUpazila ?? ''))} onClick={() => void decide('assign_area')} className="px-5 py-2.5 rounded-lg bg-[#123B32] text-white text-xs font-bold disabled:opacity-50">{copy('এলাকা সংরক্ষণ করুন', 'Save assigned area')}</button>
                  </section>
                )}
                {showRejectForm && selected.status === 'pending' && <div className="space-y-2"><label className="block text-xs font-semibold text-[#1F2933]">{copy('প্রত্যাখ্যানের কারণ (আবশ্যক)', 'Rejection reason (required)')}</label><textarea value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} maxLength={1000} rows={4} className="w-full p-3 text-sm rounded-lg border border-[#D9E1DC] focus:border-[#123B32] outline-none" /><button disabled={busy || !rejectionReason.trim()} onClick={() => void decide('reject')} className="px-5 py-2.5 rounded-lg bg-rose-700 text-white text-xs font-bold disabled:opacity-50">{copy('প্রত্যাখ্যান সংরক্ষণ করুন', 'Save rejection')}</button></div>}
                {selected.status !== 'draft' && selected.notificationStatus !== 'sent' && <button disabled={busy} onClick={() => void decide('retry_notification')} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#D9E1DC] text-xs font-bold text-[#123B32] disabled:opacity-50"><RefreshCw className="w-3.5 h-3.5" />{copy('ইমেইল আবার পাঠান', 'Retry email notification')}</button>}
              </div>
            )}
          </section>
        </div>
        </>}
      </div>
    </div>
  );
};
