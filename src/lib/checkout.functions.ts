import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const shippingSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(120),
  phone: z
    .string()
    .trim()
    .regex(
      /^(\+91[- ]?)?[6-9]\d{9}$/,
      "Enter a valid Indian mobile number",
    ),
  address: z.string().trim().min(6).max(300),
  locality: z.string().trim().max(120).optional().default(""),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  pincode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter a valid 6-digit pincode"),
  instructions: z
    .string()
    .trim()
    .max(300)
    .optional()
    .default(""),
});

export const getRazorpayKeyId = createServerFn({
  method: "GET",
}).handler(async () => ({
  keyId: process.env["RAZORPAY_KEY_ID"] ?? "",
}));

/**
 * Creates the order from the SERVER-SIDE cart.
 * Prices, delivery charge and totals are computed
 * server-side / in the database.
 */
export const createCheckoutOrder = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .inputValidator(shippingSchema)
  .handler(async ({ data, context }) => {
    const {
      supabaseAdmin,
    } = await import(
      "@/integrations/supabase/client.server"
    );

    const {
      deliveryChargeFor,
    } = await import("./pricing");

    const userId = (
      context as { userId: string }
    ).userId;

    // --------------------------------------------------
    // Find the user's cart
    // IMPORTANT: carts uses customer_id, not user_id.
    // --------------------------------------------------
    const db = supabaseAdmin as any;

const {
  data: cart,
  error: cartError,
} = await db
  .from("carts")
  .select("id")
  .eq("customer_id", userId)
  .maybeSingle();
    if (cartError) {
      throw new Error(
        `Could not load cart: ${cartError.message}`,
      );
    }

    if (!cart) {
      throw new Error(
        "Your cart is empty.",
      );
    }

    // --------------------------------------------------
    // Load cart items
    // --------------------------------------------------
    const {
      data: items,
      error: itemsError,
    } = await supabaseAdmin
      .from("cart_items")
      .select(
        `
          quantity,
          products(price),
          cover_sizes(price_delta)
        `,
      )
      .eq("cart_id", cart.id);

    if (itemsError) {
      throw new Error(
        `Could not load cart items: ${itemsError.message}`,
      );
    }

    // --------------------------------------------------
    // Calculate subtotal
    // --------------------------------------------------
    const subtotal = (
      items ?? []
    ).reduce(
      (
        total: number,
        item: any,
      ) => {
        const productPrice =
          Number(
            item.products?.price ?? 0,
          );

        const coverDelta =
          Number(
            item.cover_sizes
              ?.price_delta ?? 0,
          );

        return (
          total +
          (productPrice +
            coverDelta) *
            Number(item.quantity)
        );
      },
      0,
    );

    if (subtotal <= 0) {
      throw new Error(
        "Your cart is empty.",
      );
    }

    const deliveryCharge =
      deliveryChargeFor(
        subtotal,
      );

    // --------------------------------------------------
    // Create database order
    // --------------------------------------------------
    const {
      data: placed,
      error: placeErr,
    } = await supabaseAdmin.rpc(
      "place_order",
      {
        _user_id: userId,
        _customer_name:
          data.fullName,
        _email: data.email,
        _phone: data.phone,
        _address: data.address,
        _locality:
          data.locality ?? "",
        _city: data.city,
        _state: data.state,
        _pincode: data.pincode,
        _instructions:
          data.instructions ?? "",
        _delivery_charge:
          deliveryCharge,
      },
    );

    if (placeErr) {
      const message =
        placeErr.message ?? "";

      if (
        message.includes(
          "CART_EMPTY",
        )
      ) {
        throw new Error(
          "Your cart is empty.",
        );
      }

      if (
        message.includes(
          "INSUFFICIENT_STOCK",
        )
      ) {
        throw new Error(
          `Out of stock: ${
            message
              .split(
                "INSUFFICIENT_STOCK:",
              )[1]
              ?.trim() ?? "item"
          }`,
        );
      }

      if (
        message.includes(
          "UNAVAILABLE",
        )
      ) {
        throw new Error(
          `No longer available: ${
            message
              .split(
                "UNAVAILABLE:",
              )[1]
              ?.trim() ?? "item"
          }`,
        );
      }

      console.error(
        "[checkout] place_order failed:",
        placeErr,
      );

      throw new Error(
        "Could not place the order. Please try again.",
      );
    }

    const order = Array.isArray(
      placed,
    )
      ? placed[0]
      : placed;

    if (!order?.order_id) {
      throw new Error(
        "Order was not created.",
      );
    }

    // --------------------------------------------------
    // Razorpay
    // --------------------------------------------------
    const keyId =
      process.env["RAZORPAY_KEY_ID"];

    const keySecret =
      process.env[
        "RAZORPAY_KEY_SECRET"
      ];

    if (!keyId || !keySecret) {
      throw new Error(
        "Payments are not configured yet.",
      );
    }

    const razorpayResponse =
      await fetch(
        "https://api.razorpay.com/v1/orders",
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${Buffer.from(
              `${keyId}:${keySecret}`,
            ).toString("base64")}`,
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            amount: Math.round(
              Number(order.total) *
                100,
            ),
            currency: "INR",
            receipt:
              order.order_number,
            notes: {
              order_id:
                order.order_id,
              order_number:
                order.order_number,
            },
          }),
        },
      );

    if (!razorpayResponse.ok) {
      console.error(
        "[razorpay] order create failed",
        razorpayResponse.status,
        await razorpayResponse.text(),
      );

      await supabaseAdmin
        .from("orders")
        .update({
          payment_status:
            "failed",
          order_status:
            "cancelled",
        })
        .eq(
          "id",
          order.order_id,
        );

      throw new Error(
        "Could not start the payment. Please try again.",
      );
    }

    const razorpayOrder =
      (await razorpayResponse.json()) as {
        id: string;
        amount: number;
      };

    await supabaseAdmin
      .from("orders")
      .update({
        razorpay_order_id:
          razorpayOrder.id,
      })
      .eq(
        "id",
        order.order_id,
      );

    return {
      orderId:
        order.order_id as string,
      orderNumber:
        order.order_number as string,
      subtotal:
        Number(order.subtotal),
      deliveryCharge:
        Number(
          order.delivery_charge,
        ),
      total:
        Number(order.total),
      razorpayOrderId:
        razorpayOrder.id,
      amountPaise:
        razorpayOrder.amount,
      keyId,
      prefill: {
        name: data.fullName,
        email: data.email,
        contact: data.phone,
      },
    };
  });

/**
 * Verifies the Razorpay signature,
 * then confirms the order.
 */
export const verifyPayment =
  createServerFn({
    method: "POST",
  })
    .middleware([
      requireSupabaseAuth,
    ])
    .inputValidator(
      z.object({
        razorpayOrderId:
          z.string().min(4).max(120),

        razorpayPaymentId:
          z.string().min(4).max(120),

        razorpaySignature:
          z.string().min(8).max(256),
      }),
    )
    .handler(
      async ({
        data,
        context,
      }) => {
        const {
          createHmac,
          timingSafeEqual,
        } = await import(
          "node:crypto"
        );

        const {
          supabaseAdmin,
        } = await import(
          "@/integrations/supabase/client.server"
        );

        const {
          notifyOrderPaid,
        } = await import(
          "./notify.server"
        );

        const userId = (
          context as {
            userId: string;
          }
        ).userId;

        const secret =
          process.env[
            "RAZORPAY_KEY_SECRET"
          ];

        if (!secret) {
          throw new Error(
            "Payments are not configured yet.",
          );
        }

        const expected =
          createHmac(
            "sha256",
            secret,
          )
            .update(
              `${data.razorpayOrderId}|${data.razorpayPaymentId}`,
            )
            .digest("hex");

        const a =
          Buffer.from(
            expected,
          );

        const b =
          Buffer.from(
            data.razorpaySignature,
          );

        if (
          a.length !==
            b.length ||
          !timingSafeEqual(a, b)
        ) {
          await supabaseAdmin
            .from("orders")
            .update({
              payment_status:
                "failed",
            })
            .eq(
              "razorpay_order_id",
              data.razorpayOrderId,
            );

          throw new Error(
            "Payment verification failed.",
          );
        }

        const {
          data: owned,
        } = await supabaseAdmin
          .from("orders")
          .select(
            "id,customer_id",
          )
          .eq(
            "razorpay_order_id",
            data.razorpayOrderId,
          )
          .maybeSingle();

        if (
          !owned ||
          owned.customer_id !==
            userId
        ) {
          throw new Error(
            "Order not found.",
          );
        }

        const {
          data: confirmed,
          error,
        } = await supabaseAdmin.rpc(
          "confirm_order_payment",
          {
            _razorpay_order_id:
              data.razorpayOrderId,

            _razorpay_payment_id:
              data.razorpayPaymentId,
          },
        );

        if (error) {
          console.error(
            "[checkout] confirm failed",
            error,
          );

          throw new Error(
            "Payment received but the order could not be confirmed. We'll contact you.",
          );
        }

        const row =
          Array.isArray(
            confirmed,
          )
            ? confirmed[0]
            : confirmed;

        const {
          data: order,
        } = await supabaseAdmin
          .from("orders")
          .select(
            `
              order_number,
              customer_name,
              email,
              phone,
              address,
              city,
              state,
              pincode,
              delivery_instructions,
              subtotal,
              delivery_charge,
              total,
              order_items(
                product_name,
                cover_size,
                quantity,
                unit_price,
                line_total
              )
            `,
          )
          .eq(
            "id",
            owned.id,
          )
          .single();

        if (
          order &&
          !row?.already_processed
        ) {
          await notifyOrderPaid({
            orderNumber:
              order.order_number,
            customerName:
              order.customer_name,
            email: order.email,
            phone: order.phone,
            address:
              order.address,
            city: order.city,
            state:
              order.state,
            pincode:
              order.pincode,
            instructions:
              order.delivery_instructions,

            items: (
              order.order_items ??
              []
            ).map(
              (item: any) => ({
                name:
                  item.product_name,

                coverSize:
                  item.cover_size ??
                  null,

                quantity:
                  item.quantity,

                unitPrice:
                  Number(
                    item.unit_price,
                  ),

                lineTotal:
                  Number(
                    item.line_total,
                  ),
              }),
            ),

            subtotal:
              Number(
                order.subtotal,
              ),

            deliveryCharge:
              Number(
                order.delivery_charge,
              ),

            total:
              Number(order.total),

            paymentId:
              data.razorpayPaymentId,
          });
        }

        return {
          orderId:
            owned.id,
          orderNumber:
            order?.order_number ??
            "",
          success: true,
        };
      },
    );

export const listMyOrders =
  createServerFn({
    method: "GET",
  })
    .middleware([
      requireSupabaseAuth,
    ])
    .handler(
      async ({
        context,
      }) => {
        const ctx =
          context as {
            supabase: any;
            userId: string;
          };

        const {
          data,
          error,
        } = await ctx.supabase
          .from("orders")
          .select(
            `
              id,
              order_number,
              created_at,
              total,
              payment_status,
              order_status,
              order_items(
                product_name,
                cover_size,
                quantity,
                unit_price,
                line_total
              )
            `,
          )
          .eq(
            "customer_id",
            ctx.userId,
          )
          .order(
            "created_at",
            {
              ascending: false,
            },
          );

        if (error) {
          throw new Error(
            error.message,
          );
        }

        return data ?? [];
      },
    );