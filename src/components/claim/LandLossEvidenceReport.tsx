import React, { useCallback, useEffect, useState } from 'react';
import { Download, ExternalLink, FileText, LoaderCircle, Printer, X } from 'lucide-react';
import type { AuthProfile } from '../../context/AuthContext';
import type { Language } from '../../types';
import {
  getCitizenClaimEvidence, getCitizenEvidenceUrl, getClaimReviewHistory,
  type ClaimReviewEvent, type CitizenClaimEvidence, type CitizenClaimSummary,
} from '../../lib/erosionClaims';
import { getOwnerCorroborations, type CorroborationSubmission } from '../../lib/claimCorroborations';
import { buildLandLossReportModel, canGenerateCitizenReport, isReportImage, reportEvidenceFilename, reportValue, type LandLossReportModel } from '../../lib/landLossReport';

interface Props {
  language: Language;
  currentUser: AuthProfile;
  claim: CitizenClaimSummary;
  ownedClaimIds: readonly string[];
  onClose: () => void;
}

export const LandLossEvidenceReport: React.FC<Props> = ({ language, currentUser, claim, ownedClaimIds, onClose }) => {
  const copy = (bn: string, en: string) => language === 'bn' ? bn : en;
  const allowed = canGenerateCitizenReport(currentUser.role, claim.id, ownedClaimIds);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [model, setModel] = useState<LandLossReportModel | null>(null);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!allowed) { setError(true); setLoading(false); return; }
    setLoading(true); setError(false); setImageUrls({});
    try {
      const [evidenceResult, historyResult, corroborationResult] = await Promise.all([
        getCitizenClaimEvidence(claim.id), getClaimReviewHistory(claim.id), getOwnerCorroborations(claim.id),
      ]);
      if (evidenceResult.error || historyResult.error) {
        setModel(null); setError(true); setLoading(false); return;
      }
      setModel(buildLandLossReportModel(claim, evidenceResult.files, historyResult.events, corroborationResult));
      const images = evidenceResult.files.filter(isReportImage);
      const urlEntries = await Promise.all(images.map(async (file) => [file.id, await getCitizenEvidenceUrl(file.storagePath)] as const));
      setImageUrls(Object.fromEntries(urlEntries.filter((entry): entry is [string, string] => Boolean(entry[1]))));
      setLoading(false);
    } catch {
      setModel(null); setError(true); setLoading(false);
    }
  }, [allowed, claim]);

  useEffect(() => { void load(); }, [load]);

  const openEvidence = async (file: CitizenClaimEvidence) => {
    const url = await getCitizenEvidenceUrl(file.storagePath);
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };

  const formatDate = (date: string | null | undefined) => date
    ? new Date(date).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-GB')
    : copy('তথ্য নেই', 'Unavailable');
  const reviewStatus = (status: string) => ({
    submitted: copy('জমা হয়েছে', 'Submitted'),
    under_review: copy('পর্যালোচনাধীন', 'Under review'),
    additional_evidence_requested: copy('অতিরিক্ত প্রমাণ চাওয়া হয়েছে', 'Additional evidence requested'),
    verified: copy('Shikor পর্যালোচনায় যাচাইকৃত', 'Marked verified in Shikor review'),
    rejected: copy('প্রত্যাখ্যাত', 'Rejected'),
  }[status] ?? status);
  const corroborationStatus = (status: CorroborationSubmission['status']) => ({
    submitted: copy('পর্যালোচনাধীন', 'Submitted for review'),
    accepted: copy('পর্যালোচক গ্রহণ করেছেন', 'Accepted as corroboration by reviewer'),
    rejected: copy('পর্যালোচক গ্রহণ করেননি', 'Not accepted by reviewer'),
  }[status]);

  return <div className="land-loss-report-overlay no-print fixed inset-0 z-[80] overflow-y-auto bg-black/60 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label={copy('ভাঙন-ক্ষতির প্রতিবেদন', 'Land-loss evidence report')}>
    <style>{`@media print { @page { margin: 14mm; } body { background: #fff !important; } body * { visibility: hidden !important; } .land-loss-report-print, .land-loss-report-print * { visibility: visible !important; } .land-loss-report-print { position: absolute !important; inset: 0 !important; width: 100% !important; max-width: none !important; margin: 0 !important; padding: 0 !important; border: 0 !important; border-radius: 0 !important; box-shadow: none !important; background: #fff !important; } .land-loss-report-toolbar { display: none !important; } .report-evidence-image { max-width: 90mm !important; max-height: 75mm !important; object-fit: contain !important; break-inside: avoid; } .report-section { break-inside: avoid; } }`}</style>
    <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl bg-[#F5F1E8] shadow-2xl">
      <div className="land-loss-report-toolbar sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-b border-[#D9E1DC] bg-white px-4 py-3">
        <div><strong className="text-sm text-[#123B32]">{copy('ভাঙন-ক্ষতির প্রতিবেদন', 'Land-loss evidence report')}</strong><p className="text-[11px] text-[#64748B]">{copy('প্রিন্ট করুন অথবা Print dialog থেকে Save as PDF বেছে নিন।', 'Print this report or choose Save as PDF in the print dialog.')}</p></div>
        <div className="flex gap-2"><button disabled={loading || !model} onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg bg-[#123B32] px-3 py-2 text-xs font-bold text-white disabled:opacity-50"><Printer className="h-4 w-4" /><span className="hidden sm:inline">{copy('প্রিন্ট / PDF সংরক্ষণ', 'Print / Save PDF')}</span><Download className="h-4 w-4 sm:hidden" /></button><button onClick={onClose} className="rounded-lg border border-[#D9E1DC] p-2 text-[#123B32]" aria-label={copy('বন্ধ করুন', 'Close')}><X className="h-4 w-4" /></button></div>
      </div>

      {loading ? <div className="p-12 text-center text-sm text-[#64748B]"><LoaderCircle className="mx-auto mb-3 h-6 w-6 animate-spin" />{copy('প্রতিবেদনের তথ্য লোড হচ্ছে…', 'Loading report data…')}</div>
        : error || !model ? <div role="alert" className="p-8 text-center"><p className="text-sm text-rose-800">{!allowed ? copy('এই দাবির প্রতিবেদন দেখার অনুমতি নেই।', 'You are not authorized to view this claim report.') : copy('প্রতিবেদন লোড করা যায়নি। অনুমতি, সংযোগ এবং প্রয়োজনীয় ডাটাবেজ migration চালু আছে কি না পরীক্ষা করে আবার চেষ্টা করুন।', 'The report could not be loaded. Check access, connection, and whether the required database migrations are deployed, then retry.')}</p>{allowed && <button onClick={() => void load()} className="mt-3 rounded-lg bg-[#123B32] px-4 py-2 text-xs font-bold text-white">{copy('আবার চেষ্টা করুন', 'Retry')}</button>}</div>
        : <article className="land-loss-report-print mx-auto max-w-4xl bg-white p-5 sm:p-10 text-[#1F2933]">
          <header className="border-b-2 border-[#123B32] pb-5">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-serif-title text-2xl font-bold tracking-tight text-[#123B32]">Shikor</p><p className="text-xs text-[#64748B]">{copy('নাগরিক-প্রদত্ত ভাঙন-ক্ষতির নথি', 'Citizen-provided land-loss evidence record')}</p></div><div className="text-right text-[10px] text-[#64748B]"><p>{copy('প্রতিবেদন তৈরি', 'Report compiled')}</p><p>{formatDate(new Date().toISOString())}</p></div></div>
            <h1 className="mt-5 font-serif-title text-xl font-bold text-[#123B32]">{copy('ভাঙন-ক্ষতির প্রমাণ প্রতিবেদন', 'Land-Loss Evidence Report')}</h1>
            <p className="mt-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs leading-relaxed text-amber-950">{copy('এই প্রতিবেদনটি নাগরিকের দেয়া দাবি ও সংযুক্ত নথি সংকলন করে। এটি জমির মালিকানা, ভাঙন, GPS অবস্থান বা সরকারি স্বীকৃতির স্বাধীন যাচাই নয়।', 'This report compiles citizen-provided claim details and attached files. It is not independent verification of ownership, erosion, GPS location, or government recognition.')}</p>
          </header>

          <section className="report-section mt-6"><h2 className="border-b border-[#D9E1DC] pb-2 text-sm font-bold text-[#123B32]">{copy('দাবি ও জমির তথ্য · দাবিদারের দেয়া', 'Claim and land details · provided by claimant')}</h2><dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 text-xs">
            <ReportField label={copy('ট্র্যাকিং নম্বর', 'Tracking ID')} value={claim.trackingId} mono />
            <ReportField label={copy('দাবি জমার তারিখ', 'Claim submitted')} value={formatDate(claim.createdAt)} />
            <ReportField label={copy('রেকর্ডের অবস্থা', 'Record status')} value={reportValue(claim.status)} />
            <ReportField label={copy('Shikor পর্যালোচনার অবস্থা', 'Shikor review status')} value={reviewStatus(claim.reviewStatus)} />
            <ReportField label={copy('জেলা / উপজেলা', 'District / Upazila')} value={`${reportValue(claim.district)} / ${reportValue(claim.upazila)}`} />
            <ReportField label={copy('ইউনিয়ন / মৌজা', 'Union / Mouza')} value={`${reportValue(claim.unionName)} / ${reportValue(claim.mouzaName)}`} />
            <ReportField label={copy('JL নম্বর', 'JL number')} value={reportValue(claim.jlNumber)} />
            <ReportField label={copy('খতিয়ান / দাগ নম্বর', 'Khatian / Dag number')} value={`${reportValue(claim.khatianNumber)} / ${reportValue(claim.dagNumber)}`} />
            <ReportField label={copy('মোট জমি', 'Total land')} value={`${reportValue(claim.totalAreaAcre)} acres`} />
            <ReportField label={copy('দাবিকৃত নিমজ্জিত জমি', 'Claimed submerged area')} value={`${reportValue(claim.submergedAreaAcre)} acres`} />
            <ReportField label={copy('নদী / অববাহিকা', 'River / basin')} value={reportValue(claim.riverBasin)} />
            <ReportField label={copy('দাবিকৃত ভাঙনের বছর', 'Claimed erosion year')} value={reportValue(claim.erosionYear)} />
          </dl><p className="mt-3 text-[10px] text-[#64748B]">{copy('জমির পরিমাণ, ক্যাডাস্ট্রাল তথ্য ও অবস্থান দাবিদারের দেয়া; এই প্রতিবেদনে এগুলো স্বাধীনভাবে যাচাই করা হয়নি।', 'Areas, cadastral details, and location are claimant-provided and are not independently verified by this report.')}</p></section>

          <section className="report-section mt-6"><h2 className="border-b border-[#D9E1DC] pb-2 text-sm font-bold text-[#123B32]">{copy('সংযুক্ত প্রমাণ', 'Attached evidence')}</h2>
            {model.evidence.length === 0 ? <p className="mt-3 text-xs text-[#64748B]">{copy('এই দাবিতে কোনো ফাইল সংযুক্ত নেই।', 'No files are attached to this claim.')}</p> : <ol className="mt-3 space-y-4">{model.evidence.map((item) => <li key={item.id} className="break-inside-avoid rounded-lg border border-[#D9E1DC] p-3 text-xs">
              <div className="flex items-start justify-between gap-3"><div><strong className="break-all text-[#123B32]">{reportEvidenceFilename(item)}</strong><p className="mt-1 whitespace-pre-wrap">{item.description || copy('বিবরণ দেয়া হয়নি।', 'No description provided.')}</p></div><button className="no-print inline-flex shrink-0 items-center gap-1 font-bold text-[#123B32] underline" onClick={() => void openEvidence(item)}><ExternalLink className="h-3 w-3" />{copy('নিরাপদে খুলুন', 'Open securely')}</button></div>
              <p className="mt-2 text-[10px] text-[#64748B]">{reportValue(item.mediaType)} · {copy('আপলোডের সময়', 'Uploaded')}: {formatDate(item.uploadedAt)}</p>
              {item.latitude !== null && item.longitude !== null ? <p className="mt-1 text-[10px] text-amber-800">{copy('ছবির EXIF GPS metadata (যাচাইকৃত নয়)', 'Photo EXIF GPS metadata (unverified)')}: {item.latitude.toFixed(6)}, {item.longitude.toFixed(6)}</p> : <p className="mt-1 text-[10px] text-[#64748B]">{copy('GPS metadata নেই', 'GPS metadata unavailable')}</p>}
              {isReportImage(item) ? imageUrls[item.id] ? <img className="report-evidence-image mt-3 max-h-[360px] max-w-full rounded-md border border-[#D9E1DC] object-contain" src={imageUrls[item.id]} alt={item.description || reportEvidenceFilename(item)} /> : <p className="mt-2 text-[10px] text-amber-800">{copy('ছবির preview লোড হয়নি; নিরাপদ লিংক দিয়ে খোলা যাবে।', 'Image preview unavailable; open the file using the secure link.')}</p> : <p className="mt-2 inline-flex items-center gap-1 text-[10px] text-[#64748B]"><FileText className="h-3 w-3" />{copy('ফাইলটি প্রতিবেদন থেকে এম্বেড করা হয়নি।', 'This file is listed but not embedded in the report.')}</p>}
            </li>)}</ol>}
          </section>

          <section className="report-section mt-6"><h2 className="border-b border-[#D9E1DC] pb-2 text-sm font-bold text-[#123B32]">{copy('Shikor পর্যালোচনা ইতিহাস', 'Shikor review history')}</h2>
            <p className="mt-2 text-[10px] text-[#64748B]">{copy('নিচে অ্যাকাউন্টের অনুমতিতে দৃশ্যমান Shikor পর্যালোচনার রেকর্ড দেয়া হলো। এটি সরকারি বা স্বাধীন ভূমি যাচাই নয়।', 'The following Shikor review records are visible under this account’s access. They are not government or independent land verification.')}</p>
            {model.claimReviewHistory.length === 0 ? <p className="mt-3 text-xs text-[#64748B]">{copy('কোনো পর্যালোচনা সিদ্ধান্ত নথিভুক্ত নেই।', 'No review decisions are recorded.')}</p> : <ol className="mt-3 space-y-2">{model.claimReviewHistory.map((event) => <li key={event.id} className="break-inside-avoid rounded-lg bg-[#F5F1E8] p-3 text-xs"><strong>{reviewStatus(event.newStatus)}</strong> · {event.reviewerName}<p className="text-[10px] text-[#64748B]">{formatDate(event.createdAt)}</p><p className="mt-1 whitespace-pre-wrap">{event.reason}</p></li>)}</ol>}
          </section>

          <section className="report-section mt-6"><h2 className="border-b border-[#D9E1DC] pb-2 text-sm font-bold text-[#123B32]">{copy('সম্প্রদায়ের corroboration', 'Community corroboration')}</h2>
            <p className="mt-2 text-[10px] text-[#64748B]">{copy('সাক্ষী বা জমাদানকারীর বক্তব্য এবং সেগুলোর পর্যালোচনা আলাদা করে দেখানো হয়েছে। এগুলো মূল দাবিকে যাচাই করে না।', 'Witness or submitter statements and their review outcomes are shown separately. They do not verify the underlying claim.')}</p>
            {model.corroborationsUnavailable ? <p className="mt-3 rounded bg-amber-50 p-3 text-xs text-amber-900">{copy('এই অ্যাকাউন্টের জন্য সম্প্রদায়ের তথ্য লোড করা যায়নি; তাই প্রতিবেদনটি অসম্পূর্ণ হতে পারে।', 'Community submissions could not be loaded for this account; this report may be incomplete.')}</p> : model.corroborations.length === 0 ? <p className="mt-3 text-xs text-[#64748B]">{copy('কোনো সম্প্রদায়ের corroboration নথিভুক্ত নেই।', 'No community corroboration is recorded.')}</p> : <ol className="mt-3 space-y-2">{model.corroborations.map((item) => <li key={item.id} className="break-inside-avoid rounded-lg border border-[#D9E1DC] p-3 text-xs"><strong>{item.observationType === 'firsthand' ? copy('জমাদানকারীর প্রত্যক্ষ পর্যবেক্ষণ', 'Submitter reports firsthand observation') : copy('জমাদানকারী অন্যের কাছ থেকে শুনেছেন', 'Submitter reports information heard from others')}</strong><p className="mt-1 whitespace-pre-wrap">{item.description || copy('বিবরণ দেয়া হয়নি।', 'No description provided.')}</p><p className="mt-1 text-[10px] text-[#64748B]">{formatDate(item.createdAt)} · {corroborationStatus(item.status)}</p>{item.reviewedAt && <p className="text-[10px] text-[#64748B]">{copy('পর্যালোচনার তারিখ', 'Reviewed')}: {formatDate(item.reviewedAt)}</p>}{item.reviewReason && <p className="mt-1 whitespace-pre-wrap">{copy('পর্যালোচকের কারণ', 'Reviewer reason')}: {item.reviewReason}</p>}</li>)}</ol>}
          </section>
          <footer className="mt-8 border-t border-[#D9E1DC] pt-3 text-[10px] text-[#64748B]"><p>{copy('Shikor · নাগরিক-প্রদত্ত তথ্যের সংকলন · কোনো সরকারি দাখিল বা সনদ নয়', 'Shikor · Compilation of citizen-provided information · Not a government submission or certificate')}</p><p className="mt-1">{copy('দস্তাবেজটি নিজের রেকর্ডের জন্য তৈরি। তথ্যের সত্যতা ও আইনগত গ্রহণযোগ্যতা সংশ্লিষ্ট কর্তৃপক্ষের যাচাইসাপেক্ষ।', 'Prepared for personal records. Accuracy and legal acceptance remain subject to assessment by the relevant authority.')}</p></footer>
        </article>}
    </div>
  </div>;
};

const ReportField: React.FC<{ label: string; value: string; mono?: boolean }> = ({ label, value, mono }) => <div><dt className="text-[10px] text-[#64748B]">{label}</dt><dd className={`mt-0.5 break-words font-semibold ${mono ? 'font-mono' : ''}`}>{value}</dd></div>;
