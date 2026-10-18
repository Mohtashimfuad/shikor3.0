import React, { useState } from 'react';
import { Printer, X } from 'lucide-react';
import type { AuthProfile } from '../../context/AuthContext';
import type { Language } from '../../types';
import type { CitizenClaimEvidence, CitizenClaimSummary } from '../../lib/erosionClaims';
import {
  APPLICATION_PURPOSES,
  editApplicationDraft,
  generateApplicationDraft,
  getApplicationEvidenceReferences,
  getPurposeLabel,
  type ApplicationDraft,
  type ApplicationPurpose,
} from '../../lib/rehabilitationApplication';

interface ClaimDraftModalProps {
  onClose: () => void;
  claim: CitizenClaimSummary;
  applicant: AuthProfile;
  evidence: CitizenClaimEvidence[];
  evidenceLoading?: boolean;
  evidenceError?: boolean;
  onRetryEvidence?: () => void;
  language: Language;
}

function makeDraft(claim: CitizenClaimSummary, applicant: AuthProfile, purpose: ApplicationPurpose, language: Language): ApplicationDraft {
  return generateApplicationDraft(claim, { name: applicant.displayName, phone: applicant.phoneNumber, email: applicant.email }, purpose, language);
}

export const ClaimDraftModal: React.FC<ClaimDraftModalProps> = ({
  onClose,
  claim,
  applicant,
  evidence,
  evidenceLoading = false,
  evidenceError = false,
  onRetryEvidence,
  language,
}) => {
  const [draft, setDraft] = useState(() => makeDraft(claim, applicant, 'rehabilitation', language));
  const copy = (bn: string, en: string) => language === 'bn' ? bn : en;
  const references = getApplicationEvidenceReferences(evidence);
  const update = (changes: Partial<ApplicationDraft>) => setDraft((current) => editApplicationDraft(current, changes));
  const changePurpose = (purpose: ApplicationPurpose) => {
    const generated = makeDraft(claim, applicant, purpose, language);
    setDraft((current) => ({ ...generated, recipient: current.recipient, applicantName: current.applicantName, applicantPhone: current.applicantPhone, applicantEmail: current.applicantEmail }));
  };
  const claimStatus = language === 'bn'
    ? ({ submitted: 'জমা হয়েছে', under_review: 'পর্যালোচনাধীন', additional_evidence_requested: 'অতিরিক্ত প্রমাণ চাওয়া হয়েছে', verified: 'পর্যালোচনায় যাচাইকৃত', rejected: 'প্রত্যাখ্যাত' }[claim.reviewStatus] ?? claim.reviewStatus)
    : claim.reviewStatus.replaceAll('_', ' ');

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-start sm:items-center justify-center p-3 sm:p-5 application-modal">
      <div className="relative bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-[#D9E1DC] overflow-hidden my-4">
        <header className="application-no-print bg-[#123B32] text-white px-5 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-base font-serif-title">{copy('আবেদন খসড়া সহায়ক', 'Application draft assistant')}</h2>
            <p className="text-[11px] text-[#D8E8DF]">{copy('দাবি', 'Claim')} {claim.trackingId} · {copy('শুধু আপনার রেকর্ডে তৈরি খসড়া', 'A draft prepared for your own records')}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10" aria-label={copy('বন্ধ করুন', 'Close')}><X className="w-5 h-5" /></button>
        </header>

        <div className="application-no-print p-4 sm:px-6 border-b border-[#D9E1DC] bg-[#F5F1E8] space-y-3">
          <label className="block text-xs font-semibold text-[#123B32]">
            {copy('আবেদনের উদ্দেশ্য', 'Application purpose')}
            <select value={draft.purpose} onChange={(event) => changePurpose(event.target.value as ApplicationPurpose)} className="mt-1 block w-full sm:max-w-xl rounded-lg border border-[#D9E1DC] bg-white px-3 py-2.5 text-sm">
              {APPLICATION_PURPOSES.map((purpose) => <option key={purpose} value={purpose}>{getPurposeLabel(purpose, language)}</option>)}
            </select>
          </label>
          <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs leading-relaxed text-amber-950">
            {copy('এটি সম্পাদনাযোগ্য স্থানীয় খসড়া; Shikor এটি কোনো দপ্তরে পাঠায় না। প্রাপক, সঠিক কর্তৃপক্ষ, প্রক্রিয়া ও প্রয়োজনীয় কাগজপত্র নিজে নিশ্চিত করুন। দাবির তথ্য আপনার দেয়া, স্বাধীনভাবে যাচাইকৃত নয়।', 'This is an editable local draft; Shikor does not send it to any office. Confirm the recipient, appropriate authority, process, and required documents yourself. Claim details came from you and have not been independently verified.')}
          </p>
        </div>

        {evidenceError && <div className="application-no-print mx-4 mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950">
          {copy('দাবির ফাইল রেফারেন্স লোড হয়নি; নিচের সংযুক্ত নথির তালিকা অসম্পূর্ণ হতে পারে।', 'Claim file references could not be loaded; the evidence list below may be incomplete.')}
          {onRetryEvidence && <button type="button" disabled={evidenceLoading} onClick={onRetryEvidence} className="ml-2 font-bold underline disabled:opacity-60">{evidenceLoading ? copy('লোড হচ্ছে…', 'Loading…') : copy('আবার চেষ্টা করুন', 'Retry')}</button>}
        </div>}
        {evidenceLoading && <p className="application-no-print px-5 pt-3 text-xs text-[#64748B]">{copy('দাবির নথি লোড হচ্ছে…', 'Loading claim dossier references…')}</p>}

        <main id="application-print-sheet" className="p-5 sm:p-8 space-y-5 text-sm text-[#1F2933]">
          <div className="flex items-start justify-between gap-4 border-b-2 border-[#123B32] pb-3">
            <div><p className="text-xs font-extrabold tracking-[0.15em] text-[#123B32]">SHIKOR</p><h1 className="mt-1 text-lg font-bold text-[#123B32]">{copy('আবেদনপত্রের খসড়া', 'Application letter draft')}</h1></div>
            <label className="shrink-0 text-xs text-[#64748B]">{copy('তারিখ', 'Date')}<br /><span className="font-semibold text-[#1F2933]">{draft.generatedDate}</span></label>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-bold text-[#123B32]">{copy('বরাবর / প্রাপক (নিজে পূরণ করুন)', 'To / recipient (enter the appropriate recipient)')}
              <input value={draft.recipient} onChange={(event) => update({ recipient: event.target.value })} placeholder={copy('সংশ্লিষ্ট দপ্তর বা কর্তৃপক্ষের নাম লিখুন', 'Enter the relevant office or authority')} className="application-editable mt-1 block w-full rounded-md border border-[#D9E1DC] bg-white px-3 py-2 font-normal text-[#1F2933]" />
            </label>
            <label className="block text-xs font-bold text-[#123B32]">{copy('বিষয় (সম্পাদনাযোগ্য)', 'Subject (editable)')}
              <input value={draft.subject} onChange={(event) => update({ subject: event.target.value })} className="application-editable mt-1 block w-full rounded-md border border-[#D9E1DC] bg-white px-3 py-2 font-normal text-[#1F2933]" />
            </label>
          </div>

          <section className="rounded-lg border border-[#D9E1DC] bg-[#F5F1E8]/60 p-4">
            <h2 className="text-xs font-bold text-[#123B32]">{copy('দাবির রেকর্ড থেকে পাওয়া তথ্য', 'Information from the claim record')}</h2>
            <p className="mt-1 text-[10px] text-[#64748B]">{copy('এই তথ্য দাবিদারের দেওয়া; এটি জমির মালিকানা বা ক্ষয়ক্ষতি যাচাই করে না।', 'These details were provided by the claimant; they do not verify land ownership or loss.')}</p>
            <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-2 text-xs">
              <div><dt className="text-[#64748B]">{copy('দাবির রেফারেন্স', 'Claim reference')}</dt><dd className="font-semibold font-mono">{claim.trackingId}</dd></div>
              <div><dt className="text-[#64748B]">{copy('দাবির অবস্থা', 'Claim status')}</dt><dd className="font-semibold">{claimStatus}</dd></div>
              <div><dt className="text-[#64748B]">{copy('জেলা / উপজেলা', 'District / Upazila')}</dt><dd className="font-semibold">{claim.district || '—'} / {claim.upazila || '—'}</dd></div>
              <div><dt className="text-[#64748B]">{copy('ইউনিয়ন / মৌজা', 'Union / Mouza')}</dt><dd className="font-semibold">{claim.unionName || '—'} / {claim.mouzaName || '—'}</dd></div>
              <div><dt className="text-[#64748B]">{copy('খতিয়ান / দাগ', 'Khatian / Dag')}</dt><dd className="font-semibold">{claim.khatianNumber || '—'} / {claim.dagNumber || '—'}</dd></div>
              <div><dt className="text-[#64748B]">{copy('দাবিতে উল্লেখিত জমি', 'Area stated in claim')}</dt><dd className="font-semibold">{claim.submergedAreaAcre ?? '—'} / {claim.totalAreaAcre ?? '—'} acres</dd></div>
              <div><dt className="text-[#64748B]">{copy('দাবিকৃত ভাঙনের বছর', 'Claimed erosion year')}</dt><dd className="font-semibold">{claim.erosionYear ?? '—'}</dd></div>
              <div><dt className="text-[#64748B]">{copy('নদী / অববাহিকা', 'River / basin')}</dt><dd className="font-semibold">{claim.riverBasin || '—'}</dd></div>
            </dl>
          </section>

          <label className="block text-xs font-bold text-[#123B32]">{copy('আবেদনের বক্তব্য (সম্পাদনাযোগ্য)', 'Application text (editable)')}
            <textarea value={draft.body} onChange={(event) => update({ body: event.target.value })} rows={12} className="application-editable application-body mt-1 block w-full rounded-lg border border-[#D9E1DC] px-3 py-3 font-normal leading-relaxed text-[#1F2933]" />
          </label>

          <section className="application-page-break-inside space-y-2">
            <h2 className="border-b border-[#D9E1DC] pb-1 text-xs font-bold text-[#123B32]">{copy('প্রমাণপত্রের তালিকা', 'Evidence checklist')}</h2>
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
              <strong>{copy('এই খসড়ার সাথে কোনো ফাইল সংযুক্ত নেই।', 'No files are attached to this draft.')}</strong>
              <p className="mt-1">{copy('Shikor-এর তালিকাভুক্ত ফাইলগুলো শুধু দাবির নথির রেফারেন্স; এগুলো এই চিঠিতে যুক্ত বা কোনো দপ্তরে পাঠানো হয়নি। কাগজে জমা দিলে প্রয়োজনমতো কপি আলাদাভাবে সংযুক্ত করুন।', 'Files listed below are references to the claim dossier only; they are not embedded in this letter or sent to an office. If submitting a paper copy, attach separate copies as appropriate.')}</p>
            </div>
            <div>
              <h3 className="text-[11px] font-bold text-[#1F2933]">{copy('দাবির নথিতে থাকা রেফারেন্স (আবেদনে সংযুক্ত নয়)', 'References in claim dossier (not attached to application)')}</h3>
              {evidenceLoading ? <p className="mt-1 text-xs text-[#64748B]">{copy('লোড হচ্ছে…', 'Loading…')}</p> : evidenceError ? <p className="mt-1 text-xs text-amber-800">{copy('রেফারেন্স লোড করা যায়নি।', 'References could not be loaded.')}</p> : references.length === 0 ? <p className="mt-1 text-xs text-[#64748B]">{copy('দাবির নথিতে কোনো ফাইল রেফারেন্স নেই।', 'No file references are recorded in the claim dossier.')}</p> : <ul className="mt-1 list-disc pl-5 text-xs">{references.map((item) => <li key={item.id} className="break-words"><span className="font-semibold">{item.filename}</span>{item.description ? ` — ${item.description}` : ''}</li>)}</ul>}
            </div>
            <div>
              <h3 className="text-[11px] font-bold text-[#1F2933]">{copy('বিবেচনা করতে পারেন — এগুলো Shikor-এ দেওয়া বা যাচাইকৃত নয়', 'You may consider — not provided or verified by Shikor')}</h3>
              <ul className="mt-1 list-disc pl-5 text-xs text-[#64748B]">
                <li>{copy('প্রাসঙ্গিক ভূমি-রেকর্ডের কপি, যদি থাকে', 'Copies of relevant land records, if available')}</li>
                <li>{copy('ঘটনার প্রাসঙ্গিক ছবি বা অন্যান্য সহায়ক নথি, যদি থাকে', 'Relevant photographs or other supporting records, if available')}</li>
                <li>{copy('আগের যোগাযোগের কপি, যদি প্রযোজ্য হয়', 'Copies of earlier correspondence, if applicable')}</li>
              </ul>
              <p className="mt-1 text-[10px] text-[#64748B]">{copy('এগুলো সাধারণ বিবেচনার তালিকা, কোনো দপ্তরের নির্ধারিত শর্ত নয়। কী প্রয়োজন তা সংশ্লিষ্ট কর্তৃপক্ষের কাছে নিশ্চিত করুন।', 'These are general suggestions, not requirements set by an office. Confirm required documents with the relevant authority.')}</p>
            </div>
          </section>

          <section className="application-page-break-inside grid grid-cols-1 sm:grid-cols-2 gap-5 border-t border-[#D9E1DC] pt-4 text-xs">
            <div><h2 className="font-bold text-[#123B32]">{copy('আবেদনকারীর তথ্য', 'Applicant details')}</h2>
              <label className="mt-2 block text-[10px] text-[#64748B]">{copy('নাম (প্রোফাইল থেকে, সম্পাদনাযোগ্য)', 'Name (from profile, editable)')}<input value={draft.applicantName} onChange={(event) => update({ applicantName: event.target.value })} className="application-editable mt-1 block w-full border-b border-[#A8B8AF] px-1 py-1 text-xs text-[#1F2933]" /></label>
              <label className="mt-2 block text-[10px] text-[#64748B]">{copy('ফোন (প্রোফাইল থেকে, সম্পাদনাযোগ্য)', 'Phone (from profile, editable)')}<input value={draft.applicantPhone} onChange={(event) => update({ applicantPhone: event.target.value })} className="application-editable mt-1 block w-full border-b border-[#A8B8AF] px-1 py-1 text-xs text-[#1F2933]" /></label>
              <label className="mt-2 block text-[10px] text-[#64748B]">{copy('ইমেইল (প্রোফাইল থেকে, সম্পাদনাযোগ্য)', 'Email (from profile, editable)')}<input type="email" value={draft.applicantEmail} onChange={(event) => update({ applicantEmail: event.target.value })} className="application-editable mt-1 block w-full border-b border-[#A8B8AF] px-1 py-1 text-xs text-[#1F2933]" /></label>
            </div>
            <div className="flex flex-col justify-end">
              <div className="mt-8 border-b border-[#64748B]" />
              <p className="mt-1">{copy('আবেদনকারীর স্বাক্ষর', 'Applicant signature')}</p>
            </div>
          </section>
          <footer className="border-t border-[#D9E1DC] pt-2 text-[10px] text-[#64748B]">{copy('Shikor · ব্যবহারকারীর সম্পাদিত খসড়া · কোনো সরকারি দাখিল, অনুমোদন বা আইনগত সিদ্ধান্ত নয়', 'Shikor · User-edited draft · Not a government filing, approval, or legal determination')}</footer>
        </main>

        <footer className="application-no-print border-t border-[#D9E1DC] bg-[#F5F1E8] px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-[11px] text-[#64748B]">{copy('খসড়াটি এই পৃষ্ঠায় অস্থায়ীভাবে আছে; বন্ধ করলে সংরক্ষিত থাকবে না।', 'This draft exists temporarily on this page and is not saved when you close it.')}</p>
          <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg bg-[#123B32] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#0c2822]"><Printer className="h-4 w-4 text-[#C6A66B]" />{copy('প্রিন্ট / PDF হিসেবে সংরক্ষণ', 'Print / Save as PDF')}</button>
        </footer>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #application-print-sheet, #application-print-sheet * { visibility: visible !important; }
          .application-modal { display: block !important; position: static !important; overflow: visible !important; padding: 0 !important; background: white !important; }
          .application-modal > div { position: static !important; overflow: visible !important; width: auto !important; max-width: none !important; margin: 0 !important; border: 0 !important; border-radius: 0 !important; box-shadow: none !important; }
          #application-print-sheet { position: absolute !important; inset: 0 auto auto 0 !important; width: 100% !important; max-width: none !important; margin: 0 !important; padding: 0.4in !important; border: 0 !important; background: #fff !important; color: #111 !important; box-shadow: none !important; }
          .application-no-print { display: none !important; }
          .application-editable { border: 0 !important; border-radius: 0 !important; background: transparent !important; padding: 0 !important; color: #111 !important; box-shadow: none !important; }
          textarea.application-body { min-height: 3.8in; height: auto !important; overflow: visible !important; resize: none !important; white-space: pre-wrap !important; }
          .application-page-break-inside { break-inside: avoid; }
          @page { margin: 0.55in; }
        }
      `}</style>
    </div>
  );
};
