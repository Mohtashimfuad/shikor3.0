import React, { useCallback, useEffect, useState } from 'react';
import { ArrowRight, ClipboardCheck, FileText, ShieldCheck } from 'lucide-react';
import type { Language, PageView } from '../../types';
import type { AuthProfile } from '../../context/AuthContext';
import {
  getAuthorizedVerifiedErosionRecords,
  getAuthorizedOfficerReviewClaims,
  getClaimReviewHistory,
  decideClaim,
  getOfficerClaimDossier,
  getOfficerEvidenceUrl,
  type ClaimEvidenceFile,
  type ClaimReviewEvent,
  type OfficerClaimDossier,
  type OfficerReviewClaim,
  type VerifiedErosionRecord,
} from '../../lib/erosionClaims';

interface OfficerDashboardViewProps {
  language: Language;
  currentUser: AuthProfile;
  setCurrentPage: (page: PageView) => void;
}

export const OfficerDashboardView: React.FC<OfficerDashboardViewProps> = ({ language, currentUser, setCurrentPage }) => {
  const [records, setRecords] = useState<VerifiedErosionRecord[]>([]);
  const [reviewClaims, setReviewClaims] = useState<OfficerReviewClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dossier, setDossier] = useState<OfficerClaimDossier | null>(null);
  const [evidence, setEvidence] = useState<ClaimEvidenceFile[]>([]);
  const [reviewEvents, setReviewEvents] = useState<ClaimReviewEvent[]>([]);
  const [decisionReason, setDecisionReason] = useState('');
  const [dossierMessage, setDossierMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [decisionBusy, setDecisionBusy] = useState(false);
  const [reviewLoadError, setReviewLoadError] = useState(false);
  const copy = (bn: string, en: string) => language === 'bn' ? bn : en;

  const loadRecords = useCallback(async () => {
    const [recordsResult, claimsResult] = await Promise.all([
      getAuthorizedVerifiedErosionRecords(),
      getAuthorizedOfficerReviewClaims(),
    ]);
    setRecords(recordsResult.records);
    setLoadError(recordsResult.error);
    setReviewClaims(claimsResult.claims);
    setReviewLoadError(claimsResult.error);
    setLoading(false);
  }, []);

  useEffect(() => { void loadRecords(); }, [loadRecords]);

  const openDossier = async (recordId: string) => {
    setSelectedId(recordId);
    setDossier(null);
    setEvidence([]);
    setReviewEvents([]);
    setDossierMessage(null);
    setBusyId(recordId);
    const [result, history] = await Promise.all([getOfficerClaimDossier(recordId), getClaimReviewHistory(recordId)]);
    setBusyId(null);
    if (result.error === 'not_authorized') {
      setDossierMessage(copy('এই দাবির নথি Admin-এর পর্যালোচনা অনুমতি ছাড়া খোলা যাবে না।', 'This dossier is unavailable until an Admin explicitly authorizes claim review.'));
      return;
    }
    if (result.error || !result.dossier) {
      setDossierMessage(copy('দাবির নথি লোড করা যায়নি। পরে আবার চেষ্টা করুন।', 'The claim dossier could not be loaded. Please try again.'));
      return;
    }
    setDossier(result.dossier);
    setEvidence(result.evidence);
    if (!history.error) setReviewEvents(history.events);
  };

  const saveDecision = async (decision: 'under_review' | 'additional_evidence_requested' | 'verified' | 'rejected') => {
    if (!selectedId) return;
    setDecisionBusy(true);
    const decisionError = await decideClaim(selectedId, decision, decisionReason);
    setDecisionBusy(false);
    if (decisionError) {
      setDossierMessage(copy('সিদ্ধান্ত সংরক্ষণ করা যায়নি। আপনার অনুমতি, দাবির অবস্থা ও সংযুক্ত প্রমাণ পরীক্ষা করুন।', decisionError));
      return;
    }
    setDecisionReason('');
    setDossierMessage(copy('পর্যালোচনার সিদ্ধান্ত ও ইতিহাস সংরক্ষিত হয়েছে।', 'The review decision and audit history were saved.'));
    await loadRecords();
    const history = await getClaimReviewHistory(selectedId);
    if (!history.error) setReviewEvents(history.events);
    const updated = await getOfficerClaimDossier(selectedId);
    if (!updated.error) setDossier(updated.dossier);
  };

  const reviewStatusLabel = (status: string) => ({
    submitted: copy('জমা হয়েছে', 'Submitted'),
    under_review: copy('পর্যালোচনাধীন', 'Under review'),
    additional_evidence_requested: copy('অতিরিক্ত প্রমাণ চাওয়া হয়েছে', 'Additional evidence requested'),
    verified: copy('পর্যালোচনায় যাচাইকৃত', 'Verified by review'),
    rejected: copy('প্রত্যাখ্যাত', 'Rejected'),
  }[status] ?? status);

  const openEvidence = async (file: ClaimEvidenceFile) => {
    const url = await getOfficerEvidenceUrl(file.storagePath);
    if (!url) {
      setDossierMessage(copy('প্রমাণ ফাইলের নিরাপদ লিংক তৈরি করা যায়নি।', 'A secure link for this evidence file could not be created.'));
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-[80vh] bg-[#F5F1E8] py-10 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="bg-gradient-to-r from-[#123B32] to-[#1a4a40] text-white rounded-2xl p-7 shadow-xl">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30"><ShieldCheck className="w-3.5 h-3.5" />{copy('অনুমোদিত Officer', 'Approved Officer')}</span>
          <h1 className="text-2xl font-bold font-serif-title mt-3">{copy('যাচাইকৃত ভাঙন রেকর্ড', 'Verified Erosion Records')}</h1>
          <p className="text-sm text-[#D8E8DF] mt-1">{copy('আপনার প্রশাসক-নির্ধারিত এলাকার যাচাইকৃত রেকর্ডই এখানে দেখানো হয়। দাবির পূর্ণ নথির জন্য Admin-এর পৃথক অনুমতি প্রয়োজন।', 'Only verified records in your admin-assigned area appear here. Full claim dossiers require separate Admin authorization.')}</p>
          <p className="text-xs text-white/70 mt-3">{currentUser.displayName}</p>
        </header>

        <section className="bg-white border border-[#D9E1DC] rounded-2xl p-6 shadow-sm">
          <h2 className="text-base font-bold text-[#123B32]">{copy('আপনার এলাকায় অনুমোদিত দাবি পর্যালোচনা', 'Authorized claim reviews in your area')}</h2>
          <p className="text-xs text-[#64748B] mt-1">{copy('শুধু Admin কর্তৃক আলাদাভাবে অনুমোদিত এবং আপনার নির্ধারিত এলাকার দাবিই এখানে আসে। আপনার সিদ্ধান্তে কারণ লিখতে হবে।', 'Only claims explicitly authorized by an Admin and within your assigned area appear here. Decisions require a reason.')}</p>
          {reviewLoadError ? <p role="alert" className="text-sm text-rose-700 mt-3">{copy('দাবি পর্যালোচনার তালিকা লোড করা যায়নি। প্রয়োজনীয় migration চালু আছে কি না দেখুন।', 'The claim review list could not be loaded. Check whether the required migration is deployed.')}</p> : reviewClaims.length === 0 ? <p className="text-sm text-[#64748B] mt-3">{copy('আপনার জন্য কোনো দাবি পর্যালোচনা অনুমোদিত হয়নি।', 'No claims have been authorized for your review.')}</p> : <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-4">{reviewClaims.map((claim) => <article key={claim.id} className="rounded-xl border border-[#D9E1DC] bg-[#F5F1E8] p-4"><div className="flex items-start justify-between gap-3"><div><strong className="text-xs font-mono text-[#123B32]">{claim.trackingId}</strong><p className="text-xs text-[#64748B] mt-1">{claim.mouzaName}, {claim.unionName}, {claim.upazila}, {claim.district} · {claim.erosionYear}</p></div><span className="px-2 py-1 rounded-full border border-amber-200 bg-amber-50 text-[10px] font-bold text-amber-800">{reviewStatusLabel(claim.reviewStatus)}</span></div><button onClick={() => void openDossier(claim.id)} disabled={busyId === claim.id} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#123B32] px-4 py-2 text-white text-xs font-bold disabled:opacity-60"><FileText className="w-3.5 h-3.5" />{busyId === claim.id ? copy('লোড হচ্ছে…', 'Loading…') : copy('দাবি ও প্রমাণ পর্যালোচনা', 'Review claim and evidence')}<ArrowRight className="w-3.5 h-3.5" /></button></article>)}</div>}
        </section>

        <section className="bg-white border border-[#D9E1DC] rounded-2xl p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <ClipboardCheck className="w-7 h-7 text-[#C6A66B] shrink-0" />
            <div className="flex-1">
              <h2 className="text-base font-bold text-[#123B32]">{copy('অনুমোদিত রেকর্ড তালিকা', 'Authorized records')}</h2>
              {loading ? <p className="text-sm text-[#64748B] mt-2">{copy('রেকর্ড লোড হচ্ছে…', 'Loading records…')}</p> : loadError ? (
                <p role="alert" className="text-sm text-rose-700 mt-2">{copy('রেকর্ড লোড করা যায়নি। আপনার অনুমতি ও সংযোগ যাচাই করুন।', 'Records could not be loaded. Check your access and connection.')}</p>
              ) : records.length === 0 ? (
                <p className="text-sm text-[#64748B] mt-2">{copy('এই নির্ধারিত এলাকায় কোনো যাচাইকৃত রেকর্ড নেই। এলাকা নির্ধারিত না থাকলে Admin-এর সাথে যোগাযোগ করুন।', 'There are no verified records in your assigned area. Contact the Admin if an area has not been assigned.')}</p>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-4">
                  {records.map((record) => (
                    <article key={record.id} className="rounded-xl border border-[#D9E1DC] bg-[#F5F1E8] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div><strong className="text-xs text-[#123B32] font-mono">{record.trackingId}</strong><p className="text-xs text-[#64748B] mt-1">{record.upazila}, {record.district}</p></div>
                        <span className="px-2 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-[10px] text-emerald-800 font-bold">{copy('যাচাইকৃত', 'Verified')}</span>
                      </div>
                      <dl className="grid grid-cols-2 gap-2 mt-3 text-[11px]">
                        <div><dt className="text-[#64748B]">{copy('মৌজা', 'Mouza')}</dt><dd className="font-semibold text-[#1F2933]">{record.mouzaName}</dd></div>
                        <div><dt className="text-[#64748B]">{copy('ভাঙনের বছর', 'Erosion year')}</dt><dd className="font-semibold text-[#1F2933]">{record.erosionYear}</dd></div>
                        <div><dt className="text-[#64748B]">{copy('ক্ষতিগ্রস্ত জমি', 'Affected area')}</dt><dd className="font-semibold text-[#1F2933]">{record.submergedAreaAcre} / {record.totalAreaAcre} acres</dd></div>
                        <div><dt className="text-[#64748B]">{copy('নদী অববাহিকা', 'River basin')}</dt><dd className="font-semibold text-[#1F2933]">{record.riverBasin}</dd></div>
                      </dl>
                      <button onClick={() => void openDossier(record.id)} disabled={busyId === record.id} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#123B32] px-4 py-2 text-white text-xs font-bold disabled:opacity-60">
                        <FileText className="w-3.5 h-3.5" />{busyId === record.id ? copy('লোড হচ্ছে…', 'Loading…') : copy('দাবির নথি খুলুন', 'Open claim dossier')}<ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {selectedId && (dossierMessage || dossier) && (
          <section className="bg-white border border-[#D9E1DC] rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-[#123B32]">{copy('দাবির নথি', 'Claim dossier')}</h2>
            {dossierMessage && <p role="status" className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">{dossierMessage}</p>}
            {dossier && <>
              <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div><dt className="text-[#64748B]">{copy('ট্র্যাকিং নম্বর', 'Tracking ID')}</dt><dd className="font-mono font-bold">{dossier.trackingId}</dd></div>
                <div><dt className="text-[#64748B]">{copy('জেলা ও উপজেলা', 'District and upazila')}</dt><dd className="font-semibold">{dossier.district}, {dossier.upazila}</dd></div>
                <div><dt className="text-[#64748B]">{copy('ইউনিয়ন ও মৌজা', 'Union and mouza')}</dt><dd className="font-semibold">{dossier.unionName}, {dossier.mouzaName}</dd></div>
                <div><dt className="text-[#64748B]">{copy('JL / খতিয়ান / দাগ', 'JL / Khatian / Dag')}</dt><dd className="font-semibold">{dossier.jlNumber} / {dossier.khatianNumber} / {dossier.dagNumber}</dd></div>
                <div><dt className="text-[#64748B]">{copy('জমির পরিমাণ', 'Land area')}</dt><dd className="font-semibold">{dossier.submergedAreaAcre} / {dossier.totalAreaAcre} acres</dd></div>
                <div><dt className="text-[#64748B]">{copy('নদী অববাহিকা', 'River basin')}</dt><dd className="font-semibold">{dossier.riverBasin}</dd></div>
                <div><dt className="text-[#64748B]">{copy('পর্যালোচনার অবস্থা', 'Review status')}</dt><dd className="font-semibold">{reviewStatusLabel(dossier.reviewStatus)}</dd></div>
              </dl>
              <div className="border-t border-[#D9E1DC] pt-4">
                <h3 className="text-sm font-bold text-[#123B32]">{copy('সংযুক্ত প্রমাণ', 'Attached evidence')}</h3>
                {evidence.length === 0 ? <p className="text-xs text-[#64748B] mt-2">{copy('এই নথিতে কোনো সংযুক্ত প্রমাণ নেই।', 'No evidence files are attached to this dossier.')}</p> : <ul className="mt-2 space-y-2">{evidence.map((file) => <li key={file.id} className="flex items-center justify-between gap-3 text-xs"><span className="text-[#64748B]">{file.mediaType ?? copy('প্রমাণ ফাইল', 'Evidence file')} · {copy('দাবিদারের দেয়া SHA-256', 'Claimant-supplied SHA-256')} {file.sha256.slice(0, 12)}…</span><button onClick={() => void openEvidence(file)} className="font-bold text-[#123B32] underline">{copy('নিরাপদে খুলুন', 'Open securely')}</button></li>)}</ul>}
              </div>
              <div className="border-t border-[#D9E1DC] pt-4">
                <h3 className="text-sm font-bold text-[#123B32]">{copy('পর্যালোচনা ইতিহাস', 'Review history')}</h3>
                {reviewEvents.length === 0 ? <p className="text-xs text-[#64748B] mt-2">{copy('এখনো কোনো সিদ্ধান্ত নথিভুক্ত হয়নি।', 'No decisions have been recorded yet.')}</p> : <ol className="mt-2 space-y-2">{reviewEvents.map((event) => <li key={event.id} className="rounded-lg bg-[#F5F1E8] p-3 text-xs"><strong>{reviewStatusLabel(event.newStatus)}</strong> · {event.reviewerName}<p className="text-[#64748B]">{new Date(event.createdAt).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-GB')}</p><p className="mt-1 whitespace-pre-wrap">{event.reason}</p></li>)}</ol>}
              </div>
              {!['verified', 'rejected'].includes(dossier.reviewStatus) && <div className="border-t border-[#D9E1DC] pt-4 space-y-2">
                <label className="block text-xs font-semibold text-[#123B32]">{copy('সিদ্ধান্তের কারণ (আবশ্যক)', 'Decision reason (required)')}<textarea value={decisionReason} onChange={(event) => setDecisionReason(event.target.value)} maxLength={2000} rows={3} className="mt-1 w-full rounded-lg border border-[#D9E1DC] p-3 text-sm font-normal" /></label>
                <div className="flex flex-wrap gap-2">{(['under_review', 'additional_evidence_requested', 'verified', 'rejected'] as const).map((decision) => <button key={decision} disabled={decisionBusy || !decisionReason.trim() || (decision === 'verified' && evidence.length === 0)} onClick={() => void saveDecision(decision)} className={`px-3 py-2 rounded-lg text-xs font-bold disabled:opacity-50 ${decision === 'rejected' ? 'bg-rose-700 text-white' : 'bg-[#123B32] text-white'}`}>{decisionBusy ? copy('সংরক্ষণ হচ্ছে…', 'Saving…') : reviewStatusLabel(decision)}</button>)}</div>
              </div>}
            </>}
          </section>
        )}

        <button onClick={() => setCurrentPage('officer-status')} className="px-5 py-2.5 rounded-lg bg-[#D8E8DF] text-[#123B32] text-xs font-bold">{copy('আবেদন ও সিদ্ধান্তের ইতিহাস', 'Application history')}</button>
      </div>
    </div>
  );
};
