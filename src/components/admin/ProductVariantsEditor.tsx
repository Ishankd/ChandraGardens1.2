import { useEffect, useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import {
  adminGetCoverSizes,
} from "@/lib/admin.functions";

import {
  adminGetProductVariants,
  adminUpsertProductVariant,
  adminDeleteProductVariant,
} from "@/lib/admin.variants";

type Props = {
  productId: string;
};

type Cover = {
  id: string;
  label: string;
  price_delta: number;
  sort_order: number;
  active: boolean;
};

type Variant = {
  id?: string;
  productId: string;
  coverSizeId: string;
  label?: string;
  price: number;
  stock: number;
  available: boolean;
};

type Row = {
  id?: string;
  productId: string;
  coverSizeId: string;
  label: string;
  price: number;
  stock: number;
  available: boolean;
};

export function ProductVariantsEditor({
  productId,
}: Props) {
  const queryClient =
    useQueryClient();

  const getVariants =
    useServerFn(
      adminGetProductVariants,
    );

  const saveVariant =
    useServerFn(
      adminUpsertProductVariant,
    );

  const deleteVariant =
    useServerFn(
      adminDeleteProductVariant,
    );

  const getCoverSizes =
    useServerFn(
      adminGetCoverSizes,
    );

  const variantsQuery =
    useQuery({
      queryKey: [
        "admin-product-variants",
        productId,
      ],
      queryFn: () =>
        getVariants({
          data: {
            productId,
          },
        }),
    });

  const coversQuery =
    useQuery({
      queryKey: [
        "admin-cover-sizes",
      ],
      queryFn: () =>
        getCoverSizes(),
    });

  const [rows, setRows] =
    useState<Row[]>([]);

  useEffect(() => {
    if (!coversQuery.data) {
      return;
    }

    const covers =
      coversQuery.data as Cover[];

    const existing =
      (variantsQuery.data ??
        []) as Variant[];

    const nextRows: Row[] =
      covers
        .filter(
          (cover: Cover) =>
            cover.active,
        )
        .map(
          (cover: Cover) => {
            const variant =
              existing.find(
                (
                  item: Variant,
                ) =>
                  item.coverSizeId ===
                  cover.id,
              );

            return {
              id: variant?.id,
              productId,
              coverSizeId:
                cover.id,
              label:
                variant?.label ??
                cover.label,
              price:
                Number(
                  variant?.price ??
                    0,
                ),
              stock:
                Number(
                  variant?.stock ??
                    0,
                ),
              available:
                variant?.available ??
                true,
            };
          },
        );

    setRows(nextRows);
  }, [
    coversQuery.data,
    variantsQuery.data,
    productId,
  ]);

  const saveMutation =
    useMutation({
      mutationFn: async (
        row: Row,
      ) => {
        return saveVariant({
          data: {
            id: row.id,
            productId:
              row.productId,
            coverSizeId:
              row.coverSizeId,
            price: Number(
              row.price,
            ),
            stock: Math.max(
              0,
              Number(
                row.stock,
              ),
            ),
            available:
              row.available,
          },
        });
      },

      onSuccess:
        async () => {
          await queryClient.invalidateQueries(
            {
              queryKey: [
                "admin-product-variants",
                productId,
              ],
            },
          );

          await queryClient.invalidateQueries(
            {
              queryKey: [
                "admin-products",
              ],
            },
          );
        },
    });

  const deleteMutation =
    useMutation({
      mutationFn: (
        id: string,
      ) =>
        deleteVariant({
          data: { id },
        }),

      onSuccess:
        async () => {
          await queryClient.invalidateQueries(
            {
              queryKey: [
                "admin-product-variants",
                productId,
              ],
            },
          );

          setRows(
            (current) =>
              current.filter(
                (
                  row: Row,
                ) =>
                  row.id !==
                  saveDeleteId,
              ),
          );
        },
    });

  const updateRow = (
    coverSizeId: string,
    patch: Partial<Row>,
  ) => {
    setRows(
      (current) =>
        current.map(
          (row: Row) =>
            row.coverSizeId ===
            coverSizeId
              ? {
                  ...row,
                  ...patch,
                }
              : row,
        ),
    );
  };

  if (
    variantsQuery.isLoading ||
    coversQuery.isLoading
  ) {
    return (
      <div className="rounded-2xl border border-border/60 p-4 text-sm text-muted-foreground">
        Loading cover prices…
      </div>
    );
  }

  if (
    variantsQuery.error
  ) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600">
        {variantsQuery.error instanceof
        Error
          ? variantsQuery.error.message
          : "Could not load cover prices."}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/70 p-4">
      <div className="mb-4">
        <h3 className="font-semibold">
          Cover size pricing &
          stock
        </h3>

        <p className="mt-1 text-xs text-muted-foreground">
          Each cover size can
          have its own price
          and stock for this
          plant.
        </p>
      </div>

      <div className="space-y-3">
        {rows.map(
          (row: Row) => (
            <div
              key={
                row.coverSizeId
              }
              className="grid gap-3 rounded-2xl border border-border/60 p-3 md:grid-cols-[1fr_130px_110px_auto_auto]"
            >
              <div className="flex items-center font-medium">
                {row.label}
              </div>

              <label className="block">
                <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Price ₹
                </span>

                <input
                  type="number"
                  min="0"
                  value={
                    row.price
                  }
                  onChange={(
                    event,
                  ) =>
                    updateRow(
                      row.coverSizeId,
                      {
                        price:
                          Math.max(
                            0,
                            Number(
                              event
                                .target
                                .value,
                            ) ||
                              0,
                          ),
                      },
                    )
                  }
                  className="w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Stock
                </span>

                <input
                  type="number"
                  min="0"
                  value={
                    row.stock
                  }
                  onChange={(
                    event,
                  ) =>
                    updateRow(
                      row.coverSizeId,
                      {
                        stock:
                          Math.max(
                            0,
                            Number(
                              event
                                .target
                                .value,
                            ) ||
                              0,
                          ),
                      },
                    )
                  }
                  className="w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm"
                />
              </label>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={
                    row.available
                  }
                  onChange={(
                    event,
                  ) =>
                    updateRow(
                      row.coverSizeId,
                      {
                        available:
                          event
                            .target
                            .checked,
                      },
                    )
                  }
                />
                Available
              </label>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    saveMutation.mutate(
                      row,
                    )
                  }
                  disabled={
                    saveMutation.isPending
                  }
                  className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60"
                >
                  {saveMutation.isPending
                    ? "Saving…"
                    : "Save"}
                </button>

                {row.id && (
                  <button
                    type="button"
                    onClick={() => {
                      const ok =
                        window.confirm(
                          `Remove ${row.label} pricing for this plant?`,
                        );

                      if (!ok) {
                        return;
                      }

                      setDeleteId(
                        row.id!,
                      );

                      deleteMutation.mutate(
                        row.id!,
                      );
                    }}
                    disabled={
                      deleteMutation.isPending
                    }
                    className="rounded-full border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  );
}

let saveDeleteId =
  "";

function setDeleteId(
  id: string,
) {
  saveDeleteId = id;
}