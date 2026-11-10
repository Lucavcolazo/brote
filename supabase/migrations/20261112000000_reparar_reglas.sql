-- =====================================================================
-- Brote: reparación. Deja puestas las reglas del día (20261108000000_reglas.sql) por si esa
-- migración no se corrió: el cierre de las 8:00 y la revisión de notas las necesitan.
-- Se puede correr las veces que quieras: no borra nada ni duplica nada.
-- =====================================================================

-- Hora local del cierre del día.
create or replace function private.grace_hour() returns int
language sql immutable as $$ select 8 $$;

-- Momento exacto en que se cierra un día: las 8:00 del día siguiente.
create or replace function private.day_closes_at(d date) returns timestamptz
language sql stable as $$
  select ((d + 1)::timestamp + make_interval(hours => private.grace_hour())) at time zone private.app_tz()
$$;

-- Margen de medianoche (de 20261110000000_margen_album_avisos.sql): hoy, o ayer hasta las 00:15.
create or replace function private.upload_grace() returns interval
language sql immutable as $$ select interval '15 minutes' $$;

create or replace function private.can_log_date(d date) returns boolean
language sql stable as $$
  select d = private.local_today()
      or (d = private.local_today() - 1
          and (now() at time zone private.app_tz())::time < time '00:00' + private.upload_grace())
$$;

-- Marca de "se aprobó sola".
alter table public.meals add column if not exists review_auto boolean not null default false;

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

-- El cierre corre a las 8:00 (11:00 UTC). Mismo nombre de tarea: se reemplaza, no se duplica.
do $$
begin
  perform cron.schedule('brote-cierre-del-dia', '0 11 * * *', $cron$ select private.call_edge('close_day') $cron$);
exception when others then
  raise notice 'Brote: no se pudo reprogramar el cierre (%). Corré supabase/cron.sql.', sqlerrm;
end $$;
