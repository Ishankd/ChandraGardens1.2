import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listMyOrders } from "@/lib/checkout.functions";
import { inr } from "@/lib/pricing";
import { Navbar } from "@/components/Navbar";

export const Route = createFileRoute("/_authenticated/orders")({
  head: () => ({
    meta: [
      { title: "My Orders — Chandra Gardens" },
      { name: "description", content: "Track your Chandra Gardens plant orders, payments and delivery status." },
      { property: "og:title", content: "My Orders — Chandra Gardens" },
      { property: "og:description", content: "Track your nursery orders and delivery status." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OrdersPage,
});

const STATUS = ["placed", "confirmed", "packed", "shipped", "delivered"];

function OrdersPage() {
  const fetchOrders = useServerFn(listMyOrders);
  const { data, isLoading } = useQuery({ queryKey: ["orders"], queryFn: () => fetchOrders() });

  return (
    <>
      <Navbar />
      <main className="mx-auto min-h-screen max-w-4xl px-6 pb-24 pt-32">
        <h1 className="font-display text-4xl font-medium">My orders</h1>
        {isLoading && <p className="mt-8 text-muted-foreground">Loading…</p>}
        {data && data.length === 0 && (
          <div className="mt-10 rounded-3xl glass p-12 text-center">
            <p className="text-muted-foreground">No orders yet.</p>
            <Link to="/" className="mt-4 inline-block rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground">
              Start shopping
            </Link>
          </div>
        )}
        <ul className="mt-8 space-y-5">
          {data?.map((o: any) => {
            const step = STATUS.indexOf(o.order_status);
            return (
              <li key={o.id} className="rounded-3xl glass p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="font-display text-lg font-medium">{o.order_number}</h2>
                    <p className="text-xs text-muted-foreground">
                      {new Date(o.created_at).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-primary">{inr(Number(o.total))}</div>
                    <span
                      className={`text-xs font-semibold ${
                        o.payment_status === "paid" ? "text-green-600" : o.payment_status === "failed" ? "text-rose-600" : "text-amber-600"
                      }`}
                    >
                      {o.payment_status}
                    </span>
                  </div>
                </div>

                <ul className="mt-4 space-y-1 text-sm">
                  {o.order_items?.map((i: any, idx: number) => (
                    <li key={idx} className="flex justify-between">
                      <span className="text-muted-foreground">
                        {i.product_name}
                        {i.cover_size ? ` (${i.cover_size})` : ""} × {i.quantity}
                      </span>
                      <span>{inr(Number(i.line_total))}</span>
                    </li>
                  ))}
                </ul>

                {o.order_status !== "cancelled" && (
                  <ol className="mt-5 flex items-center gap-1 text-[10px] uppercase tracking-wide">
                    {STATUS.map((s, i) => (
                      <li key={s} className="flex-1">
                        <div className={`h-1 rounded-full ${i <= step ? "bg-primary" : "bg-border"}`} />
                        <span className={i <= step ? "text-primary" : "text-muted-foreground"}>{s}</span>
                      </li>
                    ))}
                  </ol>
                )}
                {o.order_status === "cancelled" && (
                  <p className="mt-4 text-sm font-semibold text-rose-600">Cancelled</p>
                )}
              </li>
            );
          })}
        </ul>
      </main>
    </>
  );
}
