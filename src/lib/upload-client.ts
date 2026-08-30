'use client';

/**
 * Browser-side file upload for the admin panel.
 *
 * Two steps: ask our route to sign a URL, then PUT the bytes straight to R2.
 * The file never passes through a serverless function, which is what makes
 * video possible at all — Vercel caps a function's request body at 4.5 MB
 * and rejects anything larger before the handler runs.
 *
 * That rejection is also where "Unexpected token 'R', \"Request En\"... is
 * not valid JSON" came from: the platform's plain-text error was being fed
 * to res.json(). Every response here is read defensively for that reason —
 * an error from a proxy, a gateway or a CDN is rarely JSON, and the person
 * uploading deserves the actual reason rather than a parser's complaint.
 */
export type UploadResult = { url: string; resourceType: 'image' | 'video' };

/** Pull a usable message out of a response that may not be JSON at all. */
async function readError(res: Response, fallback: string): Promise<string> {
  const text = await res.text().catch(() => '');
  if (!text) return `${fallback} (${res.status})`;

  // JSON from our own routes.
  try {
    const parsed = JSON.parse(text) as { error?: string };
    if (parsed?.error) return parsed.error;
  } catch {
    /* not JSON — fall through */
  }

  // Platform/proxy errors arrive as plain text or HTML.
  if (/entity too large|payload too large/i.test(text) || res.status === 413) {
    return 'That file is too large to upload.';
  }
  if (/^\s*</.test(text)) return `Upload failed (${res.status}).`;
  return text.slice(0, 200);
}

/**
 * Upload one file and return the URL to store on the product.
 * `onProgress` receives 0–1, driven by the real bytes sent.
 */
export async function uploadFile(
  file: File,
  onProgress?: (fraction: number) => void,
): Promise<UploadResult> {
  // 1. Sign.
  const signRes = await fetch('/api/admin/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type,
      size: file.size,
    }),
  });
  if (!signRes.ok) throw new Error(await readError(signRes, 'Could not start the upload'));

  const { uploadUrl, url, contentType, resourceType } = (await signRes.json()) as {
    uploadUrl: string;
    url: string;
    contentType: string;
    resourceType: 'image' | 'video';
  };

  // 2. PUT the bytes to R2. XHR rather than fetch purely for upload progress,
  //    which fetch still cannot report — and a 90 MB video with no progress
  //    is indistinguishable from a hang.
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl, true);
    xhr.setRequestHeader('Content-Type', contentType);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else if (xhr.status === 0) {
        // A cross-origin PUT that never reaches R2 lands here with no status.
        reject(new Error('Upload was blocked by the browser — the storage bucket needs CORS configured (see SETUP_R2_IMAGEKIT.md).'));
      } else {
        reject(new Error(`Storage rejected the upload (${xhr.status}).`));
      }
    };
    xhr.onerror = () =>
      reject(new Error('Upload failed — check the connection, or the bucket’s CORS rules.'));
    xhr.onabort = () => reject(new Error('Upload cancelled.'));

    xhr.send(file);
  });

  return { url, resourceType };
}
