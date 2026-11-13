-- =============================================================
-- 0034_saatlik_cron.sql
-- Hatırlatmaları SAATTE BİR çalıştırır (Supabase pg_cron + pg_net).
--
-- Neden: Vercel Hobby planı günde tek cron'a izin veriyor; "randevudan 2 saat
-- önce" gibi kurallar günde tek turla karşılanamıyor. Bu dosya zamanlamayı
-- Supabase'e taşır. Vercel Pro'ya geçilirse bu dosya yerine vercel.json'daki
-- ifade "0 * * * *" yapılabilir; ikisi birden gerekmez (iki tur zararsızdır,
-- mükerrer mesaj oluşmaz).
--
-- ÇALIŞTIRMADAN ÖNCE (bir kez, elle, bu dosyaya YAZILMAZ):
--   1) Supabase → Database → Extensions: pg_cron ve pg_net açık olmalı.
--   2) SQL Editor'da sırları Vault'a kaydet:
--        select vault.create_secret('<CRON_SECRET değeri>', 'cron_secret');
--        select vault.create_secret('https://<alan-adı>/api/cron/reminders', 'cron_url');
--      CRON_SECRET, Vercel ortam değişkeniyle aynı olmalı.
--
-- Tekrar-güvenli: aynı adlı iş varsa önce kaldırılır.
-- =============================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule(jobid)
  from cron.job
 where jobname = 'hatirlatmalar-saatlik';

select cron.schedule(
  'hatirlatmalar-saatlik',
  '5 * * * *',
  $$
  select net.http_get(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'cron_url'),
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    timeout_milliseconds := 55000
  );
  $$
);
