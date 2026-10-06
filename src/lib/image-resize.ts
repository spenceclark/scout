// Downscale large phone photos to a sensible size before upload (keeps detail, saves data on site).
export async function prepareImage(file: File, maxDim = 2048): Promise<{ blob: Blob; name: string; type: string }> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * scale);
    const h = Math.round(bmp.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
    const blob: Blob = await new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("encode"))), "image/jpeg", 0.88));
    const base = file.name.replace(/\.[^.]+$/, "") || "photo";
    return { blob, name: `${base}.jpg`, type: "image/jpeg" };
  } catch {
    return { blob: file, name: file.name || "photo.jpg", type: file.type };
  }
}
