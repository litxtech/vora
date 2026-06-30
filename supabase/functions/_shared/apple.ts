import * as jose from 'https://esm.sh/jose@5.9.6';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export const APPLE_PREMIUM_PRODUCT_IDS = {
  monthly: 'com.karadeniz.dijitalagi.vora.premium.monthly',
  yearly: 'com.karadeniz.dijitalagi.vora.premium.yearly',
} as const;

export type ApplePremiumPlan = keyof typeof APPLE_PREMIUM_PRODUCT_IDS;

export function planFromAppleProductId(productId: string): ApplePremiumPlan | null {
  if (productId === APPLE_PREMIUM_PRODUCT_IDS.monthly) return 'monthly';
  if (productId === APPLE_PREMIUM_PRODUCT_IDS.yearly) return 'yearly';
  return null;
}

function getApplePrivateKey(): string {
  const raw = Deno.env.get('APPLE_PRIVATE_KEY');
  if (!raw) throw new Error('APPLE_PRIVATE_KEY missing');
  return raw.replace(/\\n/g, '\n');
}

export async function createAppleApiToken(): Promise<string> {
  const issuerId = Deno.env.get('APPLE_ISSUER_ID');
  const keyId = Deno.env.get('APPLE_KEY_ID');
  const bundleId = Deno.env.get('APPLE_BUNDLE_ID') ?? 'com.karadeniz.dijitalagi';

  if (!issuerId || !keyId) {
    throw new Error('APPLE_ISSUER_ID or APPLE_KEY_ID missing');
  }

  const privateKey = await jose.importPKCS8(getApplePrivateKey(), 'ES256');

  return await new jose.SignJWT({ bid: bundleId })
    .setProtectedHeader({ alg: 'ES256', kid: keyId, typ: 'JWT' })
    .setIssuer(issuerId)
    .setAudience('appstoreconnect-v1')
    .setIssuedAt()
    .setExpirationTime('20m')
    .sign(privateKey);
}

type AppleTransactionInfo = {
  productId: string;
  originalTransactionId: string;
  expiresDate?: number;
  purchaseDate?: number;
  bundleId?: string;
};

function normalizeAppleEpoch(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined;
  const parsed = typeof value === 'number' ? value : Number(String(value));
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  // Apple ms kullanır; bazı payload'larda saniye gelebilir.
  if (parsed < 1_000_000_000_000) return parsed * 1000;
  return parsed;
}

function addBillingMonthsUtc(year: number, month: number, day: number, months: number): number {
  const targetMonthIndex = month - 1 + months;
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const targetMonth = (targetMonthIndex % 12) + 1;
  const targetDay = Math.min(day, new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate());
  return Date.UTC(targetYear, targetMonth - 1, targetDay, 12, 0, 0, 0);
}

function fallbackAppleExpiresAtMs(startsAtMs: number, plan: ApplePremiumPlan): number {
  const anchor = new Date(startsAtMs);
  const year = anchor.getUTCFullYear();
  const month = anchor.getUTCMonth() + 1;
  const day = anchor.getUTCDate();

  if (plan === 'monthly') {
    return addBillingMonthsUtc(year, month, day, 1);
  }

  return Date.UTC(year + 1, month - 1, Math.min(day, new Date(Date.UTC(year + 1, month, 0)).getUTCDate()), 12, 0, 0, 0);
}

function decodeAppleJwsPayload(jws: string): AppleTransactionInfo {
  const payload = jws.split('.')[1];
  if (!payload) throw new Error('Invalid Apple transaction token');
  const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
  const data = JSON.parse(json) as Record<string, unknown>;

  const productId = String(data.productId ?? '');
  const originalTransactionId = String(data.originalTransactionId ?? data.transactionId ?? '');
  const expiresDate = normalizeAppleEpoch(data.expiresDate);
  const purchaseDate = normalizeAppleEpoch(data.purchaseDate);
  const bundleId = typeof data.bundleId === 'string' ? data.bundleId : undefined;

  if (!productId || !originalTransactionId) {
    throw new Error('Apple transaction payload incomplete');
  }

  return { productId, originalTransactionId, expiresDate, purchaseDate, bundleId };
}

async function fetchTransactionFromApple(
  transactionId: string,
  sandbox: boolean,
): Promise<AppleTransactionInfo> {
  const token = await createAppleApiToken();
  const base = sandbox
    ? 'https://api.storekit-sandbox.itunes.apple.com'
    : 'https://api.storekit.itunes.apple.com';

  const res = await fetch(`${base}/inApps/v1/transactions/${transactionId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Apple transaction lookup failed (${res.status}): ${body}`);
  }

  const json = (await res.json()) as { signedTransactionInfo?: string };
  if (!json.signedTransactionInfo) {
    throw new Error('Apple transaction response missing signedTransactionInfo');
  }

  return decodeAppleJwsPayload(json.signedTransactionInfo);
}

export async function verifyApplePremiumPurchase(input: {
  transactionId: string;
  purchaseToken?: string | null;
  productId?: string | null;
  sandbox?: boolean;
}): Promise<{
  plan: ApplePremiumPlan;
  productId: string;
  originalTransactionId: string;
  startsAt: string;
  expiresAt: string;
}> {
  const expectedBundleId = Deno.env.get('APPLE_BUNDLE_ID') ?? 'com.karadeniz.dijitalagi';
  let info: AppleTransactionInfo;

  if (input.purchaseToken) {
    info = decodeAppleJwsPayload(input.purchaseToken);
  } else {
    info = await fetchTransactionFromApple(input.transactionId, input.sandbox ?? false);
  }

  if (info.bundleId && info.bundleId !== expectedBundleId) {
    throw new Error('Apple transaction bundle ID mismatch');
  }

  if (input.productId && info.productId !== input.productId) {
    throw new Error('Apple transaction product ID mismatch');
  }

  const plan = planFromAppleProductId(info.productId);
  if (!plan) {
    throw new Error(`Unknown Apple product ID: ${info.productId}`);
  }

  const startsAtMs = info.purchaseDate ?? Date.now();
  let expiresAtMs = info.expiresDate;

  if (!expiresAtMs || expiresAtMs <= startsAtMs) {
    expiresAtMs = fallbackAppleExpiresAtMs(startsAtMs, plan);
  }

  return {
    plan,
    productId: info.productId,
    originalTransactionId: info.originalTransactionId,
    startsAt: new Date(startsAtMs).toISOString(),
    expiresAt: new Date(expiresAtMs).toISOString(),
  };
}
