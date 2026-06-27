/**
 * Seeds the default admin user (admin@homeera.com / 1234) and marks its
 * profile is_admin = true. Auto-confirms the email via the service key so
 * it can log in immediately. Idempotent: if the user already exists it
 * just (re)applies the admin flag and password.
 *
 *   node scripts/seed-admin.mjs
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

const ADMIN_EMAIL = 'admin@homeera.com';
const ADMIN_PASSWORD = '1234';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false },
    realtime: { transport: function () {} },
  },
);

async function findUserByEmail(email) {
  // listUsers is paginated; admin set is tiny, so page 1 (200) is enough.
  const { data, error } = await sb.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) throw error;
  return data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
}

const existing = await findUserByEmail(ADMIN_EMAIL);

let userId;
if (existing) {
  userId = existing.id;
  // Reset password + ensure confirmed.
  await sb.auth.admin.updateUserById(userId, {
    password: ADMIN_PASSWORD,
    email_confirm: true,
  });
  console.log('Admin user already existed — password reset + confirmed.');
} else {
  const { data, error } = await sb.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: 'Homeera Admin' },
  });
  if (error) throw error;
  userId = data.user.id;
  console.log('Created admin user.');
}

// Ensure a profile row exists and is flagged admin.
const { error: upErr } = await sb.from('profiles').upsert(
  { id: userId, email: ADMIN_EMAIL, full_name: 'Homeera Admin', is_admin: true },
  { onConflict: 'id' },
);
if (upErr) throw upErr;

console.log(`\n✅ Admin ready:\n   email:    ${ADMIN_EMAIL}\n   password: ${ADMIN_PASSWORD}\n   login at: /admin/login`);
process.exit(0);
