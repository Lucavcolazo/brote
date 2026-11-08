-- =====================================================================
-- Brote 🌱 — secretos + horarios automáticos
-- 1) Reemplazá los dos valores de abajo.
-- 2) Pegalo en Supabase > SQL Editor y ejecutalo.
-- Lo podés volver a correr cuando quieras: actualiza en lugar de duplicar.
-- =====================================================================

-- URL del proyecto (Project Settings > API) y el mismo CRON_SECRET que cargaste en la edge function.
do $$
declare
  v_url    text := 'https://mfwwcfqdjvhljtzdgfln.supabase.co';
  v_secret text := 'ebdd34c2df29dddd2ceab5f7b10b891fcf29ade4271f786ad3569845b895f0c3';
  v_id     uuid;
begin
  select id into v_id from vault.secrets where name = 'brote_project_url';
  if v_id is null then perform vault.create_secret(v_url, 'brote_project_url');
  else perform vault.update_secret(v_id, v_url); end if;

  select id into v_id from vault.secrets where name = 'brote_cron_secret';
  if v_id is null then perform vault.create_secret(v_secret, 'brote_cron_secret');
  else perform vault.update_secret(v_id, v_secret); end if;
end $$;

-- Los horarios de pg_cron van en UTC. Argentina = UTC-3 (sin horario de verano).

-- 12:30 ART todos los días: recordatorio a quien todavía no subió nada.
select cron.schedule('brote-recordatorio-mediodia', '30 15 * * *',
  $$ select private.call_edge('remind', '{"slot":"midday"}'::jsonb) $$);

-- 21:30 ART todos los días: última llamada.
select cron.schedule('brote-recordatorio-noche', '30 0 * * *',
  $$ select private.call_edge('remind', '{"slot":"night"}'::jsonb) $$);

-- 23:15 ART todos los días: último aviso (quedan 45 minutos; hay margen hasta las 00:15 para terminar de subir).
select cron.schedule('brote-recordatorio-ultimo', '15 2 * * *',
  $$ select private.call_edge('remind', '{"slot":"last"}'::jsonb) $$);

-- 19:00 ART todos los días: canjes sin cumplir hace 3 días o más.
select cron.schedule('brote-canjes-pendientes', '0 22 * * *',
  $$ select private.call_edge('remind_redemptions') $$);

-- 8:00 ART todos los días: se cierra el día anterior (lo que nadie revisó se aprueba solo) y se reparten los puntos.
select cron.schedule('brote-cierre-del-dia', '0 11 * * *',
  $$ select private.call_edge('close_day') $$);

-- Domingo 21:00 ART: resumen semanal con puntos y comidas.
select cron.schedule('brote-resumen-semanal', '0 0 * * 1',
  $$ select private.call_edge('weekly_summary') $$);

-- Miércoles 04:00 ART: se borran las fotos de las semanas ya resumidas (la data queda).
select cron.schedule('brote-limpiar-fotos', '0 7 * * 3',
  $$ select private.call_edge('cleanup_photos') $$);

-- Para revisar: select * from cron.job;  select * from cron.job_run_details order by start_time desc limit 20;
