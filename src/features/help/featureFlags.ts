import {
  buildNestedTabSubFeatures,
  buildSectionSubFeature,
  buildTabSubFeatures,
  buildControlSubFeature,
  featureTabId,
  featureControlId,
} from '@/features/feature-flags/buildSubFeatures';
import type { AppFeatureDef } from '@/features/feature-flags/types';
import { HELP_CENTER_MODE_TABS, HELP_TABS } from '@/features/help/constants';
import { VOLUNTEER_TABS } from '@/features/volunteer/constants';

const PARENT = 'help';
const GROUP = 'centers' as const;

const REQUESTS_MODE = featureTabId(PARENT, 'requests');
const TEAMS_MODE = featureTabId(PARENT, 'teams');

export const HELP_FEATURE = {
  tab: (tabId: string) => featureTabId(PARENT, tabId),
  requestsTab: (tabId: string) => featureTabId(REQUESTS_MODE, tabId),
  teamsTab: (tabId: string) => featureTabId(TEAMS_MODE, tabId),
  detailContact: featureControlId(PARENT, 'detail-contact'),
  detailResolve: featureControlId(PARENT, 'detail-resolve'),
  detailJoin: featureControlId(PARENT, 'team-join'),
  detailLeave: featureControlId(PARENT, 'team-leave'),
  section: {
    create: `${PARENT}.section.create`,
  },
} as const;

export const HELP_SUB_FEATURES: AppFeatureDef[] = [
  ...buildTabSubFeatures(PARENT, GROUP, HELP_CENTER_MODE_TABS),
  ...buildNestedTabSubFeatures(REQUESTS_MODE, GROUP, HELP_TABS),
  ...buildNestedTabSubFeatures(TEAMS_MODE, GROUP, VOLUNTEER_TABS),
  buildSectionSubFeature(PARENT, GROUP, 'create', 'Talep oluştur', 'Yeni yardım talebi paylaşma'),
  buildControlSubFeature(PARENT, GROUP, 'detail-contact', 'Detay · İletişim', 'Talep detayındaki telefon arama kartı'),
  buildControlSubFeature(PARENT, GROUP, 'detail-resolve', 'Detay · Çözüldü işaretle', 'Sahip · talebi kapatma butonu'),
  buildControlSubFeature(PARENT, GROUP, 'team-join', 'Ekip · Katıl', 'Gönüllü ekibe katılma'),
  buildControlSubFeature(PARENT, GROUP, 'team-leave', 'Ekip · Ayrıl', 'Gönüllü ekipten ayrılma'),
];

export const SUB_FEATURES = HELP_SUB_FEATURES;
