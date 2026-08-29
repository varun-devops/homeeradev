import { NextResponse } from 'next/server';
import { uploadBuffer, cloudinaryConfigured } from '@/lib/cloudinary';
import { r2Configured, r2Key, r2Put } from '@/lib/r2';
import { storedUrlForKey } from '@/lib/media';
import { getAdminIdentity } from '@/lib/admin-auth';

export const runtime = 'nodejs';
// Allow larger video uploads.
export const maxDuration = 60;

/**
 * POST /api/admin/upload   (multipart/form-data, field "file")
 *
 * Product managers only (admin or staff). Stores the file and returns
 * { url, resourceType }. The admin product form calls this per file and saves
 * the returned URLs on the product.
 *
 * Storage goes to Cloudflare R2 when configured, delivered through ImageKit.
 * Cloudinary remains the fallback so uploads keep working before the migration
 * in SETUP_R2_IMAGEKIT.md is done, and if R2 is ever unreachable.
 */
export async function POST(req: Request) {
  // --- auth: admin or staff may upload product media ---
  const identity = await getAdminIdentity();
  if (!identity) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  if (!r2Configured() && !cloudinaryConfigured()) {
    return NextResponse.json(
      { error: 'No media storage configured — see SETUP_R2_IMAGEKIT.md' },
      { status: 503 },
    );
  }

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  const isVideo = file.type.startsWith('video/');
  const isImage = file.type.startsWith('image/');
  if (!isVideo && !isImage) {
    return NextResponse.json({ error: 'Only image or video files are allowed' }, { status: 400 });
  }

  // Size guard: 10MB images, 100MB video.
  const maxBytes = isVideo ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
  if (file.size > maxBytes) {
    return NextResponse.json(
      { error: `File too large (max ${isVideo ? '100MB video' : '10MB image'})` },
      { status: 413 },
    );
  }

  const resourceType = isVideo ? 'video' : 'image';

  try {
    const buffer = Buffer.from(await file.arrayBuffer());

    if (r2Configured()) {
      const key = r2Key(isVideo ? 'videos' : 'products', file.name || `upload.${isVideo ? 'mp4' : 'jpg'}`);
      await r2Put(key, buffer, file.type || 'application/octet-stream');
      // No resize on the way in — the original is kept and ImageKit derives
      // every size from it on demand.
      return NextResponse.json({ url: storedUrlForKey(key), resourceType });
    }

    const url = await uploadBuffer(buffer, resourceType);
    return NextResponse.json({ url, resourceType });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upload failed' },
      { status: 500 },
    );
  }
}
