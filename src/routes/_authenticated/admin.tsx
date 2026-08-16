
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { Navbar } from "@/components/Navbar";
import {
  adminCreateProduct,
  adminCreateCoverSize,
  adminGetCategories,
  adminGetCoverSizes,
  adminGetOrders,
  adminGetProducts,
  adminUpdateCoverSize,
  adminUpdateOrderStatus,
  adminUpdateProduct,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      {
        title: "Admin — Chandra Gardens",
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

type Product =
  Awaited<
    ReturnType<typeof adminGetProducts>
  >[number];

type CoverSize =
  Awaited<
    ReturnType<typeof adminGetCoverSizes>
  >[number];

type Difficulty =
  | "easy"
  | "medium"
  | "hard";

const emptyProduct = {
  name: "",
  slug: "",
  description: "",
  categoryId: null as string | null,
  price: 0,
  stock: 0,
  image: "",
  featured: false,
  available: true,
  sunlight: "",
  watering: "",
  soil: "",
  difficulty: "easy" as Difficulty,
};

const emptyCover = {
  label: "",
  priceDelta: 0,
  sortOrder: 1,
  active: true,
};

function AdminPage() {
  const qc = useQueryClient();

  const [tab, setTab] = useState<
    "products" | "covers" | "orders"
  >("products");

  const [editing, setEditing] =
    useState<Product | null>(null);

  const [form, setForm] =
    useState(emptyProduct);

  const [coverForm, setCoverForm] =
    useState(emptyCover);

  const [error, setError] =
    useState("");

  /* ---------------------------------------------------
     Server functions
  --------------------------------------------------- */

  const fetchProducts =
    useServerFn(adminGetProducts);

  const fetchCategories =
    useServerFn(adminGetCategories);

  const fetchCovers =
    useServerFn(adminGetCoverSizes);

  const fetchOrders =
    useServerFn(adminGetOrders);

  const createProductFn =
    useServerFn(adminCreateProduct);

  const updateProductFn =
    useServerFn(adminUpdateProduct);

  const createCoverFn =
    useServerFn(adminCreateCoverSize);

  const updateCoverFn =
    useServerFn(adminUpdateCoverSize);

  const updateOrderFn =
    useServerFn(adminUpdateOrderStatus);

  /* ---------------------------------------------------
     Queries
  --------------------------------------------------- */

  const productsQuery = useQuery({
    queryKey: ["admin-products"],
    queryFn: () => fetchProducts(),
  });

  const categoriesQuery = useQuery({
    queryKey: ["admin-categories"],
    queryFn: () => fetchCategories(),
  });

  const coversQuery = useQuery({
    queryKey: ["admin-covers"],
    queryFn: () => fetchCovers(),
  });

  const ordersQuery = useQuery({
    queryKey: ["admin-orders"],
    queryFn: () => fetchOrders(),
  });

  /* ---------------------------------------------------
     Product mutations
  --------------------------------------------------- */

  const createProduct =
    useMutation({
      mutationFn: (
        data: typeof emptyProduct,
      ) =>
        createProductFn({
          data: {
            ...data,
            image: data.image,
            sunlight:
              data.sunlight,
            watering:
              data.watering,
            soil: data.soil,
          },
        }),

      onSuccess: async () => {
        setForm(emptyProduct);
        setEditing(null);
        setError("");

        await qc.invalidateQueries({
          queryKey: ["admin-products"],
        });
      },

      onError: (e) => {
        setError(
          e instanceof Error
            ? e.message
            : String(e),
        );
      },
    });

  const updateProduct =
    useMutation({
      mutationFn: (
        data: typeof emptyProduct & {
          id: string;
        },
      ) =>
        updateProductFn({
          data: {
            ...data,
            image: data.image,
            sunlight:
              data.sunlight,
            watering:
              data.watering,
            soil: data.soil,
          },
        }),

      onSuccess: async () => {
        setForm(emptyProduct);
        setEditing(null);
        setError("");

        await qc.invalidateQueries({
          queryKey: ["admin-products"],
        });
      },

      onError: (e) => {
        setError(
          e instanceof Error
            ? e.message
            : String(e),
        );
      },
    });

  /* ---------------------------------------------------
     Cover mutations
  --------------------------------------------------- */

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
            (coversQuery.data
              ?.length ?? 0) + 1,
        });

        setError("");

        await qc.invalidateQueries({
          queryKey: ["admin-covers"],
        });
      },

      onError: (e) => {
        setError(
          e instanceof Error
            ? e.message
            : String(e),
        );
      },
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
          queryKey: ["admin-covers"],
        });
      },

      onError: (e) => {
        setError(
          e instanceof Error
            ? e.message
            : String(e),
        );
      },
    });

  /* ---------------------------------------------------
     Order mutation
  --------------------------------------------------- */

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
          queryKey: ["admin-orders"],
        });
      },

      onError: (e) => {
        setError(
          e instanceof Error
            ? e.message
            : String(e),
        );
      },
    });

  /* ---------------------------------------------------
     Counts
  --------------------------------------------------- */

  const counts = useMemo(
    () => ({
      products:
        productsQuery.data?.length ?? 0,

      covers:
        coversQuery.data?.length ?? 0,

      orders:
        ordersQuery.data?.length ?? 0,
    }),
    [
      productsQuery.data,
      coversQuery.data,
      ordersQuery.data,
    ],
  );

  /* ---------------------------------------------------
     Edit product
  --------------------------------------------------- */

  const startEdit = (
    product: Product,
  ) => {
    setEditing(product);

    setForm({
      name: product.name,
      slug: product.slug,
      description:
        product.description ?? "",
      categoryId:
        product.category_id,
      price:
        Number(product.price),
      stock:
        Number(product.stock),
      image:
        product.image ?? "",
      featured:
        Boolean(product.featured),
      available:
        Boolean(product.available),
      sunlight:
        product.sunlight ?? "",
      watering:
        product.watering ?? "",
      soil:
        product.soil ?? "",
      difficulty:
        normalizeDifficulty(
          product.difficulty,
        ),
    });

    setError("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  /* ---------------------------------------------------
     Save product
  --------------------------------------------------- */

  const saveProduct = () => {
    setError("");

    if (!form.name.trim()) {
      setError(
        "Plant name is required.",
      );
      return;
    }

    const payload = {
      ...form,

      slug:
        form.slug.trim() ||
        form.name
          .trim()
          .toLowerCase()
          .replace(
            /[^a-z0-9]+/g,
            "-",
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

  const isSavingProduct =
    createProduct.isPending ||
    updateProduct.isPending;

  const isLoading =
    productsQuery.isLoading ||
    categoriesQuery.isLoading ||
    coversQuery.isLoading;

  /* ---------------------------------------------------
     UI
  --------------------------------------------------- */

  return (
    <>
      <Navbar />

      <main className="mx-auto min-h-screen max-w-7xl px-6 pb-24 pt-32">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Chandra Gardens
            </p>

            <h1 className="mt-2 font-display text-4xl font-medium">
              Admin dashboard
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              Manage plants, stock,
              prices, cover sizes
              and orders.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() =>
                setTab("products")
              }
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                tab === "products"
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-background/60"
              }`}
            >
              Products (
              {counts.products})
            </button>

            <button
              onClick={() =>
                setTab("covers")
              }
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                tab === "covers"
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-background/60"
              }`}
            >
              Cover sizes (
              {counts.covers})
            </button>

            <button
              onClick={() =>
                setTab("orders")
              }
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                tab === "orders"
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-background/60"
              }`}
            >
              Orders (
              {counts.orders})
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {error}
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="mt-8 text-sm text-muted-foreground">
            Loading admin data…
          </div>
        )}

        {/* =================================================
            PRODUCTS
        ================================================= */}
        {tab === "products" &&
          !isLoading && (
            <section className="mt-8 grid gap-8 lg:grid-cols-[380px_1fr]">
              {/* Product form */}
              <div className="rounded-3xl glass p-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-2xl">
                    {editing
                      ? "Edit plant"
                      : "Add plant"}
                  </h2>

                  {editing && (
                    <button
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
                    onChange={(value) =>
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
                    onChange={(value) =>
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
                      onChange={(e) =>
                        setForm(
                          (state) => ({
                            ...state,
                            categoryId:
                              e.target
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

                      {categoriesQuery.data?.map(
                        (
                          category: {
                            id: string;
                            name: string;
                          },
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
                              Number(
                                value,
                              ) ||
                              0,
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
                            stock: Math.max(
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
                    onChange={(value) =>
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
                      onChange={(e) =>
                        setForm(
                          (state) => ({
                            ...state,
                            description:
                              e.target
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
                      onChange={(value) =>
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
                      onChange={(value) =>
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
                    onChange={(value) =>
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
                      onChange={(e) =>
                        setForm(
                          (state) => ({
                            ...state,
                            difficulty:
                              e.target
                                .value as Difficulty,
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
                        onChange={(e) =>
                          setForm(
                            (state) => ({
                              ...state,
                              featured:
                                e.target
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
                        onChange={(e) =>
                          setForm(
                            (state) => ({
                              ...state,
                              available:
                                e.target
                                  .checked,
                            }),
                          )
                        }
                      />
                      Available
                    </label>
                  </div>

                  <button
                    onClick={
                      saveProduct
                    }
                    disabled={
                      isSavingProduct
                    }
                    className="w-full rounded-full bg-primary py-3 font-semibold text-primary-foreground disabled:opacity-60"
                  >
                    {isSavingProduct
                      ? "Saving…"
                      : editing
                        ? "Save changes"
                        : "Add plant"}
                  </button>
                </div>
              </div>

              {/* Product list */}
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
                      {productsQuery.data?.map(
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
                              {product.categoryName ??
                                "—"}
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

                            <td className="py-3 text-right">
                              <button
                                onClick={() =>
                                  startEdit(
                                    product,
                                  )
                                }
                                className="rounded-full border border-border px-3 py-1 text-xs font-semibold hover:border-primary"
                              >
                                Edit
                              </button>
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

        {/* =================================================
            COVER SIZES
        ================================================= */}
        {tab === "covers" &&
          !isLoading && (
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
                              ) ||
                                0,
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
                              ) ||
                                0,
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
                      onChange={(e) =>
                        setCoverForm(
                          (state) => ({
                            ...state,
                            active:
                              e.target
                                .checked,
                          }),
                        )
                      }
                    />
                    Active
                  </label>

                  <button
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
                  {coversQuery.data?.map(
                    (
                      cover: CoverSize,
                    ) => (
                      <CoverSizeRow
                        key={
                          cover.id
                        }
                        cover={cover}
                        onSave={(
                          payload,
                        ) =>
                          updateCover.mutate(
                            payload,
                          )
                        }
                      />
                    ),
                  )}
                </div>
              </div>
            </section>
          )}

        {/* =================================================
            ORDERS
        ================================================= */}
        {tab === "orders" && (
          <section className="mt-8 rounded-3xl glass p-6">
            <h2 className="font-display text-2xl">
              Orders
            </h2>

            <div className="mt-5 space-y-4">
              {ordersQuery.isLoading && (
                <p className="text-sm text-muted-foreground">
                  Loading orders…
                </p>
              )}

              {!ordersQuery.isLoading &&
                ordersQuery.data
                  ?.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No orders yet.
                  </p>
                )}

              {ordersQuery.data?.map(
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
                          {order.email}
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
                            key={
                              `${order.id}-${index}`
                            }
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
                        {order.address},{" "}
                        {order.city},{" "}
                        {order.state}{" "}
                        {
                          order.pincode
                        }
                      </div>

                      <select
                        value={
                          order.order_status
                        }
                        onChange={(e) =>
                          updateOrder.mutate(
                            {
                              id: order.id,
                              status:
                                e.target
                                  .value as
                                  | "placed"
                                  | "confirmed"
                                  | "packed"
                                  | "shipped"
                                  | "delivered"
                                  | "cancelled",
                            },
                          )
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
                          (
                            status,
                          ) => (
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

/* =====================================================
   COVER SIZE ROW
===================================================== */

function CoverSizeRow({
  cover,
  onSave,
}: {
  cover: CoverSize;
  onSave: (
    payload: {
      id: string;
      label: string;
      priceDelta: number;
      sortOrder: number;
      active: boolean;
    },
  ) => void;
}) {
  const [label, setLabel] =
    useState(cover.label);

  const [priceDelta, setPriceDelta] =
    useState(
      Number(cover.price_delta),
    );

  const [sortOrder, setSortOrder] =
    useState(
      Number(cover.sort_order),
    );

  const [active, setActive] =
    useState(
      Boolean(cover.active),
    );

  return (
    <div className="grid gap-3 rounded-2xl border border-border/70 p-4 md:grid-cols-[1fr_140px_100px_110px_auto]">
      <input
        value={label}
        onChange={(e) =>
          setLabel(e.target.value)
        }
        className="rounded-xl border border-border bg-background/60 px-3 py-2 text-sm"
      />

      <input
        type="number"
        value={priceDelta}
        onChange={(e) =>
          setPriceDelta(
            Number(e.target.value) ||
              0,
          )
        }
        className="rounded-xl border border-border bg-background/60 px-3 py-2 text-sm"
      />

      <input
        type="number"
        value={sortOrder}
        onChange={(e) =>
          setSortOrder(
            Number(e.target.value) ||
              0,
          )
        }
        className="rounded-xl border border-border bg-background/60 px-3 py-2 text-sm"
      />

      <label className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) =>
            setActive(
              e.target.checked,
            )
          }
        />
        Active
      </label>

      <button
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
    </div>
  );
}

/* =====================================================
   INPUT
===================================================== */

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
        onChange={(e) =>
          onChange(
            e.target.value,
          )
        }
        className="w-full rounded-2xl border border-border bg-background/60 px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
      />
    </label>
  );
}

/* =====================================================
   HELPERS
===================================================== */

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
    normalized === "medium"
  ) {
    return "medium";
  }

  if (
    normalized === "hard"
  ) {
    return "hard";
  }

  return "easy";
}
