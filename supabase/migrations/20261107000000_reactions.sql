-- =====================================================================
-- Brote: reacciones a las fotos del feed.
-- Cada persona deja una reacción por foto (tocar otra la cambia, tocar la misma la saca).
-- Correr en Supabase > SQL Editor después de 20261106000000_brote.sql.
-- =====================================================================

create table public.meal_reactions (
  meal_id    uuid not null references public.meals(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  couple_id  uuid not null references public.couples(id) on delete cascade,
  emoji      text not null check (char_length(emoji) between 1 and 16),
  created_at timestamptz not null default now(),
  primary key (meal_id, user_id)
);
create index meal_reactions_couple_idx on public.meal_reactions (couple_id);

alter table public.meal_reactions enable row level security;
revoke insert, update, delete on public.meal_reactions from anon, authenticated;

create policy "ver reacciones de la pareja" on public.meal_reactions for select to authenticated
  using (couple_id = private.my_couple_id());

-- Reaccionar: p_emoji null (o el mismo que ya tenías) saca la reacción.
create or replace function public.react_meal(p_meal uuid, p_emoji text default null)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_couple uuid := private.my_couple_id();
  v_prev   text;
begin
  if auth.uid() is null or v_couple is null then raise exception 'not_in_couple'; end if;
  if not exists (select 1 from public.meals where id = p_meal and couple_id = v_couple) then
    raise exception 'meal_not_found';
  end if;

  select emoji into v_prev from public.meal_reactions where meal_id = p_meal and user_id = auth.uid();

  if p_emoji is null or btrim(p_emoji) = '' or p_emoji = v_prev then
    delete from public.meal_reactions where meal_id = p_meal and user_id = auth.uid();
    return null;
  end if;

  if char_length(p_emoji) > 16 then raise exception 'bad_reaction'; end if;

  insert into public.meal_reactions (meal_id, user_id, couple_id, emoji)
  values (p_meal, auth.uid(), v_couple, p_emoji)
  on conflict (meal_id, user_id) do update set emoji = excluded.emoji, created_at = now();
  return p_emoji;
end $$;
revoke execute on function public.react_meal from public, anon;
grant execute on function public.react_meal to authenticated;

-- Aviso push al dueño de la foto (solo la primera reacción, cambiarla no vuelve a avisar).
create or replace function private.on_reaction_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.meals where id = new.meal_id and user_id <> new.user_id) then
    perform private.call_edge('meal_reacted', jsonb_build_object('meal_id', new.meal_id, 'user_id', new.user_id));
  end if;
  return new;
end $$;

create trigger meal_reactions_notify after insert on public.meal_reactions
  for each row execute function private.on_reaction_insert();

alter publication supabase_realtime add table public.meal_reactions;
