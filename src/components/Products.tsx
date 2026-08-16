import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { PLANTS, type Plant } from "@/lib/plants";
import { SectionHeader } from "./Categories";
import { useLocalList, WHATSAPP } from "@/lib/site";
import {
  listProducts,
  listCoverSizes,
  type CoverSize,
} from "@/lib/catalog.functions";
import { addToCart } from "@/lib/cart.functions";
import { useAuth } from "@/hooks/use-auth";

const CATS = ["All", "Decorative", "Fruit"];
const SORTS = ["Featured", "Name A-Z", "Price ↑", "Price ↓"];

export function Products({
  filter,
  setFilter,
}: {
  filter: string;
  setFilter: (f: string) => void;
}) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState(SORTS[0]);
  const [grid, setGrid] = useState(true);
  const [quick, setQuick] = useState<Plant | null>(null);

  const wishlist = useLocalList("wishlist");
  const recent = useLocalList("recent");

  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();

  const fetchProducts = useServerFn(listProducts);
  const fetchCoverSizes = useServerFn(listCoverSizes);
  const add = useServerFn(addToCart);

  const {
    data: shopProducts = [],
    isLoading: productsLoading,
    error: productsError,
  } = useQuery({
    queryKey: ["shop-products"],
    queryFn: () => fetchProducts(),
  });

  const {
    data: coverSizes = [],
    isLoading: coverSizesLoading,
  } = useQuery({
    queryKey: ["cover-sizes"],
    queryFn: () => fetchCoverSizes(),
  });

  const mAdd = useMutation({
    mutationFn: (v: {
      productId: string;
      quantity: number;
      coverSizeId: string | null;
    }) => add({ data: v }),

 onSuccess: (cart) => {
  qc.setQueryData(["cart"], cart);
  qc.invalidateQueries({
    queryKey: ["cart"],
  });
},
    onError: (error) => {
      console.error(
        "Add to cart failed:",
        error,
      );

      alert(
        `Add to cart failed:\n${
          error instanceof Error
            ? error.message
            : String(error)
        }`,
      );
    },
  });

  const onAdd = (
    name: string,
    quantity: number,
    coverSizeId: string | null,
  ) => {
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }

    console.log("ADD TO CART CLICKED", {
      name,
      quantity,
      coverSizeId,
    });

    if (!shopProducts.length) {
      alert(
        "Products have not loaded from Supabase yet.",
      );
      return;
    }

    const match = shopProducts.find(
      (sp) =>
        sp.name.trim().toLowerCase() ===
        name.trim().toLowerCase(),
    );

    if (!match) {
      console.error(
        "Product not found in Supabase:",
        name,
        shopProducts,
      );

     alert(`Product "${name}" was not found in the Supabase products table.`);
      return;
    }

    console.log(
      "MATCHED SUPABASE PRODUCT:",
      match,
    );

    mAdd.mutate({
      productId: match.id,
      quantity,
      coverSizeId,
    });
  };

  const items = useMemo(() => {
    let list = PLANTS.filter(
      (p) =>
        (filter === "All" ||
          p.category === filter) &&
        (q === "" ||
          p.name
            .toLowerCase()
            .includes(q.toLowerCase())),
    );

    if (sort === "Name A-Z") {
      list = [...list].sort((a, b) =>
        a.name.localeCompare(b.name),
      );
    }

    if (sort === "Price ↑") {
      list = [...list].sort(
        (a, b) =>
          a.sizes[0].price -
          b.sizes[0].price,
      );
    }

    if (sort === "Price ↓") {
      list = [...list].sort(
        (a, b) =>
          b.sizes[0].price -
          a.sizes[0].price,
      );
    }

    return list;
  }, [filter, q, sort]);

  const suggestions =
    q.length > 0
      ? PLANTS.filter((p) =>
          p.name
            .toLowerCase()
            .includes(q.toLowerCase()),
        ).slice(0, 4)
      : [];

  return (
    <section
      id="products"
      className="relative py-24"
    >
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeader
          eyebrow="Catalogue"
          title="Our finest greens"
          subtitle="Hand-picked plants delivered healthy and ready to thrive in your space."
        />

        <div className="mt-12 flex flex-col gap-4 rounded-3xl glass p-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />

            <input
              value={q}
              onChange={(e) =>
                setQ(e.target.value)
              }
              placeholder="Search plants…"
              aria-label="Search plants"
              className="w-full rounded-full border border-border bg-background/60 py-3 pl-11 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
            />

            {suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-2xl glass shadow-lg">
                {suggestions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setQ(s.name);
                      setQuick(s);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-primary/5"
                  >
                    <img
                      src={s.image}
                      alt=""
                      className="h-8 w-8 rounded-lg object-cover"
                    />

                    <span className="font-medium">
                      {s.name}
                    </span>

                    <span className="ml-auto text-xs text-muted-foreground">
                      {s.category}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {CATS.map((c) => (
              <button
                key={c}
                onClick={() => setFilter(c)}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                  filter === c
                    ? "bg-primary text-primary-foreground shadow"
                    : "bg-background/60 text-foreground/70 hover:bg-primary/10"
                }`}
              >
                {c}
              </button>
            ))}

            <select
              value={sort}
              onChange={(e) =>
                setSort(e.target.value)
              }
              className="rounded-full border border-border bg-background/60 px-3 py-2 text-xs"
            >
              {SORTS.map((s) => (
                <option key={s}>
                  {s}
                </option>
              ))}
            </select>

            <div className="flex overflow-hidden rounded-full border border-border bg-background/60">
              <button
                onClick={() => setGrid(true)}
                aria-label="Grid"
                className={`px-3 py-2 text-xs ${
                  grid
                    ? "bg-primary text-primary-foreground"
                    : ""
                }`}
              >
                <i className="fa-solid fa-grip" />
              </button>

              <button
                onClick={() => setGrid(false)}
                aria-label="List"
                className={`px-3 py-2 text-xs ${
                  !grid
                    ? "bg-primary text-primary-foreground"
                    : ""
                }`}
              >
                <i className="fa-solid fa-list" />
              </button>
            </div>
          </div>
        </div>

        {productsLoading && (
          <div className="mt-8 text-center text-sm text-muted-foreground">
            Loading products…
          </div>
        )}

        {productsError && (
          <div className="mt-8 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            Could not load products.

            <div className="mt-1">
              {productsError instanceof Error
                ? productsError.message
                : String(
                    productsError,
                  )}
            </div>
          </div>
        )}

        {coverSizesLoading && (
          <div className="mt-4 text-center text-xs text-muted-foreground">
            Loading cover sizes…
          </div>
        )}

        <div
          className={`mt-10 grid gap-6 ${
            grid
              ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
              : "grid-cols-1"
          }`}
        >
          {items.map((p, i) => (
            <ProductCard
              key={p.id}
              p={p}
              list={!grid}
              wished={wishlist.has(p.id)}
              onWish={() =>
                wishlist.toggle(p.id)
              }
              coverSizes={coverSizes}
              onAdd={(
                qty,
                coverSizeId,
              ) =>
                onAdd(
                  p.name,
                  qty,
                  coverSizeId,
                )
              }
              onQuick={() => {
                setQuick(p);
                recent.add(p.id);
              }}
              adding={mAdd.isPending}
              i={i}
            />
          ))}

          {items.length === 0 && (
            <div className="col-span-full rounded-3xl glass p-12 text-center text-muted-foreground">
              No plants match your search.
            </div>
          )}
        </div>

        <RecentlyViewed
          ids={recent.items}
          onOpen={(p) =>
            setQuick(p)
          }
        />
      </div>

      {quick && (
        <QuickView
          p={quick}
          onClose={() =>
            setQuick(null)
          }
        />
      )}
    </section>
  );
}

function ProductCard({
  p,
  list,
  wished,
  onWish,
  onQuick,
  onAdd,
  coverSizes,
  adding,
  i,
}: {
  p: Plant;
  list: boolean;
  wished: boolean;
  onWish: () => void;
  onQuick: () => void;
  onAdd: (
    qty: number,
    coverSizeId: string | null,
  ) => void;
  coverSizes: CoverSize[];
  adding: boolean;
  i: number;
}) {
  const [qty, setQty] =
    useState(1);

  const [coverId, setCoverId] =
    useState("");

  const cover =
    coverSizes.find(
      (c) => c.id === coverId,
    ) ??
    coverSizes[0] ??
    null;

  /*
   * Your Plant type uses sizes[].
   * Therefore p.sizes[0].price is used
   * instead of p.price.
   */
  const basePrice =
    p.sizes[0]?.price ?? 0;

  const price =
    basePrice +
    (cover?.priceDelta ?? 0);

  const diffColor =
    p.difficulty === "Easy"
      ? "text-green-600"
      : p.difficulty ===
          "Medium"
        ? "text-amber-600"
        : "text-rose-600";

  return (
    <article
      className={`group relative overflow-hidden rounded-3xl glass transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-glow)] ${
        list
          ? "flex flex-col sm:flex-row"
          : ""
      }`}
      style={{
        animation: `fade-in 0.5s ease-out ${
          i * 0.06
        }s backwards`,
      }}
    >
      <div
        className={`relative overflow-hidden ${
          list
            ? "sm:w-72 sm:flex-shrink-0"
            : "aspect-square"
        }`}
      >
        <img
          src={p.image}
          alt={p.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
        />

        <button
          onClick={onWish}
          aria-label="Wishlist"
          className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full glass transition hover:scale-110"
        >
          <i
            className={`fa-${
              wished
                ? "solid"
                : "regular"
            } fa-heart ${
              wished
                ? "text-rose-500"
                : ""
            }`}
          />
        </button>

        <div className="absolute left-3 top-3 rounded-full bg-primary/90 px-3 py-1 text-xs font-semibold text-primary-foreground">
          {p.category}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-xl font-medium">
            {p.name}
          </h3>

          <span className="font-display text-lg font-semibold text-primary">
            ₹{price}
          </span>
        </div>

        <div
          className={`mt-1 text-xs font-medium ${diffColor}`}
        >
          <i className="fa-solid fa-seedling mr-1" />
          {p.difficulty} care
        </div>

        {list && (
          <p className="mt-2 text-sm text-muted-foreground">
            {p.description}
          </p>
        )}

        {coverSizes.length > 0 && (
          <label className="mt-3 block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Cover size
            </span>

            <select
              value={
                cover?.id ?? ""
              }
              onChange={(e) =>
                setCoverId(
                  e.target.value,
                )
              }
              className="w-full rounded-full border border-border bg-background/60 px-3 py-2 text-xs"
            >
              {coverSizes.map(
                (c) => (
                  <option
                    key={c.id}
                    value={c.id}
                  >
                    {c.label}

                    {c.priceDelta >
                    0
                      ? ` (+₹${c.priceDelta})`
                      : ""}
                  </option>
                ),
              )}
            </select>
          </label>
        )}

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center rounded-full border border-border">
            <button
              onClick={() =>
                setQty(
                  Math.max(
                    1,
                    qty - 1,
                  ),
                )
              }
              className="grid h-8 w-8 place-items-center text-sm"
              aria-label="Decrease"
            >
              −
            </button>

            <span className="w-6 text-center text-sm font-semibold">
              {qty}
            </span>

            <button
              onClick={() =>
                setQty(
                  qty + 1,
                )
              }
              className="grid h-8 w-8 place-items-center text-sm"
              aria-label="Increase"
            >
              +
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() =>
                onAdd(
                  qty,
                  cover?.id ??
                    null,
                )
              }
              disabled={adding}
              className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <i
                className={`fa-solid ${
                  adding
                    ? "fa-spinner fa-spin"
                    : "fa-cart-plus"
                } mr-1`}
              />

              {adding
                ? "Adding..."
                : "Add"}
            </button>

            <button
              onClick={onQuick}
              aria-label="Quick view"
              className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-secondary-foreground hover:bg-primary/10"
            >
              <i className="fa-solid fa-eye text-sm" />
            </button>

            <a
              href={`${WHATSAPP}?text=${encodeURIComponent(
                `Hi! I'd like to inquire about ${qty}x ${p.name}.`,
              )}`}
              target="_blank"
              rel="noreferrer"
              aria-label="WhatsApp"
              className="grid h-9 w-9 place-items-center rounded-full bg-[#25D366] text-white transition-transform hover:scale-110"
            >
              <i className="fa-brands fa-whatsapp text-sm" />
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}

function QuickView({
  p,
  onClose,
}: {
  p: Plant;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center bg-black/60 p-4 backdrop-blur-sm animate-[fade-in_0.2s_ease-out]"
      onClick={onClose}
    >
      <div
        className="relative grid max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-3xl bg-card shadow-2xl md:grid-cols-2"
        onClick={(e) =>
          e.stopPropagation()
        }
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full glass"
        >
          <i className="fa-solid fa-xmark" />
        </button>

        <img
          src={p.image}
          alt={p.name}
          className="h-64 w-full object-cover md:h-full"
        />

        <div className="overflow-y-auto p-8">
          <div className="text-xs font-semibold uppercase tracking-widest text-primary">
            {p.category}
          </div>

          <h3 className="mt-2 font-display text-4xl font-medium">
            {p.name}
          </h3>

          <div className="mt-2 font-display text-2xl font-semibold text-primary">
            ₹{p.sizes[0]?.price ?? 0}
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            {p.description}
          </p>

          <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
            <Detail
              icon="fa-sun"
              label="Light"
              value={p.light}
            />

            <Detail
              icon="fa-droplet"
              label="Water"
              value={p.water}
            />

            <Detail
              icon="fa-seedling"
              label="Care"
              value={p.difficulty}
            />

            <Detail
              icon="fa-leaf"
              label="Type"
              value={p.category}
            />
          </dl>

          <a
            href={`${WHATSAPP}?text=${encodeURIComponent(
              `Hi! Tell me more about ${p.name}.`,
            )}`}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] py-3 font-semibold text-white"
          >
            <i className="fa-brands fa-whatsapp" />
            Inquire on WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}

function Detail({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-muted/60 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <i
          className={`fa-solid ${icon} text-primary`}
        />
        {label}
      </div>

      <div className="mt-1 font-semibold">
        {value}
      </div>
    </div>
  );
}

function RecentlyViewed({
  ids,
  onOpen,
}: {
  ids: string[];
  onOpen: (p: Plant) => void;
}) {
  const items = ids
    .map((id) =>
      PLANTS.find(
        (p) => p.id === id,
      ),
    )
    .filter(Boolean) as Plant[];

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="mt-16">
      <h3 className="mb-4 font-display text-2xl font-medium">
        Recently viewed
      </h3>

      <div className="scrollbar-hide flex gap-4 overflow-x-auto pb-2">
        {items.map((p) => (
          <button
            key={p.id}
            onClick={() =>
              onOpen(p)
            }
            className="group flex-shrink-0 overflow-hidden rounded-2xl glass text-left"
            style={{
              width: 180,
            }}
          >
            <img
              src={p.image}
              alt={p.name}
              className="h-32 w-full object-cover transition group-hover:scale-105"
            />

            <div className="p-3">
              <div className="text-sm font-semibold">
                {p.name}
              </div>

              <div className="text-xs text-muted-foreground">
                {p.category}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}