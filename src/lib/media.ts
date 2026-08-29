/**
 * Media delivery — one place that turns a stored asset URL into a fast one.
 *
 * Assets are stored as originals in Cloudflare R2 ($0 egress) and delivered
 * through ImageKit, which resizes them, converts to AVIF/WebP per browser,
 * and caches at the edge. See SETUP_R2_IMAGEKIT.md.
 *
 * Everything here degrades safely: if NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT is
 * unset, or the URL points somewhere ImageKit cannot serve (Cloudinary, a
 * local /images/ file), the original URL is returned untouched. That is what
 * lets the site keep running on Cloudinary until the migration is done.
 */

const IK_ENDPOINT = (process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT ?? '').replace(/\/+$/, '');

/** Widths we ever ask ImageKit for. Keep the list short — each one is a
 *  separate cache entry, and more entries means more origin pulls. */
export const IMAGE_WIDTHS = [320, 480, 640, 828, 1080, 1440, 1920] as const;

export function imageKitConfigured(): boolean {
  return IK_ENDPOINT.length > 0;
}

/**
 * The path of an asset relative to the ImageKit endpoint, or null when the
 * URL is not ours to transform.
 */
function imageKitPath(src: string): string | null {
  if (!IK_ENDPOINT || !src) return null;

  // Already an ImageKit URL — take the path after the endpoint. Any existing
  // ?tr= is dropped, because the caller is about to specify its own.
  if (src.startsWith(IK_ENDPOINT)) {
    const rest = src.slice(IK_ENDPOINT.length).split('?')[0];
    return rest.startsWith('/') ? rest : `/${rest}`;
  }

  // A root-relative path is a file in /public served by Next itself — never
  // an R2 object. Rewriting these to the CDN would 404: the bucket has no
  // /images/… in it.
  if (src.startsWith('/')) return null;

  // Stored as a bare object key ("products/foo.jpg") rather than a full URL.
  if (!/^https?:\/\//i.test(src)) return `/${src}`;

  // The R2 public origin, if the DB still holds direct r2.dev links.
  const r2Public = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? '').replace(/\/+$/, '');
  if (r2Public && src.startsWith(r2Public)) {
    return src.slice(r2Public.length).split('?')[0] || null;
  }

  // Anything else (Cloudinary, third-party) — leave it alone.
  return null;
}

export type ImageOpts = {
  /** Target width in px. Omit for the original size. */
  width?: number;
  /** Target height in px — only set it when cropping to a fixed box. */
  height?: number;
  /** 1–100, or 'auto' (default) to let ImageKit decide per image. */
  quality?: number | 'auto';
  /** How to fit when both width and height are given. */
  crop?: 'maintain_ratio' | 'at_max' | 'force';
  /** Grab a still frame from a video at this many seconds in. */
  videoFrame?: number;
};

/**
 * Optimized delivery URL for an image.
 *
 * `f-auto` negotiates AVIF → WebP → JPEG from the browser's Accept header;
 * `q-auto` picks a quality per image rather than a fixed number.
 */
export function imageUrl(src: string | null | undefined, opts: ImageOpts = {}): string {
  if (!src) return '';
  const path = imageKitPath(src);
  if (!path) return src;

  const tr: string[] = [];
  if (opts.width) tr.push(`w-${Math.round(opts.width)}`);
  if (opts.height) tr.push(`h-${Math.round(opts.height)}`);
  if (opts.width && opts.height) tr.push(`c-${opts.crop ?? 'maintain_ratio'}`);
  if (opts.videoFrame !== undefined) tr.push(`so-${opts.videoFrame}`);
  tr.push('f-auto');
  tr.push(`q-${opts.quality ?? 'auto'}`);

  return `${IK_ENDPOINT}${path}?tr=${tr.join(',')}`;
}

/**
 * A `srcset` string so the browser downloads the size it actually needs.
 * Returns '' when the asset cannot be transformed, in which case the caller
 * should omit the attribute entirely rather than emit an empty one.
 */
export function imageSrcSet(
  src: string | null | undefined,
  widths: readonly number[] = IMAGE_WIDTHS,
  opts: Omit<ImageOpts, 'width'> = {},
): string {
  if (!src || !imageKitPath(src)) return '';
  return widths
    .map((w) => `${imageUrl(src, { ...opts, width: w })} ${w}w`)
    .join(', ');
}

/**
 * A still frame from a video, used as a `poster` so the browser paints
 * something immediately instead of waiting on the clip. Falls back to '' when
 * the video is not on ImageKit — a missing poster is better than a broken one.
 */
export function videoPoster(src: string | null | undefined, width = 1280): string {
  if (!src) return '';
  const path = imageKitPath(src);
  if (!path) return '';
  // ImageKit derives a still by appending /ik-thumbnail.jpg to the *whole*
  // video URL — the .mp4 extension stays in the path.
  return `${IK_ENDPOINT}${path}/ik-thumbnail.jpg?tr=w-${width},f-auto,q-auto`;
}

/** Video delivery URL. ImageKit transcodes to a web-friendly bitrate. */
export function videoUrl(src: string | null | undefined): string {
  if (!src) return '';
  const path = imageKitPath(src);
  if (!path) return src;
  return `${IK_ENDPOINT}${path}`;
}

/** Origins we fetch media from — used to emit <link rel="preconnect">. */
export function mediaOrigins(): string[] {
  const origins = new Set<string>();
  for (const raw of [IK_ENDPOINT, process.env.NEXT_PUBLIC_R2_PUBLIC_URL]) {
    if (!raw) continue;
    try {
      origins.add(new URL(raw).origin);
    } catch {
      // Malformed env value — skip rather than crash the render.
    }
  }
  return [...origins];
}

/**
 * The URL to persist in the database for a freshly uploaded R2 object.
 *
 * Prefer the ImageKit endpoint so every read path can transform it. Fall back
 * to the R2 public URL when ImageKit is not wired up yet — still a working
 * image, just an unoptimized one, and `imageKitPath` picks it up later.
 */
export function storedUrlForKey(key: string): string {
  const clean = key.replace(/^\/+/, '');
  if (IK_ENDPOINT) return `${IK_ENDPOINT}/${clean}`;
  const r2Public = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? process.env.R2_PUBLIC_URL ?? '').replace(/\/+$/, '');
  if (r2Public) return `${r2Public}/${clean}`;
  return `/${clean}`;
}

/**
 * A hero clip by name ('clip' = landscape, 'slim' = portrait).
 *
 * Resolves to ImageKit once the migration has run, and to the original
 * Cloudinary delivery URL before that, so the homepage never breaks
 * mid-migration. Both paths already ask for auto format and quality.
 */
export function heroVideoUrl(name: 'clip' | 'slim'): string {
  if (IK_ENDPOINT) return `${IK_ENDPOINT}/hero/${name}.mp4`;
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dcdchbc8p';
  return `https://res.cloudinary.com/${cloud}/video/upload/q_auto,f_auto/homeera/hero/${name}.mp4`;
}

/** Still frame for a hero clip, used as its poster. */
export function heroPosterUrl(name: 'clip' | 'slim', width = 1280): string {
  if (IK_ENDPOINT) return `${IK_ENDPOINT}/hero/${name}.mp4/ik-thumbnail.jpg?tr=w-${width},f-auto,q-auto`;
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dcdchbc8p';
  return `https://res.cloudinary.com/${cloud}/video/upload/so_0,w_${width},q_auto,f_auto/homeera/hero/${name}.jpg`;
}
