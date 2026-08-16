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

type Sb = {
  supabase: any;
  userId: string;
};

/* -------------------------------------------------------
   GET OR CREATE USER CART
   Your database uses customer_id, NOT user_id.
------------------------------------------------------- */
async function ensureCart({
  supabase,
  userId,
}: Sb): Promise<string> {
  const { data, error } = await supabase
    .from("carts")
    .select("id")
    .eq("customer_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (data?.id) {
    return String(data.id);
  }

  const {
    data: created,
    error: createError,
  } = await supabase
    .from("carts")
    .insert({
      customer_id: userId,
    })
    .select("id")
    .single();

  if (createError) {
    throw new Error(createError.message);
  }

  return String(created.id);
}

/* -------------------------------------------------------
   READ CART
------------------------------------------------------- */
async function readCart(
  ctx: Sb,
): Promise<CartSummary> {
  const cartId = await ensureCart(ctx);

  const {
    data,
    error,
  } = await ctx.supabase
    .from("cart_items")
    .select(
      `
        id,
        quantity,
        product_id,
        cover_size_id,
        cover_sizes (
          id,
          label,
          price_delta
        ),
        products (
          id,
          name,
          image,
          price,
          stock,
          available
        )
      `,
    )
    .eq("cart_id", cartId)
    .order("created_at");

  if (error) {
    throw new Error(error.message);
  }

  const lines: CartLine[] = (data ?? [])
    .filter(
      (row: any) =>
        row.products &&
        row.products.available,
    )
    .map((row: any) => {
      const delta = Number(
        row.cover_sizes?.price_delta ?? 0,
      );

      const unitPrice =
        Number(row.products.price) + delta;

      return {
        itemId: row.id,
        productId: row.products.id,
        name: row.products.name,

        coverSizeId:
          row.cover_size_id ?? null,

        coverSizeLabel:
          row.cover_sizes?.label ?? null,

        coverSizeDelta: delta,

        image:
          row.products.image ?? null,

        unitPrice,

        quantity: Number(row.quantity),

        stock: Number(
          row.products.stock,
        ),

        lineTotal:
          unitPrice * Number(row.quantity),
      };
    });

  const subtotal = lines.reduce(
    (sum, line) =>
      sum + line.lineTotal,
    0,
  );

  const deliveryCharge =
    deliveryChargeFor(subtotal);

  return {
    lines,
    subtotal,
    deliveryCharge,
    total:
      subtotal + deliveryCharge,
    count: lines.reduce(
      (sum, line) =>
        sum + line.quantity,
      0,
    ),
  };
}

/* -------------------------------------------------------
   GET CART
------------------------------------------------------- */
export const getCart = createServerFn({
  method: "GET",
})
  .middleware([
    requireSupabaseAuth,
  ])
  .handler(async ({ context }) => {
    return readCart(
      context as Sb,
    );
  });

/* -------------------------------------------------------
   ADD TO CART
------------------------------------------------------- */
export const addToCart = createServerFn({
  method: "POST",
})
  .middleware([
    requireSupabaseAuth,
  ])
  .inputValidator(
    z.object({
      productId:
        z.string().uuid(),

      quantity:
        z.number()
          .int()
          .min(1)
          .max(99),

      coverSizeId:
        z.string()
          .uuid()
          .nullable()
          .optional(),
    }),
  )
  .handler(
    async ({ data, context }) => {
      const ctx = context as Sb;

      const cartId =
        await ensureCart(ctx);

      /* -------------------------------
         Check product
      -------------------------------- */
      const {
        data: product,
        error: productError,
      } = await ctx.supabase
        .from("products")
        .select(
          "id,stock,available",
        )
        .eq(
          "id",
          data.productId,
        )
        .maybeSingle();

      if (productError) {
        throw new Error(
          productError.message,
        );
      }

      if (
        !product ||
        !product.available
      ) {
        throw new Error(
          "This plant is not available.",
        );
      }

      /* -------------------------------
         Check cover size
      -------------------------------- */
      const coverSizeId =
        data.coverSizeId ?? null;

      if (coverSizeId) {
        const {
          data: cover,
          error: coverError,
        } = await ctx.supabase
          .from("cover_sizes")
          .select(
            "id,label,price_delta",
          )
          .eq(
            "id",
            coverSizeId,
          )
          .eq(
            "active",
            true,
          )
          .maybeSingle();

        if (coverError) {
          throw new Error(
            coverError.message,
          );
        }

        if (!cover) {
          throw new Error(
            "That cover size is not available.",
          );
        }
      }

      /* -------------------------------
         Find existing same line
      -------------------------------- */
      let query = ctx.supabase
        .from("cart_items")
        .select(
          "id,quantity",
        )
        .eq(
          "cart_id",
          cartId,
        )
        .eq(
          "product_id",
          data.productId,
        );

      if (coverSizeId) {
        query = query.eq(
          "cover_size_id",
          coverSizeId,
        );
      } else {
        query = query.is(
          "cover_size_id",
          null,
        );
      }

      const {
        data: existing,
        error: existingError,
      } = await query.maybeSingle();

      if (existingError) {
        throw new Error(
          existingError.message,
        );
      }

      const nextQty =
        Number(
          existing?.quantity ?? 0,
        ) + data.quantity;

      /* -------------------------------
         Stock check
      -------------------------------- */
      if (
        nextQty >
        Number(product.stock)
      ) {
        throw new Error(
          `Only ${product.stock} left in stock.`,
        );
      }

      /* -------------------------------
         Update existing
      -------------------------------- */
      if (existing) {
        const {
          error: updateError,
        } = await ctx.supabase
          .from("cart_items")
          .update({
            quantity: nextQty,
          })
          .eq(
            "id",
            existing.id,
          )
          .eq(
            "cart_id",
            cartId,
          );

        if (updateError) {
          throw new Error(
            updateError.message,
          );
        }
      }

      /* -------------------------------
         Insert new
      -------------------------------- */
      else {
        const {
          error: insertError,
        } = await ctx.supabase
          .from("cart_items")
          .insert({
            cart_id: cartId,
            product_id:
              data.productId,
            cover_size_id:
              coverSizeId,
            quantity:
              data.quantity,
          });

        if (insertError) {
          throw new Error(
            insertError.message,
          );
        }
      }

      return readCart(ctx);
    },
  );

/* -------------------------------------------------------
   UPDATE QUANTITY
------------------------------------------------------- */
export const updateCartItem =
  createServerFn({
    method: "POST",
  })
    .middleware([
      requireSupabaseAuth,
    ])
    .inputValidator(
      z.object({
        itemId:
          z.string().uuid(),

        quantity:
          z.number()
            .int()
            .min(0)
            .max(99),
      }),
    )
    .handler(
      async ({
        data,
        context,
      }) => {
        const ctx =
          context as Sb;

        if (
          data.quantity === 0
        ) {
          const {
            error,
          } = await ctx.supabase
            .from(
              "cart_items",
            )
            .delete()
            .eq(
              "id",
              data.itemId,
            );

          if (error) {
            throw new Error(
              error.message,
            );
          }

          return readCart(ctx);
        }

        const {
          data: item,
          error: itemError,
        } = await ctx.supabase
          .from("cart_items")
          .select(
            `
              id,
              product_id,
              cover_size_id,
              products (
                stock,
                available
              )
            `,
          )
          .eq(
            "id",
            data.itemId,
          )
          .maybeSingle();

        if (itemError) {
          throw new Error(
            itemError.message,
          );
        }

        if (!item) {
          throw new Error(
            "Item not found.",
          );
        }

        const product =
          item.products as {
            stock: number;
            available: boolean;
          } | null;

        if (
          !product ||
          !product.available
        ) {
          throw new Error(
            "This plant is no longer available.",
          );
        }

        if (
          data.quantity >
          Number(product.stock)
        ) {
          throw new Error(
            `Only ${product.stock} left in stock.`,
          );
        }

        const {
          error: updateError,
        } = await ctx.supabase
          .from("cart_items")
          .update({
            quantity:
              data.quantity,
          })
          .eq(
            "id",
            data.itemId,
          );

        if (updateError) {
          throw new Error(
            updateError.message,
          );
        }

        return readCart(ctx);
      },
    );

/* -------------------------------------------------------
   REMOVE ITEM
------------------------------------------------------- */
export const removeCartItem =
  createServerFn({
    method: "POST",
  })
    .middleware([
      requireSupabaseAuth,
    ])
    .inputValidator(
      z.object({
        itemId:
          z.string().uuid(),
      }),
    )
    .handler(
      async ({
        data,
        context,
      }) => {
        const ctx =
          context as Sb;

        const {
          error,
        } = await ctx.supabase
          .from(
            "cart_items",
          )
          .delete()
          .eq(
            "id",
            data.itemId,
          );

        if (error) {
          throw new Error(
            error.message,
          );
        }

        return readCart(ctx);
      },
    );

/* -------------------------------------------------------
   CLEAR CART
------------------------------------------------------- */
export const clearCart =
  createServerFn({
    method: "POST",
  })
    .middleware([
      requireSupabaseAuth,
    ])
    .handler(
      async ({
        context,
      }) => {
        const ctx =
          context as Sb;

        const cartId =
          await ensureCart(ctx);

        const {
          error,
        } = await ctx.supabase
          .from(
            "cart_items",
          )
          .delete()
          .eq(
            "cart_id",
            cartId,
          );

        if (error) {
          throw new Error(
            error.message,
          );
        }

        return readCart(ctx);
      },
    );

/* -------------------------------------------------------
   CHANGE COVER SIZE
------------------------------------------------------- */
export const setCartItemCoverSize =
  createServerFn({
    method: "POST",
  })
    .middleware([
      requireSupabaseAuth,
    ])
    .inputValidator(
      z.object({
        itemId:
          z.string().uuid(),

        coverSizeId:
          z.string()
            .uuid()
            .nullable(),
      }),
    )
    .handler(
      async ({
        data,
        context,
      }) => {
        const ctx =
          context as Sb;

        const cartId =
          await ensureCart(ctx);

        const {
          data: item,
          error: itemError,
        } = await ctx.supabase
          .from("cart_items")
          .select(
            `
              id,
              cart_id,
              product_id,
              quantity,
              products (
                stock
              )
            `,
          )
          .eq(
            "id",
            data.itemId,
          )
          .eq(
            "cart_id",
            cartId,
          )
          .maybeSingle();

        if (itemError) {
          throw new Error(
            itemError.message,
          );
        }

        if (!item) {
          throw new Error(
            "Item not found.",
          );
        }

        /* -------------------------------
           Validate new cover size
        -------------------------------- */
        if (data.coverSizeId) {
          const {
            data: cover,
            error: coverError,
          } = await ctx.supabase
            .from("cover_sizes")
            .select("id")
            .eq(
              "id",
              data.coverSizeId,
            )
            .eq(
              "active",
              true,
            )
            .maybeSingle();

          if (coverError) {
            throw new Error(
              coverError.message,
            );
          }

          if (!cover) {
            throw new Error(
              "That cover size is not available.",
            );
          }
        }

        /* -------------------------------
           Find matching existing line
        -------------------------------- */
        let query = ctx.supabase
          .from("cart_items")
          .select(
            "id,quantity",
          )
          .eq(
            "cart_id",
            cartId,
          )
          .eq(
            "product_id",
            item.product_id,
          )
          .neq(
            "id",
            item.id,
          );

        if (data.coverSizeId) {
          query = query.eq(
            "cover_size_id",
            data.coverSizeId,
          );
        } else {
          query = query.is(
            "cover_size_id",
            null,
          );
        }

        const {
          data: twin,
          error: twinError,
        } = await query.maybeSingle();

        if (twinError) {
          throw new Error(
            twinError.message,
          );
        }

        const product =
          item.products as {
            stock: number;
          } | null;

        const stock =
          Number(
            product?.stock ?? 0,
          );

        /* -------------------------------
           Merge if same line exists
        -------------------------------- */
        if (twin) {
          const merged =
            Math.min(
              Number(
                twin.quantity,
              ) +
                Number(
                  item.quantity,
                ),
              stock ||
                Number(
                  twin.quantity,
                ),
            );

          const {
            error: updateError,
          } = await ctx.supabase
            .from(
              "cart_items",
            )
            .update({
              quantity: merged,
            })
            .eq(
              "id",
              twin.id,
            );

          if (updateError) {
            throw new Error(
              updateError.message,
            );
          }

          const {
            error: deleteError,
          } = await ctx.supabase
            .from(
              "cart_items",
            )
            .delete()
            .eq(
              "id",
              item.id,
            );

          if (deleteError) {
            throw new Error(
              deleteError.message,
            );
          }
        }

        /* -------------------------------
           Otherwise change size
        -------------------------------- */
        else {
          const {
            error: updateError,
          } = await ctx.supabase
            .from(
              "cart_items",
            )
            .update({
              cover_size_id:
                data.coverSizeId,
            })
            .eq(
              "id",
              item.id,
            );

          if (updateError) {
            throw new Error(
              updateError.message,
            );
          }
        }

        return readCart(ctx);
      },
    );