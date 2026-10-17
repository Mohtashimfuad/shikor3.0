import React, { useCallback, useEffect, useState } from 'react';
import { ExternalLink, RefreshCw, ShieldCheck } from 'lucide-react';
import type { Language } from '../../types';
import { decideClaim, getClaimReviewHistory, getOfficerClaimDossier, getOfficerEvidenceUrl, type ClaimEvidenceFile, type ClaimReviewEvent, type OfficerClaimDossier } from '../../lib/erosionClaims';
import {
  getAdminClaimReviewRows,
  setClaimPublicVisibility,
  setClaimOfficerReviewAuthorization,
  type AdminClaimReviewRow,
} from '../../lib/adminClaims';

interface AdminClaimsReviewPanelProps {
  language: Language;
}

export const AdminClaimsReviewPanel: React.FC<AdminClaimsReviewPanelProps> = ({ language }) => {
  const [rows, setRows] = useState<AdminClaimReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dossier, setDossier] = useState<OfficerClaimDossier | null>(null);
  const [evidence, setEvidence] = useState<ClaimEvidenceFile[]>([]);
  const [events, setEvents] = useState<ClaimReviewEvent[]>([]);
  const [reason, setReason] = useState('');
  const [decisionBusy, setDecisionBusy] = useState(false);
  const copy = (bn: string, en: string) => language === 'bn' ? bn : en;

  const refresh = useCallback(async () => {
    setLoading(true);
    const result = await getAdminClaimReviewRows();
    setRows(result.rows);
    setError(result.error);
    setLoading(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const decide = async (row: AdminClaimReviewRow, authorized: boolean) => {
    setBusyId(row.id);
    setNotice(null);
    const ok = await setClaimOfficerReviewAuthorization(row.id, authorized);
    setBusyId(null);
    if (!ok) {
      setNotice(copy('পরিবর্তনটি সংরক্ষণ করা যায়নি। রেকর্ডের যাচাইকরণ ও Admin অনুমতি পরীক্ষা করুন।', 'The change could not be saved. Check the record’s verification state and Admin authorization.'));
      return;
    }
    setNotice(authorized
      ? copy('নির্বাচিত দাবির জন্য নির্ধারিত এলাকার Officer-দের পর্যালোচনা অনুমোদিত হয়েছে।', 'Area-assigned Officers are now authorized to review this claim dossier.')
      : copy('এই দাবির Officer পর্যালোচনা অনুমতি প্রত্যাহার করা হয়েছে।', 'Officer review authorization has been revoked for this claim.'));
    await refresh();
  };

  const setPublic = async (row: AdminClaimReviewRow, publiclyVisible: boolean) => {
    setBusyId(row.id);
    setNotice(null);
    const ok = await setClaimPublicVisibility(row.id, publiclyVisible);
    setBusyId(null);
    if (!ok) {
      setNotice(copy('জনসাধারণের দৃশ্যমানতা পরিবর্তন করা যায়নি। Admin অনুমতি ও যাচাইকরণ অবস্থা পরীক্ষা করুন।', 'Public visibility could not be changed. Check Admin authorization and verification state.'));
      return;
    }
    setNotice(publiclyVisible
      ? copy('নির্বাচিত রেকর্ডটি এখন ব্যক্তিগত পরিচয় ও খতিয়ান নম্বর ছাড়া প্রকাশিত।', 'The record is now public without personal or cadastral identifiers.')
      : copy('নির্বাচিত রেকর্ডটি জনসাধারণের তালিকা থেকে সরানো হয়েছে।', 'The record has been removed from the public list.'));
    await refresh();
  };

  const openReview = async (row: AdminClaimReviewRow) => {
    setSelectedId(row.id);
    setDossier(null);
    setEvidence([]);
    setEvents([]);
    setNotice(null);
    const [dossierResult, historyResult] = await Promise.all([
      getOfficerClaimDossier(row.id),
      getClaimReviewHistory(row.id),
    ]);
    if (dossierResult.error || !dossierResult.dossier || historyResult.error) {
      setNotice(copy('নথি বা পর্যালোচনা ইতিহাস লোড করা যায়নি।', 'The dossier or review history could not be loaded.'));
      return;
    }
    setDossier(dossierResult.dossier);
    setEvidence(dossierResult.evidence);
    setEvents(historyResult.events);
  };

  const recordDecision = async (decision: 'under_review' | 'additional_evidence_requested' | 'verified' | 'rejected') => {
    if (!selectedId) return;
    setDecisionBusy(true);
    setNotice(null);
    const errorText = await decideClaim(selectedId, decision, reason);
    setDecisionBusy(false);
    if (errorText) {
      setNotice(copy('সিদ্ধান্ত সংরক্ষণ করা যায়নি। দাবি অনুমতি, অবস্থা ও প্রমাণ পরীক্ষা করুন।', errorText));
      return;
    }
    setReason('');
    setNotice(copy('পর্যালোচনার সিদ্ধান্ত ও ইতিহাস সংরক্ষিত হয়েছে।', 'The review decision and audit history were saved.'));
    await refresh();
    const historyResult = await getClaimReviewHistory(selectedId);
    if (!historyResult.error) setEvents(historyResult.events);
  };

  const openEvidence = async (path: string) => {
    const url = await getOfficerEvidenceUrl(path);
    if (!url) {
      setNotice(copy('প্রমাণ ফাইলের নিরাপদ লিংক তৈরি করা যায়নি।', 'A secure evidence link could not be created.'));
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const statusLabel = (status: string) => ({
    submitted: copy('জমা হয়েছে', 'Submitted'),
    under_review: copy('পর্যালোচনাধীন', 'Under review'),
    additional_evidence_requested: copy('অতিরিক্ত প্রমাণ চাওয়া হয়েছে', 'Additional evidence requested'),
    verified: copy('পর্যালোচনায় যাচাইকৃত', 'Verified by review'),
    rejected: copy('প্রত্যাখ্যাত', 'Rejected'),
  }[status] ?? status);

  return (
    <section className="bg-white rounded-2xl border border-[#D9E1DC] shadow-sm overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-[#D9E1DC] flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-[#123B32]">{copy('দাবি ও Officer পর্যালোচনা অনুমতি', 'Claims and Officer review authorization')}</h2>
              <p className="text-[11px] text-[#64748B] mt-1">{copy('Admin হিসেবে নথি পর্যালোচনা ও সিদ্ধান্তের কারণ সংরক্ষণ করুন। Officer অনুমতি আলাদাভাবে, নির্ধারিত এলাকা অনুযায়ী কার্যকর হয়। Shikor-এর পর্যালোচনা Satellite verification বা সরকারি সিদ্ধান্ত নয়।', 'Review dossiers and record reasoned decisions as Admin. Officer authorization is separate and area-scoped. Shikor review is not satellite verification or a government decision.')}</p>
        </div>
        <button onClick={() => void refresh()} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#F5F1E8] text-[#123B32] text-xs font-bold shrink-0"><RefreshCw className="w-3.5 h-3.5" />{copy('রিফ্রেশ', 'Refresh')}</button>
      </div>
      {notice && <p role="status" className="mx-4 mt-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">{notice}</p>}
      {loading ? <p className="p-5 text-xs text-[#64748B]">{copy('দাবি লোড হচ্ছে…', 'Loading claims…')}</p> : error ? (
        <p role="alert" className="p-5 text-xs text-rose-700">{copy('দাবিগুলো লোড করা যায়নি। Admin access ও সংযোগ পরীক্ষা করুন।', 'Claims could not be loaded. Check Admin access and the connection.')}</p>
      ) : rows.length === 0 ? (
        <p className="p-5 text-xs text-[#64748B]">{copy('কোনো দাবি নেই।', 'No claims are available.')}</p>
      ) : (
        <ul className="divide-y divide-[#EEF1EF]">
          {rows.map((row) => (
            <li key={row.id} className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="text-xs text-[#123B32] font-mono">{row.trackingId}</strong>
                  <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${row.verified ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                    {row.verified ? copy('Satellite flag চালু', 'Satellite flag set') : copy('Satellite flag বন্ধ', 'Satellite flag unset')}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold">{statusLabel(row.reviewStatus)}</span>
                  {row.officerReviewAuthorized && <span className="px-2 py-0.5 rounded-full bg-sky-50 border border-sky-200 text-sky-800 text-[10px] font-bold">{copy('Officer পর্যালোচনা অনুমোদিত', 'Officer review authorized')}</span>}
                  {row.publiclyVisible && <span className="px-2 py-0.5 rounded-full bg-violet-50 border border-violet-200 text-violet-800 text-[10px] font-bold">{copy('জনসাধারণের জন্য প্রকাশিত', 'Publicly published')}</span>}
                </div>
                <p className="text-xs text-[#64748B] mt-1">{row.mouzaName}, {row.unionName}, {row.upazila}, {row.district} · {row.erosionYear}</p>
                <p className="text-[10px] text-[#94A3B8] mt-1">{new Date(row.createdAt).toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-GB')}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <ShieldCheck className="w-4 h-4 text-[#C6A66B]" />
                <button onClick={() => void openReview(row)} className="px-4 py-2 rounded-lg border border-[#D9E1DC] text-[#123B32] text-xs font-bold">{copy('নথি পর্যালোচনা', 'Review dossier')}</button>
                <button
                  disabled={busyId === row.id}
                  onClick={() => void decide(row, !row.officerReviewAuthorized)}
                  className="px-4 py-2 rounded-lg bg-[#123B32] text-white text-xs font-bold disabled:opacity-50"
                >
                  {busyId === row.id ? copy('সংরক্ষণ হচ্ছে…', 'Saving…') : row.officerReviewAuthorized ? copy('অনুমতি প্রত্যাহার', 'Revoke access') : copy('Officer-কে অনুমতি দিন', 'Authorize Officer review')}
                </button>
                <button
                  disabled={busyId === row.id || (!row.verified && !row.publiclyVisible)}
                  onClick={() => void setPublic(row, !row.publiclyVisible)}
                  className="px-4 py-2 rounded-lg border border-[#D9E1DC] text-[#123B32] text-xs font-bold disabled:opacity-50"
                >
                  {busyId === row.id ? copy('সংরক্ষণ হচ্ছে…', 'Saving…') : row.publiclyVisible ? copy('প্রকাশনা সরান', 'Unpublish') : copy('সর্বজনীনভাবে প্রকাশ করুন', 'Publish publicly')}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {selectedId && dossier && <section className="border-t border-[#D9E1DC] p-4 sm:p-5 space-y-4">
        <div><h3 className="text-sm font-bold text-[#123B32]">{copy('দাবির নথি', 'Claim dossier')} · <span className="font-mono">{dossier.trackingId}</span></h3><p className="mt-1 text-xs text-[#64748B]">{dossier.mouzaName}, {dossier.unionName}, {dossier.upazila}, {dossier.district} · {dossier.erosionYear} · {dossier.submergedAreaAcre}/{dossier.totalAreaAcre} acres</p><p className="mt-1 text-[11px] text-[#64748B]">{copy('JL / খতিয়ান / দাগ', 'JL / Khatian / Dag')}: {dossier.jlNumber} / {dossier.khatianNumber} / {dossier.dagNumber}</p></div>
        <div><h4 className="text-xs font-bold text-[#123B32]">{copy('ব্যক্তিগত সংযুক্ত প্রমাণ', 'Private attached evidence')}</h4>{evidence.length === 0 ? <p className="mt-1 text-xs text-[#64748B]">{copy('সংযুক্ত প্রমাণ নেই। এই অবস্থায় যাচাইকৃত সিদ্ধান্ত সংরক্ষণ করা যাবে না।', 'No evidence is attached. A verified decision cannot be recorded in this state.')}</p> : <ul className="mt-2 space-y-2">{evidence.map((file) => <li key={file.id} className="flex items-center justify-between gap-3 text-xs"><span className="text-[#64748B]">{file.mediaType ?? copy('প্রমাণ ফাইল', 'Evidence file')} · {copy('দাবিদারের দেয়া SHA-256', 'Claimant-supplied SHA-256')} {file.sha256.slice(0, 12)}…</span><button onClick={() => void openEvidence(file.storagePath)} className="inline-flex items-center gap-1 text-[#123B32] underline font-bold"><ExternalLink className="w-3 h-3" />{copy('নিরাপদে খুলুন', 'Open securely')}</button></li>)}</ul>}</div>
        <div><h4 className="text-xs font-bold text-[#123B32]">{copy('পর্যালোচনা ইতিহাস', 'Review history')}</h4>{events.length === 0 ? <p className="mt-1 text-xs text-[#64748B]">{copy('এখনো কোনো পর্যালোচনা নেই।', 'No review decisions yet.')}</p> : <ul className="mt-2 space-y-2">{events.map((event) => <li key={event.id} className="rounded-lg bg-[#F5F1E8] p-3 text-xs"><strong>{statusLabel(event.newStatus)}</strong> · {event.reviewerName} <span className="text-[#64748B]">({event.reviewerId.slice(0, 8)}…)</span><p className="text-[#64748B]">{new Date(event.createdAt).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-GB')}</p><p className="mt-1 whitespace-pre-wrap">{event.reason}</p></li>)}</ul>}</div>
        {!['verified', 'rejected'].includes(rows.find((row) => row.id === selectedId)?.reviewStatus ?? '') && <div className="space-y-2 border-t border-[#D9E1DC] pt-4"><label className="block text-xs font-semibold text-[#123B32]">{copy('সিদ্ধান্তের কারণ (আবশ্যক)', 'Decision reason (required)')}<textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={2000} rows={3} className="mt-1 w-full rounded-lg border border-[#D9E1DC] p-3 text-sm font-normal" /></label><div className="flex flex-wrap gap-2">{(['under_review', 'additional_evidence_requested', 'verified', 'rejected'] as const).map((decision) => <button key={decision} disabled={decisionBusy || !reason.trim() || (decision === 'verified' && evidence.length === 0)} onClick={() => void recordDecision(decision)} className={`px-3 py-2 rounded-lg text-xs font-bold disabled:opacity-50 ${decision === 'rejected' ? 'bg-rose-700 text-white' : 'bg-[#123B32] text-white'}`}>{decisionBusy ? copy('সংরক্ষণ হচ্ছে…', 'Saving…') : statusLabel(decision)}</button>)}</div></div>}
      </section>}
    </section>
  );
};
