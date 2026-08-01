/**
 * Structured delivery address.
 *
 * Checkout collects an address field by field (pin code, locality, city,
 * state, street, name, mobile) rather than as one free-text blob, because
 * couriers need the pin code on its own to quote serviceability and because
 * a saved address has to be re-editable field by field.
 *
 * `orders.shipping_address` / `profiles.address` still hold a formatted
 * single-line version of the same data, so anything that only knows about
 * the old column (admin order list, packing slips) keeps working.
 */
export type Address = {
  pin_code: string;
  locality: string;
  city: string;
  state: string;
  full_name: string;
  address_line: string;
  phone: string;
};

export const EMPTY_ADDRESS: Address = {
  pin_code: '',
  locality: '',
  city: '',
  state: '',
  full_name: '',
  address_line: '',
  phone: '',
};

/** The states and union territories a courier drop-down needs. */
export const INDIAN_STATES = [
  'Andaman & Nicobar Islands',
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chandigarh',
  'Chhattisgarh',
  'Dadra & Nagar Haveli and Daman & Diu',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu & Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Ladakh',
  'Lakshadweep',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Puducherry',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
] as const;

/** Collapse a structured address into the single line older code expects. */
export function formatAddress(a: Address): string {
  return [
    a.full_name,
    a.address_line,
    a.locality,
    [a.city, a.state].filter(Boolean).join(', '),
    a.pin_code,
    a.phone && `Phone: ${a.phone}`,
  ]
    .map((s) => (s ?? '').trim())
    .filter(Boolean)
    .join('\n');
}

/** Field-level validation. Returns a map of field → message; empty = valid. */
export function validateAddress(a: Address): Partial<Record<keyof Address, string>> {
  const errors: Partial<Record<keyof Address, string>> = {};

  if (!/^[1-9]\d{5}$/.test(a.pin_code.trim())) {
    errors.pin_code = 'Enter a valid 6-digit pin code.';
  }
  if (!a.locality.trim()) errors.locality = 'Required.';
  if (!a.city.trim()) errors.city = 'Required.';
  if (!a.state.trim()) errors.state = 'Required.';
  if (!a.full_name.trim()) errors.full_name = 'Required.';
  if (a.address_line.trim().length < 6) {
    errors.address_line = 'Give the flat / building and street.';
  }
  // Indian mobile numbers are 10 digits starting 6–9; tolerate +91 and spaces.
  const digits = a.phone.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
  if (!/^[6-9]\d{9}$/.test(digits)) errors.phone = 'Enter a 10-digit mobile number.';

  return errors;
}

export const isAddressComplete = (a: Address) => Object.keys(validateAddress(a)).length === 0;
