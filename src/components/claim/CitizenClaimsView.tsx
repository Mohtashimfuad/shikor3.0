import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ExternalLink, FileText, RefreshCw, ShieldCheck, Upload } from 'lucide-react';
import type { AuthProfile } from '../../context/AuthContext';
import type { Language } from '../../types';
import { addCitizenClaimEvidence, getCitizenClaimEvidence, getCitizenEvidenceUrl, getClaimReviewHistory, getMyCitizenClaims, submitCitizenClaim, type ClaimReviewEvent, type CitizenClaimEvidence, type CitizenClaimInput, type CitizenClaimSummary } from '../../lib/erosionClaims';
import { readEvidenceGpsCoordinates, type EvidenceDraft } from '../../lib/evidenceMetadata';
import { LandLossEvidenceReport } from './LandLossEvidenceReport';
import { ClaimDraftModal } from './ClaimDraftModal';
import { ClaimNotificationCentre } from './ClaimNotificationCentre';

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
  const [evidenceDrafts, setEvidenceDrafts] = useState<EvidenceDraft[]>([]);
  const [pendingUploads, setPendingUploads] = useState<Record<string, EvidenceDraft[]>>({});
  const [claims, setClaims] = useState<CitizenClaimSummary[]>([]);
  const [expandedClaimId, setExpandedClaimId] = useState<string | null>(null);
  const [claimEvidence, setClaimEvidence] = useState<CitizenClaimEvidence[]>([]);
  const [reviewEvents, setReviewEvents] = useState<ClaimReviewEvent[]>([]);
  const [evidenceMessage, setEvidenceMessage] = useState<string | null>(null);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [dossierLoading, setDossierLoading] = useState(false);
  const [dossierLoadError, setDossierLoadError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [claimsLoadError, setClaimsLoadError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reportClaimId, setReportClaimId] = useState<string | null>(null);
  const [applicationClaimId, setApplicationClaimId] = useState<string | null>(null);
  const [applicationEvidence, setApplicationEvidence] = useState<CitizenClaimEvidence[]>([]);
  const [applicationEvidenceLoading, setApplicationEvidenceLoading] = useState(false);
  const [applicationEvidenceError, setApplicationEvidenceError] = useState(false);
  const applicationEvidenceRequestRef = useRef<string | null>(null);
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

  const makeEvidenceDrafts = async (files: File[]) => Promise.all(files.map(async (file): Promise<EvidenceDraft> => {
    const gps = await readEvidenceGpsCoordinates(file);
    return { id: crypto.randomUUID(), file, description: '', latitude: gps?.latitude ?? null, longitude: gps?.longitude ?? null };
  }));

  const updateDraftDescription = (draftId: string, description: string, target: 'claim' | 'dossier') => {
    if (target === 'claim') {
      setEvidenceDrafts((current) => current.map((draft) => draft.id === draftId ? { ...draft, description } : draft));
      return;
    }
    if (!expandedClaimId) return;
    setPendingUploads((current) => ({
      ...current,
      [expandedClaimId]: (current[expandedClaimId] ?? []).map((draft) => draft.id === draftId ? { ...draft, description } : draft),
    }));
  };

  const loadDossier = async (claimId: string) => {
    setDossierLoading(true);
    setDossierLoadError(false);
    try {
      const [evidenceResult, historyResult] = await Promise.all([getCitizenClaimEvidence(claimId), getClaimReviewHistory(claimId)]);
      setClaimEvidence(evidenceResult.files);
      setReviewEvents(historyResult.events);
      const failed = evidenceResult.error || historyResult.error;
      setDossierLoadError(failed);
      if (failed) setError(copy('দাবির নথি বা পর্যালোচনা ইতিহাস লোড করা যায়নি। আবার চেষ্টা করুন।', 'The claim dossier or review history could not be loaded. Retry when the connection is available.'));
    } finally {
      setDossierLoading(false);
    }
  };

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
    if (evidenceDrafts.some((draft) => !draft.description.trim())) {
      setError(copy('প্রতিটি সংযুক্ত নথির সংক্ষিপ্ত বিবরণ লিখুন।', 'Add a short description for each attached file.'));
      return;
    }
    setSubmitting(true);
    const result = await submitCitizenClaim({ ...form, evidence: evidenceDrafts });
    setSubmitting(false);
    if (!result.claim) {
      setError(result.error ?? copy('দাবি জমা দেওয়া যায়নি।', 'The claim could not be submitted.'));
      await refresh();
      return;
    }
    if (result.error) setError(result.error);
    else setNotice(copy(`দাবি জমা হয়েছে। ট্র্যাকিং নম্বর: ${result.claim.trackingId}`, `Claim submitted. Tracking number: ${result.claim.trackingId}`));
    if (result.failedEvidence.length) {
      setPendingUploads((current) => ({ ...current, [result.claim!.id]: result.failedEvidence }));
      setExpandedClaimId(result.claim.id);
      setEvidenceMessage(result.error);
    }
    setForm(emptyForm);
    setEvidenceDrafts([]);
    await refresh();
    if (result.failedEvidence.length) await loadDossier(result.claim.id);
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
    setEvidenceMessage(null);
    setClaimEvidence([]);
    setReviewEvents([]);
    setError(null);
    await loadDossier(claimId);
  };

  const loadApplicationEvidence = async (claimId: string) => {
    if (!claims.some((claim) => claim.id === claimId)) return;
    applicationEvidenceRequestRef.current = claimId;
    setApplicationEvidenceLoading(true);
    setApplicationEvidenceError(false);
    try {
      const result = await getCitizenClaimEvidence(claimId);
      if (applicationEvidenceRequestRef.current !== claimId) return;
      setApplicationEvidence(result.files);
      setApplicationEvidenceError(result.error);
    } catch {
      if (applicationEvidenceRequestRef.current === claimId) setApplicationEvidenceError(true);
    } finally {
      if (applicationEvidenceRequestRef.current === claimId) setApplicationEvidenceLoading(false);
    }
  };

  const openApplicationAssistant = async (claimId: string) => {
    if (!claims.some((claim) => claim.id === claimId)) return;
    applicationEvidenceRequestRef.current = claimId;
    setApplicationClaimId(claimId);
    setApplicationEvidence([]);
    await loadApplicationEvidence(claimId);
  };

  const closeApplicationAssistant = () => {
    applicationEvidenceRequestRef.current = null;
    setApplicationClaimId(null);
    setApplicationEvidenceLoading(false);
  };

  const openEvidence = async (file: CitizenClaimEvidence) => {
    setError(null);
    const url = await getCitizenEvidenceUrl(file.storagePath);
    if (!url) {
      setError(copy('নিরাপদ ফাইল লিংক তৈরি করা যায়নি।', 'A secure file link could not be created.'));
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const attachMoreEvidence = async (claimId: string) => {
    const drafts = pendingUploads[claimId] ?? [];
    if (drafts.length === 0) return;
    if (drafts.some((draft) => !draft.description.trim())) {
      setEvidenceMessage(copy('প্রতিটি সংযুক্ত নথির সংক্ষিপ্ত বিবরণ লিখুন।', 'Add a short description for each selected file.'));
      return;
    }
    setUploadingEvidence(true);
    setEvidenceMessage(copy('নথি আপলোড হচ্ছে…', 'Uploading documents…'));
    const result = await addCitizenClaimEvidence(claimId, drafts);
    setUploadingEvidence(false);
    setPendingUploads((current) => ({ ...current, [claimId]: result.failedEvidence }));
    setEvidenceMessage(result.error ?? copy('নথি দাবির সাথে যুক্ত হয়েছে।', 'Documents were attached to the claim.'));
    if (!result.error) await loadDossier(claimId);
  };

  const textField = (key: keyof typeof form, labelBn: string, labelEn: string, required = true, type = 'text') => (
    <label className="block text-xs font-semibold text-[#1F2933]">{copy(labelBn, labelEn)}{required ? ' *' : ''}
      <input required={required} type={type} value={form[key]} onChange={(event) => update(key, event.target.value)} min={type === 'number' ? 0 : undefined} step={type === 'number' ? 'any' : undefined} className="mt-1 w-full px-3 py-2.5 rounded-lg border border-[#D9E1DC] bg-white text-sm font-normal focus:outline-none focus:border-[#123B32]" />
    </label>
  );

  const evidenceDraftEditor = (drafts: EvidenceDraft[], target: 'claim' | 'dossier') => drafts.map((draft) => (
    <div key={draft.id} className="rounded-lg border border-[#D9E1DC] bg-white p-3 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <span className="break-all text-xs font-semibold text-[#123B32]">{draft.file.name} <span className="font-normal text-[#64748B]">({(draft.file.size / (1024 * 1024)).toFixed(2)} MB)</span></span>
        <button type="button" onClick={() => {
          if (target === 'claim') setEvidenceDrafts((current) => current.filter((item) => item.id !== draft.id));
          else if (expandedClaimId) setPendingUploads((current) => ({ ...current, [expandedClaimId]: (current[expandedClaimId] ?? []).filter((item) => item.id !== draft.id) }));
        }} className="text-[11px] font-bold text-rose-700 underline">{copy('বাদ দিন', 'Remove')}</button>
      </div>
      <label className="block text-[11px] font-semibold text-[#1F2933]">{copy('নথির বিবরণ *', 'File description *')}
        <textarea required maxLength={500} value={draft.description} onChange={(event) => updateDraftDescription(draft.id, event.target.value, target)} rows={2} className="mt-1 w-full rounded-lg border border-[#D9E1DC] px-3 py-2 text-xs font-normal" placeholder={copy('এই ফাইলটি কী দেখায় তা লিখুন', 'Describe what this file contains')} />
      </label>
      <p className="text-[10px] text-[#64748B]">
        {draft.latitude !== null && draft.longitude !== null
          ? `${copy('ছবির EXIF-এ থাকা GPS (যাচাইকৃত নয়)', 'GPS embedded in photo EXIF (not verified)')}: ${draft.latitude.toFixed(6)}, ${draft.longitude.toFixed(6)}`
          : copy('ফাইলে পড়া যায় এমন GPS তথ্য নেই। অবস্থান যোগ করা হয়নি।', 'No readable embedded GPS was found. No location has been added.')}
      </p>
    </div>
  ));

  return (
    <div className="min-h-[80vh] bg-[#F5F1E8] py-10 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto space-y-7">
        <header className="bg-gradient-to-r from-[#123B32] to-[#1a4a40] text-white rounded-2xl p-7 shadow-xl">
          <span className="inline-flex items-center gap-2 text-xs font-bold text-[#D8E8DF]"><ShieldCheck className="w-4 h-4" />{copy('ব্যক্তিগত নাগরিক ড্যাশবোর্ড', 'Private citizen dashboard')}</span>
          <h1 className="text-2xl font-bold font-serif-title mt-3">{copy('ভাঙন দাবি ও অগ্রগতি', 'Erosion claims and tracking')}</h1>
          <p className="text-sm text-[#D8E8DF] mt-1">{currentUser.displayName} · {copy('আপনার দাবিগুলো শুধু আপনার অ্যাকাউন্টে দেখা যায়।', 'Your claims are visible only to your account.')}</p>
        </header>

        <ClaimNotificationCentre
          claims={claims}
          claimsLoading={loading}
          claimsError={claimsLoadError}
          language={language}
          onOpenClaim={(claimId) => { if (expandedClaimId !== claimId) void showEvidence(claimId); }}
          onRetryClaims={() => void refresh()}
        />

        <section className="bg-white rounded-2xl border border-[#D9E1DC] p-5 sm:p-7 shadow-sm">
          <div className="mb-5"><h2 className="text-base font-bold text-[#123B32]">{copy('নতুন ভাঙন দাবি জমা দিন', 'Submit a new erosion claim')}</h2><p className="text-xs text-[#64748B] mt-1">{copy('জমা দেওয়া মানে সরকারি যাচাই বা জমির অধিকার নিশ্চিত হওয়া নয়।', 'Submission does not mean government verification or confirmation of land rights.')}</p></div>
          <form onSubmit={(event) => void submit(event)} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {textField('district', 'জেলা', 'District')}{textField('upazila', 'উপজেলা', 'Upazila')}{textField('unionName', 'ইউনিয়ন', 'Union')}
              {textField('mouzaName', 'মৌজা', 'Mouza')}{textField('jlNumber', 'JL নম্বর', 'JL number', false)}{textField('khatianNumber', 'খতিয়ান নম্বর', 'Khatian number')}
              {textField('dagNumber', 'দাগ নম্বর', 'Dag number')}{textField('totalAreaAcre', 'মোট জমি (একর)', 'Total land (acres)', true, 'number')}{textField('submergedAreaAcre', 'নিমজ্জিত জমি (একর)', 'Submerged land (acres)', true, 'number')}
              {textField('erosionYear', 'ভাঙনের বছর', 'Erosion year', true, 'number')}{textField('riverBasin', 'নদী / অববাহিকা', 'River / basin')}
            </div>
            <label className="block text-xs font-semibold text-[#1F2933]">{copy('সহায়ক ছবি বা নথি (ঐচ্ছিক, প্রতিটি সর্বোচ্চ ১০ MB)', 'Supporting photos or documents (optional, up to 10 MB each)')}
              <span className="mt-1 flex items-center gap-2 rounded-lg border border-dashed border-[#A8B8AF] bg-[#F5F1E8] px-3 py-3 text-xs text-[#64748B]"><Upload className="w-4 h-4" />{copy('PDF, JPEG, PNG বা WebP বেছে নিন', 'Choose PDF, JPEG, PNG, or WebP files')}
                <input className="sr-only" type="file" multiple accept="application/pdf,image/jpeg,image/png,image/webp" onChange={async (event) => { const selected = Array.from(event.target.files ?? []); event.currentTarget.value = ''; const added = await makeEvidenceDrafts(selected); setEvidenceDrafts((current) => [...current, ...added]); }} />
              </span>
            </label>
            {evidenceDrafts.length > 0 && <div className="space-y-2">{evidenceDraftEditor(evidenceDrafts, 'claim')}</div>}
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
                      <button onClick={() => setReportClaimId(claim.id)} className="px-3 py-1.5 rounded-lg bg-[#123B32] text-white text-[11px] font-bold">{copy('প্রতিবেদন তৈরি', 'Generate report')}</button>
                      <button onClick={() => void openApplicationAssistant(claim.id)} className="px-3 py-1.5 rounded-lg border border-[#C6A66B] bg-[#F5F1E8] text-[#123B32] text-[11px] font-bold">{copy('আবেদনের খসড়া', 'Draft application')}</button>
                    </div>
                  </div>
                  {expandedClaimId === claim.id && <div className="mt-4 rounded-lg bg-[#F5F1E8] p-4 space-y-4">
                    {dossierLoadError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{copy('নথি লোড করা যায়নি।', 'Dossier data could not be loaded.')} <button type="button" disabled={dossierLoading} onClick={() => void loadDossier(claim.id)} className="font-bold underline disabled:opacity-60">{dossierLoading ? copy('লোড হচ্ছে…', 'Loading…') : copy('আবার চেষ্টা করুন', 'Retry')}</button></p>}
                    <section className="rounded-lg border border-[#D9E1DC] bg-white p-4">
                      <h3 className="text-xs font-bold text-[#123B32]">{copy('জমি ও অবস্থানের তথ্য', 'Land and location details')}</h3>
                      <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-2 text-xs">
                        <div><dt className="text-[#64748B]">{copy('প্রশাসনিক এলাকা', 'Administrative area')}</dt><dd className="font-semibold">{claim.district}, {claim.upazila}, {claim.unionName}</dd></div>
                        <div><dt className="text-[#64748B]">{copy('মৌজা / JL', 'Mouza / JL')}</dt><dd className="font-semibold">{claim.mouzaName} · {claim.jlNumber || copy('দেওয়া হয়নি', 'Not provided')}</dd></div>
                        <div><dt className="text-[#64748B]">{copy('খতিয়ান / দাগ', 'Khatian / Dag')}</dt><dd className="font-semibold">{claim.khatianNumber} / {claim.dagNumber}</dd></div>
                        <div><dt className="text-[#64748B]">{copy('মোট / নিমজ্জিত জমি', 'Total / submerged land')}</dt><dd className="font-semibold">{claim.totalAreaAcre} / {claim.submergedAreaAcre} acres</dd></div>
                        <div><dt className="text-[#64748B]">{copy('নদী / অববাহিকা', 'River / basin')}</dt><dd className="font-semibold">{claim.riverBasin}</dd></div>
                        <div><dt className="text-[#64748B]">{copy('GPS অবস্থান', 'GPS location')}</dt><dd className="font-semibold">{claimEvidence.some((file) => file.latitude !== null && file.longitude !== null) ? copy('কিছু ছবির EXIF থেকে পাওয়া যায়; দাবির অবস্থান যাচাই করা হয়নি।', 'Present in some photo EXIF; claim location is not verified.') : copy('দাবিতে বা নথিতে কোনো GPS তথ্য পাওয়া যায়নি।', 'No GPS coordinates are available for this claim.')}</dd></div>
                      </dl>
                    </section>
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h3 className="text-xs font-bold text-[#123B32]">{copy('নিজের সংযুক্ত নথি', 'Your attached documents')}</h3>
                        <label className="cursor-pointer rounded-lg bg-white border border-[#D9E1DC] px-3 py-2 text-[11px] font-bold text-[#123B32]">{copy('নথি যোগ করুন', 'Add documents')}<input className="sr-only" type="file" multiple accept="application/pdf,image/jpeg,image/png,image/webp" onChange={async (event) => { const selected = Array.from(event.target.files ?? []); event.currentTarget.value = ''; const added = await makeEvidenceDrafts(selected); setPendingUploads((current) => ({ ...current, [claim.id]: [...(current[claim.id] ?? []), ...added] })); setEvidenceMessage(null); }} /></label>
                      </div>
                      {evidenceMessage && <p role="status" className="mt-2 text-xs text-[#64748B]">{evidenceMessage}</p>}
                      {claimEvidence.length === 0 ? <p className="mt-2 text-xs text-[#64748B]">{copy('এই দাবিতে কোনো নথি সংযুক্ত নেই।', 'No documents are attached to this claim.')}</p> : <ul className="mt-2 space-y-2">{claimEvidence.map((file) => <li key={file.id} className="rounded-lg border border-[#D9E1DC] bg-white p-3 text-xs">
                        <div className="flex items-start justify-between gap-3"><strong className="text-[#123B32]">{file.description || copy('বিবরণ নেই', 'No description provided')}</strong><button onClick={() => void openEvidence(file)} className="inline-flex shrink-0 items-center gap-1 font-bold text-[#123B32] underline"><ExternalLink className="w-3 h-3" />{copy('নিরাপদে খুলুন', 'Open securely')}</button></div>
                        <p className="mt-1 text-[10px] text-[#64748B]">{file.mediaType ?? copy('নথি', 'Document')} · {copy('আপলোড', 'Uploaded')} {new Date(file.uploadedAt).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-GB')}</p>
                        {file.latitude !== null && file.longitude !== null ? <p className="mt-1 text-[10px] text-[#64748B]">{copy('EXIF GPS (যাচাইকৃত নয়)', 'EXIF GPS (not verified)')}: {file.latitude.toFixed(6)}, {file.longitude.toFixed(6)}</p> : <p className="mt-1 text-[10px] text-[#64748B]">{copy('GPS তথ্য নেই', 'GPS unavailable')}</p>}
                        <p className="mt-1 break-all font-mono text-[9px] text-[#64748B]">SHA-256 · {file.sha256}</p>
                      </li>)}</ul>}
                      {(pendingUploads[claim.id] ?? []).length > 0 && <div className="mt-3 space-y-2">
                        <p className="text-[11px] font-semibold text-amber-800">{copy('এই ফাইলগুলো এখনো সংযুক্ত হয়নি; সংক্ষিপ্ত বিবরণ দিয়ে আবার চেষ্টা করুন।', 'These files are not attached yet. Add descriptions and retry.')}</p>
                        {evidenceDraftEditor(pendingUploads[claim.id] ?? [], 'dossier')}
                        <button type="button" disabled={uploadingEvidence} onClick={() => void attachMoreEvidence(claim.id)} className="rounded-lg bg-[#123B32] px-4 py-2 text-[11px] font-bold text-white disabled:opacity-60">{uploadingEvidence ? copy('আপলোড হচ্ছে…', 'Uploading…') : copy('ব্যর্থ ফাইলগুলো আবার চেষ্টা করুন', 'Retry failed files')}</button>
                      </div>}
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
      {reportClaimId && claims.some((claim) => claim.id === reportClaimId) && <LandLossEvidenceReport
        language={language}
        currentUser={currentUser}
        claim={claims.find((claim) => claim.id === reportClaimId)!}
        ownedClaimIds={claims.map((claim) => claim.id)}
        onClose={() => setReportClaimId(null)}
      />}
      {applicationClaimId && claims.some((claim) => claim.id === applicationClaimId) && <ClaimDraftModal
        language={language}
        claim={claims.find((claim) => claim.id === applicationClaimId)!}
        applicant={currentUser}
        evidence={applicationEvidence}
        evidenceLoading={applicationEvidenceLoading}
        evidenceError={applicationEvidenceError}
        onRetryEvidence={() => void loadApplicationEvidence(applicationClaimId)}
        onClose={closeApplicationAssistant}
      />}
    </div>
  );
};
