// Réduit et recompresse une image côté navigateur avant l'envoi.
// Une photo de téléphone de 6 Mo devient ~100-400 Ko : l'utilisateur n'a plus aucune limite de taille
// à gérer, et le stockage ainsi que la bande passante de l'app restent légers.
export async function compressImage(
  file: File,
  opts: { maxSize?: number; square?: boolean; quality?: number } = {}
): Promise<Blob> {
  const { maxSize = 1600, square = false, quality = 0.82 } = opts;
  // Lève une erreur si le navigateur ne sait pas lire le format (ex. HEIC sous Chrome).
  const bitmap = await createImageBitmap(file);
  let sx = 0;
  let sy = 0;
  let sw = bitmap.width;
  let sh = bitmap.height;
  if (square) {
    const s = Math.min(sw, sh);
    sx = (sw - s) / 2;
    sy = (sh - s) / 2;
    sw = s;
    sh = s;
  }
  const scale = Math.min(1, maxSize / Math.max(sw, sh));
  const w = Math.max(1, Math.round(sw * scale));
  const h = Math.max(1, Math.round(sh * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponible");
  ctx.fillStyle = "#0b0b0f";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, w, h);
  bitmap.close?.();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  if (!blob) throw new Error("Compression impossible");
  return blob;
}