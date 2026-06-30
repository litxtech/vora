import type { ReportReason } from '@/types/database';

export type MisinfoFlagType = 'wrong_info' | 'incomplete_info' | 'outdated' | 'wrong_location';

export type WarningLevel = 'warning' | 'temp_restriction' | 'temp_suspension' | 'permanent_ban';

export type SafetyPreferences = {
  show_sensitive_content: boolean;
  blur_sensitive_content: boolean;
};

export type UserWarning = {
  id: string;
  level: WarningLevel;
  reason: string;
  expiresAt: string | null;
  acknowledgedAt: string | null;
  createdAt: string;
};

export type UserReportHistory = {
  id: string;
  targetType: string;
  targetId: string;
  reason: ReportReason;
  status: string;
  createdAt: string;
};

export type UserSession = {
  id: string;
  deviceName: string | null;
  deviceType: string | null;
  lastActiveAt: string;
  isCurrent: boolean;
};

export type SafetyCenterData = {
  trustScore: number;
  accountStatus: string;
  activeWarnings: UserWarning[];
  reportHistory: UserReportHistory[];
  blockedCount: number;
  mutedCount: number;
  sessions: UserSession[];
};

export type HiddenAuthors = {
  blocked: Set<string>;
  muted: Set<string>;
  restricted: Set<string>;
};
