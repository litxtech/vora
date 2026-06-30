/** AsyncStorage key — colons allowed. */
export const ACTING_MODE_STORAGE_KEY = 'account_switch:acting_mode_v1';

/** Son aktif hesap (bağlı hesap çifti veya görünüm modu). */
export const LAST_ACTIVE_ACCOUNT_KEY = 'account_switch:last_active_v1';

/** SecureStore prefix — alphanumeric, ".", "-", "_" only (no colons). */
export const SIBLING_SESSION_PREFIX = 'account_switch_sibling_session_v1_';

export const ACCOUNT_SWITCH_DOUBLE_TAP_MS = 350;

export const ACCOUNT_SWITCH_ROUTES = {
  businessApplication: '/settings/business-application',
  linkBusinessAccount: '/settings/link-business-account',
} as const;
