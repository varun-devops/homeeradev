'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { formatAddress, validateAddress, type Address } from '@/lib/address';

/**
 * Save the delivery address onto the signed-in customer's profile.
 *
 * Both shapes are written: the structured columns (which checkout reads
 * back field by field) and the legacy single-line `address`, so admin
 * screens and anything else reading that column stay correct.
 */
export async function saveAddress(input: Address) {
  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { ok: false as const, reason: 'auth' as const };

  // Never trust the client's own validation.
  const errors = validateAddress(input);
  if (Object.keys(errors).length > 0) {
    return { ok: false as const, reason: 'invalid' as const, errors };
  }

  const trimmed: Address = {
    pin_code: input.pin_code.trim(),
    locality: input.locality.trim(),
    city: input.city.trim(),
    state: input.state.trim(),
    full_name: input.full_name.trim(),
    address_line: input.address_line.trim(),
    phone: input.phone.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, ''),
  };

  const { error } = await sb
    .from('profiles')
    .update({
      full_name: trimmed.full_name,
      phone: trimmed.phone,
      pin_code: trimmed.pin_code,
      locality: trimmed.locality,
      city: trimmed.city,
      state: trimmed.state,
      address_line: trimmed.address_line,
      address: formatAddress(trimmed),
    })
    .eq('id', user.id);

  if (error) return { ok: false as const, reason: 'error' as const, message: error.message };

  revalidatePath('/checkout');
  revalidatePath('/profile');
  return { ok: true as const, address: trimmed };
}
