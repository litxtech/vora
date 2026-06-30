import {
  DEFAULT_ANDROID_STORE_URL,
  DEFAULT_IOS_STORE_URL,
  DEFAULT_MAINTENANCE_MODE,
  DEFAULT_MIN_APP_VERSION,
} from '@/features/system-gate/constants';
import type { AppSystemStatus, MaintenanceModeConfig, MinAppVersionConfig } from '@/features/system-gate/types';

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function asNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

export function parseMinAppVersionConfig(raw: unknown): MinAppVersionConfig {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};

  return {
    enabled: Boolean(obj.enabled),
    ios: asString(obj.ios, DEFAULT_MIN_APP_VERSION.ios),
    android: asString(obj.android, DEFAULT_MIN_APP_VERSION.android),
    title: asString(obj.title, DEFAULT_MIN_APP_VERSION.title),
    message: asString(obj.message, DEFAULT_MIN_APP_VERSION.message),
    changelog: asString(obj.changelog, DEFAULT_MIN_APP_VERSION.changelog),
    admin_note: asString(obj.admin_note, DEFAULT_MIN_APP_VERSION.admin_note),
    ios_store_url: asString(obj.ios_store_url, DEFAULT_MIN_APP_VERSION.ios_store_url),
    android_store_url: asString(obj.android_store_url, DEFAULT_MIN_APP_VERSION.android_store_url),
  };
}

export function parseMaintenanceModeConfig(raw: unknown): MaintenanceModeConfig {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};

  return {
    enabled: Boolean(obj.enabled),
    title: asString(obj.title, DEFAULT_MAINTENANCE_MODE.title),
    message: asString(obj.message, DEFAULT_MAINTENANCE_MODE.message),
    admin_note: asString(obj.admin_note, DEFAULT_MAINTENANCE_MODE.admin_note),
    estimated_end: asNullableString(obj.estimated_end),
  };
}

export function parseAppSystemStatus(raw: unknown): AppSystemStatus {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};

  return {
    min_app_version: parseMinAppVersionConfig(obj.min_app_version),
    maintenance_mode: parseMaintenanceModeConfig(obj.maintenance_mode),
  };
}

export function resolveStoreUrl(config: MinAppVersionConfig, platform: 'ios' | 'android'): string {
  const custom = platform === 'ios' ? config.ios_store_url.trim() : config.android_store_url.trim();
  if (custom) return custom;
  return platform === 'ios' ? DEFAULT_IOS_STORE_URL : DEFAULT_ANDROID_STORE_URL;
}

export function parseChangelogLines(changelog: string): string[] {
  return changelog
    .split('\n')
    .map((line) => line.trim().replace(/^[-•*]\s*/, ''))
    .filter(Boolean);
}
