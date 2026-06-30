export type MinAppVersionConfig = {
  enabled: boolean;
  ios: string;
  android: string;
  title: string;
  message: string;
  changelog: string;
  admin_note: string;
  ios_store_url: string;
  android_store_url: string;
};

export type MaintenanceModeConfig = {
  enabled: boolean;
  title: string;
  message: string;
  admin_note: string;
  estimated_end: string | null;
};

export type AppSystemStatus = {
  min_app_version: MinAppVersionConfig;
  maintenance_mode: MaintenanceModeConfig;
};

export type SystemGateState =
  | { status: 'loading' }
  | { status: 'ok' }
  | { status: 'maintenance'; config: MaintenanceModeConfig }
  | { status: 'force_update'; config: MinAppVersionConfig; currentVersion: string; minVersion: string };
