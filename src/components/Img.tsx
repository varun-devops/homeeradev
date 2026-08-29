import { imageSrcSet, imageUrl, IMAGE_WIDTHS } from '@/lib/media';

/**
 * A responsive <img> that serves the right size for the device.
 *
 * Deliberately not next/image: every container on this site already sizes its
 * image with CSS (`object-fit: cover` inside a fixed-ratio box), ImageKit does
 * the resizing for free, and a plain tag ships no client JS and costs no Vercel
 * image-optimization quota. What was missing was `srcset` — without it a phone
 * downloaded the full 1600px original for a 300px card.
 *
 * No hooks, so this renders in both server and client components.
 */

type Props = {
  src: string | null | undefined;
  alt: string;
  /** Tells the browser how wide the image renders, so it can pick from srcset
   *  before layout. Default assumes a full-width element. */
  sizes?: string;
  /** Candidate widths to generate. Trim it for small elements like thumbnails
   *  so the CDN is not asked for sizes that will never be used. */
  widths?: readonly number[];
  /** Above the fold — skips lazy loading and raises fetch priority. */
  priority?: boolean;
  /** Intrinsic ratio hint. Prevents layout shift where the container does not
   *  already fix the box. */
  width?: number;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
  /** Crop to a fixed box rather than preserving the aspect ratio. */
  crop?: 'maintain_ratio' | 'at_max' | 'force';
  draggable?: boolean;
  'data-photo'?: string | boolean;
};

export default function Img({
  src,
  alt,
  sizes = '100vw',
  widths = IMAGE_WIDTHS,
  priority = false,
  width,
  height,
  className,
  style,
  crop,
  draggable,
  ...rest
}: Props) {
  if (!src) return null;

  const srcSet = imageSrcSet(src, widths, { crop });
  // Largest candidate as the plain src: it is only used by browsers that
  // ignore srcset, and by the preload scanner when sizes cannot be resolved.
  const fallbackWidth = widths[widths.length - 1];

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imageUrl(src, { width: fallbackWidth, crop })}
      {...(srcSet ? { srcSet, sizes } : {})}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? 'eager' : 'lazy'}
      // High priority for the LCP candidate, low for everything below the fold,
      // so the hero image is not queued behind a grid of thumbnails.
      fetchPriority={priority ? 'high' : 'auto'}
      decoding={priority ? 'sync' : 'async'}
      className={className}
      style={style}
      draggable={draggable}
      {...rest}
    />
  );
}
