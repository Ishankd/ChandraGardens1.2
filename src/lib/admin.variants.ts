
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type AdminContext = {
  supabase: any;
  userId: string;
};

async function requireAdmin(
  ctx: AdminContext,
) {
  const {
    data,
    error,
  } = await ctx.supabase
    .from("profiles")
    .select("role")
    .eq("id", ctx.userId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Could not verify admin: ${error.message}`,
    );
  }

  if (data?.role !== "admin") {
    throw new Error(
      "Admin access required.",
    );
  }
}

/* =====================================================
   GET VARIANTS FOR ONE PRODUCT
===================================================== */

export const adminGetProductVariants =
  createServerFn({
    method: "GET",
  })
    .middleware([
      requireSupabaseAuth,
    ])
    .inputValidator(
      z.object({
        productId:
          z.string().uuid(),
      }),
    )
    .handler(
      async ({
        data,
        context,
      }) => {
        const ctx =
          context as AdminContext;

        await requireAdmin(ctx);

        const db =
          ctx.supabase;

        const {
          data: rows,
          error,
        } = await db
          .from(
            "product_variants",
          )
          .select(
            `
              id,
              product_id,
              cover_size_id,
              cover_size,
              price,
              stock,
              available,
              cover_sizes(
                id,
                label,
                active,
                sort_order
              )
            `,
          )
          .eq(
            "product_id",
            data.productId,
          )
          .order(
            "sort_order",
            {
              referencedTable:
                "cover_sizes",
              ascending:
                true,
            },
          );

        if (error) {
          throw new Error(
            `Could not load cover prices: ${error.message}`,
          );
        }

        return (
          rows ?? []
        ).map(
          (
            variant: any,
          ) => ({
            id: variant.id,

            productId:
              variant.product_id,

            coverSizeId:
              variant.cover_size_id,

            label:
              variant.cover_sizes
                ?.label ??
              variant.cover_size ??
              "Unknown",

            price: Number(
              variant.price,
            ),

            stock: Number(
              variant.stock,
            ),

            available:
              Boolean(
                variant.available,
              ),
          }),
        );
      },
    );

/* =====================================================
   SAVE / UPDATE VARIANT
===================================================== */

const saveVariantSchema =
  z.object({
    id: z
      .string()
      .uuid()
      .optional(),

    productId:
      z.string().uuid(),

    coverSizeId:
      z.string().uuid(),

    price:
      z.number().min(0),

    stock:
      z
        .number()
        .int()
        .min(0),

    available:
      z.boolean(),
  });

export const adminUpsertProductVariant =
  createServerFn({
    method: "POST",
  })
    .middleware([
      requireSupabaseAuth,
    ])
    .inputValidator(
      saveVariantSchema,
    )
    .handler(
      async ({
        data,
        context,
      }) => {
        const ctx =
          context as AdminContext;

        await requireAdmin(ctx);

        const db =
          ctx.supabase;

        /* ---------------------------------------------
           Verify cover size
        ---------------------------------------------- */

        const {
          data: cover,
          error:
            coverError,
        } = await db
          .from(
            "cover_sizes",
          )
          .select(
            "id,label",
          )
          .eq(
            "id",
            data.coverSizeId,
          )
          .maybeSingle();

        if (coverError) {
          throw new Error(
            `Could not load cover size: ${coverError.message}`,
          );
        }

        if (!cover) {
          throw new Error(
            "Cover size not found.",
          );
        }

        /* ---------------------------------------------
           Verify product
        ---------------------------------------------- */

        const {
          data: product,
          error:
            productError,
        } = await db
          .from(
            "products",
          )
          .select("id,name")
          .eq(
            "id",
            data.productId,
          )
          .maybeSingle();

        if (productError) {
          throw new Error(
            `Could not load product: ${productError.message}`,
          );
        }

        if (!product) {
          throw new Error(
            "Product not found.",
          );
        }

        const payload = {
          product_id:
            data.productId,

          cover_size:
            cover.label,

          cover_size_id:
            data.coverSizeId,

          price:
            data.price,

          stock:
            data.stock,

          available:
            data.available,
        };

        /* ---------------------------------------------
           If we have an ID, update exactly that row
        ---------------------------------------------- */

        if (data.id) {
          const {
            data: existingById,
            error:
              existingByIdError,
          } = await db
            .from(
              "product_variants",
            )
            .select("id")
            .eq(
              "id",
              data.id,
            )
            .maybeSingle();

          if (
            existingByIdError
          ) {
            throw new Error(
              `Could not find existing variant: ${existingByIdError.message}`,
            );
          }

          if (
            existingById
          ) {
            const {
              error:
                updateError,
            } = await db
              .from(
                "product_variants",
              )
              .update(
                payload,
              )
              .eq(
                "id",
                data.id,
              );

            if (
              updateError
            ) {
              throw new Error(
                `Could not update cover price: ${updateError.message}`,
              );
            }

            return {
              ok: true,
              action:
                "updated",
              id: data.id,
            };
          }
        }

        /* ---------------------------------------------
           Look for an existing row by:
           product + cover size
        ---------------------------------------------- */

        const {
          data:
            existingVariant,
          error:
            existingError,
        } = await db
          .from(
            "product_variants",
          )
          .select("id")
          .eq(
            "product_id",
            data.productId,
          )
          .eq(
            "cover_size_id",
            data.coverSizeId,
          )
          .maybeSingle();

        if (existingError) {
          throw new Error(
            `Could not check existing cover price: ${existingError.message}`,
          );
        }

        /* ---------------------------------------------
           Existing → UPDATE
        ---------------------------------------------- */

        if (
          existingVariant
        ) {
          const {
            error:
              updateError,
          } = await db
            .from(
              "product_variants",
            )
            .update(
              payload,
            )
            .eq(
              "id",
              existingVariant.id,
            );

          if (
            updateError
          ) {
            throw new Error(
              `Could not update cover price: ${updateError.message}`,
            );
          }

          return {
            ok: true,
            action:
              "updated",
            id: existingVariant.id,
          };
        }

        /* ---------------------------------------------
           Doesn't exist → INSERT
        ---------------------------------------------- */

        const {
          data:
            insertedVariant,
          error:
            insertError,
        } = await db
          .from(
            "product_variants",
          )
          .insert(
            payload,
          )
          .select("id")
          .single();

        if (insertError) {
          throw new Error(
            `Could not save cover price: ${insertError.message}`,
          );
        }

        return {
          ok: true,
          action:
            "created",
          id: insertedVariant
            ?.id,
        };
      },
    );

/* =====================================================
   DELETE VARIANT
===================================================== */

export const adminDeleteProductVariant =
  createServerFn({
    method: "POST",
  })
    .middleware([
      requireSupabaseAuth,
    ])
    .inputValidator(
      z.object({
        id: z.string().uuid(),
      }),
    )
    .handler(
      async ({
        data,
        context,
      }) => {
        const ctx =
          context as AdminContext;

        await requireAdmin(ctx);

        const db =
          ctx.supabase;

        const {
          error,
        } = await db
          .from(
            "product_variants",
          )
          .delete()
          .eq(
            "id",
            data.id,
          );

        if (error) {
          throw new Error(
            `Could not remove cover price: ${error.message}`,
          );
        }

        return {
          ok: true,
        };
      },
    );
