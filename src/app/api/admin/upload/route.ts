import { NextResponse } from 'next/server';
import { uploadBuffer, cloudinaryConfigured } from '@/lib/cloudinary';
import { getAdminIdentity } from '@/lib/admin-auth';

export const runtime = 'nodejs';
// Allow larger video uploads.
export const maxDuration = 60;

/**
 * POST /api/admin/upload   (multipart/form-data, field "file")
 *
 * Product managers only (admin or staff). Streams the uploaded image/video
 * to Cloudinary and returns { url, resourceType }. The admin product form
 * calls this for each file and stores the returned URLs on the product.
 */
export async function POST(req: Request) {
  // --- auth: admin or staff may upload product media ---
  const identity = await getAdminIdentity();
  if (!identity) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  if (!cloudinaryConfigured()) {
    return NextResponse.json({ error: 'Cloudinary is not configured' }, { status: 503 });
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

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await uploadBuffer(buffer, isVideo ? 'video' : 'image');
    return NextResponse.json({ url, resourceType: isVideo ? 'video' : 'image' });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upload failed' },
      { status: 500 },
    );
  }
}
