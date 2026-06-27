import { v2 as cloudinary } from 'cloudinary';

/**
 * Server-only Cloudinary client. Configured from env. Used by the admin
 * upload route to push product images + videos into the `homeera/uploads`
 * folder and return their secure URLs.
 */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export function cloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
  );
}

/**
 * Upload a file (as a Buffer) to Cloudinary.
 * `resourceType` is 'image' or 'video'. Returns the secure URL.
 */
export function uploadBuffer(
  buffer: Buffer,
  resourceType: 'image' | 'video',
): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'homeera/uploads',
        resource_type: resourceType,
        // Sensible delivery: auto format + quality for images; capped
        // dimensions so huge originals don't blow up the gallery.
        ...(resourceType === 'image'
          ? { transformation: [{ width: 1600, crop: 'limit', quality: 'auto', fetch_format: 'auto' }] }
          : {}),
      },
      (err, result) => {
        if (err || !result) return reject(err || new Error('Upload failed'));
        resolve(result.secure_url);
      },
    );
    stream.end(buffer);
  });
}

export { cloudinary };
