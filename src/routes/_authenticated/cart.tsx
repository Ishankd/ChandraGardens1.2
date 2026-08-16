import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getCart, removeCartItem, updateCartItem, setCartItemCoverSize } from "@/lib/cart.functions";
import { listCoverSizes } from "@/lib/catalog.functions";
import { inr, FREE_DELIVERY_THRESHOLD } from "@/lib/pricing";
import { Navbar } from "@/components/Navbar";

export const Route = createFileRoute("/_authenticated/cart")({
  head: () => ({
    meta: [
      { title: "Your Cart — Chandra Gardens" },
      { name: "description", content: "Review the plants in your Chandra Gardens cart before checkout." },
      { property: "og:title", content: "Your Cart — Chandra Gardens" },
      { property: "og:description", content: "Review your selected plants and proceed to secure checkout." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchCart = useServerFn(getCart);
  const update = useServerFn(updateCartItem);
  const remove = useServerFn(removeCartItem);
  const setCover = useServerFn(setCartItemCoverSize);
  const fetchCoverSizes = useServerFn(listCoverSizes);
  const { data: coverSizes } = useQuery({
    queryKey: ["cover-sizes"],
    queryFn: () => fetchCoverSizes(),
  });

  const { data, isLoading, error } = useQuery({ queryKey: ["cart"], queryFn: () => fetchCart() });

  const mUpdate = useMutation({
    mutationFn: (v: { itemId: string; quantity: number }) => update({ data: v }),
    onSuccess: (c) => qc.setQueryData(["cart"], c),
  });
  const mCover = useMutation({
    mutationFn: (v: { itemId: string; coverSizeId: string | null }) => setCover({ data: v }),
    onSuccess: (c) => qc.setQueryData(["cart"], c),
  });
  const mRemove = useMutation({
    mutationFn: (itemId: string) => remove({ data: { itemId } }),
    onSuccess: (c) => qc.setQueryData(["cart"], c),
  });

  return (
    <>
      <Navbar />
      <main className="mx-auto min-h-screen max-w-5xl px-6 pb-24 pt-32">
        <h1 className="font-display text-4xl font-medium">Your cart</h1>

        {isLoading && <p className="mt-8 text-muted-foreground">Loading your plants…</p>}
        {error && <p className="mt-8 text-rose-600">Could not load your cart.</p>}
        {mUpdate.error && <p className="mt-4 text-rose-600">{(mUpdate.error as Error).message}</p>}

        {data && data.lines.length === 0 && (
          <div className="mt-10 rounded-3xl glass p-12 text-center">
            <p className="text-muted-foreground">Your cart is empty.</p>
            <Link to="/" className="mt-4 inline-block rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground">
              Browse plants
            </Link>
          </div>
        )}

        {data && data.lines.length > 0 && (
          <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_320px]">
            <ul className="space-y-4">
              {data.lines.map((l) => (
                <li key={l.itemId} className="flex gap-4 rounded-3xl glass p-4">
                  {l.image && <img src={l.image} alt={l.name} className="h-24 w-24 rounded-2xl object-cover" />}
                  <div className="flex flex-1 flex-col">
                    <div className="flex justify-between gap-3">
                      <h2 className="font-display text-lg font-medium">{l.name}</h2>
                      <span className="font-semibold text-primary">{inr(l.lineTotal)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {inr(l.unitPrice)} each · {l.stock} in stock
                      {l.coverSizeLabel ? ` · ${l.coverSizeLabel}` : ""}
                    </p>
                    {coverSizes && coverSizes.length > 0 && (
                      <select
                        aria-label="Cover size"
                        value={l.coverSizeId ?? ""}
                        onChange={(e) =>
                          mCover.mutate({ itemId: l.itemId, coverSizeId: e.target.value || null })
                        }
                        className="mt-2 w-fit rounded-full border border-border bg-background/60 px-3 py-1.5 text-xs"
                      >
                        <option value="">Standard cover</option>
                        {coverSizes.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.label}
                            {c.priceDelta > 0 ? ` (+${inr(c.priceDelta)})` : ""}
                          </option>
                        ))}
                      </select>
                    )}
                    <div className="mt-auto flex items-center gap-3">
                      <div className="flex items-center rounded-full border border-border">
                        <button
                          aria-label="Decrease"
                          className="grid h-8 w-8 place-items-center"
                          onClick={() => mUpdate.mutate({ itemId: l.itemId, quantity: l.quantity - 1 })}
                        >−</button>
                        <span className="w-8 text-center text-sm font-semibold">{l.quantity}</span>
                        <button
                          aria-label="Increase"
                          className="grid h-8 w-8 place-items-center"
                          onClick={() => mUpdate.mutate({ itemId: l.itemId, quantity: l.quantity + 1 })}
                        >+</button>
                      </div>
                      <button className="text-xs text-muted-foreground hover:text-rose-600" onClick={() => mRemove.mutate(l.itemId)}>
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <aside className="h-fit rounded-3xl glass p-6">
              <h2 className="font-display text-xl font-medium">Summary</h2>
              <dl className="mt-4 space-y-2 text-sm">
                <Row label="Subtotal" value={inr(data.subtotal)} />
                <Row label="Delivery" value={data.deliveryCharge === 0 ? "Free" : inr(data.deliveryCharge)} />
                <div className="border-t border-border pt-2">
                  <Row label="Total" value={inr(data.total)} bold />
                </div>
              </dl>
              {data.deliveryCharge > 0 && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Free delivery on orders above {inr(FREE_DELIVERY_THRESHOLD)}.
                </p>
              )}
              <button
                onClick={() => navigate({ to: "/checkout" })}
                className="mt-6 w-full rounded-full bg-primary py-3 font-semibold text-primary-foreground"
              >
                Proceed to checkout
              </button>
            </aside>
          </div>
        )}
      </main>
    </>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-semibold" : ""}`}>
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
