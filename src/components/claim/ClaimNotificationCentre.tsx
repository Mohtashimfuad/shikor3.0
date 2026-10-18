import React, { useCallback, useEffect, useState } from 'react';
import { ArrowRight, Bell, RefreshCw } from 'lucide-react';
import type { Language } from '../../types';
import type { CitizenClaimSummary } from '../../lib/erosionClaims';
import { getClaimReviewHistory, type ClaimReviewEvent } from '../../lib/erosionClaims';
import { buildClaimNotifications, getClaimNotificationSuggestion } from '../../lib/claimNotifications';

interface Props {
  claims: readonly CitizenClaimSummary[];
  claimsLoading: boolean;
  claimsError: boolean;
  language: Language;
  onOpenClaim: (claimId: string) => void;
  onRetryClaims: () => void;
}

export const ClaimNotificationCentre: React.FC<Props> = ({ claims, claimsLoading, claimsError, language, onOpenClaim, onRetryClaims }) => {
  const copy = (bn: string, en: string) => language === 'bn' ? bn : en;
  const [eventsByClaim, setEventsByClaim] = useState<Record<string, ClaimReviewEvent[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryToken, setRetryToken] = useState(0);

  const load = useCallback(async () => {
    if (claimsLoading || claimsError) return;
    setLoading(true);
    setError(false);
    try {
      const results = await Promise.all(claims.map(async (claim) => [claim.id, await getClaimReviewHistory(claim.id)] as const));
      const mapped: Record<string, ClaimReviewEvent[]> = {};
      let failed = false;
      for (const [claimId, result] of results) {
        mapped[claimId] = result.events;
        failed ||= result.error;
      }
      setEventsByClaim(mapped);
      setError(failed);
    } catch {
      setEventsByClaim({});
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [claims, claimsError, claimsLoading, retryToken]);

  useEffect(() => { void load(); }, [load]);

  const notifications = buildClaimNotifications(claims, eventsByClaim);
  const statusLabel = (status: string) => ({
    under_review: copy('পর্যালোচনাধীন', 'Under review'),
    additional_evidence_requested: copy('অতিরিক্ত প্রমাণ চাওয়া হয়েছে', 'Additional evidence requested'),
    verified: copy('Shikor পর্যালোচনায় যাচাইকৃত', 'Marked verified in Shikor review'),
    rejected: copy('প্রত্যাখ্যাত', 'Rejected'),
  }[status] ?? status);

  return <section id="claim-notifications" className="scroll-mt-24 rounded-2xl border border-[#D9E1DC] bg-white p-5 sm:p-6 shadow-sm" aria-labelledby="claim-notifications-heading">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h2 id="claim-notifications-heading" className="flex items-center gap-2 text-base font-bold text-[#123B32]"><Bell className="h-4 w-4 text-[#C6A66B]" />{copy('দাবির আপডেট', 'Claim updates')}<span className="rounded-full bg-[#D8E8DF] px-2 py-0.5 text-[10px] font-bold text-[#123B32]">{notifications.length}</span></h2>
        <p className="mt-1 text-[11px] text-[#64748B]">{copy('শুধু ডাটাবেজে নথিভুক্ত পর্যালোচনা ঘটনা। স্বয়ংক্রিয় বা রিয়েল-টাইম নোটিফিকেশন নয়।', 'Recorded review events from the database only. These are not automatic or real-time notifications.')}</p>
      </div>
      <button type="button" onClick={() => setRetryToken((token) => token + 1)} disabled={loading} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-[#D9E1DC] px-3 py-2 text-xs font-bold text-[#123B32] disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />{copy('আপডেট দেখুন', 'Refresh updates')}</button>
    </div>

    {claimsError ? <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800" role="alert">{copy('দাবির তালিকা লোড হয়নি, তাই আপডেট যাচাই করা যাচ্ছে না।', 'Claims could not be loaded, so updates cannot be checked.')} <button type="button" onClick={onRetryClaims} className="ml-2 font-bold underline">{copy('দাবি আবার লোড করুন', 'Retry claims')}</button></div>
      : claimsLoading || loading ? <p className="mt-4 text-sm text-[#64748B]" role="status">{copy('নথিভুক্ত আপডেট লোড হচ্ছে…', 'Loading recorded updates…')}</p>
      : error ? <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800" role="alert">{copy('কিছু পর্যালোচনা ইতিহাস লোড হয়নি। দেখানো আপডেট অসম্পূর্ণ হতে পারে; আবার চেষ্টা করুন।', 'Some review history could not be loaded. The updates shown may be incomplete; retry.')}</div>
        : notifications.length === 0 ? <p className="mt-4 rounded-lg bg-[#F5F1E8] p-4 text-sm text-[#64748B]">{copy('এখনো কোনো পর্যালোচনা ঘটনা নথিভুক্ত নেই। নতুন দাবি জমা বা খসড়া অবস্থা এখানে notification হিসেবে দেখানো হয় না।', 'No review events have been recorded yet. Claim submission and draft status are not shown here as notifications.')}</p>
          : <ol className="mt-4 space-y-3">{notifications.map((item) => <li key={item.id} className="rounded-xl border border-[#D9E1DC] bg-[#F5F1E8]/60 p-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><strong className="font-mono text-xs text-[#123B32]">{item.trackingId}</strong><span className="rounded-full border border-[#D9E1DC] bg-white px-2 py-0.5 text-[10px] font-bold text-[#123B32]">{statusLabel(item.status)}</span></div>
                <p className="mt-1 text-[10px] text-[#64748B]">{copy('নথিভুক্ত পর্যালোচনা ঘটনা', 'Recorded review event')} · {item.reviewerName} · {new Date(item.createdAt).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-GB')}</p>
              </div>
              <button type="button" onClick={() => onOpenClaim(item.claimId)} className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-[#123B32] underline">{copy('দাবির নথি খুলুন', 'Open claim dossier')}<ArrowRight className="h-3.5 w-3.5" /></button>
            </div>
            <div className="mt-3 border-l-2 border-[#C6A66B] pl-3"><p className="text-[10px] font-bold uppercase tracking-wide text-[#64748B]">{copy('নথিভুক্ত পর্যালোচকের কারণ', 'Recorded reviewer reason')}</p><p className="mt-1 whitespace-pre-wrap text-xs text-[#1F2933]">{item.reason}</p></div>
            <p className="mt-3 text-[11px] leading-relaxed text-[#64748B]">{getClaimNotificationSuggestion(item.status, language)}</p>
          </li>)}</ol>}
  </section>;
};
