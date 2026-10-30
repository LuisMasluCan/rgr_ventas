const MAX_SOURCE_SIZE = 15 * 1024 * 1024;

export async function compressImage(
  file: File,
  maxOutputSize = 200 * 1024,
  maxDimension = 1600,
): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error(`"${file.name}" no es un archivo de imagen válido.`);
  }
  if (file.size > MAX_SOURCE_SIZE) {
    throw new Error(`"${file.name}" supera el límite de 15 MB por archivo.`);
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error(`No se pudo leer "${file.name}". Prueba con otra imagen.`);
  }

  try {
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("No se pudo preparar la imagen seleccionada.");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    let quality = 0.84;
    for (let attempt = 0; attempt < 16; attempt += 1) {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
      if (!blob) throw new Error(`No se pudo comprimir "${file.name}".`);
      if (blob.size <= maxOutputSize) {
        return await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => typeof reader.result === "string"
            ? resolve(reader.result)
            : reject(new Error(`No se pudo procesar "${file.name}".`));
          reader.onerror = () => reject(new Error(`No se pudo procesar "${file.name}".`));
          reader.readAsDataURL(blob);
        });
      }
      if (quality > 0.58) {
        quality -= 0.1;
      } else {
        canvas.width = Math.max(1, Math.round(canvas.width * 0.82));
        canvas.height = Math.max(1, Math.round(canvas.height * 0.82));
        context.fillStyle = "#fff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        quality = 0.72;
      }
    }

    throw new Error(`No se pudo reducir "${file.name}" lo suficiente. Usa una imagen más pequeña.`);
  } finally {
    bitmap.close();
  }
}

export async function compressImageDataUrl(
  source: string,
  maxOutputSize = 200 * 1024,
  maxDimension = 1600,
): Promise<string> {
  const response = await fetch(source);
  if (!response.ok) throw new Error("No se pudo preparar una imagen guardada.");
  const blob = await response.blob();
  return compressImage(new File([blob], "imagen-guardada", { type: blob.type }), maxOutputSize, maxDimension);
}
