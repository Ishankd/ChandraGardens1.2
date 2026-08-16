import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type ProductVariant = {
  id: string;
  coverSizeId: string;
  coverSizeLabel: string;
  price: number;
  stock: number;
  available: boolean;
};

export type ShopProduct = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  stock: number;
  image: string | null;
  featured: boolean;
  sunlight: string | null;
  watering: string | null;
  soil: string | null;
  difficulty: "Easy" | "Medium" | "Hard";
  category: string | null;
  variants: ProductVariant[];
};

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export type CoverSize = { id: string; label: string; priceDelta: number };

export const listCoverSizes = createServerFn({ method: "GET" }).handler(async (): Promise<CoverSize[]> => {
  const supabase = publicClient();
  const { data, error } = await supabase.from("cover_sizes").select("id,label,price_delta").eq("active", true).order("sort_order");
  if (error) throw new Error(error.message);
  return (data ?? []).map((c) => ({ id: c.id, label: c.label, priceDelta: Number(c.price_delta) }));
});

export const listProducts = createServerFn({ method: "GET" }).handler(async (): Promise<ShopProduct[]> => {
  const supabase = publicClient() as any;
  const { data, error } = await supabase
    .from("products")
    .select("id,name,slug,description,price,stock,image,featured,sunlight,watering,soil,difficulty,categories(name)")
    .eq("available", true)
    .order("featured", { ascending: false })
    .order("name");
  if (error) throw new Error(error.message);

  const products = data ?? [];
  const ids = products.map((p: any) => p.id);
  const { data: variants, error: variantError } = ids.length
    ? await supabase
        .from("product_variants")
        .select("id,product_id,cover_size_id,cover_size,price,stock,available,cover_sizes(label,active,sort_order)")
        .in("product_id", ids)
        .eq("available", true)
        .eq("cover_sizes.active", true)
    : { data: [], error: null };
  if (variantError) throw new Error(variantError.message);

  const byProduct = new Map<string, ProductVariant[]>();
  for (const v of variants ?? []) {
    const list = byProduct.get(v.product_id) ?? [];
    list.push({
      id: v.id,
      coverSizeId: v.cover_size_id,
      coverSizeLabel: v.cover_sizes?.label ?? v.cover_size,
      price: Number(v.price),
      stock: Number(v.stock),
      available: Boolean(v.available),
    });
    byProduct.set(v.product_id, list);
  }

  return products.map((p: any) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    price: Number(p.price),
    stock: Number(p.stock),
    image: p.image,
    featured: p.featured,
    sunlight: p.sunlight,
    watering: p.watering,
    soil: p.soil,
    difficulty: p.difficulty,
    category: p.categories?.name ?? null,
    variants: byProduct.get(p.id) ?? [],
  }));
});
