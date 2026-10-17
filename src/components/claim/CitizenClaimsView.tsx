import React, { useCallback, useEffect, useState } from 'react';
import { ExternalLink, FileText, RefreshCw, ShieldCheck, Upload } from 'lucide-react';
import type { AuthProfile } from '../../context/AuthContext';
import type { Language } from '../../types';
import { addCitizenClaimEvidence, getCitizenClaimEvidence, getCitizenEvidenceUrl, getClaimReviewHistory, getMyCitizenClaims, submitCitizenClaim, type ClaimReviewEvent, type CitizenClaimEvidence, type CitizenClaimInput, type CitizenClaimSummary } from '../../lib/erosionClaims';

interface CitizenClaimsViewProps {
  language: Language;
  currentUser: AuthProfile;
}

const emptyForm: Omit<CitizenClaimInput, 'evidence'> = {
  district: '', upazila: '', unionName: '', mouzaName: '', jlNumber: '',
  khatianNumber: '', dagNumber: '', totalAreaAcre: 0, submergedAreaAcre: 0,
  erosionYear: new Date().getFullYear(), riverBasin: '',
};

export const CitizenClaimsView: React.FC<CitizenClaimsViewProps> = ({ language, currentUser }) => {
  const [form, setForm] = useState(emptyForm);
  const [files, setFiles] = useState<File[]>([]);
  const [claims, setClaims] = useState<CitizenClaimSummary[]>([]);
  const [expandedClaimId, setExpandedClaimId] = useState<string | null>(null);
  const [claimEvidence, setClaimEvidence] = useState<CitizenClaimEvidence[]>([]);
  const [reviewEvents, setReviewEvents] = useState<ClaimReviewEvent[]>([]);
  const [evidenceMessage, setEvidenceMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [claimsLoadError, setClaimsLoadError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const copy = (bn: string, en: string) => language === 'bn' ? bn : en;
  const refresh = useCallback(async () => {
    setLoading(true);
    const result = await getMyCitizenClaims();
    setClaims(result.claims);
    setClaimsLoadError(result.error);
    setLoading(false);
  }, [language]);

  useEffect(() => { void refresh(); }, [refresh]);

  const update = (key: keyof typeof form, value: string) => setForm((current) => ({
    ...current,
    [key]: ['totalAreaAcre', 'submergedAreaAcre', 'erosionYear'].includes(key) ? Number(value) : value,
  }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (!form.district.trim() || !form.upazila.trim() || !form.unionName.trim() || !form.mouzaName.trim() || !form.khatianNumber.trim() || !form.dagNumber.trim() || !form.riverBasin.trim()) {
      setError(copy('চিহ্নিত প্রয়োজনীয় তথ্য পূরণ করুন।', 'Complete all required fields.'));
      return;
    }
    if (form.totalAreaAcre <= 0 || form.submergedAreaAcre <= 0 || form.submergedAreaAcre > form.totalAreaAcre || form.erosionYear < 1900 || form.erosionYear > new Date().getFullYear()) {
      setError(copy('জমির পরিমাণ বা ভাঙনের বছর যাচাই করুন। নিমজ্জিত জমি মোট জমির বেশি হতে পারে না।', 'Check the area and erosion year. Submerged area cannot exceed total area.'));
      return;
    }
    setSubmitting(true);
    const result = await submitCitizenClaim({ ...form, evidence: files });
    setSubmitting(false);
    if (!result.claim) {
      setError(result.error ?? copy('দাবি জমা দেওয়া যায়নি।', 'The claim could not be submitted.'));
      await refresh();
      return;
    }
    if (result.error) setError(result.error);
    else setNotice(copy(`দাবি জমা হয়েছে। ট্র্যাকিং নম্বর: ${result.claim.trackingId}`, `Claim submitted. Tracking number: ${result.claim.trackingId}`));
    setForm(emptyForm);
    setFiles([]);
    await refresh();
  };

  const labelStatus = (claim: CitizenClaimSummary) => ({
    submitted: copy('জমা হয়েছে', 'Submitted'),
    under_review: copy('পর্যালোচনাধীন', 'Under review'),
    additional_evidence_requested: copy('অতিরিক্ত প্রমাণ চাওয়া হয়েছে', 'Additional evidence requested'),
    verified: copy('পর্যালোচনায় যাচাইকৃত', 'Verified by review'),
    rejected: copy('প্রত্যাখ্যাত', 'Rejected'),
  }[claim.reviewStatus] ?? claim.reviewStatus);
  const labelReviewEvent = (status: string) => ({
    under_review: copy('পর্যালোচনাধীন', 'Under review'),
    additional_evidence_requested: copy('অতিরিক্ত প্রমাণ চাওয়া হয়েছে', 'Additional evidence requested'),
    verified: copy('পর্যালোচনায় যাচাইকৃত', 'Verified by review'),
    rejected: copy('প্রত্যাখ্যাত', 'Rejected'),
  }[status] ?? status);

  const showEvidence = async (claimId: string) => {
    if (expandedClaimId === claimId) {
      setExpandedClaimId(null);
      return;
    }
    setExpandedClaimId(claimId);
    const [evidenceResult, historyResult] = await Promise.all([getCitizenClaimEvidence(claimId), getClaimReviewHistory(claimId)]);
    setClaimEvidence(evidenceResult.files);
    setReviewEvents(historyResult.events);
    if (evidenceResult.error || historyResult.error) setError(copy('দাবির নথি বা পর্যালোচনা ইতিহাস লোড করা যায়নি।', 'The claim dossier or review history could not be loaded.'));
  };

  const openEvidence = async (file: CitizenClaimEvidence) => {
    const url = await getCitizenEvidenceUrl(file.storagePath);
    if (!url) {
      setError(copy('নিরাপদ ফাইল লিংক তৈরি করা যায়নি।', 'A secure file link could not be created.'));
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const attachMoreEvidence = async (claimId: string, selectedFiles: File[]) => {
    if (selectedFiles.length === 0) return;
    setEvidenceMessage(copy('নথি আপলোড হচ্ছে…', 'Uploading documents…'));
    const result = await addCitizenClaimEvidence(claimId, selectedFiles);
    if (result) {
      setEvidenceMessage(result);
      return;
    }
    setEvidenceMessage(copy('নথি দাবির সাথে যুক্ত হয়েছে।', 'Documents were attached to the claim.'));
    const refreshed = await getCitizenClaimEvidence(claimId);
    setClaimEvidence(refreshed.files);
  };

  const textField = (key: keyof typeof form, labelBn: string, labelEn: string, required = true, type = 'text') => (
    <label className="block text-xs font-semibold text-[#1F2933]">{copy(labelBn, labelEn)}{required ? ' *' : ''}
      <input required={required} type={type} value={form[key]} onChange={(event) => update(key, event.target.value)} min={type === 'number' ? 0 : undefined} step={type === 'number' ? 'any' : undefined} className="mt-1 w-full px-3 py-2.5 rounded-lg border border-[#D9E1DC] bg-white text-sm font-normal focus:outline-none focus:border-[#123B32]" />
    </label>
  );

  return (
    <div className="min-h-[80vh] bg-[#F5F1E8] py-10 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto space-y-7">
        <header className="bg-gradient-to-r from-[#123B32] to-[#1a4a40] text-white rounded-2xl p-7 shadow-xl">
          <span className="inline-flex items-center gap-2 text-xs font-bold text-[#D8E8DF]"><ShieldCheck className="w-4 h-4" />{copy('ব্যক্তিগত নাগরিক ড্যাশবোর্ড', 'Private citizen dashboard')}</span>
          <h1 className="text-2xl font-bold font-serif-title mt-3">{copy('ভাঙন দাবি ও অগ্রগতি', 'Erosion claims and tracking')}</h1>
          <p className="text-sm text-[#D8E8DF] mt-1">{currentUser.displayName} · {copy('আপনার দাবিগুলো শুধু আপনার অ্যাকাউন্টে দেখা যায়।', 'Your claims are visible only to your account.')}</p>
        </header>

        <section className="bg-white rounded-2xl border border-[#D9E1DC] p-5 sm:p-7 shadow-sm">
          <div className="mb-5"><h2 className="text-base font-bold text-[#123B32]">{copy('নতুন ভাঙন দাবি জমা দিন', 'Submit a new erosion claim')}</h2><p className="text-xs text-[#64748B] mt-1">{copy('জমা দেওয়া মানে সরকারি যাচাই বা জমির অধিকার নিশ্চিত হওয়া নয়।', 'Submission does not mean government verification or confirmation of land rights.')}</p></div>
          <form onSubmit={(event) => void submit(event)} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {textField('district', 'জেলা', 'District')}{textField('upazila', 'উপজেলা', 'Upazila')}{textField('unionName', 'ইউনিয়ন', 'Union')}
              {textField('mouzaName', 'মৌজা', 'Mouza')}{textField('jlNumber', 'JL নম্বর', 'JL number', false)}{textField('khatianNumber', 'খতিয়ান নম্বর', 'Khatian number')}
              {textField('dagNumber', 'দাগ নম্বর', 'Dag number')}{textField('totalAreaAcre', 'মোট জমি (একর)', 'Total land (acres)', true, 'number')}{textField('submergedAreaAcre', 'নিমজ্জিত জমি (একর)', 'Submerged land (acres)', true, 'number')}
              {textField('erosionYear', 'ভাঙনের বছর', 'Erosion year', true, 'number')}{textField('riverBasin', 'নদী / অববাহিকা', 'River / basin')}
            </div>
            <label className="block text-xs font-semibold text-[#1F2933]">{copy('সহায়ক ছবি বা নথি (ঐচ্ছিক, সর্বোচ্চ ১০ MB করে)', 'Supporting photos or documents (optional, up to 10 MB each)')}
              <span className="mt-1 flex items-center gap-2 rounded-lg border border-dashed border-[#A8B8AF] bg-[#F5F1E8] px-3 py-3 text-xs text-[#64748B]"><Upload className="w-4 h-4" />{files.length ? files.map((file) => file.name).join(', ') : copy('PDF, JPEG, PNG বা WebP বেছে নিন', 'Choose PDF, JPEG, PNG, or WebP files')}
                <input className="sr-only" type="file" multiple accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => setFiles(Array.from(event.target.files ?? []))} />
              </span>
            </label>
            {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{error}</p>}
            {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">{notice}</p>}
            <button disabled={submitting} className="px-5 py-2.5 rounded-lg bg-[#123B32] text-white text-xs font-bold disabled:opacity-60">{submitting ? copy('জমা হচ্ছে…', 'Submitting…') : copy('দাবি জমা দিন', 'Submit claim')}</button>
          </form>
        </section>

        <section className="bg-white rounded-2xl border border-[#D9E1DC] shadow-sm overflow-hidden">
          <div className="p-5 border-b border-[#D9E1DC] flex items-center justify-between gap-3"><div><h2 className="text-base font-bold text-[#123B32]">{copy('আমার দাবি ও অবস্থা', 'My claims and status')}</h2><p className="text-xs text-[#64748B] mt-1">{copy('অবস্থা ডাটাবেজের বর্তমান তথ্য থেকে দেখানো হয়।', 'Status is read from the current database record.')}</p></div><button onClick={() => void refresh()} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#F5F1E8] text-[#123B32] text-xs font-bold"><RefreshCw className="w-3.5 h-3.5" />{copy('রিফ্রেশ', 'Refresh')}</button></div>
          {loading ? <p className="p-5 text-sm text-[#64748B]">{copy('দাবি লোড হচ্ছে…', 'Loading claims…')}</p> : claimsLoadError && claims.length === 0 ? <p role="alert" className="p-5 text-sm text-rose-700">{copy('আপনার দাবি লোড করা যায়নি। সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।', 'Your claims could not be loaded. Check your connection and try again.')}</p> : claims.length === 0 ? <p className="p-5 text-sm text-[#64748B]">{copy('এখনো কোনো দাবি জমা দেননি।', 'You have not submitted a claim yet.')}</p> : (
            <ul className="divide-y divide-[#EEF1EF]">
              {claims.map((claim) => (
                <li key={claim.id} className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <strong className="font-mono text-xs text-[#123B32]">{claim.trackingId}</strong>
                      <p className="mt-1 text-xs text-[#64748B]">{claim.mouzaName}, {claim.unionName}, {claim.upazila}, {claim.district} · {claim.erosionYear}</p>
                      <p className="mt-1 text-[11px] text-[#64748B]">{new Date(claim.createdAt).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-GB')} · {claim.submergedAreaAcre} / {claim.totalAreaAcre} acres</p>
                      {claim.reviewedAt && <p className="mt-1 text-[11px] text-[#64748B]">{copy('সিদ্ধান্তের সময়', 'Decision recorded')}: {new Date(claim.reviewedAt).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-GB')} · {claim.reviewReason}</p>}
                      {claim.isVerified && <p className="mt-1 text-[10px] text-sky-800">{copy('Satellite verification flag আলাদা; এটি Shikor পর্যালোচনা নয়।', 'Satellite verification flag is separate from Shikor review.')}</p>}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold ${claim.reviewStatus === 'verified' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : claim.reviewStatus === 'rejected' ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}><FileText className="w-3.5 h-3.5" />{labelStatus(claim)}</span>
                      <button onClick={() => void showEvidence(claim.id)} className="px-3 py-1.5 rounded-lg border border-[#D9E1DC] text-[#123B32] text-[11px] font-bold">{expandedClaimId === claim.id ? copy('নথি বন্ধ করুন', 'Hide dossier') : copy('দাবির নথি ও ইতিহাস', 'Dossier and history')}</button>
                    </div>
                  </div>
                  {expandedClaimId === claim.id && <div className="mt-4 rounded-lg bg-[#F5F1E8] p-4 space-y-4">
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h3 className="text-xs font-bold text-[#123B32]">{copy('নিজের সংযুক্ত নথি', 'Your attached documents')}</h3>
                        <label className="cursor-pointer rounded-lg bg-white border border-[#D9E1DC] px-3 py-2 text-[11px] font-bold text-[#123B32]">{copy('নথি যোগ করুন', 'Add documents')}<input className="sr-only" type="file" multiple accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => void attachMoreEvidence(claim.id, Array.from(event.target.files ?? []))} /></label>
                      </div>
                      {evidenceMessage && <p role="status" className="mt-2 text-xs text-[#64748B]">{evidenceMessage}</p>}
                      {claimEvidence.length === 0 ? <p className="mt-2 text-xs text-[#64748B]">{copy('এই দাবিতে কোনো নথি সংযুক্ত নেই।', 'No documents are attached to this claim.')}</p> : <ul className="mt-2 space-y-2">{claimEvidence.map((file) => <li key={file.id} className="flex items-center justify-between gap-3 text-xs"><span className="text-[#64748B]">{file.mediaType ?? copy('নথি', 'Document')} · {new Date(file.uploadedAt).toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-GB')}</span><button onClick={() => void openEvidence(file)} className="inline-flex items-center gap-1 font-bold text-[#123B32] underline"><ExternalLink className="w-3 h-3" />{copy('নিরাপদে খুলুন', 'Open securely')}</button></li>)}</ul>}
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-[#123B32]">{copy('পর্যালোচনা ইতিহাস', 'Review history')}</h3>
                      {reviewEvents.length === 0 ? <p className="mt-2 text-xs text-[#64748B]">{copy('এখনো কোনো পর্যালোচনা নথিভুক্ত হয়নি।', 'No review events have been recorded.')}</p> : <ol className="mt-2 space-y-2">{reviewEvents.map((event) => <li key={event.id} className="rounded-lg bg-white p-3 text-xs"><strong>{labelReviewEvent(event.newStatus)}</strong> · {event.reviewerName} <span className="text-[#64748B]">({event.reviewerId.slice(0, 8)}…)</span><p className="text-[#64748B]">{new Date(event.createdAt).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-GB')}</p><p className="mt-1 whitespace-pre-wrap">{event.reason}</p></li>)}</ol>}
                    </div>
                  </div>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};
