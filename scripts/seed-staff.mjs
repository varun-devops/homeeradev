/**
 * Seeds the products-only staff user (user@homeera.com / User@123) and
 * sets its profile role = 'staff'. Auto-confirms the email so it can log
 * in immediately. Idempotent: re-running resets the password + role.
 *
 * A staff user can log into /admin, sees only Products (+ read-only
 * Users/Dashboard), and can create/edit/delete products. It cannot touch
 * orders, collections, or user records.
 *
 * Prereq: run supabase/migration-06-staff-role.sql first (adds role column).
 *
 *   node scripts/seed-staff.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
for (const line of readFileSync(join(root, '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}

const STAFF_EMAIL = 'user@homeera.com';
const STAFF_PASSWORD = 'User@123';
const STAFF_NAME = 'Homeera Staff';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false },
    realtime: { transport: function () {} },
  },
);

async function findUserByEmail(email) {
  const { data, error } = await sb.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) throw error;
  return data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
}

const existing = await findUserByEmail(STAFF_EMAIL);

let userId;
if (existing) {
  userId = existing.id;
  await sb.auth.admin.updateUserById(userId, {
    password: STAFF_PASSWORD,
    email_confirm: true,
  });
  console.log('Staff user already existed — password reset + confirmed.');
} else {
  const { data, error } = await sb.auth.admin.createUser({
    email: STAFF_EMAIL,
    password: STAFF_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: STAFF_NAME },
  });
  if (error) throw error;
  userId = data.user.id;
  console.log('Created staff user.');
}

// Ensure a profile row exists, role = staff, is_admin = false.
const { error: upErr } = await sb.from('profiles').upsert(
  { id: userId, email: STAFF_EMAIL, full_name: STAFF_NAME, is_admin: false, role: 'staff' },
  { onConflict: 'id' },
);
if (upErr) {
  // If the role column is missing, the migration hasn't been run yet.
  if (/column .*role/i.test(upErr.message)) {
    console.error('\n✗ profiles.role column not found. Run supabase/migration-06-staff-role.sql first.');
    process.exit(1);
  }
  throw upErr;
}

console.log(
  `\n✅ Staff ready (products only):\n   email:    ${STAFF_EMAIL}\n   password: ${STAFF_PASSWORD}\n   login at: /admin/login`,
);
process.exit(0);
