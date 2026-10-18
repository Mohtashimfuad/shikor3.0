import type { ClaimReviewEvent, CitizenClaimSummary } from './erosionClaims';

export interface ClaimNotification {
  id: string;
  claimId: string;
  trackingId: string;
  status: Exclude<ClaimReviewEvent['newStatus'], 'submitted'>;
  reviewerName: string;
  reason: string;
  createdAt: string;
}

/** Build notification items only from persisted reviewer events. No inferred events are added. */
export function buildClaimNotifications(
  claims: readonly CitizenClaimSummary[],
  eventsByClaim: Readonly<Record<string, readonly ClaimReviewEvent[]>>,
): ClaimNotification[] {
  const trackingIds = new Map(claims.map((claim) => [claim.id, claim.trackingId]));
  return Object.entries(eventsByClaim)
    .flatMap(([claimId, events]) => (trackingIds.has(claimId) ? events
      .filter((event): event is ClaimReviewEvent & { newStatus: Exclude<ClaimReviewEvent['newStatus'], 'submitted'> } => event.newStatus !== 'submitted')
      .map((event) => ({
      id: event.id,
      claimId,
      trackingId: trackingIds.get(claimId)!,
      status: event.newStatus,
      reviewerName: event.reviewerName,
      reason: event.reason,
      createdAt: event.createdAt,
      })) : []))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/** Guidance is a UI suggestion based on the recorded status, not a reviewer instruction. */
export function getClaimNotificationSuggestion(status: ClaimNotification['status'], language: 'bn' | 'en'): string {
  const suggestions = {
    under_review: {
      bn: 'পরামর্শ: দাবির নথি খুলে বর্তমান অবস্থা ও পর্যালোচকের কারণ দেখুন।',
      en: 'Suggestion: open the claim dossier to review the current status and reviewer reason.',
    },
    additional_evidence_requested: {
      bn: 'পরামর্শ: পর্যালোচকের কারণ পড়ুন; প্রাসঙ্গিক নথি চাইলে দাবির নথিতে যোগ করুন।',
      en: 'Suggestion: read the reviewer reason; add relevant documents to the dossier if requested.',
    },
    verified: {
      bn: 'পরামর্শ: পর্যালোচনার কারণ ও নথি নিজের রেকর্ডে রাখুন। এটি সরকারি সিদ্ধান্ত নয়।',
      en: 'Suggestion: keep the review reason and dossier for your records. This is not a government decision.',
    },
    rejected: {
      bn: 'পরামর্শ: পর্যালোচনার কারণ পড়ুন এবং পরবর্তী পদক্ষেপের জন্য প্রাসঙ্গিক কর্তৃপক্ষের কাছে নির্দেশনা চাইতে পারেন।',
      en: 'Suggestion: read the review reason; you may seek guidance from the relevant authority about next steps.',
    },
  };
  return suggestions[status][language];
}
