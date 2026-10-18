import React, { useCallback, useEffect, useState } from 'react';
import { FileText, RefreshCw, ShieldCheck, Upload } from 'lucide-react';
import type { AuthProfile } from '../../context/AuthContext';
import type { Language } from '../../types';
import { getMyCitizenClaims, type CitizenClaimSummary } from '../../lib/erosionClaims';
import {
  findClaimReference, getCorroborationMedia, getCorroborationReviewQueue, getCorroborationSignedUrl,
  getMyCorroborations, getOwnerCorroborations, reviewCorroboration, submitCorroboration,
  uploadCorroborationEvidence, validateCorroborationFile, type ClaimReference, type CorroborationMedia,
  type CorroborationStatus, type CorroborationSubmission, type ObservationType,
} from '../../lib/claimCorroborations';

interface Props { language: Language; currentUser: AuthProfile; }
export const CommunityCorroborationView: React.FC<Props> = ({ language, currentUser }) => {
  const copy = (bn: string, en: string) => language === 'bn' ? bn : en;
  const [trackingId, setTrackingId] = useState('');
  const [reference, setReference] = useState<ClaimReference | null>(null);
  const [referenceError, setReferenceError] = useState(false);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [observation, setObservation] = useState<ObservationType>('firsthand');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileDescription, setFileDescription] = useState('');
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(true);
  const [myRows, setMyRows] = useState<CorroborationSubmission[]>([]);
  const [myError, setMyError] = useState(false);
  const [ownedClaims, setOwnedClaims] = useState<CitizenClaimSummary[]>([]);
  const [ownerRows, setOwnerRows] = useState<Record<string, CorroborationSubmission[]>>({});
  const [ownerError, setOwnerError] = useState(false);
  const [reviewRows, setReviewRows] = useState<CorroborationSubmission[]>([]);
  const [reviewError, setReviewError] = useState(false);
  const [reviewReason, setReviewReason] = useState<Record<string, string>>({});
  const [media, setMedia] = useState<Record<string, CorroborationMedia[]>>({});
  const [reviewBusy, setReviewBusy] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (currentUser.role === 'citizen') {
        const mine = await getMyCorroborations(); setMyRows(mine.rows); setMyError(mine.error);
        const mineMedia = await Promise.all(mine.rows.map(async (row) => [row.id, await getCorroborationMedia(row.id)] as const));
        const ownMediaMap: Record<string, CorroborationMedia[]> = {};
        mineMedia.forEach(([id, result]) => { ownMediaMap[id] = result.rows; });
        setMedia(ownMediaMap);
        const claims = await getMyCitizenClaims(); setOwnedClaims(claims.claims);
        const ownerResults = await Promise.all(claims.claims.map(async (claim) => [claim.id, await getOwnerCorroborations(claim.id)] as const));
        const mapped: Record<string, CorroborationSubmission[]> = {};
        let failed = claims.error;
        ownerResults.forEach(([id, result]) => { mapped[id] = result.rows; failed ||= result.error; });
        setOwnerRows(mapped); setOwnerError(failed);
      }
      if (currentUser.role === 'admin' || currentUser.role === 'officer') {
        const queue = await getCorroborationReviewQueue(); setReviewRows(queue.rows); setReviewError(queue.error);
        const pendingMedia = await Promise.all(queue.rows.map(async (row) => [row.id, await getCorroborationMedia(row.id)] as const));
        const mapped: Record<string, CorroborationMedia[]> = {};
        pendingMedia.forEach(([id, result]) => { mapped[id] = result.rows; }); setMedia(mapped);
      }
    } catch {
      if (currentUser.role === 'citizen') { setMyError(true); setOwnerError(true); }
      if (currentUser.role === 'admin' || currentUser.role === 'officer') setReviewError(true);
    } finally {
      setRefreshing(false);
    }
  }, [currentUser.role]);
  useEffect(() => { void refresh(); }, [refresh]);

  const lookup = async (event: React.FormEvent) => {
    event.preventDefault(); setReference(null); setReferenceError(false); setError(null); setNotice(null); setLookupBusy(true);
    const result = await findClaimReference(trackingId);
    setLookupBusy(false); setReference(result.reference); setReferenceError(result.error || !result.reference);
    if (result.reference) setSubmissionId(null);
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(null); setNotice(null);
    if (!reference) return;
    if (file) {
      const fileError = validateCorroborationFile(file);
      if (fileError) { setError(copy('PDF, JPEG, PNG বা WebP ফাইল দিন; সর্বোচ্চ ১০ MB।', fileError)); return; }
    }
    setBusy(true);
    const result = await submitCorroboration(reference.trackingId, observation, description);
    setBusy(false);
    if (result.error || !result.id) { setError(copy('জমা দেয়া যায়নি। তথ্য ও সংযোগ যাচাই করে আবার চেষ্টা করুন।', result.error ?? 'Submission failed. Check the information and retry.')); return; }
    setSubmissionId(result.id);
    setNotice(copy('তথ্য জমা হয়েছে। এটি মূল দাবির যাচাইকরণ নয়।', 'Information submitted. This does not verify the underlying claim.'));
    if (file) await uploadFile(result.id);
    setDescription('');
    await refresh();
  };
  const uploadFile = async (id = submissionId) => {
    if (!id || !file) return;
    setBusy(true); setError(null);
    const uploadError = await uploadCorroborationEvidence(currentUser.id, id, file, fileDescription);
    setBusy(false);
    if (uploadError) setError(copy('ফাইল আপলোড হয়নি। জমা সংরক্ষিত আছে; ফাইলটি আবার চেষ্টা করুন।', uploadError));
    else { setFile(null); setFileDescription(''); setNotice(copy('সহায়ক ফাইলটি ব্যক্তিগতভাবে যুক্ত হয়েছে।', 'Supporting file attached privately.')); await refresh(); }
  };
  const decide = async (row: CorroborationSubmission, status: Exclude<CorroborationStatus, 'submitted'>) => {
    const reason = reviewReason[row.id] ?? '';
    setReviewBusy(row.id); setError(null);
    const result = await reviewCorroboration(row.id, status, reason);
    setReviewBusy(null);
    if (result) { setError(copy('সিদ্ধান্ত সংরক্ষণ হয়নি। অনুমতি ও কারণ যাচাই করে আবার চেষ্টা করুন।', result)); return; }
    setReviewReason((current) => ({ ...current, [row.id]: '' }));
    setNotice(copy('সম্প্রদায়ের জমাটি পর্যালোচনা হয়েছে; মূল দাবির অবস্থা অপরিবর্তিত।', 'Corroboration reviewed; the underlying claim status is unchanged.'));
    await refresh();
  };
  const openFile = async (item: CorroborationMedia) => {
    const url = await getCorroborationSignedUrl(item.path);
    if (!url) { setError(copy('নিরাপদ ফাইল লিংক তৈরি করা যায়নি। আবার চেষ্টা করুন।', 'A secure file link could not be created. Retry.')); return; }
    window.open(url, '_blank', 'noopener,noreferrer');
  };
  const statusText = (status: CorroborationStatus) => ({
    submitted: copy('পর্যালোচনাধীন', 'Submitted for review'), accepted: copy('গ্রহণ করা হয়েছে', 'Accepted as corroboration'),
    rejected: copy('গ্রহণ করা হয়নি', 'Not accepted'),
  }[status]);
  const observationText = (type: ObservationType) => type === 'firsthand' ? copy('প্রত্যক্ষ পর্যবেক্ষণ', 'Firsthand observation') : copy('অন্যের কাছ থেকে শোনা', 'Heard from others');

  return <main className="min-h-[80vh] bg-[#F5F1E8] py-10 px-4 sm:px-6"><div className="max-w-5xl mx-auto space-y-6">
    <header className="bg-gradient-to-r from-[#123B32] to-[#1a4a40] text-white rounded-2xl p-7 shadow-xl">
      <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30"><ShieldCheck className="w-3.5 h-3.5" />{copy('ব্যক্তিগত সম্প্রদায়ের তথ্য', 'Private community information')}</span>
      <h1 className="text-2xl font-bold font-serif-title mt-3">{copy('দাবির সাথে সম্প্রদায়ের তথ্য যুক্ত করুন', 'Add community information to a claim')}</h1>
      <p className="text-sm text-[#D8E8DF] mt-2">{copy('দাবির ব্যক্তিগত নথি এখানে প্রকাশ করা হয় না। সাক্ষ্য দাবি যাচাই করে না এবং আইনগত প্রমাণের নিশ্চয়তা দেয় না।', 'Private claim documents are not shown here. A corroboration submission does not verify a claim or guarantee legal validity.')}</p>
    </header>
    {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error} <button onClick={() => file && submissionId ? void uploadFile() : void refresh()} className="underline font-bold">{copy('আবার চেষ্টা করুন', 'Retry')}</button></p>}
    {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{notice}</p>}

    {currentUser.role === 'citizen' && <section className="bg-white border border-[#D9E1DC] rounded-2xl p-6 shadow-sm space-y-4">
      <h2 className="text-lg font-bold text-[#123B32]">{copy('তথ্য জমা দিন', 'Submit information')}</h2>
      <form onSubmit={lookup} className="flex flex-col sm:flex-row gap-2"><label className="flex-1 text-xs font-semibold">{copy('দাবির ট্র্যাকিং নম্বর', 'Claim tracking ID')}<input required value={trackingId} onChange={(e) => { setTrackingId(e.target.value); setReference(null); }} className="mt-1 w-full rounded-lg border border-[#D9E1DC] p-3 text-sm" placeholder="SHK-…" /></label><button disabled={lookupBusy || trackingId.trim().length < 6} className="self-end rounded-lg bg-[#D8E8DF] px-4 py-3 text-sm font-bold text-[#123B32] disabled:opacity-50">{lookupBusy ? copy('খুঁজছে…', 'Looking…') : copy('দাবি খুঁজুন', 'Find claim')}</button></form>
      {referenceError && <p role="alert" className="text-sm text-rose-700">{copy('দাবি পাওয়া যায়নি বা লোড করা যায়নি। ট্র্যাকিং নম্বর পরীক্ষা করে আবার চেষ্টা করুন।', 'Claim not found or could not be loaded. Check the tracking ID and retry.')}</p>}
      {reference && <div className="rounded-lg border border-[#D9E1DC] bg-[#F5F1E8] p-3 text-xs"><strong className="font-mono">{reference.trackingId}</strong><p className="mt-1 text-[#64748B]">{copy('ট্র্যাকিং নম্বরটি পাওয়া গেছে। দাবির মালিকের নাম, জমির অবস্থান বা নথি প্রকাশ করা হয় না।', 'Tracking ID found. The claimant name, land location, and documents are not revealed.')}</p></div>}
      {reference && !submissionId && <form onSubmit={submit} className="space-y-4 border-t border-[#D9E1DC] pt-4">
        <fieldset><legend className="text-xs font-semibold text-[#123B32]">{copy('আপনি কীভাবে এই তথ্য জানেন?', 'How do you know this information?')}</legend><div className="mt-2 flex flex-col sm:flex-row gap-3 text-sm"><label className="flex gap-2 items-center"><input type="radio" checked={observation === 'firsthand'} onChange={() => setObservation('firsthand')} />{observationText('firsthand')}</label><label className="flex gap-2 items-center"><input type="radio" checked={observation === 'heard_from_others'} onChange={() => setObservation('heard_from_others')} />{observationText('heard_from_others')}</label></div></fieldset>
        <label className="block text-xs font-semibold text-[#123B32]">{copy('বিবরণ (ঐচ্ছিক)', 'Description (optional)')}<textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} rows={4} className="mt-1 w-full rounded-lg border border-[#D9E1DC] p-3 text-sm font-normal" /></label>
        <label className="block text-xs font-semibold text-[#123B32]">{copy('সহায়ক ফাইল (ঐচ্ছিক)', 'Supporting file (optional)')}<input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="mt-1 block w-full text-sm" /><span className="block mt-1 text-[11px] text-[#64748B]">{copy('PDF/JPEG/PNG/WebP, সর্বোচ্চ ১০ MB। শুধু আপনি ও অনুমোদিত পর্যালোচক ফাইলটি খুলতে পারবেন।', 'PDF/JPEG/PNG/WebP, up to 10 MB. Only you and authorized reviewers can open it.')}</span></label>
        {file && <label className="block text-xs font-semibold">{copy('ফাইলের বিবরণ (ঐচ্ছিক)', 'File description (optional)')}<input value={fileDescription} onChange={(e) => setFileDescription(e.target.value)} maxLength={500} className="mt-1 w-full rounded-lg border border-[#D9E1DC] p-3 text-sm font-normal" /></label>}
        <button disabled={busy} className="rounded-lg bg-[#123B32] px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{busy ? copy('জমা হচ্ছে…', 'Submitting…') : copy('তথ্য জমা দিন', 'Submit information')}</button>
      </form>}
      {reference && submissionId && file && <button onClick={() => void uploadFile()} disabled={busy} className="rounded-lg bg-[#123B32] px-4 py-2 text-xs font-bold text-white disabled:opacity-50"><Upload className="inline w-3.5 h-3.5 mr-2" />{copy('ফাইল আপলোড আবার চেষ্টা করুন', 'Retry file upload')}</button>}
    </section>}

    {(currentUser.role === 'admin' || currentUser.role === 'officer') && <section className="bg-white border border-[#D9E1DC] rounded-2xl p-6 shadow-sm space-y-4"><div><h2 className="text-base font-bold text-[#123B32]">{copy('সম্প্রদায়ের তথ্য পর্যালোচনা', 'Review community submissions')}</h2><p className="mt-1 text-xs text-[#64748B]">{copy('এখানে সাক্ষ্য গ্রহণ বা প্রত্যাখ্যানের সিদ্ধান্ত মূল দাবির অবস্থা পরিবর্তন করে না।', 'Accepting or rejecting a submission here does not change the underlying claim status.')}</p></div>{refreshing ? <p role="status" className="text-sm text-[#64748B]">{copy('পর্যালোচনার তালিকা লোড হচ্ছে…', 'Loading review queue…')}</p> : reviewError ? <p role="alert" className="text-sm text-rose-700">{copy('পর্যালোচনার তালিকা লোড হয়নি।', 'The review queue could not be loaded.')} <button onClick={() => void refresh()} className="ml-2 font-bold underline">{copy('আবার চেষ্টা করুন', 'Retry')}</button></p> : reviewRows.length === 0 ? <p className="text-sm text-[#64748B]">{copy('পর্যালোচনার জন্য কোনো জমা নেই।', 'There are no submissions to review.')}</p> : <ul className="space-y-3">{reviewRows.map((row) => <li key={row.id} className="rounded-xl border border-[#D9E1DC] bg-[#F5F1E8]/60 p-4"><div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3"><div><strong className="font-mono text-xs text-[#123B32]">{row.trackingId}</strong><p className="mt-1 text-xs text-[#64748B]">{row.mouzaName}, {row.unionName}, {row.upazila}, {row.district}</p><p className="mt-1 text-[10px] text-[#64748B]">{observationText(row.observationType)} · {statusText(row.status)} · {new Date(row.createdAt).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-GB')}</p></div>{row.status !== 'submitted' && <span className="text-[10px] font-bold text-[#64748B]">{copy('পর্যালোচনা সম্পন্ন', 'Review complete')}</span>}</div><p className="mt-3 whitespace-pre-wrap text-sm text-[#1F2933]">{row.description || copy('বিবরণ দেয়া হয়নি।', 'No description provided.')}</p>{(media[row.id] ?? []).map((item) => <button key={item.id} onClick={() => void openFile(item)} className="mt-2 mr-2 inline-flex items-center gap-1 text-xs font-bold text-[#123B32] underline"><FileText className="w-3.5 h-3.5" />{item.description || item.type}</button>)}{row.status === 'submitted' ? <div className="mt-4 border-t border-[#D9E1DC] pt-3 space-y-2"><label className="block text-xs font-semibold text-[#123B32]">{copy('পর্যালোচনার কারণ (আবশ্যক)', 'Review reason (required)')}<textarea value={reviewReason[row.id] ?? ''} onChange={(event) => setReviewReason((state) => ({ ...state, [row.id]: event.target.value }))} maxLength={2000} rows={2} className="mt-1 w-full rounded-lg border border-[#D9E1DC] bg-white p-3 text-sm font-normal" /></label><div className="flex flex-wrap gap-2">{(['accepted', 'rejected'] as const).map((decision) => <button key={decision} disabled={reviewBusy === row.id || !(reviewReason[row.id] ?? '').trim()} onClick={() => void decide(row, decision)} className={`rounded-lg px-3 py-2 text-xs font-bold text-white disabled:opacity-50 ${decision === 'rejected' ? 'bg-rose-700' : 'bg-[#123B32]'}`}>{reviewBusy === row.id ? copy('সংরক্ষণ হচ্ছে…', 'Saving…') : statusText(decision)}</button>)}</div></div> : row.reviewReason && <p className="mt-3 text-xs text-[#64748B]">{copy('পর্যালোচনার কারণ', 'Review reason')}: {row.reviewReason}</p>}</li>)}</ul>}</section>}

    {currentUser.role === 'citizen' && <section className="bg-white border border-[#D9E1DC] rounded-2xl p-6 shadow-sm"><h2 className="text-base font-bold text-[#123B32]">{copy('আপনার জমা', 'Your submissions')}</h2>{refreshing ? <p role="status" className="mt-3 text-sm text-[#64748B]">{copy('জমার অবস্থা লোড হচ্ছে…', 'Loading submission status…')}</p> : myError ? <p role="alert" className="mt-3 text-sm text-rose-700">{copy('জমার অবস্থা লোড হয়নি।', 'Submissions could not be loaded.')} <button onClick={() => void refresh()} className="ml-2 font-bold underline">{copy('আবার চেষ্টা করুন', 'Retry')}</button></p> : myRows.length === 0 ? <p className="mt-3 text-sm text-[#64748B]">{copy('এখনো কোনো জমা নেই।', 'No submissions yet.')}</p> : <ul className="mt-3 space-y-2">{myRows.map((row) => <li key={row.id} className="rounded-lg border border-[#D9E1DC] p-3 text-sm"><strong className="font-mono">{row.trackingId}</strong> · {observationText(row.observationType)} · {statusText(row.status)}<p className="text-xs text-[#64748B]">{row.reviewReason ?? new Date(row.createdAt).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-GB')}</p>{(media[row.id] ?? []).map((item) => <button key={item.id} onClick={() => void openFile(item)} className="mt-2 mr-2 inline-flex items-center gap-1 text-xs font-bold underline"><FileText className="w-3.5 h-3.5" />{item.description || item.type}</button>)}</li>)}</ul>}</section>}

    {currentUser.role === 'citizen' && ownedClaims.length > 0 && <section className="bg-white border border-[#D9E1DC] rounded-2xl p-6 shadow-sm"><h2 className="text-base font-bold text-[#123B32]">{copy('আপনার দাবিতে জমা সম্প্রদায়ের তথ্য', 'Community information on your claims')}</h2>{ownerError && <p role="alert" className="mt-2 text-xs text-rose-700">{copy('সব জমা লোড হয়নি। আবার চেষ্টা করুন।', 'Some submissions could not be loaded. Retry.')}</p>}<div className="mt-3 space-y-3">{ownedClaims.map((claim) => <article key={claim.id} className="rounded-lg border border-[#D9E1DC] p-3"><strong className="font-mono text-xs">{claim.trackingId}</strong>{(ownerRows[claim.id] ?? []).length === 0 ? <p className="mt-1 text-xs text-[#64748B]">{copy('কোনো জমা নেই।', 'No submissions.')}</p> : (ownerRows[claim.id] ?? []).map((row) => <div key={row.id} className="mt-2 border-t pt-2 text-xs"><b>{observationText(row.observationType)} · {statusText(row.status)}</b><p className="whitespace-pre-wrap">{row.description || copy('বিবরণ দেয়া হয়নি।', 'No description provided.')}</p><p className="text-[#64748B]">{new Date(row.createdAt).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-GB')}</p>{row.reviewReason && <p>{row.reviewReason}</p>}</div>)}</article>)}</div><p className="mt-3 text-[11px] text-[#64748B]">{copy('জমাদাতার অ্যাকাউন্ট পরিচয় ও সংযুক্ত ফাইল এখানে দেখানো হয় না।', 'Submitter account identity and attached files are not shown here.')}</p></section>}

  </div></main>;
};
