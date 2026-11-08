-- =====================================================================
-- Brote: cada uno tiene su lista de premios.
--  - Lo que cargo yo son prendas que ofrezco: solo yo las edito o las saco.
--  - Mi pareja las ve y las canjea con sus puntos; yo las cumplo.
--  - Nadie puede canjear sus propios premios.
-- Correr en Supabase > SQL Editor después de las migraciones anteriores.
-- =====================================================================

-- Cargar: siempre a mi nombre.
drop policy if exists "agregar a la tienda" on public.store_items;
create policy "agregar a mi lista" on public.store_items for insert to authenticated
  with check (couple_id = private.my_couple_id() and created_by = auth.uid());

-- Editar o sacar: solo lo mío.
drop policy if exists "editar la tienda" on public.store_items;
create policy "editar mi lista" on public.store_items for update to authenticated
  using (couple_id = private.my_couple_id() and created_by = auth.uid())
  with check (couple_id = private.my_couple_id() and created_by = auth.uid());

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
  if v_item.created_by = auth.uid() then raise exception 'own_item'; end if;

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
revoke execute on function public.redeem_item from public, anon;
grant execute on function public.redeem_item to authenticated;
