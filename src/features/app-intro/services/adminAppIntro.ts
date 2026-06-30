import type { IntroSlide } from '@/features/app-intro/types';
import { APP_INTRO_SLIDES } from '@/features/app-intro/constants';
import { supabase } from '@/lib/supabase/client';
import { supabaseErrorMessage } from '@/lib/errors';

export type AdminAppIntroSlideRow = IntroSlide & {
  sort_order: number;
  is_active: boolean;
  updated_at?: string;
};

type DbSlideRow = {
  id: string;
  icon: string;
  accent: string;
  title: string;
  subtitle: string;
  description: string;
  sort_order: number;
  is_active: boolean;
  updated_at?: string;
};

function mapSlide(row: DbSlideRow): AdminAppIntroSlideRow {
  return {
    id: row.id,
    icon: row.icon as AdminAppIntroSlideRow['icon'],
    accent: row.accent,
    title: row.title,
    subtitle: row.subtitle,
    description: row.description,
    sort_order: row.sort_order,
    is_active: row.is_active,
    updated_at: row.updated_at,
  };
}

export async function fetchAppIntroSlidesForClient(): Promise<IntroSlide[]> {
  const { data, error } = await supabase.rpc('fetch_app_intro_slides');
  if (error || !data || (data as DbSlideRow[]).length === 0) {
    return APP_INTRO_SLIDES;
  }
  return (data as DbSlideRow[]).map((row) => mapSlide(row));
}

export async function fetchAdminAppIntroSlides(): Promise<AdminAppIntroSlideRow[]> {
  const { data, error } = await supabase.rpc('admin_list_app_intro_slides');
  if (error || !data) return APP_INTRO_SLIDES.map((slide, index) => ({
    ...slide,
    sort_order: index + 1,
    is_active: true,
  }));
  return (data as DbSlideRow[]).map(mapSlide);
}

export async function upsertAdminAppIntroSlide(
  slide: AdminAppIntroSlideRow,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_upsert_app_intro_slide', {
    p_id: slide.id,
    p_icon: slide.icon,
    p_accent: slide.accent,
    p_title: slide.title,
    p_subtitle: slide.subtitle,
    p_description: slide.description,
    p_sort_order: slide.sort_order,
    p_is_active: slide.is_active,
  });
  return { error: supabaseErrorMessage(error) };
}

export async function deleteAdminAppIntroSlide(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_delete_app_intro_slide', { p_id: id });
  return { error: supabaseErrorMessage(error) };
}
