import type { AccountAccessReviewPayload } from '@/features/auth/types/accountAccessReview';

let pendingReview: AccountAccessReviewPayload | null = null;
let reviewActive = false;
let presentationInFlight = false;

export function setAccountAccessReview(payload: AccountAccessReviewPayload): void {
  pendingReview = payload;
}

export function consumeAccountAccessReview(): AccountAccessReviewPayload | null {
  const value = pendingReview;
  pendingReview = null;
  return value;
}

export function markAccountAccessReviewActive(): void {
  reviewActive = true;
}

export function clearAccountAccessReviewActive(): void {
  reviewActive = false;
}

export function isAccountAccessReviewActive(): boolean {
  return reviewActive;
}

export function tryBeginAccountAccessPresentation(): boolean {
  if (presentationInFlight || reviewActive) return false;
  presentationInFlight = true;
  return true;
}

export function endAccountAccessPresentation(): void {
  presentationInFlight = false;
}

export function resetAccountAccessReviewState(): void {
  pendingReview = null;
  reviewActive = false;
  presentationInFlight = false;
}
