import { NextResponse } from 'next/server';
import { r2Configured, r2Key, r2PresignPut } from '@/lib/r2';
import { storedUrlForKey } from '@/lib/media';
import { getAdminIdentity } from '@/lib/admin-auth';

export const runtime = 'nodejs';

/** Images are already generous at 10MB; ImageKit resizes on delivery anyway. */
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
/** Video is the reason this route exists — well past any function body limit. */
const MAX_VIDEO_BYTES = 200 * 1024 * 1024;

/**
 * POST /api/admin/upload-url  { filename, contentType, size }
 *
 * Hands back a short-lived URL the browser PUTs the file to directly, plus
 * the URL to store on the product once that succeeds.
 *
 * Why not just accept the file here: a serverless function on Vercel caps
 * the request body at 4.5 MB, and the platform rejects anything bigger with
 * a plain-text "Request Entity Too Large" before this handler runs. Video
 * could never work through it, and the failure surfaced as a JSON parse
 * error because the rejection is not JSON.
 *
 * Only the signature passes through us, so the size limits below are the
 * real gate — they are checked here, and the presigned URL is scoped to one
 * key and content type so it cannot be reused for anything else.
 */
export async function POST(req: Request) {
  const identity = await getAdminIdentity();
  if (!identity) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  if (!r2Configured()) {
    return NextResponse.json(
      { error: 'Media storage is not configured — see SETUP_R2_IMAGEKIT.md' },
      { status: 503 },
    );
  }

  let body: { filename?: string; contentType?: string; size?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const filename = typeof body.filename === 'string' ? body.filename : '';
  const contentType = typeof body.contentType === 'string' ? body.contentType : '';
  const size = typeof body.size === 'number' ? body.size : 0;

  const isVideo = contentType.startsWith('video/');
  const isImage = contentType.startsWith('image/');
  if (!isVideo && !isImage) {
    return NextResponse.json({ error: 'Only image or video files are allowed' }, { status: 400 });
  }

  const max = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (size <= 0 || size > max) {
    const mb = Math.round(max / 1024 / 1024);
    return NextResponse.json(
      { error: `File too large (max ${mb}MB ${isVideo ? 'video' : 'image'})` },
      { status: 413 },
    );
  }

  const key = r2Key(isVideo ? 'videos' : 'products', filename || (isVideo ? 'clip.mp4' : 'photo.jpg'));

  return NextResponse.json({
    uploadUrl: r2PresignPut(key, contentType),
    // What to save on the product once the PUT succeeds.
    url: storedUrlForKey(key),
    contentType,
    resourceType: isVideo ? 'video' : 'image',
  });
}
