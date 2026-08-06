-- Free kullanıcılar için Chrome eklentisi aylık kullanım sayacı.
-- Manuel olarak Supabase SQL Editor'de veya `supabase db push` ile uygulanır.
-- Bu dosya uzak veritabanına otomatik uygulanmadı.
--
-- Kapsam:
--   1) clip_monthly_usage: (user_id, period) başına aylık eklenti kaydı sayacı.
--      `items` tablosuna dokunulmuyor; web'den manuel eklenen kayıtlar bu
--      tabloyu hiç görmediği için aylık sayaca dahil olmuyor.
--   2) create_free_clip_item: toplam limit + aylık limit kontrolünü, kaydı
--      ve sayaç artırımını TEK transaction içinde atomik yapan RPC.
--      Yalnızca service_role çalıştırabilir (anon/authenticated/public'ten
--      execute yetkisi kaldırılmıştır).

-- ============================================================
-- 1) clip_monthly_usage tablosu
-- ============================================================

create table if not exists public.clip_monthly_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  period date not null,
  count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, period)
);

alter table if exists public.clip_monthly_usage
  drop constraint if exists clip_monthly_usage_count_check;

alter table if exists public.clip_monthly_usage
  add constraint clip_monthly_usage_count_check
  check (count >= 0);

alter table if exists public.clip_monthly_usage
  drop constraint if exists clip_monthly_usage_period_check;

alter table if exists public.clip_monthly_usage
  add constraint clip_monthly_usage_period_check
  check (period = date_trunc('month', period)::date);

comment on table public.clip_monthly_usage is
  'Free kullanıcıların Chrome eklentisi (POST /api/clip) üzerinden ay başına oluşturduğu kayıt sayısı. period = ayın ilk günü (doğal aylık reset, cron gerektirmez). Yalnızca create_free_clip_item() RPC fonksiyonu tarafından, service_role ile yazılır.';

-- RLS açık, hiçbir istemci rolüne (anon/authenticated) select/insert/update/delete
-- politikası TANIMLANMIYOR. Politika yoksa erişim reddedilir; yalnızca RLS'i
-- bypass eden service_role bu tabloya doğrudan erişebilir.
alter table public.clip_monthly_usage enable row level security;

-- Ek güvenlik katmanı: RLS + politika yokluğu zaten erişimi engelliyor, ama
-- bu migration başka bir ortamda (örn. RLS yanlışlıkla kapatılmış veya
-- ileride bir policy eklenmiş bir projede) çalıştırılırsa istemci rollerinin
-- tabloya doğrudan yazma/okuma yetkisi açık kalmasın diye varsayılan
-- tablo yetkileri de açıkça kaldırılıyor.
revoke all privileges
on table public.clip_monthly_usage
from public, anon, authenticated;

-- ============================================================
-- 2) create_free_clip_item RPC
-- ============================================================
-- Free kullanıcı için TEK atomik adımda:
--   1) kullanıcı bazlı transaction-scoped advisory lock al (eşzamanlı
--      istekleri bu kullanıcı için serileştirir; xact sonunda otomatik
--      serbest kalır),
--   2) toplam items sayısını kontrol et -> dolu ise 'total_limit_reached',
--   3) bu ayki eklenti kullanımını kontrol et -> dolu ise 'monthly_limit_reached',
--   4) items'a kaydı ekle,
--   5) yalnızca kayıt başarılıysa aylık sayacı 1 artır,
--   6) 'created' + oluşan kaydın id'sini + güncel aylık sayıyı döndür.
-- Herhangi bir adımda hata (exception) olursa fonksiyon çağrısını saran
-- transaction bütünüyle geri alınır; kayıt ile sayaç asla tutarsız kalmaz.

drop function if exists public.create_free_clip_item(
  uuid, integer, integer, text, text, text, text[], uuid
);

create or replace function public.create_free_clip_item(
  p_user_id uuid,
  p_total_limit integer,
  p_monthly_limit integer,
  p_type text,
  p_title text,
  p_content text,
  p_tags text[],
  p_group_id uuid
)
returns table (
  result text,
  item_id uuid,
  monthly_count integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_period date := date_trunc('month', now())::date;
  v_total_count integer;
  v_monthly_count integer;
  v_item_id uuid;
  v_new_monthly_count integer;
begin
  if p_user_id is null then
    raise exception 'p_user_id is required';
  end if;

  -- 1) Bu kullanıcı için transaction bazlı kilit.
  -- Aynı user_id için eşzamanlı çağrılar burada sıraya girer; ikinci çağrı
  -- birincinin commit ettiği (veya rollback ettiği) durumu görerek devam eder.
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  -- 2) Toplam kayıt sınırı (mevcut Free limiti; items şemasına dokunulmuyor).
  select count(*)
    into v_total_count
    from public.items
   where user_id = p_user_id;

  if v_total_count >= p_total_limit then
    return query select 'total_limit_reached'::text, null::uuid, null::integer;
    return;
  end if;

  -- 3) Bu ayki eklenti kullanımı.
  select coalesce(
           (select cmu.count
              from public.clip_monthly_usage cmu
             where cmu.user_id = p_user_id
               and cmu.period = v_period),
           0
         )
    into v_monthly_count;

  if v_monthly_count >= p_monthly_limit then
    return query select 'monthly_limit_reached'::text, null::uuid, v_monthly_count;
    return;
  end if;

  -- 4) Kaydı ekle.
  insert into public.items (
    user_id, type, title, content, tags, group_id, ai_status
  )
  values (
    p_user_id, p_type, p_title, p_content, coalesce(p_tags, '{}'::text[]),
    p_group_id, 'pending'
  )
  returning id into v_item_id;

  -- 5) Yalnızca kayıt başarıyla eklendikten sonra aylık sayacı artır.
  insert into public.clip_monthly_usage (user_id, period, count, updated_at)
  values (p_user_id, v_period, 1, now())
  on conflict (user_id, period)
  do update set
    count = public.clip_monthly_usage.count + 1,
    updated_at = now()
  returning count into v_new_monthly_count;

  return query select 'created'::text, v_item_id, v_new_monthly_count;
end;
$$;

comment on function public.create_free_clip_item is
  'Free kullanıcı için eklenti kaydını + aylık sayaç artışını tek atomik transaction içinde yapar. Yalnızca service_role çağırabilir. user_id çağıran route tarafından doğrulanmış token üzerinden geçirilir; RPC istemciden gelen user_id değerine güvenmez çünkü zaten istemci bu fonksiyonu hiç çağıramaz.';

-- Varsayılan PUBLIC çalıştırma yetkisini ve anon/authenticated'ı kaldır;
-- yalnızca sunucu tarafının kullandığı service_role çalıştırabilsin.
revoke all on function public.create_free_clip_item(
  uuid, integer, integer, text, text, text, text[], uuid
) from public;

revoke all on function public.create_free_clip_item(
  uuid, integer, integer, text, text, text, text[], uuid
) from anon;

revoke all on function public.create_free_clip_item(
  uuid, integer, integer, text, text, text, text[], uuid
) from authenticated;

grant execute on function public.create_free_clip_item(
  uuid, integer, integer, text, text, text, text[], uuid
) to service_role;
