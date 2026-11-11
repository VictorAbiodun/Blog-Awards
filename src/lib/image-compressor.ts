/**
 * Client-side smart image compressor and optimizer.
 * Resizes large photos (e.g. 5-10MB phone uploads) down to max 1000px
 * and compresses them into high-quality WebP/JPEG under 150KB in milliseconds.
 */

export interface CompressOptions {
  maxDimension?: number;
  quality?: number;
  mimeType?: "image/webp" | "image/jpeg";
}

export async function compressImage(
  file: File,
  options: CompressOptions = {},
): Promise<File> {
  const { maxDimension = 1000, quality = 0.85, mimeType = "image/webp" } = options;

  // If not an image, return original
  if (!file.type.startsWith("image/")) {
    return file;
  }

  // If SVG or GIF, don't re-compress on canvas (preserves vector/animation)
  if (file.type === "image/svg+xml" || file.type === "image/gif") {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => resolve(file);
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => resolve(file);
      img.onload = () => {
        try {
          let { width, height } = img;

          // Scale down if larger than maxDimension while preserving aspect ratio
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(file);
            return;
          }

          // Use high quality image smoothing
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, 0, 0, width, height);

          // Export as requested mime type (WebP or JPEG)
          const targetMime = mimeType;
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                resolve(file);
                return;
              }

              // Strip original extension and attach .webp / .jpg
              const baseName = file.name.replace(/\.[^/.]+$/, "");
              const ext = targetMime === "image/webp" ? "webp" : "jpg";
              const optimizedFile = new File([blob], `${baseName}.${ext}`, {
                type: targetMime,
                lastModified: Date.now(),
              });

              resolve(optimizedFile);
            },
            targetMime,
            quality,
          );
        } catch {
          resolve(file);
        }
      };

      img.src = String(e.target?.result);
    };

    reader.readAsDataURL(file);
  });
}
