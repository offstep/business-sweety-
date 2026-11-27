-- Migration 4 : commandes sécurisées (calculs et stock côté base de données).
-- Le navigateur n'envoie QUE : client, zone, code promo, produits/quantités/choix.
-- Prix, promotions, livraison, stock et total sont recalculés ici : le navigateur n'a jamais le dernier mot.

create or replace function public.create_order(p jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_name text := left(trim(coalesce(p->'customer'->>'name', '')), 120);
  v_phone text := regexp_replace(coalesce(p->'customer'->>'phone', ''), '[^0-9]', '', 'g');
  v_city text := left(trim(coalesce(p->'customer'->>'city', '')), 80);
  v_district text := left(trim(coalesce(p->'customer'->>'district', '')), 80);
  v_notes text := nullif(left(trim(coalesce(p->'customer'->>'address', '')), 300), '');
  v_zone delivery_zones%rowtype;
  v_item jsonb; v_sel jsonb; v_opts jsonb; v_sopts jsonb; v_sups jsonb; v_chosen text;
  prod products%rowtype; ot option_types%rowtype; sp supplements%rowtype; sot supplement_option_types%rowtype;
  v_qty int; v_sup int; v_line int;
  v_lines jsonb := '[]'::jsonb; v_gifts jsonb := '[]'::jsonb;
  v_subtotal int := 0; v_discount int := 0; v_best int := 0; v_free boolean := false; v_any boolean := false;
  v_promo uuid; v_code uuid;
  pr promotions%rowtype; v_qtysum int; v_amt int; v_metric int; v_val int;
  pc promo_codes%rowtype;
  v_fee int; v_total int; v_cust uuid; v_ord orders%rowtype; l jsonb;
begin
  if char_length(v_name) < 2 then raise exception 'Nom invalide'; end if;
  if char_length(v_phone) not between 8 and 15 then raise exception 'Numéro de téléphone invalide'; end if;
  if v_city = '' or v_district = '' then raise exception 'La ville et le quartier sont obligatoires'; end if;

  select * into v_zone from delivery_zones where id = nullif(p->>'zone_id', '')::uuid and is_active;
  if not found then raise exception 'Zone de livraison invalide'; end if;

  if jsonb_typeof(p->'items') is distinct from 'array' or jsonb_array_length(p->'items') not between 1 and 50 then
    raise exception 'Panier invalide';
  end if;

  for v_item in select * from jsonb_array_elements(p->'items') loop
    v_qty := (v_item->>'qty')::int;
    if v_qty is null or v_qty < 1 or v_qty > 99 then raise exception 'Quantité invalide'; end if;

    select * into prod from products where id = (v_item->>'product_id')::uuid and is_active for update;
    if not found then raise exception 'Un produit du panier n''est plus disponible'; end if;
    if prod.stock < v_qty then raise exception 'Stock insuffisant pour %', prod.name; end if;

    v_opts := '{}'::jsonb;
    for ot in select * from option_types where product_id = prod.id loop
      v_chosen := v_item->'options'->>ot.name;
      if v_chosen is null or not exists (select 1 from option_values ov where ov.option_type_id = ot.id and ov.label = v_chosen) then
        raise exception 'Choisis % pour %', ot.name, prod.name;
      end if;
      v_opts := v_opts || jsonb_build_object(ot.name, v_chosen);
    end loop;

    v_sup := 0; v_sups := '[]'::jsonb;
    for sp in select * from supplements where product_id = prod.id and is_active loop
      select e into v_sel from jsonb_array_elements(coalesce(v_item->'supplements', '[]'::jsonb)) e where e->>'id' = sp.id::text limit 1;
      if v_sel is null then
        if sp.is_required then raise exception '% est obligatoire', sp.name; end if;
        continue;
      end if;
      v_sopts := '{}'::jsonb;
      for sot in select * from supplement_option_types where supplement_id = sp.id loop
        v_chosen := v_sel->'options'->>sot.name;
        if v_chosen is null or not (v_chosen = any (sot."values")) then raise exception 'Choisis % pour %', sot.name, sp.name; end if;
        v_sopts := v_sopts || jsonb_build_object(sot.name, v_chosen);
      end loop;
      v_sup := v_sup + sp.price;
      v_sups := v_sups || jsonb_build_array(jsonb_build_object('id', sp.id, 'name', sp.name, 'price', sp.price, 'options', v_sopts));
    end loop;

    v_line := (prod.price + v_sup) * v_qty;
    v_subtotal := v_subtotal + v_line;
    v_lines := v_lines || jsonb_build_array(jsonb_build_object('product_id', prod.id, 'name', prod.name, 'unit', prod.price,
      'qty', v_qty, 'line', v_line, 'options', v_opts, 'supplements', v_sups));
    update products set stock = stock - v_qty where id = prod.id;      -- stock vérifié et réservé au moment de la commande
  end loop;

  -- Promotions automatiques (une seule réduction : la plus avantageuse)
  for pr in select * from promotions where is_active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at >= now()) loop
    select coalesce(sum((x->>'qty')::int), 0), coalesce(sum((x->>'line')::int), 0) into v_qtysum, v_amt
      from jsonb_array_elements(v_lines) x
      where pr.applies_to_all or exists (select 1 from promotion_products pp where pp.promotion_id = pr.id and pp.product_id = (x->>'product_id')::uuid);
    v_metric := case when pr.threshold_kind = 'quantity' then v_qtysum else v_amt end;
    if v_metric >= pr.threshold then
      v_any := true;
      if pr.type in ('quantity_discount', 'amount_discount') then
        v_val := round(v_amt * pr.discount_percent / 100.0)::int;
        if v_val > v_best then v_best := v_val; v_promo := pr.id; end if;
      elsif pr.type = 'free_shipping' then v_free := true;
      elsif pr.type = 'gift' and pr.gift_product_id is not null then
        v_gifts := v_gifts || jsonb_build_array((select name from products where id = pr.gift_product_id));
      end if;
    end if;
  end loop;
  v_discount := v_best;

  -- Code promo : accepté seulement si aucune promotion automatique ne s'applique
  if not v_any and nullif(trim(coalesce(p->>'code', '')), '') is not null then
    select * into pc from promo_codes
      where upper(code) = upper(trim(p->>'code')) and is_active
        and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at >= now())
        and (max_uses is null or uses < max_uses) for update;
    if not found then raise exception 'Code promo invalide ou expiré'; end if;
    if v_subtotal < pc.min_amount then raise exception 'Montant minimum non atteint pour ce code'; end if;
    v_discount := least(v_subtotal, case when pc.discount_percent is not null
      then round(v_subtotal * pc.discount_percent / 100.0)::int else coalesce(pc.discount_amount, 0) end);
    update promo_codes set uses = uses + 1 where id = pc.id;
    v_code := pc.id;
  end if;

  v_fee := case when v_free then 0 else v_zone.fee end;
  v_total := v_subtotal - v_discount + v_fee;

  insert into customers (full_name, phone, city) values (v_name, v_phone, v_city)
    on conflict (phone) do update set full_name = excluded.full_name, city = excluded.city
    returning id into v_cust;

  insert into orders (customer_id, full_name, phone, city, district, address_notes, delivery_zone_id,
                      subtotal, discount_total, shipping_fee, total, promotion_id, promo_code_id, payment_status)
  values (v_cust, v_name, v_phone, v_city, v_district, v_notes, v_zone.id,
          v_subtotal, v_discount, v_fee, v_total, v_promo, v_code, 'unpaid_whatsapp')
  returning * into v_ord;

  for l in select * from jsonb_array_elements(v_lines) loop
    insert into order_items (order_id, product_id, product_name, unit_price, quantity, options, supplements, line_total)
    values (v_ord.id, (l->>'product_id')::uuid, l->>'name', (l->>'unit')::int, (l->>'qty')::int, l->'options', l->'supplements', (l->>'line')::int);
  end loop;
  for l in select * from jsonb_array_elements(v_gifts) loop
    insert into order_items (order_id, product_id, product_name, unit_price, quantity, options, supplements, line_total)
    values (v_ord.id, null, 'Cadeau : ' || (l #>> '{}'), 0, 1, '{}', '[]', 0);
  end loop;

  return jsonb_build_object('order_number', v_ord.order_number, 'total', v_total);
end $$;

-- Lecture d'UNE commande : il faut connaître le numéro de commande ET le téléphone.
create or replace function public.get_order(p_number text, p_phone text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare o orders%rowtype;
begin
  select * into o from orders where order_number = p_number
    and regexp_replace(phone, '[^0-9]', '', 'g') = regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
  if not found then return null; end if;
  return jsonb_build_object('order_number', o.order_number, 'status', o.status, 'payment_status', o.payment_status,
    'full_name', o.full_name, 'phone', o.phone, 'city', o.city, 'district', o.district, 'address_notes', o.address_notes,
    'subtotal', o.subtotal, 'discount_total', o.discount_total, 'shipping_fee', o.shipping_fee, 'total', o.total, 'created_at', o.created_at,
    'items', coalesce((select jsonb_agg(jsonb_build_object('name', i.product_name, 'unit_price', i.unit_price, 'quantity', i.quantity,
      'options', i.options, 'supplements', i.supplements, 'line_total', i.line_total)) from order_items i where i.order_id = o.id), '[]'::jsonb));
end $$;

-- Changement de statut par l'administratrice (annulation = le stock est remis).
create or replace function public.admin_set_order_status(p_order uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
declare o orders%rowtype; i order_items%rowtype;
begin
  if not public.is_admin() then raise exception 'Accès refusé'; end if;
  if p_status not in ('new', 'preparing', 'shipped', 'delivered', 'cancelled') then raise exception 'Statut invalide'; end if;
  select * into o from orders where id = p_order for update;
  if not found then raise exception 'Commande introuvable'; end if;
  if p_status = 'cancelled' and o.status <> 'cancelled' then
    for i in select * from order_items where order_id = o.id and product_id is not null loop
      update products set stock = stock + i.quantity where id = i.product_id;
    end loop;
  elsif o.status = 'cancelled' and p_status <> 'cancelled' then
    for i in select * from order_items where order_id = o.id and product_id is not null loop
      update products set stock = stock - i.quantity where id = i.product_id;   -- échoue si le stock est insuffisant
    end loop;
  end if;
  update orders set status = p_status where id = o.id;
end $$;

revoke all on function public.create_order(jsonb), public.get_order(text, text), public.admin_set_order_status(uuid, text) from public;
grant execute on function public.create_order(jsonb), public.get_order(text, text) to anon, authenticated;
grant execute on function public.admin_set_order_status(uuid, text) to authenticated;
