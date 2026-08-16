import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type AdminContext = { supabase: any; userId: string };

async function requireAdmin(ctx: AdminContext) {
  const { data, error } = await ctx.supabase
    .from("profiles")
    .select("role")
    .eq("id", ctx.userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (data?.role !== "admin") throw new Error("Admin access required.");
}

export const adminGetProductVariants = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ productId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const ctx = context as AdminContext;
    await requireAdmin(ctx);
    const db = ctx.supabase as any;
    const { data: rows, error } = await db
      .from("product_variants")
      .select("id,product_id,cover_size_id,cover_size,price,stock,available,cover_sizes(id,label,active,sort_order)")
      .eq("product_id", data.productId)
      .order("sort_order", { referencedTable: "cover_sizes" });
    if (error) throw new Error(error.message);
    return (rows ?? []).map((v: any) => ({
      id: v.id,
      productId: v.product_id,
      coverSizeId: v.cover_size_id,
      label: v.cover_sizes?.label ?? v.cover_size,
      price: Number(v.price),
      stock: Number(v.stock),
      available: Boolean(v.available),
    }));
  });

export const adminUpsertProductVariant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    id: z.string().uuid().optional(),
    productId: z.string().uuid(),
    coverSizeId: z.string().uuid(),
    price: z.number().min(0),
    stock: z.number().int().min(0),
    available: z.boolean(),
  }))
  .handler(async ({ data, context }) => {
    const ctx = context as AdminContext;
    await requireAdmin(ctx);
    const db = ctx.supabase as any;
    const { data: size, error: sizeError } = await db
      .from("cover_sizes")
      .select("id,label")
      .eq("id", data.coverSizeId)
      .maybeSingle();
    if (sizeError) throw new Error(sizeError.message);
    if (!size) throw new Error("Cover size not found.");

    const payload = {
      product_id: data.productId,
      cover_size_id: data.coverSizeId,
      cover_size: size.label,
      price: data.price,
      stock: data.stock,
      available: data.available,
    };

    const query = data.id
      ? db.from("product_variants").update(payload).eq("id", data.id)
      : db.from("product_variants").upsert(payload, { onConflict: "product_id,cover_size" });
    const { error } = await query;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteProductVariant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const ctx = context as AdminContext;
    await requireAdmin(ctx);
    const { error } = await (ctx.supabase as any)
      .from("product_variants")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
