/** Canvas may fall back to PNG when the browser cannot encode WebP. */
export function avatarUploadFormat(image: Blob) {
  if (image.type === 'image/webp')
    return { extension: 'webp', contentType: 'image/webp' } as const;
  if (image.type === 'image/png')
    return { extension: 'png', contentType: 'image/png' } as const;
  throw new Error('Could not encode this photo. Please try a different image.');
}
