'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

/** Update the signed-in customer's profile (name, phone, address). */
export async function updateProfile(input: {
  full_name: string;
  phone: string;
  address: string;
}) {
  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { ok: false, message: 'Not signed in' };

  const { error } = await sb
    .from('profiles')
    .update({
      full_name: input.full_name.trim() || null,
      phone: input.phone.trim() || null,
      address: input.address.trim() || null,
    })
    .eq('id', user.id);
  if (error) return { ok: false, message: error.message };

  revalidatePath('/profile');
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
