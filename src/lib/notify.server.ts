// Server-only notification helpers: owner email + Google Sheets order log.
// Both are optional — if the matching secret is not configured the call is a
// no-op so checkout never fails because of a notification problem.

export type OrderNotification = {
  orderNumber: string;
  customerName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  instructions?: string | null;
  items: {
    name: string;
    coverSize?: string | null;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }[];
  subtotal: number;
  deliveryCharge: number;
  total: number;
  paymentId: string;
};

function rowsHtml(n: OrderNotification) {
  return n.items
    .map(
      (i) =>
        `<tr><td>${i.name}</td><td>${i.coverSize ?? "Standard"}</td><td align="center">${i.quantity}</td><td align="right">₹${i.unitPrice}</td><td align="right">₹${i.lineTotal}</td></tr>`,
    )
    .join("");
}

export async function sendOwnerOrderEmail(n: OrderNotification) {
  const apiKey = process.env["RESEND_API_KEY"];
  const to = process.env["OWNER_EMAIL"];
  const from = process.env["ORDER_EMAIL_FROM"] ?? "Chandra Gardens <onboarding@resend.dev>";
  if (!apiKey || !to) {
    console.log("[notify] email skipped (RESEND_API_KEY / OWNER_EMAIL not set)", n.orderNumber);
    return { sent: false };
  }
  const html = `
    <h2>New paid order ${n.orderNumber}</h2>
    <p><strong>${n.customerName}</strong> — ${n.phone} — ${n.email}</p>
    <p>${n.address}, ${n.city}, ${n.state} ${n.pincode}</p>
    ${n.instructions ? `<p><em>${n.instructions}</em></p>` : ""}
    <table border="1" cellpadding="6" cellspacing="0">
      <tr><th>Plant</th><th>Cover size</th><th>Qty</th><th>Price</th><th>Total</th></tr>
      ${rowsHtml(n)}
    </table>
    <p>Subtotal: ₹${n.subtotal}<br/>Delivery: ₹${n.deliveryCharge}<br/><strong>Total paid: ₹${n.total}</strong></p>
    <p>Payment ID: ${n.paymentId}</p>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject: `New order ${n.orderNumber}`, html }),
    });
    if (!res.ok) console.error("[notify] email failed", res.status, await res.text());
    return { sent: res.ok };
  } catch (e) {
    console.error("[notify] email error", e);
    return { sent: false };
  }
}

// Google Sheets: point GOOGLE_SHEETS_WEBHOOK_URL at a Google Apps Script
// web app that appends the posted JSON as a row.
export async function appendOrderToSheet(n: OrderNotification) {
  const url = process.env["GOOGLE_SHEETS_WEBHOOK_URL"];
  if (!url) {
    console.log("[notify] sheets skipped (GOOGLE_SHEETS_WEBHOOK_URL not set)", n.orderNumber);
    return { logged: false };
  }
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order_number: n.orderNumber,
        date: new Date().toISOString(),
        customer: n.customerName,
        email: n.email,
        phone: n.phone,
        address: `${n.address}, ${n.city}, ${n.state} ${n.pincode}`,
        items: n.items
          .map((i) => `${i.name}${i.coverSize ? ` (${i.coverSize})` : ""} x${i.quantity}`)
          .join(", "),
        subtotal: n.subtotal,
        delivery: n.deliveryCharge,
        total: n.total,
        payment_id: n.paymentId,
      }),
    });
    return { logged: res.ok };
  } catch (e) {
    console.error("[notify] sheets error", e);
    return { logged: false };
  }
}

export async function sendCustomerOrderEmail(n: OrderNotification) {
  const apiKey = process.env["RESEND_API_KEY"];
  const from = process.env["ORDER_EMAIL_FROM"] ?? "Chandra Gardens <onboarding@resend.dev>";
  if (!apiKey || !n.email) {
    console.log("[notify] customer email skipped (RESEND_API_KEY not set)", n.orderNumber);
    return { sent: false };
  }
  const html = `
    <h2>Thank you for your order, ${n.customerName}!</h2>
    <p>Your order <strong>${n.orderNumber}</strong> is confirmed and payment was received.</p>
    <table border="1" cellpadding="6" cellspacing="0">
      <tr><th>Plant</th><th>Cover size</th><th>Qty</th><th>Price</th><th>Total</th></tr>
      ${rowsHtml(n)}
    </table>
    <p>Subtotal: ₹${n.subtotal}<br/>Delivery: ₹${n.deliveryCharge}<br/><strong>Total paid: ₹${n.total}</strong></p>
    <p>Delivering to: ${n.address}, ${n.city}, ${n.state} ${n.pincode}</p>
    <p>Payment status: paid · Order status: confirmed</p>`;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [n.email],
        subject: `Your Chandra Gardens order ${n.orderNumber}`,
        html,
      }),
    });
    if (!res.ok) console.error("[notify] customer email failed", res.status, await res.text());
    return { sent: res.ok };
  } catch (e) {
    console.error("[notify] customer email error", e);
    return { sent: false };
  }
}

export async function notifyOrderPaid(n: OrderNotification) {
  await Promise.allSettled([
    sendOwnerOrderEmail(n),
    sendCustomerOrderEmail(n),
    appendOrderToSheet(n),
  ]);
}

