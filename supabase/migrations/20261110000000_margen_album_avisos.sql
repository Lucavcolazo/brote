-- =====================================================================
-- Brote: margen de medianoche, álbum y avisos nuevos.
--  - Una foto sacada antes de las 00:00 se puede terminar de subir hasta las 00:15
--    (por si no había señal o tardó). Cuenta para el día en que se sacó.
--  - Álbum: cada fruta o verdura distinta que comió cada uno, sacada de la descripción.
--  - Dos avisos más: 23:15 (último aviso del día) y 19:00 (canjes sin cumplir hace 3 días o más).
-- Correr en Supabase > SQL Editor después de las migraciones anteriores.
-- =====================================================================

create or replace function private.upload_grace() returns interval
language sql immutable as $$ select interval '15 minutes' $$;

-- Hoy, o ayer si todavía no pasaron los primeros 15 minutos del día.
create or replace function private.can_log_date(d date) returns boolean
language sql stable as $$
  select d = private.local_today()
      or (d = private.local_today() - 1
          and (now() at time zone private.app_tz())::time < time '00:00' + private.upload_grace())
$$;

-- ---------------------------------------------------------------------
-- Álbum
-- ---------------------------------------------------------------------

-- Pasa "Dos Limones" → "limon", "frutillas" → "frutilla", "tomates" → "tomate".
create or replace function private.album_key(piece text) returns text
language sql immutable as $$
  with w as (
    select regexp_replace(
             lower(btrim(translate(piece, 'ÁÉÍÓÚÀÂÊÔÃÕÇÜáéíóúàâêôãõçü', 'AEIOUAAEOAOCUaeiouaaeoaocu'))),
             '^((un|una|unos|unas|um|uma|uns|umas|dos|tres|media|medio|meia|meio|[0-9]+)\s+)+', '') as w
  )
  select case
           when w ~ '[nlrdz]es$' then left(w, -2)
           when w ~ '[^s]s$' and length(w) > 3 then left(w, -1)
           else w
         end
    from w
$$;

create or replace function public.couple_album()
returns table (user_id uuid, item text, label text, times int, first_date date)
language sql stable security definer set search_path = '' as $$
  with pieces as (
    select m.user_id, m.local_date, m.created_at,
           btrim(p) as piece
      from public.meals m,
           regexp_split_to_table(m.description, '\s*(,|\+|/|;|\s+y\s+|\s+e\s+|\s+con\s+|\s+com\s+)\s*', 'i') as p
     where m.couple_id = private.my_couple_id()
       and m.review is distinct from 'rejected'
       and coalesce(btrim(m.description), '') <> ''
  ),
  keyed as (
    select pieces.*, private.album_key(piece) as k from pieces
  )
  select k.user_id, k.k,
         (array_agg(k.piece order by k.created_at desc))[1],
         count(*)::int,
         min(k.local_date)
    from keyed k
   where length(k.k) >= 2
   group by k.user_id, k.k
   order by min(k.local_date), k.k
$$;
revoke execute on function public.couple_album from public, anon;
grant execute on function public.couple_album to authenticated;

-- ---------------------------------------------------------------------
-- Horarios nuevos (en UTC; Argentina = UTC-3). Mismo nombre = se reemplaza.
-- ---------------------------------------------------------------------
do $$
begin
  perform cron.schedule('brote-recordatorio-ultimo', '15 2 * * *',
    $cron$ select private.call_edge('remind', '{"slot":"last"}'::jsonb) $cron$);
  perform cron.schedule('brote-canjes-pendientes', '0 22 * * *',
    $cron$ select private.call_edge('remind_redemptions') $cron$);
exception when others then
  raise notice 'Brote: no se pudieron programar los avisos (%). Corré supabase/cron.sql.', sqlerrm;
end $$;
