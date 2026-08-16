import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { getCart } from "@/lib/cart.functions";
import { createCheckoutOrder, verifyPayment } from "@/lib/checkout.functions";
import { inr } from "@/lib/pricing";
import { Navbar } from "@/components/Navbar";

export const Route = createFileRoute("/_authenticated/checkout")({
  head: () => ({
    meta: [
      { title: "Secure Checkout — Chandra Gardens" },
      { name: "description", content: "Enter your delivery details and pay securely by UPI or card for your plants." },
      { property: "og:title", content: "Secure Checkout — Chandra Gardens" },
      { property: "og:description", content: "Pay securely by UPI or card. Totals are calculated on our servers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CheckoutPage,
});

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void; on: (e: string, cb: (r: unknown) => void) => void };
  }
}

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

const EMPTY = {
  fullName: "",
  email: "",
  phone: "",
  address: "",
  locality: "",
  city: "",
  state: "Kerala",
  pincode: "",
  instructions: "",
};

function CheckoutPage() {
  const navigate = useNavigate();
  const fetchCart = useServerFn(getCart);
  const create = useServerFn(createCheckoutOrder);
  const verify = useServerFn(verifyPayment);

  const { data: cart } = useQuery({ queryKey: ["cart"], queryFn: () => fetchCart() });
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const set = (k: keyof typeof EMPTY) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const pay = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const ok = await loadRazorpay();
      if (!ok) throw new Error("Could not load the payment window. Check your connection.");

      const order = await create({ data: form });

      await new Promise<void>((resolve, reject) => {
        const rzp = new window.Razorpay!({
          key: order.keyId,
          amount: order.amountPaise,
          currency: "INR",
          name: "Chandra Gardens",
          description: `Order ${order.orderNumber}`,
          order_id: order.razorpayOrderId,
          prefill: order.prefill,
          notes: { order_number: order.orderNumber },
          theme: { color: "#2E7D32" },
          modal: { ondismiss: () => reject(new Error("Payment cancelled.")) },
          handler: async (res: any) => {
            try {
              await verify({
                data: {
                  razorpayOrderId: res.razorpay_order_id,
                  razorpayPaymentId: res.razorpay_payment_id,
                  razorpaySignature: res.razorpay_signature,
                },
              });
              resolve();
              navigate({ to: "/orders" });
            } catch (err) {
              reject(err);
            }
          },
        });
        rzp.on("payment.failed", () => reject(new Error("Payment failed. Please try again.")));
        rzp.open();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="mx-auto min-h-screen max-w-5xl px-6 pb-24 pt-32">
        <h1 className="font-display text-4xl font-medium">Checkout</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Totals are calculated on our servers — you always pay the correct amount.
        </p>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_320px]">
          <form onSubmit={pay} className="space-y-3 rounded-3xl glass p-6">
            <F label="Full name" value={form.fullName} onChange={set("fullName")} required />
            <div className="grid gap-3 sm:grid-cols-2">
              <F label="Email" type="email" value={form.email} onChange={set("email")} required />
              <F label="Phone" type="tel" value={form.phone} onChange={set("phone")} required />
            </div>
            <F label="Address" value={form.address} onChange={set("address")} required />
            <div className="grid gap-3 sm:grid-cols-2">
              <F label="Locality" value={form.locality} onChange={set("locality")} />
              <F label="City" value={form.city} onChange={set("city")} required />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <F label="State" value={form.state} onChange={set("state")} required />
              <F label="Pincode" value={form.pincode} onChange={set("pincode")} required />
            </div>
            <F label="Delivery instructions" value={form.instructions} onChange={set("instructions")} />

            {error && <p className="text-sm text-rose-600">{error}</p>}

            <button
              type="submit"
              disabled={busy || !cart || cart.lines.length === 0}
              className="w-full rounded-full bg-primary py-3 font-semibold text-primary-foreground disabled:opacity-60"
            >
              {busy ? "Opening secure payment…" : `Pay ${cart ? inr(cart.total) : ""} with UPI / Card`}
            </button>
          </form>

          <aside className="h-fit rounded-3xl glass p-6">
            <h2 className="font-display text-xl font-medium">Order summary</h2>
            <ul className="mt-4 space-y-2 text-sm">
              {cart?.lines.map((l) => (
                <li key={l.itemId} className="flex justify-between gap-3">
                  <span className="text-muted-foreground">{l.name} × {l.quantity}</span>
                  <span>{inr(l.lineTotal)}</span>
                </li>
              ))}
            </ul>
            {cart && (
              <dl className="mt-4 space-y-2 border-t border-border pt-3 text-sm">
                <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd>{inr(cart.subtotal)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Delivery</dt><dd>{cart.deliveryCharge === 0 ? "Free" : inr(cart.deliveryCharge)}</dd></div>
                <div className="flex justify-between font-semibold"><dt>Total</dt><dd>{inr(cart.total)}</dd></div>
              </dl>
            )}
          </aside>
        </div>
      </main>
    </>
  );
}

function F({
  label, value, onChange, type = "text", required,
}: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-border bg-background/60 px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
      />
    </label>
  );
}
