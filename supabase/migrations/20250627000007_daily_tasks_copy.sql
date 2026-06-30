-- Günlük görev metinleri ve güven puanı ödülleri (Kuru kaldırıldı)

update public.daily_task_definitions
set
  title = 'Gönderi paylaş',
  description = 'Bugün yayınlanmış bir gönderi paylaşın',
  reward_type = 'points'::public.task_reward_type,
  reward_value = 1
where key = 'share_post';

update public.daily_task_definitions
set
  title = 'Yorum yap',
  description = 'Akıştaki bir gönderiye yorum yazın',
  reward_type = 'points'::public.task_reward_type,
  reward_value = 1
where key = 'comment';

update public.daily_task_definitions
set
  title = 'Haber doğrula',
  description = 'Muhabir hesabıyla bir haberi doğrulayın',
  reward_type = 'points'::public.task_reward_type,
  reward_value = 2
where key = 'verify_news';

update public.daily_task_definitions
set
  title = 'Etkinliğe katıl',
  description = 'Bir etkinlik için «Katılıyorum» bildirin',
  reward_type = 'points'::public.task_reward_type,
  reward_value = 2
where key = 'join_event';

-- Eski Kuru tanımlarını puan sistemine taşı
update public.daily_task_definitions
set reward_type = 'points'::public.task_reward_type
where reward_type = 'kuru'::public.task_reward_type;
