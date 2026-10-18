import type { CitizenClaimEvidence, CitizenClaimSummary } from './erosionClaims';
import type { Language } from '../types';

export type ApplicationPurpose = 'rehabilitation' | 'erosion_loss_report' | 'land_record_guidance';

export interface ApplicationDraft {
  purpose: ApplicationPurpose;
  language: Language;
  recipient: string;
  subject: string;
  body: string;
  applicantName: string;
  applicantPhone: string;
  applicantEmail: string;
  generatedDate: string;
}

export interface ApplicationApplicant {
  name: string;
  phone: string | null;
  email?: string | null;
}

export interface ApplicationEvidenceReference {
  id: string;
  filename: string;
  description: string;
}

const PURPOSES: Record<ApplicationPurpose, { bn: string; en: string }> = {
  rehabilitation: { bn: 'পুনর্বাসন সহায়তার অনুরোধ', en: 'Request for rehabilitation assistance' },
  erosion_loss_report: { bn: 'নদীভাঙনজনিত ক্ষতির প্রতিবেদন', en: 'Report of erosion-related loss' },
  land_record_guidance: { bn: 'ভূমি-রেকর্ড যাচাইয়ের দিকনির্দেশনা', en: 'Guidance on land-record verification' },
};

function currentLocalDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function known(value: string | number | null | undefined, language: Language): string {
  if (value === null || value === undefined || String(value).trim() === '') {
    return language === 'bn' ? 'দাবিতে দেওয়া হয়নি' : 'Not provided in the claim';
  }
  return String(value);
}

function purposeRequest(purpose: ApplicationPurpose, language: Language): string {
  if (language === 'bn') {
    if (purpose === 'rehabilitation') return 'পুনর্বাসন সহায়তার কোনো প্রযোজ্য ব্যবস্থা বা আবেদনপদ্ধতি আছে কি না জানিয়ে, থাকলে কীভাবে এগোতে হবে সে বিষয়ে দিকনির্দেশনা দেওয়ার অনুরোধ করছি।';
    if (purpose === 'erosion_loss_report') return 'আমার দাবিতে বর্ণিত নদীভাঙনজনিত ক্ষতির তথ্য আপনাদের জানাচ্ছি। প্রযোজ্য পর্যালোচনা ও পরবর্তী করণীয় সম্পর্কে জানালে কৃতজ্ঞ থাকব।';
    return 'উল্লেখিত মৌজা, খতিয়ান ও দাগের ভূমি-রেকর্ড কীভাবে যাচাই করতে হবে এবং এ বিষয়ে কোন দপ্তর বা প্রক্রিয়া প্রযোজ্য, সে সম্পর্কে দিকনির্দেশনা চাইছি।';
  }
  if (purpose === 'rehabilitation') return 'Please advise whether any rehabilitation assistance process may apply and, if so, how I may proceed.';
  if (purpose === 'erosion_loss_report') return 'I am bringing the erosion-related loss described in my claim to your attention. Please advise whether a review process applies and what steps I may take next.';
  return 'Please advise how I can verify the land records for the mouza, khatian, and dag listed below, and which office or process is appropriate.';
}

function dateLabel(date: string, language: Language): string {
  const parsed = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-GB', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  });
}

export function generateApplicationDraft(
  claim: CitizenClaimSummary,
  applicant: ApplicationApplicant,
  purpose: ApplicationPurpose,
  language: Language,
  date = currentLocalDate(),
): ApplicationDraft {
  const title = PURPOSES[purpose][language];
  const place = [claim.mouzaName, claim.unionName, claim.upazila, claim.district]
    .filter((part) => part?.trim())
    .join(', ') || (language === 'bn' ? 'দাবিতে অবস্থানের তথ্য দেওয়া হয়নি' : 'Location details not provided');
  const subject = language === 'bn'
    ? `${title} — Shikor দাবি ${claim.trackingId}`
    : `${title} — Shikor claim ${claim.trackingId}`;
  const body = language === 'bn'
    ? `মহোদয়/মহোদয়া,\n\nআমি Shikor-এ নথিভুক্ত আমার নাগরিক দাবির বিষয়ে আপনার দৃষ্টি আকর্ষণ করছি। দাবির রেফারেন্স: ${claim.trackingId}।\n\nআমার দাবিতে দেওয়া তথ্য অনুযায়ী, ঘটনার এলাকা: ${place}; মৌজা: ${known(claim.mouzaName, language)}; খতিয়ান: ${known(claim.khatianNumber, language)}; দাগ: ${known(claim.dagNumber, language)}; দাবিতে উল্লেখিত নিমজ্জিত জমি: ${known(claim.submergedAreaAcre, language)} একর; দাবিকৃত ভাঙনের বছর: ${known(claim.erosionYear, language)}; নদী/অববাহিকা: ${known(claim.riverBasin, language)}।\n\n${purposeRequest(purpose, language)}\n\nউপরের জমি ও ঘটনার বিবরণ আমার Shikor দাবিতে দেওয়া তথ্যের সারাংশ। এই খসড়া বা Shikor দাবি জমির মালিকানা, ক্ষতির কারণ, সহায়তার যোগ্যতা বা সরকারি অনুমোদন স্বাধীনভাবে যাচাই করে না। প্রযোজ্য কর্তৃপক্ষ ও প্রক্রিয়া নিশ্চিত করে আবেদনটি সম্পাদনা করব।\n\nবিনীত,`
    : `Dear Sir/Madam,\n\nI am writing about my citizen claim recorded in Shikor. Claim reference: ${claim.trackingId}.\n\nAccording to the information I entered in that claim, the reported area is ${place}; mouza: ${known(claim.mouzaName, language)}; khatian: ${known(claim.khatianNumber, language)}; dag: ${known(claim.dagNumber, language)}; claimed submerged area: ${known(claim.submergedAreaAcre, language)} acres; claimed erosion year: ${known(claim.erosionYear, language)}; river/basin: ${known(claim.riverBasin, language)}.\n\n${purposeRequest(purpose, language)}\n\nThe land and event details above summarize information I provided in my Shikor claim. This draft and the Shikor claim do not independently verify land ownership, the cause of loss, eligibility for assistance, or government approval. I will confirm the appropriate authority and process before using this letter.\n\nYours faithfully,`;

  return {
    purpose,
    language,
    recipient: '',
    subject,
    body,
    applicantName: applicant.name,
    applicantPhone: applicant.phone ?? '',
    applicantEmail: applicant.email ?? '',
    generatedDate: dateLabel(date, language),
  };
}

export function editApplicationDraft(draft: ApplicationDraft, changes: Partial<ApplicationDraft>): ApplicationDraft {
  return { ...draft, ...changes };
}

export function getApplicationEvidenceReferences(evidence: readonly CitizenClaimEvidence[]): ApplicationEvidenceReference[] {
  return evidence.map((item) => ({
    id: item.id,
    filename: item.originalFilename?.trim() || (item.mediaType === 'image' ? 'Image from claim dossier' : 'File from claim dossier'),
    description: item.description?.trim() || '',
  }));
}

export function getPurposeLabel(purpose: ApplicationPurpose, language: Language): string {
  return PURPOSES[purpose][language];
}

export const APPLICATION_PURPOSES: readonly ApplicationPurpose[] = [
  'rehabilitation',
  'erosion_loss_report',
  'land_record_guidance',
];
