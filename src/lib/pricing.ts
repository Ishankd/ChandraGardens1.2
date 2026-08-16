export const FREE_DELIVERY_THRESHOLD = 2000;
export const DELIVERY_CHARGE = 150;

export function deliveryChargeFor(subtotal: number) {
  return subtotal >= FREE_DELIVERY_THRESHOLD || subtotal === 0 ? 0 : DELIVERY_CHARGE;
}

export const inr = (n: number) =>
  `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
