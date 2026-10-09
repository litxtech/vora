/** Bağış para modeli. Tutarlar en küçük birim (kuruş) cinsinden tam sayıdır. */

export const FEE_DISCLOSURE =
  'Bağışınızın ödeme işlemi için ödeme kuruluşu tarafından işlem ücreti uygulanabilir. Ücretin tutarı kullanılan ödeme yöntemine ve ilgili ödeme koşullarına göre değişebilir. Gerçekleşen ücret ve net tutar bağış hareketlerinizde gösterilir.';

export const DONATION_TOTAL_DEFINITION =
  'İadeler düşülmüş gerçekleşen bağış tutarı. Ödeme kuruluşu ücreti, kampanyaya ayrılan net tutar ve harcamalar bu toplamın içinde değildir.';

export type DonationStatus =
  | 'pending'
  | 'succeeded'
  | 'failed'
  | 'refunded'
  | 'partially_refunded'
  | 'disputed';

export type PaymentKind =
  | 'succeeded'
  | 'pending'
  | 'failed'
  | 'refund'
  | 'dispute'
  | 'dispute_won'
  | 'fee_finalized';

export type DonationRecord = {
  id: string;
  campaignId: string;
  caseId: string | null;
  donorId: string | null;
  grossMinor: number;
  processorFeeMinor: number | null;
  otherDeductionMinor: number;
  refundedMinor: number;
  disputeMinor: number;
  status: DonationStatus;
  appliedEventIds: string[];
};

export type LedgerLine = {
  kind:
    | 'donation_gross'
    | 'processor_fee'
    | 'other_deduction'
    | 'refund'
    | 'dispute_hold'
    | 'dispute_release'
    | 'payout';
  amountMinor: number;
  donationId: string | null;
  idempotencyKey: string;
};

export type PaymentEvent = {
  eventId: string;
  kind: PaymentKind;
  grossMinor?: number | null;
  feeMinor?: number | null;
  refundedTotalMinor?: number | null;
  disputeMinor?: number | null;
};

export type CampaignMoney = {
  donorNetOfRefundsMinor: number;
  processorFeeMinor: number;
  otherDeductionMinor: number;
  campaignNetMinor: number;
  pendingGrossMinor: number;
  disputedMinor: number;
  failedGrossMinor: number;
  feeUnknownCount: number;
  paidOutMinor: number;
  approvedExpenseMinor: number;
  /** Ücreti bilinmeyen başarılı bağışlar bu bakiyeye girmez. */
  availableMinor: number;
  unspentMinor: number;
  missingProofMinor: number;
};

export function assertMinor(amount: number, label: string): void {
  if (!Number.isInteger(amount)) {
    throw new Error(`${label} tam sayı olmalıdır.`);
  }
}

export function prePaymentBreakdown(grossMinor: number) {
  assertMinor(grossMinor, 'Bağış tutarı');
  if (grossMinor <= 0) throw new Error('Bağış tutarı sıfırdan büyük olmalıdır.');
  return {
    grossMinor,
    processorFeeMinor: null as number | null,
    feeIsEstimate: false,
    otherDeductionMinor: 0,
    netMinor: null as number | null,
    disclosure: FEE_DISCLOSURE,
  };
}

function clone(donation: DonationRecord): DonationRecord {
  return { ...donation, appliedEventIds: [...donation.appliedEventIds] };
}

export function applyPaymentEvent(
  donation: DonationRecord,
  event: PaymentEvent,
): { donation: DonationRecord; ledger: LedgerLine[]; duplicate: boolean; amountMismatch: boolean } {
  if (donation.appliedEventIds.includes(event.eventId)) {
    return { donation, ledger: [], duplicate: true, amountMismatch: false };
  }

  const next = clone(donation);
  next.appliedEventIds.push(event.eventId);
  const ledger: LedgerLine[] = [];
  const key = (kind: string) => `${event.eventId}:${kind}`;

  if (event.kind === 'succeeded' || event.kind === 'fee_finalized') {
    if (
      event.grossMinor != null &&
      event.grossMinor !== donation.grossMinor
    ) {
      return { donation, ledger: [], duplicate: false, amountMismatch: true };
    }
  }

  if (event.kind === 'pending') {
    next.status = donation.status === 'pending' ? 'pending' : donation.status;
  }

  if (event.kind === 'failed') {
    if (donation.status === 'pending') next.status = 'failed';
  }

  if (event.kind === 'succeeded') {
    if (donation.status === 'pending' || donation.status === 'failed') {
      next.status = 'succeeded';
      ledger.push({
        kind: 'donation_gross',
        amountMinor: donation.grossMinor,
        donationId: donation.id,
        idempotencyKey: key('donation_gross'),
      });
      if (donation.otherDeductionMinor > 0) {
        ledger.push({
          kind: 'other_deduction',
          amountMinor: -donation.otherDeductionMinor,
          donationId: donation.id,
          idempotencyKey: key('other_deduction'),
        });
      }
    }
    if (event.feeMinor != null && next.processorFeeMinor == null) {
      assertMinor(event.feeMinor, 'İşlem ücreti');
      if (event.feeMinor < 0) throw new Error('İşlem ücreti negatif olamaz.');
      next.processorFeeMinor = event.feeMinor;
      ledger.push({
        kind: 'processor_fee',
        amountMinor: -event.feeMinor,
        donationId: donation.id,
        idempotencyKey: key('processor_fee'),
      });
    }
  }

  if (event.kind === 'fee_finalized' && event.feeMinor != null && next.processorFeeMinor == null) {
    assertMinor(event.feeMinor, 'İşlem ücreti');
    if (event.feeMinor < 0) throw new Error('İşlem ücreti negatif olamaz.');
    next.processorFeeMinor = event.feeMinor;
    ledger.push({
      kind: 'processor_fee',
      amountMinor: -event.feeMinor,
      donationId: donation.id,
      idempotencyKey: key('processor_fee'),
    });
  }

  if (event.kind === 'refund') {
    const total = event.refundedTotalMinor ?? 0;
    assertMinor(total, 'İade');
    if (total < donation.refundedMinor || total > donation.grossMinor) {
      throw new Error('İade tutarı geçersiz.');
    }
    const delta = total - donation.refundedMinor;
    next.refundedMinor = total;
    if (total === 0) {
      next.status = donation.status;
    } else if (total >= donation.grossMinor) {
      next.status = 'refunded';
    } else {
      next.status = 'partially_refunded';
    }
    if (delta > 0) {
      ledger.push({
        kind: 'refund',
        amountMinor: -delta,
        donationId: donation.id,
        idempotencyKey: key('refund'),
      });
    }
  }

  if (event.kind === 'dispute') {
    const amount = event.disputeMinor ?? donation.grossMinor - donation.refundedMinor;
    assertMinor(amount, 'Ters ibraz');
    next.status = 'disputed';
    next.disputeMinor = amount;
    ledger.push({
      kind: 'dispute_hold',
      amountMinor: -amount,
      donationId: donation.id,
      idempotencyKey: key('dispute_hold'),
    });
  }

  if (event.kind === 'dispute_won' && donation.status === 'disputed') {
    next.status = next.refundedMinor > 0 ? 'partially_refunded' : 'succeeded';
    next.disputeMinor = 0;
    ledger.push({
      kind: 'dispute_release',
      amountMinor: donation.disputeMinor,
      donationId: donation.id,
      idempotencyKey: key('dispute_release'),
    });
  }

  return { donation: next, ledger, duplicate: false, amountMismatch: false };
}

export function campaignMoney(
  donations: DonationRecord[],
  ledger: LedgerLine[],
  payoutsPaidMinor: number,
  approvedExpenseMinor: number,
): CampaignMoney {
  assertMinor(payoutsPaidMinor, 'Ödeme');
  assertMinor(approvedExpenseMinor, 'Harcama');

  const donorNetOfRefundsMinor = donations
    .filter((d) => d.status === 'succeeded' || d.status === 'partially_refunded')
    .reduce((sum, d) => sum + (d.grossMinor - d.refundedMinor), 0);

  const withFee = new Set(
    ledger.filter((line) => line.kind === 'processor_fee' && line.donationId).map((line) => line.donationId),
  );

  const campaignNetMinor = donations
    .filter(
      (d) =>
        (d.status === 'succeeded' || d.status === 'partially_refunded') &&
        d.processorFeeMinor != null &&
        withFee.has(d.id),
    )
    .reduce(
      (sum, d) =>
        sum + (d.grossMinor - d.refundedMinor - (d.processorFeeMinor ?? 0) - d.otherDeductionMinor),
      0,
    );

  const availableMinor = campaignNetMinor - payoutsPaidMinor;

  return {
    donorNetOfRefundsMinor,
    processorFeeMinor: donations.reduce((sum, d) => sum + (d.processorFeeMinor ?? 0), 0),
    otherDeductionMinor: donations
      .filter((d) => d.status === 'succeeded' || d.status === 'partially_refunded')
      .reduce((sum, d) => sum + d.otherDeductionMinor, 0),
    campaignNetMinor,
    pendingGrossMinor: donations.filter((d) => d.status === 'pending').reduce((sum, d) => sum + d.grossMinor, 0),
    disputedMinor: donations.filter((d) => d.status === 'disputed').reduce((sum, d) => sum + d.disputeMinor, 0),
    failedGrossMinor: donations.filter((d) => d.status === 'failed').reduce((sum, d) => sum + d.grossMinor, 0),
    feeUnknownCount: donations.filter(
      (d) => (d.status === 'succeeded' || d.status === 'partially_refunded') && d.processorFeeMinor == null,
    ).length,
    paidOutMinor: payoutsPaidMinor,
    approvedExpenseMinor,
    availableMinor,
    unspentMinor: availableMinor,
    missingProofMinor: Math.max(payoutsPaidMinor - approvedExpenseMinor, 0),
  };
}

export type SupportTouch = {
  donorId: string;
  caseId: string | null;
  kind: 'donation' | 'in_kind' | 'volunteer';
  countsAsSupport: boolean;
  verifiedValueMinor?: number | null;
};

export function supportedAnimalCount(touches: SupportTouch[], donorId: string): number {
  const ids = new Set(
    touches
      .filter((touch) => touch.donorId === donorId && touch.countsAsSupport && touch.caseId)
      .map((touch) => touch.caseId as string),
  );
  return ids.size;
}

export function verifiedRescueCount(
  cases: { creditedRescuerId: string | null; rescueVerified: boolean; status: string }[],
  userId: string,
): number {
  return cases.filter(
    (row) =>
      row.creditedRescuerId === userId &&
      row.rescueVerified &&
      (row.status === 'rescued' || row.status === 'rehomed' || row.status === 'completed'),
  ).length;
}
