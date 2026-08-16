import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "node:crypto";

// Razorpay webhook — backup confirmation path if the browser closes before
// the client-side verify call runs. Signature is verified over the raw body.
export const Route = createFileRoute("/api/public/razorpay-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["RAZORPAY_WEBHOOK_SECRET"];
        if (!secret) return new Response("Not configured", { status: 503 });

        const raw = await request.text();
        const signature = request.headers.get("x-razorpay-signature") ?? "";
        const expected = createHmac("sha256", secret).update(raw).digest("hex");
        const a = Buffer.from(expected);
        const b = Buffer.from(signature);
        if (a.length !== b.length || !timingSafeEqual(a, b)) {
          return new Response("Invalid signature", { status: 401 });
        }

        let payload: any;
        try {
          payload = JSON.parse(raw);
        } catch {
          return new Response("Bad payload", { status: 400 });
        }

        const entity = payload?.payload?.payment?.entity;
        const event = payload?.event as string | undefined;
        if (!entity?.order_id) return new Response("ok");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        if (event === "payment.failed") {
          await supabaseAdmin
            .from("orders")
            .update({ payment_status: "failed" })
            .eq("razorpay_order_id", entity.order_id)
            .eq("payment_status", "pending");
          return new Response("ok");
        }

        if (event === "payment.captured" || event === "order.paid") {
          const { error } = await supabaseAdmin.rpc("confirm_order_payment", {
            _razorpay_order_id: entity.order_id,
            _razorpay_payment_id: entity.id,
          });
          if (error) console.error("[razorpay-webhook] confirm failed", error);
        }

        return new Response("ok");
      },
    },
  },
});
