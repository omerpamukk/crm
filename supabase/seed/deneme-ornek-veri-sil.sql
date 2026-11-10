-- =============================================================
-- deneme-ornek-veri-sil.sql
-- "deneme" test firmasındaki örnek veriyi (ve firmaya elle girilmiş tüm
-- kayıtları) siler. Supabase SQL Editor'da elle çalıştırılır.
-- Eşi: deneme-ornek-veri.sql
--
-- NEYİ SİLER (yalnızca kimliği 83508721-7be0-49a4-a179-d25ca22c23c7 olan "deneme" firmasının satırları):
--   ödemeler, randevular, paketler, müşteriler ve lead'ler (bağlı etkileşim,
--   KVKK onayı, sağlık formu, medya, hatırlatma kayıtları müşteriyle birlikte
--   silinir), görevler (+ geçmişi), giderler, stok hareketleri ve ürünler,
--   personel (+ vardiya ve izinleri), hizmetler.
--
-- NEYE DOKUNMAZ: firma kaydı, kullanıcılar/profiller, abonelik, işletme ve
--   randevu linki ayarları, lead aşamaları (pipeline_stages), görev listeleri
--   (task_columns), otomasyon kuralları, entegrasyonlar, mesaj kayıtları
--   (message_log kalır; müşteri bağı boşa düşer), diğer firmalar.
--   Personel silinince, profillerdeki personel bağlantısı (profiles.staff_id)
--   otomatik boşalır; kullanıcı hesapları silinmez.
--
-- GÜVENLİK: Firma kimlikle seçilir; bulunamazsa ya da beklenen kayıtlar yoksa hiçbir şey silmeden
-- hata verip durur. Tek DO bloğu = tek işlem (ya hepsi silinir ya hiçbiri).
-- Silme sırası yabancı anahtarlara göre ayarlıdır.
-- =============================================================

do $$
declare
  v_biz uuid;
  v_n   int;
  c_pay int; c_appt int; c_pkg int; c_cust int; c_task int;
  c_exp int; c_prod int; c_staff int; c_svc int;
begin
  -- Veritabanında adı "deneme" olan iki firma var; bu yüzden firma adla değil
  -- kimlikle seçilir (ekibin test tarayıcısının açık olduğu firma, 5 Kas 2026).
  v_biz := '83508721-7be0-49a4-a179-d25ca22c23c7';
  select count(*) into v_n from public.businesses where id = v_biz and name = 'deneme';
  if v_n <> 1 then
    raise exception 'Firma bulunamadı ya da adı "deneme" değil (%). Hiçbir şey silinmedi.', v_biz;
  end if;
  -- İkinci güvence: örnek veri yüklenmeden önce bu firmada olduğu görülen
  -- "qweq qweq" müşterisi ya da örnek veri personeli yoksa doğru firma değildir.
  if not exists (select 1 from public.customers where id = 'a89c6254-2045-48e8-ab9e-f5741f6ef324' and business_id = v_biz)
     and not exists (select 1 from public.staff where business_id = v_biz and full_name = 'Merve Aksoy') then
    raise exception 'Beklenen kayıtlar bu firmada yok; yanlış firma olabilir. Hiçbir şey silinmedi.';
  end if;

  -- 1) Ödemeler (müşteriye bağlı, cascade yok)
  delete from public.payments where business_id = v_biz;
  get diagnostics c_pay = row_count;

  -- 2) Randevular (müşteri, paket, hizmet ve personele bağlı; hepsinden önce)
  delete from public.appointments where business_id = v_biz;
  get diagnostics c_appt = row_count;

  -- 3) Paketler (müşteriye bağlı)
  delete from public.packages where business_id = v_biz;
  get diagnostics c_pkg = row_count;

  -- 4) Görevler (müşteri/personel bağlantısı set null; yine de önce silinir). task_activity cascade.
  delete from public.tasks where business_id = v_biz;
  get diagnostics c_task = row_count;

  -- 5) Müşteriler + lead'ler (interactions, consents, customer_health, customer_media, reminders cascade)
  delete from public.customers where business_id = v_biz;
  get diagnostics c_cust = row_count;

  -- 6) Giderler
  delete from public.expenses where business_id = v_biz;
  get diagnostics c_exp = row_count;

  -- 7) Stok (stock_movements ürünle birlikte cascade silinir)
  delete from public.products where business_id = v_biz;
  get diagnostics c_prod = row_count;

  -- 8) Personel (staff_shifts, staff_time_off cascade; profiles.staff_id set null)
  delete from public.staff where business_id = v_biz;
  get diagnostics c_staff = row_count;

  -- 9) Hizmetler
  delete from public.services where business_id = v_biz;
  get diagnostics c_svc = row_count;

  raise notice 'deneme verisi silindi: % ödeme, % randevu, % paket, % görev, % müşteri/lead, % gider, % ürün, % personel, % hizmet',
    c_pay, c_appt, c_pkg, c_task, c_cust, c_exp, c_prod, c_staff, c_svc;
end;
$$;
