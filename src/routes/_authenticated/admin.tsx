import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
      { title: "Admin — Chandra Gardens" },
      {
        name: "description",
        content: "Chandra Gardens admin dashboard.",
      },
    ],
  }),
  component: AdminPage,
});

type Product = Awaited<ReturnType<typeof adminGetProducts>>[number];
type CoverSize = Awaited<ReturnType<typeof adminGetCoverSizes>>[number];

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
  difficulty: "Easy" as "Easy" | "Medium" | "Hard",
};

function AdminPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"products" | "covers" | "orders">("products");
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyProduct);
  const [coverForm, setCoverForm] = useState({
    label: "",
    priceDelta: 0,
    sortOrder: 1,
    active: true,
  });
  const [error, setError] = useState("");

  const fetchProducts = useServerFn(adminGetProducts);
  const fetchCategories = useServerFn(adminGetCategories);
  const fetchCovers = useServerFn(adminGetCoverSizes);
  const fetchOrders = useServerFn(adminGetOrders);

  const createProductFn = useServerFn(adminCreateProduct);
  const updateProductFn = useServerFn(adminUpdateProduct);
  const createCoverFn = useServerFn(adminCreateCoverSize);
  const updateCoverFn = useServerFn(adminUpdateCoverSize);
  const updateOrderFn = useServerFn(adminUpdateOrderStatus);

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

  const createProduct = useMutation({
    mutationFn: (data: typeof emptyProduct) =>
      createProductFn({ data }),
    onSuccess: async () => {
      setForm(emptyProduct);
      setEditing(null);
      setError("");
      await qc.invalidateQueries({ queryKey: ["admin-products"] });
    },
    onError: (e) => setError(e instanceof Error ? e.message : String(e)),
  });

  const updateProduct = useMutation({
    mutationFn: (data: typeof emptyProduct & { id: string }) =>
      updateProductFn({ data }),
    onSuccess: async () => {
      setForm(emptyProduct);
      setEditing(null);
      setError("");
      await qc.invalidateQueries({ queryKey: ["admin-products"] });
    },
    onError: (e) => setError(e instanceof Error ? e.message : String(e)),
  });

  const createCover = useMutation({
    mutationFn: (data: typeof coverForm) =>
      createCoverFn({ data }),
    onSuccess: async () => {
      setCoverForm({
        label: "",
        priceDelta: 0,
        sortOrder: (coversQuery.data?.length ?? 0) + 1,
        active: true,
      });
      setError("");
      await qc.invalidateQueries({ queryKey: ["admin-covers"] });
    },
    onError: (e) => setError(e instanceof Error ? e.message : String(e)),
  });

  const updateCover = useMutation({
    mutationFn: (
      data: typeof coverForm & { id: string },
    ) => updateCoverFn({ data }),
    onSuccess: async () => {
      setError("");
      await qc.invalidateQueries({ queryKey: ["admin-covers"] });
    },
    onError: (e) => setError(e instanceof Error ? e.message : String(e)),
  });

  const updateOrder = useMutation({
    mutationFn: (data: {
      id: string;
      status:
        | "placed"
        | "confirmed"
        | "packed"
        | "shipped"
        | "delivered"
        | "cancelled";
    }) => updateOrderFn({ data }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin-orders"] });
    },
    onError: (e) => setError(e instanceof Error ? e.message : String(e)),
  });

  const counts = useMemo(
    () => ({
      products: productsQuery.data?.length ?? 0,
      covers: coversQuery.data?.length ?? 0,
      orders: ordersQuery.data?.length ?? 0,
    }),
    [productsQuery.data, coversQuery.data, ordersQuery.data],
  );

  const startEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name,
      slug: p.slug,
      description: p.description ?? "",
      categoryId: p.category_id,
      price: Number(p.price),
      stock: Number(p.stock),
      image: p.image ?? "",
      featured: Boolean(p.featured),
      available: Boolean(p.available),
      sunlight: p.sunlight ?? "",
      watering: p.watering ?? "",
      soil: p.soil ?? "",
      difficulty: p.difficulty,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const saveProduct = () => {
    setError("");
    if (!form.name.trim()) {
      setError("Plant name is required.");
      return;
    }

    const payload = {
      ...form,
      slug: form.slug.trim() || form.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      image: form.image.trim() || null,
      sunlight: form.sunlight.trim() || null,
      watering: form.watering.trim() || null,
      soil: form.soil.trim() || null,
    };

    if (editing) {
      updateProduct.mutate({ ...payload, id: editing.id });
    } else {
      createProduct.mutate(payload);
    }
  };

  const loading =
    productsQuery.isLoading ||
    categoriesQuery.isLoading ||
    coversQuery.isLoading;

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
              Manage plants, stock, prices, cover sizes and orders.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {(["products", "covers", "orders"] as const).map((item) => (
              <button
                key={item}
                onClick={() => setTab(item)}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  tab === item
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-background/60"
                }`}
              >
                {item === "products"
                  ? `Products (${counts.products})`
                  : item === "covers"
                    ? `Cover sizes (${counts.covers})`
                    : `Orders (${counts.orders})`}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {error}
          </div>
        )}

        {loading && (
          <div className="mt-8 text-sm text-muted-foreground">
            Loading admin data…
          </div>
        )}

        {tab === "products" && !loading && (
          <section className="mt-8 grid gap-8 lg:grid-cols-[380px_1fr]">
            <div className="rounded-3xl glass p-6">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-2xl">
                  {editing ? "Edit plant" : "Add plant"}
                </h2>

                {editing && (
                  <button
                    className="text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setEditing(null);
                      setForm(emptyProduct);
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>

              <div className="mt-5 space-y-3">
                <Field
                  label="Plant name"
                  value={form.name}
                  onChange={(v) =>
                    setForm((s) => ({
                      ...s,
                      name: v,
                      slug:
                        s.slug ||
                        v.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
                    }))
                  }
                />

                <Field
                  label="Slug"
                  value={form.slug}
                  onChange={(v) =>
                    setForm((s) => ({ ...s, slug: v }))
                  }
                />

                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Category
                  </span>
                  <select
                    value={form.categoryId ?? ""}
                    onChange={(e) =>
                      setForm((s) => ({
                        ...s,
                        categoryId: e.target.value || null,
                      }))
                    }
                    className="w-full rounded-2xl border border-border bg-background/60 px-4 py-3 text-sm"
                  >
                    <option value="">No category</option>
                    {categoriesQuery.data?.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <Field
                    label="Price ₹"
                    type="number"
                    value={String(form.price)}
                    onChange={(v) =>
                      setForm((s) => ({
                        ...s,
                        price: Number(v) || 0,
                      }))
                    }
                  />
                  <Field
                    label="Stock"
                    type="number"
                    value={String(form.stock)}
                    onChange={(v) =>
                      setForm((s) => ({
                        ...s,
                        stock: Math.max(0, Number(v) || 0),
                      }))
                    }
                  />
                </div>

                <Field
                  label="Image URL"
                  value={form.image}
                  onChange={(v) =>
                    setForm((s) => ({ ...s, image: v }))
                  }
                />

                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Description
                  </span>
                  <textarea
                    rows={4}
                    value={form.description}
                    onChange={(e) =>
                      setForm((s) => ({
                        ...s,
                        description: e.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-border bg-background/60 px-4 py-3 text-sm outline-none focus:border-primary"
                  />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <Field
                    label="Sunlight"
                    value={form.sunlight}
                    onChange={(v) =>
                      setForm((s) => ({ ...s, sunlight: v }))
                    }
                  />
                  <Field
                    label="Watering"
                    value={form.watering}
                    onChange={(v) =>
                      setForm((s) => ({ ...s, watering: v }))
                    }
                  />
                </div>

                <Field
                  label="Soil"
                  value={form.soil}
                  onChange={(v) =>
                    setForm((s) => ({ ...s, soil: v }))
                  }
                />

                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Difficulty
                  </span>
                  <select
                    value={form.difficulty}
                    onChange={(e) =>
                      setForm((s) => ({
                        ...s,
                        difficulty: e.target.value as
                          | "Easy"
                          | "Medium"
                          | "Hard",
                      }))
                    }
                    className="w-full rounded-2xl border border-border bg-background/60 px-4 py-3 text-sm"
                  >
                    <option>Easy</option>
                    <option>Medium</option>
                    <option>Hard</option>
                  </select>
                </label>

                <div className="flex flex-wrap gap-4 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.featured}
                      onChange={(e) =>
                        setForm((s) => ({
                          ...s,
                          featured: e.target.checked,
                        }))
                      }
                    />
                    Featured
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.available}
                      onChange={(e) =>
                        setForm((s) => ({
                          ...s,
                          available: e.target.checked,
                        }))
                      }
                    />
                    Available
                  </label>
                </div>

                <button
                  onClick={saveProduct}
                  disabled={createProduct.isPending || updateProduct.isPending}
                  className="w-full rounded-full bg-primary py-3 font-semibold text-primary-foreground disabled:opacity-60"
                >
                  {createProduct.isPending || updateProduct.isPending
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
                      <th className="pb-3">Plant</th>
                      <th className="pb-3">Category</th>
                      <th className="pb-3">Price</th>
                      <th className="pb-3">Stock</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {productsQuery.data?.map((p) => (
                      <tr key={p.id} className="border-t border-border/60">
                        <td className="py-3">
                          <div className="font-semibold">{p.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {p.slug}
                          </div>
                        </td>
                        <td className="py-3 text-muted-foreground">
                          {p.categoryName ?? "—"}
                        </td>
                        <td className="py-3 font-semibold">
                          ₹{Number(p.price).toLocaleString("en-IN")}
                        </td>
                        <td className="py-3">{p.stock}</td>
                        <td className="py-3">
                          <span
                            className={
                              p.available
                                ? "text-green-600"
                                : "text-rose-600"
                            }
                          >
                            {p.available ? "Available" : "Hidden"}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => startEdit(p)}
                            className="rounded-full border border-border px-3 py-1 text-xs font-semibold hover:border-primary"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {tab === "covers" && !loading && (
          <section className="mt-8 grid gap-8 lg:grid-cols-[340px_1fr]">
            <div className="rounded-3xl glass p-6">
              <h2 className="font-display text-2xl">
                Add cover size
              </h2>

              <div className="mt-5 space-y-3">
                <Field
                  label="Label"
                  value={coverForm.label}
                  onChange={(v) =>
                    setCoverForm((s) => ({ ...s, label: v }))
                  }
                />

                <Field
                  label="Price increase ₹"
                  type="number"
                  value={String(coverForm.priceDelta)}
                  onChange={(v) =>
                    setCoverForm((s) => ({
                      ...s,
                      priceDelta: Math.max(0, Number(v) || 0),
                    }))
                  }
                />

                <Field
                  label="Sort order"
                  type="number"
                  value={String(coverForm.sortOrder)}
                  onChange={(v) =>
                    setCoverForm((s) => ({
                      ...s,
                      sortOrder: Math.max(0, Number(v) || 0),
                    }))
                  }
                />

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={coverForm.active}
                    onChange={(e) =>
                      setCoverForm((s) => ({
                        ...s,
                        active: e.target.checked,
                      }))
                    }
                  />
                  Active
                </label>

                <button
                  onClick={() => createCover.mutate(coverForm)}
                  disabled={createCover.isPending}
                  className="w-full rounded-full bg-primary py-3 font-semibold text-primary-foreground disabled:opacity-60"
                >
                  {createCover.isPending ? "Saving…" : "Add cover size"}
                </button>
              </div>
            </div>

            <div className="rounded-3xl glass p-6">
              <h2 className="font-display text-2xl">
                Cover sizes
              </h2>

              <div className="mt-5 space-y-3">
                {coversQuery.data?.map((c: CoverSize) => (
                  <div
                    key={c.id}
                    className="grid gap-3 rounded-2xl border border-border/70 p-4 md:grid-cols-[1fr_140px_100px_110px_auto]"
                  >
                    <input
                      defaultValue={c.label}
                      onChange={(e) => {
                        c.label = e.target.value;
                      }}
                      className="rounded-xl border border-border bg-background/60 px-3 py-2 text-sm"
                    />

                    <input
                      type="number"
                      defaultValue={c.price_delta}
                      onChange={(e) => {
                        c.price_delta = Number(e.target.value) || 0;
                      }}
                      className="rounded-xl border border-border bg-background/60 px-3 py-2 text-sm"
                    />

                    <input
                      type="number"
                      defaultValue={c.sort_order}
                      onChange={(e) => {
                        c.sort_order = Number(e.target.value) || 0;
                      }}
                      className="rounded-xl border border-border bg-background/60 px-3 py-2 text-sm"
                    />

                    <label className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        defaultChecked={c.active}
                        onChange={(e) => {
                          c.active = e.target.checked;
                        }}
                      />
                      Active
                    </label>

                    <button
                      onClick={() =>
                        updateCover.mutate({
                          id: c.id,
                          label: c.label,
                          priceDelta: Number(c.price_delta),
                          sortOrder: Number(c.sort_order),
                          active: Boolean(c.active),
                        })
                      }
                      className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
                    >
                      Save
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

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

              {ordersQuery.data?.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No orders yet.
                </p>
              )}

              {ordersQuery.data?.map((order: any) => (
                <article
                  key={order.id}
                  className="rounded-2xl border border-border/70 p-5"
                >
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                    <div>
                      <h3 className="font-semibold">
                        {order.order_number}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {order.customer_name} · {order.phone}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {order.email}
                      </p>
                    </div>

                    <div className="text-left md:text-right">
                      <div className="font-semibold text-primary">
                        ₹{Number(order.total).toLocaleString("en-IN")}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Payment: {order.payment_status}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-1 text-sm">
                    {order.order_items?.map((item: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex justify-between gap-4"
                      >
                        <span className="text-muted-foreground">
                          {item.product_name}
                          {item.cover_size
                            ? ` (${item.cover_size})`
                            : ""}{" "}
                          × {item.quantity}
                        </span>
                        <span>
                          ₹{Number(item.line_total).toLocaleString("en-IN")}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="text-sm text-muted-foreground">
                      {order.address}, {order.city}, {order.state}{" "}
                      {order.pincode}
                    </div>

                    <select
                      value={order.order_status}
                      onChange={(e) =>
                        updateOrder.mutate({
                          id: order.id,
                          status: e.target.value as any,
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
                      ].map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
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
  onChange: (value: string) => void;
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
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-border bg-background/60 px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
      />
    </label>
  );
}
