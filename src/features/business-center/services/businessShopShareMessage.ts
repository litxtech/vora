import {
  buildBusinessShopDeepLink,
  buildBusinessShopPublicShareUrl,
} from '@/lib/sharing/constants';

type ShareInput = {
  id: string;
  name: string;
  shopTagline?: string | null;
  district?: string | null;
  commerceModeLabel?: string | null;
};

export function buildBusinessShopShareMessage(input: ShareInput): string {
  const openUrl = buildBusinessShopPublicShareUrl(input.id);
  const tagline = input.shopTagline?.trim();
  const location = input.district?.trim();
  const mode = input.commerceModeLabel?.trim();

  const lines = [
    `🛍️ ${input.name}`,
    mode,
    tagline,
    location ? `📍 ${location}` : null,
    '',
    '👉 Mağaza vitrinini Vora\'da aç:',
    openUrl,
    '',
    'Vora · İşletme Mağazaları',
  ].filter((line) => line !== null && line !== '');

  return lines.join('\n');
}

export function buildBusinessShopSharePayload(input: ShareInput) {
  const publicUrl = buildBusinessShopPublicShareUrl(input.id);
  const deepLink = buildBusinessShopDeepLink(input.id);

  return {
    message: buildBusinessShopShareMessage(input),
    publicUrl,
    deepLink,
    title: input.name,
  };
}
