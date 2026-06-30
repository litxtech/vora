/**
 * Vora Premium abonelik satışı ve kilitleri.
 * false: uygulamada abonelik yokmuş gibi davranır; tüm özellikler herkese açık.
 */
export const SUBSCRIPTIONS_ENABLED = false;

/** Admin panelinde gizlenecek abonelik modülleri */
export const SUBSCRIPTION_ADMIN_MENU_IDS = ['premium', 'premium-support', 'profile-boost'] as const;
