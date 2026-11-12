// Client-side image compression for low-bandwidth users.
// Resizes large photos down before upload and re-encodes as WebP when
// the browser supports it, falling back to JPEG. Keeps original aspect
// ratio and never upscales.

const MAX_DIMENSION = 1280;
const QUALITY = 0.78;

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Compression failed'))),
      type,
      quality
    );
  });
}

export async function compressImage(file: File): Promise<{ blob: Blob; type: string; ext: string }> {
  const supportsWebp =
    typeof HTMLCanvasElement !== 'undefined' &&
    document.createElement('canvas').toDataURL('image/webp').startsWith('data:image/webp');

  const targetMime = supportsWebp ? 'image/webp' : 'image/jpeg';
  const targetExt = supportsWebp ? 'webp' : 'jpg';

  const bitmap = await createImageBitmap(file).catch(() => null);

  let scale = 1;
  if (bitmap) {
    const longest = Math.max(bitmap.width, bitmap.height);
    if (longest > MAX_DIMENSION) scale = MAX_DIMENSION / longest;
  }

  const targetW = bitmap ? Math.round(bitmap.width * scale) : MAX_DIMENSION;
  const targetH = bitmap ? Math.round(bitmap.height * scale) : MAX_DIMENSION;

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, targetW, targetH);

  if (bitmap) {
    ctx.drawImage(bitmap, 0, 0, targetW, targetH);
    bitmap.close?.();
  } else {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const im = new Image();
      im.onload = () => { URL.revokeObjectURL(url); resolve(im); };
      im.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')); };
      im.src = url;
    });
    ctx.drawImage(img, 0, 0, targetW, targetH);
  }

  const blob = await canvasToBlob(canvas, targetMime, QUALITY);

  let type = blob.type;
  let ext = targetExt;
  if (type === 'image/png') {
    ext = 'png';
  } else if (type === 'image/jpeg') {
    ext = 'jpg';
  } else if (type === 'image/webp') {
    ext = 'webp';
  } else {
    type = targetMime;
  }

  return { blob, type, ext };
}
