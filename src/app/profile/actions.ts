'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { formatAddress, type Address } from '@/lib/address';

/**
 * Update the signed-in customer's profile: name, phone and the structured
 * delivery address. The legacy single-line `address` column is written too,
 * so admin screens that read it stay accurate.
 *
 * Unlike checkout, the profile does NOT require a complete address — a
 * customer may want to save just their name, and half an address is better
 * than making them abandon the form.
 */
export async function updateProfile(input: Address) {
  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { ok: false, message: 'Not signed in' };

  const t = (s: string) => s.trim();
  const trimmed: Address = {
    full_name: t(input.full_name),
    phone: input.phone.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, ''),
    pin_code: t(input.pin_code),
    locality: t(input.locality),
    city: t(input.city),
    state: t(input.state),
    address_line: t(input.address_line),
  };

  const { error } = await sb
    .from('profiles')
    .update({
      full_name: trimmed.full_name || null,
      phone: trimmed.phone || null,
      pin_code: trimmed.pin_code || null,
      locality: trimmed.locality || null,
      city: trimmed.city || null,
      state: trimmed.state || null,
      address_line: trimmed.address_line || null,
      address: formatAddress(trimmed) || null,
    })
    .eq('id', user.id);
  if (error) return { ok: false, message: error.message };

  revalidatePath('/profile');
  revalidatePath('/checkout');
  return { ok: true };
}

/** Change the customer's password. */
export async function changeMyPassword(newPassword: string) {
  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { ok: false, message: 'Not signed in' };
  if (!newPassword || newPassword.length < 4) {
    return { ok: false, message: 'Password must be at least 4 characters.' };
  }
  const { error } = await sb.auth.updateUser({ password: newPassword });
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

/** Sign the customer out. */
export async function signOutCustomer() {
  const sb = createClient();
  await sb.auth.signOut();
  return { ok: true };
}
