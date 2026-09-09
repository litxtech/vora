-- Vora City Governance — feature flags visible for rollout

update public.app_feature_flags
set is_button_visible = true
where feature_id in (
  'city-system',
  'city-elections',
  'city-diplomacy',
  'city-council',
  'city-voice-rooms'
);
