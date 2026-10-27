/** Decode and re-encode a centered square: no SVG, animation or source metadata. */
export async function prepareAvatar(file: File): Promise<Blob> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    throw new Error('Choose a JPG, PNG or WebP image.');
  if (!file.size || file.size > 5 * 1024 * 1024)
    throw new Error('Choose an image smaller than 5 MB.');
  const image = await createImageBitmap(file);
  try {
    if (
      !image.width ||
      !image.height ||
      image.width * image.height > 40_000_000
    )
      throw new Error('This image is too large. Choose a smaller photo.');
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 384;
    const context = canvas.getContext('2d');
    if (!context)
      throw new Error('Image processing is unavailable in this browser.');
    const size = Math.min(image.width, image.height);
    context.drawImage(
      image,
      (image.width - size) / 2,
      (image.height - size) / 2,
      size,
      size,
      0,
      0,
      384,
      384,
    );
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Could not process this photo.'));
        },
        'image/webp',
        0.86,
      );
    });
  } finally {
    image.close();
  }
}
