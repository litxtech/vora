import * as jose from 'https://esm.sh/jose@5.9.6';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export const GOOGLE_PREMIUM_PRODUCT_IDS = {
  monthly: 'com.karadeniz.dijitalagi.vora.premium.monthly',
  yearly: 'com.karadeniz.dijitalagi.vora.premium.yearly',
} as const;

export type GooglePremiumPlan = keyof typeof GOOGLE_PREMIUM_PRODUCT_IDS;

export function planFromGoogleProductId(productId: string): GooglePremiumPlan | null {
  if (productId === GOOGLE_PREMIUM_PRODUCT_IDS.monthly) return 'monthly';
  if (productId === GOOGLE_PREMIUM_PRODUCT_IDS.yearly) return 'yearly';
  return null;
}

type GoogleServiceAccount = {
  client_email: string;
  private_key: string;
};

function getGoogleServiceAccount(): GoogleServiceAccount {
  const raw = Deno.env.get('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON');
  if (!raw) throw new Error('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON missing');
  return JSON.parse(raw) as GoogleServiceAccount;
}

async function getGooglePlayAccessToken(): Promise<string> {
  const account = getGoogleServiceAccount();
  const privateKey = await jose.importPKCS8(account.private_key.replace(/\\n/g, '\n'), 'RS256');

  const assertion = await new jose.SignJWT({
    scope: 'https://www.googleapis.com/auth/androidpublisher',
  })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(account.client_email)
    .setAudience('https://oauth2.googleapis.com/token')
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(privateKey);

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google OAuth token failed (${res.status}): ${body}`);
  }

  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new Error('Google OAuth token missing access_token');
  return json.access_token;
}

type GoogleSubscriptionPurchase = {
  startTimeMillis?: string;
  expiryTimeMillis?: string;
  paymentState?: number;
  cancelReason?: number;
  orderId?: string;
};

export async function verifyGooglePremiumPurchase(input: {
  purchaseToken: string;
  productId: string;
}): Promise<{
  plan: GooglePremiumPlan;
  productId: string;
  purchaseToken: string;
  orderId: string | null;
  startsAt: string;
  expiresAt: string;
}> {
  const packageName =
    Deno.env.get('GOOGLE_PLAY_PACKAGE_NAME') ?? 'com.karadeniz.dijitalagi';
  const plan = planFromGoogleProductId(input.productId);
  if (!plan) {
    throw new Error(`Unknown Google product ID: ${input.productId}`);
  }

  const accessToken = await getGooglePlayAccessToken();
  const url =
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}` +
    `/purchases/subscriptions/${encodeURIComponent(input.productId)}` +
    `/tokens/${encodeURIComponent(input.purchaseToken)}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google subscription lookup failed (${res.status}): ${body}`);
  }

  const data = (await res.json()) as GoogleSubscriptionPurchase;

  if (data.paymentState !== undefined && data.paymentState !== 1 && data.paymentState !== 2) {
    throw new Error('Google subscription payment not received');
  }

  const startsAtMs = data.startTimeMillis ? Number(data.startTimeMillis) : Date.now();
  let expiresAtMs = data.expiryTimeMillis ? Number(data.expiryTimeMillis) : null;

  if (!expiresAtMs || expiresAtMs <= startsAtMs) {
    const anchor = new Date(startsAtMs);
    const year = anchor.getUTCFullYear();
    const month = anchor.getUTCMonth() + 1;
    const day = anchor.getUTCDate();

    if (plan === 'monthly') {
      const targetMonthIndex = month - 1 + 1;
      const targetYear = year + Math.floor(targetMonthIndex / 12);
      const targetMonth = (targetMonthIndex % 12) + 1;
      const targetDay = Math.min(day, new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate());
      expiresAtMs = Date.UTC(targetYear, targetMonth - 1, targetDay, 12, 0, 0, 0);
    } else {
      const targetYear = year + 1;
      const targetDay = Math.min(day, new Date(Date.UTC(targetYear, month, 0)).getUTCDate());
      expiresAtMs = Date.UTC(targetYear, month - 1, targetDay, 12, 0, 0, 0);
    }
  }

  return {
    plan,
    productId: input.productId,
    purchaseToken: input.purchaseToken,
    orderId: data.orderId ?? null,
    startsAt: new Date(startsAtMs).toISOString(),
    expiresAt: new Date(expiresAtMs).toISOString(),
  };
}
