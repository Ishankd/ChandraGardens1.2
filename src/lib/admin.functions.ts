import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = {
  supabase: any;
  userId: string;
};

async function requireAdmin(ctx: Ctx) {
  const { data, error } = await ctx.supabase
    .from("profiles")
    .select("role")
    .eq("id", ctx.userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (data?.role !== "admin") {
    throw new Error("Admin access required.");
  }
}

const productSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2000).default(""),
  categoryId: z.string().uuid().nullable(),
  price: z.number().min(0),
  stock: z.number().int().min(0),
  image: z.string().trim().max(2000).nullable(),
  featured: z.boolean(),
  available: z.boolean(),
  sunlight: z.string().trim().max(120).nullable(),
  watering: z.string().trim().max(120).nullable(),
  soil: z.string().trim().max(120).nullable(),
  difficulty: z.enum(["easy", "medium", "hard"]),
});

const productIdSchema = z.object({
  id: z.string().uuid(),
});

export const adminGetProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as Ctx;
    await requireAdmin(ctx);

    const { data, error } = await ctx.supabase
      .from("products")
      .select(
        "id,name,slug,description,category_id,price,stock,image,featured,available,sunlight,watering,soil,difficulty,created_at,updated_at,categories(name)",
      )
      .order("updated_at", { ascending: false });

    if (error) throw new Error(error.message);

    return (data ?? []).map((p: any) => ({
      ...p,
      price: Number(p.price),
      categoryName: p.categories?.name ?? null,
    }));
  });

export const adminGetCategories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as Ctx;
    await requireAdmin(ctx);

    const { data, error } = await ctx.supabase
      .from("categories")
      .select("id,name,slug,image")
      .order("name");

    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminGetCoverSizes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as Ctx;
    await requireAdmin(ctx);

    const { data, error } = await ctx.supabase
      .from("cover_sizes")
      .select("id,label,price_delta,sort_order,active,created_at")
      .order("sort_order")
      .order("label");

    if (error) throw new Error(error.message);

    return (data ?? []).map((c: any) => ({
      ...c,
      price_delta: Number(c.price_delta),
    }));
  });

export const adminGetOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as Ctx;
    await requireAdmin(ctx);

    const { data, error } = await ctx.supabase
      .from("orders")
      .select(
        "id,order_number,customer_name,email,phone,address,locality,city,state,pincode,delivery_instructions,subtotal,delivery_charge,total,payment_status,order_status,created_at,order_items(product_name,cover_size,quantity,unit_price,line_total)",
      )
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    return (data ?? []).map((o: any) => ({
      ...o,
      subtotal: Number(o.subtotal),
      delivery_charge: Number(o.delivery_charge),
      total: Number(o.total),
    }));
  });

export const adminCreateProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(productSchema)
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    await requireAdmin(ctx);

    const { data: product, error } = await ctx.supabase
      .from("products")
      .insert({
        name: data.name,
        slug: data.slug,
        description: data.description,
        category_id: data.categoryId,
        price: data.price,
        stock: data.stock,
        image: data.image,
        featured: data.featured,
        available: data.available,
        sunlight: data.sunlight,
        watering: data.watering,
        soil: data.soil,
        difficulty: data.difficulty,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    return product;
  });

export const adminUpdateProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(productSchema.extend({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    await requireAdmin(ctx);

    const { error } = await ctx.supabase
      .from("products")
      .update({
        name: data.name,
        slug: data.slug,
        description: data.description,
        category_id: data.categoryId,
        price: data.price,
        stock: data.stock,
        image: data.image,
        featured: data.featured,
        available: data.available,
        sunlight: data.sunlight,
        watering: data.watering,
        soil: data.soil,
        difficulty: data.difficulty,
      })
      .eq("id", data.id);

    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(productIdSchema)
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    await requireAdmin(ctx);

    const { error } = await ctx.supabase
      .from("products")
      .delete()
      .eq("id", data.id);

    if (error) throw new Error(error.message);
    return { ok: true };
  });

const categorySchema = z.object({
  name: z.string().trim().min(1).max(100),
  slug: z.string().trim().min(1).max(120),
  image: z.string().trim().max(2000).nullable(),
});

export const adminCreateCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(categorySchema)
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    await requireAdmin(ctx);

    const { data: category, error } = await ctx.supabase
      .from("categories")
      .insert(data)
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    return category;
  });

const coverSchema = z.object({
  label: z.string().trim().min(1).max(80),
  priceDelta: z.number().min(0),
  sortOrder: z.number().int().min(0),
  active: z.boolean(),
});

export const adminCreateCoverSize = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(coverSchema)
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    await requireAdmin(ctx);

    const { data: cover, error } = await ctx.supabase
      .from("cover_sizes")
      .insert({
        label: data.label,
        price_delta: data.priceDelta,
        sort_order: data.sortOrder,
        active: data.active,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    return cover;
  });

export const adminUpdateCoverSize = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(coverSchema.extend({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    await requireAdmin(ctx);

    const { error } = await ctx.supabase
      .from("cover_sizes")
      .update({
        label: data.label,
        price_delta: data.priceDelta,
        sort_order: data.sortOrder,
        active: data.active,
      })
      .eq("id", data.id);

    if (error) throw new Error(error.message);
    return { ok: true };
  });

const orderStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum([
    "placed",
    "confirmed",
    "packed",
    "shipped",
    "delivered",
    "cancelled",
  ]),
});

export const adminUpdateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(orderStatusSchema)
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    await requireAdmin(ctx);

    const { error } = await ctx.supabase
      .from("orders")
      .update({ order_status: data.status })
      .eq("id", data.id);

    if (error) throw new Error(error.message);
    return { ok: true };
  });
