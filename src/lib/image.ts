// Achica la foto del celu antes de subirla (≈150-300 KB en vez de 3-5 MB).
export async function compressImage(file: File, maxSide = 1280, quality = 0.8): Promise<Blob> {
  const source = await loadImage(file);
  const scale = Math.min(1, maxSide / Math.max(source.width, source.height));
  const w = Math.round(source.width * scale);
  const h = Math.round(source.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(source.img, 0, 0, w, h);
  if ("close" in source.img) (source.img as ImageBitmap).close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("No se pudo procesar la foto"))), "image/jpeg", quality),
  );
}

async function loadImage(file: File): Promise<{ img: CanvasImageSource; width: number; height: number }> {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    return { img: bmp, width: bmp.width, height: bmp.height };
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return { img, width: img.naturalWidth, height: img.naturalHeight };
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }
}
