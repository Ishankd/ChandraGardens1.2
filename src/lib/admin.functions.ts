import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type AdminContext = {
  supabase: any;
  userId: string;
};

async function requireAdmin(ctx: AdminContext) {
  const { data, error } = await ctx.supabase
    .from("profiles")
    .select("role")
    .eq("id", ctx.userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (data?.role !== "admin") {
    throw new Error("Admin access required.");
  }
}

/* =====================================================
   PRODUCTS
===================================================== */

const productSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2000),
  categoryId: z.string().uuid().nullable(),
  price: z.number().min(0),
  stock: z.number().int().min(0),
  image: z.string().trim().max(2000),
  featured: z.boolean(),
  available: z.boolean(),
  sunlight: z.string().trim().max(120),
  watering: z.string().trim().max(120),
  soil: z.string().trim().max(120),
  difficulty: z.enum(["easy", "medium", "hard"]),
});

export const adminGetProducts = createServerFn({
  method: "GET",
})
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as AdminContext;

    await requireAdmin(ctx);

    const { data, error } = await ctx.supabase
      .from("products")
      .select(`
        id,
        name,
        slug,
        description,
        category_id,
        price,
        stock,
        image,
        featured,
        available,
        sunlight,
        watering,
        soil,
        difficulty,
        created_at,
        updated_at,
        categories(name)
      `)
      .order("updated_at", {
        ascending: false,
      });

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []).map((product: any) => ({
      ...product,
      price: Number(product.price),
      stock: Number(product.stock),
      categoryName: product.categories?.name ?? null,
    }));
  });

export const adminCreateProduct = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .inputValidator(productSchema)
  .handler(async ({ data, context }) => {
    const ctx = context as AdminContext;

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

    if (error) {
      throw new Error(error.message);
    }

    return product;
  });

export const adminUpdateProduct = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .inputValidator(
    productSchema.extend({
      id: z.string().uuid(),
    }),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as AdminContext;

    await requireAdmin(ctx);

    const { id, ...productData } = data;

    const { error } = await ctx.supabase
      .from("products")
      .update({
        name: productData.name,
        slug: productData.slug,
        description: productData.description,
        category_id: productData.categoryId,
        price: productData.price,
        stock: productData.stock,
        image: productData.image,
        featured: productData.featured,
        available: productData.available,
        sunlight: productData.sunlight,
        watering: productData.watering,
        soil: productData.soil,
        difficulty: productData.difficulty,
      })
      .eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    return { ok: true };
  });

export const adminDeleteProduct = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      id: z.string().uuid(),
    }),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as AdminContext;

    await requireAdmin(ctx);

    const { error } = await ctx.supabase
      .from("products")
      .delete()
      .eq("id", data.id);

    if (error) {
      throw new Error(
        `Could not delete product: ${error.message}`,
      );
    }

    return { ok: true };
  });

/* =====================================================
   CATEGORIES
===================================================== */

export const adminGetCategories = createServerFn({
  method: "GET",
})
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as AdminContext;

    await requireAdmin(ctx);

    const { data, error } = await ctx.supabase
      .from("categories")
      .select("id,name,slug")
      .order("name");

    if (error) {
      throw new Error(error.message);
    }

    return data ?? [];
  });

/* =====================================================
   COVER SIZES
===================================================== */

const coverSizeSchema = z.object({
  label: z.string().trim().min(1).max(80),
  priceDelta: z.number().min(0),
  sortOrder: z.number().int().min(0),
  active: z.boolean(),
});

export const adminGetCoverSizes = createServerFn({
  method: "GET",
})
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as AdminContext;

    await requireAdmin(ctx);

    const { data, error } = await ctx.supabase
      .from("cover_sizes")
      .select(`
        id,
        label,
        price_delta,
        sort_order,
        active,
        created_at
      `)
      .order("sort_order")
      .order("label");

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []).map((cover: any) => ({
      ...cover,
      price_delta: Number(cover.price_delta),
      sort_order: Number(cover.sort_order),
    }));
  });

export const adminCreateCoverSize = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .inputValidator(coverSizeSchema)
  .handler(async ({ data, context }) => {
    const ctx = context as AdminContext;

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

    if (error) {
      throw new Error(error.message);
    }

    return cover;
  });

export const adminUpdateCoverSize = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .inputValidator(
    coverSizeSchema.extend({
      id: z.string().uuid(),
    }),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as AdminContext;

    await requireAdmin(ctx);

    const {
      id,
      label,
      priceDelta,
      sortOrder,
      active,
    } = data;

    const { error } = await ctx.supabase
      .from("cover_sizes")
      .update({
        label,
        price_delta: priceDelta,
        sort_order: sortOrder,
        active,
      })
      .eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    return { ok: true };
  });

export const adminDeleteCoverSize = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      id: z.string().uuid(),
    }),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as AdminContext;

    await requireAdmin(ctx);

    const { error } = await ctx.supabase
      .from("cover_sizes")
      .delete()
      .eq("id", data.id);

    if (error) {
      throw new Error(
        `Could not delete cover size: ${error.message}`,
      );
    }

    return { ok: true };
  });

/* =====================================================
   ORDERS
===================================================== */

export const adminGetOrders = createServerFn({
  method: "GET",
})
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as AdminContext;

    await requireAdmin(ctx);

    const { data, error } = await ctx.supabase
      .from("orders")
      .select(`
        id,
        order_number,
        customer_name,
        email,
        phone,
        address,
        locality,
        city,
        state,
        pincode,
        delivery_instructions,
        subtotal,
        delivery_charge,
        total,
        payment_status,
        order_status,
        created_at,
        order_items(
          product_name,
          cover_size,
          quantity,
          unit_price,
          line_total
        )
      `)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []).map((order: any) => ({
      ...order,
      subtotal: Number(order.subtotal),
      delivery_charge: Number(order.delivery_charge),
      total: Number(order.total),
    }));
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

export const adminUpdateOrderStatus = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .inputValidator(orderStatusSchema)
  .handler(async ({ data, context }) => {
    const ctx = context as AdminContext;

    await requireAdmin(ctx);

    const { error } = await ctx.supabase
      .from("orders")
      .update({
        order_status: data.status,
      })
      .eq("id", data.id);

    if (error) {
      throw new Error(error.message);
    }

    return { ok: true };
  });