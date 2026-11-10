-- =====================================================================
-- Brote: notas de exámenes.
--  - Cada uno carga la nota (de 0 a 10) de un examen. La pareja la revisa: Vale o No cuenta.
--  - Si vale: 6 o más → +1 punto para quien la sacó; menos de 6 → +1 punto para su pareja.
--  - Igual que las comidas: se puede revisar (y cambiar) hasta las 8:00 del día siguiente a cargarla.
--    Lo que nadie revisó se aprueba solo en ese cierre.
-- Correr en Supabase > SQL Editor después de las migraciones anteriores.
-- =====================================================================

alter type public.point_kind add value if not exists 'exam';

-- Desde esta nota se aprueba.
create or replace function private.exam_pass_grade() returns numeric
language sql immutable as $$ select 6::numeric $$;

create table public.exams (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  couple_id   uuid not null default private.my_couple_id() references public.couples(id) on delete cascade,
  subject     text not null check (char_length(btrim(subject)) between 1 and 60),
  grade       numeric(3,1) not null check (grade between 0 and 10),
  local_date  date not null default private.local_today(), -- el día en que se cargó (para el cierre)
  review      public.review_verdict,
  review_auto boolean not null default false,
  reviewed_at timestamptz,
  created_at  timestamptz not null default now()
);
create index exams_couple_created_idx on public.exams (couple_id, created_at desc);

-- Cada nota da a lo sumo un punto. Se identifica por exam_id (no por kind, así el valor nuevo
-- del enum no se usa en esta misma transacción).
alter table public.point_events add column if not exists exam_id uuid references public.exams(id) on delete cascade;
create unique index if not exists point_events_one_per_exam on public.point_events (exam_id) where exam_id is not null;

-- ---------------------------------------------------------------------
-- Permisos
-- ---------------------------------------------------------------------

alter table public.exams enable row level security;
revoke insert, update, delete on public.exams from anon, authenticated;
grant insert (subject, grade) on public.exams to authenticated;
grant delete on public.exams to authenticated;

create policy "ver notas de la pareja" on public.exams for select to authenticated
  using (couple_id = private.my_couple_id());
create policy "cargar mis notas" on public.exams for insert to authenticated
  with check (user_id = auth.uid() and couple_id = private.my_couple_id() and local_date = private.local_today());
-- Solo las que todavía no dieron puntos (pendientes o rechazadas).
create policy "borrar mis notas sin puntos" on public.exams for delete to authenticated
  using (user_id = auth.uid() and review is distinct from 'ok');

-- ---------------------------------------------------------------------
-- Puntos
-- ---------------------------------------------------------------------

-- Deja el libro de puntos al día con la revisión de la nota: si vale, 1 punto
-- (para quien la sacó o para su pareja); si no, ninguno.
create or replace function private.settle_exam(p_exam uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare e public.exams; v_partner uuid;
begin
  select * into e from public.exams where id = p_exam;
  delete from public.point_events where exam_id = p_exam;
  if e.id is null or e.review is distinct from 'ok' then return; end if;
  select id into v_partner from public.profiles where couple_id = e.couple_id and id <> e.user_id;
  if v_partner is null then return; end if;
  insert into public.point_events (couple_id, user_id, amount, kind, source_user_id, ref_date, exam_id, note)
  values (e.couple_id,
          case when e.grade >= private.exam_pass_grade() then e.user_id else v_partner end,
          1, 'exam', e.user_id, e.local_date, e.id,
          'Nota: ' || e.subject || ' (' || e.grade || ')');
end $$;
revoke execute on function private.settle_exam from public, anon, authenticated;

create or replace function public.review_exam(p_exam uuid, p_verdict public.review_verdict)
returns void
language plpgsql security definer set search_path = '' as $$
declare e public.exams;
begin
  select * into e from public.exams where id = p_exam and couple_id = private.my_couple_id();
  if e.id is null then raise exception 'exam_not_found'; end if;
  if e.user_id = auth.uid() then raise exception 'own_exam'; end if;
  if now() >= private.day_closes_at(e.local_date) then raise exception 'review_closed'; end if;
  perform pg_advisory_xact_lock(hashtext('brote-exam-' || p_exam::text));

  update public.exams
     set review = p_verdict, review_auto = false, reviewed_at = now()
   where id = p_exam;
  perform private.settle_exam(p_exam);
end $$;
revoke execute on function public.review_exam from public, anon;
grant execute on function public.review_exam to authenticated;

-- En el cierre de las 8:00: las notas que nadie revisó se aprueban solas y dan su punto.
create or replace function private.close_exams(p_date date) returns void
language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  for r in
    update public.exams
       set review = 'ok', review_auto = true, reviewed_at = now()
     where local_date <= p_date and review is null
    returning id
  loop
    perform private.settle_exam(r.id);
  end loop;
end $$;
revoke execute on function private.close_exams from public, anon, authenticated;

-- El mismo cierre del día de antes, con las notas sumadas al principio.
create or replace function public.srv_close_day(p_date date)
returns table (couple_id uuid, failed_user uuid, failed_name text, beneficiary uuid, beneficiary_name text)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
begin
  -- 0) Las notas que nadie revisó, se aprueban solas.
  perform private.close_exams(p_date);

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

-- ---------------------------------------------------------------------
-- Avisos: nota nueva (a la pareja) y nota revisada (a quien la cargó)
-- ---------------------------------------------------------------------

create or replace function private.on_exam_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.call_edge('exam_created', jsonb_build_object('exam_id', new.id));
  return new;
end $$;

create or replace function private.on_exam_review() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.review is distinct from old.review and new.review is not null and not new.review_auto then
    perform private.call_edge('exam_reviewed', jsonb_build_object('exam_id', new.id));
  end if;
  return new;
end $$;

create trigger exams_notify_insert after insert on public.exams
  for each row execute function private.on_exam_insert();
create trigger exams_notify_review after update of review on public.exams
  for each row execute function private.on_exam_review();

alter publication supabase_realtime add table public.exams;
