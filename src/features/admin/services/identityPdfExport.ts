import { GENDER_OPTIONS } from '@/constants/registration';
import { toUserFacingError } from '@/lib/errors';
import { regionNameById } from '@/constants/regions';
import {
  type IdentityApprovalRow,
} from '@/features/admin/services/identityApprovals';
import { getIdentityDocumentSignedUrl } from '@/features/admin/services/identityDocumentAccess';
import { fetchAdminUser } from '@/features/admin/services/userManagement';
import {
  IDENTITY_DOCUMENT_OPTIONS,
  IDENTITY_STATUS_LABELS,
} from '@/features/identity-verification/constants';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function documentLabel(type: string): string {
  return IDENTITY_DOCUMENT_OPTIONS.find((option) => option.id === type)?.label ?? type;
}

function genderLabel(gender: string | null | undefined): string {
  if (!gender) return '—';
  return GENDER_OPTIONS.find((option) => option.id === gender)?.label ?? gender;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value.includes('T') ? value : `${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function infoRow(label: string, value: string): string {
  return `<tr><td class="label">${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`;
}

function imageSection(title: string, url: string | null): string {
  if (!url) {
    return `<div class="doc-block"><h3>${escapeHtml(title)}</h3><p class="muted">Belge yok</p></div>`;
  }

  return `
    <div class="doc-block">
      <h3>${escapeHtml(title)}</h3>
      <img src="${url}" alt="${escapeHtml(title)}" />
    </div>
  `;
}

async function loadPdfModules(): Promise<
  | {
      ok: true;
      printToFileAsync: (options: { html: string }) => Promise<{ uri: string }>;
      shareAsync: (url: string, options?: object) => Promise<void>;
      isSharingAvailableAsync: () => Promise<boolean>;
    }
  | { ok: false; error: string }
> {
  try {
    const [Print, Sharing] = await Promise.all([import('expo-print'), import('expo-sharing')]);
    if (!Print?.printToFileAsync || !Sharing?.shareAsync || !Sharing?.isAvailableAsync) {
      return {
        ok: false,
        error: 'PDF modülü bu derlemede eksik. Dev client\'ı yeniden oluşturun (expo-print / expo-sharing).',
      };
    }
    return {
      ok: true,
      printToFileAsync: Print.printToFileAsync,
      shareAsync: Sharing.shareAsync,
      isSharingAvailableAsync: Sharing.isAvailableAsync,
    };
  } catch {
    return {
      ok: false,
      error: 'PDF modülü yüklenemedi. Dev client\'ı yeniden oluşturup tekrar deneyin.',
    };
  }
}

export async function exportIdentityVerificationPdf(
  item: IdentityApprovalRow,
): Promise<{ error: string | null }> {
  try {
    const pdfModules = await loadPdfModules();
    if (!pdfModules.ok) {
      return { error: pdfModules.error };
    }

    const { printToFileAsync, shareAsync, isSharingAvailableAsync } = pdfModules;

    const { data: profileData, error: profileError } = await fetchAdminUser(item.user_id);
    if (profileError || !profileData) {
      return { error: profileError ?? 'Kullanıcı bilgileri alınamadı.' };
    }

    const profile = profileData as typeof profileData & { email?: string | null };

    const [frontUrl, backUrl, selfieUrl] = await Promise.all([
      getIdentityDocumentSignedUrl(item.id_front_path),
      item.id_back_path ? getIdentityDocumentSignedUrl(item.id_back_path) : Promise.resolve(null),
      getIdentityDocumentSignedUrl(item.selfie_path),
    ]);

    const statusMeta = IDENTITY_STATUS_LABELS[item.status];
    const html = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111; padding: 24px; }
    h1 { font-size: 22px; margin: 0 0 8px; }
    h2 { font-size: 16px; margin: 28px 0 12px; border-bottom: 1px solid #ddd; padding-bottom: 6px; }
    h3 { font-size: 14px; margin: 0 0 8px; }
    .meta { color: #555; font-size: 12px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    td { border: 1px solid #e5e5e5; padding: 8px 10px; vertical-align: top; }
    td.label { width: 34%; background: #f7f7f7; font-weight: 600; }
    .doc-grid { display: flex; flex-direction: column; gap: 18px; }
    .doc-block img { width: 100%; max-height: 520px; object-fit: contain; border: 1px solid #ddd; border-radius: 8px; }
    .muted { color: #777; font-size: 12px; }
    .footer { margin-top: 32px; font-size: 11px; color: #888; }
  </style>
</head>
<body>
  <h1>Kimlik Doğrulama Başvurusu</h1>
  <p class="meta">Oluşturulma: ${escapeHtml(new Date().toLocaleString('tr-TR'))} · Başvuru No: ${escapeHtml(item.id)}</p>

  <h2>Başvuru Özeti</h2>
  <table>
    ${infoRow('Durum', `${statusMeta.emoji} ${statusMeta.label}`)}
    ${infoRow('Başvuru Tarihi', formatDate(item.created_at))}
    ${infoRow('Belge Türü', documentLabel(item.document_type))}
    ${infoRow('Başvuruda Yazılan Ad Soyad', item.applicant_name)}
    ${infoRow('Doğum Tarihi (başvuru)', formatDate(item.birth_date))}
    ${item.rejection_reason ? infoRow('Red Gerekçesi', item.rejection_reason) : ''}
  </table>

  <h2>Kullanıcı Hesabı</h2>
  <table>
    ${infoRow('Kullanıcı Adı', `@${profile.username}`)}
    ${infoRow('Profil Adı', profile.full_name ?? '—')}
    ${infoRow('Ad', profile.first_name ?? '—')}
    ${infoRow('Soyad', profile.last_name ?? '—')}
    ${infoRow('E-posta', profile.email ?? '—')}
    ${infoRow('Cinsiyet', genderLabel(profile.gender))}
    ${infoRow('Doğum Tarihi (profil)', formatDate(profile.birth_date))}
    ${infoRow('Hesap Türü', profile.account_type === 'business' ? 'İşletme' : 'Bireysel')}
    ${infoRow('Hesap Durumu', profile.account_status)}
    ${infoRow('Bölge', regionNameById(profile.region_id) ?? profile.region_id ?? '—')}
    ${infoRow('İlçe', profile.district ?? '—')}
    ${infoRow('Adres', profile.address ?? '—')}
    ${infoRow('Güven Puanı', String(profile.trust_score ?? 0))}
    ${infoRow('Doğrulanmış', profile.is_verified ? 'Evet' : 'Hayır')}
    ${infoRow('Premium', profile.is_premium ? 'Evet' : 'Hayır')}
    ${infoRow('Kayıt Tarihi', formatDate(profile.created_at))}
    ${infoRow('Son Görülme', formatDate(profile.last_seen_at))}
  </table>

  <h2>Belgeler</h2>
  <div class="doc-grid">
    ${imageSection('Kimlik Ön Yüz', frontUrl)}
    ${imageSection('Kimlik Arka Yüz', backUrl)}
    ${imageSection('Selfie', selfieUrl)}
  </div>

  <p class="footer">Bu belge yalnızca yetkili admin incelemesi içindir. Kişisel veriler KVKK kapsamında korunmalıdır.</p>
</body>
</html>`;

    const { uri } = await printToFileAsync({ html });
    const canShare = await isSharingAvailableAsync();
    if (!canShare) {
      return { error: 'PDF paylaşımı bu cihazda desteklenmiyor.' };
    }

    await shareAsync(uri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: `${item.applicant_name} — Kimlik Doğrulama`,
    });

    return { error: null };
  } catch (error) {
    const message = toUserFacingError(error instanceof Error ? error.message : null, {
      fallback: 'PDF oluşturulamadı.',
    });
    return { error: message };
  }
}
