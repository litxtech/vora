import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  applyPaymentEvent,
  campaignMoney,
  FEE_DISCLOSURE,
  prePaymentBreakdown,
  supportedAnimalCount,
  verifiedRescueCount,
  type DonationRecord,
} from '@/features/vora-canlar/services/money';
import {
  blockingDuplicateId,
  DEFAULT_CANLAR_PRIVACY,
  guestCan,
  presentContributionStats,
  rescueProgressPercent,
} from '@/features/vora-canlar/services/policy';

function donation(partial: Partial<DonationRecord> = {}): DonationRecord {
  return {
    id: 'd1',
    campaignId: 'c1',
    caseId: 'a1',
    donorId: 'u1',
    grossMinor: 20_000_00,
    processorFeeMinor: null,
    otherDeductionMinor: 0,
    refundedMinor: 0,
    disputeMinor: 0,
    status: 'pending',
    appliedEventIds: [],
    ...partial,
  };
}

test('ödeme öncesi döküm ücret uydurmaz', () => {
  const breakdown = prePaymentBreakdown(15_000);
  assert.equal(breakdown.processorFeeMinor, null);
  assert.equal(breakdown.netMinor, null);
  assert.equal(breakdown.feeIsEstimate, false);
  assert.match(breakdown.disclosure, /tahmini|değişebilir|Gerçekleşen ücret/);
  assert.equal(breakdown.disclosure, FEE_DISCLOSURE);
});

test('başarılı bağış ücreti gelene kadar harcanabilir bakiyeye girmez', () => {
  const first = applyPaymentEvent(donation(), { eventId: 'evt_1', kind: 'succeeded', grossMinor: 20_000_00 });
  assert.equal(first.donation.status, 'succeeded');
  assert.equal(first.donation.processorFeeMinor, null);
  const money = campaignMoney([first.donation], first.ledger, 0, 0);
  assert.equal(money.donorNetOfRefundsMinor, 20_000_00);
  assert.equal(money.campaignNetMinor, 0);
  assert.equal(money.availableMinor, 0);
  assert.equal(money.feeUnknownCount, 1);
  assert.equal(money.pendingGrossMinor, 0);
});

test('işlem ücreti kesinleşince net tutar ayrılır', () => {
  let row = donation();
  let ledger = applyPaymentEvent(row, { eventId: 'evt_1', kind: 'succeeded', grossMinor: 20_000_00 });
  row = ledger.donation;
  const fee = applyPaymentEvent(row, { eventId: 'evt_2', kind: 'fee_finalized', feeMinor: 640_00 });
  const lines = [...ledger.ledger, ...fee.ledger];
  const money = campaignMoney([fee.donation], lines, 0, 0);
  assert.equal(fee.donation.processorFeeMinor, 640_00);
  assert.equal(money.campaignNetMinor, 19_360_00);
  assert.equal(money.donorNetOfRefundsMinor, 20_000_00);
  assert.equal(money.availableMinor, 19_360_00);
});

test('aynı webhook olayı ikinci hareket yazmaz', () => {
  const first = applyPaymentEvent(donation(), { eventId: 'evt_1', kind: 'succeeded', grossMinor: 20_000_00, feeMinor: 100 });
  const second = applyPaymentEvent(first.donation, { eventId: 'evt_1', kind: 'succeeded', feeMinor: 100 });
  assert.equal(second.duplicate, true);
  assert.equal(second.ledger.length, 0);
  assert.equal(second.donation.appliedEventIds.length, 1);
});

test('tutar uyuşmazlığı kaydı güncellemez', () => {
  const result = applyPaymentEvent(donation(), { eventId: 'evt_x', kind: 'succeeded', grossMinor: 1 });
  assert.equal(result.amountMismatch, true);
  assert.equal(result.donation.status, 'pending');
});

test('kısmi ve tam iade net bağışı düşer', () => {
  let row = applyPaymentEvent(donation({ grossMinor: 10_000 }), {
    eventId: 'evt_ok',
    kind: 'succeeded',
    grossMinor: 10_000,
    feeMinor: 300,
  }).donation;
  const partial = applyPaymentEvent(row, { eventId: 'evt_r1', kind: 'refund', refundedTotalMinor: 2_500 });
  assert.equal(partial.donation.status, 'partially_refunded');
  assert.equal(partial.ledger[0]?.amountMinor, -2_500);
  const full = applyPaymentEvent(partial.donation, { eventId: 'evt_r2', kind: 'refund', refundedTotalMinor: 10_000 });
  assert.equal(full.donation.status, 'refunded');
  const money = campaignMoney(
    [full.donation],
    [
      { kind: 'donation_gross', amountMinor: 10_000, donationId: 'd1', idempotencyKey: 'a' },
      { kind: 'processor_fee', amountMinor: -300, donationId: 'd1', idempotencyKey: 'b' },
      ...partial.ledger,
      ...full.ledger,
    ],
    0,
    0,
  );
  assert.equal(money.donorNetOfRefundsMinor, 0);
  assert.equal(money.campaignNetMinor, 0);
});

test('başarısız ve bekleyen bağış tamamlanmış sayılmaz', () => {
  const pending = donation();
  const failed = applyPaymentEvent(pending, { eventId: 'evt_f', kind: 'failed' }).donation;
  const money = campaignMoney([pending, failed], [], 0, 0);
  assert.equal(money.donorNetOfRefundsMinor, 0);
  assert.equal(money.availableMinor, 0);
  assert.equal(money.pendingGrossMinor, pending.grossMinor);
  assert.equal(failed.status, 'failed');
});

test('ters ibraz harcanabilir bakiyeden çıkar', () => {
  const paid = applyPaymentEvent(donation({ grossMinor: 5_000 }), {
    eventId: 'evt_ok',
    kind: 'succeeded',
    grossMinor: 5_000,
    feeMinor: 100,
  });
  const dispute = applyPaymentEvent(paid.donation, { eventId: 'evt_d', kind: 'dispute', disputeMinor: 5_000 });
  assert.equal(dispute.donation.status, 'disputed');
  const money = campaignMoney([dispute.donation], [...paid.ledger, ...dispute.ledger], 0, 0);
  assert.equal(money.disputedMinor, 5_000);
  assert.equal(money.campaignNetMinor, 0);
});

test('ödenmiş tutar ile onaylı harcama kanıtı ayrıdır', () => {
  const paid = applyPaymentEvent(donation({ grossMinor: 8_000, id: 'd9' }), {
    eventId: 'evt_ok',
    kind: 'succeeded',
    grossMinor: 8_000,
    feeMinor: 200,
  });
  const money = campaignMoney([paid.donation], paid.ledger, 5_000, 2_000);
  assert.equal(money.campaignNetMinor, 7_800);
  assert.equal(money.paidOutMinor, 5_000);
  assert.equal(money.availableMinor, 2_800);
  assert.equal(money.approvedExpenseMinor, 2_000);
  assert.equal(money.missingProofMinor, 3_000);
});

test('aynı hayvana beş bağış tek hayvan sayılır', () => {
  const touches = Array.from({ length: 5 }, () => ({
    donorId: 'u1',
    caseId: 'animal-1',
    kind: 'donation' as const,
    countsAsSupport: true,
  }));
  touches.push({ donorId: 'u1', caseId: 'animal-2', kind: 'donation', countsAsSupport: false });
  assert.equal(supportedAnimalCount(touches, 'u1'), 1);
});

test('kurtarma sayısı yalnızca doğrulanmış kayıttan gelir', () => {
  assert.equal(
    verifiedRescueCount(
      [
        { creditedRescuerId: 'u1', rescueVerified: false, status: 'completed' },
        { creditedRescuerId: 'u1', rescueVerified: true, status: 'completed' },
        { creditedRescuerId: 'u2', rescueVerified: true, status: 'rescued' },
      ],
      'u1',
    ),
    1,
  );
});

test('gizlenen göstergeler başkasına null döner', () => {
  const stats = {
    animalsSupported: 3,
    verifiedRescues: 1,
    donationNetOfRefundsMinor: 5000,
    inKindCount: 2,
    verifiedInKindValueMinor: null,
    volunteerCount: 4,
  };
  const hidden = presentContributionStats(stats, DEFAULT_CANLAR_PRIVACY, false);
  assert.deepEqual(hidden, {
    animalsSupported: null,
    verifiedRescues: null,
    donationNetOfRefundsMinor: null,
    inKindCount: null,
    verifiedInKindValueMinor: null,
    volunteerCount: null,
  });
  const own = presentContributionStats(stats, DEFAULT_CANLAR_PRIVACY, true);
  assert.equal(own.donationNetOfRefundsMinor, 5000);
  const shown = presentContributionStats(stats, { ...DEFAULT_CANLAR_PRIVACY, showDonations: true }, false);
  assert.equal(shown.donationNetOfRefundsMinor, 5000);
  assert.equal(shown.animalsSupported, null);
});

test('misafir yalnızca görüntüleyebilir', () => {
  assert.equal(guestCan('view', true), true);
  assert.equal(guestCan('donate', true), false);
  assert.equal(guestCan('post', true), false);
  assert.equal(guestCan('donate', false), true);
});

test('kurtarma durumu yüzdeye indirgenmez', () => {
  for (const status of ['new_report', 'treatment', 'completed', 'lost', 'cancelled', 'duplicate']) {
    assert.equal(rescueProgressPercent(status), null);
  }
});

test('aynı ihbar sahibi için açık mükerrer dosya engellenir', () => {
  const existing = [
    {
      id: 'case-1',
      reporterId: 'u1',
      species: 'cat',
      name: 'Pamuk',
      cityLabel: 'Trabzon',
      status: 'treatment',
    },
  ];
  assert.equal(
    blockingDuplicateId(existing, { reporterId: 'u1', species: 'cat', name: ' pamuk ', cityLabel: 'trabzon' }),
    'case-1',
  );
  assert.equal(
    blockingDuplicateId(existing, { reporterId: 'u2', species: 'cat', name: 'Pamuk', cityLabel: 'Trabzon' }),
    null,
  );
});
