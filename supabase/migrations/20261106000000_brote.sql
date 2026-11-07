-- =====================================================================
-- Brote 🌱 — esquema completo
-- Pegalo entero en Supabase > SQL Editor y ejecutalo una vez.
-- (Después corré supabase/cron.sql para los secretos y los horarios.)
-- =====================================================================

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

create schema if not exists private;
grant usage on schema private to authenticated, service_role;

-- ---------------------------------------------------------------------
-- Configuración
-- ---------------------------------------------------------------------

-- Zona horaria de la pareja (Argentina no tiene horario de verano: UTC-3 fijo).
create or replace function private.app_tz() returns text
language sql immutable as $$ select 'America/Argentina/Buenos_Aires' $$;

-- Hasta esta hora local se puede cargar lo del día anterior. A esta hora corre el cierre del día.
create or replace function private.grace_hour() returns int
language sql immutable as $$ select 10 $$;

create or replace function private.local_today() returns date
language sql stable as $$ select (now() at time zone private.app_tz())::date $$;

create or replace function private.can_log_date(d date) returns boolean
language sql stable as $$
  select d = private.local_today()
      or (d = private.local_today() - 1
          and extract(hour from now() at time zone private.app_tz()) < private.grace_hour())
$$;

-- ---------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------

create table public.couples (
  id          uuid primary key default gen_random_uuid(),
  invite_code text not null unique default upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6)),
  created_at  timestamptz not null default now()
);

create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  couple_id  uuid references public.couples(id) on delete set null,
  name       text not null check (char_length(name) between 1 and 30),
  emoji      text not null default '🙂' check (char_length(emoji) between 1 and 16),
  lang       text not null default 'es' check (lang in ('es', 'pt')),
  avatar     jsonb not null default '{}'::jsonb check (jsonb_typeof(avatar) = 'object' and octet_length(avatar::text) < 2000),
  joined_at  timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index profiles_couple_idx on public.profiles (couple_id);

create or replace function private.my_couple_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select couple_id from public.profiles where id = auth.uid()
$$;

create type public.meal_kind as enum ('fruta', 'verdura', 'ambas');
create type public.review_verdict as enum ('ok', 'rejected');

create table public.meals (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  couple_id        uuid not null default private.my_couple_id() references public.couples(id) on delete cascade,
  kind             public.meal_kind not null,
  description      text not null default '' check (char_length(description) <= 140),
  photo_path       text,
  photo_deleted_at timestamptz,
  local_date       date not null default private.local_today(),
  review           public.review_verdict,
  reviewed_at      timestamptz,
  created_at       timestamptz not null default now()
);
create index meals_couple_created_idx on public.meals (couple_id, created_at desc);
create index meals_user_date_idx on public.meals (user_id, local_date);

create type public.point_kind as enum ('miss', 'redeem', 'adjust');

-- Libro de puntos: el saldo de cada uno es la suma de "amount".
create table public.point_events (
  id             uuid primary key default gen_random_uuid(),
  couple_id      uuid not null references public.couples(id) on delete cascade,
  user_id        uuid not null references public.profiles(id) on delete cascade, -- a quién le cambia el saldo
  amount         int  not null,
  kind           public.point_kind not null,
  source_user_id uuid references public.profiles(id) on delete cascade,           -- quién falló (kind = miss)
  ref_date       date,
  redemption_id  uuid,
  note           text,
  created_at     timestamptz not null default now()
);
create index point_events_couple_idx on public.point_events (couple_id, created_at desc);
create unique index point_events_one_miss_per_day
  on public.point_events (source_user_id, ref_date) where kind = 'miss';

create table public.store_items (
  id         uuid primary key default gen_random_uuid(),
  couple_id  uuid not null default private.my_couple_id() references public.couples(id) on delete cascade,
  title      text not null check (char_length(title) between 1 and 60),
  emoji      text not null default '🎁' check (char_length(emoji) between 1 and 16),
  cost       int  not null check (cost between 1 and 999),
  active     boolean not null default true,
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create type public.redemption_status as enum ('pendiente', 'cumplido');

create table public.redemptions (
  id           uuid primary key default gen_random_uuid(),
  couple_id    uuid not null references public.couples(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade, -- quién canjeó
  item_id      uuid references public.store_items(id) on delete set null,
  title        text not null,
  emoji        text not null,
  cost         int  not null,
  status       public.redemption_status not null default 'pendiente',
  created_at   timestamptz not null default now(),
  fulfilled_at timestamptz
);
create index redemptions_couple_idx on public.redemptions (couple_id, created_at desc);

create table public.weekly_summaries (
  id         uuid primary key default gen_random_uuid(),
  couple_id  uuid not null references public.couples(id) on delete cascade,
  week_start date not null,
  data       jsonb not null,
  created_at timestamptz not null default now(),
  unique (couple_id, week_start)
);

create table public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Permisos por columna (lo que no se puede tocar directo pasa por RPC)
-- ---------------------------------------------------------------------

revoke insert, update, delete on public.couples, public.point_events, public.redemptions,
  public.weekly_summaries, public.push_subscriptions from anon, authenticated;
revoke insert, update on public.profiles from anon, authenticated;
grant update (name, emoji, lang, avatar) on public.profiles to authenticated;
revoke insert, update on public.meals from anon, authenticated;
grant insert (kind, description, photo_path, local_date) on public.meals to authenticated;
revoke update on public.store_items from anon, authenticated;
grant update (title, emoji, cost, active) on public.store_items to authenticated;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------

alter table public.couples            enable row level security;
alter table public.profiles           enable row level security;
alter table public.meals              enable row level security;
alter table public.point_events       enable row level security;
alter table public.store_items        enable row level security;
alter table public.redemptions        enable row level security;
alter table public.weekly_summaries   enable row level security;
alter table public.push_subscriptions enable row level security;

create policy "pareja ve su pareja" on public.couples for select to authenticated
  using (id = private.my_couple_id());

create policy "ver mi perfil y el de mi pareja" on public.profiles for select to authenticated
  using (id = auth.uid() or couple_id = private.my_couple_id());
create policy "editar mi perfil" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy "ver comidas de la pareja" on public.meals for select to authenticated
  using (couple_id = private.my_couple_id());
create policy "cargar mis comidas" on public.meals for insert to authenticated
  with check (
    user_id = auth.uid()
    and couple_id = private.my_couple_id()
    and private.can_log_date(local_date)
    and photo_path is not null
    and photo_path like couple_id::text || '/' || auth.uid()::text || '/%'
  );
create policy "borrar mis comidas del día" on public.meals for delete to authenticated
  using (user_id = auth.uid() and private.can_log_date(local_date));

create policy "ver puntos de la pareja" on public.point_events for select to authenticated
  using (couple_id = private.my_couple_id());

create policy "ver tienda" on public.store_items for select to authenticated
  using (couple_id = private.my_couple_id());
create policy "agregar a la tienda" on public.store_items for insert to authenticated
  with check (couple_id = private.my_couple_id());
create policy "editar la tienda" on public.store_items for update to authenticated
  using (couple_id = private.my_couple_id()) with check (couple_id = private.my_couple_id());

create policy "ver canjes" on public.redemptions for select to authenticated
  using (couple_id = private.my_couple_id());

create policy "ver resúmenes" on public.weekly_summaries for select to authenticated
  using (couple_id = private.my_couple_id());

create policy "ver mis suscripciones" on public.push_subscriptions for select to authenticated
  using (user_id = auth.uid());
create policy "borrar mis suscripciones" on public.push_subscriptions for delete to authenticated
  using (user_id = auth.uid());
grant delete on public.push_subscriptions to authenticated;

-- ---------------------------------------------------------------------
-- RPC para la app
-- ---------------------------------------------------------------------

-- App cerrada: hay una sola pareja y entran solo 2 personas.
-- (Además, en Supabase > Authentication desactivá "Allow new users to sign up" y creá las 2 cuentas a mano.)
-- La primera vez que alguien entra se crea su perfil y queda en la pareja.
create or replace function public.claim_profile(p_name text, p_emoji text default '🙂', p_lang text default 'es')
returns public.profiles
language plpgsql security definer set search_path = '' as $$
declare v_couple uuid; v_count int; v_prof public.profiles;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;

  select * into v_prof from public.profiles where id = auth.uid();
  if v_prof.id is not null then return v_prof; end if;

  perform pg_advisory_xact_lock(hashtext('brote-claim'));

  select id into v_couple from public.couples order by created_at limit 1;
  if v_couple is null then
    insert into public.couples default values returning id into v_couple;
  end if;

  select count(*) into v_count from public.profiles where couple_id = v_couple;
  if v_count >= 2 then raise exception 'app_full'; end if;

  insert into public.profiles (id, couple_id, name, emoji, lang)
  values (auth.uid(), v_couple, trim(p_name), coalesce(nullif(trim(p_emoji), ''), '🙂'),
          case when p_lang = 'pt' then 'pt' else 'es' end)
  returning * into v_prof;

  -- Los dos arrancan a contar desde que están los dos.
  update public.profiles set joined_at = now() where couple_id = v_couple;

  -- La tienda arranca vacía: los premios los cargan ustedes.

  select * into v_prof from public.profiles where id = auth.uid();
  return v_prof;
end $$;

create or replace function public.review_meal(p_meal uuid, p_verdict public.review_verdict)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.meals
     set review = p_verdict, reviewed_at = now()
   where id = p_meal
     and couple_id = private.my_couple_id()
     and user_id <> auth.uid();
  if not found then raise exception 'cannot_review'; end if;
end $$;

create or replace function public.redeem_item(p_item uuid)
returns public.redemptions
language plpgsql security definer set search_path = '' as $$
declare v_item public.store_items; v_balance int; v_red public.redemptions;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  perform pg_advisory_xact_lock(hashtext('brote-points-' || auth.uid()::text));

  select * into v_item from public.store_items
   where id = p_item and couple_id = private.my_couple_id() and active;
  if v_item.id is null then raise exception 'item_not_found'; end if;

  select coalesce(sum(amount), 0) into v_balance from public.point_events where user_id = auth.uid();
  if v_balance < v_item.cost then
    raise exception 'not_enough_points';
  end if;

  insert into public.redemptions (couple_id, user_id, item_id, title, emoji, cost)
  values (v_item.couple_id, auth.uid(), v_item.id, v_item.title, v_item.emoji, v_item.cost)
  returning * into v_red;

  insert into public.point_events (couple_id, user_id, amount, kind, redemption_id, note)
  values (v_item.couple_id, auth.uid(), -v_item.cost, 'redeem', v_red.id, 'Canje: ' || v_item.title);

  return v_red;
end $$;

create or replace function public.fulfill_redemption(p_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.redemptions
     set status = 'cumplido', fulfilled_at = now()
   where id = p_id and couple_id = private.my_couple_id() and status = 'pendiente';
  if not found then raise exception 'not_pending'; end if;
end $$;

create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_user_agent text default null)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth, p_user_agent)
  on conflict (endpoint) do update
    set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth,
        user_agent = excluded.user_agent;
end $$;

revoke execute on function public.claim_profile, public.review_meal,
  public.redeem_item, public.fulfill_redemption, public.save_push_subscription from public, anon;
grant execute on function public.claim_profile, public.review_meal,
  public.redeem_item, public.fulfill_redemption, public.save_push_subscription to authenticated;

-- ---------------------------------------------------------------------
-- Rachas: días seguidos con fruta/verdura válida
-- ---------------------------------------------------------------------

-- current: la racha que sigue viva al día p_as_of (cuenta si el último día cumplido es p_as_of o el anterior,
-- porque el día de hoy todavía no terminó). best: la más larga de la historia hasta p_as_of.
create or replace function private.user_streaks(p_user uuid, p_as_of date)
returns table (current_streak int, best_streak int)
language sql stable security definer set search_path = '' as $$
  with d as (
    select distinct ml.local_date from public.meals ml
     where ml.user_id = p_user and ml.local_date <= p_as_of and ml.review is distinct from 'rejected'
  ),
  g as (select local_date, local_date - (row_number() over (order by local_date))::int as grp from d),
  islands as (select max(local_date) as e, count(*)::int as len from g group by grp)
  select
    coalesce((select i.len from islands i where i.e >= p_as_of - 1 order by i.e desc limit 1), 0),
    coalesce((select max(i.len) from islands i), 0)
$$;

create or replace function public.couple_streaks()
returns table (user_id uuid, current_streak int, best_streak int)
language sql stable security definer set search_path = '' as $$
  select p.id, s.current_streak, s.best_streak
    from public.profiles p
    cross join lateral private.user_streaks(p.id, private.local_today()) s
   where p.couple_id = private.my_couple_id()
$$;
revoke execute on function public.couple_streaks from public, anon;
grant execute on function public.couple_streaks to authenticated;

-- ---------------------------------------------------------------------
-- Funciones del servidor (solo las llama la edge function con service_role)
-- ---------------------------------------------------------------------

-- Cierra un día: a quien no comió fruta/verdura (o se la rechazaron) le suma 1 punto a su pareja.
-- Es idempotente: correrla dos veces no duplica puntos.
create or replace function public.srv_close_day(p_date date)
returns table (couple_id uuid, failed_user uuid, failed_name text, beneficiary uuid, beneficiary_name text)
language sql security definer set search_path = '' as $$
  with full_couples as (
    select pr.couple_id from public.profiles pr
     where pr.couple_id is not null
     group by pr.couple_id having count(*) = 2
  ),
  pairs as (
    select m.id as failed, o.id as partner, m.couple_id
      from public.profiles m
      join public.profiles o on o.couple_id = m.couple_id and o.id <> m.id
     where m.couple_id in (select fc.couple_id from full_couples fc)
       and p_date > (greatest(m.joined_at, o.joined_at) at time zone private.app_tz())::date
       and not exists (
         select 1 from public.meals ml
          where ml.user_id = m.id and ml.local_date = p_date
            and ml.review is distinct from 'rejected')
  ),
  ins as (
    insert into public.point_events (couple_id, user_id, amount, kind, source_user_id, ref_date, note)
    select pairs.couple_id, pairs.partner, 1, 'miss', pairs.failed, p_date, 'Día sin fruta ni verdura'
      from pairs
    on conflict (source_user_id, ref_date) where kind = 'miss' do nothing
    returning point_events.couple_id, point_events.user_id, point_events.source_user_id
  )
  select ins.couple_id, ins.source_user_id, f.name, ins.user_id, b.name
    from ins
    join public.profiles f on f.id = ins.source_user_id
    join public.profiles b on b.id = ins.user_id
$$;

-- Quiénes todavía no cargaron nada en una fecha (para los recordatorios).
create or replace function public.srv_pending_users(p_date date)
returns table (user_id uuid, name text, partner_name text)
language sql security definer set search_path = '' as $$
  select p.id, p.name, o.name
    from public.profiles p
    left join public.profiles o on o.couple_id = p.couple_id and o.id <> p.id
   where p.couple_id is not null
     and not exists (
       select 1 from public.meals ml
        where ml.user_id = p.id and ml.local_date = p_date
          and ml.review is distinct from 'rejected')
$$;

-- Arma (y guarda) el resumen semanal de cada pareja. La data queda para siempre; las fotos no.
create or replace function public.srv_weekly_summaries(p_week_start date)
returns table (couple_id uuid, data jsonb)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare c record; d jsonb; v_end date := p_week_start + 6;
begin
  for c in select distinct pr.couple_id as cid from public.profiles pr where pr.couple_id is not null loop
    select jsonb_build_object(
             'week_start', p_week_start,
             'week_end', v_end,
             'members', coalesce(jsonb_agg(s.m order by s.m->>'name'), '[]'::jsonb))
      into d
      from (
        select jsonb_build_object(
          'user_id', p.id,
          'name', p.name,
          'emoji', p.emoji,
          'days_ok', (select count(distinct ml.local_date) from public.meals ml
                       where ml.user_id = p.id and ml.local_date between p_week_start and v_end
                         and ml.review is distinct from 'rejected'),
          'fruits', (select count(*) from public.meals ml
                      where ml.user_id = p.id and ml.local_date between p_week_start and v_end
                        and ml.review is distinct from 'rejected' and ml.kind in ('fruta', 'ambas')),
          'veggies', (select count(*) from public.meals ml
                       where ml.user_id = p.id and ml.local_date between p_week_start and v_end
                         and ml.review is distinct from 'rejected' and ml.kind in ('verdura', 'ambas')),
          'points_week', (select coalesce(sum(pe.amount), 0) from public.point_events pe
                           where pe.user_id = p.id and pe.kind = 'miss'
                             and pe.ref_date between p_week_start and v_end),
          'balance', (select coalesce(sum(pe.amount), 0) from public.point_events pe where pe.user_id = p.id),
          'streak', (select st.current_streak from private.user_streaks(p.id, v_end) st),
          'best_streak', (select st.best_streak from private.user_streaks(p.id, v_end) st),
          'meals', (select coalesce(jsonb_agg(jsonb_build_object(
                              'date', ml.local_date, 'kind', ml.kind, 'description', ml.description,
                              'rejected', ml.review = 'rejected')
                            order by ml.local_date, ml.created_at), '[]'::jsonb)
                      from public.meals ml
                     where ml.user_id = p.id and ml.local_date between p_week_start and v_end)
        ) as m
        from public.profiles p where p.couple_id = c.cid
      ) s;

    insert into public.weekly_summaries (couple_id, week_start, data)
    values (c.cid, p_week_start, d)
    on conflict (couple_id, week_start) do update set data = excluded.data, created_at = now();

    couple_id := c.cid;
    data := d;
    return next;
  end loop;
end $$;

-- Fotos a borrar: las de comidas anteriores a p_before.
create or replace function public.srv_photos_to_cleanup(p_before date)
returns table (id uuid, photo_path text)
language sql security definer set search_path = '' as $$
  select ml.id, ml.photo_path from public.meals ml
   where ml.photo_path is not null and ml.local_date < p_before
   order by ml.local_date
   limit 1000
$$;

create or replace function public.srv_mark_photos_deleted(p_ids uuid[])
returns int
language sql security definer set search_path = '' as $$
  with u as (
    update public.meals set photo_path = null, photo_deleted_at = now()
     where id = any(p_ids) returning 1
  ) select count(*)::int from u
$$;

revoke execute on function public.srv_close_day, public.srv_pending_users, public.srv_weekly_summaries,
  public.srv_photos_to_cleanup, public.srv_mark_photos_deleted from public, anon, authenticated;
grant execute on function public.srv_close_day, public.srv_pending_users, public.srv_weekly_summaries,
  public.srv_photos_to_cleanup, public.srv_mark_photos_deleted to service_role;

-- ---------------------------------------------------------------------
-- Avisos en vivo: la base llama a la edge function "push"
-- ---------------------------------------------------------------------

create or replace function private.call_edge(p_action text, p_payload jsonb default '{}'::jsonb)
returns void
language plpgsql security definer set search_path = '' as $$
declare v_url text; v_secret text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'brote_project_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'brote_cron_secret';
  if v_url is null or v_secret is null then
    raise warning 'Brote: faltan los secretos en Vault (corré supabase/cron.sql)';
    return;
  end if;
  perform net.http_post(
    url := rtrim(v_url, '/') || '/functions/v1/push',
    body := jsonb_build_object('action', p_action) || p_payload,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_secret),
    timeout_milliseconds := 15000
  );
exception when others then
  raise warning 'Brote: no se pudo llamar a la edge function: %', sqlerrm;
end $$;
revoke execute on function private.call_edge from public, anon, authenticated;

create or replace function private.on_meal_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.call_edge('meal_created', jsonb_build_object('meal_id', new.id));
  return new;
end $$;

create or replace function private.on_meal_review() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.review is distinct from old.review and new.review is not null then
    perform private.call_edge('meal_reviewed', jsonb_build_object('meal_id', new.id));
  end if;
  return new;
end $$;

create or replace function private.on_redemption_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.call_edge('redemption_created', jsonb_build_object('redemption_id', new.id));
  return new;
end $$;

create or replace function private.on_redemption_update() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'cumplido' and old.status <> 'cumplido' then
    perform private.call_edge('redemption_fulfilled', jsonb_build_object('redemption_id', new.id));
  end if;
  return new;
end $$;

create trigger meals_notify_insert after insert on public.meals
  for each row execute function private.on_meal_insert();
create trigger meals_notify_review after update of review on public.meals
  for each row execute function private.on_meal_review();
create trigger redemptions_notify_insert after insert on public.redemptions
  for each row execute function private.on_redemption_insert();
create trigger redemptions_notify_update after update of status on public.redemptions
  for each row execute function private.on_redemption_update();

-- ---------------------------------------------------------------------
-- Storage: bucket privado de fotos. Ruta: {couple_id}/{user_id}/{archivo}.jpg
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('meal-photos', 'meal-photos', false, 5242880, array['image/jpeg', 'image/webp', 'image/png'])
on conflict (id) do nothing;

create policy "brote: ver fotos de la pareja" on storage.objects for select to authenticated
  using (bucket_id = 'meal-photos'
         and (storage.foldername(name))[1] = private.my_couple_id()::text);

create policy "brote: subir mis fotos" on storage.objects for insert to authenticated
  with check (bucket_id = 'meal-photos'
              and (storage.foldername(name))[1] = private.my_couple_id()::text
              and (storage.foldername(name))[2] = auth.uid()::text);

create policy "brote: borrar mis fotos" on storage.objects for delete to authenticated
  using (bucket_id = 'meal-photos'
         and (storage.foldername(name))[2] = auth.uid()::text);

-- ---------------------------------------------------------------------
-- Realtime para que el feed se actualice solo
-- ---------------------------------------------------------------------

alter publication supabase_realtime add table public.meals, public.redemptions, public.point_events;
