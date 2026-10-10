/** Ayarlar alt özelliği kimliği. `featureSectionId('settings', 'find-friends')` ile aynı kalmalı. */
export const CONTACT_DISCOVERY_FEATURE_ID = 'settings.section.find-friends';

export const FIND_FRIENDS_ROUTE = '/settings/find-friends';

/** Sunucudaki `match_contact_discovery` grup boyuyla aynı tutulur. */
export const MATCH_BATCH_LIMIT = 100;
export const MATCH_DAILY_LIMIT = 1000;
export const CONTACT_UPLOAD_BATCH = 200;

export const E164_PATTERN = /^\+[1-9]\d{7,14}$/;
