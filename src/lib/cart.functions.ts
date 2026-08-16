import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { deliveryChargeFor } from "./pricing";

export type CartLine = {
  itemId: string;
  productId: string;
  name: string;
  coverSizeId: string | null;
  coverSizeLabel: string | null;
  coverSizeDelta: number;
  variantId: string | null;
  coverOptions: Array<{
    id: string;
    label: string;
    price: number;
    stock: number;
  }>;
  image: string | null;
  unitPrice: number;
  quantity: number;
  stock: number;
  lineTotal: number;
};

export type CartSummary = {
  lines: CartLine[];
  subtotal: number;
  deliveryCharge: number;
  total: number;
  count: number;
};

type Sb = { supabase: any; userId: string };

async function ensureCart({ supabase, userId }: Sb): Promise<string> {
  const db = supabase as any;
  const { data, error } = await db.from("carts").select("id").eq("customer_id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (data?.id) return String(data.id);
  const { data: created, error: createError } = await db.from("carts").insert({ customer_id: userId }).select("id").single();
  if (createError) throw new Error(createError.message);
  return String(created.id);
}

async function readCart(ctx: Sb): Promise<CartSummary> {
  const db = ctx.supabase as any;
  const cartId = await ensureCart(ctx);

  const { data, error } = await db
    .from("cart_items")
    .select(`id,quantity,product_id,variant_id,cover_size_id,
      products(id,name,image,price,stock,available),
      product_variants(id,cover_size_id,cover_size,price,stock,available,cover_sizes(id,label,active,sort_order))`)
    .eq("cart_id", cartId)
    .order("created_at");
  if (error) throw new Error(error.message);

  const productIds = Array.from(new Set((data ?? []).map((row: any) => row.product_id)));
  const { data: variantRows, error: variantError } = productIds.length
    ? await db.from("product_variants")
        .select("id,product_id,cover_size_id,cover_size,price,stock,available,cover_sizes(id,label,active,sort_order)")
        .in("product_id", productIds)
        .eq("available", true)
        .eq("cover_sizes.active", true)
    : { data: [], error: null };
  if (variantError) throw new Error(variantError.message);

  const optionsByProduct = new Map<string, Array<{ id: string; label: string; price: number; stock: number }>>();
  for (const v of variantRows ?? []) {
    const list = optionsByProduct.get(v.product_id) ?? [];
    list.push({
      id: v.cover_size_id,
      label: v.cover_sizes?.label ?? v.cover_size,
      price: Number(v.price),
      stock: Number(v.stock),
    });
    optionsByProduct.set(v.product_id, list);
  }

  const lines: CartLine[] = (data ?? []).filter((row: any) => row.products?.available).map((row: any) => {
    const variant = row.product_variants;
    const unitPrice = variant ? Number(variant.price) : Number(row.products.price);
    const stock = variant ? Number(variant.stock) : Number(row.products.stock);
    const label = variant?.cover_sizes?.label ?? variant?.cover_size ?? null;
    return {
      itemId: row.id,
      productId: row.products.id,
      name: row.products.name,
      coverSizeId: row.cover_size_id ?? variant?.cover_size_id ?? null,
      coverSizeLabel: label,
      coverSizeDelta: variant ? unitPrice - Number(row.products.price) : 0,
      variantId: variant?.id ?? null,
      coverOptions: optionsByProduct.get(row.products.id) ?? [],
      image: row.products.image ?? null,
      unitPrice,
      quantity: Number(row.quantity),
      stock,
      lineTotal: unitPrice * Number(row.quantity),
    };
  });

  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const deliveryCharge = deliveryChargeFor(subtotal);
  return {
    lines,
    subtotal,
    deliveryCharge,
    total: subtotal + deliveryCharge,
    count: lines.reduce((sum, line) => sum + line.quantity, 0),
  };
}

export const getCart = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => readCart(context as Sb));

export const addToCart = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().min(1).max(99),
    coverSizeId: z.string().uuid().nullable().optional(),
  }))
  .handler(async ({ data, context }) => {
    const ctx = context as Sb;
    const db = ctx.supabase as any;
    const cartId = await ensureCart(ctx);

    const { data: product, error: productError } = await db.from("products").select("id,stock,available").eq("id", data.productId).maybeSingle();
    if (productError) throw new Error(productError.message);
    if (!product || !product.available) throw new Error("This plant is not available.");

    const coverSizeId = data.coverSizeId ?? null;
    let variant: any = null;
    if (coverSizeId) {
      const { data: found, error } = await db.from("product_variants")
        .select("id,cover_size_id,price,stock,available,cover_sizes(label,active)")
        .eq("product_id", data.productId)
        .eq("cover_size_id", coverSizeId)
        .eq("available", true)
        .eq("cover_sizes.active", true)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!found) throw new Error("That cover size is not available for this plant.");
      variant = found;
    }

    const variantId = variant?.id ?? null;
    let query = db.from("cart_items").select("id,quantity").eq("cart_id", cartId).eq("product_id", data.productId);
    query = variantId ? query.eq("variant_id", variantId) : query.is("variant_id", null);
    const { data: existing, error: existingError } = await query.maybeSingle();
    if (existingError) throw new Error(existingError.message);

    const availableStock = variant ? Number(variant.stock) : Number(product.stock);
    const nextQty = Number(existing?.quantity ?? 0) + data.quantity;
    if (nextQty > availableStock) throw new Error(`Only ${availableStock} left in stock for this size.`);

    if (existing) {
      const { error } = await db.from("cart_items").update({ quantity: nextQty }).eq("id", existing.id).eq("cart_id", cartId);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await db.from("cart_items").insert({
        cart_id: cartId,
        product_id: data.productId,
        cover_size_id: coverSizeId,
        variant_id: variantId,
        quantity: data.quantity,
      });
      if (error) throw new Error(error.message);
    }
    return readCart(ctx);
  });

export const updateCartItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ itemId: z.string().uuid(), quantity: z.number().int().min(0).max(99) }))
  .handler(async ({ data, context }) => {
    const ctx = context as Sb;
    const db = ctx.supabase as any;
    if (data.quantity === 0) {
      const { error } = await db.from("cart_items").delete().eq("id", data.itemId);
      if (error) throw new Error(error.message);
      return readCart(ctx);
    }
    const { data: item, error } = await db.from("cart_items")
      .select("id,variant_id,products(stock,available),product_variants(stock,available)")
      .eq("id", data.itemId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!item) throw new Error("Item not found.");
    if (!item.products?.available) throw new Error("This plant is no longer available.");
    if (item.product_variants && !item.product_variants.available) throw new Error("This cover size is no longer available.");
    const stock = item.product_variants ? Number(item.product_variants.stock) : Number(item.products.stock);
    if (data.quantity > stock) throw new Error(`Only ${stock} left in stock.`);
    const { error: updateError } = await db.from("cart_items").update({ quantity: data.quantity }).eq("id", data.itemId);
    if (updateError) throw new Error(updateError.message);
    return readCart(ctx);
  });

export const removeCartItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ itemId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const ctx = context as Sb;
    const { error } = await (ctx.supabase as any).from("cart_items").delete().eq("id", data.itemId);
    if (error) throw new Error(error.message);
    return readCart(ctx);
  });

export const clearCart = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as Sb;
    const cartId = await ensureCart(ctx);
    const { error } = await (ctx.supabase as any).from("cart_items").delete().eq("cart_id", cartId);
    if (error) throw new Error(error.message);
    return readCart(ctx);
  });

export const setCartItemCoverSize = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ itemId: z.string().uuid(), coverSizeId: z.string().uuid().nullable() }))
  .handler(async ({ data, context }) => {
    const ctx = context as Sb;
    const db = ctx.supabase as any;
    const cartId = await ensureCart(ctx);
    const { data: item, error: itemError } = await db.from("cart_items")
      .select("id,product_id,quantity")
      .eq("id", data.itemId).eq("cart_id", cartId).maybeSingle();
    if (itemError) throw new Error(itemError.message);
    if (!item) throw new Error("Item not found.");

    let variantId: string | null = null;
    let variantStock = Number.POSITIVE_INFINITY;
    if (data.coverSizeId) {
      const { data: variant, error } = await db.from("product_variants")
        .select("id,stock,available,cover_sizes(label,active)")
        .eq("product_id", item.product_id).eq("cover_size_id", data.coverSizeId)
        .eq("available", true).eq("cover_sizes.active", true).maybeSingle();
      if (error) throw new Error(error.message);
      if (!variant) throw new Error("That cover size is not available for this plant.");
      variantId = variant.id;
      variantStock = Number(variant.stock);
      if (Number(item.quantity) > variantStock) throw new Error(`Only ${variantStock} left in stock for this size.`);
    }

    let twinQuery = db.from("cart_items").select("id,quantity").eq("cart_id", cartId).eq("product_id", item.product_id).neq("id", item.id);
    twinQuery = variantId ? twinQuery.eq("variant_id", variantId) : twinQuery.is("variant_id", null);
    const { data: twin, error: twinError } = await twinQuery.maybeSingle();
    if (twinError) throw new Error(twinError.message);

    if (twin) {
      const merged = Math.min(Number(twin.quantity) + Number(item.quantity), variantStock);
      const { error: updateError } = await db.from("cart_items").update({ quantity: merged }).eq("id", twin.id);
      if (updateError) throw new Error(updateError.message);
      const { error: deleteError } = await db.from("cart_items").delete().eq("id", item.id);
      if (deleteError) throw new Error(deleteError.message);
    } else {
      const { error: updateError } = await db.from("cart_items").update({ cover_size_id: data.coverSizeId, variant_id: variantId }).eq("id", item.id);
      if (updateError) throw new Error(updateError.message);
    }
    return readCart(ctx);
  });
