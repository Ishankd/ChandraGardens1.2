create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),

  product_id uuid not null
    references public.products(id)
    on delete cascade,

  cover_size text not null,

  price numeric(10,2) not null
    check (price >= 0),

  stock integer not null default 0
    check (stock >= 0),

  available boolean not null default true,

  created_at timestamptz not null default now(),

  unique (product_id, cover_size)
);

alter table public.cart_items
add column if not exists variant_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'cart_items_variant_id_fkey'
  ) then
    alter table public.cart_items
      add constraint cart_items_variant_id_fkey
      foreign key (variant_id)
      references public.product_variants(id)
      on delete cascade;
  end if;
end $$;

create index if not exists cart_items_variant_id_idx
on public.cart_items(variant_id);