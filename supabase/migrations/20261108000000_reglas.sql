-- =====================================================================
-- Brote: reglas del día.
--  - El día va de 00:00 a 00:00 (hora argentina). Solo se puede subir lo de hoy.
--  - A las 8:00 del día siguiente se cierra: las fotos que nadie revisó se aprueban solas,
--    y quien no tiene ninguna comida aprobada ese día le da 1 punto a su pareja.
--  - Hasta las 8:00 del día siguiente se puede aprobar o rechazar; después queda fijo.
-- Correr en Supabase > SQL Editor después de las migraciones anteriores.
-- =====================================================================

-- Hora local del cierre (la usa también el cron, ver abajo).
create or replace function private.grace_hour() returns int
language sql immutable as $$ select 8 $$;

-- Momento exacto en que se cierra un día: las 8:00 del día siguiente.
create or replace function private.day_closes_at(d date) returns timestamptz
language sql stable as $$
  select ((d + 1)::timestamp + make_interval(hours => private.grace_hour())) at time zone private.app_tz()
$$;

-- Solo se carga (y se borra) lo de hoy.
create or replace function private.can_log_date(d date) returns boolean
language sql stable as $$ select d = private.local_today() $$;

-- Marca de "se aprobó sola" para mostrarlo distinto en el feed.
alter table public.meals add column review_auto boolean not null default false;

create or replace function public.review_meal(p_meal uuid, p_verdict public.review_verdict)
returns void
language plpgsql security definer set search_path = '' as $$
declare v_date date;
begin
  select local_date into v_date from public.meals
   where id = p_meal
     and couple_id = private.my_couple_id()
     and user_id <> auth.uid();
  if v_date is null then raise exception 'cannot_review'; end if;
  if now() >= private.day_closes_at(v_date) then raise exception 'review_closed'; end if;

  update public.meals
     set review = p_verdict, review_auto = false, reviewed_at = now()
   where id = p_meal;
end $$;

-- La aprobación automática no le avisa a nadie como si la hubiera aprobado la pareja.
create or replace function private.on_meal_review() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.review is distinct from old.review and new.review is not null and not new.review_auto then
    perform private.call_edge('meal_reviewed', jsonb_build_object('meal_id', new.id));
  end if;
  return new;
end $$;

create or replace function public.srv_close_day(p_date date)
returns table (couple_id uuid, failed_user uuid, failed_name text, beneficiary uuid, beneficiary_name text)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
begin
  -- 1) Lo que nadie revisó, se aprueba solo.
  update public.meals m
     set review = 'ok', review_auto = true, reviewed_at = now()
   where m.local_date = p_date and m.review is null;

  -- 2) Quien no tiene ninguna comida aprobada ese día le da 1 punto a su pareja (una sola vez por día).
  return query
  with full_couples as (
    select pr.couple_id from public.profiles pr
     where pr.couple_id is not null
     group by pr.couple_id having count(*) = 2
  ),
  pairs as (
    select me.id as failed, o.id as partner, me.couple_id
      from public.profiles me
      join public.profiles o on o.couple_id = me.couple_id and o.id <> me.id
     where me.couple_id in (select fc.couple_id from full_couples fc)
       and p_date > (greatest(me.joined_at, o.joined_at) at time zone private.app_tz())::date
       and not exists (
         select 1 from public.meals ml
          where ml.user_id = me.id and ml.local_date = p_date and ml.review = 'ok')
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
    join public.profiles b on b.id = ins.user_id;
end $$;
revoke execute on function public.srv_close_day from public, anon, authenticated;
grant execute on function public.srv_close_day to service_role;

-- El cierre pasa de las 10:00 a las 8:00 (11:00 UTC). Mismo nombre de tarea: se reemplaza, no se duplica.
-- Si pg_cron no está (por ejemplo en las pruebas locales), esto se saltea sin romper nada.
do $$
begin
  perform cron.schedule('brote-cierre-del-dia', '0 11 * * *', $cron$ select private.call_edge('close_day') $cron$);
exception when others then
  raise notice 'Brote: no se pudo reprogramar el cierre (%). Corré supabase/cron.sql.', sqlerrm;
end $$;
