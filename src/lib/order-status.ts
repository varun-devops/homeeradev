/**
 * Order status vocabulary.
 *
 * Deliberately NOT in app/admin/actions.ts. That file carries 'use server',
 * and such a file may only export async functions — a exported const there
 * fails validation with "A 'use server' file can only export async functions,
 * found object" the moment a client component imports it, which takes down
 * every server action in the module, not just the offending export.
 */
export const ORDER_STATUSES = [
  'created',
  'paid',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Customer-facing copy for the in-site notification on each transition. */
export const STATUS_MESSAGE: Record<OrderStatus, string> = {
  created: 'Your order has been placed.',
  paid: 'Payment received — thank you!',
  processing: 'Your order is being prepared.',
  shipped: 'Your order has shipped.',
  delivered: 'Your order has been delivered.',
  cancelled: 'Your order has been cancelled.',
};
