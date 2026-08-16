import {
  createFileRoute,
} from "@tanstack/react-router";
import {
  useMemo,
  useState,
} from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { Navbar } from "@/components/Navbar";
import { ProductVariantsEditor } from "@/components/admin/ProductVariantsEditor";
import {
  adminCreateProduct,
  adminCreateCoverSize,
  adminDeleteCoverSize,
  adminDeleteProduct,
  adminGetCategories,
  adminGetCoverSizes,
  adminGetOrders,
  adminGetProducts,
  adminUpdateCoverSize,
  adminUpdateOrderStatus,
  adminUpdateProduct,
} from "@/lib/admin.functions";

export const Route =
  createFileRoute(
    "/_authenticated/admin",
  )({
    head: () => ({
      meta: [
        {
          title:
            "Admin — Chandra Gardens",
        },
        {
          name: "description",
          content:
            "Chandra Gardens admin dashboard.",
        },
      ],
    }),

    component: AdminPage,
  });

type Difficulty =
  | "easy"
  | "medium"
  | "hard";

type Product =
  Awaited<
    ReturnType<
      typeof adminGetProducts
    >
  >[number];

type CoverSize =
  Awaited<
    ReturnType<
      typeof adminGetCoverSizes
    >
  >[number];

const emptyProduct = {
  name: "",
  slug: "",
  description: "",
  categoryId:
    null as string | null,
  price: 0,
  stock: 0,
  image: "",
  featured: false,
  available: true,
  sunlight: "",
  watering: "",
  soil: "",
  difficulty:
    "easy" as Difficulty,
};

const emptyCover = {
  label: "",
  priceDelta: 0,
  sortOrder: 1,
  active: true,
};

function AdminPage() {
  const qc =
    useQueryClient();

  const [tab, setTab] =
    useState<
      "products" |
        "covers" |
        "orders"
    >("products");

  const [editing, setEditing] =
    useState<Product | null>(
      null,
    );

  const [form, setForm] =
    useState(
      emptyProduct,
    );

  const [
    coverForm,
    setCoverForm,
  ] = useState(
    emptyCover,
  );

  const [error, setError] =
    useState("");

  const fetchProducts =
    useServerFn(
      adminGetProducts,
    );

  const fetchCategories =
    useServerFn(
      adminGetCategories,
    );

  const fetchCovers =
    useServerFn(
      adminGetCoverSizes,
    );

  const fetchOrders =
    useServerFn(
      adminGetOrders,
    );

  const createProductFn =
    useServerFn(
      adminCreateProduct,
    );

  const updateProductFn =
    useServerFn(
      adminUpdateProduct,
    );

  const deleteProductFn =
    useServerFn(
      adminDeleteProduct,
    );

  const createCoverFn =
    useServerFn(
      adminCreateCoverSize,
    );

  const updateCoverFn =
    useServerFn(
      adminUpdateCoverSize,
    );

  const deleteCoverFn =
    useServerFn(
      adminDeleteCoverSize,
    );

  const updateOrderFn =
    useServerFn(
      adminUpdateOrderStatus,
    );

  const productsQuery =
    useQuery({
      queryKey: [
        "admin-products",
      ],
      queryFn: () =>
        fetchProducts(),
    });

  const categoriesQuery =
    useQuery({
      queryKey: [
        "admin-categories",
      ],
      queryFn: () =>
        fetchCategories(),
    });

  const coversQuery =
    useQuery({
      queryKey: [
        "admin-covers",
      ],
      queryFn: () =>
        fetchCovers(),
    });

  const ordersQuery =
    useQuery({
      queryKey: [
        "admin-orders",
      ],
      queryFn: () =>
        fetchOrders(),
    });

  const products =
    productsQuery.data ??
    [];

  const categories =
    categoriesQuery.data ??
    [];

  const covers =
    coversQuery.data ??
    [];

  const orders =
    ordersQuery.data ??
    [];

  const createProduct =
    useMutation({
      mutationFn: (
        data: typeof emptyProduct,
      ) =>
        createProductFn({
          data,
        }),

      onSuccess: async () => {
        setForm(
          emptyProduct,
        );
        setEditing(null);
        setError("");

        await qc.invalidateQueries({
          queryKey: [
            "admin-products",
          ],
        });
      },

      onError: (err) =>
        setError(
          err instanceof Error
            ? err.message
            : String(err),
        ),
    });

  const updateProduct =
    useMutation({
      mutationFn: (
        data: typeof emptyProduct & {
          id: string;
        },
      ) =>
        updateProductFn({
          data,
        }),

      onSuccess: async () => {
        setForm(
          emptyProduct,
        );
        setEditing(null);
        setError("");

        await qc.invalidateQueries({
          queryKey: [
            "admin-products",
          ],
        });
      },

      onError: (err) =>
        setError(
          err instanceof Error
            ? err.message
            : String(err),
        ),
    });

  const deleteProduct =
    useMutation({
      mutationFn: (
        id: string,
      ) =>
        deleteProductFn({
          data: { id },
        }),

      onSuccess: async () => {
        setEditing(null);
        setForm(
          emptyProduct,
        );
        setError("");

        await qc.invalidateQueries({
          queryKey: [
            "admin-products",
          ],
        });
      },

      onError: (err) =>
        setError(
          err instanceof Error
            ? err.message
            : String(err),
        ),
    });

  const createCover =
    useMutation({
      mutationFn: (
        data: typeof emptyCover,
      ) =>
        createCoverFn({
          data,
        }),

      onSuccess: async () => {
        setCoverForm({
          ...emptyCover,
          sortOrder:
            covers.length + 1,
        });

        setError("");

        await qc.invalidateQueries({
          queryKey: [
            "admin-covers",
          ],
        });
      },

      onError: (err) =>
        setError(
          err instanceof Error
            ? err.message
            : String(err),
        ),
    });

  const updateCover =
    useMutation({
      mutationFn: (
        data: typeof emptyCover & {
          id: string;
        },
      ) =>
        updateCoverFn({
          data,
        }),

      onSuccess: async () => {
        setError("");

        await qc.invalidateQueries({
          queryKey: [
            "admin-covers",
          ],
        });
      },

      onError: (err) =>
        setError(
          err instanceof Error
            ? err.message
            : String(err),
        ),
    });

  const deleteCover =
    useMutation({
      mutationFn: (
        id: string,
      ) =>
        deleteCoverFn({
          data: { id },
        }),

      onSuccess: async () => {
        setError("");

        await qc.invalidateQueries({
          queryKey: [
            "admin-covers",
          ],
        });
      },

      onError: (err) =>
        setError(
          err instanceof Error
            ? err.message
            : String(err),
        ),
    });

  const updateOrder =
    useMutation({
      mutationFn: (data: {
        id: string;
        status:
          | "placed"
          | "confirmed"
          | "packed"
          | "shipped"
          | "delivered"
          | "cancelled";
      }) =>
        updateOrderFn({
          data,
        }),

      onSuccess: async () => {
        await qc.invalidateQueries({
          queryKey: [
            "admin-orders",
          ],
        });
      },

      onError: (err) =>
        setError(
          err instanceof Error
            ? err.message
            : String(err),
        ),
    });

  const counts =
    useMemo(
      () => ({
        products:
          products.length,
        covers:
          covers.length,
        orders:
          orders.length,
      }),
      [
        products.length,
        covers.length,
        orders.length,
      ],
    );

  const startEdit = (
    product: Product,
  ) => {
    setEditing(
      product,
    );

    setForm({
      name:
        product.name,
      slug:
        product.slug,
      description:
        product.description ??
        "",
      categoryId:
        product.category_id ??
        null,
      price:
        Number(
          product.price,
        ),
      stock:
        Number(
          product.stock,
        ),
      image:
        product.image ??
        "",
      featured:
        Boolean(
          product.featured,
        ),
      available:
        Boolean(
          product.available,
        ),
      sunlight:
        product.sunlight ??
        "",
      watering:
        product.watering ??
        "",
      soil:
        product.soil ??
        "",
      difficulty:
        normalizeDifficulty(
          String(
            product.difficulty ??
              "easy",
          ),
        ),
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const saveProduct =
    () => {
      setError("");

      if (
        !form.name.trim()
      ) {
        setError(
          "Plant name is required.",
        );
        return;
      }

      const payload = {
        ...form,
        slug:
          form.slug.trim() ||
          slugify(
            form.name,
          ),
        image:
          form.image.trim(),
        sunlight:
          form.sunlight.trim(),
        watering:
          form.watering.trim(),
        soil:
          form.soil.trim(),
        difficulty:
          normalizeDifficulty(
            form.difficulty,
          ),
      };

      if (editing) {
        updateProduct.mutate({
          ...payload,
          id: editing.id,
        });
      } else {
        createProduct.mutate(
          payload,
        );
      }
    };

  const savingProduct =
    createProduct.isPending ||
    updateProduct.isPending;

  return (
    <>
      <Navbar />

      <main className="mx-auto min-h-screen max-w-7xl px-6 pb-24 pt-32">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Chandra Gardens
            </p>

            <h1 className="mt-2 font-display text-4xl font-medium">
              Admin dashboard
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              Manage plants,
              stock, prices,
              cover sizes and
              orders.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <TabButton
              active={
                tab ===
                "products"
              }
              onClick={() =>
                setTab(
                  "products",
                )
              }
            >
              Products (
              {counts.products}
              )
            </TabButton>

            <TabButton
              active={
                tab ===
                "covers"
              }
              onClick={() =>
                setTab(
                  "covers",
                )
              }
            >
              Cover sizes (
              {counts.covers}
              )
            </TabButton>

            <TabButton
              active={
                tab ===
                "orders"
              }
              onClick={() =>
                setTab(
                  "orders",
                )
              }
            >
              Orders (
              {counts.orders}
              )
            </TabButton>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {error}
          </div>
        )}

        {tab ===
          "products" && (
          <section className="mt-8 grid gap-8 lg:grid-cols-[380px_1fr]">
            <div className="rounded-3xl glass p-6">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-2xl">
                  {editing
                    ? "Edit plant"
                    : "Add plant"}
                </h2>

                {editing && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(
                        null,
                      );
                      setForm(
                        emptyProduct,
                      );
                      setError("");
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </button>
                )}
              </div>

              <div className="mt-5 space-y-3">
                <Field
                  label="Plant name"
                  value={
                    form.name
                  }
                  onChange={(
                    value,
                  ) =>
                    setForm(
                      (state) => ({
                        ...state,
                        name: value,
                        slug:
                          state.slug ||
                          slugify(
                            value,
                          ),
                      }),
                    )
                  }
                />

                <Field
                  label="Slug"
                  value={
                    form.slug
                  }
                  onChange={(
                    value,
                  ) =>
                    setForm(
                      (state) => ({
                        ...state,
                        slug: value,
                      }),
                    )
                  }
                />

                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Category
                  </span>

                  <select
                    value={
                      form.categoryId ??
                      ""
                    }
                    onChange={(event) =>
                      setForm(
                        (state) => ({
                          ...state,
                          categoryId:
                            event
                              .target
                              .value ||
                            null,
                        }),
                      )
                    }
                    className="w-full rounded-2xl border border-border bg-background/60 px-4 py-3 text-sm"
                  >
                    <option value="">
                      No category
                    </option>

                    {categories.map(
                      (
                        category: any,
                      ) => (
                        <option
                          key={
                            category.id
                          }
                          value={
                            category.id
                          }
                        >
                          {
                            category.name
                          }
                        </option>
                      ),
                    )}
                  </select>
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <Field
                    label="Price ₹"
                    type="number"
                    value={String(
                      form.price,
                    )}
                    onChange={(
                      value,
                    ) =>
                      setForm(
                        (state) => ({
                          ...state,
                          price:
                            Math.max(
                              0,
                              Number(
                                value,
                              ) ||
                                0,
                            ),
                        }),
                      )
                    }
                  />

                  <Field
                    label="Stock"
                    type="number"
                    value={String(
                      form.stock,
                    )}
                    onChange={(
                      value,
                    ) =>
                      setForm(
                        (state) => ({
                          ...state,
                          stock:
                            Math.max(
                              0,
                              Number(
                                value,
                              ) ||
                                0,
                            ),
                        }),
                      )
                    }
                  />
                </div>

                <Field
                  label="Image URL"
                  value={
                    form.image
                  }
                  onChange={(
                    value,
                  ) =>
                    setForm(
                      (state) => ({
                        ...state,
                        image: value,
                      }),
                    )
                  }
                />

                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Description
                  </span>

                  <textarea
                    rows={4}
                    value={
                      form.description
                    }
                    onChange={(event) =>
                      setForm(
                        (state) => ({
                          ...state,
                          description:
                            event
                              .target
                              .value,
                        }),
                      )
                    }
                    className="w-full rounded-2xl border border-border bg-background/60 px-4 py-3 text-sm outline-none focus:border-primary"
                  />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <Field
                    label="Sunlight"
                    value={
                      form.sunlight
                    }
                    onChange={(
                      value,
                    ) =>
                      setForm(
                        (state) => ({
                          ...state,
                          sunlight:
                            value,
                        }),
                      )
                    }
                  />

                  <Field
                    label="Watering"
                    value={
                      form.watering
                    }
                    onChange={(
                      value,
                    ) =>
                      setForm(
                        (state) => ({
                          ...state,
                          watering:
                            value,
                        }),
                      )
                    }
                  />
                </div>

                <Field
                  label="Soil"
                  value={
                    form.soil
                  }
                  onChange={(
                    value,
                  ) =>
                    setForm(
                      (state) => ({
                        ...state,
                        soil: value,
                      }),
                    )
                  }
                />

                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Difficulty
                  </span>

                  <select
                    value={
                      form.difficulty
                    }
                    onChange={(event) =>
                      setForm(
                        (state) => ({
                          ...state,
                          difficulty:
                            normalizeDifficulty(
                              event
                                .target
                                .value,
                            ),
                        }),
                      )
                    }
                    className="w-full rounded-2xl border border-border bg-background/60 px-4 py-3 text-sm"
                  >
                    <option value="easy">
                      Easy
                    </option>
                    <option value="medium">
                      Medium
                    </option>
                    <option value="hard">
                      Hard
                    </option>
                  </select>
                </label>

                <div className="flex flex-wrap gap-4 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={
                        form.featured
                      }
                      onChange={(event) =>
                        setForm(
                          (state) => ({
                            ...state,
                            featured:
                              event
                                .target
                                .checked,
                          }),
                        )
                      }
                    />
                    Featured
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={
                        form.available
                      }
                      onChange={(event) =>
                        setForm(
                          (state) => ({
                            ...state,
                            available:
                              event
                                .target
                                .checked,
                          }),
                        )
                      }
                    />
                    Available
                  </label>
                </div>
{editing && (
  <ProductVariantsEditor
    productId={editing.id}
  />
)}
                <button
                  type="button"
                  onClick={
                    saveProduct
                  }
                  disabled={
                    savingProduct
                  }
                  className="w-full rounded-full bg-primary py-3 font-semibold text-primary-foreground disabled:opacity-60"
                >
                  {savingProduct
                    ? "Saving…"
                    : editing
                      ? "Save changes"
                      : "Add plant"}
                </button>
              </div>
            </div>

            <div className="rounded-3xl glass p-6">
              <h2 className="font-display text-2xl">
                Current plants
              </h2>

              <div className="mt-5 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="pb-3">
                        Plant
                      </th>
                      <th className="pb-3">
                        Category
                      </th>
                      <th className="pb-3">
                        Price
                      </th>
                      <th className="pb-3">
                        Stock
                      </th>
                      <th className="pb-3">
                        Status
                      </th>
                      <th className="pb-3" />
                    </tr>
                  </thead>

                  <tbody>
                    {products.map(
                      (
                        product: Product,
                      ) => (
                        <tr
                          key={
                            product.id
                          }
                          className="border-t border-border/60"
                        >
                          <td className="py-3">
                            <div className="font-semibold">
                              {
                                product.name
                              }
                            </div>

                            <div className="text-xs text-muted-foreground">
                              {
                                product.slug
                              }
                            </div>
                          </td>

                          <td className="py-3 text-muted-foreground">
                            {
                              product.categoryName ??
                              "—"
                            }
                          </td>

                          <td className="py-3 font-semibold">
                            ₹
                            {Number(
                              product.price,
                            ).toLocaleString(
                              "en-IN",
                            )}
                          </td>

                          <td className="py-3">
                            {
                              product.stock
                            }
                          </td>

                          <td className="py-3">
                            <span
                              className={
                                product.available
                                  ? "text-green-600"
                                  : "text-rose-600"
                              }
                            >
                              {product.available
                                ? "Available"
                                : "Hidden"}
                            </span>
                          </td>

                          <td className="py-3">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  startEdit(
                                    product,
                                  )
                                }
                                className="rounded-full border border-border px-3 py-1 text-xs font-semibold hover:border-primary"
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                disabled={
                                  deleteProduct.isPending
                                }
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      `Delete "${product.name}"? This cannot be undone.`,
                                    )
                                  ) {
                                    deleteProduct.mutate(
                                      product.id,
                                    );
                                  }
                                }}
                                className="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* COVER SIZES */}
        {tab === "covers" && (
          <section className="mt-8 grid gap-8 lg:grid-cols-[340px_1fr]">
            <div className="rounded-3xl glass p-6">
              <h2 className="font-display text-2xl">
                Add cover size
              </h2>

              <div className="mt-5 space-y-3">
                <Field
                  label="Label"
                  value={
                    coverForm.label
                  }
                  onChange={(value) =>
                    setCoverForm(
                      (state) => ({
                        ...state,
                        label: value,
                      }),
                    )
                  }
                />

                <Field
                  label="Price increase ₹"
                  type="number"
                  value={String(
                    coverForm.priceDelta,
                  )}
                  onChange={(value) =>
                    setCoverForm(
                      (state) => ({
                        ...state,
                        priceDelta:
                          Math.max(
                            0,
                            Number(
                              value,
                            ) || 0,
                          ),
                      }),
                    )
                  }
                />

                <Field
                  label="Sort order"
                  type="number"
                  value={String(
                    coverForm.sortOrder,
                  )}
                  onChange={(value) =>
                    setCoverForm(
                      (state) => ({
                        ...state,
                        sortOrder:
                          Math.max(
                            0,
                            Number(
                              value,
                            ) || 0,
                          ),
                      }),
                    )
                  }
                />

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={
                      coverForm.active
                    }
                    onChange={(event) =>
                      setCoverForm(
                        (state) => ({
                          ...state,
                          active:
                            event
                              .target
                              .checked,
                        }),
                      )
                    }
                  />
                  Active
                </label>

                <button
                  type="button"
                  onClick={() =>
                    createCover.mutate(
                      coverForm,
                    )
                  }
                  disabled={
                    createCover.isPending
                  }
                  className="w-full rounded-full bg-primary py-3 font-semibold text-primary-foreground disabled:opacity-60"
                >
                  {createCover.isPending
                    ? "Saving…"
                    : "Add cover size"}
                </button>
              </div>
            </div>

            <div className="rounded-3xl glass p-6">
              <h2 className="font-display text-2xl">
                Cover sizes
              </h2>

              <div className="mt-5 space-y-3">
                {covers.map(
                  (cover: CoverSize) => (
                    <CoverSizeRow
                      key={cover.id}
                      cover={cover}
                      onSave={(payload) =>
                        updateCover.mutate(
                          payload,
                        )
                      }
                      onDelete={(id) => {
                        if (
                          window.confirm(
                            `Delete cover size "${cover.label}"? This cannot be undone.`,
                          )
                        ) {
                          deleteCover.mutate(
                            id,
                          );
                        }
                      }}
                      deleting={
                        deleteCover.isPending
                      }
                    />
                  ),
                )}
              </div>
            </div>
          </section>
        )}

        {/* ORDERS */}
        {tab === "orders" && (
          <section className="mt-8 rounded-3xl glass p-6">
            <h2 className="font-display text-2xl">
              Orders
            </h2>

            <div className="mt-5 space-y-4">
              {!ordersQuery.isLoading &&
                orders.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No orders yet.
                  </p>
                )}

              {orders.map(
                (order: any) => (
                  <article
                    key={order.id}
                    className="rounded-2xl border border-border/70 p-5"
                  >
                    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                      <div>
                        <h3 className="font-semibold">
                          {
                            order.order_number
                          }
                        </h3>

                        <p className="text-sm text-muted-foreground">
                          {
                            order.customer_name
                          }{" "}
                          ·{" "}
                          {
                            order.phone
                          }
                        </p>

                        <p className="text-xs text-muted-foreground">
                          {
                            order.email
                          }
                        </p>
                      </div>

                      <div className="text-left md:text-right">
                        <div className="font-semibold text-primary">
                          ₹
                          {Number(
                            order.total,
                          ).toLocaleString(
                            "en-IN",
                          )}
                        </div>

                        <div className="text-xs text-muted-foreground">
                          Payment:{" "}
                          {
                            order.payment_status
                          }
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 space-y-1 text-sm">
                      {order.order_items?.map(
                        (
                          item: any,
                          index: number,
                        ) => (
                          <div
                            key={`${order.id}-${index}`}
                            className="flex justify-between gap-4"
                          >
                            <span className="text-muted-foreground">
                              {
                                item.product_name
                              }

                              {item.cover_size
                                ? ` (${item.cover_size})`
                                : ""}

                              {" × "}
                              {
                                item.quantity
                              }
                            </span>

                            <span>
                              ₹
                              {Number(
                                item.line_total,
                              ).toLocaleString(
                                "en-IN",
                              )}
                            </span>
                          </div>
                        ),
                      )}
                    </div>

                    <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="text-sm text-muted-foreground">
                        {
                          order.address
                        }
                        ,{" "}
                        {
                          order.city
                        }
                        ,{" "}
                        {
                          order.state
                        }{" "}
                        {
                          order.pincode
                        }
                      </div>

                      <select
                        value={
                          order.order_status
                        }
                        onChange={(event) =>
                          updateOrder.mutate({
                            id: order.id,
                            status:
                              event.target
                                .value as
                                | "placed"
                                | "confirmed"
                                | "packed"
                                | "shipped"
                                | "delivered"
                                | "cancelled",
                          })
                        }
                        className="rounded-full border border-border bg-background/60 px-4 py-2 text-sm"
                      >
                        {[
                          "placed",
                          "confirmed",
                          "packed",
                          "shipped",
                          "delivered",
                          "cancelled",
                        ].map(
                          (status) => (
                            <option
                              key={
                                status
                              }
                              value={
                                status
                              }
                            >
                              {status}
                            </option>
                          ),
                        )}
                      </select>
                    </div>
                  </article>
                ),
              )}
            </div>
          </section>
        )}
      </main>
    </>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-semibold ${
        active
          ? "bg-primary text-primary-foreground"
          : "border border-border bg-background/60"
      }`}
    >
      {children}
    </button>
  );
}

function CoverSizeRow({
  cover,
  onSave,
  onDelete,
  deleting,
}: {
  cover: CoverSize;
  onSave: (payload: {
    id: string;
    label: string;
    priceDelta: number;
    sortOrder: number;
    active: boolean;
  }) => void;
  onDelete: (id: string) => void;
  deleting: boolean;
}) {
  const [label, setLabel] =
    useState(cover.label);

  const [priceDelta, setPriceDelta] =
    useState(
      Number(
        cover.price_delta,
      ),
    );

  const [sortOrder, setSortOrder] =
    useState(
      Number(
        cover.sort_order,
      ),
    );

  const [active, setActive] =
    useState(
      Boolean(
        cover.active,
      ),
    );

  return (
    <div className="grid gap-3 rounded-2xl border border-border/70 p-4 md:grid-cols-[1fr_140px_100px_110px_auto]">
      <input
        value={label}
        onChange={(event) =>
          setLabel(
            event.target.value,
          )
        }
        className="rounded-xl border border-border bg-background/60 px-3 py-2 text-sm"
      />

      <input
        type="number"
        value={priceDelta}
        onChange={(event) =>
          setPriceDelta(
            Number(
              event.target.value,
            ) || 0,
          )
        }
        className="rounded-xl border border-border bg-background/60 px-3 py-2 text-sm"
      />

      <input
        type="number"
        value={sortOrder}
        onChange={(event) =>
          setSortOrder(
            Number(
              event.target.value,
            ) || 0,
          )
        }
        className="rounded-xl border border-border bg-background/60 px-3 py-2 text-sm"
      />

      <label className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm">
        <input
          type="checkbox"
          checked={active}
          onChange={(event) =>
            setActive(
              event.target.checked,
            )
          }
        />
        Active
      </label>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() =>
            onSave({
              id: cover.id,
              label,
              priceDelta,
              sortOrder,
              active,
            })
          }
          className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
        >
          Save
        </button>

        <button
          type="button"
          disabled={deleting}
          onClick={() =>
            onDelete(
              cover.id,
            )
          }
          className="rounded-full border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (
    value: string,
  ) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>

      <input
        type={type}
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value,
          )
        }
        className="w-full rounded-2xl border border-border bg-background/60 px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
      />
    </label>
  );
}

function slugify(
  value: string,
) {
  return value
    .trim()
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      "-",
    )
    .replace(
      /^-+|-+$/g,
      "",
    );
}

function normalizeDifficulty(
  value: string,
): Difficulty {
  const normalized =
    value
      .trim()
      .toLowerCase();

  if (
    normalized ===
    "medium"
  ) {
    return "medium";
  }

  if (
    normalized ===
    "hard"
  ) {
    return "hard";
  }

  return "easy";
}